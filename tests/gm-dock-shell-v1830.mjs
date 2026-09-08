import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("system.json", "utf8"));
const runtime = fs.readFileSync("dist/module/apps/gm-dock-v1830.js", "utf8");
const template = fs.readFileSync("templates/gm/gm-dock-v1830.hbs", "utf8");
const css = fs.readFileSync("styles/gm-dock-v1830.css", "utf8");

assert.equal(manifest.version, "0.0.1830", "manifest must identify v0.0.1830");
assert.ok(manifest.esmodules.includes("dist/module/apps/gm-dock-v1830.js"), "GM Dock runtime must load from the manifest");
assert.ok(manifest.styles.includes("styles/gm-dock-v1830.css"), "GM Dock stylesheet must load from the manifest");

assert.match(runtime, /class GenesysGmDock extends HandlebarsApplicationMixin\(ApplicationV2\)/, "GM Dock must use Foundry ApplicationV2");
assert.match(runtime, /game, "genesysGmDock"/, "GM Dock must expose a stable game API");
assert.match(runtime, /game\?\.user\?\.isGM/, "GM Dock must enforce GM permissions");
assert.match(runtime, /renderActorDirectory/, "GM Dock must install a visible Actor Directory launcher");
assert.match(runtime, /game\?\.genesysVtt\?\.initiative\?\.sceneState/, "GM Dock must read the existing Encounter state");
assert.match(runtime, /game\?\.genesysAdvancement\?\.snapshot/, "GM Dock must read the existing Advancement service");
assert.doesNotMatch(runtime, /\.update\(|game\.settings\.set|setFlag\(/, "v0.0.1830 shell must not mutate gameplay state");

for (const section of ["Session", "Story Points", "XP Control", "Encounter", "Characters & NPCs", "Forge"]) {
  assert.ok(template.includes(section), `GM Dock must include the ${section} section`);
}
assert.ok(template.includes('data-action="openEncounter"'), "Encounter shortcut must be actionable");
assert.ok(template.includes('data-action="openCharacterCreator"'), "Character Creator shortcut must be actionable");
assert.ok(template.includes("Adversary Forge · Upcoming"), "Adversary Forge must be clearly marked as upcoming");
assert.match(css, /@container \(max-width: 720px\)/, "GM Dock must define a narrow-window layout");
assert.match(css, /@container \(max-width: 470px\)/, "GM Dock must define a compact-window layout");

console.log("PASS: GM Dock shell is GM-only, service-backed, non-mutating, navigable and responsive");
