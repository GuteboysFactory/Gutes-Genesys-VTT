import {applyPoolModifiers} from '../domain/pool/index.js';
const SID='genesys-vtt';let queue=Promise.resolve();
export function storyCheck(actor,options){
 const run=queue.catch(()=>{}).then(async()=>{
  const authority=()=>{if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');};authority();
  let job=actor.getFlag(SID,'storyCheck');
  if(!job||job.stage==='complete'){
   if(options?.confirmed!==true)throw Error('GM must approve this check.');
   if(![0,1].includes(options.player)||![0,1].includes(options.gm)||options.impossible&&options.player!==1)throw Error('Each side may spend at most one; Impossible requires one player point.');
   if(!Number.isSafeInteger(options.difficulty)||options.difficulty<0||options.difficulty>5)throw Error('Difficulty must be 0–5.');
   const prepared=game.genesysVtt.checks.prepareActorSkill(actor,options.skillId,{mode:'standard',difficulty:options.impossible?5:options.difficulty});
   job={id:foundry.utils.randomID(),stage:'reserve',skillId:options.skillId,impossible:options.impossible===true,spend:{player:options.player,gm:options.gm},pool:prepared.check.construction.pool};
   await actor.update({[`flags.${SID}.storyCheck`]:job});
  }
  if(job.stage==='reserve'){
   await game.genesysStoryPoints.beginCheck(job.id,job.spend,{impossible:job.impossible,gmApproved:true});
   const upgraded=applyPoolModifiers(job.pool,{upgradePositive:job.impossible?0:job.spend.player,upgradeNegative:job.spend.gm});
   const rolled=game.genesysVtt.dice.roll(upgraded.pool),completed=game.genesysCriticalLifecycle?.prepareRuleCheckResult?.(actor,rolled)??{result:rolled,patch:{}};
   job={...job,stage:'rolled',result:completed.result,rolledPool:upgraded.pool};authority();await actor.update({...completed.patch,[`flags.${SID}.storyCheck`]:job});
  }
  return job;
 });queue=run;return run;
}
export function finishStoryCheck(actor,id){
 const run=queue.catch(()=>{}).then(async()=>{
  const job=actor.getFlag(SID,'storyCheck');if(job?.id!==id)throw Error('Saved check changed.');
  if(job.stage==='complete')return job;if(job.stage!=='rolled')throw Error('Roll the approved check first.');
  await game.genesysStoryPoints.finishCheck(id);
  await actor.update({[`flags.${SID}.storyCheck`]:{...job,stage:'complete'}});return job;
 });queue=run;return run;
}
export function cancelUnrolledStoryCheck(actor){
 const run=queue.catch(()=>{}).then(async()=>{
  if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');
  const job=actor.getFlag(SID,'storyCheck');if(!job||job.stage!=='reserve')throw Error('Only an unrolled check may be cancelled. Resolve a rolled action and transfer its points.');
  await game.genesysStoryPoints.cancelCheck(job.id);
  await actor.update({[`flags.${SID}.storyCheck`]:{...job,stage:'complete',cancelled:true}});
 });queue=run;return run;
}
export async function openStoryCheck(){
 const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const actors=[...game.actors].filter(a=>a.type==='character');
 const actor=await foundry.applications.api.DialogV2.wait({window:{title:'Story Point check'},content:`<select name="actor">${actors.map((a,i)=>`<option value="${i}">${esc(a.name)}</option>`).join('')}</select>`,buttons:[{action:'open',label:'Continue',callback:(_e,_b,d)=>actors[Number(d.element.querySelector('[name=actor]').value)]},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});if(!actor)return;
 let job=actor.getFlag(SID,'storyCheck');
 if(job?.stage==='reserve'){
  const action=await foundry.applications.api.DialogV2.wait({window:{title:'Unrolled Story Point check'},content:'<p>A saved check has not reached its saved roll. Resume it or cancel its reservation.</p>',buttons:[{action:'resume',label:'Resume roll'},{action:'cancel-check',label:'Cancel unrolled check'}],rejectClose:false});
  if(!action)return;if(action==='cancel-check'){await cancelUnrolledStoryCheck(actor);return;}
 }
 if(!job||job.stage==='complete'){
 const skills=actor.system.skills??[];
 const input=await foundry.applications.api.DialogV2.wait({window:{title:'Approve Story Point check'},content:`<label>Skill<select name="skill">${skills.map(s=>`<option value="${esc(s.id)}">${esc(s.id)}</option>`).join('')}</select></label><label>Difficulty<input name="difficulty" type="number" value="2" min="0" max="5"></label><label><input type="checkbox" name="impossible">Impossible (GM permission; Formidable, one player point required, no player upgrade)</label><label><input type="checkbox" name="player">Spend one player point</label><label><input type="checkbox" name="gm">Spend one GM point</label><p>Each side can spend at most one point. Points transfer after you resolve this action; other pool changes wait until then.</p>`,buttons:[{action:'roll',label:'Approve and roll',callback:(_e,_b,d)=>({confirmed:true,skillId:d.element.querySelector('[name=skill]').value,difficulty:Number(d.element.querySelector('[name=difficulty]').value),impossible:d.element.querySelector('[name=impossible]').checked,player:d.element.querySelector('[name=player]').checked?1:0,gm:d.element.querySelector('[name=gm]').checked?1:0})},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});if(!input)return;job=await storyCheck(actor,input);
 }else job=await storyCheck(actor,{});
 const done=await foundry.applications.api.DialogV2.wait({window:{title:'Resolve saved Story Point check'},content:`<p>${esc(JSON.stringify(job.result.net))}</p><p>Resolve the action and its narrative results, then transfer the reserved points.</p>`,buttons:[{action:'resolve',label:'Action resolved — transfer points',callback:()=>true},{action:'later',label:'Resume later',callback:()=>false}],rejectClose:false});if(done)await finishStoryCheck(actor,job.id);
}
Hooks.once('ready',()=>{game.genesysStoryCheck={storyCheck,finishStoryCheck,cancelUnrolledStoryCheck,openStoryCheck};});
