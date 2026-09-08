import assert from 'node:assert/strict';
import {getActorConditionCheckModifiers} from '../dist/module/condition-service.js';
const actor={system:{conditions:[],heroicAbility:{active:true,secondaryEffectIds:['rot-heroic-secondary:empowered']}}};
const before=JSON.stringify(actor);
let mods=getActorConditionCheckModifiers(actor);assert.equal(mods.filter(m=>m.id==='heroic:empowered').length,1);assert.equal(mods.find(m=>m.id==='heroic:empowered').pool.add.boost,1);
getActorConditionCheckModifiers(actor);assert.equal(JSON.stringify(actor),before);
actor.system.heroicAbility.active=false;assert.ok(!getActorConditionCheckModifiers(actor).some(m=>m.id==='heroic:empowered'));
actor.system.heroicAbility.active=true;actor.system.heroicAbility.secondaryEffectIds=[];assert.ok(!getActorConditionCheckModifiers(actor).some(m=>m.id==='heroic:empowered'));
console.log('PASS: Empowered integrated modifier, one Boost, active gating and no state mutation');
