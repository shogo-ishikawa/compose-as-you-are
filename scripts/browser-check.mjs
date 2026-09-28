import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const course = JSON.parse(await readFile('assets/data/curriculum.json', 'utf8'));
const base = 'http://127.0.0.1:8765';
const server = spawn('python3', ['-m', 'http.server', '8765'], { stdio: 'ignore' });
const report = { passed: [], errors: [], pageErrors: [] };
await mkdir('browser-results', { recursive: true });
let browser, page;
async function mark(name, fn) { await fn(); report.passed.push(name); console.log(`PASS: ${name}`); }
async function waitReady() {
  await page.waitForFunction(() => document.querySelector('#run-code') && !document.querySelector('#run-code').disabled, null, { timeout: 90000 });
}
async function writeCode(code) {
  await page.evaluate(source => {
    const cm = document.querySelector('.CodeMirror')?.CodeMirror;
    if (cm) {
      cm.setValue(source);
      cm.replaceRange('\n# browser verification\n', { line: cm.lineCount(), ch: 0 });
    } else {
      const area = document.querySelector('#code-editor');
      area.value = source + '\n# browser verification\n';
      area.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, code);
}
async function getCode() { return page.evaluate(() => document.querySelector('.CodeMirror')?.CodeMirror?.getValue() ?? document.querySelector('#code-editor').value); }
async function select(lesson, activity) {
  await page.locator(`[data-lesson="${lesson}"]`).click();
  await page.locator(`[data-activity="${activity}"]`).click();
}
async function runAndExpect(status) {
  await page.locator('#run-code').click();
  await page.waitForFunction(() => !document.querySelector('#run-code').disabled, null, { timeout: 90000 });
  assert.equal(await page.locator('#current-status').innerText(), status, await page.locator('#feedback').innerText());
}
try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base)).ok) break; } catch { /* Wait for local HTTP server. */ }
    await delay(100);
  }
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => report.pageErrors.push(String(error)));
  page.on('dialog', dialog => dialog.accept());
  await page.goto(`${base}/lessons.html?lesson=variables&activity=practice`);
  await waitReady();
  await mark('Direct link opens practice without marking it complete', async () => {
    assert.equal(await page.locator('#current-status').innerText(), '未確認');
    assert.equal(await page.locator('#lesson-title').innerText(), '1. 変数と計算で音の長さを決める');
  });
  await mark('Unfinished starter is rejected with a line hint', async () => {
    await runAndExpect('未完成');
    assert.match(await page.locator('#feedback').innerText(), /行目/);
  });
  await mark('Hints and answer viewing do not mark completion', async () => {
    await page.locator('#next-hint').click();
    await page.locator('#solution-panel > summary').click();
    assert.notEqual(await page.locator('#current-status').innerText(), '条件を確認済み');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('caya:spica-aligned-1:variables.practice')).solutionViewed);
  });
  for (const lesson of course.lessons) {
    for (const activity of ['example', 'practice', 'advanced']) {
      await mark(`Real Pyodide: ${lesson.id}.${activity}`, async () => {
        await select(lesson.id, activity);
        if (activity !== 'example') await writeCode(lesson.activities[activity].solution);
        await runAndExpect(activity === 'example' ? '例題を実行済み' : '条件を確認済み');
      });
    }
  }
  await mark('Code edits invalidate results and survive a question switch', async () => {
    await select('loops', 'practice');
    const changed = await getCode() + '\n# changed after passing\n';
    await writeCode(changed);
    const expected = await getCode();
    assert.equal(await page.locator('#current-status').innerText(), '編集後・未確認');
    await select('lists', 'practice'); await select('loops', 'practice');
    assert.equal(await getCode(), expected);
  });
  await mark('Hard-coded repeat count fails an alternative-input check', async () => {
    await writeCode(course.lessons[2].activities.practice.solution.replace('range(repeat_count)', 'range(8)'));
    await runAndExpect('要修正');
    assert.match(await page.locator('#feedback').innerText(), /回数を4/);
  });
  await mark('Code import restores the selected task without overwriting it', async () => {
    const imported = 'print("imported code")\n';
    const data = { format: 'caya-spica-learning-record', version: 1, records: {
      'loops.practice': { code: imported, reflection: 'imported note', attempts: 0, hintsUsed: 0, solutionViewed: false, lastResult: null, lastPassedAt: null, backup: null }
    }};
    await page.locator('#import-records').setInputFiles({ name: 'records.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
    await page.waitForFunction(() => document.querySelector('#page-notice').textContent.includes('読み込みました'));
    assert.equal(await getCode(), imported);
    assert.equal(await page.locator('#current-status').innerText(), '未確認');
    await page.reload(); await waitReady();
    assert.equal(await getCode(), imported);
  });
  await mark('Reset protects and restores the previous code', async () => {
    const before = await getCode();
    await page.locator('#reset-code').click();
    assert.match(await getCode(), /TODO/);
    await page.locator('#restore-code').click();
    assert.equal(await getCode(), before);
  });
  await mark('Infinite execution times out and the worker recovers', async () => {
    await writeCode('while True:\n    pass\n');
    await runAndExpect('実行エラー');
    assert.match(await page.locator('#feedback').innerText(), /TimeoutError/);
    await writeCode(course.lessons[2].activities.practice.solution);
    await runAndExpect('条件を確認済み');
  });
  await mark('Desktop and mobile have no document-wide horizontal overflow', async () => {
    await page.locator('#task-title').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'browser-results/desktop.png', fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'browser-results/mobile.png', fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await mark('SPICA topic links refer to live topic IDs', async () => {
    const response = await page.request.get(new URL('js/content.js', course.spicaBaseUrl).href);
    assert.equal(response.status(), 200);
    const content = await response.text();
    for (const lesson of course.lessons) for (const link of lesson.links)
      assert.ok(content.includes(`"${link.id}"`) || content.includes(`'${link.id}'`), link.id);
  });
  await mark('Legacy lesson page still executes Python', async () => {
    await page.goto(`${base}/legacy-lessons.html`); await waitReady();
    await page.locator('#run-code').click();
    await page.waitForFunction(() => document.querySelector('#summary-events').textContent !== '—');
    assert.ok(Number(await page.locator('#summary-events').innerText()) > 0);
  });
  await mark('Studio still generates executable Python', async () => {
    await page.goto(`${base}/studio.html`);
    await page.waitForFunction(() => document.querySelector('#studio-run-code') && !document.querySelector('#studio-run-code').disabled, null, { timeout: 90000 });
    await page.locator('#studio-run-code').click();
    await page.waitForFunction(() => Number(document.querySelector('#studio-summary-events').textContent) > 0, null, { timeout: 90000 });
    await page.screenshot({ path: 'browser-results/studio.png', fullPage: true });
  });
  assert.deepEqual(report.pageErrors, []);
} catch (error) {
  report.errors.push(String(error.stack || error));
  console.error(error);
  if (page) {
    console.error('PAGE:', await page.locator('body').innerText().catch(() => 'unavailable'));
    await page.screenshot({ path: 'browser-results/failure.png', fullPage: true }).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await writeFile('browser-results/report.json', JSON.stringify(report, null, 2));
  await browser?.close(); server.kill();
}
