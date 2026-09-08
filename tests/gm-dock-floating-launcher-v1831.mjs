import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("system.json", "utf8"));
const runtime = fs.readFileSync("dist/module/apps/gm-dock-v1830.js", "utf8");
const css = fs.readFileSync("styles/gm-dock-v1830.css", "utf8");

assert.equal(manifest.version, "0.0.1831");
assert.match(runtime, /gmDockLauncherPosition/);
assert.match(runtime, /scope:\s*"client"/);
assert.match(runtime, /installGmDockLauncher/);
assert.match(runtime, /pointerdown/);
assert.match(runtime, /pointermove/);
assert.match(runtime, /pointerup/);
assert.match(runtime, /setPointerCapture/);
assert.match(runtime, /game\.settings\.set\(SYSTEM_ID, LAUNCHER_POSITION_SETTING/);
assert.doesNotMatch(runtime, /renderActorDirectory/);
assert.match(css, /\.genesys-gm-dock-launcher-v1831\s*\{[\s\S]*?position:\s*fixed/);
assert.match(css, /touch-action:\s*none/);

console.log("PASS: GM Dock uses a draggable, persistent GM-only canvas launcher");
