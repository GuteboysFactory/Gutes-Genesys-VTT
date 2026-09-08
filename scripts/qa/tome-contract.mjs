import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=process.argv[2];if(!root)throw Error('Provide the reviewed Tome checkout path.');
const source=fs.readFileSync(`${root}/scripts/world-system-adapters.js`,'utf8');
const c=vm.createContext({game:{system:{id:'genesys-vtt'}},document:{createElement:()=>({set innerHTML(v){this.textContent=v.replace(/<[^>]*>/g,'');},textContent:''})},console});vm.runInContext(source,c);
for(const type of ['talent','weapon','armor','gear','actionTemplate']){
 const system={notes:`Native ${type} description for import.`};
 const result=await c.AdventurersTomeSystemAdapters.enrich({documentName:'Item',type,system,toObject:()=>({system})});
 assert.ok(result.bodyHtml.includes(system.notes));assert.ok(result.summary.includes(type));
}
console.log('PASS actual Tome adapter: native talent/equipment/action/Heroic-shortcut notes');
