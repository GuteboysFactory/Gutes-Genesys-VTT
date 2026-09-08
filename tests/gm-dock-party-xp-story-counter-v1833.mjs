import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("system.json", "utf8"));
const dock = fs.readFileSync("dist/module/apps/gm-dock-v1830.js", "utf8");
const counter = fs.readFileSync("dist/module/story-point-counter-v1833.js", "utf8");
const template = fs.readFileSync("templates/gm/gm-dock-v1830.hbs", "utf8");
const css = fs.readFileSync("styles/gm-dock-v1830.css", "utf8");

assert.ok(Number(manifest.version.split(".").at(-1)) >= 1833);
assert.ok(manifest.esmodules.includes("dist/module/story-point-counter-v1833.js"));
assert.match(dock, /genesysAdvancement\.awardXp/);
assert.match(dock, /kind:\s*"party-award"/);
assert.match(dock, /sourceId:\s*"gm-dock:party-xp"/);
assert.match(template, /data-party-xp-note/);
assert.match(template, /data-party-xp-actor checked/);
assert.match(counter, /scope:\s*"client"/);
assert.match(counter, /requestAnimationFrame/);
assert.match(counter, /genesysStoryPointsChanged/);
assert.match(css, /\.genesys-story-point-counter-v1833\s*\{[\s\S]*?position:\s*fixed/);
assert.match(css, /\.genesys-story-point-counter-v1833 \.is-player/);
assert.match(css, /\.genesys-story-point-counter-v1833 \.is-gm/);

console.log("PASS: Party XP awards and movable shared Story Point counter are wired");
