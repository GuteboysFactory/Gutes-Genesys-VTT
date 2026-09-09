const SID='genesys-vtt';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('The active GM applies medical care.');}
export function medicalDifficulty(wounds,threshold,{self=false,equipped=true}={}){
 if(!Number.isSafeInteger(wounds)||wounds<0||!Number.isSafeInteger(threshold)||threshold<1)throw Error('Invalid patient wounds or threshold.');
 return (wounds>threshold?3:wounds>threshold/2?2:1)+(self?2:0)+(equipped?0:1);
}
function context(scene){
 const state=game.genesysVtt.initiative.sceneState(scene),id=scene.getFlag(SID,'ruleEncounterId');
 if(!id||!['active','ended'].includes(state.status))throw Error('Start an encounter before recording first aid.');
 return {state,key:`${scene.id}:${id}`};
}
export async function applyMedicalCare(patient,options,scene){
 authority();const {state,key}=context(scene);
 if(!options||options.key!==key||options.confirmed!==true||typeof options.equipped!=='boolean')throw Error('Confirm current first-aid circumstances.');
 const resolve=game.genesysVtt.initiative.resolveActorRef;
 const medic=resolve(options.medicRef);
 if(!medic||medic.type!=='character')throw Error('Medic unavailable.');
 const entry=state.entries.find(e=>resolve(e.actorRef)===patient);
 if(!entry||entry.encounterStatus==='dead'||patient.system?.role!=='pc')throw Error('Choose a living PC participant.');
 const history=patient.getFlag(SID,'medicalCare')??[];
 if(history.some(r=>r.key===key))throw Error('Patient already received a Medicine attempt this encounter.');
 const before=Number(patient.system.wounds.value),strain=Number(patient.system.strain.value);
 if(!Number.isSafeInteger(strain)||strain<0)throw Error('Invalid patient strain.');
 const difficulty=medicalDifficulty(before,Number(patient.system.wounds.threshold),{self:medic===patient,equipped:options.equipped});
 const prepared=game.genesysVtt.checks.prepareActorSkill(medic,'medicine',{mode:'standard',difficulty});
 const pool=prepared.check.construction.pool,result=game.genesysVtt.dice.roll(pool);
 const success=Math.max(0,Math.trunc(Number(result.net.success)||0));
 const advantage=success>0?Math.max(0,Math.trunc(Number(result.net.advantage)||0)):0;
 const after=Math.max(0,before-success),afterStrain=Math.max(0,strain-advantage);
 const record={key,medicRef:options.medicRef,difficulty,equipped:options.equipped,before,after,beforeStrain:strain,afterStrain,pool,result,timestamp:Date.now()};
 authority();await patient.update({'system.wounds.value':after,'system.strain.value':afterStrain,[`flags.${SID}.medicalCare`]:[...history,record]});
 try{await foundry.documents.ChatMessage.create({speaker:{alias:medic.name},content:`<section><strong>First Aid · Medicine</strong><p>${esc(patient.name)} · Difficulty ${difficulty} · Wounds ${before} → ${after} · Strain ${strain} → ${afterStrain}</p><p>Attempt recorded for this encounter. GM resolves Triumph, Threat, Despair and special healing modifiers. Critical Injuries and participant status are unchanged.</p></section>`});}catch{ui.notifications.warn('First aid saved; chat failed. Do not reroll.');}
 return record;
}
export async function openMedicalCare(){
 authority();const scene=canvas.scene,{state,key}=context(scene),resolve=game.genesysVtt.initiative.resolveActorRef;
 const patients=state.entries.filter(e=>e.encounterStatus!=='dead').map(e=>({ref:e.actorRef,actor:resolve(e.actorRef)})).filter(r=>r.actor?.system?.role==='pc');
 const medics=new Map(Array.from(game.actors.contents??[]).filter(a=>a.type==='character').map(a=>[a.uuid,a]));
 for(const e of state.entries){const actor=resolve(e.actorRef);if(actor)medics.set(e.actorRef,actor);}
 const options=(rows)=>rows.map(([ref,a])=>`<option value="${esc(ref)}">${esc(a.name)}</option>`).join('');
 const choice=await foundry.applications.api.DialogV2.wait({window:{title:'Medical Care · First Aid'},content:`<p>One Medicine attempt per PC patient per encounter, including failed attempts. Success heals wounds; Advantage on success heals strain. Self-care +2 difficulty; no medical equipment +1.</p><label>Patient<select name="patient">${options(patients.map(r=>[r.ref,r.actor]))}</select></label><label>Medic<select name="medic">${options([...medics])}</select></label><label><input type="checkbox" name="equipped" checked>Medical equipment available</label><label><input type="checkbox" name="confirmed">I confirm timing/action costs, patient eligibility and applicable special rules.</label><p>GM handles action spending and special modifiers. This does not heal Critical Injuries.</p>`,buttons:[{action:'apply',label:'Roll Medicine',callback:(_e,_b,d)=>({patient:d.element.querySelector('[name=patient]').value,medicRef:d.element.querySelector('[name=medic]').value,equipped:d.element.querySelector('[name=equipped]').checked,confirmed:d.element.querySelector('[name=confirmed]').checked,key})},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
 if(!choice)return;if(canvas.scene!==scene)throw Error('Scene changed.');
 const {resolveSceneMedicalCare}=await import('./initiative-service.js');
 await resolveSceneMedicalCare(resolve(choice.patient),choice,scene);
}
Hooks.once('ready',()=>{game.genesysMedicalCare={applyMedicalCare,openMedicalCare};});
