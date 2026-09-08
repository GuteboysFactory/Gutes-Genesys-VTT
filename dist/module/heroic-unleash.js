import { primaryRank } from '../domain/heroic/primary-effects.js';
import { useSceneTurnManeuver } from './initiative-service.js';
const SID='genesys-vtt',locks=new Set();
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export async function resolveUnleash(actor,activation=false){
 const gm=()=>game.user?.isGM&&game.users?.activeGM?.id===game.user.id;
 if(!gm())throw Error('Active GM required.');
 if(game.genesysStoryPoints?.snapshot()?.heroicPending)throw Error('Recover interrupted activation first.');
 const rank=primaryRank(actor?.system?.heroicAbility,'unleash');
 if(!rank||activation&&rank!==3)throw Error('Unleash is unavailable.');
 if(locks.has(actor.uuid))throw Error('Unleash is already resolving.');
 locks.add(actor.uuid);
 try{
 const scene=canvas.scene,state=game.genesysVtt.initiative.sceneState(scene),timing=actor.getFlag(SID,'heroicTiming');
 if(!timing?.activationId||timing.sceneId!==scene?.id||timing.encounterId!==scene.getFlag(SID,'ruleEncounterId'))throw Error('Return to the activation encounter.');
 if(!activation&&(state.status!=='active'||state.activeActorRef!==actor.uuid))throw Error('Unleash requires your turn.');
 const key=`${timing.activationId}:${activation?'activation':state.round}`;
 let journal=actor.getFlag(SID,'heroicUnleash')??{};
 if(journal.key===key&&journal.completed)throw Error('Unleash already used for this occurrence.');
 if(journal.key===key&&journal.maneuverPending)throw Error('Maneuver save was interrupted. GM must reconcile the maneuver and heroicUnleash journal before retrying.');
 const tokens=[...game.user.targets].map(t=>t.document).filter(t=>t.parent?.id===scene.id&&t.actor?.system?.role==='minion');
 const targets=[...new Map(tokens.map(t=>[t.actor.uuid,t])).values()];
 if(!targets.length||!activation&&targets.length!==1)throw Error(activation?'Target all minions within Short range.':'Target exactly one minion group within Short range.');
 if(journal.key===key&&JSON.stringify(journal.targets)!==JSON.stringify(targets.map(t=>t.actor.uuid)))throw Error('Retry with the same targets.');
 const positions=targets.map(t=>`${t.x}:${t.y}:${t.elevation}`);
 const yes=await foundry.applications.api.DialogV2.confirm({window:{title:'Unleash'},content:`<p>Confirm ${targets.map(t=>esc(t.name)).join(', ')} ${activation?'are ALL minions':'is the minion group'} within Short range.</p><p>${!activation&&rank===1?'Consumes one maneuver.':'Incidental.'} Defeat these minions?</p>`});
 if(!yes)return false;
 if(canvas.scene?.id!==scene.id||!gm()||!primaryRank(actor.system.heroicAbility,'unleash')||actor.getFlag(SID,'heroicTiming')?.activationId!==timing.activationId||JSON.stringify(game.genesysVtt.initiative.sceneState(scene))!==JSON.stringify(state)||targets.some((t,i)=>!scene.tokens.get(t.id)||`${t.x}:${t.y}:${t.elevation}`!==positions[i]))throw Error('State changed; review targets again.');
 if(journal.key!==key){journal={key,targets:targets.map(t=>t.actor.uuid),maneuverPending:!activation&&rank===1};await actor.update({[`flags.${SID}.heroicUnleash`]:journal});}
 if(journal.maneuverPending){
  await useSceneTurnManeuver(actor,scene);
  journal={...journal,maneuverPending:false};
  await actor.update({[`flags.${SID}.heroicUnleash`]:journal});
 }
 for(const token of targets){
  const target=token.actor,done=target.getFlag(SID,'heroicUnleashHits')??[];
  const hit=`${actor.uuid}:${key}`;
  if(done.includes(hit))continue;
  const members=Number(target.system.minionGroup?.members),threshold=Number(target.system.minionGroup?.memberWoundThreshold);
  if(!Number.isInteger(members)||members<1||!Number.isFinite(threshold)||threshold<1)throw Error('Invalid minion group; correct it and retry.');
  await target.update({'system.wounds.value':Math.max(Number(target.system.wounds?.value??0),members*threshold+1),'system.minionGroup.casualties':members,[`flags.${SID}.heroicUnleashHits`]:[...done,hit]});
 }
 await actor.update({[`flags.${SID}.heroicUnleash`]:{...journal,completed:true}});
 ui.notifications.info('Unleash resolved.');
 return true;
 }finally{locks.delete(actor.uuid);}
}
