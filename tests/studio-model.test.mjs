import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { generatePythonCode, normaliseProject, PRESETS, STEP_COUNT } from "../assets/js/studio-model.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const pythonDir = fileURLToPath(new URL("../assets/python", import.meta.url));

function runCode(code) {
  const wrapper = [
    "import importlib, json, sys",
    `sys.path.insert(0, ${JSON.stringify(pythonDir)})`,
    "import caya_music",
    "caya_music = importlib.reload(caya_music)",
    `code = ${JSON.stringify(code)}`,
    'exec(compile(code, "studio.py", "exec"), {"__name__": "__main__"})',
    'print("__CAYA_JSON__" + json.dumps(caya_music.export_song(), ensure_ascii=False))',
  ].join("\n");
  return spawnSync("python3", ["-c", wrapper], { cwd: root, encoding: "utf8", timeout: 8000 });
}

test("project normalisation fixes sequence lengths and ranges", () => {
  const project = normaliseProject({ tempo: 999, melody: ["C4"], drums: { kick: [1] } });
  assert.equal(project.tempo, 180);
  assert.equal(project.melody.length, STEP_COUNT);
  assert.equal(project.drums.kick.length, STEP_COUNT);
});

for (const [name, preset] of Object.entries(PRESETS)) {
  test(`studio preset ${name} generates executable Python`, () => {
    const code = generatePythonCode(preset);
    assert.match(code, /from caya_music import/);
    const result = runCode(code);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const jsonLine = result.stdout.split(/\r?\n/).find((line) => line.startsWith("__CAYA_JSON__"));
    assert.ok(jsonLine);
    const song = JSON.parse(jsonLine.slice("__CAYA_JSON__".length));
    const eventCount = song.tracks.reduce((sum, track) => sum + track.events.length, 0);
    assert.ok(eventCount > 0);
    assert.equal(song.tracks.length, 4);
  });
}

test("triplet preset emits a one-third step expression", () => {
  assert.match(generatePythonCode(PRESETS.triplet_chase), /step = 1 \/ 3/);
});
