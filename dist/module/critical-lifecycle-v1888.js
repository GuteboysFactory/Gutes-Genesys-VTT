import {conditionRules} from '../domain/conditions/index.js';
import {suppressedCriticals} from '../domain/heroic/primary-effects.js';
import {runPatientRecovery} from './recovery-patients-v1887.js';
const SID='genesys-vtt';
const live=actor=>{const ignored=new Set(suppressedCriticals(actor).map(i=>i.id));return (actor.system.criticalInjuries??[]).filter(i=>i.active!==false&&!i.healed&&!ignored.has(i.id));};
const record=actor=>structuredClone(actor.getFlag?.(SID,'criticalRuntime')??{});
const track=actor=>['rival','minion'].includes(actor.system.role)?'wounds':'strain';
export function effectiveCharacteristic(actor,id,value){
 const amount=live(actor).filter(i=>i.secondaryMode==='temporary-characteristic-reduction'&&i.secondaryStatus==='applied'&&i.affectedCharacteristic===id).reduce((n,i)=>n+Number(i.secondaryAmount??1),0);
 return Math.max(0,Number(value)-amount);
}
export function actionStrain(actor){return 2*live(actor).filter(i=>i.total>=91&&i.total<=95).length;}
export function magicStatusModifiers(actor){
 const ignored=new Set(suppressedCriticals(actor).map(i=>`critical:${i.id}`));
 return [...conditionRules((actor.system.conditions??[]).filter(c=>!ignored.has(c.sourceId))).checkModifiers,...criticalRuntimeModifiers(actor)];
}
export function criticalRuntimeModifiers(actor){
 const records=record(actor),ids=new Set(live(actor).map(i=>i.id));
 return Object.entries(records).filter(([id,r])=>ids.has(id)&&r.nextCheck).map(([id,r])=>({id:`critical:${id}:next-check`,...(r.total<=25?{pool:{add:{setback:1}}}:{difficultyDelta:1})}));
}
export function losesNextFreeManeuver(actor){const records=record(actor),ids=new Set(live(actor).map(i=>i.id));return Object.entries(records).some(([id,r])=>ids.has(id)&&r.distractedTurn);}
export function prepareRuleCheckResult(actor,result){
 const prepared=game.genesysRunes?.previewRuneFate?.(actor,result)??{result,patch:{}};
 const records=record(actor),ids=new Set(live(actor).map(i=>i.id));let changed=false;
 for(const [id,r]of Object.entries(records))if(ids.has(id)&&r.nextCheck){r.nextCheck=false;changed=true;}
 if(changed)prepared.patch[`flags.${SID}.criticalRuntime`]=records;
 return prepared;
}
export async function consumeNextCheck(actor){
 const records=record(actor),ids=new Set(live(actor).map(i=>i.id));let changed=false;
 for(const [id,r]of Object.entries(records))if(ids.has(id)&&r.nextCheck){r.nextCheck=false;changed=true;}
 if(changed)await actor.update({[`flags.${SID}.criticalRuntime`]:records});
}
export async function inflicted(actor,injury){
 const records=record(actor);if(records[injury.id])return;
 const total=injury.total,patch={},runtime={total};
 if(total>=6&&total<=10)runtime.nextSlot=true;
 if(total>=131&&total<=140)runtime.bleedBands=Math.floor(Math.max(0,Number(actor.system.wounds.value)-Number(actor.system.wounds.threshold))/5);
 if(total>=141&&total<=150)runtime.deathRound=(game.genesysVtt?.initiative?.sceneState?.(globalThis.canvas?.scene)?.round??0)+1;
 if(total>=21&&total<=25||total>=36&&total<=40)runtime.nextCheck=true;
 if(total>=16&&total<=20)runtime.nextTurn=true;
 if(total<=5||total>=41&&total<=45){const t=track(actor);patch[`system.${t}.value`]=Number(actor.system[t].value)+1;}
 if(total>=41&&total<=45)patch['system.conditions']=[...(actor.system.conditions??[]),{id:`critical-prone:${injury.id}`,conditionId:'prone',active:true,sourceId:`critical:${injury.id}`,durationType:'manual',remaining:0}];
 if(total>=26&&total<=30){const side=actor.system.role==='pc'?'player':'gm';if(game.genesysStoryPoints.snapshot()[side]>0)await game.genesysStoryPoints.spendRule(`critical:${actor.uuid}:${injury.id}`,side);}
 patch[`flags.${SID}.criticalRuntime`]={...records,[injury.id]:runtime};
 patch['system.criticalInjuries']=(actor.system.criticalInjuries??[]).map(i=>i.id===injury.id?{...i,runtimePending:false}:i);
 await actor.update(patch);
}
export async function beginTurn(actor,state,scene){
 if(!actor)return;
 if(!(actor.system.criticalInjuries??[]).length)return;
 for(const injury of actor.system.criticalInjuries??[])if(injury.runtimePending)await inflicted(actor,injury);
 const key=`${scene.id}:${scene.getFlag(SID,'ruleEncounterId')}:${state.round}:${state.turnNumber}:${state.activeActivationId}`;
 if(actor.getFlag(SID,'criticalTurn')?.key===key){await reconcileBleeding(actor);return;}
 const records=record(actor),injuries=live(actor),ids=new Set(injuries.map(i=>i.id));
 for(const [id,r]of Object.entries(records))if(ids.has(id)){if(r.nextTurn){r.distractedTurn=key;r.nextTurn=false;}if(r.nextSlot)r.nextSlot=false;}
 const bleeds=injuries.filter(i=>i.total>=131&&i.total<=140);
 for(const i of bleeds)records[i.id]??={total:i.total,bleedBands:Math.floor(Math.max(0,Number(actor.system.wounds.value)-Number(actor.system.wounds.threshold))/5)};
 const count=bleeds.length;
 const patch={[`flags.${SID}.criticalTurn`]:{key},[`flags.${SID}.criticalRuntime`]:records};
 if(count){const t=track(actor);patch['system.wounds.value']=Math.min(Number(actor.system.wounds.threshold)*2,Number(actor.system.wounds.value)+count+(t==='wounds'?count:0));if(t==='strain')patch['system.strain.value']=Number(actor.system.strain.value)+count;}
 await actor.update(patch);
 await reconcileBleeding(actor);
}
export function slowedDownBlock(actor,state,side){
 const records=record(actor),ids=new Set(live(actor).map(i=>i.id));
 return state.mode==='side-slots'&&Object.entries(records).some(([id,r])=>ids.has(id)&&r.nextSlot)&&(state.slots??[]).filter((s,index)=>s.side===side&&index>=state.activeSlotIndex).length>1;
}
export async function finishTurn(actor,state,scene){
 const records=record(actor);let changed=false;
 for(const r of Object.values(records)){
  if(r.distractedTurn){delete r.distractedTurn;changed=true;}
  if(r.deathRound&&state?.round>=r.deathRound&&state.activeSlotIndex>=(state.slots??[]).length-1&&!r.deathNotified){ui.notifications.warn(`${actor.name}: The End Is Nigh is due after this round's last slot unless healed. GM must resolve death and participant status.`);r.deathNotified=true;changed=true;}
 }
 if(changed)await actor.update({[`flags.${SID}.criticalRuntime`]:records});
}
export async function reconcileBleeding(actor){
 const bands=Math.floor(Math.max(0,Number(actor.system.wounds.value)-Number(actor.system.wounds.threshold))/5);
 for(const injury of live(actor).filter(i=>i.total>=131&&i.total<=140)){
  const previous=record(actor)[injury.id]?.bleedBands;
  if(previous===undefined)continue; // Legacy injuries require their prior history; never invent old damage.
  for(let band=previous+1;band<=bands;band++){
   const source=`bleeding:${injury.id}:${band}`;
   if(!(actor.system.criticalInjuries??[]).some(i=>i.sourceId===source))await (await import('./critical-service.js')).inflictCriticalInjury(actor,{},source);
   const records=record(actor);if(records[injury.id]){records[injury.id].bleedBands=band;await actor.update({[`flags.${SID}.criticalRuntime`]:records});}
  }
 }
}
export async function finishRound(scene,state){
 const refs=new Set((state.entries??[]).map(e=>e.actorRef));
 for(const ref of refs){
  const actor=game.genesysVtt.initiative.resolveActorRef(ref);if(!actor)continue;
  const records=record(actor),ids=new Set(live(actor).map(i=>i.id));let changed=false;
  for(const [id,r]of Object.entries(records))if(ids.has(id)&&r.deathRound&&state.round>=r.deathRound&&!r.deathNotified){ui.notifications.warn(`${actor.name}: The End Is Nigh is due at this round boundary. GM must resolve death and participant status.`);r.deathNotified=true;changed=true;}
  if(changed)await actor.update({[`flags.${SID}.criticalRuntime`]:records});
 }
}
export async function recoverPending(){
 if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');
 const actors=new Map([...game.actors].map(a=>[a.uuid,a]));
 for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)actors.set(token.actor.uuid,token.actor);
 for(const actor of actors.values())await runPatientRecovery(actor,async()=>{for(const injury of actor.system.criticalInjuries??[])if(injury.runtimePending)await inflicted(actor,injury);await reconcileBleeding(actor);});
 ui.notifications.info('Pending Critical Injury effects reconciled.');
}
Hooks.once('ready',()=>{game.genesysCriticalLifecycle={effectiveCharacteristic,actionStrain,criticalRuntimeModifiers,magicStatusModifiers,losesNextFreeManeuver,prepareRuleCheckResult,consumeNextCheck,inflicted,beginTurn,finishTurn,finishRound,recoverPending,slowedDownBlock,reconcileBleeding};});
