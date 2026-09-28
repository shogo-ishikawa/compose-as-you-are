import assert from "node:assert/strict";
import test from "node:test";

import { PythonRunner } from "../assets/js/python-client.js";

class MockWorker {
  constructor() { this.listeners = {}; this.terminated = false; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  emit(type, data) { for (const listener of this.listeners[type] || []) listener({ data }); }
  postMessage(message) { this.lastMessage = message; }
  terminate() { this.terminated = true; }
}

test("concurrent preparation requests share one worker and one promise", async () => {
  const workers = [];
  const runner = new PythonRunner({ workerFactory: () => (workers.push(new MockWorker()), workers.at(-1)) });
  const first = runner.ensureReady();
  const second = runner.ensureReady();
  assert.equal(first, second);
  assert.equal(workers.length, 1);
  workers[0].emit("message", { type: "status", status: "ready" });
  await Promise.all([first, second]);
  assert.equal(runner.ready, true);
  runner.destroy();
});

test("run waits for readiness and ignores an old worker generation", async () => {
  const workers = [];
  const runner = new PythonRunner({ workerFactory: () => (workers.push(new MockWorker()), workers.at(-1)) });
  const run = runner.run("print(1)");
  assert.equal(workers[0].lastMessage, undefined);
  workers[0].emit("message", { type: "status", status: "ready" });
  await new Promise(resolve => setTimeout(resolve, 0));
  const sent = workers[0].lastMessage;
  workers[0].emit("message", { type: "result", id: sent.id, result: { ok: true } });
  assert.deepEqual(await run, { ok: true });
  const recovery = runner.restart();
  workers[0].emit("message", { type: "status", status: "ready" });
  assert.equal(runner.ready, false);
  workers[1].emit("message", { type: "status", status: "ready" });
  await recovery;
  runner.destroy();
});

test("a synchronous postMessage failure is recoverable", async () => {
  const workers = [];
  const runner = new PythonRunner({ workerFactory: () => {
    const worker = new MockWorker(); workers.push(worker); return worker;
  }});
  workers[0].emit("message", { type: "status", status: "ready" });
  workers[0].postMessage = () => { throw new Error("clone failed"); };
  await assert.rejects(runner.run("x"), /clone failed/);
  assert.equal(runner.state, "error");
  const recovery = runner.restart();
  workers[1].emit("message", { type: "status", status: "ready" });
  await recovery;
  assert.equal(runner.ready, true);
  runner.destroy();
});
