import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as initiative from '../dist/domain/initiative/index.js';
import * as adversaries from '../dist/domain/adversaries/index.js';
import * as queue from '../dist/module/initiative-write-queue-v1857.js';
import {getTurnRecovery} from '../dist/module/initiative-recovery-v1860.js';
import * as transport from '../dist/module/initiative-transport-v1858.js';
import {resolveRenewal} from '../dist/module/heroic-renewal-v1855.js';
const hooks={};globalThis.Hooks={on:(n,f)=>hooks[n]=f};
const gm={id:'gm',active:true,isGM:true},gm2={id:'gm2',active:true,isGM:true},player={id:'p',active:true,isGM:false};
let rollCount=0,failRollSave=false,handover=false;
const flags={heroicTiming:{activationId:'a',sceneId:'s',encounterId:'e'}};
const actor={uuid:'Actor.p',name:'PC',system:{role:'pc',wounds:{value:0,threshold:10},strain:{value:5,threshold:10},heroicAbility:{active:true,secondaryEffectIds:['rot-heroic-secondary:renewal']}},getFlag:(_s,k)=>flags[k],setFlag:async(_s,k,v)=>{if(failRollSave)throw Error('actor offline');flags[k]=structuredClone(v);if(handover){handover=false;game.users.activeGM=gm2;}},testUserPermission:u=>u.id==='p'};
function initial(){let s=initiative.emptyInitiativeState();for(const [actorRef,side] of [['Actor.p','pc'],['Actor.n','npc']])s=initiative.recordInitiativeEntry(s,initiative.initiativeEntryFromRoll({actorRef,label:actorRef,side,skill:'cool',result:{net:{success:side==='pc'?3:1,advantage:0}}}));return initiative.startInitiativeEncounter(s);}
let raw=initial();const sceneFlags={ruleEncounterId:'e'};let failScene=false,atomicWrites=0;
const scene={id:'s',tokens:[],getFlag:(_s,k)=>k==='initiativeState'?raw:sceneFlags[k],setFlag:async(_s,k,v)=>{if(failScene)throw Error('scene offline');if(k==='initiativeState')raw=structuredClone(v);else sceneFlags[k]=structuredClone(v);},update:async data=>{if(failScene)throw Error('scene offline');atomicWrites++;raw=structuredClone(data['flags.genesys-vtt.initiativeState']);sceneFlags.magicConcentrationJournal=structuredClone(data['flags.genesys-vtt.magicConcentrationJournal']);}};
const scenes=new Map([['s',scene]]);
globalThis.game={user:gm,users:{activeGM:gm,get:id=>({gm,gm2,p:player}[id])},scenes,actors:{contents:[actor]},genesysHeroicLive:{beginTurn:async()=>{},finishTurn:async()=>{}}};
globalThis.canvas={scene,tokens:{placeables:[]}};globalThis.ui={notifications:{warn(){}}};globalThis.foundry={utils:{randomID:()=> 'r'},documents:{ChatMessage:{}}};
globalThis.__initiativeDeps={resolveRenewal,getTurnRecovery,...initiative,...adversaries,...queue,...transport,SYSTEM_ID:'genesys-vtt',rerenderAllRenderedCharacterSheets:async()=>{},getActorConditionRules:()=>({canPerformActions:true,canPerformManeuvers:true}),advanceActorTurnConditions:async()=>{},prepareActorSkillEngineCheck:()=>({check:{construction:{pool:{ability:2}}}}),rollNarrativePool:()=>{rollCount++;return {net:{success:4,advantage:1}};}};
let code=await fs.readFile('dist/module/initiative-service.js','utf8');code=code.replace(/import \{([^}]+)\} from [^;]+;/g,(_m,names)=>`const {${names}}=globalThis.__initiativeDeps;`);
const api=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
let results=await Promise.allSettled([api.resolveSceneRenewal(actor,'cool','a',scene),api.resolveSceneRenewal(actor,'cool','a',scene)]);
assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(rollCount,1);assert.equal(raw.renewalSlots.length,1);assert.equal(raw.activationEntitlements.length,2);
assert.equal(await api.resolveSceneRenewal(actor,'cool','a',scene),false);assert.equal(rollCount,1);
flags.heroicTiming.activationId='b';failScene=true;await assert.rejects(api.resolveSceneRenewal(actor,'vigilance','b',scene),/scene offline/);assert.equal(rollCount,2);failScene=false;await api.resolveSceneRenewal(actor,'vigilance','b',scene);assert.equal(rollCount,2);
flags.heroicTiming.activationId='c';handover=true;await assert.rejects(api.resolveSceneRenewal(actor,'cool','c',scene),/GM/);assert.equal(rollCount,3);game.user=gm2;await api.resolveSceneRenewal(actor,'cool','c',scene);assert.equal(rollCount,3);assert.equal(raw.renewalSlots.length,3);
await assert.rejects(api.resolveSceneRenewal(actor,'cool','old',scene),/activation changed/);
await api.claimSceneInitiativeSlot(actor,scene);
// Exercise the service's actual Scene.update boundary; the runtime receives no public raw-state writer.
let targetFails=true;
game.genesysMagicEffects={concentrateAuthoritative:async(_actor,_scene,deps)=>{
 if(!sceneFlags.magicConcentrationJournal)await deps.pay({kind:'sustain',done:false});
 if(targetFails)throw Error('target offline');sceneFlags.magicConcentrationJournal.done=true;return {sustained:2};
},prepareTransition:async()=>{}};
failScene=true;await assert.rejects(api.concentrateSceneSpells(actor,scene),/scene offline/);assert.equal(atomicWrites,0);assert.equal(raw.turn.maneuversUsed,0);
failScene=false;await assert.rejects(api.concentrateSceneSpells(actor,scene),/target offline/);assert.equal(atomicWrites,1);assert.equal(raw.turn.maneuversUsed,1);assert.equal(sceneFlags.magicConcentrationJournal.done,false);
targetFails=false;await api.concentrateSceneSpells(actor,scene);assert.equal(atomicWrites,1);assert.equal(raw.turn.maneuversUsed,1);
// Requests use the authenticated message author, with owner validation.
let reply;const request={id:'owner',gm:'gm2',name:'concentrateSceneSpells',args:['Actor.p'],sceneId:'s',revision:raw.revision};
const doc={id:'owner-msg',getFlag:()=>request,update:async d=>{reply=d['flags.genesys-vtt.initiativeReply'];}};
hooks.createChatMessage(doc,{},'p');for(let k=0;k<30&&!reply;k++)await new Promise(r=>setImmediate(r));assert.equal(reply.ok,true);
reply=null;hooks.createChatMessage({...doc,id:'forged',getFlag:()=>({...request,id:'forged',name:'resolveSceneRenewal',args:['Actor.p','cool','c']})},{},'p');for(let k=0;k<30&&!reply;k++)await new Promise(r=>setImmediate(r));assert.equal(reply.ok,false);assert.match(reply.error,/GM/);
console.log('PASS real authority queue: Renewal concurrency/saved-roll retry/handover, unchanged turn allowances, atomic concentration payment and player authorization');
