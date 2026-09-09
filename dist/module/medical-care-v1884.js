import {talentRank} from './recovery-talents-v1881.js';
import {assertRecoveryPatient,recoveryPatients,runPatientRecovery} from './recovery-patients-v1887.js';
const SID='genesys-vtt';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('The active GM applies medical care.');}
export function medicalDifficulty(wounds,threshold,{self=false,equipped=true}={}){
 if(!Number.isSafeInteger(wounds)||wounds<0||!Number.isSafeInteger(threshold)||threshold<1)throw Error('Invalid patient wounds or threshold.');
 return (wounds>threshold?3:wounds>threshold/2?2:1)+(self?2:0)+(equipped?0:1);
}
function context(scene,episode){
 const state=game.genesysVtt.initiative.sceneState(scene),id=scene.getFlag(SID,'ruleEncounterId');
 if(state.status!=='active'&&typeof episode==='string'&&episode.trim()){
  if(episode.trim().length>80)throw Error('Recovery episode label is too long.');
  return {state,key:`episode:${episode.trim()}`};
 }
 if(!id||!['active','ended'].includes(state.status))throw Error('Start an encounter or enter a recovery episode label.');
 return {state,key:`${scene.id}:${id}`};
}
export async function applyMedicalCare(patient,options,scene){
 return runPatientRecovery(patient,()=>applyLocked(patient,options,scene));
}
async function applyLocked(patient,options,scene){
 authority();const {state,key}=context(scene,options?.episode);
 if(!options||options.key!==key||options.confirmed!==true||typeof options.equipped!=='boolean')throw Error('Confirm current first-aid circumstances.');
 const resolve=game.genesysVtt.initiative.resolveActorRef;
 const medic=resolve(options.medicRef);
 if(!medic||medic.type!=='character')throw Error('Medic unavailable.');
 assertRecoveryPatient(patient,scene);
 if(state.status==='active'&&!state.entries.some(e=>resolve(e.actorRef)===patient))throw Error('During an active encounter choose a participant.');
 const history=patient.getFlag(SID,'medicalCare')??[];
 if(history.some(r=>r.key===key))throw Error('Patient already received a Medicine attempt this encounter.');
 const tracksStrain=patient.system.role!=='rival';
 const before=Number(patient.system.wounds.value),strain=tracksStrain?Number(patient.system.strain.value):0;
 if(!Number.isSafeInteger(strain)||strain<0)throw Error('Invalid patient strain.');
 const difficulty=medicalDifficulty(before,Number(patient.system.wounds.threshold),{self:medic===patient,equipped:options.equipped});
 const prepared=game.genesysVtt.checks.prepareActorSkill(medic,'medicine',{mode:'standard',difficulty});
 const pool=prepared.check.construction.pool,result=game.genesysVtt.dice.roll(pool);
 const success=Math.max(0,Math.trunc(Number(result.net.success)||0));
 const advantage=success>0?Math.max(0,Math.trunc(Number(result.net.advantage)||0)):0;
 const surgeonRank=talentRank(medic,'core-talent:surgeon');
 const after=Math.max(0,before-success-surgeonRank),afterStrain=Math.max(0,strain-advantage);
 const record={key,surgeonRank,medicRef:options.medicRef,difficulty,equipped:options.equipped,before,after,beforeStrain:strain,afterStrain,pool,result,timestamp:Date.now()};
 authority();await patient.update({'system.wounds.value':after,...(tracksStrain?{'system.strain.value':afterStrain}:{}),[`flags.${SID}.medicalCare`]:[...history,record]});
 try{await foundry.documents.ChatMessage.create({speaker:{alias:medic.name},content:`<section><strong>First Aid · Medicine</strong><p>${esc(patient.name)} · Difficulty ${difficulty} · Wounds ${before} → ${after} · Strain ${strain} → ${afterStrain} · Surgeon +${surgeonRank}</p><p>Attempt recorded for this encounter. GM resolves Triumph, Threat, Despair and special healing modifiers. Critical Injuries and participant status are unchanged.</p></section>`});}catch{ui.notifications.warn('First aid saved; chat failed. Do not reroll.');}
 return record;
}
export async function openMedicalCare(){
 authority();const scene=canvas.scene;
 if(!scene)throw Error('Open a scene first.');
 const state=game.genesysVtt.initiative.sceneState(scene),resolve=game.genesysVtt.initiative.resolveActorRef;
 let key;try{key=context(scene).key;}catch{}
 const patients=recoveryPatients(scene).filter(r=>state.status!=='active'||state.entries.some(e=>resolve(e.actorRef)===r.actor));
 const medics=new Map(Array.from(game.actors.contents??[]).filter(a=>a.type==='character').map(a=>[a.uuid,a]));
 for(const e of state.entries){const actor=resolve(e.actorRef);if(actor)medics.set(e.actorRef,actor);}
 const options=(rows)=>rows.map(([ref,a])=>`<option value="${esc(ref)}">${esc(a.name)}</option>`).join('');
 const choice=await foundry.applications.api.DialogV2.wait({window:{title:'Medical Care · First Aid'},content:`<p>One Medicine attempt per patient per encounter or GM-labelled recovery episode, including failed attempts. Enabled Surgeon heals additional wounds equal to the medic’s rank, including failed checks. Success heals wounds; Advantage on success heals strain. Self-care +2 difficulty; no medical equipment +1.</p>${state.status!=='active'?'<label>Recovery episode (leave blank to use the last encounter)<input name="episode" maxlength="80" placeholder="Use the same label for the same injury episode"></label>':''}<label>Patient<select name="patient">${options(patients.map(r=>[r.ref,r.actor]))}</select></label><label>Medic<select name="medic">${options([...medics])}</select></label><label><input type="checkbox" name="equipped" checked>Medical equipment available</label><label><input type="checkbox" name="confirmed">I confirm timing/action costs, patient eligibility and applicable special rules.</label><p>GM handles action spending and special modifiers. This does not heal Critical Injuries.</p>`,buttons:[{action:'apply',label:'Roll Medicine',callback:(_e,_b,d)=>({patient:d.element.querySelector('[name=patient]').value,medicRef:d.element.querySelector('[name=medic]').value,equipped:d.element.querySelector('[name=equipped]').checked,confirmed:d.element.querySelector('[name=confirmed]').checked,episode:d.element.querySelector('[name=episode]')?.value??'',key})},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
 if(!choice)return;choice.key=context(scene,choice.episode).key;if(canvas.scene!==scene)throw Error('Scene changed.');
 const {resolveSceneMedicalCare}=await import('./initiative-service.js');
 await resolveSceneMedicalCare(resolve(choice.patient),choice,scene);
}
Hooks.once('ready',()=>{game.genesysMedicalCare={applyMedicalCare,openMedicalCare};});
