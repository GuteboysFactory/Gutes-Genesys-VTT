import assert from 'node:assert/strict';
import * as domain from '../dist/domain/heroic/index.js';
globalThis.Hooks={on(){},once(){}};
const rules={storyPointCost:2,maxSecondaryEffects:2};
const actor={uuid:'Actor.a',name:'Hero',system:{role:'pc',xp:{earned:200},heroicAbility:domain.createHeroicAbilityState({id:'primary'}, {}, rules)},flags:{},getFlag(_s,k){return this.flags[k] ?? [];},async update(data){this.system.heroicAbility=data['system.heroicAbility'];if(data['flags.genesys-vtt.heroicCustomEffects'])this.flags.heroicCustomEffects=data['flags.genesys-vtt.heroicCustomEffects'];}};
let options=[{id:'one',label:'First'},{id:'two',label:'Second'},{id:'three',label:'Third'}],during=()=>{},accept=true;
globalThis.foundry={applications:{api:{DialogV2:{wait:async()=>{during();return accept;}}}}};
globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},genesysStoryPoints:{snapshot:()=>({})},genesysHeroic:{actorSnapshot:a=>domain.normalizeHeroicAbilityState(a.system.heroicAbility,rules),actorRules:()=>rules,secondaryOptions:()=>[...options,...(actor.flags.heroicCustomEffects ?? [])],purchaseUpgrade:domain.purchaseHeroicAbilityUpgrade,availablePoints:domain.heroicAbilityAvailablePoints}};
const {purchaseUpgrade}=await import('../dist/module/heroic-live-v1841.js');

foundry.utils={randomID:()=> 'test-id'};
let input={name:'Fire special',description:'A custom narrative effect.'},confirm=true;
foundry.applications.api.DialogV2.wait=async config=>config.window.title==='Custom Secondary Effect'?input:confirm;
confirm=false;await purchaseUpgrade(actor,'custom-secondary');assert.equal(actor.system.heroicAbility.abilityPointsSpent,0);assert.deepEqual(actor.flags,{});
confirm=true;input.name=' ';await assert.rejects(purchaseUpgrade(actor,'custom-secondary'),/Enter a name/);
input.name='Fire special';await purchaseUpgrade(actor,'custom-secondary');assert.equal(actor.system.heroicAbility.abilityPointsSpent,1);assert.deepEqual(actor.system.heroicAbility.secondaryEffectIds,['custom-heroic:test-id']);assert.equal(actor.flags.heroicCustomEffects[0].description,input.description);
await assert.rejects(purchaseUpgrade(actor,'custom-secondary'),/name already exists/);assert.equal(actor.system.xp.earned,200);
console.log('PASS: Custom effect validation, cancellation, atomic definition/purchase and duplicate name checks');
