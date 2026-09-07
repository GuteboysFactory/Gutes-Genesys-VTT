import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../styles/magic-actions-placement-v1822.css", import.meta.url), "utf8");
const composer = fs.readFileSync(new URL("../dist/module/magic-action-composer-v1790.js", import.meta.url), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("../system.json", import.meta.url), "utf8"));

assert.match(css, /genesys-magic-actions-banner\s*\{[\s\S]*?display:\s*grid/);
assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\)/);
assert.match(css, /genesys-magic-actions-banner button\s*\{[\s\S]*?width:\s*100%/);
assert.match(css, /genesys-magic-actions-banner p\s*\{[\s\S]*?white-space:\s*normal/);

const copyPosition = composer.indexOf("Build a spell from live skill access");
const buttonPosition = composer.indexOf("Compose Spell");
assert.ok(copyPosition >= 0 && buttonPosition > copyPosition, "explanatory copy must precede Compose Spell");
assert.ok(Number(manifest.version.split(".").at(-1)) >= 1822);
assert.ok(manifest.styles.includes("styles/magic-actions-placement-v1822.css"));
assert.ok(
  manifest.styles.indexOf("styles/magic-actions-placement-v1822.css")
    > manifest.styles.indexOf("styles/magic-action-composer-v1790.css"),
  "layout override must load after the base composer styles"
);

console.log("PASS: Magic Actions copy stacks above a full-width Compose Spell button");
