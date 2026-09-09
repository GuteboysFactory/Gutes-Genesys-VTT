import assert from 'node:assert/strict';
globalThis.document={addEventListener(){}};globalThis.Hooks={once(){},on(){}};globalThis.foundry={utils:{deepClone:structuredClone}};
globalThis.game={user:{isGM:false},items:{contents:[]},genesysContent:{getContent:()=>[]}};
const fs=await import('node:fs');const rules=await import('../dist/domain/rules/index.js');Object.assign(globalThis,{__rules:rules});
const source=fs.readFileSync('dist/module/talent-library.js','utf8').replace(/^import .*;$/gm,'');
const {listTalentLibraryEntries,loadCompendiumTalents,installTalentCatalog}=await import('data:text/javascript;base64,'+Buffer.from('const {createCoreParryTalent,createCoreSecondWindTalent,createCoreSurgeonTalent,createTerrinothFinesseTalent,normalizeTalentDefinition}=globalThis.__rules;\n'+source).toString('base64'));
const item=(id,visible)=>({id,type:'talent',name:'Same name',system:{sourceId:'same',tier:2,notes:'Original'},testUserPermission:()=>visible});
game.items.contents=[item('a',true),item('b',true),item('hidden',false)];
let entries=listTalentLibraryEntries().filter(x=>x.packId==='world');assert.equal(entries.length,2);assert.notEqual(entries[0].id,entries[1].id);assert.equal(entries[0].documentId,'a');
game.items.contents[0].system.notes='Edited';assert.equal(listTalentLibraryEntries().find(x=>x.documentId==='a').notes,'Edited');
game.items.contents.shift();assert.equal(listTalentLibraryEntries().some(x=>x.documentId==='a'),false);
game.user.isGM=true;assert.equal(listTalentLibraryEntries().filter(x=>x.packId==='world').length,2);
console.log('PASS: native talent visibility, stable independent IDs, edits and deletion');

game.user.isGM=false;let reads=0;
const pack={collection:'world.test',documentName:'Item',visible:true,metadata:{label:'Test pack'},getDocuments:async()=>{reads++;return [item('p',true)];}};
game.packs=new Map([['world.test',pack],['world.private',{...pack,visible:false,getDocuments:async()=>{throw Error('Private pack read');}}]]);
await loadCompendiumTalents();assert.equal(reads,1);assert.equal(listTalentLibraryEntries().find(x=>x.packId==='world.test').id,'Compendium.world.test.p');
pack.visible=false;assert.equal(listTalentLibraryEntries().some(x=>x.packId==='world.test'),false);
console.log('PASS: compendium loading and permission revocation');

game.user={id:'gm',isGM:true};game.users={activeGM:{id:'gm'}};game.items.contents=[];
foundry.documents={Item:{create:async data=>{const item={...data,id:String(game.items.contents.length),testUserPermission:()=>true};game.items.contents.push(item);return item;}}};
game.folders={contents:[]};foundry.documents.Folder={create:async data=>{const folder={...data,id:'talents-folder'};game.folders.contents.push(folder);return folder;}};
const count=await installTalentCatalog();assert.ok(count>=3);assert.equal(await installTalentCatalog(),0);
const first=game.items.contents[0],id=first.flags['genesys-vtt'].catalogTalentId;first.name='GM edited';
assert.equal(await installTalentCatalog(),0);assert.equal(listTalentLibraryEntries().find(x=>x.id===id).label,'GM edited');
first.testUserPermission=()=>false;game.user.isGM=false;assert.equal(listTalentLibraryEntries().some(x=>x.id===id),false);await assert.rejects(installTalentCatalog(),/active GM/);
console.log('PASS: catalog identity, repeated install, edit preservation and private source filtering');

game.user.isGM=true;assert.equal(game.folders.contents.length,1);assert.ok(game.items.contents.every(i=>i.folder==='talents-folder'));
first.folder=null;first.update=async data=>Object.assign(first,data);await installTalentCatalog();assert.equal(first.folder,'talents-folder');
first.folder='custom-folder';await installTalentCatalog();assert.equal(first.folder,'custom-folder');
console.log('PASS: Talents folder creation/reuse and root-only organization');
