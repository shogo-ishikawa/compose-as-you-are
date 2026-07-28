import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { ACTIVITY_ORDER, LESSONS } from "../assets/js/lessons.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const pythonDir = fileURLToPath(new URL("../assets/python", import.meta.url));

function runLessonCode(code) {
  const wrapper = [
    "import importlib, json, sys",
    `sys.path.insert(0, ${JSON.stringify(pythonDir)})`,
    "import caya_music",
    "caya_music = importlib.reload(caya_music)",
    `code = ${JSON.stringify(code)}`,
    "scope = {",
    '    "__name__": "__main__",',
    '    "begin_song": caya_music.start_song,',
    '    "record_note": caya_music.add_note,',
    "}",
    'exec(compile(code, "lesson.py", "exec"), scope)',
    'print("__CAYA_JSON__" + json.dumps(caya_music.export_song(), ensure_ascii=False))',
  ].join("\n");
  return spawnSync("python3", ["-c", wrapper], { cwd: root, encoding: "utf8", timeout: 8000 });
}

test("the lesson collection is complete, ordered, and has three activities", () => {
  assert.equal(LESSONS.length, 7);
  assert.deepEqual(LESSONS.map((lesson) => lesson.number), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(new Set(LESSONS.map((lesson) => lesson.id)).size, LESSONS.length);
  for (const lesson of LESSONS) {
    assert.ok(lesson.title.length > 0);
    assert.ok(lesson.overview.length > 20);
    assert.ok(lesson.syntax.length >= 3);
    assert.ok(lesson.steps.length >= 3);
    assert.ok(lesson.bridge.length > 20);
    assert.deepEqual(Object.keys(lesson.variants), ACTIVITY_ORDER);
    for (const id of ACTIVITY_ORDER) {
      const activity = lesson.variants[id];
      assert.ok(activity.title.length > 0);
      assert.ok(activity.description.length > 20);
      assert.ok(activity.tasks.length >= 2);
      assert.ok(activity.reflection.length > 20);
      assert.ok(activity.code.length > 80);
    }
  }
});

test("Lesson 1 defines functions without import, and Lesson 2 introduces import", () => {
  const lesson1 = LESSONS[0];
  for (const id of ACTIVITY_ORDER) {
    assert.doesNotMatch(lesson1.variants[id].code, /^\s*(from|import)\s/m);
    assert.match(lesson1.variants[id].code, /def\s+add_note\s*\(/);
  }
  assert.match(LESSONS[1].variants.example.code, /from\s+caya_music\s+import/);
});

test("Lesson 4 includes nested loops and one-third-beat triplets", () => {
  const code = LESSONS[3].variants.advanced.code;
  assert.match(code, /for\s+bar\s+in\s+range\(4\)/);
  assert.match(code, /for\s+i\s+in\s+range\(12\)/);
  assert.match(code, /1\s*\/\s*3/);
});

test("Lesson 4 advanced triplets form four bars of four beats", () => {
  const result = runLessonCode(LESSONS[3].variants.advanced.code);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const jsonLine = result.stdout.split(/\r?\n/).find((line) => line.startsWith("__CAYA_JSON__"));
  assert.ok(jsonLine);
  const song = JSON.parse(jsonLine.slice("__CAYA_JSON__".length));
  assert.ok(Math.abs(song.length_beats - 16) < 1e-9);
});

for (const lesson of LESSONS) {
  for (const activityId of ACTIVITY_ORDER) {
    test(`Lesson ${lesson.number} ${activityId} Python code runs`, () => {
      const result = runLessonCode(lesson.variants[activityId].code);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const jsonLine = result.stdout.split(/\r?\n/).find((line) => line.startsWith("__CAYA_JSON__"));
      assert.ok(jsonLine, `曲データが出力されませんでした:\n${result.stdout}`);
      const song = JSON.parse(jsonLine.slice("__CAYA_JSON__".length));
      const eventCount = song.tracks.reduce((sum, track) => sum + track.events.length, 0);
      assert.ok(eventCount > 0, `${lesson.number}/${activityId}にイベントがありません`);
      assert.ok(song.length_beats > 0);
    });
  }
}
