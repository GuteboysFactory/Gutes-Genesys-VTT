// Realms of Terrinoth pp.112–114. Fictional prerequisites remain GM decisions.
function integer(value, name, max=1000000) {
 if(!Number.isSafeInteger(value)||value<0||value>max)throw Error(`Invalid ${name}.`);return value;
}
export function craftingPlan({mode='craft',rarity,price}) {
 if(!['craft','alchemy','gather'].includes(mode))throw Error('Unknown crafting mode.');
 integer(rarity,'rarity',10);integer(price,'price');
 return {mode,rarity,skill:mode==='craft'?'mechanics':mode==='alchemy'?'alchemy':'survival',difficulty:Math.ceil(rarity/2),materialsCost:mode==='gather'?0:price/2,duration:mode==='gather'?null:rarity+1,unit:mode==='alchemy'?'hours':'days',outputQuantity:1,source:'Realms of Terrinoth pp.112–114'};
}
// The listed examples are selectable suggestions, not a restriction on narrative spends.
export const CRAFT_SPENDS=Object.freeze({
 'faster':{advantage:1,repeat:true,modes:['craft']},'next-boost':{advantage:1,modes:['craft','alchemy']},
 'save-materials':{advantage:2,modes:['craft']},'lighter':{advantage:2,modes:['craft']},'extra-single-use':{advantage:2,repeat:true,modes:['craft']},
 'hard-point':{advantage:3,modes:['craft']},'easier-next':{advantage:3,modes:['craft']},'superior':{triumph:1,modes:['craft']},
 'numerical-benefit':{triumph:1,modes:['craft']},'narrative-benefit':{triumph:1,modes:['craft']},'new-quality':{triumph:2,modes:['craft']},
 'slower':{threat:1,repeat:true,modes:['craft']},'next-setback':{threat:1,modes:['craft']},'heavier':{threat:2,modes:['craft']},
 'more-materials':{threat:2,modes:['craft','alchemy']},'inaccurate':{threat:3,modes:['craft']},'less-hard-points':{threat:3,modes:['craft']},'tools-ruined':{threat:3,modes:['craft']},
 'inferior':{despair:1,modes:['craft']},'fragile':{despair:1,modes:['craft']},'accident':{despair:2,modes:['craft']},
 'heal-extra':{advantage:1,modes:['alchemy']},'extra-dose':{advantage:2,repeat:true,modes:['alchemy']},'half-time':{advantage:2,modes:['alchemy']},
 'spare-batch':{advantage:3,modes:['alchemy']},'longer':{advantage:3,modes:['alchemy']},'poison-resistance':{triumph:1,modes:['alchemy']},
 'stronger':{triumph:1,modes:['alchemy']},'combined-potion':{triumph:2,modes:['alchemy']},'strain-after':{threat:1,modes:['alchemy']},'strong-smell':{threat:1,modes:['alchemy']},
 'delayed':{threat:2,modes:['alchemy']},'wound-after':{threat:3,modes:['alchemy']},'shorter':{threat:3,modes:['alchemy']},
 'disoriented':{despair:1,modes:['alchemy']},'rejection':{despair:1,modes:['alchemy']},'poisoned':{despair:2,modes:['alchemy']}
});
export function resolveCrafting(plan,result,spends=[],{singleUse=false,weapon=false,poison=false,confirmed=false}={}) {
 if(!Array.isArray(spends)||spends.length>100)throw Error('Invalid symbol spending.');
 const net=result?.net??{};
 const remaining={advantage:Math.max(0,Number(net.advantage)||0),threat:Math.max(0,Number(net.threat)||0),triumph:Math.max(0,Number(net.triumph)||0),despair:Math.max(0,Number(net.despair)||0)};
 const outcome={success:Number(net.success)>0,quantity:Number(net.success)>0?1:0,duration:plan.duration,unit:plan.unit,encumbranceDelta:0,hardPointsDelta:0,qualities:[],effects:[],additionalMaterialCost:0,remaining};
 const seen=new Set();
 for(const spend of spends){
  const spec=CRAFT_SPENDS[spend.id];if(!spec?.modes.includes(plan.mode))throw Error('Spend is unavailable for this process.');
  if(seen.has(spend.id)&&!spec.repeat)throw Error('This spend may only be selected once.');seen.add(spend.id);
  if(spend.id==='extra-single-use'&&!singleUse)throw Error('Additional items require single-use equipment.');
  if(spend.id==='inaccurate'&&!weapon)throw Error('Inaccurate requires a weapon.');
  if(spend.id==='poison-resistance'&&!poison)throw Error('Resistance upgrade requires poison.');
  if(!confirmed)throw Error('GM must confirm symbol spending and applicable effects.');
  const base=Object.keys(spec).find(k=>['advantage','threat','triumph','despair'].includes(k));
  const currency=spend.currency??base;
  const substitution=base==='advantage'&&currency==='triumph'||base==='threat'&&currency==='despair';
  if(currency!==base&&!substitution)throw Error('Invalid symbol substitution.');
  const cost=substitution?1:spec[base];if(remaining[currency]<cost)throw Error('Not enough unspent symbols.');remaining[currency]-=cost;
  outcome.effects.push(spend.id);
  if(spend.id==='faster')outcome.duration=Math.max(1,outcome.duration-1);
  if(spend.id==='slower')outcome.duration++;
  if(spend.id==='half-time')outcome.duration/=2;
  if(['extra-dose','extra-single-use'].includes(spend.id)&&outcome.success)outcome.quantity++;
  if(spend.id==='lighter')outcome.encumbranceDelta--;
  if(spend.id==='heavier')outcome.encumbranceDelta++;
  if(spend.id==='hard-point')outcome.hardPointsDelta++;
  if(spend.id==='less-hard-points')outcome.hardPointsDelta--;
  if(['superior','inferior','inaccurate'].includes(spend.id))outcome.qualities.push({id:spend.id,rank:1});
  if(spend.id==='more-materials')outcome.additionalMaterialCost+=plan.materialsCost/2;
 }
 return outcome;
}
