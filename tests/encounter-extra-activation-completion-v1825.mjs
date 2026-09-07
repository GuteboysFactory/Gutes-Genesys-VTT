import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../dist/module/apps/encounter-tracker.js", import.meta.url), "utf8");
const template = fs.readFileSync(new URL("../templates/encounter/encounter-tracker.hbs", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../styles/encounter-tracker-overhaul-v1824.css", import.meta.url), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("../system.json", import.meta.url), "utf8"));

assert.match(app, /const activeActivation = state\.activeActivationId[\s\S]*?state\.activationEntitlements\.find/);
assert.match(app, /activeActivationLabel:\s*activeActivation\?\.sourceLabel \?\? "Activation"/);
assert.match(app, /activeExtraActivation:\s*activeActivation\?\.kind === "extra"/);

const endRoundIndex = template.indexOf("{{#if endRound}}");
const activeActorIndex = template.indexOf("{{#if hasActiveActor}}", endRoundIndex);
const completionIndex = template.indexOf("Mark Extra Activation Used", activeActorIndex);
const startRoundIndex = template.indexOf("data-action=\"startNextRound\"", completionIndex);

assert.ok(endRoundIndex >= 0, "missing End of Round branch");
assert.ok(activeActorIndex > endRoundIndex, "End of Round must keep an active extra turn visible");
assert.ok(completionIndex > activeActorIndex, "missing explicit extra-activation completion control");
assert.ok(startRoundIndex > completionIndex, "Start Round must remain in the no-active-turn branch");
assert.match(template.slice(activeActorIndex, startRoundIndex), /data-action="endTurn"[^>]*>Mark Extra Activation Used<\/button>/);
assert.match(template.slice(activeActorIndex, startRoundIndex), /data-action="useAction"/);
assert.match(template.slice(activeActorIndex, startRoundIndex), /data-action="useManeuver"/);
assert.match(css, /genesys-extra-turn-focus-v1825\s*\{[^}]*border-left-color:/);

assert.equal(manifest.version, "0.0.1825");
assert.match(manifest.description, /Extra Activation Completion/);

console.log("PASS: extra activations can be completed explicitly during End of Round");
