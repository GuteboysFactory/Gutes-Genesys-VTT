import {normalizeMinionGroup} from '../domain/adversaries/index.js';
import {createPendingCombatResolution,buildCombatCommitPlan,resolveAttackMode} from '../domain/combat/index.js';
import {damageImmune} from '../domain/heroic/primary-effects.js';
import {runPatientRecovery} from './recovery-patients-v1887.js';
const SID='genesys-vtt';
async function finishReceipt(target,key){
 const records=target.getFlag(SID,'qualitySpends')??{},receipt=records[key];
 if(receipt.thresholdCritical&&!receipt.criticalComplete){
  const source=`quality:${key}`;
  if(!(target.system.criticalInjuries??[]).some(i=>i.sourceId===source))await game.genesysCombatRuntime.inflictCriticalInjury(target,{viciousRank:receipt.viciousRank??0},source);
  for(const injury of target.system.criticalInjuries??[])if(injury.runtimePending)await game.genesysCriticalLifecycle?.inflicted?.(target,injury);
  await target.update({[`flags.${SID}.qualitySpends`]:{...(target.getFlag(SID,'qualitySpends')??{}),[key]:{...receipt,criticalComplete:true}}});
 }
 await game.genesysCriticalLifecycle?.reconcileBleeding?.(target);
 return receipt.state;
}
/** The resource update and post-spend budget share a target receipt; critical follow-up is resumable. */
export function applyQualityEffect(target,state,spend,options={}){return runPatientRecovery(target,()=>applyLocked(target,state,spend,options));}
async function applyLocked(target,state,spend,{itemId}={}){
 if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('The active GM applies weapon quality effects.');
 const receipts=target.getFlag(SID,'qualitySpends')??{};
 const key=`${state.id}:${state.spends.length-1}`,old=receipts[key];
 if(old){if(old.qualityId!==spend.qualityId)throw Error('This result already has a saved quality spend. Reopen the saved outcome.');return finishReceipt(target,key);}
 const patch={},rank=Number(spend.rank),role=target.system.role;let thresholdCritical=false,viciousRank=0;
 if(spend.qualityId==='sunder'){
  const item=target.items.get(itemId);if(!item||!['weapon','armor','implement'].includes(item.type)||!item.system.equipped)throw Error('Choose a wielded/equipped item.');
  if(item.system.qualities?.some(q=>q.id==='reinforced'))throw Error('Reinforced items are immune to Sunder.');
  const earlier=state.spends.find(s=>s.qualityId==='sunder'&&s.itemId);
  if(earlier&&earlier.itemId!==itemId)throw Error('Repeated Sunder activations must affect the same item.');
  const damage=target.getFlag(SID,'itemDamage')??{},before=Number(damage[itemId]??0);
  if(before>=4)throw Error('This item is already destroyed.');
  patch[`flags.${SID}.itemDamage`]={...damage,[itemId]:before+1};spend.itemId=itemId;spend.condition=['undamaged','minor','moderate','major','destroyed'][before+1];
 }else if(['linked','secondary-hit'].includes(spend.qualityId)){
  const profile=spend.secondary||spend.qualityId==='secondary-hit'?state.secondaryProfile:state.hitProfile;
  if(!profile)throw Error('Saved weapon profile missing.');
  const runtime=game.genesysCombatRuntime;if(!runtime)throw Error('Combat service is not ready.');
  const snapshot=runtime.actorCombatSnapshot(target),weapon={...profile.weapon,damage:profile.baseDamage,qualities:(profile.weapon?.qualities??[]).filter(q=>!['pierce','breach','stun-damage'].includes(q.id))};
  if(profile.damageTrack==='strain')weapon.qualities.push({id:'stun-damage',rank:1});
  const prepared={preparedWeaponAttack:{weapon},damageCharacteristicValue:0,target:{...snapshot,soak:profile.effectiveSoak,reinforced:false},attackMode:resolveAttackMode(weapon),targetRange:state.targetRange??'engaged'};
  let pending=createPendingCombatResolution(prepared,{net:{success:profile.success}});
  if(!damageImmune(target.system.heroicAbility)){
   pending=await runtime.resolveCombatReactionWindow(prepared,pending,target,'pre-soak');
   pending=await runtime.resolveCombatReactionWindow(prepared,pending,target,'pre-commit');
  }else {pending.originalDamage=0;pending.damageBeforeSoak=0;pending.damageAfterSoak=0;}
  const plan=buildCombatCommitPlan(prepared,pending);
  if(plan.wounds)patch['system.wounds.value']=plan.wounds.after;
  if(plan.strain)patch['system.strain.value']=plan.strain.after;
  if(plan.minionGroup)patch['system.minionGroup.casualties']=plan.minionGroup.casualtiesAfter;
  thresholdCritical=role==='pc'&&plan.wounds?.before<=plan.wounds?.threshold&&plan.wounds?.after>plan.wounds?.threshold;
  viciousRank=profile.weapon?.qualities?.find(q=>q.id==='vicious')?.rank??0;
  spend.damage=pending.damageAfterSoak;spend.track=profile.damageTrack;spend.reactions=pending.appliedReactions;
  if(pending.damageAfterSoak>0&&Number(profile.weapon?.critical)>0){state.extraCriticals??=[];state.extraCriticals.push({slotId:`hit-${state.spends.length-1}`,label:spend.qualityId==='secondary-hit'?'Secondary hit':'Linked hit',eligible:true,rating:Number(profile.weapon.critical),viciousRank,targetRole:role,pendingActivations:0,resolved:false});}
  if(spend.qualityId==='secondary-hit')state.activeQualities=[...(state.activeQualities??[]),...(state.secondaryQualities??[])];
 }else if(spend.qualityId==='stun'){
  const track=['minion','rival'].includes(role)?'wounds':'strain';
  const amount=damageImmune(target.system.heroicAbility)?0:rank,before=Number(target.system[track].value);
  const threshold=role==='minion'?normalizeMinionGroup({...target.system.minionGroup,wounds:before}).groupWoundThreshold:Number(target.system[track].threshold);
  if(!Number.isSafeInteger(before)||!Number.isSafeInteger(amount))throw Error('Invalid hit resource.');
  patch[`system.${track}.value`]=Math.min(threshold>0?threshold*2:Infinity,before+amount);spend.damage=amount;spend.track=track;
  if(role==='minion')patch['system.minionGroup.casualties']=normalizeMinionGroup({...target.system.minionGroup,wounds:patch['system.wounds.value']}).casualties;
 }else return state;
 spend.manualEffect=false;
 patch[`flags.${SID}.qualitySpends`]={...receipts,[key]:{qualityId:spend.qualityId,state:structuredClone(state),thresholdCritical,viciousRank}};
 await target.update(patch);return finishReceipt(target,key);
}
export function itemDamageModifiers(actor,item){
 const stage=Number(actor.getFlag?.(SID,'itemDamage')?.[item.id]??0);
 if(stage>=3)throw Error(stage>=4?'The weapon is destroyed.':'The weapon is major damaged and unusable until repaired.');
 return stage===1?[{id:'item:minor-damage',pool:{add:{setback:1}}}]:stage===2?[{id:'item:moderate-damage',difficultyDelta:1}]:[];
}
Hooks.once('ready',()=>{game.genesysQualityEffects={applyQualityEffect,itemDamageModifiers};});
