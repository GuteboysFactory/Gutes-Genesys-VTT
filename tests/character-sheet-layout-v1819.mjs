import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../dist/module/character-sheet-actions-tab.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../styles/character-sheet-layout-v1819.css", import.meta.url), "utf8");

assert.match(source, /topRow\.append\(buildActionsToolbar\(\), diceTools\)/);
assert.match(source, /generalColumn\.append\(buildGeneralActions\(\)\)/);
assert.match(source, /combatColumn\.append\(buildCombatActions\(root\)\)/);
assert.match(source, /actorColumn\.append\(buildCustomActions\(root\), buildTalentActions\(root\)\)/);
assert.match(source, /content\.append\(generalColumn, combatColumn, actorColumn\)/);
assert.match(css, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(css, /grid-template-columns:\s*minmax\(210px, 1fr\) minmax\(0, 2fr\) minmax\(210px, 1fr\)/);
assert.match(css, /grid-template-areas:\s*"general combat actor"/);

console.log("PASS: Actions layout is 50/50 above and 25/50/25 below");
