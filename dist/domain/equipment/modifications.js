// RoT pp.97–98. A single craftsmanship slot, recomputed from the unmodified base.
export function applyCraftsmanship(base,type,id='steel'){
 if(!['weapon','armor'].includes(type)||!['steel','ancient','dwarven','elven','iron'].includes(id))throw Error('Unsupported craftsmanship.');
 const s=structuredClone(base),add=(k,n,min=0)=>s[k]=Math.max(min,Number(s[k]??0)+n);
 if(id==='ancient'){
  if(type==='armor'){add('soak',1);add('defense',1);}else{add('damage',1);add('critical',-1,1);}
  add('hardPoints',-1);s.qualities=[...(s.qualities??[]).filter(q=>q.id!=='reinforced'),{id:'reinforced',rank:1}];s.price=Number(s.price??0)*20;s.rarity=10;
 }
 if(id==='dwarven'){add('encumbrance',1);add(type==='armor'?'hardPoints':'damage',1);s.price=Number(s.price??0)*2;add('rarity',2);}
 if(id==='elven'){if(type==='armor')add('encumbrance',-2);else{add('damage',-1);add('critical',-1,1);}s.price=Number(s.price??0)*2;add('rarity',3);}
 if(id==='iron'){add(type==='armor'?'encumbrance':'critical',type==='armor'?2:1);s.price=Number(s.price??0)/2;add('rarity',-1);}
 s.craftsmanshipId=id;s.craftsmanshipSourceId='realms-of-terrinoth:97-98';return s;
}
export function applyItemModifications(base,type,craftsmanship,attachments=[]){
 const system=applyCraftsmanship(base,type,craftsmanship);
 let used=0;const ids=new Set();
 for(const a of attachments){
  if(!a.id||ids.has(a.id))throw Error('Duplicate attachment.');ids.add(a.id);
  if(!Number.isSafeInteger(a.hardPointCost)||a.hardPointCost<0)throw Error('Invalid attachment hard-point cost.');
  if(!String(a.compatibleTypes??'').split(',').map(t=>t.trim()).includes(type))throw Error('Attachment does not fit this item type.');
  used+=a.hardPointCost;
  for(const effect of a.effects??[]){
   if(['damage','soak','defense','encumbrance'].includes(effect.type)&&Number.isFinite(effect.delta))system[effect.type]=Math.max(0,Number(system[effect.type]??0)+effect.delta);
   if(effect.type==='add-quality'){
    const qs=system.qualities??=[],existing=qs.find(q=>q.id===effect.id);
    system.qualities=[...qs.filter(q=>q.id!==effect.id),{id:effect.id,rank:Math.max(existing?.rank??0,effect.rank??1)}];
   }
  }
 }
 if(used>Number(system.hardPoints??0))throw Error(`Remove attachments first: ${used} hard points used, ${system.hardPoints??0} available.`);
 return {system,used,available:Number(system.hardPoints??0)-used};
}
