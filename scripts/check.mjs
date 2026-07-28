import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LESSONS } from "../assets/js/lessons.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const textExtensions = new Set([
  ".css",
  ".html",
  ".ipynb",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".py",
  ".svg",
  ".txt",
  ".yml",
  ".yaml",
]);
const ignoredDirectories = new Set([".git", "node_modules", "__pycache__"]);
const forbiddenFragments = [
  ["", "Users", ""].join("/"),
  ["Library", "CloudStorage"].join("/"),
  ["C:", "Users", ""].join("\\"),
  ["Dropbox", "share_data", "open_material"].join("/"),
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

const requiredFiles = [
  "index.html",
  ".nojekyll",
  "README.md",
  "LICENSE",
  "assets/css/app.css",
  "assets/js/app.js",
  "assets/js/python-worker.mjs",
  "assets/python/caya_music.py",
  "colab/caya_starter.ipynb",
  ".github/workflows/pages.yml",
];

for (const relative of requiredFiles) {
  if (!existsSync(path.join(root, relative))) fail(`必要なファイルがありません: ${relative}`);
}

const files = await walk(root);
for (const file of files) {
  if (!textExtensions.has(path.extname(file)) && path.basename(file) !== ".nojekyll") continue;
  const content = await readFile(file, "utf8");
  for (const fragment of forbiddenFragments) {
    if (content.includes(fragment)) {
      fail(`公開ファイルにローカル環境の文字列があります: ${path.relative(root, file)} (${fragment})`);
    }
  }
}

const javascriptFiles = files.filter((file) => [".js", ".mjs"].includes(path.extname(file)));
for (const file of javascriptFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) fail(`JavaScript構文エラー: ${path.relative(root, file)}\n${result.stderr}`);
}

const pythonFiles = files.filter((file) => path.extname(file) === ".py");
const pythonResult = spawnSync("python3", ["-m", "py_compile", ...pythonFiles], {
  encoding: "utf8",
});
if (pythonResult.status !== 0) fail(`Python構文エラー:
${pythonResult.stderr}`);

if (LESSONS.length !== 7) fail(`レッスン数は7である必要があります: ${LESSONS.length}`);

const html = await readFile(path.join(root, "index.html"), "utf8");
const localReferences = [...html.matchAll(/(?:src|href)=["'](\.\/[^"'#?]+)["']/g)].map(
  (match) => match[1].slice(2),
);
for (const relative of localReferences) {
  if (!existsSync(path.join(root, relative))) fail(`index.htmlの参照先がありません: ${relative}`);
}

try {
  const notebook = JSON.parse(await readFile(path.join(root, "colab/caya_starter.ipynb"), "utf8"));
  if (notebook.nbformat !== 4 || !Array.isArray(notebook.cells) || notebook.cells.length < 10) {
    fail("Colabノートブックの構造が正しくありません");
  }
  for (const [index, cell] of notebook.cells.entries()) {
    if (cell.cell_type === "code" && (cell.outputs?.length || cell.execution_count !== null)) {
      fail(`Colabノートブックの${index + 1}番目のセルに実行結果が残っています`);
    }
  }
} catch (error) {
  fail(`Colabノートブックを読み取れません: ${error instanceof Error ? error.message : String(error)}`);
}

if (!process.exitCode) {
  console.log(`OK: ${files.length} files checked; ${LESSONS.length} lessons found.`);
}
