// Core p.115. Persistent numerical injuries only; temporary/limb decisions stay explicit.
export function criticalCheckModifiers(injuries=[],{characteristicId,skillId}={},suppressedIds=[]) {
 const suppressed=new Set(suppressedIds);
 return injuries.filter(i=>i.active!==false&&i.healed!==true&&!suppressed.has(i.id)).flatMap(i=>{
  const total=Number(i.total),modifier={id:`critical:${i.id}:check`,priority:-1900};
  if(!Number.isSafeInteger(total))return [];
  const affected=total>=46&&total<=50?['intellect','cunning']:total>=51&&total<=55?['presence','willpower']:total>=56&&total<=60?['brawn','agility']:[];
  if(affected.includes(characteristicId)||(total>=86&&total<=90))return [{...modifier,difficultyDelta:1}];
  if(total>=116&&total<=120)return [{...modifier,pool:{upgradeNegative:['perception','vigilance'].includes(skillId)?3:2}}];
  return [];
 });
}
