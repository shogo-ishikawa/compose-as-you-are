export const PYTHON_STATES = Object.freeze({
  IDLE: "idle", PREPARING: "preparing", READY: "ready", RUNNING: "running",
  RECOVERING: "recovering", ERROR: "error", CLOSED: "closed",
});

/** A restartable, generation-safe interface to the shared Pyodide worker. */
export class PythonRunner {
  constructor({ onStatus = () => {}, timeoutMs = 6000, startupTimeoutMs = 45000,
    workerFactory = url => new Worker(url, { type: "module" }) } = {}) {
    Object.assign(this, { onStatus, timeoutMs, startupTimeoutMs, workerFactory });
    this.nextId = 1;
    this.generation = 0;
    this.pending = new Map();
    this.worker = null;
    this.state = PYTHON_STATES.IDLE;
    this.readyPromise = null;
    this.startupTimer = null;
    this.ensureReady().catch(() => {});
  }

  get ready() { return this.state === PYTHON_STATES.READY; }

  emit(status, message, detail = "") {
    this.state = status;
    this.onStatus({ status, message, detail, generation: this.generation });
  }

  ensureReady({ force = false } = {}) {
    if (!force && this.state === PYTHON_STATES.READY && this.worker) return Promise.resolve();
    if (!force && this.readyPromise) return this.readyPromise;
    if (force) this.stopWorker("Python実行環境を再準備します。", { emit: false });
    const generation = ++this.generation;
    this.emit(force ? PYTHON_STATES.RECOVERING : PYTHON_STATES.PREPARING,
      force ? "Python実行環境を再準備しています" : "Python実行環境を準備しています");
    this.readyPromise = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
      let worker;
      try {
        worker = this.workerFactory(new URL("./python-worker.mjs", import.meta.url));
      } catch (error) {
        this.failWorker(`Python Workerを作成できませんでした: ${error.message || error}`, generation);
        return;
      }
      this.worker = worker;
      worker.addEventListener("message", event => this.handleMessage(event, generation, worker));
      worker.addEventListener("error", event => this.failWorker(event.message || "Python Workerでエラーが起きました", generation, worker));
      worker.addEventListener("messageerror", () => this.failWorker("Python Workerとの通信データを読み取れませんでした", generation, worker));
      this.startupTimer = globalThis.setTimeout(() => this.failWorker(
        "Python実行環境の準備が時間内に完了しませんでした。", generation, worker), this.startupTimeoutMs);
    });
    // Prevent a rejected shared preparation promise from becoming unhandled.
    this.readyPromise.catch(() => {});
    return this.readyPromise;
  }

  failWorker(message, generation = this.generation, worker = this.worker) {
    if (generation !== this.generation || worker !== this.worker) return;
    globalThis.clearTimeout(this.startupTimer);
    this.startupTimer = null;
    const error = new Error(message);
    this.readyReject?.(error);
    this.readyResolve = this.readyReject = null;
    this.readyPromise = null;
    for (const pending of this.pending.values()) {
      globalThis.clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
    worker?.terminate();
    this.worker = null;
    this.emit(PYTHON_STATES.ERROR, "Python実行環境との接続が切れました。", message);
  }

  handleMessage(event, generation, worker) {
    if (generation !== this.generation || worker !== this.worker) return;
    const data = event.data ?? {};
    if (data.type === "status") {
      if (data.status === "error") return this.failWorker(data.message || "Python実行環境を読み込めませんでした", generation, worker);
      if (data.status === "ready") {
        globalThis.clearTimeout(this.startupTimer);
        this.startupTimer = null;
        this.emit(PYTHON_STATES.READY, "Pythonを実行できます");
        this.readyResolve?.();
        this.readyResolve = this.readyReject = null;
        this.readyPromise = null;
      } else this.onStatus({ ...data, generation });
      return;
    }
    if (data.type !== "result") return;
    const pending = this.pending.get(data.id);
    if (!pending || pending.generation !== generation) return;
    globalThis.clearTimeout(pending.timer);
    this.pending.delete(data.id);
    this.emit(PYTHON_STATES.READY, "Pythonを実行できます");
    pending.resolve(data.result);
  }

  async run(code, { assessmentId = null } = {}) {
    await this.ensureReady();
    if (this.state === PYTHON_STATES.RUNNING || this.pending.size) throw new Error("Pythonは実行中です。完了するまで待ってください。");
    const worker = this.worker;
    const generation = this.generation;
    if (!worker) throw new Error("Python実行環境を再準備してください。");
    const id = this.nextId++;
    this.emit(PYTHON_STATES.RUNNING, "Pythonコードを実行しています");
    return new Promise((resolve, reject) => {
      const timer = globalThis.setTimeout(() => {
        if (!this.pending.delete(id)) return;
        const result = { ok: false, stdout: "", stderr: "", song: null,
          errorType: "TimeoutError", error: `実行が${this.timeoutMs / 1000}秒を超えたため停止しました。`,
          traceback: "TimeoutError: Pythonの実行が制限時間を超えました。",
          assessment: assessmentId ? { status: "runtime-error", passed: false, checks: [],
            comment: "実行を停止しました。繰り返しの回数や終了条件を確認してください。再準備後にもう一度実行できます。" } : null };
        this.stopWorker("タイムアウトした実行環境を停止しました。", { emit: false });
        this.ensureReady({ force: true }).catch(() => {});
        resolve(result); // Never automatically re-run student code.
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer, generation });
      try { worker.postMessage({ type: "run", id, code, assessmentId }); }
      catch (error) {
        globalThis.clearTimeout(timer); this.pending.delete(id);
        this.failWorker(`Python Workerへ送信できませんでした: ${error.message || error}`, generation, worker);
        reject(error);
      }
    });
  }

  restart() { return this.ensureReady({ force: true }); }

  stopWorker(message, { emit = true } = {}) {
    globalThis.clearTimeout(this.startupTimer); this.startupTimer = null;
    const error = new Error(message);
    this.readyReject?.(error); this.readyResolve = this.readyReject = null; this.readyPromise = null;
    for (const pending of this.pending.values()) { globalThis.clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear(); this.worker?.terminate(); this.worker = null;
    if (emit) this.emit(PYTHON_STATES.CLOSED, message);
  }

  destroy() { this.generation += 1; this.stopWorker("Python実行環境を停止しました。"); }
}
