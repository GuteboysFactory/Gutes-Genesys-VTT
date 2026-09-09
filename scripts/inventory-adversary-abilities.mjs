import {REVIEWED_NPC_MAGIC} from '../dist/domain/adversaries/reviewed-magic-profiles.js';
import fs from 'node:fs';
const sourceAudit=JSON.parse(fs.readFileSync('docs/terrinoth-weapon-audit-v1888.json','utf8'));
const sourceChecked=(templateId,itemName)=>sourceAudit.referenceChecks.some(r=>r.templateId===templateId&&r.item===itemName);
const actors=JSON.parse(fs.readFileSync('data/terrinoth-adversaries.json','utf8'));
function clauses(text){let depth=0,start=0,rows=[];for(let i=0;i<text.length;i++){const c=text[i];if(c==='(')depth++;if(c===')')depth--;if(!depth&&(c===','||c===';')){rows.push(text.slice(start,i).trim());start=i+1;}}rows.push(text.slice(start).trim());return rows.filter(Boolean);}
const fear=new Set(JSON.parse(fs.readFileSync('data/terrinoth-terrifying.json','utf8')).map(p=>p.id));
const rows=[];
for(const actor of actors){
 const source=actor.flags['genesys-vtt'].adversaryTemplate;
 for(const item of actor.items.filter(i=>i.flags?.['genesys-vtt']?.adversaryReference)){
  const category=item.name.split(' — ')[0];
  if(!['Talents','Abilities','Spells'].includes(category))continue;
  for(const clause of clauses(item.system.notes)){
   const name=clause.split('(')[0].replace(/\.$/,'').trim();
   let status='manual-reference',implementation=null;
   if(/^Adversary \d+$/.test(name)){status='native-baseline';implementation='Actor adversaryRank';}
   if(/^Parry \d+$/.test(name)){status='native-baseline';implementation='Existing native Parry reaction';}
   if(/^Silhouette \d+$/.test(name)){status='native-baseline';implementation='Actor silhouette';}
   if(source.id==='rot:ogre'&&name==='Regeneration'){status='new-runtime';implementation='Forge adds selectable Regeneration Talent; tracked activation-start heal with atomic receipt';}
   if(source.id==='rot:orc-spiritspeaker'&&/^Second Wind 5/.test(name)){status='new-runtime';implementation='Forge adds native Second Wind 5; existing active Talent UI, authoritative execution and atomic usage receipt';}
   if(name==='Terrifying'&&fear.has(source.id)){status='gm-guided';implementation='Encounter Fear panel: strongest applicable source, Discipline roll and saved receipt; GM timing/exemptions/consequences';}
   if(source.id==='rot:dimora'&&name==='Durable 2'){status='new-runtime';implementation='v1886 intact Dimora reference adds native Durable rank 2 on Forge copy';}
   const reviewed=REVIEWED_NPC_MAGIC.find(p=>p.templateId===source.id&&p.name===name&&p.references.includes(item.system.notes));
   if(reviewed){status='new-runtime';implementation=`v1887 native magic preparation: ${reviewed.name}; explicit effect/creature decisions remain GM-managed`;}
   const entryKind=category==='Spells'?'spell-prose':(/^(None\.|and |as normal)/.test(name)||/\. S[k]?$/.test(name))?'extraction-fragment':'rule-reference';
   rows.push({entryKind,templateId:source.id,actor:actor.name,page:reviewed?.page??source.page,category,name,status,implementation,sourceCheckedThisPackage:sourceChecked(source.id,item.name)});
  }
 }
}
const counts={};for(const r of rows)counts[r.status]=(counts[r.status]??0)+1;
fs.writeFileSync('docs/npc-ability-coverage.json',JSON.stringify({version:'0.0.1888',source:'Existing 79 Terrinoth template references; printed book page numbers',scope:'v1888 independently checks all 79 source identities/roles, 817 statistics, 371 skill entries, 120 weapon profiles, native/conditional qualities and 212 reference texts. Prose comparison excludes dice-color glyphs; official Gnome Minstrel FAQ override is explicit. This inventory retains distinct execution statuses: a source-checked manual reference is not automatic rule execution. Counts include spell prose and fragments, not unique missing functions. Existing manual references remain available through native Items and GM rule workflows; supported native rules are identified individually.',templates:actors.length,counts,entries:rows},null,2)+'\n');
console.log(JSON.stringify({templates:actors.length,clauses:rows.length,counts}));
