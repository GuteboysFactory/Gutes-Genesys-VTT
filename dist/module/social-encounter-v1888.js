import {SOCIAL_OPPOSITION,socialOutcome} from '../domain/social/social.js';
import {influentialValues} from '../domain/heroic/primary-effects.js';
import {prepareOpposedCheck} from '../domain/checks/index.js';
import {prepareActorSkillCheck} from './skill-ui.js';
import {getActorConditionCheckModifiers} from './condition-service.js';
const SID='genesys-vtt';let queue=Promise.resolve();
const locked=fn=>{const result=queue.catch(()=>{}).then(fn);queue=result;return result;};
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');}
const record=a=>a.getFlag(SID,'socialCheck');
const resolve=ref=>game.genesysVtt.initiative.resolveActorRef(ref);
export function beginSocialCheck(actor,options){return locked(async()=>{
 authority();if(options.confirmed!==true)throw Error('Confirm social action and fictional stakes.');
 if(record(actor)&&record(actor).stage!=='complete')throw Error('Resolve the saved social result first.');
 const target=resolve(options.targetRef),opposition=SOCIAL_OPPOSITION[options.skillId];
 if(!target||target===actor||!opposition)throw Error('Choose another character and a social skill.');
 for(const name of ['boost','setback'])if(!Number.isSafeInteger(options[name])||options[name]<0||options[name]>2)throw Error('Motivation modifiers must be 0, 1 or 2.');
 const a=prepareActorSkillCheck(actor,options.skillId),b=prepareActorSkillCheck(target,opposition);
 const modifiers=[...getActorConditionCheckModifiers(actor,a),{id:'social:motivation',pool:{add:{boost:options.boost,setback:options.setback}}},...(game.genesysArchetypes?.socialTargetModifiers?.(target)??[])];
 const prepared=prepareOpposedCheck({actor:{characteristic:a.characteristicValue,skillRank:a.skillRank},opponent:{characteristic:b.characteristicValue,skillRank:b.skillRank},modifiers});
 const job={id:foundry.utils.randomID(),stage:'rolled',targetRef:target.uuid,skillId:options.skillId,opposition,characteristic:a.characteristicValue,pool:prepared.construction.pool,result:game.genesysVtt.dice.roll(prepared.construction.pool),notes:String(options.notes??'').slice(0,1000)};
 const completed=game.genesysCriticalLifecycle?.prepareRuleCheckResult?.(actor,job.result)??{result:job.result,patch:{}};job.result=completed.result;
 authority();await actor.update({...completed.patch,[`flags.${SID}.socialCheck`]:job});return job;
});}
export function resolveSocialCheck(actor,options){return locked(async()=>{
 authority();let job=structuredClone(record(actor));if(!job||job.id!==options?.id)throw Error('Social result changed.');if(job.stage==='complete')return job;
 if(job.stage==='rolled'){
  if(options.confirmed!==true)throw Error('Confirm result spending.');
  const values=influentialValues(actor.system.heroicAbility,{social:true,characteristic:job.characteristic});
  const outcome=socialOutcome(job.result,{remarks:options.remarks,triumphRemarks:options.triumphRemarks,remarkCost:values.criticalRemarkCost,bonus:values.bonus});
  job={...job,stage:'apply',outcome};authority();await actor.update({[`flags.${SID}.socialCheck`]:job});
 }
 const target=resolve(job.targetRef);if(!target)throw Error('Restore the social target to finish this result.');
 for(const [patient,amount]of [[actor,job.outcome.actorStrain],[target,job.outcome.targetStrain]]){
  if(!amount)continue;const receipts=patient.getFlag(SID,'socialReceipts')??[];if(receipts.includes(job.id))continue;
  const cool=prepareActorSkillCheck(patient,'cool').skillRank;
  const reduced=influentialValues(patient.system.heroicAbility,{social:true,strain:amount,presence:Number(patient.system.characteristics.presence),cool}).strain;
  const track=['rival','minion'].includes(patient.system.role)?'wounds':'strain',before=Number(patient.system[track].value);if(!Number.isSafeInteger(before)||before<0)throw Error('Invalid social strain resource.');
  authority();await patient.update({[`system.${track}.value`]:before+reduced,[`flags.${SID}.socialReceipts`]:[...receipts,job.id]});
 }
 job.stage='complete';authority();await actor.update({[`flags.${SID}.socialCheck`]:job});return job;
});}
export async function openSocialEncounter(){
 authority();const actors=[...game.actors].filter(a=>a.type==='character');
 const choice=await foundry.applications.api.DialogV2.wait({window:{title:'Social Encounter'},content:`<label>Speaker<select name="actor">${actors.map((a,i)=>`<option value="${i}">${esc(a.name)}</option>`).join('')}</select></label>`,buttons:[{action:'open',label:'Continue',callback:(_e,_b,d)=>actors[Number(d.element.querySelector('[name=actor]').value)]},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});if(!choice)return;const actor=choice;
 let job=record(actor);
 if(!job||job.stage==='complete'){
  const input=await foundry.applications.api.DialogV2.wait({window:{title:'Social check'},content:`<label>Target<select name="target">${actors.filter(a=>a!==actor).map(a=>`<option value="${esc(a.uuid)}">${esc(a.name)}</option>`).join('')}</select></label><label>Skill<select name="skill">${Object.entries(SOCIAL_OPPOSITION).map(([a,b])=>`<option value="${a}">${a} vs ${b}</option>`).join('')}</select></label><label>Motivation Boost<input name="boost" type="number" min="0" max="2" value="0"></label><label>Motivation Setback<input name="setback" type="number" min="0" max="2" value="0"></label><label><input name="confirmed" type="checkbox">Social action, motivation relevance and stakes confirmed</label><p>Extended encounter: success inflicts 1 + net Success strain; failure costs the speaker 2 strain. Narrative concessions remain GM decisions.</p>`,buttons:[{action:'roll',label:'Roll',callback:(_e,_b,d)=>({targetRef:d.element.querySelector('[name=target]').value,skillId:d.element.querySelector('[name=skill]').value,boost:Number(d.element.querySelector('[name=boost]').value),setback:Number(d.element.querySelector('[name=setback]').value),confirmed:d.element.querySelector('[name=confirmed]').checked})},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});if(!input)return;job=await beginSocialCheck(actor,input);
 }
 const cost=influentialValues(actor.system.heroicAbility,{social:true}).criticalRemarkCost;
 const input=await foundry.applications.api.DialogV2.wait({window:{title:'Social result'},content:`<p>${esc(JSON.stringify(job.result.net))}</p><label>Critical remarks (${cost} Advantage each)<input type="number" name="remarks" min="0" value="0"></label><label>Critical remarks (one Triumph each)<input type="number" name="triumph" min="0" value="0"></label><label><input name="confirmed" type="checkbox">I confirm these symbols remain unspent and will not be spent again.</label>`,buttons:[{action:'apply',label:'Apply social strain',callback:(_e,_b,d)=>({id:job.id,remarks:Number(d.element.querySelector('[name=remarks]').value),triumphRemarks:Number(d.element.querySelector('[name=triumph]').value),confirmed:d.element.querySelector('[name=confirmed]').checked})},{action:'cancel',label:'Resume later',callback:()=>null}],rejectClose:false});if(input){job=await resolveSocialCheck(actor,input);ui.notifications.info(`Social check resolved: target ${job.outcome.targetStrain} strain; speaker ${job.outcome.actorStrain}, before applicable reduction.`);}
}
Hooks.once('ready',()=>{game.genesysSocial={openSocialEncounter,beginSocialCheck,resolveSocialCheck};});
