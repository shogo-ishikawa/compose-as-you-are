const NOTE_OFFSETS = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_PATTERN = /^([A-Ga-g])([#b]?)(-?\d{1,2})$/;

export function noteToMidi(note) {
  if (typeof note !== "string") {
    return null;
  }
  const match = note.trim().match(NOTE_PATTERN);
  if (!match) {
    return null;
  }
  const pitch = `${match[1].toUpperCase()}${match[2]}`;
  const octave = Number(match[3]);
  const offset = NOTE_OFFSETS[pitch];
  if (offset === undefined || !Number.isFinite(octave)) {
    return null;
  }
  return (octave + 1) * 12 + offset;
}

export function midiToNote(midi) {
  if (!Number.isFinite(midi)) {
    return "?";
  }
  const rounded = Math.round(midi);
  const octave = Math.floor(rounded / 12) - 1;
  const name = SHARP_NAMES[((rounded % 12) + 12) % 12];
  return `${name}${octave}`;
}

export function songLength(song) {
  if (!song || !Array.isArray(song.tracks)) {
    return 0;
  }
  const declared = Number(song.length_beats);
  if (Number.isFinite(declared) && declared > 0) {
    return declared;
  }
  let length = 0;
  for (const track of song.tracks) {
    for (const event of track.events ?? []) {
      const end = Number(event.beat) + Number(event.duration);
      if (Number.isFinite(end)) {
        length = Math.max(length, end);
      }
    }
  }
  return length;
}

export function countEvents(song) {
  if (!song || !Array.isArray(song.tracks)) {
    return 0;
  }
  return song.tracks.reduce((sum, track) => sum + (track.events?.length ?? 0), 0);
}

export function flattenSongEvents(song) {
  if (!song || !Array.isArray(song.tracks)) {
    return [];
  }
  const rows = [];
  song.tracks.forEach((track, trackIndex) => {
    (track.events ?? []).forEach((event, eventIndex) => {
      rows.push({
        ...event,
        trackName: track.name,
        trackInstrument: track.instrument,
        trackIndex,
        eventIndex,
      });
    });
  });
  return rows.sort((a, b) => {
    const beatDiff = Number(a.beat) - Number(b.beat);
    if (beatDiff !== 0) {
      return beatDiff;
    }
    return a.trackIndex - b.trackIndex;
  });
}

export function eventLabel(event) {
  if (!event) {
    return "—";
  }
  if (event.kind === "drum") {
    const labels = {
      kick: "キック",
      snare: "スネア",
      hihat: "ハイハット",
      clap: "クラップ",
    };
    return labels[event.sound] ?? String(event.sound ?? "ドラム");
  }
  const notes = Array.isArray(event.notes) ? event.notes : [];
  return notes.join(" + ") || "—";
}

export function formatBeat(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "—";
  }
  if (Number.isInteger(number)) {
    return String(number);
  }
  return number.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
