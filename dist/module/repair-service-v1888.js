import {repairPlan} from '../domain/equipment/repairs.js';
import {runPatientRecovery} from './recovery-patients-v1887.js';
const SID='genesys-vtt';
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');}
export function repairEquipment(actor,options){return runPatientRecovery(actor,async()=>{
 authority();let job=actor.getFlag(SID,'equipmentRepair');
 if(!job||job.stage==='complete'){
  if(options?.confirmed!==true)throw Error('Confirm repair tools and available time.');
  const item=actor.items.get(options.itemId),damage=actor.getFlag(SID,'itemDamage')?.[item?.id];
  if(!item)throw Error('Choose an owned damaged item.');
  const plan=repairPlan({damage,price:Number(item.system.price),rushed:options.rushed,missingTools:options.missingTools});
  const prepared=game.genesysVtt.checks.prepareActorSkill(actor,'mechanics',{difficulty:plan.difficulty});
  job={id:foundry.utils.randomID(),stage:'rolled',itemId:item.id,damage,plan,result:game.genesysVtt.dice.roll(prepared.check.construction.pool)};
  const completed=game.genesysCriticalLifecycle?.prepareRuleCheckResult?.(actor,job.result)??{result:job.result,patch:{}};job.result=completed.result;
  job.cost=repairPlan({damage,price:Number(item.system.price),advantage:Number(job.result.net.advantage??0)}).cost;
  authority();await actor.update({...completed.patch,[`flags.${SID}.equipmentRepair`]:job});return job;
 }
 if(options?.resolve!==job.id||options.paid!==true)throw Error('Confirm the saved result, elapsed time and recorded repair cost.');
 const damage=actor.getFlag(SID,'itemDamage')??{};
 if(damage[job.itemId]!==job.damage)throw Error('Item damage changed after the repair check.');
 authority();await actor.update({[`flags.${SID}.equipmentRepair`]:{...job,stage:'complete'},...(job.result.net.success>0?{[`flags.${SID}.itemDamage`]:{...damage,[job.itemId]:0}}:{})});return {...job,stage:'complete'};
});}
export async function openRepair(){
 authority();const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const actors=[...game.actors].filter(a=>a.type==='character');
 const actor=await foundry.applications.api.DialogV2.wait({window:{title:'Repair Equipment'},content:`<select name="actor">${actors.map((a,i)=>`<option value="${i}">${esc(a.name)}</option>`).join('')}</select>`,buttons:[{action:'open',label:'Continue',callback:(_e,_b,d)=>actors[Number(d.element.querySelector('[name=actor]').value)]},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});if(!actor)return;
 let job=actor.getFlag(SID,'equipmentRepair');
 if(!job||job.stage==='complete'){
  const damage=actor.getFlag(SID,'itemDamage')??{},items=[...actor.items].filter(i=>damage[i.id]>0&&damage[i.id]<4);
  const input=await foundry.applications.api.DialogV2.wait({window:{title:'Mechanics repair'},content:`<p>Self-repair of owned equipment. Printed repair cost: 25% / 50% / 100%; one to two hours per difficulty. The GM records payment in the applicable currency before finalizing.</p><select name="item">${items.map(i=>`<option value="${esc(i.id)}">${esc(i.name)} · damage ${damage[i.id]}</option>`).join('')}</select><label><input type="checkbox" name="rushed">Less than normal time (+1 difficulty)</label><label><input type="checkbox" name="tools">Missing proper tools (+1 difficulty)</label>`,buttons:[{action:'roll',label:'Confirm and roll',callback:(_e,_b,d)=>({confirmed:true,itemId:d.element.querySelector('[name=item]').value,rushed:d.element.querySelector('[name=rushed]').checked,missingTools:d.element.querySelector('[name=tools]').checked})},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});if(!input)return;job=await repairEquipment(actor,input);
 }
 const paid=await foundry.applications.api.DialogV2.wait({window:{title:'Resolve Repair'},content:`<p>${esc(JSON.stringify(job.result.net))}</p><p>Repair cost after Advantage: ${job.cost}. Normal time: ${job.plan.hours.join('–')} hours.</p>`,buttons:[{action:'apply',label:'Payment and time recorded — apply result',callback:()=>true},{action:'later',label:'Resume later',callback:()=>false}],rejectClose:false});if(paid)await repairEquipment(actor,{resolve:job.id,paid:true});
}
Hooks.once('ready',()=>{game.genesysRepairs={repairEquipment,openRepair};});
