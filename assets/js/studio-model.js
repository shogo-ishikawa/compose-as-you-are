export const STEP_COUNT = 16;

export const SCALES = {
  c_pentatonic: {
    label: "Cメジャー・ペンタトニック",
    melody: ["C4", "D4", "E4", "G4", "A4", "C5"],
    bass: ["C2", "D2", "E2", "G2", "A2", "C3"],
  },
  a_minor_pentatonic: {
    label: "Aマイナー・ペンタトニック",
    melody: ["A3", "C4", "D4", "E4", "G4", "A4"],
    bass: ["A1", "C2", "D2", "E2", "G2", "A2"],
  },
  c_major: {
    label: "Cメジャー",
    melody: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
    bass: ["C2", "D2", "E2", "F2", "G2", "A2", "B2", "C3"],
  },
  d_dorian: {
    label: "Dドリアン",
    melody: ["D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5"],
    bass: ["D2", "E2", "F2", "G2", "A2", "B2", "C3", "D3"],
  },
};

export const CHORDS = {
  none: { label: "—", notes: null },
  C: { label: "C", notes: ["C4", "E4", "G4"] },
  Am: { label: "Am", notes: ["A3", "C4", "E4"] },
  F: { label: "F", notes: ["F3", "A3", "C4"] },
  G: { label: "G", notes: ["G3", "B3", "D4"] },
  Dm: { label: "Dm", notes: ["D4", "F4", "A4"] },
  Em: { label: "Em", notes: ["E4", "G4", "B4"] },
};

const blank = () => Array(STEP_COUNT).fill(null);
const drumBlank = () => Array(STEP_COUNT).fill(false);

export function createBlankProject() {
  return {
    title: "My CAYA Track",
    tempo: 112,
    stepDuration: "0.5",
    scaleId: "c_pentatonic",
    seed: 42,
    melody: blank(),
    bass: blank(),
    chords: ["C", "Am", "F", "G"],
    drums: { kick: drumBlank(), snare: drumBlank(), hihat: drumBlank() },
    tracks: {
      melody: { instrument: "pluck", volume: 0.78, pan: 0 },
      chords: { instrument: "warm_pad", volume: 0.44, pan: 0.18 },
      bass: { instrument: "bass", volume: 0.68, pan: -0.12 },
      drums: { instrument: "drums", volume: 0.64, pan: 0 },
    },
  };
}

function sequence(values, fallback = null) {
  const source = Array.isArray(values) ? values : [];
  return Array.from({ length: STEP_COUNT }, (_, index) => source[index] ?? fallback);
}

function boolSequence(values) {
  return sequence(values, false).map(Boolean);
}

function number(value, fallback, lower, upper) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(lower, Math.min(upper, numeric)) : fallback;
}

function track(source, fallback, allowedInstruments) {
  const instrument = allowedInstruments.includes(source?.instrument) ? source.instrument : fallback.instrument;
  return {
    instrument,
    volume: number(source?.volume, fallback.volume, 0, 1),
    pan: number(source?.pan, fallback.pan, -1, 1),
  };
}

export function normaliseProject(raw) {
  const fallback = createBlankProject();
  const source = raw && typeof raw === "object" ? raw : {};
  const scaleId = Object.hasOwn(SCALES, source.scaleId) ? source.scaleId : fallback.scaleId;
  const stepDuration = ["0.25", "0.5", "1", "triplet"].includes(String(source.stepDuration))
    ? String(source.stepDuration)
    : fallback.stepDuration;
  const chordNames = Array.isArray(source.chords) ? source.chords : fallback.chords;
  return {
    title: typeof source.title === "string" && source.title.trim() ? source.title.trim().slice(0, 60) : fallback.title,
    tempo: Math.round(number(source.tempo, fallback.tempo, 50, 180)),
    stepDuration,
    scaleId,
    seed: Math.round(number(source.seed, fallback.seed, 0, 999999)),
    melody: sequence(source.melody).map((note) => (typeof note === "string" ? note : null)),
    bass: sequence(source.bass).map((note) => (typeof note === "string" ? note : null)),
    chords: Array.from({ length: 4 }, (_, index) => Object.hasOwn(CHORDS, chordNames[index]) ? chordNames[index] : "none"),
    drums: {
      kick: boolSequence(source.drums?.kick),
      snare: boolSequence(source.drums?.snare),
      hihat: boolSequence(source.drums?.hihat),
    },
    tracks: {
      melody: track(source.tracks?.melody, fallback.tracks.melody, ["soft_synth", "pluck", "bell", "warm_pad"]),
      chords: track(source.tracks?.chords, fallback.tracks.chords, ["soft_synth", "pluck", "bell", "warm_pad"]),
      bass: track(source.tracks?.bass, fallback.tracks.bass, ["bass", "soft_synth", "pluck"]),
      drums: track(source.tracks?.drums, fallback.tracks.drums, ["drums"]),
    },
  };
}

