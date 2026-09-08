import assert from 'node:assert/strict';import fs from 'node:fs';
const src=fs.readFileSync('dist/module/equipment-catalog-install.js','utf8').replace(/^import .*;$/m,'const embeddedItemData=row=>({name:row.id,type:"gear",flags:{"genesys-vtt":{}}});');
const {installEquipmentCatalog}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},items:{contents:[]},folders:{contents:[]},genesysEquipment:{listDefinitions:()=>[{id:'a'},{id:'b'}]}};
globalThis.foundry={documents:{Folder:{create:async data=>{const f={...data,id:'folder'};game.folders.contents.push(f);return f;}},Item:{create:async data=>{game.items.contents.push(data);return data;}}}};
assert.equal(await installEquipmentCatalog('rot'),2);assert.equal(await installEquipmentCatalog('rot'),0);assert.equal(game.folders.contents.length,1);assert.equal(game.items.contents[0].folder,'folder');game.items.contents[0].name='Edited';await installEquipmentCatalog('rot');assert.equal(game.items.contents[0].name,'Edited');
game.user.isGM=false;await assert.rejects(installEquipmentCatalog('rot'),/active GM/);
game.user.isGM=true;game.items.contents=[];foundry.documents.Item.create=async()=>{throw Error('disk');};await assert.rejects(installEquipmentCatalog('rot'),/0 equipment Items/);foundry.documents.Item.create=async data=>{game.items.contents.push(data);return data;};assert.equal(await installEquipmentCatalog('rot'),2);
console.log('PASS: Equipment folder, repeat install, preserved edits, permissions and failure recovery');
