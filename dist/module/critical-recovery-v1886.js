import {lookupCriticalInjury} from '../domain/criticals/index.js';
const SID='genesys-vtt';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');}
export async function applyCriticalRecovery(patient,options){
 authority();
 const {injuryId,medicRef,method,week,equipped,confirmed}=options??{};
 if(confirmed!==true||!['medicine','resilience'].includes(method)||typeof week!=='string'||!week.trim()||week.length>80||typeof equipped!=='boolean')throw Error('Confirm method, campaign week and circumstances.');
 if(patient?.type!=='character'||patient.system?.role!=='pc')throw Error('Choose a PC patient.');
 const injuries=patient.system.criticalInjuries??[],injury=injuries.find(i=>i.id===injuryId&&i.active!==false);
 if(!injury||injuries.some(i=>i.active!==false&&Number(i.total)>=151))throw Error('Choose a living patient and an active injury.');
 if(!Number.isSafeInteger(Number(injury.total))||Number(injury.total)<1)throw Error('Invalid injury result.');
 const definition=lookupCriticalInjury(injury.total);
 if(!definition.difficulty)throw Error('This injury cannot be healed.');
 const medic=method==='resilience'?patient:game.genesysVtt.initiative.resolveActorRef(medicRef);
 if(medic?.type!=='character')throw Error('Medic unavailable.');
 const history=patient.getFlag(SID,'criticalRecovery')??[];
 const key=JSON.stringify([week.trim(),method,method==='medicine'?medic.uuid:'',method==='medicine'?injuryId:'']);
 if(history.some(r=>r.key===key))throw Error('This weekly recovery attempt has already been recorded.');
 const difficulty=definition.difficulty+(method==='medicine'?((medic===patient?2:0)+(equipped?0:1)):0);
 const before=Number(patient.system.wounds.value);
 if(!Number.isSafeInteger(before)||before<0)throw Error('Invalid wounds.');
 const pool=game.genesysVtt.checks.prepareActorSkill(medic,method,{mode:'standard',difficulty}).check.construction.pool;
 const result=game.genesysVtt.dice.roll(pool),success=Number(result.net.success)>0;
 const record={key,injuryId,method,week:week.trim(),medicRef:medic.uuid,difficulty,pool,result,success,timestamp:Date.now()};
 const update={[`flags.${SID}.criticalRecovery`]:[...history,record]};
 if(success){update['system.criticalInjuries']=injuries.filter(i=>i.id!==injuryId);update['system.conditions']=(patient.system.conditions??[]).filter(c=>c.sourceId!==`critical:${injuryId}`);}
 else if(method==='resilience')update['system.wounds.value']=Math.max(0,before-1);
 authority();await patient.update(update);
 try{await foundry.documents.ChatMessage.create({speaker:{alias:medic.name},content:`<p>${esc(patient.name)} · ${esc(definition.name)} · ${method} difficulty ${difficulty}: ${success?'injury healed':'attempt failed'}. Weekly attempt recorded.</p><p>GM resolves Triumph (including an additional injury for natural recovery), other symbols and manually applied characteristic/limb effects. Permanent injuries are not reversed. Participant status is unchanged.</p>`});}catch{ui.notifications.warn('Recovery saved; chat failed. Do not repeat the attempt.');}
 return record;
}
export async function openCriticalRecovery(){
 authority();
 const scene=canvas.scene;
 if(!scene)throw Error('Open a scene first.');
 const actors=Array.from(game.actors.contents??[]).filter(a=>a.type==='character');
 const patients=actors.filter(a=>a.system?.role==='pc');
 const choices=patients.flatMap(a=>(a.system.criticalInjuries??[]).filter(i=>i.active!==false&&Number(i.total)<151).map(i=>({actor:a,injury:i})));
 if(!choices.length)throw Error('No active PC Critical Injuries.');
 const choice=await foundry.applications.api.DialogV2.wait({window:{title:'Critical Injury Recovery'},content:`<label>Patient / injury<select name="injury">${choices.map((r,n)=>`<option value="${n}">${esc(r.actor.name)} · ${esc(r.injury.name)}</option>`).join('')}</select></label><label>Method<select name="method"><option value="medicine">Medicine</option><option value="resilience">Full week of natural rest · Resilience</option></select></label><label>Medic (Medicine only)<select name="medic">${actors.map(a=>`<option value="${esc(a.uuid)}">${esc(a.name)}</option>`).join('')}</select></label><label>Campaign week identifier<input name="week" maxlength="80" placeholder="Use the same label throughout this campaign week"></label><label><input type="checkbox" name="equipped" checked>Medical equipment</label><label><input type="checkbox" name="confirmed">I confirm elapsed time, eligibility, action costs and special modifiers. The week label is unchanged for repeat attempts in the same week.</label><p>Medicine: one attempt per medic, injury and week. Natural rest: one attempt per patient and full week; record nightly healing separately. Failed natural recovery heals one wound. Triumph and manually applied injury effects remain GM-managed.</p>`,buttons:[{action:'roll',label:'Roll recovery',callback:(_e,_b,d)=>{const q=n=>d.element.querySelector(`[name=${n}]`);const row=choices[Number(q('injury').value)];return {patient:row.actor,options:{injuryId:row.injury.id,method:q('method').value,medicRef:q('medic').value,week:q('week').value,equipped:q('equipped').checked,confirmed:q('confirmed').checked}};}},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
 if(!choice)return;
 if(canvas.scene!==scene)throw Error('Scene changed.');
 const {resolveSceneCriticalRecovery}=await import('./initiative-service.js');
 await resolveSceneCriticalRecovery(choice.patient,choice.options,scene);
}
Hooks.once('ready',()=>{game.genesysCriticalRecovery={applyCriticalRecovery,openCriticalRecovery};});
