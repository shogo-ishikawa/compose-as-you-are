import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.3/full/pyodide.mjs";

const PYODIDE_INDEX = "https://cdn.jsdelivr.net/pyodide/v314.0.3/full/";
const runtimeUrl = new URL("../python/caya_music.py", import.meta.url);

let pyodidePromise = initialise();

async function initialise() {
  self.postMessage({ type: "status", status: "loading", message: "Python実行環境を読み込んでいます" });
  try {
    const [pyodide, runtimeResponse] = await Promise.all([
      loadPyodide({ indexURL: PYODIDE_INDEX }),
      fetch(runtimeUrl),
    ]);
    if (!runtimeResponse.ok) {
      throw new Error(`教材用Pythonモジュールを読み込めませんでした (${runtimeResponse.status})`);
    }
    const runtimeSource = await runtimeResponse.text();
    pyodide.FS.writeFile("/home/pyodide/caya_music.py", runtimeSource, { encoding: "utf8" });
    self.postMessage({ type: "status", status: "ready", message: "Pythonを実行できます" });
    return pyodide;
  } catch (error) {
    self.postMessage({
      type: "status",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

const WRAPPER = String.raw`
import contextlib
import importlib
import io
import json
import sys
import traceback

# 毎回まっさらな曲データから始める
sys.modules.pop("caya_music", None)
caya_music = importlib.import_module("caya_music")

_stdout = io.StringIO()
_stderr = io.StringIO()
_payload = {
    "ok": False,
    "stdout": "",
    "stderr": "",
    "song": None,
    "errorType": None,
    "error": None,
    "traceback": None,
}

_user_globals = {
    "__name__": "__main__",
    "__builtins__": __builtins__,
    # Lesson 1で、importを使わずに自作関数を定義するための最小命令。
    # 通常のレッスンではcaya_musicから明示的にimportする。
    "begin_song": caya_music.start_song,
    "record_note": caya_music.add_note,
}

try:
    with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stderr):
        exec(compile(__caya_user_code__, "student_code.py", "exec"), _user_globals)
    _payload["song"] = caya_music.export_song()
    _payload["ok"] = True
except BaseException as _exc:
    _payload["errorType"] = type(_exc).__name__
    _payload["error"] = str(_exc)
    _payload["traceback"] = traceback.format_exc()
finally:
    _payload["stdout"] = _stdout.getvalue()
    _payload["stderr"] = _stderr.getvalue()

json.dumps(_payload, ensure_ascii=False)
`;

self.addEventListener("message", async (event) => {
  const { type, id, code } = event.data ?? {};
  if (type !== "run" || !id) {
    return;
  }

  try {
    const pyodide = await pyodidePromise;
    pyodide.globals.set("__caya_user_code__", String(code ?? ""));
    const resultJson = await pyodide.runPythonAsync(WRAPPER);
    pyodide.globals.delete("__caya_user_code__");
    self.postMessage({ type: "result", id, result: JSON.parse(resultJson) });
  } catch (error) {
    self.postMessage({
      type: "result",
      id,
      result: {
        ok: false,
        stdout: "",
        stderr: "",
        song: null,
        errorType: "RuntimeError",
        error: error instanceof Error ? error.message : String(error),
        traceback: error instanceof Error ? error.stack ?? error.message : String(error),
      },
    });
  }
});
