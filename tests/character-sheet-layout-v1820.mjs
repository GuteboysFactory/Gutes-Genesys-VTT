import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../dist/module/character-sheet-actions-tab.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../styles/character-sheet-layout-v1820.css", import.meta.url), "utf8");

assert.match(source, /mainColumn\.append\(buildCombatActions\(root\), buildCustomActions\(root\), buildTalentActions\(root\)\)/);
assert.match(source, /content\.append\(generalColumn, mainColumn\)/);
assert.doesNotMatch(source, /content\.append\(generalColumn, combatColumn, actorColumn\)/);
assert.match(css, /grid-template-columns:\s*minmax\(210px, 1fr\) minmax\(0, 3fr\)/);
assert.match(css, /grid-template-areas:\s*"general main"/);

console.log("PASS: Custom and Talent Actions are stacked beneath Combat Actions");
