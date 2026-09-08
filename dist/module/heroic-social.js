import { primaryRank, influentialValues } from '../domain/heroic/primary-effects.js';
import { prepareActorSkillCheck, findSkillState } from './skill-ui.js';
import { prepareActorRoleDamage } from './adversary-service.js';
const SID='genesys-vtt',locks=new Set();
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export async function resolveInfluential(actor){
 const gm=()=>game.user?.isGM&&game.users?.activeGM?.id===game.user.id;
 if(!gm()||!primaryRank(actor?.system?.heroicAbility,'influential'))throw Error('Active GM and active Influential required.');
 if(game.genesysStoryPoints?.snapshot()?.heroicPending)throw Error('Recover interrupted activation first.');
 if(locks.has(actor.uuid))throw Error('Social effect already open.');
 locks.add(actor.uuid);
 try{
 const activation=actor.getFlag(SID,'heroicTiming')?.activationId;
 const targets=[...new Map([...game.user.targets].map(t=>[t.actor?.uuid,t.actor])).values()].filter(Boolean);
 if(targets.length!==1)throw Error('Target one social opponent.');
 const target=targets[0];
 const data=await foundry.applications.api.DialogV2.wait({window:{title:'Influential · Social strain'},content:`<p>Target: ${esc(target.name)}. Resolve one successful social check. Enter its unique chat message ID to prevent duplicate application.</p><label>Check message ID<input name="checkId" required></label><label>Skill<select name="skill">${['charm','coercion','deception','leadership','negotiation'].map(s=>`<option>${s}</option>`).join('')}</select></label><label>Base strain inflicted<input name="base" type="number" min="0" value="0"></label><label>Unspent Advantage available<input name="advantage" type="number" min="0" value="0"></label><label>Critical remarks to spend<input name="remarks" type="number" min="0" value="0"></label>`,buttons:[{action:'apply',label:'Apply Social Strain',callback:(_e,_b,d)=>Object.fromEntries(['checkId','skill','base','advantage','remarks'].map(k=>[k,d.element.querySelector(`[name="${k}"]`).value]))},{action:'cancel',label:'Cancel',default:true,callback:()=>null}],rejectClose:false});
 if(!data)return false;
 if(!gm()||!primaryRank(actor.system.heroicAbility,'influential')||actor.getFlag(SID,'heroicTiming')?.activationId!==activation)throw Error('Heroic state changed.');
 if(!data.checkId||!game.messages.get(data.checkId))throw Error('Enter the existing check message ID.');
 const counts=['base','advantage','remarks'].map(k=>Number(data[k]));
 if(counts.some(v=>!Number.isInteger(v)||v<0))throw Error('Use non-negative whole numbers.');
 const [base,advantage,remarks]=counts;
 const skill=prepareActorSkillCheck(actor,data.skill);
 const values=influentialValues(actor.system.heroicAbility,{characteristic:skill.characteristicValue,social:true});
 if(remarks*values.criticalRemarkCost>advantage)throw Error('Not enough unspent Advantage for those remarks.');
 const done=target.getFlag(SID,'heroicSocialChecks')??[];
 const key=`${actor.uuid}:${data.checkId}`;
 if(done.includes(key))throw Error('This check has already been applied to this target.');
 const gross=base+values.bonus+remarks*5;
 const strain=influentialValues(target.system.heroicAbility,{social:true,strain:gross,presence:Number(target.system.characteristics?.presence??0),cool:Number(findSkillState(target,'cool')?.rank??0)}).strain;
 await target.update({...prepareActorRoleDamage(target,{strain}).update,[`flags.${SID}.heroicSocialChecks`]:[...done,key]});
 ui.notifications.info(`Applied ${strain} social strain; ${remarks*values.criticalRemarkCost} Advantage spent. Do not spend those symbols again.`);
 return true;
 }finally{locks.delete(actor.uuid);}
}
