export function repairPlan({damage,price,rushed=false,missingTools=false,advantage=0}){
 if(!Number.isSafeInteger(damage)||damage<1||damage>3)throw Error('Only minor, moderate and major damage can be repaired; destroyed items require replacement.');
 if(!Number.isFinite(price)||price<0||!Number.isSafeInteger(advantage)||advantage<0)throw Error('Invalid repair inputs.');
 return {difficulty:damage+Number(rushed)+Number(missingTools),hours:[damage,2*damage],cost:price*[0,.25,.5,1][damage]*Math.max(0,1-.1*advantage),source:'Genesys Core p.89, table I.5–4'};
}
