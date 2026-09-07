import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../styles/character-sheet-responsive-v1823.css", import.meta.url), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("../system.json", import.meta.url), "utf8"));

assert.match(css, /genesys-magic-concentration-controls-v1810\s*\{[\s\S]*?display:\s*grid/);
assert.match(css, /genesys-magic-concentration-controls-v1810 button\s*\{[\s\S]*?width:\s*100%/);
assert.match(css, /container-type:\s*inline-size/);
assert.match(css, /@container genesys-biography-sheet \(max-width:\s*900px\)/);
assert.match(css, /genesys-biography-initiative-status\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/);
assert.match(css, /@container genesys-biography-sheet \(max-width:\s*560px\)/);
assert.match(css, /"initiative-controls initiative-controls initiative-controls"/);
assert.match(css, /@container genesys-biography-sheet \(max-width:\s*420px\)/);

assert.equal(manifest.version, "0.0.1823");
assert.ok(manifest.styles.includes("styles/character-sheet-responsive-v1823.css"));
assert.ok(
  manifest.styles.indexOf("styles/character-sheet-responsive-v1823.css")
    > manifest.styles.indexOf("styles/magic-effect-runtime-v1810.css"),
  "responsive overrides must load after the base concentration styles"
);

console.log("PASS: Concentration and Biography initiative adapt to narrow sheets");
