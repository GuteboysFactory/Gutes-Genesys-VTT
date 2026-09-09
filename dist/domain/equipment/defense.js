export function resolveDefenseSources(sources=[]){
 const provided=sources.filter(s=>s.kind==='provide'),increased=sources.filter(s=>s.kind==='increase');
 for(const s of sources)if(!['provide','increase'].includes(s.kind)||!Number.isSafeInteger(s.value)||s.value<0)throw Error('Invalid defense source.');
 const base=Math.max(0,...provided.map(s=>s.value)),bonus=increased.reduce((n,s)=>n+s.value,0);
 return {value:Math.min(4,base+bonus),base,bonus,sources};
}
