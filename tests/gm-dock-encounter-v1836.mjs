import assert from 'node:assert/strict';
globalThis.foundry = { applications: { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: Base => Base } } };
globalThis.Hooks = { on() {}, once() {} };
let state = { status: 'active', mode: 'popcorn', round: 2, roundPhase: 'end-round', activeActorRef: 'Scene.s.Token.a.Actor.x', activeActorLabel: 'Nemesis', activeActivationId: 'extra', entries: [
  { actorRef: 'Scene.s.Token.a.Actor.x', label: 'Nemesis', side: 'npc' },
  { actorRef: 'Actor.pc', label: 'Hero', side: 'pc' },
  { actorRef: 'Actor.out', label: 'Defeated', side: 'npc', encounterStatus: 'defeated' }
], activationEntitlements: [
  { id: 'base', actorRef: 'Scene.s.Token.a.Actor.x', kind: 'base', used: true },
  { id: 'extra', actorRef: 'Scene.s.Token.a.Actor.x', kind: 'extra', sourceLabel: 'Nemesis Extra', used: false },
  { id: 'pc', actorRef: 'Actor.pc', kind: 'base', used: true },
  { id: 'out', actorRef: 'Actor.out', kind: 'base', used: false }
] };
let opened = 0, added = 0;
const actor = { uuid: 'Scene.s.Token.new.Actor.new', sheet: { render() { opened++; } } };
globalThis.canvas = { scene: { id: 's' }, tokens: { controlled: [{ actor }, { actor }] } };
globalThis.ui = { notifications: { warn() {}, info() {} } };
globalThis.game = { user: { id: 'gm', isGM: true }, users: { activeGM: { id: 'gm' } }, genesysVtt: { initiative: {
  sceneState: () => state,
  resolveActorRef: ref => ref === actor.uuid ? actor : null,
  addSceneParticipant: async (a, _side, skill, scene) => { assert.equal(scene.id, 's'); assert.equal(skill, 'vigilance'); added++; state.entries.push({ actorRef: a.uuid }); }
} } };
const { GenesysGmDock, encounterSummary } = await import('../dist/module/apps/gm-dock-v1830.js');
const summary = encounterSummary();
assert.equal(summary.activeCount, 2);
assert.equal(summary.outCount, 1);
assert.equal(summary.usedCount, 2);
assert.equal(summary.totalCount, 3);
assert.equal(summary.activeSourceLabel, 'Nemesis Extra');
assert.equal(summary.endRound, true);
assert.equal(summary.participants[2].statusLabel, 'Defeated');
assert.equal(summary.modeLabel, 'Popcorn Initiative');
const actions = GenesysGmDock.DEFAULT_OPTIONS.actions;
await actions.openParticipant({}, { dataset: { actorRef: actor.uuid } });
assert.equal(opened, 1);
await actions.addEncounterTokens({}, {});
assert.equal(added, 0, 'active encounters must be managed in Tracker');
state.status = 'collecting';
await Promise.all([actions.addEncounterTokens({}, {}), actions.addEncounterTokens({}, {})]);
assert.equal(added, 1, 'repeated selected tokens and clicks must not duplicate participants');
game.user.isGM = false;
await actions.openParticipant({}, { dataset: { actorRef: actor.uuid } });
assert.equal(opened, 1);
state.mode = 'side-slots';
assert.equal(encounterSummary().modeLabel, 'Core Side Slots');
console.log('PASS: Dock encounter status, extra activation counters, defeat state, token actor sheets and duplicate-safe preparation');
