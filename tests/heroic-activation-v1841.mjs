import assert from 'node:assert/strict';
import * as domain from '../dist/domain/heroic/index.js';
globalThis.Hooks = { on() {}, once() {}, callAll() {} };
globalThis.ui = { notifications: { warn() {}, info() {} } };
let pool, failFinal=false, failActor=false, failRollback=false;
globalThis.foundry = { utils: { deepClone: structuredClone, randomID: () => 'txn' }, documents: { ChatMessage: { create: async () => {} } } };
const rules = { storyPointCost:2, baseDurationTurns:1, baseUsesPerSession:1 };
let actor = { id:'a', uuid:'Actor.a', name:'Hero', isOwner:true, system: { role:'pc', heroicAbility: domain.createHeroicAbilityState({ id:'heroic',label:'Heroic' },{},rules) }, timing:{}, getFlag() { return this.timing; }, async update(data) {
 if (failActor) { failActor=false; throw Error('actor failed'); }
 if (failRollback) throw Error('rollback failed');
 if(data['system.strain.value'] !== undefined) this.system.strain.value=data['system.strain.value'];
 this.system.heroicAbility=structuredClone(data['system.heroicAbility']); this.timing=structuredClone(data['flags.genesys-vtt.heroicTiming']);
} };
const initial=structuredClone(actor.system.heroicAbility);
let state={ status:'active', activeActorRef:'Actor.a', round:1, turnNumber:1, activeActivationId:'base' };
const scene={ id:'s',getFlag:()=> 'encounter' };
globalThis.canvas={scene};
globalThis.fromUuid=async ref=>ref==='Actor.a'?actor:null;
globalThis.game={ user:{ id:'gm',isGM:true }, users:{activeGM:{id:'gm'}}, genesysVtt:{initiative:{sceneState:()=>state}}, genesysHeroic:{ actorSnapshot:a=>domain.normalizeHeroicAbilityState(a.system.heroicAbility,rules), actorRules:()=>rules, prepareActivation:domain.prepareHeroicAbilityActivation, advanceOwnerTurn:domain.advanceHeroicAbilityOwnerTurn }, settings:{get:()=>structuredClone(pool),set:async(_s,_k,next)=>{
 if(failFinal && !next.heroicPending) { failFinal=false; throw Error('pool failed'); }
 pool=structuredClone(next);
} } };
const points=await import('../dist/module/story-point-service-v1832.js');
const live=await import('../dist/module/heroic-live-v1841.js');
const reset=()=>{pool={player:2,gm:0,revision:0,history:[]};actor.system.heroicAbility=structuredClone(initial);actor.timing={};};
reset();pool.player=1;
await assert.rejects(live.activate(actor),/Not enough/);assert.equal(pool.player,1);assert.equal(actor.system.heroicAbility.usesThisSession,0);
reset();failActor=true;
await assert.rejects(live.activate(actor),/actor failed/);assert.equal(pool.player,2);assert.ok(!pool.heroicPending);
reset();failFinal=true;
await assert.rejects(live.activate(actor),/pool failed/);assert.equal(pool.player,2);assert.equal(actor.system.heroicAbility.active,false);
reset();await live.activate(actor);
assert.equal(pool.player,0);assert.equal(pool.gm,2);assert.equal(actor.system.heroicAbility.usesThisSession,1);
await assert.rejects(live.activate(actor),/already active/);
await live.finishTurn(actor,state,scene);assert.equal(actor.system.heroicAbility.active,true,'current owner turn must not consume duration');
await live.finishTurn(actor,state,scene);assert.equal(actor.system.heroicAbility.activeTurnBudget,1,'repeated completion ignored');
state={...state,round:2,turnNumber:2};await live.finishTurn(actor,state,scene);assert.equal(actor.system.heroicAbility.active,false);
await assert.rejects(live.activate(actor),/no uses/);
reset();pool.heroicPending={actorRef:actor.uuid,beforeAbility:structuredClone(initial),beforeTiming:{}};actor.system.heroicAbility.active=true;
await assert.rejects(points.spendStoryPoint('player'),/interrupted/);
await points.recoverHeroicTransaction();assert.equal(actor.system.heroicAbility.active,false);assert.ok(!pool.heroicPending);assert.equal(pool.player,2);
reset();state={...state,activeActorRef:'Actor.other'};await live.activate(actor);state={...state,activeActorRef:actor.uuid};await live.finishTurn(actor,state,scene);assert.equal(actor.system.heroicAbility.active,false,'out-of-turn activation expires after next own completion');
reset();actor.system.strain={value:5};actor.system.heroicAbility.secondaryEffectIds=['rot-heroic-secondary:rejuvenation'];
failFinal=true;await assert.rejects(live.activate(actor),/pool failed/);assert.equal(actor.system.strain.value,5,'failed activation restores strain');
await live.activate(actor);assert.equal(actor.system.strain.value,3);
reset();actor.system.strain.value=1;actor.system.heroicAbility.secondaryEffectIds=['rot-heroic-secondary:rejuvenation'];await live.activate(actor);assert.equal(actor.system.strain.value,0);
game.user.isGM=false;await assert.rejects(live.activate(actor),/active GM/);
console.log('PASS: Heroic coordinated saves, rollback, interrupted journal recovery, insufficient points, uses and next-owner-turn duration');
