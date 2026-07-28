import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("essential application controls are present", () => {
  const ids = [
    "lesson-nav",
    "code-editor",
    "run-code",
    "play-song",
    "piano-roll",
    "tempo-control",
    "instrument-control",
    "event-table-body",
  ];
  for (const id of ids) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test("all application paths are relative or HTTPS", () => {
  const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
  for (const ref of refs) {
    assert.ok(
      ref.startsWith("./") || ref.startsWith("#") || ref.startsWith("https://"),
      `予期しない参照です: ${ref}`,
    );
  }
});

test("the advanced lesson links to the Colab starter", async () => {
  const appSource = await readFile(new URL("../assets/js/app.js", import.meta.url), "utf8");
  assert.match(appSource, /colab\.research\.google\.com\/github\/shogo-ishikawa\/compose-as-you-are/);
});
