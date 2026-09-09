import {applyItemModifications} from '../domain/equipment/modifications.js';
import {runPatientRecovery} from './recovery-patients-v1887.js';
const SID='genesys-vtt';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');}
const fields=['damage','critical','defense','soak','encumbrance','hardPoints','price','rarity','qualities','craftsmanshipId','craftsmanshipSourceId'];
function snapshot(item){return Object.fromEntries(fields.filter(k=>item.system[k]!==undefined).map(k=>[k,structuredClone(item.system[k])]));}
export function modifyEquipment(actor,options){return runPatientRecovery(actor,async()=>{
 authority();if(options.confirmed!==true)throw Error('Confirm compatibility and creation/correction of craftsmanship.');
 const host=actor.items.get(options.hostId);if(!host||!['weapon','armor'].includes(host.type))throw Error('Choose an owned weapon or armor.');
 const old=host.getFlag(SID,'modifications'),current=snapshot(host);
 if(old&&JSON.stringify(current)!==JSON.stringify(old.applied))throw Error('The modified item was edited directly. Reconcile its recorded base before applying more modifications.');
 if(!old&&host.system.craftsmanshipId&&host.system.craftsmanshipId!=='steel')throw Error('Existing craftsmanship has no recorded steel base. Preserve this item and use an unmodified copy for setup.');
 const attachments=(options.attachmentIds??[]).map(id=>{
  const item=actor.items.get(id);if(item?.type!=='attachment')throw Error('Choose owned attachment Items.');
  if([...actor.items].some(other=>other.id!==host.id&&(other.getFlag(SID,'modifications')?.attachments??[]).some(a=>a.id===id)))throw Error('This attachment is installed on another item.');
  return {id,uuid:item.uuid,name:item.name,hardPointCost:Number(item.system.hardPointCost),compatibleTypes:item.system.compatibleTypes,effects:structuredClone(item.getFlag(SID,'metadata')?.effectHints??[]),provenance:structuredClone(item.system.provenance??{})};
 });
 const base=old?.base??current;
 const result=applyItemModifications(base,host.type,options.craftsmanshipId,attachments);
 const applied=Object.fromEntries(fields.filter(k=>result.system[k]!==undefined).map(k=>[k,result.system[k]]));
 const record={base,applied,craftsmanshipId:options.craftsmanshipId,attachments,source:'Realms of Terrinoth pp.97–98,106–108',notes:String(options.notes??'').slice(0,2000)};
 authority();await host.update({...Object.fromEntries(Object.entries(applied).map(([k,v])=>[`system.${k}`,v])),[`flags.${SID}.modifications`]:record});return record;
});}
export function equipmentCheckModifiers(actor,skillId){
 const mods=[];
 for(const item of actor?.items??[]){
  if(item.type!=='armor'||!item.system.equipped)continue;
  const id=item.system.craftsmanshipId;
  if(id==='iron'&&['athletics','coordination','riding','stealth'].includes(skillId))mods.push({id:`iron:${item.id}`,priority:20,pool:{add:{setback:1}}});
  if(id==='elven'&&skillId==='stealth')mods.push({id:`elven:${item.id}`,priority:100,pool:{remove:{setback:1}}});
  for(const a of item.getFlag(SID,'modifications')?.attachments??[])for(const e of a.effects??[])if(e.type==='add-boost'&&e.skills?.includes(skillId))mods.push({id:`attachment:${a.id}`,priority:20,pool:{add:{boost:e.count}}});
 }
 return mods;
}
function nested(changes,key){return changes[`system.${key}`]??changes.system?.[key];}
export function validateModificationUpdate(item,changes){
 const nextRecord=changes[`flags.${SID}.modifications`]??changes.flags?.[SID]?.modifications??item.getFlag(SID,'modifications');
 const capacity=nested(changes,'hardPoints')??item.system.hardPoints;
 if(nextRecord&&(nextRecord.attachments??[]).reduce((n,a)=>n+a.hardPointCost,0)>Number(capacity))return false;
 if(item.type==='attachment'&&item.parent&&['hardPointCost','compatibleTypes'].some(k=>nested(changes,k)!==undefined)){
  if([...item.parent.items].some(host=>(host.getFlag(SID,'modifications')?.attachments??[]).some(a=>a.id===item.id)))return false;
 }
 return true;
}
export async function openItemModifications(){
 authority();const actors=[...game.actors].filter(a=>a.type==='character');
 const choice=await foundry.applications.api.DialogV2.wait({window:{title:'Equipment Modifications'},content:`<label>Character<select name="actor">${actors.map((a,i)=>`<option value="${i}">${esc(a.name)}</option>`).join('')}</select></label>`,buttons:[{action:'open',label:'Continue',callback:(_e,_b,d)=>actors[Number(d.element.querySelector('[name=actor]').value)]},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
 if(!choice)return;const actor=choice,hosts=[...actor.items].filter(i=>['weapon','armor'].includes(i.type)),attachments=[...actor.items].filter(i=>i.type==='attachment');
 const result=await foundry.applications.api.DialogV2.wait({window:{title:'Craftsmanship / Attachments'},content:`<label>Item<select name="host">${hosts.map(i=>`<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('')}</select></label><label>Craftsmanship<select name="craftsmanship">${['steel','ancient','dwarven','elven','iron'].map(id=>`<option>${id}</option>`).join('')}</select></label><p>Select the complete installed attachment set:</p>${attachments.map(i=>`<label><input type="checkbox" name="attachment" value="${esc(i.id)}">${esc(i.name)} · ${i.system.hardPointCost} HP</label>`).join('')}<label>Other attachment effects / GM details<textarea name="notes"></textarea></label><label><input type="checkbox" name="confirmed">I confirm creation/correction or an explicit replacement exception, compatibility tags and remaining conditional attachment effects.</label><p>Craftsmanship normally cannot change after acquisition. This GM editor recomputes from the recorded steel base; Ancient replaces rather than stacks. Capacity overflow is blocked until attachments are removed. Numeric bonuses and added qualities are applied; conditional spend/replacement effects are recorded for GM resolution.</p>`,buttons:[{action:'apply',label:'Apply complete configuration',callback:(_e,_b,d)=>({hostId:d.element.querySelector('[name=host]').value,craftsmanshipId:d.element.querySelector('[name=craftsmanship]').value,attachmentIds:[...d.element.querySelectorAll('[name=attachment]:checked')].map(e=>e.value),confirmed:d.element.querySelector('[name=confirmed]').checked,notes:d.element.querySelector('[name=notes]').value})},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
 if(result)await modifyEquipment(actor,result);
}
Hooks.on('preUpdateItem',(item,changes)=>{if(!validateModificationUpdate(item,changes)){ui.notifications.warn('Remove installed attachments before reducing hard points or editing their cost/compatibility.');return false;}});
Hooks.on('preDeleteItem',item=>{if(item.type==='attachment'&&item.parent&&[...item.parent.items].some(host=>(host.getFlag(SID,'modifications')?.attachments??[]).some(a=>a.id===item.id))){ui.notifications.warn('Remove this attachment from its host before deleting it.');return false;}});
Hooks.once('ready',()=>{game.genesysItemModifications={openItemModifications,modifyEquipment,equipmentCheckModifiers};});
