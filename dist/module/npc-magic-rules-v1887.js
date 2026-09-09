import {talentRank} from './recovery-talents-v1881.js';
export function npcMagicRules(actor,{skillId,actionId,effects={}}={}) {
 const has=id=>talentRank(actor,`terrinoth-npc:${id}`)>0;
 const selected={...effects},free=new Set(),notes=[];
 if(actionId==='attack'&&has('chill-of-nordros')){selected.ice=1;free.add('ice');notes.push('Chill of Nordros: Ice added without difficulty cost.');}
 if(actionId==='conjure'&&has('necromancy')){selected['summon-ally']=1;free.add('summon-ally');notes.push('Necromancy: Summon Ally added without difficulty cost. GM must choose undead summons.');}
 const elemental=skillId==='arcana'&&has('elemental-mastery');
 const aenlong=has('creature-of-the-aenlong'),vampiric=has('vampiric-magic');
 return {effects:selected,free,notes,elemental,difficultyReduction:(aenlong&&skillId==='arcana'?1:0)+(vampiric?1:0),minimum:aenlong&&skillId==='arcana'?1:0,attackBonus:aenlong&&actionId==='attack'?3:0,knowledgeSkillId:has('dark-insight')?'knowledge-forbidden':null};
}
export function finalizeNpcMagicRules(rules,selected,firstEffectId) {
 const free=new Set(rules.free),notes=[...rules.notes];
 if(rules.elemental){
  // Selection insertion order is preserved by the composer; only one occurrence is free.
  const first=firstEffectId?selected.find(e=>e.effect.id===firstEffectId):selected[0];
  if(firstEffectId&&!first)throw Error('Choose a selected spell effect for Elemental Mastery.');
  if(first){free.add(first.effect.id);notes.push(`Elemental Mastery: first selected effect (${first.effect.label}) is free once.`);}
 }
 const effectReduction=selected.reduce((sum,e)=>sum+(free.has(e.effect.id)?e.effect.difficulty:0),0);
 if(rules.difficultyReduction)notes.push(`Innate magic: difficulty reduced by ${rules.difficultyReduction}${rules.minimum?' (minimum Easy)':''}.`);
 if(rules.attackBonus)notes.push(`Creature of the Aenlong: attack base damage +${rules.attackBonus}.`);
 if(rules.knowledgeSkillId)notes.push('Dark Insight: Knowledge (Forbidden) determines spell effects.');
 return {...rules,free,notes,effectReduction};
}
// Native skill-engine checks share the numerical innate modifiers with spell construction.
export function npcMagicCheckModifiers(actor,skillId,magicSkillIds) {
 if(!magicSkillIds.includes(skillId))return [];
 const rules=npcMagicRules(actor,{skillId});
 return rules.difficultyReduction?[{id:'npc:innate-magic',priority:-2100,difficultyDelta:-rules.difficultyReduction,difficultyMinimum:rules.minimum}]:[];
}
