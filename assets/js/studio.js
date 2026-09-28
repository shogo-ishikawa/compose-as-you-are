import { AudioEngine } from "./audio-engine.js";
import { CodeEditor } from "./editor.js";
import { buildErrorHelp } from "./error-help.js";
import { countEvents, formatBeat, songLength } from "./note-utils.js";
import { PythonRunner } from "./python-client.js";
import {
  CHORDS,
  createBlankProject,
  generatePythonCode,
  normaliseProject,
  PRESET_LABELS,
  PRESETS,
  SCALES,
  STEP_COUNT,
} from "./studio-model.js";
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
  pythonStatus: $("#studio-python-status"),
  saveStatus: $("#studio-save-status"),
  syncStatus: $("#studio-sync-status"),
  title: $("#studio-title"),
  preset: $("#studio-preset"),
  tempo: $("#studio-tempo"),
  tempoValue: $("#studio-tempo-value"),
  stepDuration: $("#studio-step-duration"),
  scale: $("#studio-scale"),
  seed: $("#studio-seed"),
  randomise: $("#studio-randomise"),
  clear: $("#studio-clear"),
  sequencer: $("#sequencer-grid"),
  chords: $("#studio-chords"),
  mixer: $("#studio-mixer"),
  syncCode: $("#studio-sync-code"),
  downloadCode: $("#studio-download-code"),
  codeTextarea: $("#studio-code-editor"),
  runCode: $("#studio-run-code"),
  runMessage: $("#studio-run-message"),
  console: $("#studio-console"),
  errorHelp: $("#studio-error-help"),
  audioStatus: $("#studio-audio-status"),
  play: $("#studio-play"),
  pause: $("#studio-pause"),
  stop: $("#studio-stop"),
  loop: $("#studio-loop"),
  masterVolume: $("#studio-master-volume"),
  summaryTempo: $("#studio-summary-tempo"),
  summaryLength: $("#studio-summary-length"),
  summaryEvents: $("#studio-summary-events"),
  summaryTracks: $("#studio-summary-tracks"),
  canvas: $("#studio-piano-roll"),
  downloadSong: $("#studio-download-song"),
  eventTable: $("#studio-event-table"),
};

const savedSettings = storage.getSettings();
const savedProject = storage.getStudioProject();
let project = normaliseProject(savedProject ?? PRESETS.neon_arpeggio ?? createBlankProject());

const state = {
  pythonReady: false,
  running: false,
  song: null,
  codeLinked: true,
  saveTimer: null,
  suppressEditorChange: false,
};

const visualiser = new PianoRollVisualiser(elements.canvas);
const editor = new CodeEditor(elements.codeTextarea, {
  onChange: () => handleCodeChange(),
  onRunShortcut: () => runStudioCode(),
});

const audio = new AudioEngine({
  onTick: (beat) => visualiser.setPlayhead(beat),
  onState: (audioState) => updateAudioState(audioState),
  onError: (message) => setAudioStatus(message, "error"),
});

elements.masterVolume.value = String(savedSettings.volume ?? 62);
elements.loop.checked = Boolean(savedSettings.loop);
audio.setVolume(elements.masterVolume.value);
audio.setLoop(elements.loop.checked);

