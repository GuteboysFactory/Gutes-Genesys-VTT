import {damageImmune} from '../domain/heroic/primary-effects.js';
import {environmentalOutcome} from '../domain/environment/environment.js';
import {runPatientRecovery} from './recovery-patients-v1887.js';
import {inflictCriticalInjury} from './critical-service.js';
const SID='genesys-vtt';
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');}
export function applyEnvironment(actor,options){return runPatientRecovery(actor,async()=>{
 authority();if(!['pc','rival','nemesis'].includes(actor.system.role))throw Error('Choose an individual PC, Rival or Nemesis.');let job=actor.getFlag(SID,'environmentJob');
 if(!job||job.stage==='complete'){
  if(options?.confirmed!==true)throw Error('Confirm the hazard, timing, protection, breath reserve and mitigation.');
  const sys=actor.system;
  const outcome=environmentalOutcome({...options,soak:Number(sys.soak),wounds:Number(sys.wounds.value),woundThreshold:Number(sys.wounds.threshold),strain:Number(sys.strain.value),strainThreshold:Number(sys.strain.threshold),role:sys.role});
  if(damageImmune(sys.heroicAbility)){outcome.wounds=Number(sys.wounds.value);outcome.strain=Number(sys.strain.value);outcome.criticalModifier=null;outcome.damageImmune=true;}
  job={id:foundry.utils.randomID(),stage:'resources',outcome,kind:options.kind};
  // Resource changes and the pending injury receipt are one Actor write.
  await actor.update({'system.wounds.value':outcome.wounds,'system.strain.value':outcome.strain,[`flags.${SID}.environmentJob`]:job});
 }
 if(job.outcome.criticalModifier!==null){
  const source=`environment:${job.id}`;
  if(!(actor.system.criticalInjuries??[]).some(c=>c.sourceId===source))await inflictCriticalInjury(actor,{flatModifier:job.outcome.criticalModifier},source);
 }
 for(const injury of actor.system.criticalInjuries??[])if(injury.runtimePending)await game.genesysCriticalLifecycle?.inflicted?.(actor,injury);
 await game.genesysCriticalLifecycle?.reconcileBleeding?.(actor);
 authority();job={...job,stage:'complete'};await actor.update({[`flags.${SID}.environmentJob`]:job});return job;
});}
export async function openEnvironment(){
 authority();const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const actors=[...game.actors].filter(a=>a.type==='character'&&a.system.role!=='minion');
 const input=await foundry.applications.api.DialogV2.wait({window:{title:'Environmental Harm · Core pp.110–112'},content:`<select name="actor">${actors.map((a,i)=>`<option value="${i}">${esc(a.name)}</option>`).join('')}</select><label>Hazard<select name="kind"><option value="fall">Falling</option><option value="fire">Fire</option><option value="acid">Acid / corrosive atmosphere</option><option value="suffocation">Suffocation</option><option value="vacuum">Vacuum exposure</option></select></label><label>Fall range (after any GM-approved Triumph reduction)<select name="range">${['short','medium','long','extreme'].map(r=>`<option>${r}</option>`).join('')}</select></label><label>Fire / acid rating<input name="rating" type="number" value="1" min="1"></label><label>Fall mitigation: net Success<input name="success" type="number" value="0" min="0"></label><label>Fall mitigation: net Advantage<input name="advantage" type="number" value="0" min="0"></label><p>Fall mitigation uses Average Athletics or Coordination. Fire/acid cause wounds equal to rating; ordinary falling damage is reduced by soak, strain is not. Long/extreme falls use threshold+1 and the printed Critical modifier. Vacuum exposure and suffocation are separate consequences.</p><p>Apply an ongoing hazard once at its printed boundary. Holding breath lasts Brawn rounds; protection, escape, extinguishing and any death decision remain GM choices.</p><label><input name="confirmed" type="checkbox">This is a new applicable exposure; timing, protection, breath and mitigation checked. Resume an unfinished saved exposure instead of applying it again.</label>`,buttons:[{action:'apply',label:'Apply / resume saved harm',callback:(_e,_b,d)=>({actor:actors[Number(d.element.querySelector('[name=actor]').value)],kind:d.element.querySelector('[name=kind]').value,range:d.element.querySelector('[name=range]').value,rating:Number(d.element.querySelector('[name=rating]').value),success:Number(d.element.querySelector('[name=success]').value),advantage:Number(d.element.querySelector('[name=advantage]').value),confirmed:d.element.querySelector('[name=confirmed]').checked})},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
 if(input){const job=await applyEnvironment(input.actor,input);ui.notifications.info(`Environmental harm saved: wounds ${job.outcome.wounds}, strain ${job.outcome.strain}.`);}
}
Hooks.once('ready',()=>{game.genesysEnvironment={openEnvironment,applyEnvironment};});
