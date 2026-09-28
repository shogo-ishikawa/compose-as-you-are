import { AudioEngine } from "./audio-engine.js";
import { CodeEditor } from "./editor.js";
import { PythonRunner } from "./python-client.js";
import { PianoRollVisualiser, renderEventTable } from "./visualiser.js";
import { countEvents, formatBeat, songLength } from "./note-utils.js";
import { storage as legacyStorage } from "./storage.js";
import { PracticeStore, recordStatus } from "./practice-store.js";

const $ = id => document.getElementById(id);
const escape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const activityNames = { example: "例題", practice: "練習問題", advanced: "発展問題" };
const activityOrder = Object.keys(activityNames);

function download(content, name, type = "application/json;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function initialise() {
  const response = await fetch(new URL("../data/curriculum.json", import.meta.url));
  if (!response.ok) throw new Error(`教材データを読み込めません (${response.status})`);
  const course = await response.json();
  const lessons = course.lessons;
  if (!Array.isArray(lessons) || lessons.length !== 7) throw new Error("教材データの形式を確認してください。");
  const starters = Object.fromEntries(lessons.flatMap(lesson => activityOrder.map(activity =>
    [`${lesson.id}.${activity}`, lesson.activities[activity].code])));
  const taskIds = Object.keys(starters);
  let saveFailed = false;
  const warn = message => { saveFailed = true; $("storage-warning").hidden = false; $("storage-warning").textContent = message; };
  const store = new PracticeStore(taskIds, { onWarning: warn });
  const settings = legacyStorage.getSettings();
  const state = { taskId: store.current(taskIds[0]), busy: false, ready: false, song: null, saveTimer: null, record: null };
  const lessonFor = id => lessons.find(lesson => lesson.id === id.split(".")[0]) || lessons[0];
  const activityFor = id => lessonFor(id).activities[id.split(".")[1]];
  const currentLesson = () => lessonFor(state.taskId);
  const currentActivity = () => activityFor(state.taskId);
  const mode = () => state.taskId.split(".")[1];
  const visualiser = new PianoRollVisualiser($("piano-roll"));
  const editor = new CodeEditor($("code-editor"), { onChange: () => onEdit(), onRunShortcut: () => run() });
  const audio = new AudioEngine({
    onTick: beat => visualiser.setPlayhead(beat),
    onState: status => {
      $("audio-status").textContent = ({ playing: "再生中", paused: "一時停止", stopped: "停止" })[status] || "停止";
      $("pause-song").disabled = !["playing", "paused"].includes(status);
      $("stop-song").disabled = !["playing", "paused"].includes(status);
      $("play-song").disabled = state.busy || !state.song || countEvents(state.song) === 0 || status === "playing";
    },
    onError: message => { $("audio-status").textContent = message; },
  });
  $("master-volume").value = String(settings.volume ?? 45);
  $("loop-song").checked = Boolean(settings.loop);
  audio.setVolume($("master-volume").value); audio.setLoop($("loop-song").checked);

  function urlFor(taskId) {
    const [lesson, activity] = taskId.split(".");
    const url = new URL(location.href);
    url.search = new URLSearchParams({ lesson, activity }).toString(); url.hash = "";
    return url;
  }
  function taskFromLocation() {
    const params = new URLSearchParams(location.search);
    if (!params.has("lesson") && !params.has("activity")) return state.taskId;
    const task = `${params.get("lesson") || lessons[0].id}.${params.get("activity") || "example"}`;
    if (taskIds.includes(task)) return task;
    $("page-notice").textContent = "指定されたレッスンを見つけられないため、最初の例題を表示しています。";
    return taskIds[0];
  }
  function persist() {
    clearTimeout(state.saveTimer);
    if (!state.record) return true;
    state.record.code = editor.getValue();
    const ok = store.save(state.taskId, state.record);
    $("save-status").textContent = ok ? "保存済み" : "保存できていません";
    return ok;
  }
  function updateNavigation() {
    let corePassed = 0;
    $("lesson-nav").innerHTML = lessons.map(lesson => {
      const id = `${lesson.id}.practice`;
      const record = store.get(id, starters[id]);
      const passed = recordStatus(record) === "条件を確認済み";
      if (lesson.number <= 5 && passed) corePassed += 1;
      return `<button type="button" data-lesson="${escape(lesson.id)}" data-edit-action
        class="course-item${currentLesson().id === lesson.id ? " current" : ""}"
        ${currentLesson().id === lesson.id ? 'aria-current="step"' : ""} ${state.busy ? "disabled" : ""}>
        <span class="course-number">${lesson.number}</span><span>${escape(lesson.title)}<small>${lesson.number <= 5 ? "基礎の応用" : "選択発展"} · ${passed ? "練習の条件を確認済み" : escape(recordStatus(record))}</small></span></button>`;
    }).join("");
    $("core-progress").textContent = `基礎の応用 ${corePassed} / 5 レッスンで練習の条件を確認済み`;
    $("lesson-nav").querySelectorAll("[data-lesson]").forEach(button => button.addEventListener("click", () => navigate(`${button.dataset.lesson}.example`)));
  }
  function renderTask() {
    const lesson = currentLesson(), activity = currentActivity(), record = state.record;
    $("lesson-stage").textContent = lesson.stage;
    $("lesson-title").textContent = `${lesson.number}. ${lesson.title}`;
    $("lesson-overview").textContent = lesson.overview;
    $("spica-links").innerHTML = lesson.links.map(link => {
      const url = new URL(`#learn/${encodeURIComponent(link.id)}`, course.spicaBaseUrl);
      return `<a href="${escape(url.href)}" target="_blank" rel="noopener noreferrer">${escape(link.label)} ↗</a>`;
    }).join("");
    $("activity-tabs").innerHTML = activityOrder.map(activityId => `<button type="button" data-activity="${activityId}"
      data-edit-action aria-pressed="${mode() === activityId}" class="activity-tab${mode() === activityId ? " selected" : ""}"
      ${state.busy ? "disabled" : ""}>${activityNames[activityId]}</button>`).join("");
    $("activity-tabs").querySelectorAll("[data-activity]").forEach(button => button.addEventListener("click", () => navigate(`${lesson.id}.${button.dataset.activity}`)));
    $("task-title").textContent = activity.title;
    $("task-objective").textContent = activity.objective;
    $("task-instructions").innerHTML = activity.instructions.map(item => `<li>${escape(item)}</li>`).join("");
    $("expected-results").innerHTML = activity.expected.map(item => `<li>${escape(item)}</li>`).join("");
    const hints = activity.hints || [];
    $("hints").innerHTML = hints.slice(0, record.hintsUsed).map((hint, index) => `<div class="hint-item"><strong>ヒント ${index + 1}</strong><p>${escape(hint)}</p></div>`).join("");
    $("next-hint").hidden = hints.length === 0;
    $("next-hint").disabled = state.busy || record.hintsUsed >= hints.length;
    $("next-hint").textContent = record.hintsUsed >= hints.length ? "すべてのヒントを表示しました" : `ヒント ${record.hintsUsed + 1} を開く`;
    $("solution-panel").hidden = !activity.solution;
    $("solution-panel").open = false;
    $("solution-code").textContent = activity.solution || "";
    $("solution-explanation").textContent = activity.explanation || "";
    $("reflection-question").textContent = activity.reflection;
    $("reflection").value = record.reflection;
    $("reference-history").textContent = `ヒント参照: ${record.hintsUsed}段階${record.solutionViewed ? " · 解答例を参照済み" : ""}`;
    $("editor-title").textContent = `${activityNames[mode()]}のPythonコード`;
    $("restore-code").disabled = !record.backup || typeof record.backup.code !== "string" || state.busy;
    $("colab-link").hidden = lesson.id !== "arrangement";
  }
  function renderResult() {
    const record = state.record, last = record.lastResult;
    $("current-status").textContent = recordStatus(record, editor.getValue());
    $("current-status").dataset.status = recordStatus(record, editor.getValue()) === "条件を確認済み" ? "passed" : "other";
    $("attempt-count").textContent = `実行回数 ${record.attempts}${record.lastPassedAt ? " · 過去の確認達成あり" : ""}`;
    if (!last) {
      $("feedback").innerHTML = '<p class="empty-feedback">実行すると、ここに条件ごとの確認結果と次に見直す点を表示します。音を再生しなくても答え合わせできます。</p>';
      $("console-output").textContent = "printの出力とPythonのエラーを表示します。";
      return;
    }
    const stale = last.source !== editor.getValue();
    const feedback = last.feedback || {};
    const checks = Array.isArray(feedback.checks) ? feedback.checks : [];
    $("feedback").innerHTML = `${stale ? '<p class="stale-result">これは変更前のコードの結果です。現在のコードをもう一度実行してください。</p>' : ""}
      <p class="feedback-comment">${escape(feedback.comment || (last.error ? "まずPythonのエラーを確認してください。" : "実行しました。"))}</p>
      ${last.error ? `<div class="check-item failed"><strong>${escape(last.error.type)}${last.error.line ? ` · ${escape(last.error.line)}行目` : ""}</strong><p>${escape(last.error.message)}</p></div>` : ""}
      <ol class="check-list">${checks.map(item => `<li class="check-item ${item.passed ? "passed" : "failed"}"><strong>${item.passed ? "✓" : "要確認"} ${escape(item.label)}</strong><p>${escape(item.message)}</p>
      <details ${item.passed ? "" : "open"}><summary>期待値と実際の値</summary><dl><dt>期待値</dt><dd><code>${escape(item.expected)}</code></dd><dt>実際の値</dt><dd><code>${escape(item.actual)}</code></dd></dl></details></li>`).join("")}</ol>
      ${feedback.detail ? `<details><summary>確認側の診断情報</summary><pre>${escape(feedback.detail)}</pre></details>` : ""}`;
    $("console-output").textContent = [last.stdout, last.stderr, last.error?.traceback].filter(Boolean).join("\n") || "printの出力はありません。";
  }
  function clearMusic() {
    audio.stop(); state.song = null; visualiser.clear();
    $("play-song").disabled = true; $("pause-song").disabled = true; $("stop-song").disabled = true;
    $("download-song").disabled = true;
    $("song-summary").textContent = "現在のコードを実行すると曲データが作られます。";
    $("event-table-body").innerHTML = '<tr><td colspan="6">実行後に音の順序・開始・長さを確認できます。</td></tr>';
  }
  function navigate(taskId, { push = true } = {}) {
    if (state.busy || !taskIds.includes(taskId)) return;
    persist(); clearMusic();
    state.taskId = taskId;
    state.record = store.get(taskId, starters[taskId]);
    editor.setValue(state.record.code); editor.clearErrorLine();
    store.setCurrent(taskId);
    if (push) history.pushState(null, "", urlFor(taskId));
    renderTask(); renderResult(); updateNavigation();
    $("run-message").textContent = "問題の指示を読み、コードを書いて実行してください。";
  }
  function onEdit() {
    if (state.busy || !state.record) return;
    state.record.code = editor.getValue();
    clearTimeout(state.saveTimer);
    $("save-status").textContent = "保存中…";
    state.saveTimer = setTimeout(persist, 250);
    clearMusic(); renderResult(); updateNavigation();
  }
  function setBusy(busy) {
    state.busy = busy;
    editor.textarea.readOnly = busy;
    editor.cm?.setOption("readOnly", busy ? "nocursor" : false);
    document.querySelectorAll("[data-edit-action]").forEach(element => { element.disabled = busy; });
    $("run-code").disabled = busy || !state.ready;
    $("run-code").textContent = busy ? "実行・確認中…" : "Pythonを実行・答え合わせ";
    if (!busy) {
      $("next-hint").disabled = state.record.hintsUsed >= (currentActivity().hints || []).length;
      $("restore-code").disabled = !state.record.backup || typeof state.record.backup.code !== "string";
    }
  }
  const python = new PythonRunner({ timeoutMs: 9000, onStatus: ({ status, message }) => {
    state.ready = status === "ready";
    $("python-status").textContent = state.ready ? "Pythonを実行できます" : message || "Pythonを準備中";
    $("run-code").disabled = !state.ready || state.busy;
  } });

  async function run() {
    if (state.busy || !state.ready) return;
    const source = editor.getValue(), taskId = state.taskId;
    if (source.length > 60000) { $("run-message").textContent = "コードは60,000文字以内にしてください。"; return; }
    persist(); clearMusic(); editor.clearErrorLine(); setBusy(true);
    $("run-message").textContent = "このコードを実行し、指定された条件を確認しています。";
    let result;
    try { result = await python.run(source, { assessmentId: taskId }); }
    catch (error) { result = { ok: false, errorType: "RuntimeError", error: String(error), assessment: { status: "runtime-error", passed: false, checks: [], comment: "実行環境を確認し、もう一度実行してください。" } }; }
    try {
      // The controls are locked while running; retain the snapshot check as a second guard.
      if (state.taskId !== taskId || editor.getValue() !== source) return;
      const feedback = result.assessment || { status: "runtime-error", passed: false, checks: [], comment: "実行が完了しなかったため、条件を確認していません。" };
      state.record.attempts += 1;
      state.record.lastResult = { source, status: feedback.status, feedback, stdout: result.stdout || "", stderr: result.stderr || "",
        error: result.ok ? null : { type: result.errorType || "Error", message: result.error || "実行できませんでした。", line: result.line || null, traceback: result.traceback || "" }, at: new Date().toISOString() };
      if (feedback.status === "passed" && feedback.passed) state.record.lastPassedAt = new Date().toISOString();
      if (result.ok && result.song && Array.isArray(result.song.tracks)) {
        state.song = result.song; visualiser.setSong(result.song); renderEventTable(result.song, $("event-table-body"));
        $("song-summary").textContent = `${result.song.tempo} BPM · ${formatBeat(songLength(result.song))} 拍 · ${countEvents(result.song)} 音イベント · ${result.song.tracks.length} トラック`;
        $("download-song").disabled = false;
      }
      if (result.line) editor.highlightErrorLine(result.line);
      persist(); renderResult(); updateNavigation();
      $("run-message").textContent = result.ok ? (feedback.status === "passed" ? "実行成功。今回の確認条件を満たしました。" : "実行成功。下の答え合わせを確認してください。") : "実行を完了できませんでした。下の案内を確認してください。";
    } finally {
      setBusy(false);
      $("play-song").disabled = !state.song || countEvents(state.song) === 0;
    }
  }

  $("run-code").addEventListener("click", run);
  $("next-hint").addEventListener("click", () => {
    state.record.hintsUsed = Math.min((currentActivity().hints || []).length, state.record.hintsUsed + 1);
    persist(); renderTask();
  });
  $("solution-panel").addEventListener("toggle", () => {
    if ($("solution-panel").open && !state.record.solutionViewed) {
      state.record.solutionViewed = true; persist();
      $("reference-history").textContent = `ヒント参照: ${state.record.hintsUsed}段階 · 解答例を参照済み`;
    }
  });
  $("reflection").addEventListener("input", () => {
    state.record.reflection = $("reflection").value.slice(0, 6000);
    clearTimeout(state.saveTimer); state.saveTimer = setTimeout(persist, 250);
  });
  $("reset-code").addEventListener("click", () => {
    if (!confirm("現在のコードを退避して、開始コードへ戻しますか？ 退避したコードは「直前のコードを復元」で戻せます。")) return;
    state.record.backup = { code: editor.getValue(), at: new Date().toISOString() };
    editor.setValue(currentActivity().code); onEdit(); persist(); renderTask();
  });
  $("restore-code").addEventListener("click", () => {
    const saved = state.record.backup?.code;
    if (typeof saved !== "string" || saved.length > 60000 || !confirm("退避したコードを復元しますか？ 現在のコードは入れ替わりに退避します。")) return;
    state.record.backup = { code: editor.getValue(), at: new Date().toISOString() };
    editor.setValue(saved); onEdit(); persist();
  });
  $("download-code").addEventListener("click", () => download(editor.getValue(), `caya-${state.taskId}.py`, "text/x-python;charset=utf-8"));
  $("copy-code").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(editor.getValue()); $("run-message").textContent = "コードをコピーしました。"; }
    catch { $("run-message").textContent = "コピーできません。エディタ内で選択してコピーするか、.py保存を使ってください。"; }
  });
  $("export-records").addEventListener("click", () => { persist(); download(JSON.stringify(store.export(starters), null, 2), "caya-learning-records.json"); });
  $("import-records").addEventListener("change", async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error("学習記録ファイルが大きすぎます（上限12 MB）。");
      const data = JSON.parse(await file.text());
      if (!confirm("対応する問題のコードと記録を読み込みます。現在の各コードは直前のバックアップへ退避します。続けますか？")) return;
      persist(); const ok = store.import(data);
      navigate(state.taskId, { push: false });
      $("page-notice").textContent = ok ? "学習記録を読み込みました。旧版のデータや作曲スタジオは変更していません。" : "画面には読み込みましたが、ブラウザ保存に失敗した項目があります。閉じる前に書き出してください。";
    } catch (error) { $("page-notice").textContent = String(error.message || error); }
    finally { event.target.value = ""; }
  });
  $("play-song").addEventListener("click", async () => {
    if (!state.song) return;
    try { await audio.play(state.song, { loop: $("loop-song").checked }); }
    catch (error) { $("audio-status").textContent = String(error.message || error); }
  });
  $("pause-song").addEventListener("click", () => audio.pauseOrResume());
  $("stop-song").addEventListener("click", () => audio.stop());
  $("master-volume").addEventListener("input", () => {
    audio.setVolume($("master-volume").value);
    legacyStorage.setSettings({ volume: Number($("master-volume").value), loop: $("loop-song").checked });
  });
  $("loop-song").addEventListener("change", () => {
    audio.setLoop($("loop-song").checked);
    legacyStorage.setSettings({ volume: Number($("master-volume").value), loop: $("loop-song").checked });
  });
  $("download-song").addEventListener("click", () => { if (state.song) download(JSON.stringify(state.song, null, 2), `caya-${state.taskId}-song.json`); });
  window.addEventListener("popstate", () => {
    if (state.busy) { history.replaceState(null, "", urlFor(state.taskId)); return; }
    navigate(taskFromLocation(), { push: false });
  });
  window.addEventListener("beforeunload", event => {
    persist();
    if (saveFailed) { event.preventDefault(); event.returnValue = ""; }
  });
  window.addEventListener("pagehide", () => { persist(); python.destroy(); });
  $("course-introduction").textContent = course.introduction;
  $("loading-message").hidden = true;
  $("course-content").hidden = false;
  navigate(taskFromLocation(), { push: false });
  if (location.protocol === "file:") $("page-notice").textContent = "Web Workerを使うため、ファイルを直接開かずWebサーバーから開いてください。";
}

initialise().catch(error => {
  $("loading-message").textContent = `教材を開けませんでした: ${error.message || error}。ネットワークを確認して再読み込みしてください。`;
});
