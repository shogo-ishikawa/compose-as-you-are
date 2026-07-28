import assert from "node:assert/strict";
import test from "node:test";

import {
  countEvents,
  eventLabel,
  flattenSongEvents,
  formatBeat,
  midiToNote,
  noteToMidi,
  songLength,
} from "../assets/js/note-utils.js";

const song = {
  tempo: 100,
  tracks: [
    {
      name: "melody",
      instrument: "pluck",
      events: [
        { kind: "note", beat: 0, duration: 0.5, notes: ["C4"], velocity: 0.8 },
        { kind: "note", beat: 1, duration: 2, notes: ["E4", "G4"], velocity: 0.7 },
      ],
    },
    {
      name: "drums",
      instrument: "drums",
      events: [{ kind: "drum", beat: 0, duration: 0.25, sound: "kick", velocity: 0.9 }],
    },
  ],
};

test("note names and MIDI values are converted", () => {
  assert.equal(noteToMidi("C4"), 60);
  assert.equal(noteToMidi("F#4"), 66);
  assert.equal(noteToMidi("Bb3"), 58);
  assert.equal(midiToNote(60), "C4");
  assert.equal(noteToMidi("invalid"), null);
});

test("song statistics are calculated", () => {
  assert.equal(countEvents(song), 3);
  assert.equal(songLength(song), 3);
  assert.equal(formatBeat(0.5), "0.5");
  assert.equal(formatBeat(2), "2");
});

test("events are flattened and labelled", () => {
  const events = flattenSongEvents(song);
  assert.equal(events.length, 3);
  assert.equal(events[0].trackName, "melody");
  assert.equal(eventLabel(events[1]), "キック");
  assert.equal(eventLabel(events[2]), "E4 + G4");
});
