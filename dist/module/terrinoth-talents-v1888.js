import {talentRank} from './recovery-talents-v1881.js';
import {addActorCondition} from './condition-service.js';
async function gmConfirm(title,content){
 const config={window:{title},content,buttons:[{action:'yes',label:'Apply',callback:()=>true},{action:'no',label:'Skip',callback:()=>false}],rejectClose:false};
 const D=foundry.applications.api.DialogV2,gm=game.users.activeGM;
 if(!gm)return false;
 return gm.id===game.user.id?D.wait(config):typeof D.query==='function'?D.query(gm,'wait',config):false;
}
export async function dungeoneerResult(actor,skillId,result){
 const rank=talentRank(actor,'terrinoth-talent:dungeoneer');
 if(!rank||!['perception','vigilance','knowledge-adventuring'].includes(skillId)||!(result.net.threat>0))return result;
 if(!await gmConfirm('Dungeoneer','<p>Does this check notice, identify or avoid a threat in a cavern, subterranean ruin or similar location? Cancel uncanceled Threat up to Dungeoneer ranks.</p>'))return result;
 const next=structuredClone(result),amount=Math.min(rank,next.net.threat);next.net.threat-=amount;next.advantageMargin=Number(next.net.advantage??0)-next.net.threat;next.dungeoneerCancelled=amount;return next;
}
export async function impalingStrike(attacker,target,state){
 if(!state.hitProfile?.melee||!talentRank(attacker,'terrinoth-talent:impaling-strike'))return;
 if(!await gmConfirm('Impaling Strike','<p>A melee Critical Injury was inflicted. Also immobilize the target until the end of its next turn?</p>'))return;
 const current=game.genesysVtt.initiative.sceneState(canvas.scene);
 await addActorCondition(target,'immobilized',{sourceId:`impaling:${state.id}`,durationType:'turns',remaining:current.activeActorRef===target.uuid?2:1});
}
Hooks.once('ready',()=>{game.genesysTerrinothTalents={dungeoneerResult,impalingStrike};});
