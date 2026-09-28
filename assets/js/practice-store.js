const PREFIX = "caya:spica-aligned-1:";
const LIMIT = 60000;

export function recordStatus(record, code = record.code) {
  if (!record.lastResult) return "未確認";
  if (record.lastResult.source !== code) return "編集後・未確認";
  const status = record.lastResult.status;
  return ({ passed: "条件を確認済み", example: "例題を実行済み", incomplete: "未完成", "needs-work": "要修正",
    "runtime-error": "実行エラー", "check-error": "確認側のエラー" })[status] || "未確認";
}

export function defaultRecord(code = "") {
  return { code, hintsUsed: 0, solutionViewed: false, reflection: "", attempts: 0,
    lastResult: null, lastPassedAt: null, backup: null };
}

function validRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && typeof value.code === "string" && value.code.length <= LIMIT
    && typeof value.reflection === "string" && value.reflection.length <= 6000
    && Number.isInteger(value.hintsUsed) && value.hintsUsed >= 0 && value.hintsUsed <= 3
    && Number.isInteger(value.attempts) && value.attempts >= 0
    && typeof value.solutionViewed === "boolean"
    && (!value.lastResult || (typeof value.lastResult.source === "string" && value.lastResult.source.length <= LIMIT
      && typeof value.lastResult.status === "string"));
}

export class PracticeStore {
  constructor(taskIds, { adapter, onWarning = () => {} } = {}) {
    this.allowed = new Set(taskIds);
    this.memory = new Map();
    this.blocked = new Map();
    this.onWarning = onWarning;
    try { this.adapter = adapter === undefined ? globalThis.localStorage : adapter; }
    catch { this.adapter = null; }
  }
  warn() { this.onWarning("ブラウザへ保存できていません。画面を閉じる前に「学習記録を保存」で書き出してください。"); }
  get(taskId, starter = "") {
    if (!this.allowed.has(taskId)) throw new Error("Unknown activity");
    if (this.memory.has(taskId)) return this.memory.get(taskId);
    let record = defaultRecord(starter);
    try {
      const raw = this.adapter?.getItem(PREFIX + taskId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!validRecord(parsed)) throw new Error("Invalid saved record");
        record = { ...record, ...parsed };
      }
    } catch {
      try { this.blocked.set(taskId, this.adapter?.getItem(PREFIX + taskId) ?? ""); } catch { /* Keep in-memory work. */ }
      this.onWarning("保存データを読み取れません。元データは自動で上書きしません。「学習記録を保存」で退避できます。");
    }
    this.memory.set(taskId, record);
    return record;
  }
  save(taskId, record) {
    if (!this.allowed.has(taskId) || !validRecord(record)) { this.warn(); return false; }
    this.memory.set(taskId, record);
    if (this.blocked.has(taskId)) { this.warn(); return false; }
    try {
      if (!this.adapter) throw new Error("Storage unavailable");
      this.adapter.setItem(PREFIX + taskId, JSON.stringify(record));
      return true;
    } catch { this.warn(); return false; }
  }
  current(fallback) {
    try { const id = this.adapter?.getItem(PREFIX + "current"); return this.allowed.has(id) ? id : fallback; }
    catch { return fallback; }
  }
  setCurrent(taskId) {
    try { this.adapter?.setItem(PREFIX + "current", taskId); } catch { /* Code saving has its own warning. */ }
  }
  export(starters = {}) {
    const records = Object.fromEntries([...this.allowed].map(id => [id, this.get(id, starters[id] || "")]));
    const legacy = {};
    try {
      for (let index = 0; index < (this.adapter?.length || 0); index += 1) {
        const key = this.adapter.key(index);
        if (key?.startsWith("caya:v1.0.0:")) legacy[key] = this.adapter.getItem(key);
      }
    } catch { /* New-course data are still exportable. */ }
    return { format: "caya-spica-learning-record", version: 1, exportedAt: new Date().toISOString(),
      records, unreadableOriginals: Object.fromEntries(this.blocked), legacy };
  }
  import(data) {
    if (!data || data.format !== "caya-spica-learning-record" || data.version !== 1
      || !data.records || typeof data.records !== "object" || Array.isArray(data.records)) throw new Error("この版の学習記録JSONを選んでください。");
    const entries = Object.entries(data.records);
    if (!entries.length || entries.some(([id, value]) => !this.allowed.has(id) || !validRecord(value)))
      throw new Error("問題IDまたは保存データの形式を確認できません。既存データは変更していません。");
    let allSaved = true;
    for (const [id, value] of entries) {
      const previous = this.get(id);
      const next = { ...defaultRecord(), ...value, backup: { code: previous.code, at: new Date().toISOString() } };
      // A corrupt original is retained in the exported record. Do not silently clear the blocked flag.
      if (!this.save(id, next)) allSaved = false;
    }
    return allSaved;
  }
}
