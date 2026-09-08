import { PRIMARY_IDS, primaryRank, paragonResult } from '../domain/heroic/primary-effects.js';
const SID='genesys-vtt';
const locks=new Set();
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const guides={
 'all-the-facts':['Learn one important fact on each of your turns about something observable or relevant.','Upgrade checks related to the information once.','Each fact grants one temporary Story Point, available to any player until session end. Spending removes it without adding a GM point.'],
 connected:['Before activation, agree an NPC, an existing relationship and a favor with the GM. An impossible connection costs no points or use. The favor cannot require murder, mortal danger or obvious ruin.','Social checks downgrade difficulty once.','As an out-of-turn incidental, force an intelligent attacker to choose another target.'],
 foretelling:['Ask the GM one yes/no question per round; the GM answers truthfully.','Reroll one check related to a question while active.','Once while active, roll an identical pool to an NPC check; you may replace their result.'],
 'hard-to-kill':['Gain +4 soak.','Increase incoming combat difficulty by one.','Reduce damage suffered to zero. This does not waive voluntary strain costs or remove Critical Injuries.'],
 influential:['In social encounters, add the linked characteristic to inflicted strain, or add that many Successes if one check resolves the encounter.','A critical remark costs two Advantage and inflicts five strain; multiple remarks are allowed.','Reduce involuntary social strain by the higher of Presence and Cool ranks.'],
 'miraculous-recovery':['Heal three wounds on activation and at the start of your turn each round.','Heal all current wounds on activation instead.','Heal one Critical Injury on activation.'],
 paragon:['Choose a skill. After rolling it and before resolution, optionally remove one Difficulty die.','You may also remove one Setback die.','You may choose a Challenge die instead of the Difficulty die.'],
 'sixth-sense':['Agree the type of entity you perceive. Communicate emotions/impressions and gain one encounter-relevant fact on activation.','Exchange simple ideas and gain a second fact relevant to the session.','Converse fully and gain a third fact relevant to the adventure/campaign.'],
 'signature-weapon':['Choose the signature profile and Dwarven, Elven or Steel craftsmanship with the GM. Bind one weapon and one temporary attachment; the attachment applies while active without a hard-point cost.','Choose permanent Reinforced or ancient craftsmanship.','Permanently add two hard points and one free attachment of rarity nine or less within capacity.'],
 unbowed:['Choose one Critical Injury other than Dead. Ignore its effects and its +10 critical modifier while active. You may activate out of turn when injured.','Ignore all Critical Injuries except Dead.','Also ignore Dead while active. Death resumes on expiry unless that injury was removed.'],
 unleash:['On your turn, once per round, spend a maneuver to defeat one minion group within Short range.','Use an incidental instead of the maneuver.','On activation, immediately defeat all minions within Short range.']
};
export function primaryGuide(ability) {
 const id=ability?.primaryEffectId?.replace('rot-heroic:','');
 const rank=({base:1,improved:2,supreme:3}[ability?.powerLevel??'base']??1);
 return (guides[id]??[]).slice(0,rank);
}
function requireGM(actor) {
 if(!game.user?.isGM || game.users?.activeGM?.id!==game.user.id)throw Error('The active GM resolves Heroic effects.');
 if(game.genesysStoryPoints?.snapshot()?.heroicPending)throw Error('Recover interrupted activation first.');
 if(!actor?.system?.heroicAbility?.active)throw Error('Heroic Ability is not active.');
}
async function form(title,content,fields,label='Save') {
 return foundry.applications.api.DialogV2.wait({window:{title},content,buttons:[{action:'save',label,callback:(_e,_b,d)=>Object.fromEntries(fields.map(name=>[name,d.element.querySelector(`[name="${name}"]`)?.value??'']))},{action:'cancel',label:'Cancel',default:true,callback:()=>null}],rejectClose:false});
}
export async function configurePrimary(actor) {
 if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('The active GM configures Heroic effects.');
 if(actor.system?.heroicAbility?.active)throw Error('End the ability before changing its configuration.');
 const before=JSON.stringify(actor.system.heroicAbility);
 const old=actor.getFlag(SID,'heroicPrimaryConfig')??{};
 const data=await form('Heroic · Configuration',`<label>Paragon skill ID<input name="skillId" value="${esc(old.skillId)}"></label><label>Sixth Sense entity type<input name="entity" value="${esc(old.entity)}"></label><label>Signature Weapon Item ID<input name="weaponId" value="${esc(old.weaponId)}"></label><label>Temporary attachment Item ID<input name="attachmentId" value="${esc(old.attachmentId)}"></label><label>Signature attachment / craftsmanship choices<textarea name="weaponNotes">${esc(old.weaponNotes)}</textarea></label><p>Weapon choices are recorded here. Apply the agreed profile, craftsmanship and permanent upgrades on the weapon Item. While active, the chosen temporary attachment’s quality entries are applied automatically to standard weapon attacks. Other attachment rules require GM resolution.</p>`,['skillId','entity','weaponId','attachmentId','weaponNotes']);
 if(!data)return false;
 if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id||JSON.stringify(actor.system.heroicAbility)!==before||JSON.stringify(actor.getFlag(SID,'heroicPrimaryConfig')??{})!==JSON.stringify(old))throw Error('Heroic state changed; reopen configuration.');
 if(data.attachmentId && actor.items?.get(data.attachmentId)?.type!=='attachment')throw Error('Choose an attachment owned by this character.');
 if(data.skillId && !(await import('./skills-service.js')).getActorSkillDefinitions(actor).some(row=>row.id===data.skillId))throw Error('Choose a valid skill ID for this character.');
 if(data.weaponId && actor.items?.get(data.weaponId)?.type!=='weapon')throw Error('Choose a weapon owned by this character.');
 await actor.update({[`flags.${SID}.heroicPrimaryConfig`]:{...old,...data}});
 return true;
}
/** Connected is decided BEFORE the transaction: cancellation cannot charge SP/uses. */
export async function approveConnection(actor) {
 return form('Connected · Agree the favor','<label>NPC and existing relationship<textarea name="relationship" required></textarea></label><label>Favor<textarea name="favor" required></textarea></label><p>Reject an impossible connection by cancelling. No Story Points or use will be spent.</p>',['relationship','favor'],'Approve Connection');
}
export async function resolvePrimary(actor) {
 requireGM(actor);
 if(locks.has(actor.uuid))throw Error('Heroic resolution already open.');
 locks.add(actor.uuid);
 try {
  const ability=actor.system.heroicAbility;
  const id=ability.primaryEffectId?.replace('rot-heroic:','');
  if(!PRIMARY_IDS.includes(id))throw Error('No supported primary selected.');
  const timing=actor.getFlag(SID,'heroicTiming')??{};
  if(!timing.activationId)throw Error('Activate the Heroic Ability first.');
  const rank=primaryRank(ability,id);
  const saved=actor.getFlag(SID,'heroicPrimaryJournal')??{};
  const journal=saved.activationId===timing.activationId?saved:{activationId:timing.activationId,entries:[]};
  const state=game.genesysVtt?.initiative?.sceneState(canvas.scene);
  const round=`${canvas.scene?.id}:${canvas.scene?.getFlag(SID,'ruleEncounterId')}:${state?.round}`;
  const turn=`${round}:${state?.turnNumber}:${state?.activeActivationId}`;
  const key=id==='all-the-facts'?turn:id==='foretelling'?round:'activation';
  const instructions=primaryGuide(ability).map((line,i)=>`<p><strong>${['Base','Improved','Supreme'][i]}</strong> · ${esc(line)}</p>`).join('');
  const entries=journal.entries??[];
  const history=entries.map(row=>`<p>${esc(row.note)}</p>`).join('');
  let extra='', label='Record GM Resolution';
  if(id==='unbowed' && rank===1)extra=`<label>Ignore injury<select name="criticalId">${(actor.system.criticalInjuries??[]).filter(r=>(timing.activationCriticalIds??[]).includes(r.id)&&r.active!==false&&!r.healed&&Number(r.total)<151&&r.name!=='Dead').map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label>`;
  if(id==='miraculous-recovery'&&rank===3){extra=`<label>Heal injury<select name="criticalId">${(actor.system.criticalInjuries??[]).filter(r=>(timing.activationCriticalIds??[]).includes(r.id)&&r.active!==false&&!r.healed).map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label>`;label='Heal Selected Injury';}
  const data=await form(`Heroic · ${ability.primaryEffectLabel||id}`,`${instructions}${history}${extra}<label>GM resolution / information<textarea name="note" required maxlength="2000"></textarea></label>`,['note','criticalId'],label);
  if(!data)return false;
  requireGM(actor);
  if(JSON.stringify(actor.getFlag(SID,'heroicTiming')??{})!==JSON.stringify(timing)||JSON.stringify(actor.getFlag(SID,'heroicPrimaryJournal')??{})!==JSON.stringify(saved))throw Error('Heroic state changed; reopen resolution.');
  const now=game.genesysVtt?.initiative?.sceneState(canvas.scene);
  if(JSON.stringify(now)!==JSON.stringify(state))throw Error('Turn changed; reopen resolution.');
  if(!data.note.trim())throw Error('Record the GM resolution.');
  if(['all-the-facts','foretelling','sixth-sense','miraculous-recovery'].includes(id)&&entries.some(row=>row.key===key))throw Error('This occurrence has already been resolved.');
  if(id==='all-the-facts' && (state?.status!=='active'||state.activeActorRef!==actor.uuid))throw Error('All the Facts requires the owner’s turn.');
  if(id==='foretelling' && state?.status!=='active')throw Error('Start an encounter to track rounds.');
  const update={};
  if(id==='all-the-facts'&&rank===3){
   const ledger=actor.getFlag(SID,'heroicTemporaryPoints')??[];
   update[`flags.${SID}.heroicTemporaryPoints`]=[...ledger,{id:`${timing.activationId}:${key}`,fact:data.note.trim(),spent:false}];
  }
  if(id==='unbowed'&&rank===1){
   if(!(timing.activationCriticalIds??[]).includes(data.criticalId)||!(actor.system.criticalInjuries??[]).some(r=>r.id===data.criticalId&&Number(r.total)<151&&r.active!==false&&!r.healed))throw Error('Choose an eligible injury.');
   if(entries.length)throw Error('The injury was already selected for this activation.');
   update[`flags.${SID}.heroicPrimaryConfig`]={...(actor.getFlag(SID,'heroicPrimaryConfig')??{}),criticalId:data.criticalId};
  }
  if(id==='miraculous-recovery'&&rank===3){
   if(!(timing.activationCriticalIds??[]).includes(data.criticalId)||!(actor.system.criticalInjuries??[]).some(r=>r.id===data.criticalId&&r.active!==false&&!r.healed))throw Error('Choose an existing injury.');
   update['system.criticalInjuries']=actor.system.criticalInjuries.filter(r=>r.id!==data.criticalId);
   update['system.conditions']=(actor.system.conditions??[]).filter(r=>r.sourceId!==`critical:${data.criticalId}`);
  }
  update[`flags.${SID}.heroicPrimaryJournal`]={...journal,entries:[...entries,{key,note:data.note.trim(),at:Date.now(),userId:game.user.id}]};
  await actor.update(update);
  try {await foundry.documents.ChatMessage.create({speaker:{alias:actor.name},content:`<p><strong>${esc(ability.primaryEffectLabel||id)}</strong></p><p>${esc(data.note)}</p>`});}catch{ui.notifications.warn('Resolution saved. Chat announcement failed.');}
  return true;
 }finally{locks.delete(actor.uuid);}
}
export async function applyParagon(actor,skillId,result) {
 const ability=actor?.system?.heroicAbility;
 if(!primaryRank(ability,'paragon')||actor.getFlag(SID,'heroicPrimaryConfig')?.skillId!==skillId)return result;
 const rank=primaryRank(ability,'paragon');
 const options=types=>'<option value="-1">Keep all</option>'+result.dice.map((die,i)=>types.includes(die.type)?`<option value="${i}">${esc(die.type)} ${i+1}: ${esc(JSON.stringify(die.symbols))}</option>`:'').join('');
 const data=await form('Paragon · Choose dice before resolution',`<label>Remove die<select name="negativeIndex">${options(rank===3?['difficulty','challenge']:['difficulty'])}</select></label>${rank>=2?`<label>Remove Setback<select name="setbackIndex">${options(['setback'])}</select></label>`:''}`,['negativeIndex','setbackIndex'],'Resolve Roll');
 if(!data)return result;
 if(!primaryRank(actor.system.heroicAbility,'paragon'))throw Error('Paragon expired before resolution.');
 return paragonResult(result,ability,{negativeIndex:Number(data.negativeIndex),setbackIndex:data.setbackIndex===''?-1:Number(data.setbackIndex)});
}
export async function spendTemporaryPoint(actor){
 if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Ask the active GM to spend the temporary point.');
 if(locks.has(actor.uuid))throw Error('Heroic resolution already open.');
 locks.add(actor.uuid);
 try{
 const ledger=actor.getFlag(SID,'heroicTemporaryPoints')??[];
 const available=ledger.find(row=>!row.spent);
 if(!available)throw Error('No temporary Story Points remain.');
 const data=await form('Spend temporary Story Point','<p>Any player may benefit. Explain how the learned information helps. Resolve the chosen Story Point benefit with the GM; the point will be removed without adding a GM point.</p><label>Player and benefit<textarea name="benefit" required></textarea></label>',['benefit'],'Spend Point');
 if(!data)return false;
 if(!data.benefit.trim())throw Error('Describe the benefit.');
 if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id||JSON.stringify(actor.getFlag(SID,'heroicTemporaryPoints')??[])!==JSON.stringify(ledger))throw Error('State changed; reopen the spend.');
 await actor.update({[`flags.${SID}.heroicTemporaryPoints`]:ledger.map(row=>row.id===available.id?{...row,spent:true,benefit:data.benefit}:row)});
 return true;
 }finally{locks.delete(actor.uuid);}
}
export async function preparePrimaryPool(actor,pool){
 if(primaryRank(actor?.system?.heroicAbility,'all-the-facts')<2)return pool;
 const timing=actor.getFlag(SID,'heroicTiming');
 const journal=actor.getFlag(SID,'heroicPrimaryJournal');
 if(journal?.activationId!==timing?.activationId||!journal?.entries?.length)return pool;
 const data=await form('All the Facts · Related check',`<p>Upgrade this check once if it relates to the learned information.</p><label>Relevant fact<select name="fact"><option value="">Unrelated check</option>${journal.entries.map((r,i)=>`<option value="${i}">${esc(r.note)}</option>`).join('')}</select></label>`,['fact'],'Continue');
 if(!data||data.fact==='')return pool;
 if(primaryRank(actor.system.heroicAbility,'all-the-facts')<2||actor.getFlag(SID,'heroicTiming')?.activationId!==timing.activationId)throw Error('Heroic expired; prepare the check again.');
 return (await import('../domain/pool/index.js')).upgradePositive(pool,1);
}
export async function applyPrimaryResult(actor,skillId,result,options={}){
 result=await applyParagon(actor,skillId,result);
 if(primaryRank(actor?.system?.heroicAbility,'influential') && ['charm','coercion','deception','leadership','negotiation'].includes(skillId)){
  const data=await form('Influential · Social check','<label>Encounter resolution<select name="mode"><option value="normal">Normal check / extended encounter</option><option value="single">This single check resolves the social encounter</option></select></label>',['mode'],'Continue');
  if(data?.mode==='single'&&primaryRank(actor.system.heroicAbility,'influential')){
   const skill=(await import('./skill-ui.js')).prepareActorSkillCheck(actor,skillId);
   const bonus=options.characteristic??skill.characteristicValue;
   const margin=result.successMargin+bonus;
   result={...result,raw:{...result.raw,success:result.raw.success+bonus},net:{...result.net,success:Math.max(0,margin),failure:Math.max(0,-margin)},successMargin:margin,succeeded:margin>0,heroicSuccessBonus:bonus};
  }
 }
 if(primaryRank(actor?.system?.heroicAbility,'foretelling')<2)return result;
 const activation=actor.getFlag(SID,'heroicTiming')?.activationId;
 const journal=actor.getFlag(SID,'heroicPrimaryJournal');
 if(!activation||journal?.activationId!==activation||!journal.entries?.length||actor.getFlag(SID,'heroicForetellingReroll')?.activation===activation)return result;
 if(locks.has(actor.uuid))return result;
 locks.add(actor.uuid);
 try{
 const data=await form('Foretelling · Reroll',`<p>Keep this result, or use your one reroll for a check related to a question.</p><label>Related question<select name="question"><option value="">Keep result</option>${journal.entries.map((r,i)=>`<option value="${i}">${esc(r.note)}</option>`).join('')}</select></label>`,['question'],'Continue');
 if(!data||data.question==='')return result;
 if(!actor.isOwner&&!game.user.isGM)throw Error('Actor ownership required.');
 if(primaryRank(actor.system.heroicAbility,'foretelling')<2||actor.getFlag(SID,'heroicTiming')?.activationId!==activation||actor.getFlag(SID,'heroicForetellingReroll')?.activation===activation)throw Error('Foretelling state changed; reroll unavailable.');
 const {rollNarrativePool}=await import('../domain/dice/index.js');
 const rerolled=rollNarrativePool(result.pool);
 await actor.update({[`flags.${SID}.heroicForetellingReroll`]:{activation,original:result,result:rerolled,question:journal.entries[Number(data.question)].note}});
 return {...rerolled,heroicReroll:true};
 }finally{locks.delete(actor.uuid);}
}
export async function foretellingCopy(actor){
 requireGM(actor);
 if(primaryRank(actor.system.heroicAbility,'foretelling')!==3)throw Error('Supreme Foretelling required.');
 if(locks.has(actor.uuid))throw Error('Heroic resolution already open.');
 locks.add(actor.uuid);
 try{
 const activation=actor.getFlag(SID,'heroicTiming')?.activationId;
 let saved=actor.getFlag(SID,'heroicForetellingCopy');
 if(saved?.activation===activation&&saved.resolved)throw Error('NPC substitution already resolved for this activation.');
 if(saved?.activation!==activation){
  const data=await form('Foretelling · Copy NPC pool','<label>NPC and check<input name="npc"></label><label>Exact NPC dice pool (JSON)<textarea name="pool">{"ability":0,"proficiency":0,"boost":0,"difficulty":0,"challenge":0,"setback":0}</textarea></label><p>Enter the same pool as the NPC check before its result is applied.</p>',['npc','pool'],'Roll Copy');
  if(!data)return false;
  requireGM(actor);
  if(actor.getFlag(SID,'heroicTiming')?.activationId!==activation)throw Error('Activation changed.');
  const {rollNarrativePool}=await import('../domain/dice/index.js');
  const pool=JSON.parse(data.pool);
  if(!pool||typeof pool!=='object'||Array.isArray(pool)||Object.values(pool).some(n=>!Number.isInteger(n)||n<0||n>50)||Object.values(pool).reduce((a,b)=>a+b,0)>100)throw Error('Enter a dice pool of non-negative whole numbers, at most 50 per type and 100 total.');
  saved={activation,npc:data.npc,result:rollNarrativePool(pool),resolved:false};
  await actor.update({[`flags.${SID}.heroicForetellingCopy`]:saved});
 }
 const {resultToChatHtml}=await import('./dice-ui.js');
 const data=await form('Foretelling · Choose NPC result',`${resultToChatHtml(saved.result)}<label>Result<select name="choice"><option value="original">Keep original NPC result</option><option value="copy">Use this result</option></select></label><p>The GM resolves the NPC check using the chosen result.</p>`,['choice'],'Confirm Result');
 if(!data)return false;
 requireGM(actor);
 if(actor.getFlag(SID,'heroicTiming')?.activationId!==activation)throw Error('Activation changed.');
 await actor.update({[`flags.${SID}.heroicForetellingCopy`]:{...saved,resolved:true,choice:data.choice}});
 try{await foundry.documents.ChatMessage.create({content:`<p>Foretelling · ${esc(saved.npc)} · ${data.choice==='copy'?'Use copied result':'Keep original result'}</p>${resultToChatHtml(saved.result)}`});}catch{ui.notifications.warn('Choice saved; chat failed.');}
 return true;
 }finally{locks.delete(actor.uuid);}
}
