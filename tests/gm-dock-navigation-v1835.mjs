import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.foundry = { applications: { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: Base => Base } } };
globalThis.Hooks = { once() {}, on() {} };
globalThis.game = { user: { isGM: true } };
globalThis.ui = { notifications: { warn() {} } };
const { GenesysGmDock } = await import('../dist/module/apps/gm-dock-v1830.js');
const template = fs.readFileSync('templates/gm/gm-dock-v1830.hbs', 'utf8');
const nav = template.match(/<nav[\s\S]*?<\/nav>/)[0];
assert.doesNotMatch(nav, /href=|<a\s/);
const handler = GenesysGmDock.DEFAULT_OPTIONS.actions.navigateSection;
let calls = [];
const content = { scrollTop: 100, getBoundingClientRect: () => ({ top: 50 }), scrollTo: options => calls.push(options) };
const root = { querySelector: selector => selector === '.window-content' ? content : selector.startsWith('#genesys-gm-') ? { getBoundingClientRect: () => ({ top: 400 }) } : { getBoundingClientRect: () => ({ height: 52 }) } };
for (const name of ['session', 'story', 'xp', 'encounter', 'actors', 'forge']) {
  assert.ok(nav.includes(`data-section="genesys-gm-${name}"`));
  let prevented = false, stopped = false;
  handler.call({ element: root }, { preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } }, { dataset: { section: `genesys-gm-${name}` } });
  assert.ok(prevented && stopped);
  assert.deepEqual(calls.at(-1), { top: 390, behavior: 'auto' });
}
handler.call({ element: root }, {}, { dataset: { section: 'https://example.com' } });
assert.equal(calls.length, 6);
game.user.isGM = false;
handler.call({ element: root }, {}, { dataset: { section: 'genesys-gm-xp' } });
assert.equal(calls.length, 6);
console.log('PASS: all six Dock buttons navigate internally, compensate sticky nav, reject invalid targets and enforce GM access');
