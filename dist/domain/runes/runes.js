// Realms of Terrinoth pp.118–121. Activation is distinct from skilled implement use.
const weapon=(skillId,damage,critical,range,qualities)=>({skillId,damage,critical,range,qualities:qualities.map(([id,rank=1])=>({id,rank})),attackMode:'ranged',damageCharacteristic:'none',engagedProfile:'one-handed'});
export const RUNE_RULES=Object.freeze({
 'arcane-bolt-rune':{page:118,weapon:weapon('ranged',8,3,'medium',[['auto-fire']]),attack:{forced:['impact'],free:{range:1,impact:1}}},
 'blasting-rune':{page:118,weapon:weapon('discipline',9,3,'medium',[['blast',7],['knockdown']]),attack:{forced:['blast'],free:{blast:1,impact:1}}},
 'ice-storm-rune':{page:118,weapon:weapon('discipline',7,2,'medium',[['blast',4],['ensnare',3]]),attack:{forced:['ice','blast'],free:{ice:1,blast:1}}},
 'immolation-rune':{page:118,weapon:weapon('discipline',8,3,'short',[['burn',2]]),attack:{forced:['fire','deadly'],free:{fire:1,deadly:1}},note:'Before damage, GM may approve wounds up to half wound threshold for equal damage to every hit.'},
 'lesser-rune':{page:119,activation:'GM-defined minor beneficial effect',bound:true},
 'lightning-strike-rune':{page:119,weapon:weapon('discipline',8,3,'long',[['auto-fire'],['disorient',3]]),attack:{forced:['lightning'],free:{range:1,lightning:1}}},
 'rune-of-collection':{page:119,activation:'Glows; no other activation effect',all:{difficultyReduction:1},strainReduction:1},
 'rune-of-fate':{page:119,timing:'action',activation:'Move one player Story Point to GM; next check targeting bearer gains Despair',augment:{free:{'additional-target':99}},curse:{forced:['doom'],free:{'additional-target':99,doom:1}}},
 'rune-of-misery':{page:120,timing:'action',strain:3,activation:'One short-range target: disoriented three rounds; bearer may spend two target Threat for one wound',curse:{difficultyReduction:2},note:'GM may spend two Threat from Curse to inflict one wound on caster.'},
 'soulstone-rune':{page:120,activation:'All other short-range targets: Average Discipline; failure causes three strain and staggered one round; heal one wound per failed target',note:'Curse inflicts Forbidden-rank wounds on every affected target; caster heals one wound whenever a cursed target suffers wounds.'},
 'stasis-rune':{page:120,timing:'action',strain:2,activation:'One short-range target: staggered and immobilized through end of its next turn',curse:{forced:['paralyzed'],free:{paralyzed:1}}},
 'sunburst-rune':{page:121,weapon:weapon('ranged',4,1,'medium',[['breach',1]]),attack:{forced:['holy'],free:{holy:1}},note:'Attack gains Breach 1. Holy is allowed for Runes with this shard.'},
 'teleportation-rune':{page:121,timing:'action',activation:'Teleport bearer or possessed silhouette-zero item to visible extreme-range location; familiar unseen location needs Average Vigilance with GM modifiers',all:{free:{range:3}}},
 'terror-rune':{page:121,timing:'passive',activation:'Bearer ignores fear while possessing the shard',note:'Friendly spell targets ignore fear during the spell; enemy targets immediately make Daunting fear checks.'},
 'vision-rune':{page:121,timing:'action',activation:'Average Perception: see a place within three days of travel, or through a medium-range solid object',note:'Spell targeting does not require sight; range still applies.'},
 'wanderers-stone':{page:121,timing:'action',once:'encounter',activation:'Heal five strain',augment:{free:{haste:1,swift:1}}},
 'ynfernael-rune':{page:121,timing:'action',activation:'Choose wounds up to wound threshold; suffer them and inflict that many on all short-range characters',attack:{forced:['empowered','deadly'],free:{empowered:1,deadly:1}},note:'After Attack resolution suffer one wound, plus four more if the check failed.'}
});
export function runeMagicPlan(implement,skillId,actionId,effects={}){
 const isShard=implement?.tags?.includes('runebound-shard');
 if(isShard&&skillId!=='runes')throw Error('A runebound shard is an implement only for Runes.');
 const rule=isShard?RUNE_RULES[implement.contentId]:null;
 const spec=rule?.[actionId]??{},all=rule?.all??{};
 const selected={...effects};for(const id of spec.forced??[])selected[id]=Math.max(1,Number(selected[id])||0);
 const free={...all.free,...spec.free};
 if(rule?.bound&&implement.boundEffectId)free[implement.boundEffectId]=1;
 return {effects:selected,free,forced:spec.forced??[],difficultyReduction:(all.difficultyReduction??0)+(spec.difficultyReduction??0),strainCost:2-(rule?.strainReduction??0),notes:rule?[`Runebound shard · Realms of Terrinoth p.${rule.page}`,...(rule.note?[rule.note]:[])]:[],lesser:!!rule?.bound};
}
export function runeDiscount(plan,selected,alreadyFree=new Set()){
 let amount=0;
 for(const row of selected){const count=Math.min(row.count,plan.free[row.effect.id]??0);const eligible=Math.max(0,count-(alreadyFree.has(row.effect.id)?1:0));if(plan.lesser&&count&&row.effect.difficulty!==1)throw Error('A lesser rune binds a difficulty-one effect.');amount+=eligible*row.effect.difficulty;}
 return amount+plan.difficultyReduction;
}