const python = new PythonRunner({
  timeoutMs: 7000,
  onStatus: ({ status, message }) => {
    if (status === "ready") {
      state.pythonReady = true;
      elements.runCode.disabled = false;
      setPythonStatus("Pythonを実行できます", "ready");
      setRunMessage("シーケンサーをコードへ反映し、Pythonを実行してください。", "");
    } else if (["loading", "preparing", "recovering", "running", "closed"].includes(status)) {
      state.pythonReady = false;
      elements.runCode.disabled = true;
      setPythonStatus(message || "Pythonを準備中", "loading");
    } else {
      state.pythonReady = false;
      elements.runCode.disabled = true;
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

function setSyncStatus(linked, text = null) {
  state.codeLinked = linked;
  elements.syncStatus.className = `sync-status ${linked ? "is-linked" : "is-unlinked"}`;
  elements.syncStatus.textContent = text ?? (linked ? "シーケンサーとコードは同期中" : "コードを手動編集中：未同期");
}

function setSaveStatus(text) {
  elements.saveStatus.textContent = text;
}

function scheduleSave() {
  setSaveStatus("保存中…");
  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(() => {
    const projectSaved = storage.setStudioProject(project);
    const codeSaved = storage.setStudioCode(editor.getValue());
    setSaveStatus(projectSaved && codeSaved ? "保存済み" : "保存できません");
  }, 250);
}

function populateSelects() {
  elements.preset.innerHTML = '<option value="">プリセットを選択</option>' + Object.entries(PRESET_LABELS)
    .map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`)
    .join("");
  elements.scale.innerHTML = Object.entries(SCALES)
    .map(([value, item]) => `<option value="${value}">${escapeHtml(item.label)}</option>`)
    .join("");
}

function syncProjectControls() {
  elements.title.value = project.title;
  elements.tempo.value = String(project.tempo);
  elements.tempoValue.textContent = String(project.tempo);
  elements.stepDuration.value = project.stepDuration;
  elements.scale.value = project.scaleId;
  elements.seed.value = String(project.seed);
}

function stepClass(index) {
  const classes = ["sequencer-cell"];
  if (index % 4 === 0) classes.push("is-bar-start");
  if (index % 8 >= 4) classes.push("is-alt-bar");
  return classes.join(" ");
}

function cycleValue(values, current, direction = 1) {
  const choices = [null, ...values];
  const currentIndex = choices.findIndex((value) => value === current);
  const index = currentIndex < 0 ? 0 : currentIndex;
  return choices[(index + direction + choices.length) % choices.length];
}

function renderSequencer() {
  const scale = SCALES[project.scaleId];
  elements.sequencer.replaceChildren();

  const corner = document.createElement("div");
  corner.className = "sequencer-label sequencer-corner";
  corner.textContent = "TRACK";
  elements.sequencer.append(corner);

  for (let index = 0; index < STEP_COUNT; index += 1) {
    const header = document.createElement("div");
    header.className = `${stepClass(index)} sequencer-step-number`;
    header.textContent = String(index + 1);
    if (index % 4 === 0) header.dataset.bar = String(Math.floor(index / 4) + 1);
    elements.sequencer.append(header);
  }

  renderNoteRow("melody", "旋律", scale.melody);
  renderNoteRow("bass", "低音", scale.bass);
  renderDrumRow("kick", "Kick");
  renderDrumRow("snare", "Snare");
  renderDrumRow("hihat", "Hi-hat");
}

function renderNoteRow(track, label, palette) {
  const rowLabel = document.createElement("div");
  rowLabel.className = `sequencer-label track-${track}`;
  rowLabel.innerHTML = `<strong>${escapeHtml(label)}</strong><small>click: 次の音</small>`;
  elements.sequencer.append(rowLabel);

  for (let index = 0; index < STEP_COUNT; index += 1) {
    const note = project[track][index];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${stepClass(index)} step-button note-step track-${track}${note ? " is-active" : ""}`;
    button.textContent = note ?? "·";
    button.title = `${label} ${index + 1}ステップ: ${note ?? "無音"}`;
    button.setAttribute("aria-label", button.title);
    button.addEventListener("click", (event) => {
      const direction = event.shiftKey ? -1 : 1;
      project[track][index] = cycleValue(palette, project[track][index], direction);
      projectChanged({ rerenderSequencer: true });
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      project[track][index] = null;
      projectChanged({ rerenderSequencer: true });
    });
    elements.sequencer.append(button);
  }
}

function renderDrumRow(sound, label) {
  const rowLabel = document.createElement("div");
  rowLabel.className = `sequencer-label track-${sound}`;
  rowLabel.innerHTML = `<strong>${escapeHtml(label)}</strong><small>on / off</small>`;
  elements.sequencer.append(rowLabel);

  for (let index = 0; index < STEP_COUNT; index += 1) {
    const active = project.drums[sound][index];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${stepClass(index)} step-button drum-step track-${sound}${active ? " is-active" : ""}`;
    button.textContent = active ? "●" : "·";
    button.title = `${label} ${index + 1}ステップ: ${active ? "オン" : "オフ"}`;
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", button.title);
    button.addEventListener("click", () => {
      project.drums[sound][index] = !project.drums[sound][index];
      projectChanged({ rerenderSequencer: true });
    });
    elements.sequencer.append(button);
  }
}

function renderChords() {
  elements.chords.replaceChildren();
  for (let bar = 0; bar < 4; bar += 1) {
    const label = document.createElement("label");
    label.innerHTML = `<span>${bar + 1}区間目</span>`;
    const select = document.createElement("select");
    select.setAttribute("aria-label", `${bar + 1}区間目の和音`);
    select.innerHTML = Object.entries(CHORDS)
      .map(([value, item]) => `<option value="${value}">${escapeHtml(item.label)}</option>`)
      .join("");
    select.value = project.chords[bar];
    select.addEventListener("change", () => {
      project.chords[bar] = select.value;
      projectChanged();
    });
    label.append(select);
    elements.chords.append(label);
  }
}

const MIXER_META = {
  melody: { label: "旋律", instruments: ["pluck", "soft_synth", "bell", "warm_pad"] },
  chords: { label: "和音", instruments: ["warm_pad", "soft_synth", "bell", "pluck"] },
  bass: { label: "低音", instruments: ["bass", "soft_synth", "pluck"] },
  drums: { label: "ドラム", instruments: ["drums"] },
};

const INSTRUMENT_LABELS = {
  soft_synth: "Soft Synth",
  pluck: "Pluck",
  bell: "Bell",
  warm_pad: "Warm Pad",
  bass: "Bass",
  drums: "Drums",
};

function renderMixer() {
  elements.mixer.replaceChildren();
  for (const [trackId, meta] of Object.entries(MIXER_META)) {
    const track = project.tracks[trackId];
    const card = document.createElement("article");
    card.className = `mixer-card mixer-${trackId}`;
    card.innerHTML = `
      <h3>${escapeHtml(meta.label)}</h3>
      <label><span>音色</span><select data-mixer="instrument"></select></label>
      <label><span>音量 <output data-output="volume">${Math.round(track.volume * 100)}</output>%</span><input data-mixer="volume" type="range" min="0" max="100" value="${Math.round(track.volume * 100)}"></label>
      <label><span>パン <output data-output="pan">${track.pan.toFixed(2)}</output></span><input data-mixer="pan" type="range" min="-100" max="100" value="${Math.round(track.pan * 100)}"></label>
    `;
    const instrument = card.querySelector('[data-mixer="instrument"]');
    instrument.innerHTML = meta.instruments
      .map((value) => `<option value="${value}">${INSTRUMENT_LABELS[value]}</option>`)
      .join("");
    instrument.value = track.instrument;
    instrument.disabled = meta.instruments.length === 1;
    instrument.addEventListener("change", () => {
      project.tracks[trackId].instrument = instrument.value;
      projectChanged();
    });

    const volume = card.querySelector('[data-mixer="volume"]');
    const volumeOutput = card.querySelector('[data-output="volume"]');
    volume.addEventListener("input", () => {
      project.tracks[trackId].volume = Number(volume.value) / 100;
      volumeOutput.textContent = volume.value;
      projectChanged({ updateCodeOnly: true });
    });

    const pan = card.querySelector('[data-mixer="pan"]');
    const panOutput = card.querySelector('[data-output="pan"]');
    pan.addEventListener("input", () => {
      project.tracks[trackId].pan = Number(pan.value) / 100;
      panOutput.textContent = project.tracks[trackId].pan.toFixed(2);
      projectChanged({ updateCodeOnly: true });
    });
    elements.mixer.append(card);
  }
}

function invalidateSong() {
  audio.stop({ announce: false });
  state.song = null;
  visualiser.clear();
  elements.play.disabled = true;
  elements.pause.disabled = true;
  elements.stop.disabled = true;
  elements.downloadSong.disabled = true;
  elements.summaryTempo.textContent = "—";
  elements.summaryLength.textContent = "—";
  elements.summaryEvents.textContent = "—";
  elements.summaryTracks.textContent = "—";
  elements.eventTable.innerHTML = '<tr><td colspan="6">Pythonを再実行するとイベントが表示されます。</td></tr>';
  setAudioStatus("Pythonの再実行が必要", "muted");
}

function projectChanged({ rerenderSequencer = false, updateCodeOnly = false } = {}) {
  project = normaliseProject(project);
  syncProjectControls();
  if (rerenderSequencer) renderSequencer();
  if (!updateCodeOnly) renderChords();
  if (state.codeLinked) {
    replaceEditorCode(generatePythonCode(project));
    setSyncStatus(true);
  } else {
    setSyncStatus(false, "シーケンサー変更あり：コードへ未反映");
  }
  invalidateSong();
  scheduleSave();
}

function replaceEditorCode(code) {
  state.suppressEditorChange = true;
  editor.setValue(code);
  state.suppressEditorChange = false;
}

function handleCodeChange() {
  if (state.suppressEditorChange) return;
  setSyncStatus(false);
  invalidateSong();
  scheduleSave();
}

function syncCodeFromProject({ force = false } = {}) {
  if (!force && !state.codeLinked) {
    const proceed = window.confirm("手動で編集したPythonコードを、シーケンサーから生成したコードで置き換えますか？");
    if (!proceed) return;
  }
  replaceEditorCode(generatePythonCode(project));
  setSyncStatus(true);
  invalidateSong();
  scheduleSave();
  setRunMessage("シーケンサーをPythonコードへ反映しました。実行して音を確認してください。", "");
}

function loadPreset(id) {
  const preset = PRESETS[id];
  if (!preset) return;
  project = normaliseProject(structuredClone(preset));
  syncProjectControls();
  renderSequencer();
  renderChords();
  renderMixer();
  replaceEditorCode(generatePythonCode(project));
  setSyncStatus(true);
  invalidateSong();
  scheduleSave();
  elements.preset.value = "";
  setRunMessage(`プリセット「${PRESET_LABELS[id]}」を読み込みました。`, "success");
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function randomChoice(values, random) {
  return values[Math.floor(random() * values.length)];
}

function randomiseProject() {
  const random = mulberry32(project.seed);
  const scale = SCALES[project.scaleId];
  project.melody = Array.from({ length: STEP_COUNT }, (_, index) => {
    if (index === STEP_COUNT - 1) return scale.melody[0];
    if (random() < 0.24) return null;
    return randomChoice(scale.melody, random);
  });
  project.bass = Array.from({ length: STEP_COUNT }, (_, index) => {
    if (index % 4 !== 0 || random() < 0.15) return null;
    return randomChoice(scale.bass.slice(0, 5), random);
  });
  const chordNames = ["C", "Am", "F", "G", "Dm", "Em"];
  project.chords = Array.from({ length: 4 }, () => randomChoice(chordNames, random));
  project.drums.kick = Array.from({ length: STEP_COUNT }, (_, index) => index % 4 === 0 || (index % 4 === 2 && random() < 0.28));
  project.drums.snare = Array.from({ length: STEP_COUNT }, (_, index) => index % 4 === 2);
  project.drums.hihat = Array.from({ length: STEP_COUNT }, (_, index) => index % 2 === 0 || random() < 0.18);
  renderSequencer();
  renderChords();
  projectChanged();
  setRunMessage(`seed ${project.seed} から新しいパターンを作りました。`, "success");
}

function clearProject() {
  if (!window.confirm("旋律・低音・和音・ドラムのパターンを全て消去しますか？")) return;
  project.melody = Array(STEP_COUNT).fill(null);
  project.bass = Array(STEP_COUNT).fill(null);
  project.chords = Array(4).fill("none");
  project.drums = {
    kick: Array(STEP_COUNT).fill(false),
    snare: Array(STEP_COUNT).fill(false),
    hihat: Array(STEP_COUNT).fill(false),
  };
  renderSequencer();
  renderChords();
  projectChanged();
  setRunMessage("パターンを消去しました。セルをクリックして新しい曲を作ってください。", "");
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
    <details><summary>Pythonの元のエラー</summary><pre class="original-error">${escapeHtml(help.original)}</pre></details>
  `;
}

function resetErrorHelp() {
  elements.errorHelp.className = "error-help empty-state";
  elements.errorHelp.textContent = "エラーが起きたとき、日本語の手掛かりを表示します。";
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

async function runStudioCode() {
  if (state.running || !state.pythonReady) return;
  state.running = true;
  elements.runCode.disabled = true;
  elements.runCode.innerHTML = '<span aria-hidden="true">…</span> 実行中';
  editor.clearErrorLine();
  resetErrorHelp();
  elements.console.textContent = "実行中…";
  setRunMessage("Pythonコードを実行し、曲データを組み立てています。", "loading");
  audio.stop({ announce: false });

  try {
    const result = await python.run(editor.getValue());
    if (!result.ok) {
      state.song = null;
      visualiser.clear();
      invalidateSong();
      elements.console.textContent = [result.stdout, result.stderr, result.traceback].filter(Boolean).join("\n") || "Pythonの実行中にエラーが起きました。";
      renderError(result);
      setRunMessage(`${result.errorType || "Error"}: ${result.error || "実行に失敗しました"}`, "error");
      return;
    }

    const song = validateSong(result.song);
    state.song = song;
    visualiser.setSong(song);
    renderEventTable(song, elements.eventTable);
    elements.summaryTempo.textContent = `${song.tempo} BPM`;
    elements.summaryLength.textContent = `${formatBeat(songLength(song))} 拍`;
    elements.summaryEvents.textContent = String(countEvents(song));
    elements.summaryTracks.textContent = String(song.tracks.length);
    elements.play.disabled = countEvents(song) === 0;
    elements.downloadSong.disabled = false;
    elements.pause.disabled = true;
    elements.stop.disabled = true;
    setAudioStatus(countEvents(song) ? "再生できます" : "音イベントがありません", countEvents(song) ? "ready" : "muted");

    const lines = [
      "✓ Pythonの実行に成功しました。",
      `曲名: ${song.title || "Untitled"}`,
      `テンポ: ${song.tempo} BPM`,
      `長さ: ${formatBeat(songLength(song))} 拍`,
      `トラック: ${song.tracks.length}`,
      `音イベント: ${countEvents(song)}`,
    ];
    if (result.stdout) lines.push("", "--- printの出力 ---", result.stdout.trimEnd());
    if (result.stderr) lines.push("", "--- 標準エラー出力 ---", result.stderr.trimEnd());
    elements.console.textContent = lines.join("\n");
    setRunMessage(countEvents(song) ? "実行成功。再生して、コードと音の対応を確認してください。" : "実行成功。ただし音イベントがありません。", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    invalidateSong();
    elements.console.textContent = message;
    renderError({ errorType: "RuntimeError", error: message, traceback: message });
    setRunMessage(message, "error");
  } finally {
    state.running = false;
    elements.runCode.disabled = !state.pythonReady;
    elements.runCode.innerHTML = '<span aria-hidden="true">▶</span> Pythonを実行';
  }
}

function updateAudioState(audioState) {
  if (audioState === "playing") {
    setAudioStatus("再生中", "success");
    elements.play.disabled = true;
    elements.pause.disabled = false;
    elements.pause.textContent = "Ⅱ";
    elements.stop.disabled = false;
  } else if (audioState === "paused") {
    setAudioStatus("一時停止", "loading");
    elements.play.disabled = true;
    elements.pause.disabled = false;
    elements.pause.textContent = "▶";
    elements.stop.disabled = false;
  } else {
    setAudioStatus(state.song ? "再生できます" : "音声は未開始", state.song ? "ready" : "muted");
    elements.play.disabled = !state.song || countEvents(state.song) === 0;
    elements.pause.disabled = true;
    elements.pause.textContent = "Ⅱ";
    elements.stop.disabled = true;
  }
}

async function playSong() {
  if (!state.song) {
    await runStudioCode();
    if (!state.song) return;
  }
  try {
    await audio.play(state.song, { loop: elements.loop.checked });
  } catch (error) {
    setAudioStatus(error instanceof Error ? error.message : String(error), "error");
  }
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

function safeFilename(value) {
  const result = String(value).trim().replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
  return result || "caya-studio-track";
}

function saveSettings() {
  storage.setSettings({ volume: Number(elements.masterVolume.value), loop: elements.loop.checked });
}

function bindControls() {
  elements.title.addEventListener("input", () => {
    project.title = elements.title.value || "Untitled";
    projectChanged({ updateCodeOnly: true });
  });
  elements.preset.addEventListener("change", () => loadPreset(elements.preset.value));
  elements.tempo.addEventListener("input", () => {
    project.tempo = Number(elements.tempo.value);
    elements.tempoValue.textContent = elements.tempo.value;
    projectChanged({ updateCodeOnly: true });
  });
  elements.stepDuration.addEventListener("change", () => {
    project.stepDuration = elements.stepDuration.value;
    projectChanged({ updateCodeOnly: true });
  });
  elements.scale.addEventListener("change", () => {
    project.scaleId = elements.scale.value;
    renderSequencer();
    projectChanged();
  });
  elements.seed.addEventListener("change", () => {
    project.seed = Number(elements.seed.value);
    projectChanged({ updateCodeOnly: true });
  });
  elements.randomise.addEventListener("click", randomiseProject);
  elements.clear.addEventListener("click", clearProject);
  elements.syncCode.addEventListener("click", () => syncCodeFromProject());
  elements.runCode.addEventListener("click", runStudioCode);
  elements.play.addEventListener("click", playSong);
  elements.pause.addEventListener("click", () => audio.pauseOrResume());
  elements.stop.addEventListener("click", () => audio.stop());
  elements.loop.addEventListener("change", () => {
    audio.setLoop(elements.loop.checked);
    saveSettings();
  });
  elements.masterVolume.addEventListener("input", () => {
    audio.setVolume(elements.masterVolume.value);
    saveSettings();
  });
  elements.downloadCode.addEventListener("click", () => {
    downloadBlob(editor.getValue(), "text/x-python;charset=utf-8", `${safeFilename(project.title)}.py`);
  });
  elements.downloadSong.addEventListener("click", () => {
    if (!state.song) return;
    downloadBlob(JSON.stringify(state.song, null, 2), "application/json;charset=utf-8", `${safeFilename(project.title)}-song.json`);
  });
}

function initialise() {
  populateSelects();
  syncProjectControls();
  renderSequencer();
  renderChords();
  renderMixer();
  const generated = generatePythonCode(project);
  const savedCode = storage.getStudioCode();
  replaceEditorCode(savedCode ?? generated);
  setSyncStatus(!savedCode || savedCode.trim() === generated.trim());
  bindControls();
  resetErrorHelp();
  invalidateSong();

  if (window.location.protocol === "file:") {
    setRunMessage("このアプリはWeb Workerを使うため、ファイルを直接開かずWebサーバーから開いてください。", "error");
  }
}

window.addEventListener("pagehide", () => {
  storage.setStudioProject(project);
  storage.setStudioCode(editor.getValue());
  saveSettings();
  python.destroy();
});
window.addEventListener("pageshow", () => { if (!python.ready) python.ensureReady().catch(() => {}); });

initialise();
