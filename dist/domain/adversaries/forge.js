export const FORGE_CHARACTERISTICS=['brawn','agility','intellect','cunning','willpower','presence'];
function integer(value,label,min,max){
 const n=Number(value);
 if(value===''||value==null||!Number.isInteger(n)||n<min||n>max)throw Error(`${label}: enter a whole number from ${min} to ${max}.`);
 return n;
}
/** Create fresh Actor data. Never infer NPC statistics from PC creation rules. */
export function prepareAdversary(input,definitions){
 const name=String(input.name??'').trim();
 if(!name||name.length>100)throw Error('Enter a name of 1–100 characters.');
 const role=input.role;
 if(!['minion','rival','nemesis'].includes(role))throw Error('Choose Minion, Rival or Nemesis.');
 const characteristics=Object.fromEntries(FORGE_CHARACTERISTICS.map(id=>[id,integer(input[id],id,1,6)]));
 const threshold=integer(input.wounds,'Wound Threshold',1,100);
 const members=role==='minion'?integer(input.members,'Members',1,50):1;
 const chosen=new Map((input.skills??[]).map(row=>[row.id,row]));
 if(chosen.size!==(input.skills??[]).length)throw Error('Duplicate skills.');
 const ids=new Set(definitions.map(row=>row.id));
 for(const id of chosen.keys())if(!ids.has(id))throw Error(`Unknown skill: ${id}`);
 const skills=definitions.map(row=>({id:row.id,rank:role==='minion'?0:integer(chosen.get(row.id)?.rank??0,row.id,0,5),career:false,characteristicOverride:'',sourceId:row.provenance?.sourceId??'adversary-forge'}));
 const groupSkillIds=role==='minion'?[...chosen.values()].filter(row=>row.group===true).map(row=>row.id):[];
 return {name,type:'character',system:{role,characteristics,wounds:{value:0,threshold:threshold*members},strain:{value:0,threshold:role==='nemesis'?integer(input.strain,'Strain Threshold',1,100):0},soak:integer(input.soak,'Soak',0,100),defense:{melee:integer(input.melee,'Melee Defense',0,4),ranged:integer(input.ranged,'Ranged Defense',0,4)},silhouette:integer(input.silhouette,'Silhouette',0,10),adversaryRank:integer(input.adversaryRank,'Adversary rank',0,10),extraActivations:role==='nemesis'?integer(input.extraActivations,'Extra activations',0,1):0,minionGroup:{members,memberWoundThreshold:threshold,casualties:0,groupSkillIds},skills}};
}
