import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {copyAdversaryTemplate,adversaryDraft} from '../dist/domain/adversaries/templates.js';
import {prepareAdversary} from '../dist/domain/adversaries/forge.js';
import {CORE_QUALITY_DEFINITIONS} from '../dist/domain/items/qualities.js';
const book=JSON.parse(await fs.readFile('data/terrinoth-adversaries.json','utf8'));
const custom=JSON.parse(await fs.readFile('data/everyday-adversaries.json','utf8'));
assert.equal(book.length,79);assert.equal(custom.length,22);
assert.equal(new Set([...book,...custom].map(a=>a._id)).size,101);
const allowed=new Set(CORE_QUALITY_DEFINITIONS.map(q=>q.id));
for(const a of [...book,...custom]){
 const defs=a.system.skills.map(s=>({id:s.id}));
 const rebuilt=prepareAdversary(adversaryDraft(a),defs);
 assert.deepEqual(rebuilt.system.characteristics,a.system.characteristics,a.name);
 assert.deepEqual(rebuilt.system.defense,a.system.defense,a.name);
 assert.equal(rebuilt.system.wounds.threshold,a.system.wounds.threshold,a.name);
 assert.equal(rebuilt.system.strain.threshold,a.system.strain.threshold,a.name);
 const snapshot=JSON.stringify(a),copy=copyAdversaryTemplate(a);
 assert.equal(copy._id,undefined);assert.equal(copy.ownership.default,0);assert.equal(copy.prototypeToken.actorLink,false);
 copy.name='changed';copy.system.wounds.value=99;copy.items.length=0;
 assert.equal(JSON.stringify(a),snapshot);
 for(const item of a.items)if(item.type==='weapon'){
  assert.equal(item.system.damageCharacteristic,'none',a.name);
  assert.ok(['brawl','melee-light','melee-heavy','ranged'].includes(item.system.skillId),a.name+item.name);
  for(const q of item.system.qualities)assert.ok(allowed.has(q.id),q.id);
 }
 for(const item of a.items){const notes=item.system.notes??'';assert.ok(!/[∫πº\u{f22b0}-\u{f22b5}]/u.test(notes),'Unreadable dice glyph: '+a.name);assert.ok(!notes.includes('INDEX'),'Index leaked into notes');}
}
// Independently read visual reference pages: the PDF text object order reverses M/R on some entries.
const goblin=book.find(a=>a.name==='Goblin');assert.deepEqual(goblin.system.defense,{melee:1,ranged:0});
const dragon=book.find(a=>a.name==='Feral Dragon');assert.equal(dragon.system.wounds.threshold,41);assert.equal(dragon.system.strain.threshold,20);assert.equal(dragon.system.adversaryRank,2);
const witch=book.find(a=>a.name==='Goblin Witcher');assert.ok(witch.items.some(i=>i.system.notes?.includes('add [Boost] [Boost]')));assert.ok(witch.flags['genesys-vtt'].adversaryTemplate.reviewNotes.length);
const wounded=structuredClone(goblin);wounded.system.wounds.value=4;wounded.system.conditions=[{id:'stunned'}];wounded.system.criticalInjuries=[{id:'crit'}];wounded.flags['genesys-vtt'].encounter={active:true};
const fresh=copyAdversaryTemplate(wounded);assert.equal(fresh.system.wounds.value,0);assert.deepEqual(fresh.system.conditions,[]);assert.deepEqual(fresh.system.criticalInjuries,[]);assert.equal(fresh.flags['genesys-vtt'].encounter,undefined);
console.log('PASS: 101 templates, native schema constraints, source isolation, damage basis, qualities, dice labels and visual-reference M/R order');
