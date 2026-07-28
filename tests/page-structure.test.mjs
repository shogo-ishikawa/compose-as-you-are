import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pages = {
  "index.html": ["main-content", "hero-title"],
  "lessons.html": ["lesson-nav", "code-editor", "run-code", "play-song", "piano-roll"],
  "knowledge.html": ["knowledge-search", "python", "composition", "music", "dtm"],
  "studio.html": ["sequencer-grid", "studio-code-editor", "studio-run-code", "studio-play", "studio-piano-roll"],
};

for (const [page, ids] of Object.entries(pages)) {
  test(`${page} has required elements and safe references`, async () => {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    for (const id of ids) assert.match(html, new RegExp(`id=["']${id}["']`));
    for (const href of ["./index.html", "./lessons.html", "./knowledge.html", "./studio.html"]) {
      assert.match(html, new RegExp(`href=["']${href.replaceAll(".", "\\.")}["']`));
    }
    const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
    for (const ref of refs) {
      assert.ok(ref.startsWith("./") || ref.startsWith("#") || ref.startsWith("https://"), `予期しない参照です: ${ref}`);
    }
  });
}
