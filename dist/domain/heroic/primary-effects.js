import { resolveRolledDice } from '../dice/resolver.js';
export const PRIMARY_IDS = ['all-the-facts','connected','foretelling','hard-to-kill','influential','miraculous-recovery','paragon','sixth-sense','signature-weapon','unbowed','unleash'];
export function primaryRank(ability, id) {
 return ability?.active === true && ability.primaryEffectId === `rot-heroic:${id}` ? ({base:1,improved:2,supreme:3}[ability.powerLevel ?? 'base'] ?? 0) : 0;
}
export const damageImmune = ability => primaryRank(ability,'hard-to-kill') === 3;
export const incomingDifficulty = ability => primaryRank(ability,'hard-to-kill') >= 2 ? 1 : 0;
export function recoveryWounds(ability, wounds, activation=false) {
 const rank=primaryRank(ability,'miraculous-recovery');
 if(!rank) return wounds;
 if(!Number.isFinite(wounds)||wounds<0) throw Error('Invalid Wounds value.');
 return activation && rank>=2 ? 0 : Math.max(0,wounds-3);
}
export function suppressedCriticals(actor) {
 const rank=primaryRank(actor?.system?.heroicAbility,'unbowed');
 const selected=actor?.getFlag?.('genesys-vtt','heroicPrimaryConfig')?.criticalId;
 return (actor?.system?.criticalInjuries??[]).filter(row=>rank && row.active!==false && !row.healed &&
  (rank===3 || !(Number(row.total)>=151 || String(row.name).toLowerCase()==='dead')) && (rank>=2 || row.id===selected));
}
export function primaryCheckModifiers(ability,skillId) {
 return primaryRank(ability,'connected')>=2 && ['charm','coercion','deception','leadership','negotiation'].includes(skillId)
  ? [{id:'heroic:connected',priority:10,pool:{downgradeNegative:1}}] : [];
}
/** Removing a die recalculates all cancellation, including Despair's Failure. Never mutate the original roll. */
export function paragonResult(result,ability,{negativeIndex=-1,setbackIndex=-1}={}) {
 const rank=primaryRank(ability,'paragon');
 if(!rank) throw Error('Paragon is not active.');
 const selected=new Set();
 for(const [index,allowed] of [[negativeIndex,rank===3?['difficulty','challenge']:['difficulty']],[setbackIndex,rank>=2?['setback']:[]]]) {
  if(index===-1)continue;
  if(!Number.isInteger(index)||!allowed.includes(result.dice?.[index]?.type))throw Error('Choose an eligible rolled die.');
  selected.add(index);
 }
 const dice=result.dice.filter((_d,i)=>!selected.has(i));
 return {...result,dice,...resolveRolledDice(dice),heroicRemovedDice:[...selected].map(i=>result.dice[i])};
}
export function influentialValues(ability,{characteristic=0,presence=0,cool=0,strain=0,voluntary=false,social=false}={}) {
 const rank=primaryRank(ability,'influential');
 return {bonus:rank&&social?Math.max(0,characteristic):0,criticalRemarkCost:rank>=2&&social?2:4,
  strain:rank===3&&social&&!voluntary?Math.max(0,strain-Math.max(presence,cool)):strain};
}
/** Only data-backed attachment qualities are automatic; descriptive attachment rules remain GM resolved. */
export function signatureWeaponData(ability,config,item,attachment){
 const original=item?.system??{};
 if(!primaryRank(ability,'signature-weapon')||config?.weaponId!==item?.id||!attachment||attachment.type!=='attachment'||config?.attachmentId!==attachment.id)return original;
 if(attachment.system?.installed===true)throw Error('Signature temporary attachment must not already be installed.');
 const qualities=new Map((original.qualities??[]).map(q=>[q.id,{...q}]));
 for(const q of attachment.system?.qualities??[]){
  if(!q?.id||!Number.isFinite(Number(q.rank)))continue;
  const previous=qualities.get(q.id);
  qualities.set(q.id,{...q,rank:Math.max(Number(previous?.rank??0),Number(q.rank))});
 }
 return {...original,qualities:[...qualities.values()]};
}
