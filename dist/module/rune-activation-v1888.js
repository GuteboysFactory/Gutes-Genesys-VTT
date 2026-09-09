import {damageImmune} from '../domain/heroic/primary-effects.js';
import {normalizeMinionGroup} from '../domain/adversaries/index.js';
import {RUNE_RULES} from '../domain/runes/runes.js';
import {runPatientRecovery} from './recovery-patients-v1887.js';
import {isWinded} from '../domain/criticals/strain-restriction.js';
import {turnKey} from './consumables-v1888.js';
const SID='genesys-vtt';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');}
function runeId(item){return item?.getFlag(SID,'contentId')??String(item?.system?.provenance?.sourceId??'').replace(/^rot-equipment(?:-expansion)?:/,'');}
function state(actor){return actor.getFlag(SID,'runeActivation')??{revision:0,uses:{}};}
const resolve=ref=>game.genesysVtt.initiative.resolveActorRef(ref);
const strainTrack=actor=>['rival','minion'].includes(actor.system.role)?'wounds':'strain';
function resource(actor,track){const value=Number(actor.system[track]?.value);if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid rune resource.');return value;}
function roll(actor,skill,difficulty){const result=game.genesysVtt.dice.roll(game.genesysVtt.checks.prepareActorSkill(actor,skill,{mode:'standard',difficulty}).check.construction.pool);return game.genesysCriticalLifecycle?.prepareRuleCheckResult?.(actor,result)??{result,patch:{}};}
export function activateRune(actor,options,scene){return runPatientRecovery(actor,async()=>{
 authority();let record=structuredClone(state(actor));
 if(!record.pending){
  if(options?.confirmed!==true||options.revision!==record.revision)throw Error('Confirm current rune activation and timing.');
  const item=actor.items.get(options.itemId),id=runeId(item),rule=RUNE_RULES[id];
  if(item?.type!=='implement'||!rule||!item.system.tags?.includes('runebound-shard'))throw Error('Choose an owned runebound shard.');
  const encounter=scene.getFlag(SID,'ruleEncounterId'),current=game.genesysVtt.initiative.sceneState(scene);
  if(!encounter||current.status!=='active')throw Error('Use a tracked encounter for rune timing; narrative activations can be adjudicated by the GM outside it.');
  if(rule.once&&record.uses[`${scene.id}:${encounter}:${id}`])throw Error('This rune was already used this encounter.');
  if(rule.strain&&isWinded(actor))throw Error('Winded blocks this voluntary strain cost.');
  if(rule.strain&&actor.system.role==='minion')throw Error('Minions cannot voluntarily suffer strain.');
  if(rule.strain&&(!Number.isSafeInteger(Number(actor.system[strainTrack(actor)].threshold))||resource(actor,strainTrack(actor))+rule.strain>Number(actor.system[strainTrack(actor)].threshold)))throw Error('Rune cost would exceed the resource threshold.');
  const targets=[...new Set(options.targetRefs??[])].map(resolve);if(targets.some(t=>!t||t.type!=='character'))throw Error('A selected target is unavailable.');
  if(['stasis-rune','rune-of-misery'].includes(id)&&targets.length!==1)throw Error('Choose exactly one short-range target.');
  const job={id:foundry.utils.randomID(),runeId:id,itemId:item.id,encounter:`${scene.id}:${encounter}`,turn:turnKey(current,scene),round:current.round,targets:targets.map(t=>t.uuid),effects:[],weapon:rule.weapon??null,rolls:[],notes:rule.activation??'Temporary ranged weapon until end of turn'};
  const rows=new Map();
  const effect=t=>{if(!rows.has(t.uuid))rows.set(t.uuid,{actorRef:t.uuid,woundsDelta:0,strainDelta:0,conditions:[]});return rows.get(t.uuid);};
  if(rule.strain)effect(actor).strainDelta+=rule.strain;
  if(id==='wanderers-stone'&&!['rival','minion'].includes(actor.system.role))effect(actor).strainDelta-=Math.min(5,resource(actor,'strain'));
  if(id==='rune-of-misery')effect(targets[0]).conditions.push({conditionId:'disoriented',rounds:3});
  if(id==='stasis-rune')effect(targets[0]).conditions.push({conditionId:'staggered',nextTurn:true},{conditionId:'immobilized',nextTurn:true});
  if(id==='soulstone-rune')for(const target of targets){const completed=roll(target,'discipline',2),result=completed.result;effect(target).checkPatch=completed.patch;job.rolls.push({actorRef:target.uuid,result});if(Number(result.net.success)<=0){effect(target).strainDelta+=3;effect(target).conditions.push({conditionId:'staggered',rounds:1});effect(actor).woundsDelta--;}}
  if(id==='ynfernael-rune'){
   const amount=Number(options.wounds);if(!Number.isSafeInteger(amount)||amount<0||amount>Number(actor.system.wounds.threshold))throw Error('Choose wounds from zero to wound threshold.');
   effect(actor).woundsDelta+=amount;for(const target of targets)effect(target).woundsDelta+=amount;
  }
  if(id==='vision-rune'||id==='teleportation-rune'&&options.unseen===true){const completed=roll(actor,id==='vision-rune'?'perception':'vigilance',2);effect(actor).checkPatch=completed.patch;job.rolls.push({actorRef:actor.uuid,result:completed.result});}
  if(id==='rune-of-fate')job.storyPoint=true;
  for(const row of rows.values())if(row.actorRef!==actor.uuid&&damageImmune(resolve(row.actorRef).system.heroicAbility)){row.woundsDelta=0;row.strainDelta=0;}
  job.effects=[...rows.values()].map(row=>{const target=resolve(row.actorRef),track=strainTrack(target),patch={};if(row.woundsDelta)patch['system.wounds.value']=Math.max(0,resource(target,'wounds')+row.woundsDelta+(track==='wounds'?row.strainDelta:0));else if(track==='wounds'&&row.strainDelta)patch['system.wounds.value']=resource(target,'wounds')+row.strainDelta;if(track==='strain'&&row.strainDelta)patch['system.strain.value']=Math.max(0,resource(target,'strain')+row.strainDelta);if(patch['system.wounds.value']!==undefined){const threshold=target.system.role==='minion'?normalizeMinionGroup(target.system.minionGroup).groupWoundThreshold:Number(target.system.wounds.threshold);patch['system.wounds.value']=Math.min(threshold*2,patch['system.wounds.value']);}
  return {...row,patch,before:Object.fromEntries(Object.keys(patch).map(k=>[k,resource(target,k.split('.')[1])]))};});
  record.pending=job;authority();await actor.update({[`flags.${SID}.runeActivation`]:record});
 }
 const job=record.pending;
 if(job.storyPoint)await game.genesysStoryPoints.spendRule(`rune:${actor.uuid}:${job.id}`,'player');
 for(const row of job.effects){
  const target=resolve(row.actorRef);if(!target)throw Error('A committed rune target is missing; restore it to resume.');
  const receipts=target.getFlag(SID,'runeReceipts')??[];if(receipts.includes(job.id)){await finishRuneHarm(target,row,job);continue;}
  for(const [k,value]of Object.entries(row.before))if(resource(target,k.split('.')[1])!==value)throw Error('Target resource changed. Reconcile the saved rune result before retrying.');
  const conditions=[...(target.system.conditions??[])],durations=[...(target.getFlag(SID,'runeDurations')??[])];
  row.conditions.forEach((c,index)=>{const cid=`rune:${job.id}:${index}`;conditions.push({id:cid,conditionId:c.conditionId,sourceId:`rune:${job.id}`,active:true,durationType:'manual',remaining:0,createdAt:Date.now()});durations.push({id:cid,sceneId:scene.id,encounter:job.encounter,appliedTurn:job.turn,...(c.rounds?{expiresRound:job.round+c.rounds}:{nextTurn:true})});});
  if(target.system.role==='minion'&&row.patch['system.wounds.value']!==undefined)row.patch['system.minionGroup.casualties']=normalizeMinionGroup({...target.system.minionGroup,wounds:row.patch['system.wounds.value']}).casualties;
  authority();await target.update({...row.checkPatch,...row.patch,'system.conditions':conditions,[`flags.${SID}.runeDurations`]:durations,[`flags.${SID}.runeReceipts`]:[...receipts,job.id]});
  await finishRuneHarm(target,row,job);
 }
 if(job.weapon&&! [...actor.items].some(i=>i.getFlag(SID,'runeWeapon')?.jobId===job.id)){
  authority();await actor.createEmbeddedDocuments('Item',[{name:`${actor.items.get(job.itemId)?.name??'Rune'} · Activated`,type:'weapon',system:{...job.weapon,equipped:true,encumbrance:0,hardPoints:0,notes:'Activated runebound shard. Uses current skill/characteristic; expires at end of turn.'},flags:{[SID]:{runeWeapon:{jobId:job.id,sourceItemId:job.itemId,sceneId:scene.id,turn:job.turn}}}}]);
 }
 record={...record,pending:null,revision:record.revision+1,last:job,uses:{...record.uses,[`${job.encounter}:${job.runeId}`]:true}};
 const patch={[`flags.${SID}.runeActivation`]:record};if(job.storyPoint)patch[`flags.${SID}.runeFate`]={id:job.id,pending:true};
 authority();await actor.update(patch);return job;
});}
async function finishRuneHarm(target,row,job){
 const threshold=Number(target.system.wounds.threshold),source=`rune:${job.id}:threshold`;
 if(target.system.role==='pc'&&row.before['system.wounds.value']<=threshold&&row.patch['system.wounds.value']>threshold&&!(target.system.criticalInjuries??[]).some(i=>i.sourceId===source))await game.genesysCombatRuntime.inflictCriticalInjury(target,{},source);
 for(const injury of target.system.criticalInjuries??[])if(injury.runtimePending)await game.genesysCriticalLifecycle?.inflicted?.(target,injury);
 await game.genesysCriticalLifecycle?.reconcileBleeding?.(target);
}
export function beginRuneTurn(actor,current,scene){return runPatientRecovery(actor,async()=>{
 if(!actor)return;authority();const durations=actor.getFlag(SID,'runeDurations')??[];
 const ids=new Set(durations.filter(d=>d.sceneId===scene.id&&d.expiresRound&&current.round>=d.expiresRound).map(d=>d.id));
 if(ids.size)await actor.update({'system.conditions':(actor.system.conditions??[]).filter(c=>!ids.has(c.id)),[`flags.${SID}.runeDurations`]:durations.filter(d=>!ids.has(d.id))});
});}
export function previewRuneFate(actor,result){
 const fate=actor?.getFlag?.(SID,'runeFate');if(!fate?.pending)return {result,patch:{}};
 const next=structuredClone(result),net=next.net;
 const margin=Number(net.success??0)-Number(net.failure??0)-1;
 net.success=Math.max(0,margin);net.failure=Math.max(0,-margin);net.despair=Number(net.despair??0)+1;
 if(next.raw){next.raw.failure=Number(next.raw.failure??0)+1;next.raw.despair=Number(next.raw.despair??0)+1;}
 next.successMargin=margin;next.succeeded=net.success>0;
 next.runeFate=fate.id;
 return {result:next,patch:{[`flags.${SID}.runeFate`]:{...fate,pending:false,result:next}}};
}
export async function applyRuneFate(actor,result){
 const prepared=previewRuneFate(actor,result);if(Object.keys(prepared.patch).length)await actor.update(prepared.patch);return prepared.result;
}
export function terrorRuneImmune(actor){return [...(actor?.items??[])].some(i=>i.type==='implement'&&runeId(i)==='terror-rune');}
export function finishRuneTurn(actor,current,scene){return runPatientRecovery(actor,async()=>{
 authority();const key=turnKey(current,scene),durations=actor.getFlag(SID,'runeDurations')??[];
 const expired=durations.filter(d=>d.sceneId===scene.id&&(d.nextTurn?d.appliedTurn!==key:current.round>=d.expiresRound));
 if(expired.length){const ids=new Set(expired.map(d=>d.id));await actor.update({'system.conditions':(actor.system.conditions??[]).filter(c=>!ids.has(c.id)),[`flags.${SID}.runeDurations`]:durations.filter(d=>!ids.has(d.id))});}
 const weapons=[...actor.items].filter(i=>i.getFlag(SID,'runeWeapon')?.sceneId===scene.id).map(i=>i.id);if(weapons.length){authority();await actor.deleteEmbeddedDocuments('Item',weapons);}
});}
export async function openRunes(){
 authority();const scene=canvas.scene;if(!scene)throw Error('Open a scene first.');const actors=[...game.actors].filter(a=>a.type==='character');
 const choice=await foundry.applications.api.DialogV2.wait({window:{title:'Runebound Shards'},content:`<label>Bearer<select name="actor">${actors.map((a,i)=>`<option value="${i}">${esc(a.name)}</option>`).join('')}</select></label>`,buttons:[{action:'open',label:'Continue',callback:(_e,_b,d)=>actors[Number(d.element.querySelector('[name=actor]').value)]},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});if(!choice)return;const actor=choice,record=state(actor);
 if(record.pending){await activateRune(actor,{},scene);ui.notifications.info('Rune activation recovered.');return;}
 const items=[...actor.items].filter(i=>i.type==='implement'&&RUNE_RULES[runeId(i)]);
 const targets=[...scene.tokens].filter(t=>t.actor);
 const selection=await foundry.applications.api.DialogV2.wait({window:{title:'Activate a shard · no Runes training required'},content:`<label>Rune<select name="item">${items.map(i=>`<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('')}</select></label>${items.map(i=>{const r=RUNE_RULES[runeId(i)];return `<p><strong>${esc(i.name)}</strong> · ${r.timing??'maneuver'}${r.strain?` · ${r.strain} strain`:''} · ${esc(r.activation??'Temporary ranged weapon through end of turn')}. RoT p.${r.page}.</p>`;}).join('')}<p>Select all targets required by the rune, including allies where applicable:</p>${targets.map(t=>`<label><input type="checkbox" name="target" value="${esc(t.actor.uuid)}">${esc(t.name)}</label>`).join('')}<label>Ynfernael wounds<input type="number" name="wounds" min="0" value="0"></label><label><input type="checkbox" name="unseen">Teleport to previously visited unseen destination</label><label><input type="checkbox" name="confirmed">I confirm activation timing/action or maneuver, range and complete target selection. I resolve remaining narrative effects and symbol spends.</label>`,buttons:[{action:'activate',label:'Activate',callback:(_e,_b,d)=>({itemId:d.element.querySelector('[name=item]').value,targetRefs:[...d.element.querySelectorAll('[name=target]:checked')].map(e=>e.value),wounds:Number(d.element.querySelector('[name=wounds]').value),unseen:d.element.querySelector('[name=unseen]').checked,confirmed:d.element.querySelector('[name=confirmed]').checked,revision:record.revision})},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
 if(selection){const result=await activateRune(actor,selection,scene);await foundry.documents.ChatMessage.create({speaker:{alias:actor.name},content:`<p>${esc(result.runeId)}: ${esc(result.notes)}</p>${result.rolls.map(r=>`<p>${esc(resolve(r.actorRef)?.name)}: ${esc(JSON.stringify(r.result.net))}</p>`).join('')}`});}
}
Hooks.once('ready',()=>{game.genesysRunes={openRunes,activateRune,previewRuneFate,applyRuneFate,terrorRuneImmune,beginTurn:beginRuneTurn,finishTurn:finishRuneTurn};});
