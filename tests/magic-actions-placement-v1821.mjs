import assert from "node:assert/strict";
import fs from "node:fs";

const actions = fs.readFileSync(new URL("../dist/module/character-sheet-actions-tab.js", import.meta.url), "utf8");
const composer = fs.readFileSync(new URL("../dist/module/magic-action-composer-v1790.js", import.meta.url), "utf8");

assert.match(actions, /generalColumn\.dataset\.genesysMagicColumn = "true"/);
assert.match(actions, /generalColumn\.append\(buildGeneralActions\(\)\)/);
assert.ok(actions.indexOf('generalColumn.dataset.genesysMagicColumn = "true"') < actions.indexOf("generalColumn.append(buildGeneralActions())"));
assert.match(composer, /querySelector\("\[data-genesys-tab-panel='actions'\] \[data-genesys-magic-column\]"\)/);
assert.match(composer, /column\.prepend\(makeMagicSection\(actor, state\)\)/);
assert.match(composer, /if \(!state\.hasMagicAccess\) continue/);

console.log("PASS: Magic Actions mounts above General Actions for magic-enabled Actors");
