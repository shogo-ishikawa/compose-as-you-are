import test from 'node:test';
import assert from 'node:assert/strict';
import { PracticeStore, defaultRecord, recordStatus } from '../assets/js/practice-store.js';

class MemoryAdapter {
  constructor() { this.values = new Map(); }
  get length() { return this.values.size; }
  key(i) { return [...this.values.keys()][i]; }
  getItem(k) { return this.values.get(k) ?? null; }
  setItem(k, v) { this.values.set(k, String(v)); }
}

test('drafts are isolated per activity and restored', () => {
  const adapter = new MemoryAdapter();
  const store = new PracticeStore(['a.practice', 'b.practice'], { adapter });
  const a = store.get('a.practice', '...'); a.code = 'print(1)'; store.save('a.practice', a);
  assert.equal(store.get('b.practice', '...').code, '...');
  const restored = new PracticeStore(['a.practice'], { adapter });
  assert.equal(restored.get('a.practice').code, 'print(1)');
});
test('editing a passed code snapshot invalidates current status', () => {
  const record = defaultRecord('print(1)');
  record.lastResult = { source: 'print(1)', status: 'passed' };
  assert.equal(recordStatus(record), '条件を確認済み');
  assert.equal(recordStatus(record, 'print(2)'), '編集後・未確認');
});
test('viewing hints and solutions never marks a task as passed', () => {
  const record = defaultRecord('...'); record.hintsUsed = 3; record.solutionViewed = true;
  assert.equal(recordStatus(record), '未確認');
});
test('quota failures keep in-memory work and warn', () => {
  let warned = false;
  const store = new PracticeStore(['a.practice'], { adapter: { getItem: () => null, setItem() { throw new Error('quota'); } }, onWarning: () => { warned = true; } });
  const record = store.get('a.practice'); record.code = 'valuable';
  assert.equal(store.save('a.practice', record), false);
  assert.equal(store.get('a.practice').code, 'valuable'); assert.equal(warned, true);
});
test('old data and corrupt originals are never overwritten', () => {
  const adapter = new MemoryAdapter();
  adapter.setItem('caya:v1.0.0:studio-code', 'old-studio');
  adapter.setItem('caya:spica-aligned-1:a.practice', '{invalid');
  const store = new PracticeStore(['a.practice'], { adapter });
  const record = store.get('a.practice', '...'); record.code = 'new';
  assert.equal(store.save('a.practice', record), false);
  assert.equal(adapter.getItem('caya:spica-aligned-1:a.practice'), '{invalid');
  const data = store.export();
  assert.equal(data.legacy['caya:v1.0.0:studio-code'], 'old-studio');
  assert.equal(data.unreadableOriginals['a.practice'], '{invalid');
});
test('invalid imports are rejected before touching data', () => {
  const store = new PracticeStore(['a.practice'], { adapter: new MemoryAdapter() });
  store.get('a.practice', 'old');
  assert.throws(() => store.import({ format: 'caya-spica-learning-record', version: 1, records: { wrong: defaultRecord('bad') } }));
  assert.equal(store.get('a.practice').code, 'old');
});
test('valid imports preserve the previous code as backup', () => {
  const store = new PracticeStore(['a.practice'], { adapter: new MemoryAdapter() });
  store.get('a.practice', 'old');
  assert.equal(store.import({ format: 'caya-spica-learning-record', version: 1, records: { 'a.practice': defaultRecord('new') } }), true);
  assert.equal(store.get('a.practice').code, 'new');
  assert.equal(store.get('a.practice').backup.code, 'old');
});
