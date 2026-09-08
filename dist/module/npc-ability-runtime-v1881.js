import {talentRank} from './recovery-talents-v1881.js';
const SID='genesys-vtt';
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required for NPC abilities.');}
export async function beginNpcTurn(actor,state,scene){
 authority();
 if(!actor || state.status!=='active' || state.activeActorRef!==actor.uuid || !['rival','nemesis'].includes(actor.system?.role))return false;
 if(!talentRank(actor,'terrinoth-npc:ogre-regeneration'))return false;
 const entry=state.entries.find(e=>e.actorRef===actor.uuid);
 if(!entry || entry.encounterStatus && entry.encounterStatus!=='active')return false;
 const encounterId=String(scene.getFlag(SID,'ruleEncounterId')??'');
 if(!encounterId)throw Error('NPC regeneration needs a tracked encounter.');
 const key=`${state.round}:${state.turnNumber}:${state.activeActivationId}`;
 const old=actor.getFlag(SID,'npcTurnRecovery');
 const completed=old?.encounterId===encounterId&&old.sceneId===scene.id ? old.completed : [];
 if(completed.includes(key))return false;
 const before=Number(actor.system.wounds?.value);
 if(!Number.isSafeInteger(before)||before<0)throw Error('Invalid NPC wounds.');
 authority();
 await actor.update({'system.wounds.value':Math.max(0,before-3),[`flags.${SID}.npcTurnRecovery`]:{encounterId,sceneId:scene.id,completed:[...completed,key],last:{before,after:Math.max(0,before-3)}}});
 return true;
}
Hooks.once('ready',()=>Object.defineProperty(game,'genesysNpcAbilities',{configurable:true,value:Object.freeze({beginTurn:beginNpcTurn})}));
