import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.3/full/pyodide.mjs";

const PYODIDE_INDEX = "https://cdn.jsdelivr.net/pyodide/v314.0.3/full/";
const MODULES = ["caya_music.py", "caya_assessment.py"];

async function initialise() {
  self.postMessage({ type: "status", status: "loading", message: "Python実行環境を読み込んでいます" });
  const [pyodide, sources] = await Promise.all([
    loadPyodide({ indexURL: PYODIDE_INDEX }),
    Promise.all(MODULES.map(async name => {
      const response = await fetch(new URL(`../python/${name}`, import.meta.url));
      if (!response.ok) throw new Error(`教材モジュール ${name} を読み込めません (${response.status})`);
      return [name, await response.text()];
    })),
  ]);
  for (const [name, source] of sources) pyodide.FS.writeFile(`/home/pyodide/${name}`, source, { encoding: "utf8" });
  self.postMessage({ type: "status", status: "ready", message: "Pythonを実行できます" });
  return pyodide;
}

const ready = initialise().catch(error => {
  self.postMessage({ type: "status", status: "error", message: String(error.message || error) });
  return null;
});
const WRAPPER = String.raw`
import json
from caya_assessment import run_submission
json.dumps(run_submission(__caya_user_code__, __caya_assessment_id__ or None), ensure_ascii=False)
`;
let running = false;
self.addEventListener("message", async event => {
  const { type, id, code, assessmentId } = event.data ?? {};
  if (type !== "run" || !id) return;
  if (running) {
    self.postMessage({ type: "result", id, result: { ok: false, errorType: "BusyError", error: "前の実行が終了してから実行してください。" } });
    return;
  }
  running = true;
  let pyodide;
  try {
    pyodide = await ready;
    if (!pyodide) throw new Error("Pythonの準備に失敗しました。ページを再読み込みしてください。");
    pyodide.globals.set("__caya_user_code__", String(code ?? ""));
    pyodide.globals.set("__caya_assessment_id__", typeof assessmentId === "string" ? assessmentId : "");
    const result = JSON.parse(await pyodide.runPythonAsync(WRAPPER));
    self.postMessage({ type: "result", id, result });
  } catch (error) {
    self.postMessage({ type: "result", id, result: {
      ok: false, stdout: "", stderr: "", song: null, errorType: "RuntimeError",
      error: String(error.message || error), traceback: String(error.stack || error),
      assessment: assessmentId ? { status: "check-error", passed: false, checks: [],
        comment: "実行環境または確認側で問題が起きました。学生の誤答とは区別し、合格として記録しません。" } : null,
    } });
  } finally {
    pyodide?.globals.delete("__caya_user_code__");
    pyodide?.globals.delete("__caya_assessment_id__");
    running = false;
  }
});
