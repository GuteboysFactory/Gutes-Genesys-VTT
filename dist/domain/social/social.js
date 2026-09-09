export const SOCIAL_OPPOSITION=Object.freeze({charm:'cool',coercion:'discipline',deception:'vigilance',leadership:'discipline',negotiation:'negotiation'});
export function socialOutcome(result,{remarks=0,triumphRemarks=0,remarkCost=4,bonus=0}={}){
 for(const n of [remarks,triumphRemarks,remarkCost,bonus])if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid social outcome input.');
 const net=result.net,success=Number(net.success)>0;
 if(!success&&(remarks||triumphRemarks))throw Error('Critical remarks require a successful check.');
 if(remarks*remarkCost>Number(net.advantage??0)||triumphRemarks>Number(net.triumph??0))throw Error('Not enough unspent symbols for critical remarks.');
 return {success,targetStrain:success?1+Number(net.success)+bonus+5*(remarks+triumphRemarks):0,actorStrain:success?0:2,advantageSpent:remarks*remarkCost,triumphSpent:triumphRemarks};
}
