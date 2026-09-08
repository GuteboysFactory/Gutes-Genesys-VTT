import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeStoryPointState, prepareStoryPointTransaction } from "../dist/domain/story-points/index.js";

const manifest = JSON.parse(fs.readFileSync("system.json", "utf8"));
const service = fs.readFileSync("dist/module/story-point-service-v1832.js", "utf8");
const dock = fs.readFileSync("dist/module/apps/gm-dock-v1830.js", "utf8");
const template = fs.readFileSync("templates/gm/gm-dock-v1830.hbs", "utf8");
const css = fs.readFileSync("styles/gm-dock-v1830.css", "utf8");

assert.ok(Number(manifest.version.split(".").at(-1)) >= 1832);
assert.ok(manifest.esmodules.includes("dist/module/story-point-service-v1832.js"));
assert.deepEqual(normalizeStoryPointState({ player: 2, gm: 3 }), { player: 2, gm: 3 });
assert.deepEqual(prepareStoryPointTransaction({ player: 2, gm: 3 }, { player: 1 }).after, { player: 1, gm: 4 });
assert.deepEqual(prepareStoryPointTransaction({ player: 2, gm: 3 }, { gm: 1 }).after, { player: 3, gm: 2 });
assert.throws(() => prepareStoryPointTransaction({ player: 0, gm: 1 }, { player: 1 }), /Not enough player Story Points/);

assert.match(service, /scope:\s*"world"/);
assert.match(service, /revision:\s*current\.revision \+ 1/);
assert.match(service, /transactionQueue\.then/);
assert.match(service, /HISTORY_LIMIT = 30/);
assert.match(service, /ChatMessage\.create/);
assert.match(service, /Only the GM may change Story Points/);
assert.match(dock, /storyPointActionPending/);
assert.match(dock, /requestAnimationFrame\(paintDrag\)/);
assert.match(dock, /translate3d/);
assert.match(template, /data-action="spendStoryPoint" data-side="player"/);
assert.match(template, /data-action="spendStoryPoint" data-side="gm"/);
assert.match(template, /data-action="adjustStoryPoint"/);
assert.match(css, /genesys-story-point-pools-v1832/);

console.log("PASS: synchronized Story Point pools, transfers, history, GM gate, and smooth launcher drag are wired");
