import {talentRank} from './recovery-talents-v1881.js';
const SID='genesys-vtt';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');}
export function painkillerHealing(used,rank){
 if(!Number.isSafeInteger(used)||used<0||!Number.isSafeInteger(rank)||rank<0)throw Error('Invalid use count or talent rank.');
 return used>=5?0:5-used+rank;
}
export function painkillerState(actor){
 const row=actor.getFlag(SID,'painkillers')??{uses:0,revision:0};
 if(!Number.isSafeInteger(row.uses)||row.uses<0||!Number.isSafeInteger(row.revision)||row.revision<0)throw Error('Invalid painkiller record.');
 return row;
}
export async function applyPainkiller(patient,options,scene){
 authority();
 const resolve=game.genesysVtt.initiative.resolveActorRef;
 const state=game.genesysVtt.initiative.sceneState(scene);
 if(patient.system?.role!=='pc'||!state.entries.some(e=>resolve(e.actorRef)===patient&&e.encounterStatus!=='dead'))throw Error('Choose a living PC participant.');
 const old=painkillerState(patient);
 if(options?.confirmed!==true||options.revision!==old.revision||!['use','reset'].includes(options.operation))throw Error('Patient record changed or confirmation missing. Reopen the panel.');
 let record,update;
 if(options.operation==='reset'){
  record={uses:0,revision:old.revision+1,last:{operation:'reset',previousUses:old.uses,timestamp:Date.now(),userId:game.user.id}};
  update={[`flags.${SID}.painkillers`]:record};
 }else{
  const provider=resolve(options.providerRef);if(!provider||provider.type!=='character')throw Error('Provider unavailable.');
  const before=Number(patient.system.wounds.value);if(!Number.isSafeInteger(before)||before<0)throw Error('Invalid wounds.');
  const rank=talentRank(provider,'core-talent:painkiller-specialization');
  const healing=painkillerHealing(old.uses,rank),after=Math.max(0,before-healing);
  record={uses:old.uses+1,revision:old.revision+1,last:{operation:'use',providerRef:options.providerRef,rank,healing,before,after,timestamp:Date.now(),userId:game.user.id}};
  update={'system.wounds.value':after,[`flags.${SID}.painkillers`]:record};
 }
 authority();await patient.update(update);
 try{await foundry.documents.ChatMessage.create({speaker:{alias:patient.name},content:options.operation==='reset'?'<p>Painkiller daily-use counter reset by GM.</p>':`<p>Painkiller / healing potion #${record.uses}: wounds ${record.last.before} → ${record.last.after}. Provider specialization rank ${record.last.rank}. Inventory and maneuver were GM-confirmed; Critical Injuries and strain unchanged.</p>`});}catch{ui.notifications.warn('Painkiller record saved; chat failed. Do not repeat this use.');}
 return record;
}
export async function openPainkillers(){
 authority();const scene=canvas.scene,resolve=game.genesysVtt.initiative.resolveActorRef,state=game.genesysVtt.initiative.sceneState(scene);
 const patients=state.entries.map(e=>({...e,actor:resolve(e.actorRef)})).filter(e=>e.encounterStatus!=='dead'&&e.actor?.system?.role==='pc');
 const providers=new Map(Array.from(game.actors.contents??[]).filter(a=>a.type==='character').map(a=>[a.uuid,a]));for(const e of state.entries){const a=resolve(e.actorRef);if(a)providers.set(e.actorRef,a);}
 const records=patients.map(e=>painkillerState(e.actor));
 const choice=await foundry.applications.api.DialogV2.wait({window:{title:'Painkillers / Healing Potions'},content:`<p>Record an already administered dose: 5/4/3/2/1 wounds, then no effect. The provider's enabled Painkiller Specialization adds its rank to the first five doses only. No strain or Critical Injury healing.</p><label>Patient<select name="patient">${patients.map((e,n)=>`<option value="${n}">${esc(e.actor.name)} · ${records[n].uses} doses since reset</option>`).join('')}</select></label><label>Provider<select name="provider">${[...providers].map(([ref,a])=>`<option value="${esc(ref)}">${esc(a.name)}</option>`).join('')}</select></label><label>Operation<select name="operation"><option value="use">Record administered dose</option><option value="reset">Reset daily count</option></select></label><label><input type="checkbox" name="confirmed">For a dose: item consumed, maneuver and engaged range/free hand checked. For reset: a new rules day is confirmed.</label><p>Inventory, timing and calendar are GM-managed. Counter belongs to the patient across encounters.</p>`,buttons:[{action:'apply',label:'Apply',callback:(_e,_b,d)=>{const n=Number(d.element.querySelector('[name=patient]').value);return {patient:patients[n]?.actor,revision:records[n]?.revision,providerRef:d.element.querySelector('[name=provider]').value,operation:d.element.querySelector('[name=operation]').value,confirmed:d.element.querySelector('[name=confirmed]').checked};}},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
 if(!choice)return;if(!choice.patient||canvas.scene!==scene)throw Error('Patient or scene changed.');
 const {resolveScenePainkiller}=await import('./initiative-service.js');await resolveScenePainkiller(choice.patient,choice,scene);
}
Hooks.once('ready',()=>{game.genesysPainkillers={applyPainkiller,openPainkillers};});
