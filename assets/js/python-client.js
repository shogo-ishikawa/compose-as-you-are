export class PythonRunner {
  constructor({ onStatus = () => {}, timeoutMs = 6000, startupTimeoutMs = 45000 } = {}) {
    this.onStatus = onStatus;
    this.timeoutMs = timeoutMs;
    this.startupTimeoutMs = startupTimeoutMs;
    this.nextId = 1;
    this.pending = new Map();
    this.ready = false;
    this.worker = null;
    this.startupTimer = null;
    this.createWorker();
  }

  createWorker() {
    this.ready = false;
    this.worker = new Worker(new URL("./python-worker.mjs", import.meta.url), { type: "module" });
    this.worker.addEventListener("message", (event) => this.handleMessage(event));
    this.worker.addEventListener("error", (event) => {
      this.failWorker(event.message || "Python Workerでエラーが起きました");
    });
    this.worker.addEventListener("messageerror", () => {
      this.failWorker("Python Workerとの通信データを読み取れませんでした");
    });
    this.startupTimer = window.setTimeout(() => {
      this.failWorker(
        "Python実行環境の読み込みに時間がかかりすぎています。ネットワーク接続を確認して再読み込みしてください。",
      );
    }, this.startupTimeoutMs);
  }

  failWorker(message) {
    window.clearTimeout(this.startupTimer);
    this.startupTimer = null;
    this.ready = false;
    this.onStatus({ status: "error", message });
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timer);
      pending.reject(new Error(message));
    }
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
  }

  handleMessage(event) {
    const data = event.data ?? {};
    if (data.type === "status") {
      if (data.status === "error") {
        this.failWorker(data.message || "Python実行環境を読み込めませんでした");
        return;
      }
      if (data.status === "ready") {
        window.clearTimeout(this.startupTimer);
        this.startupTimer = null;
      }
      this.ready = data.status === "ready";
      this.onStatus(data);
      return;
    }
    if (data.type !== "result") {
      return;
    }
    const pending = this.pending.get(data.id);
    if (!pending) {
      return;
    }
    window.clearTimeout(pending.timer);
    this.pending.delete(data.id);
    pending.resolve(data.result);
  }

  run(code) {
    if (!this.worker) {
      return Promise.reject(new Error("Python Workerがありません"));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        this.restart();
        resolve({
          ok: false,
          stdout: "",
          stderr: "",
          song: null,
          errorType: "TimeoutError",
          error: `実行が${this.timeoutMs / 1000}秒を超えたため停止しました。`,
          traceback: "TimeoutError: Pythonの実行が制限時間を超えました。",
        });
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ type: "run", id, code });
    });
  }

  restart() {
    window.clearTimeout(this.startupTimer);
    this.startupTimer = null;
    if (this.worker) {
      this.worker.terminate();
    }
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timer);
    }
    this.pending.clear();
    this.onStatus({ status: "loading", message: "Python実行環境を再起動しています" });
    this.createWorker();
  }

  destroy() {
    window.clearTimeout(this.startupTimer);
    this.startupTimer = null;
    if (this.worker) {
      this.worker.terminate();
    }
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timer);
    }
    this.pending.clear();
  }
}
