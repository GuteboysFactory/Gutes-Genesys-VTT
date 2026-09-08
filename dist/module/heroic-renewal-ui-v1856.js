import {resolveSceneRenewal} from './initiative-service.js';
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export async function promptRenewal(actor) {
 const scene=canvas.scene;
 if (!game.user?.isGM || game.users.activeGM?.id !== game.user.id) throw Error('Active GM required.');
 const activationId=actor.getFlag('genesys-vtt','heroicTiming')?.activationId;
 const saved=actor.getFlag('genesys-vtt','heroicRenewalRoll');
 const skill=saved?.activationId===activationId ? saved.skill : await foundry.applications.api.DialogV2.wait({window:{title:'Renewal · Activation'},content:'<p>Optionally roll Cool or Vigilance for a PC initiative slot. This grants no extra turn. Cancel leaves Heroic active.</p>',buttons:[{action:'cool',label:'Cool',callback:()=> 'cool'},{action:'vigilance',label:'Vigilance',callback:()=> 'vigilance'},{action:'cancel',label:'Cancel',default:true,callback:()=>null}],rejectClose:false});
 if(!skill)return false;
 const result=await resolveSceneRenewal(actor,skill,activationId,scene);
 if(!result)return false;
 ui.notifications.info(`Renewal: ${result.success} Success, ${result.advantage} Advantage. PC slot added.`);
 try {await foundry.documents.ChatMessage.create({speaker:{alias:actor.name},content:`<p><strong>Renewal</strong> · ${esc(actor.name)} · ${esc(result.skill)}</p><p>${result.success} Success · ${result.advantage} Advantage</p><p>PC initiative slot added for this encounter. No extra turn granted.</p>`});}
 catch {ui.notifications.warn('Renewal slot saved; chat announcement failed. Do not roll again.');}
 return result;
}
