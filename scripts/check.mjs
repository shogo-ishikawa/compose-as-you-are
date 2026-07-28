import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LESSONS } from "../assets/js/lessons.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const textExtensions = new Set([".css", ".html", ".ipynb", ".js", ".json", ".md", ".mjs", ".py", ".svg", ".txt", ".yml", ".yaml"]);
const ignoredDirectories = new Set([".git", "node_modules", "__pycache__"]);
const forbiddenPublicFragments = [
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

function isPrivateFile(file) {
  return path.basename(file).startsWith("PRIVATE_");
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

const requiredFiles = [
  "index.html",
  "lessons.html",
  "knowledge.html",
  "studio.html",
  ".nojekyll",
  "README.md",
  "LICENSE",
  "assets/css/app.css",
  "assets/css/studio.css",
  "assets/js/app.js",
  "assets/js/studio.js",
  "assets/js/studio-model.js",
  "assets/js/python-worker.mjs",
  "assets/python/caya_music.py",
  "assets/images/compose-as-you-are-logo.webp",
  "assets/images/compose-as-you-are-hero.webp",
  "colab/caya_starter.ipynb",
  ".github/workflows/pages.yml",
];

for (const relative of requiredFiles) {
  if (!existsSync(path.join(root, relative))) fail(`必要なファイルがありません: ${relative}`);
}

const files = await walk(root);
const publicFiles = files.filter((file) => !isPrivateFile(file));
for (const file of publicFiles) {
  if (!textExtensions.has(path.extname(file)) && path.basename(file) !== ".nojekyll") continue;
  const content = await readFile(file, "utf8");
  for (const fragment of forbiddenPublicFragments) {
    if (content.includes(fragment)) {
      fail(`公開ファイルにローカル環境の文字列があります: ${path.relative(root, file)} (${fragment})`);
    }
  }
}

const publicDocs = [
  "README.md",
  "CHANGELOG.md",
  "docs/LEARNING_GUIDE.md",
  "docs/PYTHON_GUIDE.md",
  "docs/AUTOMATIC_COMPOSITION_GUIDE.md",
  "docs/STUDIO_GUIDE.md",
  "docs/COLAB_GUIDE.md",
  "examples/README.md",
  "colab/caya_starter.ipynb",
];
const deploymentFragments = ["git push", "git init", "GitHub Pages", "Build and deployment", "shogo-ishikawa.github.io", ["", "Users", ""].join("/")];
for (const relative of publicDocs) {
  const content = await readFile(path.join(root, relative), "utf8");
  for (const fragment of deploymentFragments) {
    if (content.includes(fragment)) fail(`学生向け文書に公開作業の記述があります: ${relative} (${fragment})`);
  }
}

const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
if (!gitignore.includes("PRIVATE_*.md")) fail("PRIVATE_*.mdが.gitignoreへ登録されていません");

const javascriptFiles = publicFiles.filter((file) => [".js", ".mjs"].includes(path.extname(file)));
for (const file of javascriptFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) fail(`JavaScript構文エラー: ${path.relative(root, file)}\n${result.stderr}`);
}

const pythonFiles = publicFiles.filter((file) => path.extname(file) === ".py");
const pythonResult = spawnSync("python3", ["-m", "py_compile", ...pythonFiles], { encoding: "utf8" });
if (pythonResult.status !== 0) fail(`Python構文エラー:\n${pythonResult.stderr}`);

if (LESSONS.length !== 7) fail(`レッスン数は7である必要があります: ${LESSONS.length}`);

for (const page of ["index.html", "lessons.html", "knowledge.html", "studio.html"]) {
  const html = await readFile(path.join(root, page), "utf8");
  const localReferences = [...html.matchAll(/(?:src|href)=["'](\.\/[^"'#?]+)["']/g)].map((match) => match[1].slice(2));
  for (const relative of localReferences) {
    if (!existsSync(path.join(root, relative))) fail(`${page}の参照先がありません: ${relative}`);
  }
  for (const requiredNav of ["./index.html", "./lessons.html", "./knowledge.html", "./studio.html"]) {
    if (!html.includes(`href="${requiredNav}"`)) fail(`${page}のナビゲーションに${requiredNav}がありません`);
  }
  if (!/<h1(?:\s|>)/i.test(html)) fail(`${page}にh1見出しがありません`);
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length) fail(`${page}に重複したidがあります: ${duplicateIds.join(", ")}`);
}

const audioSource = await readFile(path.join(root, "assets/js/audio-engine.js"), "utf8");
if (/PolySynth\s*\(\s*Tone\.PluckSynth/.test(audioSource)) fail("PluckSynthをPolySynthのvoiceとして使用しています");

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
  console.log(`OK: ${publicFiles.length} public files checked; ${LESSONS.length} lessons and 4 pages found.`);
}
