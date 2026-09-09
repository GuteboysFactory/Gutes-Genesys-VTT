import {runPatientRecovery,assertRecoveryPatient,recoveryPatients} from './recovery-patients-v1887.js';
const SID='genesys-vtt';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');}
export function turnKey(state,scene){return `${scene.id}:${scene.getFlag(SID,'ruleEncounterId')??''}:${state.round}:${state.turnNumber}:${state.activeActivationId}:${state.activeActorRef}`;}
function contentId(item){return item.getFlag(SID,'contentId')??String(item.system?.provenance?.sourceId??'').replace(/^rot-equipment:/,'');}
export function staminaHealing(uses){if(!Number.isSafeInteger(uses)||uses<0)throw Error('Invalid stamina elixir count.');return Math.max(0,5-uses);}
export function speedActive(actor){return Number(actor?.getFlag?.(SID,'consumables')?.speed?.remaining)>0;}
export function applyConsumable(actor,options,scene){return runPatientRecovery(actor,()=>applyLocked(actor,options,scene));}
async function applyLocked(actor,options,scene){
 authority();assertRecoveryPatient(actor,scene);
 let data=structuredClone(actor.getFlag(SID,'consumables')??{revision:0,staminaUses:0});
 if(options?.operation==='reset'){
  if(options.confirmed!==true||options.revision!==data.revision||data.pending)throw Error('Confirm a new rules day and resolve pending use first.');
  data={...data,staminaUses:0,revision:data.revision+1};await actor.update({[`flags.${SID}.consumables`]:data});return data;
 }
 if(!data.pending){
  if(options?.confirmed!==true||options.revision!==data.revision)throw Error('The dose record changed or confirmation is missing.');
  const item=actor.items.get(options.itemId),kind=item&&contentId(item);
  if(!['speed-potion','stamina-elixir'].includes(kind)||item.type!=='gear'||!Number.isSafeInteger(item.system.quantity)||item.system.quantity<1)throw Error('Choose an available native speed potion or stamina elixir.');
  if(kind==='speed-potion'&&speedActive(actor))throw Error('Speed potion is already active; it does not stack.');
  const state=game.genesysVtt.initiative.sceneState(scene);
  if(kind==='speed-potion'&&state.status!=='active')throw Error('Speed potion needs tracked turns; start an encounter first.');
  data.pending={id:foundry.utils.randomID(),itemId:item.id,kind,appliedTurn:turnKey(state,scene),sceneId:scene.id};
  authority();await actor.update({[`flags.${SID}.consumables`]:data});
 }
 const pending=data.pending,item=actor.items.get(pending.itemId);
 if(!item)throw Error('The committed consumable is missing. Restore it and resume.');
 const receipts=item.getFlag(SID,'consumableUses')??[];
 if(!receipts.includes(pending.id)){
  const qty=item.system.quantity;if(!Number.isSafeInteger(qty)||qty<1)throw Error('The committed dose is no longer available.');
  authority();await item.update({'system.quantity':qty-1,[`flags.${SID}.consumableUses`]:[...receipts,pending.id]});
 }
 const patch={};
 if(pending.kind==='stamina-elixir'){
  // Rivals/minions have no strain track and cannot heal wounds by drinking a strain elixir.
  if(actor.system.role!=='rival'){
   const strain=Number(actor.system.strain.value);if(!Number.isSafeInteger(strain)||strain<0)throw Error('Invalid strain.');
   patch['system.strain.value']=Math.max(0,strain-staminaHealing(data.staminaUses));
  }
  data.staminaUses++;
 }else data.speed={remaining:3,appliedTurn:pending.appliedTurn,sceneId:pending.sceneId,completed:[]};
 data={...data,pending:null,revision:data.revision+1,last:pending};
 authority();await actor.update({...patch,[`flags.${SID}.consumables`]:data});return data;
}
export function finishConsumableTurn(actor,state,scene){return runPatientRecovery(actor,async()=>{
 authority();if(!actor)return;
 const data=structuredClone(actor.getFlag(SID,'consumables'));if(!data?.speed?.remaining||data.speed.sceneId!==scene.id)return;
 const key=turnKey(state,scene),speed=data.speed;if(key===speed.appliedTurn||speed.completed.includes(key))return;
 speed.completed.push(key);speed.remaining=Math.max(0,speed.remaining-1);
 const patch={};
 if(!speed.remaining){const track=actor.system.role==='rival'?'wounds':'strain',before=Number(actor.system[track].value);if(!Number.isSafeInteger(before)||before<0)throw Error('Invalid potion expiry resource.');patch[`system.${track}.value`]=before+6;}
 data.revision++;authority();await actor.update({...patch,[`flags.${SID}.consumables`]:data});
});}
export function expireSpeed(actor,confirmed){return runPatientRecovery(actor,async()=>{
 authority();const data=structuredClone(actor.getFlag(SID,'consumables'));if(confirmed!==true||!data?.speed?.remaining)throw Error('Confirm that all three turns elapsed.');
 const track=actor.system.role==='rival'?'wounds':'strain',value=Number(actor.system[track].value);if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid expiry resource.');
 data.speed.remaining=0;data.revision++;await actor.update({[`system.${track}.value`]:value+6,[`flags.${SID}.consumables`]:data});
});}
export async function openConsumables(){
 authority();const scene=canvas.scene;if(!scene)throw Error('Open a scene first.');
 const patients=recoveryPatients(scene);
 const choice=await foundry.applications.api.DialogV2.wait({window:{title:'Stamina Elixir / Speed Potion'},content:`<label>Character<select name="actor">${patients.map((p,i)=>`<option value="${i}">${esc(p.actor.name)}</option>`).join('')}</select></label>`,buttons:[{action:'open',label:'Continue',callback:(_e,_b,d)=>patients[Number(d.element.querySelector('[name=actor]').value)]},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
 if(!choice)return;const actor=choice.actor,data=actor.getFlag(SID,'consumables')??{revision:0,staminaUses:0};
 if(data.pending){await applyConsumable(actor,{},scene);ui.notifications.info('Pending consumable use recovered.');return;}
 const items=[...actor.items].filter(i=>['speed-potion','stamina-elixir'].includes(contentId(i))&&i.system.quantity>0);
 const result=await foundry.applications.api.DialogV2.wait({window:{title:actor.name},content:`<p>Stamina elixirs today: ${data.staminaUses}. Next heals ${staminaHealing(data.staminaUses)} strain, including social encounters. Speed potion: ${data.speed?.remaining??0} turns remaining; expiry causes 6 strain.</p><label>Owned dose<select name="item">${items.map(i=>`<option value="${esc(i.id)}">${esc(i.name)} · ${i.system.quantity}</option>`).join('')}</select></label><label><input type="checkbox" name="confirmed">I confirm the use maneuver, or a new rules day for reset, or that all three turns elapsed for expiry.</label><p>Speed grants one extra maneuver (maximum three) for the next three turns. Dose consumption and effect are recorded together with retry recovery.</p>`,buttons:[{action:'use',label:'Use dose',callback:(_e,_b,d)=>({operation:'use',itemId:d.element.querySelector('[name=item]').value,confirmed:d.element.querySelector('[name=confirmed]').checked,revision:data.revision})},{action:'reset',label:'New day',callback:(_e,_b,d)=>({operation:'reset',confirmed:d.element.querySelector('[name=confirmed]').checked,revision:data.revision})},{action:'expire',label:'Resolve elapsed speed potion',callback:(_e,_b,d)=>({operation:'expire',confirmed:d.element.querySelector('[name=confirmed]').checked})},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
 if(!result)return;if(result.operation==='expire')await expireSpeed(actor,result.confirmed);else await applyConsumable(actor,result,scene);
}
Hooks.once('ready',()=>{game.genesysConsumables={openConsumables,applyConsumable,finishTurn:finishConsumableTurn,speedActive};});
