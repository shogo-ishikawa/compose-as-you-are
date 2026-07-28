import assert from "node:assert/strict";
import test from "node:test";

import { replaceSetting } from "../assets/js/code-settings.js";

test("a top-level tempo variable is replaced", () => {
  const result = replaceSetting("tempo = 96\nprint(tempo)\n", "tempo", 124);
  assert.ok(result);
  assert.equal(result.line, 1);
  assert.match(result.code, /^tempo = 124$/m);
});

test("a keyword argument keeps its trailing comma", () => {
  const code = [
    "start_song(",
    "    tempo=96,",
    '    instrument="soft_synth",',
    ")",
  ].join("\n");
  const result = replaceSetting(code, "tempo", 124);
  assert.ok(result);
  assert.match(result.code, /^    tempo = 124,$/m);
});

test("an instrument keyword keeps its trailing comma and comment", () => {
  const code = [
    "start_song(",
    '    instrument="soft_synth",  # 最初の音色',
    ")",
  ].join("\n");
  const result = replaceSetting(code, "instrument", "bell");
  assert.ok(result);
  assert.match(result.code, /^    instrument = "bell",  # 最初の音色$/m);
});

test("a one-line keyword argument can be replaced", () => {
  const result = replaceSetting('start_song(tempo=96, instrument="pluck")', "tempo", 88);
  assert.ok(result);
  assert.equal(result.code, 'start_song(tempo=88, instrument="pluck")');
});

test("null is returned when no corresponding setting exists", () => {
  assert.equal(replaceSetting('print("hello")', "tempo", 100), null);
});
