import {actorAdversaryContext} from './adversary-service.js';
import {CORE_CONDITIONS} from '../domain/conditions/index.js';
import {addActorCondition,removeActorCondition} from './condition-service.js';
const SOURCE='gm-health';
let pending=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Only the active GM may change health controls.');}
export function healthRoster(scene=globalThis.canvas?.scene){
 if(!game.user?.isGM)return [];
 const rows=new Map();
 for(const actor of game.actors.contents)if(actor.type==='character')rows.set(actor.uuid,{ref:actor.uuid,actor,name:actor.name,scope:'World'});
 for(const token of scene?.tokens?.contents??[]){const actor=token.actor;if(actor?.type==='character')rows.set(actor.uuid,{ref:actor.uuid,actor,name:token.name||actor.name,scope:'Scene'});}
 return [...rows.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
}
export async function applyHealthBatch(refs,{operation,conditionId,scene}={}){
 authority();if(pending)throw Error('Health update already running.');
 if(!['add','remove'].includes(operation)||!CORE_CONDITIONS.some(c=>c.id===conditionId))throw Error('Choose a valid condition operation.');
 if(!Array.isArray(refs)||!refs.length)throw Error('Select at least one character.');
 const roster=healthRoster(scene),selected=[...new Set(refs)].map(ref=>roster.find(r=>r.ref===ref));
 if(selected.some(r=>!r))throw Error('A selected character is unavailable. Refresh the overview.');
 pending=true;const applied=[],failed=[];
 try{for(const row of selected){try{
  authority();if(!healthRoster(scene).some(r=>r.ref===row.ref&&r.actor===row.actor))throw Error('Character unavailable.');
  const states=(row.actor.system.conditions??[]).filter(c=>c.active!==false&&c.conditionId===conditionId);
  if(operation==='add'){
   if(!states.some(c=>c.sourceId===SOURCE))await addActorCondition(row.actor,conditionId,{sourceId:SOURCE,durationType:'manual'});
  }else for(const state of states.filter(c=>c.sourceId===SOURCE))await removeActorCondition(row.actor,state.id);
  applied.push(row.name);
 }catch(e){failed.push({name:row.name,reason:e.message});}}
 return {applied,failed};
 }finally{pending=false;}
}
export async function recoverHealthBatch(refs,skill,scene){
 authority();if(pending)throw Error('Health update already running.');
 if(!['cool','discipline'].includes(skill))throw Error('Choose Cool or Discipline.');
 if(!Array.isArray(refs)||!refs.length)throw Error('Select at least one participant.');
 pending=true;const applied=[],failed=[];
 try{for(const ref of new Set(refs)){try{authority();await game.genesysEncounterRecovery.recover(ref,skill,0,scene);applied.push(ref);}catch(e){failed.push({name:ref,reason:e.message});}}return {applied,failed};}finally{pending=false;}
}
function report(result){
 ui.notifications.info(`${result.applied.length} completed; ${result.failed.length} failed.`);
 if(result.failed.length)ui.notifications.warn(result.failed.map(r=>`${r.name}: ${r.reason}`).join(' · '));
}
let open=false;
export async function openGmHealth(){
 if(open)return;open=true;
 try{await healthDialog();}finally{open=false;}
}
async function healthDialog(){
 if(!game.user?.isGM)return;
 let scope='scene';
 while(game.user?.isGM){
  const scene=globalThis.canvas?.scene;
  const rows=healthRoster(scene).filter(r=>scope==='world'||r.scope==='Scene');
  const recovery=game.genesysEncounterRecovery?.recoveryRoster(scene)??{ready:false,rows:[]};
  const writer=game.users?.activeGM?.id===game.user.id;
  const content=`<p>Scope: ${scope==='scene'?'current scene tokens':'all world characters and current scene tokens'}. Wounds do not determine encounter defeat status.</p>
  <div style="max-height:360px;overflow:auto"><table><thead><tr><th>Select</th><th>Character</th><th>Wounds</th><th>Strain</th><th>Conditions</th><th>Criticals</th></tr></thead><tbody>${rows.map(r=>{
   const a=r.actor,s=a.system;
   const conditions=(s.conditions??[]).filter(c=>c.active!==false).map(c=>`${c.conditionId}${c.sourceId===SOURCE?' (GM health)':''}${c.durationType==='turns'?` · ${c.remaining} turns`:''}`).join(', ')||'—';
   const criticals=(s.criticalInjuries??[]).filter(c=>c.active!==false&&c.healed!==true).map(c=>`${c.name}${c.secondaryStatus==='pending'?' (pending)':''}`).join(', ')||'—';
   return `<tr><td><input type="checkbox" name="actor" value="${esc(r.ref)}"></td><td>${esc(r.name)} · ${esc(s.role)}</td><td>${esc(s.wounds?.value)} / ${esc(s.role==='minion'?actorAdversaryContext(a).minionGroup.groupWoundThreshold:s.wounds?.threshold)}</td><td>${esc(s.strain?.value)} / ${esc(s.strain?.threshold)}</td><td>${esc(conditions)}</td><td>${esc(criticals)}</td></tr>`;
  }).join('')}</tbody></table></div>
  <label>Condition <select name="condition">${CORE_CONDITIONS.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}</select></label>
  <p>${CORE_CONDITIONS.map(c=>`${c.label}: ${c.description}`).join(' ')}</p><p>Add uses a manual duration. Remove clears only conditions added here; critical, talent and other sources are preserved. Open sheets to resolve those sources.</p>
  <details><summary>After-encounter recovery</summary><p>One Simple Cool/Discipline check per selected eligible PC. No talent bonus is added here; use the GM Dock recovery controls for individual bonuses.</p>${recovery.ready?recovery.rows.map(r=>`<label style="display:block"><input type="checkbox" name="recovery" value="${esc(r.actorRef)}" ${r.done||r.blocked?'disabled':''}>${esc(r.name)} ${r.done?`· recovered ${r.recovered}`:r.blocked?'· unavailable':''}</label>`).join(''):`<p>${esc(recovery.reason||'End an encounter first.')}</p>`}<select name="skill"><option value="cool">Cool</option><option value="discipline">Discipline</option></select></details>`;
  const callback=kind=>(_e,_b,d)=>({kind,refs:[...d.element.querySelectorAll('input[name="actor"]:checked')].map(i=>i.value),recovery:[...d.element.querySelectorAll('input[name="recovery"]:checked')].map(i=>i.value),conditionId:d.element.querySelector('[name="condition"]').value,skill:d.element.querySelector('[name="skill"]').value});
  const buttons=[{action:'refresh',label:'Refresh',callback:callback('refresh')},{action:'scope',label:scope==='scene'?'Show world':'Show scene',callback:callback('scope')},{action:'open',label:'Open selected sheets',callback:callback('open')},...(writer?[{action:'add',label:'Add condition',callback:callback('add')},{action:'remove',label:'Remove GM condition',callback:callback('remove')},{action:'recover',label:'Recover selected PCs',callback:callback('recover')}]:[])];
  const choice=await foundry.applications.api.DialogV2.wait({window:{title:'GM Health & Recovery'},position:{width:1000},content,buttons,rejectClose:false});
  if(!choice)return;
  try{
   if(choice.kind==='scope'){scope=scope==='scene'?'world':'scene';continue;}
   if(choice.kind==='refresh')continue;
   if(!game.user?.isGM)return;
   if(choice.kind==='open'){for(const ref of choice.refs)await healthRoster(scene).find(r=>r.ref===ref)?.actor.sheet.render(true);continue;}
   if(globalThis.canvas?.scene?.id!==scene?.id)throw Error('Scene changed. Review the refreshed overview.');
   const count=choice.kind==='recover'?choice.recovery.length:choice.refs.length;
   if(!count)throw Error('Select at least one character.');
   if(!await foundry.applications.api.DialogV2.confirm({window:{title:'Confirm GM update'},content:`<p>${esc(choice.kind)} for ${count} selected character(s)?</p>`,rejectClose:false}))continue;
   if(globalThis.canvas?.scene?.id!==scene?.id)throw Error('Scene changed. Review the refreshed overview.');
   report(choice.kind==='recover'?await recoverHealthBatch(choice.recovery,choice.skill,scene):await applyHealthBatch(choice.refs,{operation:choice.kind,conditionId:choice.conditionId,scene}));
  }catch(e){ui.notifications.warn(e.message);}
 }
}
