import { AudioEngine } from "./audio-engine.js";
import { replaceSetting } from "./code-settings.js";
import { CodeEditor } from "./editor.js";
import { buildErrorHelp } from "./error-help.js";
import { getLesson, LESSONS } from "./lessons.js";
import { countEvents, formatBeat, songLength } from "./note-utils.js";
import { PythonRunner } from "./python-client.js";
import { storage } from "./storage.js";
import { PianoRollVisualiser, renderEventTable } from "./visualiser.js";

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const elements = {
  pythonStatus: $("#python-status"),
  saveStatus: $("#save-status"),
  progressLabel: $("#progress-label"),
  progressBar: $("#progress-bar"),
  lessonNav: $("#lesson-nav"),
  lessonContent: $("#lesson-content"),
  editorTitle: $("#editor-title"),
  codeTextarea: $("#code-editor"),
  runButton: $("#run-code"),
  runMessage: $("#run-message"),
  copyButton: $("#copy-code"),
  downloadCodeButton: $("#download-code"),
  resetButton: $("#reset-code"),
  consoleOutput: $("#console-output"),
  errorHelp: $("#error-help"),
  tabConsole: $("#tab-console"),
  tabHelp: $("#tab-help"),
  consolePanel: $("#console-panel"),
  errorPanel: $("#error-panel"),
  audioStatus: $("#audio-status"),
  playButton: $("#play-song"),
  pauseButton: $("#pause-song"),
  stopButton: $("#stop-song"),
  loopInput: $("#loop-song"),
  volumeInput: $("#master-volume"),
  tempoInput: $("#tempo-control"),
  tempoValue: $("#tempo-value"),
  instrumentInput: $("#instrument-control"),
  parameterMessage: $("#parameter-message"),
  summaryTempo: $("#summary-tempo"),
  summaryLength: $("#summary-length"),
  summaryEvents: $("#summary-events"),
  summaryTracks: $("#summary-tracks"),
  canvas: $("#piano-roll"),
  eventTableBody: $("#event-table-body"),
  downloadSongButton: $("#download-song"),
  challengeCard: $("#challenge-card"),
  helpDialog: $("#help-dialog"),
  openHelp: $("#open-help"),
};

const completedLessons = storage.getCompletedLessons();
const savedSettings = storage.getSettings();
const savedLessonId = storage.getCurrentLesson();
const initialLesson = LESSONS.some((lesson) => lesson.id === savedLessonId)
  ? getLesson(savedLessonId)
  : LESSONS[0];

const state = {
  lessonId: initialLesson.id,
  song: null,
  pythonReady: false,
  running: false,
  autoRan: false,
  saveTimer: null,
};

const visualiser = new PianoRollVisualiser(elements.canvas);
const editor = new CodeEditor(elements.codeTextarea, {
  onChange: () => handleEditorChange(),
  onRunShortcut: () => runCode(),
});

const audio = new AudioEngine({
  onTick: (beat) => visualiser.setPlayhead(beat),
  onState: (audioState) => updateAudioState(audioState),
  onError: (message) => {
    setAudioStatus(message, "error");
  },
});

elements.volumeInput.value = String(savedSettings.volume ?? 62);
elements.loopInput.checked = Boolean(savedSettings.loop);
audio.setVolume(elements.volumeInput.value);
audio.setLoop(elements.loopInput.checked);

const python = new PythonRunner({
  timeoutMs: 6000,
  onStatus: ({ status, message }) => {
    if (status === "ready") {
      state.pythonReady = true;
      elements.runButton.disabled = false;
      setPythonStatus("Pythonを実行できます", "ready");
      setRunMessage("コードを読み、値を変えて実行してみましょう。", "");
      if (!state.autoRan) {
        state.autoRan = true;
        runCode({ quiet: true });
      }
    } else if (status === "loading") {
      state.pythonReady = false;
      elements.runButton.disabled = true;
      setPythonStatus(message || "Pythonを準備中", "loading");
    } else {
      state.pythonReady = false;
      elements.runButton.disabled = true;
      setPythonStatus("Pythonを読み込めません", "error");
      setRunMessage(message || "ネットワーク接続を確認してください。", "error");
    }
  },
});

function setPythonStatus(text, kind) {
  elements.pythonStatus.className = `status-chip status-${kind}`;
  elements.pythonStatus.innerHTML = `<span class="status-dot" aria-hidden="true"></span>${escapeHtml(text)}`;
}

