const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const frames = [];
let native;
class Observer {
  constructor(callback) { this.callback = callback; native = this; }
  observe() { this.active = true; }
  disconnect() { this.active = false; }
  mutate() { if (this.active) this.callback([]); }
}
const context = vm.createContext({
  MutationObserver: Observer, document: { body: {} },
  requestAnimationFrame: fn => frames.push(fn), console
});
vm.runInContext(fs.readFileSync("dist/module/ui-mount-coordinator-v1812.js", "utf8")
  .replace("export class GenesysUiObserver", "globalThis.Client = class GenesysUiObserver"), context);
let calls = 0;
const client = new context.Client(() => { calls++; native.mutate(); });
client.observe(context.document.body, { childList: true, subtree: true });
assert.equal(frames.length, 1);
frames.shift()();
assert.equal(calls, 2);
assert.equal(frames.length, 0, "Own writes cannot schedule more passes");
native.mutate(); native.mutate();
assert.equal(frames.length, 1, "External writes coalesce");
frames.shift()();
assert.equal(calls, 4);
client.disconnect(); native.mutate();
assert.equal(frames.length, 0);
assert.equal(context.MutationObserver, Observer);
console.log("PASS: coordinator scheduling unit tests (mock observer; not a browser test)");
