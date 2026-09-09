export function encumbranceState({brawn,items=[],bonus=0}){
 const threshold=5+Math.max(0,Number(brawn)||0)+Math.max(0,Number(bonus)||0);
 let value=0;
 for(const item of items){
  if(item.carried===false||item.reference===true)continue;
  const quantity=item.type==='gear'?Math.max(0,Number(item.quantity??1)||0):1;
  let enc=Math.max(0,Number(item.encumbrance)||0);
  if(item.type==='armor'&&item.equipped)enc=Math.max(0,enc-3);
  value+=enc*quantity;
 }
 const overage=Math.max(0,value-threshold);
 return {value,threshold,overage,losesFreeManeuver:overage>0&&overage>=Number(brawn)};
}
