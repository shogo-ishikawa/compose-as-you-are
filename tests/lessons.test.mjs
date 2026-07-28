import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { LESSONS } from "../assets/js/lessons.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const pythonDir = fileURLToPath(new URL("../assets/python", import.meta.url));

test("the lesson collection is complete and ordered", () => {
  assert.equal(LESSONS.length, 7);
  assert.deepEqual(
    LESSONS.map((lesson) => lesson.number),
    [1, 2, 3, 4, 5, 6, 7],
  );
  assert.equal(new Set(LESSONS.map((lesson) => lesson.id)).size, LESSONS.length);
  for (const lesson of LESSONS) {
    assert.ok(lesson.title.length > 0);
    assert.ok(lesson.overview.length > 20);
    assert.ok(lesson.syntax.length >= 3);
    assert.ok(lesson.steps.length >= 3);
    assert.ok(lesson.challenge.length >= 3);
    assert.match(lesson.code, /from caya_music import \*/);
  }
});

for (const lesson of LESSONS) {
  test(`lesson ${lesson.number} Python code runs`, () => {
    const wrapper = [
      "import json, sys",
      `sys.path.insert(0, ${JSON.stringify(pythonDir)})`,
      `code = ${JSON.stringify(lesson.code)}`,
      'exec(compile(code, "lesson.py", "exec"), {"__name__": "__main__"})',
      "from caya_music import export_song",
      'print("__CAYA_JSON__" + json.dumps(export_song(), ensure_ascii=False))',
    ].join("\n");
    const result = spawnSync("python3", ["-c", wrapper], {
      cwd: root,
      encoding: "utf8",
      timeout: 5000,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const jsonLine = result.stdout
      .split(/\r?\n/)
      .find((line) => line.startsWith("__CAYA_JSON__"));
    assert.ok(jsonLine, `曲データが出力されませんでした:\n${result.stdout}`);
    const song = JSON.parse(jsonLine.slice("__CAYA_JSON__".length));
    const eventCount = song.tracks.reduce((sum, track) => sum + track.events.length, 0);
    assert.ok(eventCount > 0);
    assert.ok(song.length_beats > 0);
  });
}
