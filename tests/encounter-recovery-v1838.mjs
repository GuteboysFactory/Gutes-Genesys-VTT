import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.Hooks = { once() {} };
let records = [], id = 'one', status = 'ended', rolls = 0, successes = 2;
const actor = { name: 'Hero', system: { role: 'pc', strain: { value: 5 } }, getFlag: () => records, async update(data) { this.system.strain.value = data['system.strain.value']; records = data['flags.genesys-vtt.encounterRecoveries']; } };
const scene = { id: 'scene', getFlag: () => id };
globalThis.canvas = { scene };
globalThis.ui = { notifications: { warn() {} } };
globalThis.foundry = { documents: { ChatMessage: { create: async () => {} } } };
globalThis.game = { user: { id: 'gm', isGM: true }, users: { activeGM: { id: 'gm' } }, genesysVtt: {
  initiative: { sceneState: () => ({ status, entries: [{ actorRef: 'token-actor', side: 'pc' }] }), resolveActorRef: () => actor },
  checks: { prepareActorSkill: (_actor, skill, options) => { assert.ok(['cool','discipline'].includes(skill)); assert.equal(options.difficulty, 0); return { check: { construction: { pool: { ability: 2 } } } }; } },
  dice: { roll: () => { rolls++; return { net: { success: successes, advantage: 3 } }; } }
} };
const { recover, recoveryRoster } = await import('../dist/module/encounter-recovery-v1838.js');
await recover('token-actor','cool');
assert.equal(actor.system.strain.value, 3, 'only Success, not Advantage, auto-recovers strain');
assert.ok(recoveryRoster().rows[0].done);
await assert.rejects(recover('token-actor','discipline'), /already/);
assert.equal(rolls,1);
id = 'two'; successes = 0;
await recover('token-actor','discipline');
await assert.rejects(recover('token-actor','cool'), /already/);
assert.equal(actor.system.strain.value,3);
id = 'three'; successes = 2;
const concurrent = await Promise.allSettled([recover('token-actor','cool',2),recover('token-actor','cool',2)]);
assert.equal(concurrent.filter(r => r.status === 'fulfilled').length,1);
assert.equal(actor.system.strain.value,0);
id='four'; status='active';
await assert.rejects(recover('token-actor','cool'), /End an encounter/);
status='ended'; game.user.id='second';
await assert.rejects(recover('token-actor','cool'), /active GM/);
game.user.id='gm';
await assert.rejects(recover('token-actor','survival'), /One with Nature/);
await assert.rejects(recover('token-actor','cool',-1), /bonus/);
foundry.documents.ChatMessage.create = async () => { throw Error('chat offline'); };
await recover('token-actor','cool');
await assert.rejects(recover('token-actor','cool'), /already/);
const service = fs.readFileSync('dist/module/initiative-service.js','utf8');
assert.match(service, /current.status === "active" && scene\?\.setFlag/);
assert.match(service, /setFlag\(SYSTEM_ID, "recoveryEncounterId", id\)/);
console.log('PASS: encounter recovery engine, Simple checks, success-only healing, zero-success receipts, duplicate prevention, GM permissions and chat-failure safety');

id='nature';actor.items=[{type:'talent',system:{sourceId:'core-talent:one-with-nature',enabled:true}}];
foundry.applications={api:{DialogV2:{confirm:async()=>false}}};
await assert.rejects(recover('token-actor','survival'),/cancelled/);
foundry.applications.api.DialogV2.confirm=async()=>true;
game.genesysVtt.checks.prepareActorSkill=(_a,skill)=>{assert.equal(skill,'survival');return {check:{construction:{pool:{ability:2}}}};};
await recover('token-actor','survival');
await assert.rejects(recover('token-actor','survival'),/already/);
