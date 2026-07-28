import assert from "node:assert/strict";
import test from "node:test";

import { AudioEngine } from "../assets/js/audio-engine.js";

class MockNode {
  constructor(options = {}) {
    this.options = options;
  }
  connect() { return this; }
  dispose() {}
  triggerAttackRelease() {}
}

class MockSynth extends MockNode {}
MockSynth.prototype.__monophonic = true;
class MockFMSynth extends MockSynth {}
class MockAMSynth extends MockSynth {}
class MockMembraneSynth extends MockSynth {}
class MockNoiseSynth extends MockSynth {}
class MockMetalSynth extends MockSynth {}
class MockPluckSynth extends MockNode {}

class MockPolySynth extends MockNode {
  constructor(Voice, options) {
    super(options);
    if (!Voice?.prototype?.__monophonic) throw new Error("Voice must extend Monophonic class");
    this.Voice = Voice;
  }
}

function installToneMock() {
  global.window = {
    Tone: {
      PolySynth: MockPolySynth,
      Synth: MockSynth,
      FMSynth: MockFMSynth,
      AMSynth: MockAMSynth,
      PluckSynth: MockPluckSynth,
      MembraneSynth: MockMembraneSynth,
      NoiseSynth: MockNoiseSynth,
      MetalSynth: MockMetalSynth,
    },
  };
}

function removeToneMock() {
  delete global.window;
}

test("pluck uses a PolySynth-compatible monophonic voice", () => {
  installToneMock();
  try {
    const engine = new AudioEngine();
    const result = engine.createInstrument("pluck", new MockNode());
    assert.equal(result.type, "melodic");
    assert.equal(result.synth.Voice, MockSynth);
    assert.notEqual(result.synth.Voice, MockPluckSynth);
  } finally {
    removeToneMock();
  }
});

test("all melodic instruments can be constructed", () => {
  installToneMock();
  try {
    const engine = new AudioEngine();
    for (const name of ["soft_synth", "pluck", "bell", "warm_pad", "bass"]) {
      const result = engine.createInstrument(name, new MockNode());
      assert.equal(result.type, "melodic", name);
      assert.ok(result.synth instanceof MockPolySynth, name);
    }
  } finally {
    removeToneMock();
  }
});

test("the drum kit constructs all four sound generators", () => {
  installToneMock();
  try {
    const engine = new AudioEngine();
    const result = engine.createInstrument("drums", new MockNode());
    assert.equal(result.type, "drums");
    for (const sound of ["kick", "snare", "hihat", "clap"]) assert.ok(result[sound]);
  } finally {
    removeToneMock();
  }
});
