import assert from "node:assert/strict";

globalThis.foundry = { utils: { deepClone: structuredClone } };
globalThis.Hooks = { on() {}, once() {} };
globalThis.document = { addEventListener() {} };
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};

const forge = await import("../dist/module/portrait-token-forge-v1780.js");

assert.deepEqual(forge.portraitCanvasDimensions(), { width: 512, height: 512 });

console.log("PASS: Portrait Forge exports through the same square aspect used by the character sheet");