function setAudioStatus(text, kind = "muted") {
  elements.audioStatus.className = `status-chip status-${kind}`;
  elements.audioStatus.textContent = text;
}

function setRunMessage(text, kind = "") {
  elements.runMessage.className = `run-message${kind ? ` is-${kind}` : ""}`;
  elements.runMessage.textContent = text;
}

function currentLesson() {
  return getLesson(state.lessonId);
}

function renderLessonNav() {
  elements.lessonNav.replaceChildren();
  LESSONS.forEach((lesson) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lesson-button";
    if (lesson.id === state.lessonId) {
      button.classList.add("is-active");
      button.setAttribute("aria-current", "step");
    }
    if (completedLessons.has(lesson.id)) {
      button.classList.add("is-complete");
    }
    button.innerHTML = `<span class="lesson-number">${lesson.number}</span><small>${escapeHtml(lesson.shortTitle)}</small>`;
    button.setAttribute("aria-label", `レッスン${lesson.number}: ${lesson.title}`);
    button.addEventListener("click", () => selectLesson(lesson.id));
    elements.lessonNav.append(button);
  });
}

function renderLessonContent() {
  const lesson = currentLesson();
  const syntax = lesson.syntax
    .map(
      (item) => `
        <div class="syntax-card">
          <strong>${escapeHtml(item.code)}</strong>
          <p><b>${escapeHtml(item.title)}</b> — ${escapeHtml(item.detail)}</p>
        </div>`,
    )
    .join("");
  const steps = lesson.steps
    .map(
      (step, index) => `
        <details class="lesson-step" ${index === 0 ? "open" : ""}>
          <summary>${escapeHtml(step.title)}</summary>
          <div><p>${escapeHtml(step.text)}</p></div>
        </details>`,
    )
    .join("");
  const concepts = lesson.concepts
    .map((concept) => `<span class="concept-pill">${escapeHtml(concept)}</span>`)
    .join("");
  const complete = completedLessons.has(lesson.id);

  elements.lessonContent.innerHTML = `
    <p class="eyebrow">LESSON ${lesson.number}</p>
    <h3>${escapeHtml(lesson.title)}</h3>
    <div class="lesson-meta">
      <span class="meta-pill">${escapeHtml(lesson.duration)}</span>
      <span class="meta-pill">${escapeHtml(lesson.route)}</span>
    </div>
    <div class="concept-list">${concepts}</div>
    <p>${escapeHtml(lesson.overview)}</p>
    <div class="lesson-callout">
      <strong>このレッスンの要点</strong>
      <p>${escapeHtml(lesson.point)}</p>
    </div>
    <h4>文法を読む</h4>
    <div class="syntax-list">${syntax}</div>
    <h4>進め方</h4>
    ${steps}
    <button id="complete-lesson" class="button ${complete ? "button-quiet" : "button-primary"} complete-lesson" type="button">
      ${complete ? "完了済み ✓" : "このレッスンを完了にする"}
    </button>
  `;

  $("#complete-lesson")?.addEventListener("click", () => markLessonComplete(lesson.id));
}

function renderChallenge() {
  const lesson = currentLesson();
  const items = lesson.challenge.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const colabLink =
    lesson.number === 7
      ? `<a class="button button-colab" href="https://colab.research.google.com/github/shogo-ishikawa/compose-as-you-are/blob/main/colab/caya_starter.ipynb" target="_blank" rel="noopener noreferrer">Google Colabで続きを作る ↗</a>`
      : "";
  elements.challengeCard.innerHTML = `
    <h3>次に試すこと</h3>
    <p>正解を一つに決める課題ではありません。1か所ずつ変え、結果を比べてください。</p>
    <ul>${items}</ul>
    ${colabLink}
  `;
}

function updateProgress() {
  const completed = LESSONS.filter((lesson) => completedLessons.has(lesson.id)).length;
  elements.progressLabel.textContent = `${completed} / ${LESSONS.length}`;
  elements.progressBar.style.width = `${(completed / LESSONS.length) * 100}%`;
}

function markLessonComplete(id) {
  if (completedLessons.has(id)) {
    return;
  }
  completedLessons.add(id);
  storage.setCompletedLessons(completedLessons);
  renderLessonNav();
  renderLessonContent();
  updateProgress();
}

