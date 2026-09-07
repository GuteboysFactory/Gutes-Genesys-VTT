import assert from "node:assert/strict";

globalThis.foundry = { utils: { deepClone: structuredClone } };
globalThis.Hooks = { on() {}, once() {} };

const wizard = await import("../dist/module/character-creator-wizard.js");

assert.equal(
  wizard.talentExplanation({ notes: "Library explanation", description: "Fallback" }),
  "Library explanation"
);
assert.equal(
  wizard.talentExplanation({ notes: "", description: "Shared detailed-pack explanation" }),
  "Shared detailed-pack explanation"
);
assert.equal(
  wizard.talentExplanation({}),
  "No description supplied by this content pack."
);

console.log("PASS: Character Creator reads the same Talent explanation fields as Talent Library");
