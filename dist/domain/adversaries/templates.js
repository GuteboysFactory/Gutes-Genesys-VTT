/** Native document copies must never retain world identities or encounter damage. */
export function copyAdversaryTemplate(source) {
 const raw=typeof source?.toObject==='function'?source.toObject():structuredClone(source);
 if(raw?.type!=='character'||!['minion','rival','nemesis'].includes(raw.system?.role))throw Error('Choose a Minion, Rival or Nemesis Actor.');
 const system=structuredClone(raw.system);
 system.wounds={...system.wounds,value:0};system.strain={...system.strain,value:0};
 if(system.heroicAbility)Object.assign(system.heroicAbility,{active:false,usesThisSession:0,activeTurnBudget:0});
 system.criticalInjuries=[];system.conditions=[];
 if(system.minionGroup)system.minionGroup.casualties=0;
 // Actor flags intentionally only retain source/profile information, never encounter state.
 return {name:raw.name,type:'character',img:raw.img,system,items:(raw.items??[]).map(copyAdversaryItem),ownership:{default:0},prototypeToken:{actorLink:false,texture:{src:raw.img||'icons/svg/mystery-man.svg'}},flags:{'genesys-vtt':{rulesProfile:raw.flags?.['genesys-vtt']?.rulesProfile||'realms-of-terrinoth',adversaryTemplate:structuredClone(raw.flags?.['genesys-vtt']?.adversaryTemplate??{origin:'Custom Genesys',category:'My templates'})}}};
}
export function copyAdversaryItem(raw){
 return {name:raw.name,type:raw.type,img:raw.img,system:structuredClone(raw.system??{}),flags:structuredClone(raw.flags??{}),effects:(raw.effects??[]).map(effect=>{const copy=structuredClone(effect);delete copy._id;delete copy.origin;return copy;})};
}
export function adversaryDraft(raw){
 const s=raw.system;
 return {name:raw.name,role:s.role,...s.characteristics,wounds:s.role==='minion'?(s.minionGroup?.memberWoundThreshold??s.wounds.threshold):s.wounds.threshold,strain:s.strain?.threshold||10,soak:s.soak,melee:s.defense?.melee??0,ranged:s.defense?.ranged??0,silhouette:s.silhouette??1,members:s.minionGroup?.members??1,adversaryRank:s.adversaryRank??0,extraActivations:Math.min(1,s.extraActivations??0),skills:(s.skills??[]).map(x=>({...x,group:(s.minionGroup?.groupSkillIds??[]).includes(x.id)})),itemIds:[]};
}
