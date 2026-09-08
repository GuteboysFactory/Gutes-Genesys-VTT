import {resolveRenewal} from './heroic-renewal-v1855.js';
import {readSceneInitiativeState,writeSceneInitiativeState} from './initiative-service.js';
import {rollNarrativePool} from '../domain/dice/index.js';
import {prepareActorSkillEngineCheck} from './check-ui.js';
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export async function promptRenewal(actor) {
 const scene=canvas.scene;
 const result=await resolveRenewal(actor,{
  scene,isGM:()=>game.user?.isGM&&game.users.activeGM?.id===game.user.id,
  read:()=>readSceneInitiativeState(scene),write:state=>writeSceneInitiativeState(state,scene),
  choose:()=>foundry.applications.api.DialogV2.wait({window:{title:'Renewal · Activation'},content:'<p>Heroic is activated. Optionally roll Cool or Vigilance for a PC initiative slot. This grants no extra turn.</p><p>Cancel leaves Heroic active. Use Renewal on Actions to resolve later if needed.</p>',buttons:[{action:'cool',label:'Cool',callback:()=> 'cool'},{action:'vigilance',label:'Vigilance',callback:()=> 'vigilance'},{action:'cancel',label:'Cancel',default:true,callback:()=>null}],rejectClose:false}),
  roll:skill=>rollNarrativePool(prepareActorSkillEngineCheck(actor,skill,{mode:'standard',difficulty:0}).check.construction.pool)
 });
 if(!result)return false;
 ui.notifications.info(`Renewal: ${result.success} Success, ${result.advantage} Advantage. PC slot added.`);
 try {await foundry.documents.ChatMessage.create({speaker:{alias:actor.name},content:`<p><strong>Renewal</strong> · ${esc(actor.name)} · ${esc(result.skill)}</p><p>${result.success} Success · ${result.advantage} Advantage</p><p>PC initiative slot added for this encounter. No extra turn granted.</p>`});}
 catch {ui.notifications.warn('Renewal slot saved; chat announcement failed. Do not roll again.');}
 return result;
}
