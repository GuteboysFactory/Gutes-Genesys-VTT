import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../dist/module/character-sheet-actions-tab.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../styles/character-sheet-layout-v1819.css", import.meta.url), "utf8");

assert.match(source, /topRow\.append\(buildActionsToolbar\(\), diceTools\)/);
assert.match(source, /generalColumn\.append\(buildGeneralActions\(\)\)/);
assert.match(css, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);

console.log("PASS: Actions and Dice Tools retain the 50/50 top row");