export const PRESETS = {
  neon_arpeggio: normaliseProject({
    title: "Neon Arpeggio",
    tempo: 116,
    stepDuration: "0.5",
    scaleId: "c_pentatonic",
    seed: 42,
    melody: ["C4", "E4", "G4", "A4", "G4", "E4", "D4", null, "E4", "G4", "A4", "C5", "A4", "G4", "E4", null],
    bass: ["C2", null, null, null, "A1", null, null, null, "F2", null, null, null, "G2", null, null, null],
    chords: ["C", "Am", "F", "G"],
    drums: {
      kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      hihat: Array(16).fill(true),
    },
  }),
  triplet_chase: normaliseProject({
    title: "Triplet Chase",
    tempo: 144,
    stepDuration: "triplet",
    scaleId: "a_minor_pentatonic",
    seed: 81,
    melody: ["A3", "C4", "E4", "A3", "C4", "E4", "G4", "E4", "C4", "A3", "C4", "E4", "A4", "G4", "E4", "C4"],
    bass: ["A1", null, null, null, null, null, "G2", null, null, null, null, null, "A1", null, null, null],
    chords: ["Am", "Am", "G", "Am"],
    drums: {
      kick: [true, false, false, false, false, false, true, false, false, false, false, false, true, false, false, false],
      snare: [false, false, false, true, false, false, false, false, false, true, false, false, false, false, false, true],
      hihat: [true, false, true, true, false, true, true, false, true, true, false, true, true, false, true, true],
    },
    tracks: { melody: { instrument: "pluck", volume: 0.78, pan: 0 }, chords: { instrument: "warm_pad", volume: 0.34, pan: 0.18 }, bass: { instrument: "bass", volume: 0.72, pan: -0.12 }, drums: { instrument: "drums", volume: 0.58, pan: 0 } },
  }),
  quiet_orbit: normaliseProject({
    title: "Quiet Orbit",
    tempo: 76,
    stepDuration: "1",
    scaleId: "d_dorian",
    seed: 17,
    melody: ["D4", null, "A4", null, "F4", null, "E4", null, "D4", null, "G4", null, "A4", null, "D5", null],
    bass: ["D2", null, null, null, "C3", null, null, null, "G2", null, null, null, "D2", null, null, null],
    chords: ["Dm", "C", "G", "Dm"],
    drums: { kick: drumBlank(), snare: drumBlank(), hihat: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false] },
    tracks: { melody: { instrument: "bell", volume: 0.62, pan: -0.08 }, chords: { instrument: "warm_pad", volume: 0.50, pan: 0.15 }, bass: { instrument: "soft_synth", volume: 0.42, pan: 0 }, drums: { instrument: "drums", volume: 0.28, pan: 0 } },
  }),
  minimal_pulse: normaliseProject({
    title: "Minimal Pulse",
    tempo: 124,
    stepDuration: "0.25",
    scaleId: "c_major",
    seed: 123,
    melody: ["C4", null, "E4", null, "G4", null, "E4", null, "D4", null, "F4", null, "G4", null, "B4", null],
    bass: ["C2", null, null, null, "C2", null, null, null, "F2", null, null, null, "G2", null, null, null],
    chords: ["C", "C", "F", "G"],
    drums: {
      kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
    },
  }),
};

export const PRESET_LABELS = {
  neon_arpeggio: "Neon Arpeggio",
  triplet_chase: "Triplet Chase（三連符）",
  quiet_orbit: "Quiet Orbit",
  minimal_pulse: "Minimal Pulse",
};

function py(value) {
  if (value === null) return "None";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(py).join(", ")}]`;
  throw new TypeError("Python literalへ変換できない値です");
}

function compactNumber(value) {
  return Number(value).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

export function generatePythonCode(rawProject) {
  const project = normaliseProject(rawProject);
  const stepExpression = project.stepDuration === "triplet" ? "1 / 3" : project.stepDuration;
  const chordData = project.chords.map((name) => CHORDS[name]?.notes ?? null);
  const kickSteps = project.drums.kick.flatMap((active, index) => active ? [index] : []);
  const snareSteps = project.drums.snare.flatMap((active, index) => active ? [index] : []);
  const hihatSteps = project.drums.hihat.flatMap((active, index) => active ? [index] : []);
  const melody = project.tracks.melody;
  const chords = project.tracks.chords;
  const bass = project.tracks.bass;
  const drums = project.tracks.drums;

  return `from caya_music import start_song, new_track, add_note, add_chord, add_drum

# シーケンサーから生成された設定
tempo = ${project.tempo}
step = ${stepExpression}

start_song(
    tempo=tempo,
    instrument=${py(melody.instrument)},
    title=${py(project.title)},
    volume=${compactNumber(melody.volume)},
    pan=${compactNumber(melody.pan)},
)

# 旋律：Noneは音を置かないステップ
melody = ${py(project.melody)}
for i, note in enumerate(melody):
    if note is not None:
        add_note(note, step * 0.90, 0.78, beat=i * step)

# 和音：1要素が4ステップ分
new_track(
    "chords",
    instrument=${py(chords.instrument)},
    volume=${compactNumber(chords.volume)},
    pan=${compactNumber(chords.pan)},
)
chords = ${py(chordData)}
for bar, chord in enumerate(chords):
    if chord is not None:
        add_chord(chord, step * 4, 0.48, beat=bar * step * 4)

# 低音
new_track(
    "bass",
    instrument=${py(bass.instrument)},
    volume=${compactNumber(bass.volume)},
    pan=${compactNumber(bass.pan)},
)
bass = ${py(project.bass)}
for i, note in enumerate(bass):
    if note is not None:
        add_note(note, step * 0.95, 0.76, beat=i * step)

# ドラム
new_track(
    "drums",
    instrument="drums",
    volume=${compactNumber(drums.volume)},
    pan=${compactNumber(drums.pan)},
)
kick_steps = ${py(kickSteps)}
snare_steps = ${py(snareSteps)}
hihat_steps = ${py(hihatSteps)}

for i in kick_steps:
    add_drum("kick", step * 0.45, 0.90, beat=i * step)
for i in snare_steps:
    add_drum("snare", step * 0.35, 0.72, beat=i * step)
for i in hihat_steps:
    add_drum("hihat", step * 0.25, 0.42, beat=i * step)
`;
}
