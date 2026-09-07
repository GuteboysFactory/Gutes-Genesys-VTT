import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../dist/module/apps/encounter-tracker.js", import.meta.url), "utf8");
const template = fs.readFileSync(new URL("../templates/encounter/encounter-tracker.hbs", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../styles/encounter-tracker-overhaul-v1824.css", import.meta.url), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("../system.json", import.meta.url), "utf8"));

assert.match(app, /sidePc:\s*entry\.side === "pc"/);
assert.match(app, /sideNpc:\s*entry\.side === "npc"/);

for (const marker of [
  "genesys-slot-stage-v1824",
  "genesys-turn-focus-v1824",
  "genesys-roster-pc-v1824",
  "genesys-roster-npc-v1824",
  "genesys-encounter-sidebar-v1824"
]) assert.ok(template.includes(marker), `missing ${marker}`);

const requiredActions = [
  "startEncounter", "resetEncounter", "endEncounter", "setModeSide", "setModePopcorn",
  "claimActor", "forceClaimActor", "markActed", "markUnacted", "openActor",
  "useAction", "useManeuver", "endTurn", "forceEndTurn", "unclaim", "rewindTurn",
  "roundDown", "roundUp", "slotUp", "slotDown", "slotToggleSide", "addSelectedTokens",
  "removeParticipant", "startNextRound", "useActivation", "markDefeated",
  "markOutOfFight", "markDead", "reactivateParticipant"
];
for (const action of requiredActions) {
  assert.ok(template.includes(`data-action="${action}"`), `template lost action ${action}`);
  assert.ok(app.includes(`${action}:`), `application lost handler ${action}`);
}

const controlTokens = template.match(/{{#(?:if|unless|each|with)\b[^}]*}}|{{\/(?:if|unless|each|with)}}/g) ?? [];
const stack = [];
for (const token of controlTokens) {
  const open = token.match(/^{{#(if|unless|each|with)\b/);
  if (open) stack.push(open[1]);
  else {
    const close = token.match(/^{{\/(if|unless|each|with)}}$/)?.[1];
    assert.equal(close, stack.pop(), `unbalanced Handlebars block at ${token}`);
  }
}
assert.deepEqual(stack, [], "unclosed Handlebars block");

assert.match(css, /genesys-slot-track-v1824\s*\{[\s\S]*?display:\s*grid/);
assert.match(css, /genesys-encounter-rosters-v1824\s*\{[\s\S]*?grid-template-columns:/);
assert.match(css, /@container \(max-width:\s*560px\)/);
assert.equal(manifest.version, "0.0.1824");
assert.ok(manifest.styles.includes("styles/encounter-tracker-overhaul-v1824.css"));

console.log("PASS: Encounter Tracker overhaul preserves controls and responsive structure");
