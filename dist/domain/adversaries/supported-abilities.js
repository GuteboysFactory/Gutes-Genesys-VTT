import {createCoreSecondWindTalent} from '../rules/index.js';
// Only reviewed, intact source references qualify. Never infer rules from Actor names.
export function addSupportedAdversaryAbilities(raw) {
 const id=raw.flags?.['genesys-vtt']?.adversaryTemplate?.id;
 const references=(raw.items??[]).filter(i=>i.flags?.['genesys-vtt']?.adversaryReference===true);
 // Correct only the exact unedited legacy source reference in a copied Forge draft.
 const items=(raw.items??[]).filter(i=>!(id==='rot:flying-mount' && i.flags?.['genesys-vtt']?.adversaryReference===true && i.type==='gear' && i.system?.notes==='Dodge 2.'));
 const add=item=>{if(!items.some(i=>i.type==='talent'&&i.system?.sourceId===item.system.sourceId))items.push(item);};
 if(id==='rot:ogre' && references.some(i=>i.system?.notes?.includes('Regeneration (at the beginning of its turn, this creature automatically heals 3 wounds)'))) {
  add({name:'Regeneration',type:'talent',system:{sourceId:'terrinoth-npc:ogre-regeneration',sourceType:'realms-of-terrinoth',enabled:true,activation:'passive',tier:1,rank:1,ranked:false,rules:[],notes:'Realms of Terrinoth p.202. Automatically heals 3 wounds at the beginning of each tracked activation. Does not change defeated/dead status.'}});
 }
 if(id==='rot:orc-spiritspeaker' && references.some(i=>i.system?.notes?.includes('Second Wind 5 (once per encounter, the spiritspeaker may heal 5 strain as an incidental)'))) {
  const t=createCoreSecondWindTalent(5);
  const {id:sourceId,label,...system}=t;
  add({name:label,type:'talent',system:{...system,sourceId,notes:'Realms of Terrinoth p.202; Core p.74. Use the existing active Talent action. Once per encounter on the owner turn, heal 5 strain.'}});
 }
 return {...raw,items};
}
