import { addRenewalSlot } from '../domain/initiative/index.js';
const SID='genesys-vtt', locks=new Set();
// Dependencies keep the transaction testable without a running Foundry world.
export async function resolveRenewal(actor, deps) {
 const {scene, read, write, choose, roll, isGM}=deps;
 if(locks.has(actor.uuid))throw Error('Renewal is already being resolved.');
 locks.add(actor.uuid);
 try {
 const timing=actor.getFlag(SID,'heroicTiming');
 const activationId=timing?.activationId;
 const encounterId=scene?.getFlag(SID,'ruleEncounterId');
 const check=()=>{
  const state=read();
  if(!isGM())throw Error('Active GM required.');
  if(!activationId || !actor.system.heroicAbility?.active || !actor.system.heroicAbility.secondaryEffectIds?.includes('rot-heroic-secondary:renewal') || actor.getFlag(SID,'heroicTiming')?.activationId!==activationId)throw Error('Activate Heroic with Renewal first.');
  if(!scene || timing.sceneId!==scene.id || !encounterId || timing.encounterId!==encounterId || scene.getFlag(SID,'ruleEncounterId')!==encounterId || state.status!=='active' || state.mode!=='side-slots')throw Error('Renewal requires the same active Side Slots encounter.');
  return state;
 };
 let state=check();
 if(state.renewalSlots.some(s=>s.activationId===activationId))return false;
 let pending=actor.getFlag(SID,'heroicRenewalRoll');
 if(pending?.activationId!==activationId || pending.sceneId!==scene.id || pending.encounterId!==encounterId){
  const skill=await choose();
  if(!['cool','vigilance'].includes(skill))return false;
  check();
  const result=roll(skill);
  pending={activationId,sceneId:scene.id,encounterId,actorRef:actor.uuid,skill,success:result.net.success,advantage:result.net.advantage};
  await actor.setFlag(SID,'heroicRenewalRoll',pending);
 }
 state=check();
 if(state.renewalSlots.some(s=>s.activationId===activationId))return false;
 await write(addRenewalSlot(state,pending));
 return pending;
 } finally {locks.delete(actor.uuid);}
}