function selectLesson(id) {
  if (id === state.lessonId) {
    return;
  }
  storage.setCode(state.lessonId, editor.getValue());
  audio.stop({ announce: false });
  state.lessonId = id;
  state.song = null;
  storage.setCurrentLesson(id);
  const lesson = currentLesson();
  const savedCode = storage.getCode(id);
  editor.setValue(savedCode ?? lesson.code);
  editor.clearErrorLine();
  visualiser.clear();
  renderEmptySongData();
  elements.consoleOutput.textContent = "Pythonを実行すると、このレッスンの曲データが作られます。";
  resetErrorHelp();
  setOutputTab("console");
  elements.editorTitle.textContent = `Pythonコード — Lesson ${lesson.number}`;
  renderLessonNav();
  renderLessonContent();
  renderChallenge();
  syncControlsFromCode();
  setRunMessage("コードを読み、変更してからPythonを実行してください。", "");
  elements.lessonContent.scrollTop = 0;
}

function handleEditorChange() {
  elements.saveStatus.textContent = "保存中…";
  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(() => {
    const ok = storage.setCode(state.lessonId, editor.getValue());
    elements.saveStatus.textContent = ok ? "保存済み" : "保存できません";
  }, 350);
}

function setOutputTab(name) {
  const consoleActive = name === "console";
  elements.tabConsole.classList.toggle("is-active", consoleActive);
  elements.tabHelp.classList.toggle("is-active", !consoleActive);
  elements.tabConsole.setAttribute("aria-selected", String(consoleActive));
  elements.tabHelp.setAttribute("aria-selected", String(!consoleActive));
  elements.consolePanel.hidden = !consoleActive;
  elements.errorPanel.hidden = consoleActive;
}

function resetErrorHelp() {
  elements.errorHelp.className = "error-help empty-state";
  elements.errorHelp.textContent = "エラーが起きたとき、原因を考えるためのヒントを表示します。";
}

function renderError(result) {
  const help = buildErrorHelp(result);
  editor.highlightErrorLine(help.line);
  elements.errorHelp.className = "error-help";
  elements.errorHelp.innerHTML = `
    <h3>${escapeHtml(help.title)}</h3>
    ${help.line ? `<p><strong>${help.line}行目付近</strong>を確認してください。</p>` : ""}
    <p>${escapeHtml(help.explanation)}</p>
    <ul>${help.suggestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <details>
      <summary>Pythonの元のエラーを表示</summary>
      <pre class="original-error">${escapeHtml(help.original)}</pre>
    </details>
  `;
  setOutputTab("help");
}

function validateSong(song) {
  if (!song || typeof song !== "object" || !Array.isArray(song.tracks)) {
    throw new Error("Pythonから受け取った曲データの形式が正しくありません。");
  }
  if (!Number.isFinite(Number(song.tempo))) {
    throw new Error("曲データに正しいテンポがありません。");
  }
  return song;
}

async function runCode({ quiet = false } = {}) {
  if (state.running || !state.pythonReady) {
    return;
  }
  state.running = true;
  elements.runButton.disabled = true;
  elements.runButton.innerHTML = '<span aria-hidden="true">…</span> 実行中';
  editor.clearErrorLine();
  resetErrorHelp();
  if (!quiet) {
    setOutputTab("console");
  }
  setRunMessage("Pythonコードを実行し、曲データを組み立てています。", "loading");
  elements.consoleOutput.textContent = "実行中…";
  audio.stop({ announce: false });

  try {
    const result = await python.run(editor.getValue());
    if (result.ok) {
      const song = validateSong(result.song);
      state.song = song;
      visualiser.setSong(song);
      renderEventTable(song, elements.eventTableBody);
      renderSongSummary(song);
      syncControlsFromSong(song);
      elements.playButton.disabled = countEvents(song) === 0;
      elements.downloadSongButton.disabled = false;
      elements.pauseButton.disabled = true;
      elements.stopButton.disabled = true;

      const outputLines = [
        "✓ Pythonの実行に成功しました。",
        `曲名: ${song.title || "Untitled"}`,
        `テンポ: ${song.tempo} BPM`,
        `長さ: ${formatBeat(songLength(song))} 拍`,
        `トラック: ${song.tracks.length}`,
        `音イベント: ${countEvents(song)}`,
      ];
      if (result.stdout) {
        outputLines.push("", "--- printの出力 ---", result.stdout.trimEnd());
      }
      if (result.stderr) {
        outputLines.push("", "--- 標準エラー出力 ---", result.stderr.trimEnd());
      }
      elements.consoleOutput.textContent = outputLines.join("\n");
      setRunMessage(
        countEvents(song) > 0
          ? "実行成功。右の再生ボタンで音を確認できます。"
          : "実行成功。ただし音イベントがありません。add_noteなどを追加してください。",
        "success",
      );
      setOutputTab("console");
      if (!quiet && countEvents(song) > 0) {
        markLessonComplete(state.lessonId);
      }
    } else {
      state.song = null;
      visualiser.clear();
      renderEmptySongData();
      elements.consoleOutput.textContent = [result.stdout, result.stderr, result.traceback]
        .filter(Boolean)
        .join("\n") || "Pythonの実行中にエラーが起きました。";
      renderError(result);
      setRunMessage(`${result.errorType || "Error"}: ${result.error || "実行に失敗しました"}`, "error");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    state.song = null;
    renderEmptySongData();
    elements.consoleOutput.textContent = message;
    renderError({ errorType: "RuntimeError", error: message, traceback: message });
    setRunMessage(message, "error");
  } finally {
    state.running = false;
    elements.runButton.disabled = !state.pythonReady;
    elements.runButton.innerHTML = '<span aria-hidden="true">▶</span> Pythonを実行';
  }
}

function renderSongSummary(song) {
  elements.summaryTempo.textContent = `${song.tempo} BPM`;
  elements.summaryLength.textContent = `${formatBeat(songLength(song))} 拍`;
  elements.summaryEvents.textContent = String(countEvents(song));
  elements.summaryTracks.textContent = String(song.tracks.length);
}

function renderEmptySongData() {
  elements.summaryTempo.textContent = "—";
  elements.summaryLength.textContent = "—";
  elements.summaryEvents.textContent = "—";
  elements.summaryTracks.textContent = "—";
  elements.eventTableBody.innerHTML = '<tr><td colspan="6">Pythonを実行すると、ここにイベントが表示されます。</td></tr>';
  elements.playButton.disabled = true;
  elements.pauseButton.disabled = true;
  elements.stopButton.disabled = true;
  elements.downloadSongButton.disabled = true;
}

function updateAudioState(audioState) {
  if (audioState === "playing") {
    setAudioStatus("再生中", "success");
    elements.playButton.disabled = true;
    elements.pauseButton.disabled = false;
    elements.pauseButton.textContent = "Ⅱ";
    elements.pauseButton.title = "一時停止";
    elements.stopButton.disabled = false;
  } else if (audioState === "paused") {
    setAudioStatus("一時停止", "loading");
    elements.playButton.disabled = true;
    elements.pauseButton.disabled = false;
    elements.pauseButton.textContent = "▶";
    elements.pauseButton.title = "再開";
    elements.stopButton.disabled = false;
  } else {
    setAudioStatus(state.song ? "再生できます" : "音声は未開始", state.song ? "ready" : "muted");
    elements.playButton.disabled = !state.song || countEvents(state.song) === 0;
    elements.pauseButton.disabled = true;
    elements.pauseButton.textContent = "Ⅱ";
    elements.pauseButton.title = "一時停止 / 再開";
    elements.stopButton.disabled = true;
  }
}

async function playSong() {
  if (!state.song) {
    await runCode();
    if (!state.song) return;
  }
  try {
    await audio.play(state.song, { loop: elements.loopInput.checked });
  } catch (error) {
    setAudioStatus(error instanceof Error ? error.message : String(error), "error");
  }
}

function fileNameBase() {
  return `caya-lesson-${currentLesson().number}-${state.lessonId}`;
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyCode() {
  let copied = false;
  try {
    await navigator.clipboard.writeText(editor.getValue());
    copied = true;
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = editor.getValue();
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    fallback.style.pointerEvents = "none";
    document.body.append(fallback);
    fallback.select();
    copied = Boolean(document.execCommand?.("copy"));
    fallback.remove();
  }
  elements.copyButton.textContent = copied ? "コピー済み" : "コピーできません";
  window.setTimeout(() => {
    elements.copyButton.textContent = "コピー";
  }, 1200);
}

function changeCodeSetting(setting, value) {
  const result = replaceSetting(editor.getValue(), setting, value);
  if (!result) {
    elements.parameterMessage.textContent = "対応する設定行が見つかりません。コードへ直接書いてください。";
    elements.parameterMessage.classList.add("is-changed");
    return;
  }
  editor.replaceCode(result.code, result.line);
  elements.parameterMessage.textContent = `${result.line}行目を書き換えました。Pythonを再実行してください。`;
  elements.parameterMessage.classList.add("is-changed");
  setRunMessage("設定に合わせてコードが変わりました。Pythonを再実行してください。", "loading");
}

function syncControlsFromSong(song) {
  const tempo = Math.round(Number(song.tempo) || 96);
  elements.tempoInput.value = String(Math.max(50, Math.min(180, tempo)));
  elements.tempoValue.textContent = String(tempo);
  const instrument = song.tracks?.[0]?.instrument;
  if ([...elements.instrumentInput.options].some((option) => option.value === instrument)) {
    elements.instrumentInput.value = instrument;
  }
  elements.parameterMessage.textContent = "実行結果を反映しました。操作するとコードが変わります。";
  elements.parameterMessage.classList.remove("is-changed");
}

function syncControlsFromCode() {
  const code = editor.getValue();
  const tempoMatch = code.match(/^\s*tempo\s*=\s*(\d+(?:\.\d+)?)/m) ?? code.match(/tempo\s*=\s*(\d+(?:\.\d+)?)/);
  if (tempoMatch) {
    const tempo = Math.round(Number(tempoMatch[1]));
    elements.tempoInput.value = String(Math.max(50, Math.min(180, tempo)));
    elements.tempoValue.textContent = String(tempo);
  }
  const soundMatch = code.match(/^\s*(?:sound|instrument)\s*=\s*["']([^"']+)["']/m) ??
    code.match(/instrument\s*=\s*["']([^"']+)["']/);
  if (soundMatch && [...elements.instrumentInput.options].some((option) => option.value === soundMatch[1])) {
    elements.instrumentInput.value = soundMatch[1];
  }
}

function saveSettings() {
  storage.setSettings({
    volume: Number(elements.volumeInput.value),
    loop: elements.loopInput.checked,
  });
}

elements.runButton.addEventListener("click", () => runCode());
elements.copyButton.addEventListener("click", copyCode);
elements.downloadCodeButton.addEventListener("click", () => {
  downloadBlob(editor.getValue(), "text/x-python;charset=utf-8", `${fileNameBase()}.py`);
});
elements.downloadSongButton.addEventListener("click", () => {
  if (!state.song) return;
  downloadBlob(JSON.stringify(state.song, null, 2), "application/json;charset=utf-8", `${fileNameBase()}-song.json`);
});
elements.resetButton.addEventListener("click", () => {
  const lesson = currentLesson();
  const hasChanged = editor.getValue() !== lesson.code;
  if (hasChanged && !window.confirm("このレッスンのコードを初期状態へ戻しますか？")) {
    return;
  }
  storage.removeCode(lesson.id);
  editor.setValue(lesson.code);
  editor.clearErrorLine();
  syncControlsFromCode();
  setRunMessage("初期コードへ戻しました。Pythonを実行して確認してください。", "");
});
elements.tabConsole.addEventListener("click", () => setOutputTab("console"));
elements.tabHelp.addEventListener("click", () => setOutputTab("help"));
elements.playButton.addEventListener("click", playSong);
elements.pauseButton.addEventListener("click", () => audio.pauseOrResume());
elements.stopButton.addEventListener("click", () => audio.stop());
elements.loopInput.addEventListener("change", () => {
  audio.setLoop(elements.loopInput.checked);
  saveSettings();
});
elements.volumeInput.addEventListener("input", () => {
  audio.setVolume(elements.volumeInput.value);
  saveSettings();
});
elements.tempoInput.addEventListener("input", () => {
  elements.tempoValue.textContent = elements.tempoInput.value;
});
elements.tempoInput.addEventListener("change", () => {
  changeCodeSetting("tempo", Number(elements.tempoInput.value));
});
elements.instrumentInput.addEventListener("change", () => {
  changeCodeSetting("instrument", elements.instrumentInput.value);
});
elements.openHelp.addEventListener("click", () => elements.helpDialog.showModal());

window.addEventListener("beforeunload", () => {
  storage.setCode(state.lessonId, editor.getValue());
  saveSettings();
  python.destroy();
});

function initialisePage() {
  const savedCode = storage.getCode(state.lessonId);
  editor.setValue(savedCode ?? initialLesson.code);
  elements.editorTitle.textContent = `Pythonコード — Lesson ${initialLesson.number}`;
  renderLessonNav();
  renderLessonContent();
  renderChallenge();
  updateProgress();
  renderEmptySongData();
  syncControlsFromCode();

  if (window.location.protocol === "file:") {
    setRunMessage(
      "このアプリはWeb Workerを使うため、ファイルを直接開かずローカルサーバーまたはGitHub Pagesから開いてください。",
      "error",
    );
  }
}

initialisePage();
