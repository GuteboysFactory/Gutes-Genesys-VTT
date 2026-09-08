export async function listActionTemplateSources(){
 const rows=game.items.contents.filter(i=>i.type==='actionTemplate'&&(game.user.isGM||i.testUserPermission(game.user,'OBSERVER'))).map(item=>({key:`world:${item.id}`,item,label:item.name}));
 for(const pack of game.packs.values()){
  if(pack.documentName!=='Item'||!(game.user.isGM||pack.visible))continue;
  const docs=await pack.getDocuments();
  if(!(game.user.isGM||pack.visible))continue;
  for(const item of docs)if(item.type==='actionTemplate')rows.push({key:`pack:${pack.collection}:${item.id}`,packId:pack.collection,item,label:`${item.name} · ${pack.metadata?.label||pack.collection}`});
 }
 return rows;
}
export async function resolveActionTemplateSource(row){
 if(!row)throw Error('Choose an Action Template.');
 let item;
 if(row.packId){const pack=game.packs.get(row.packId);if(!pack||!(game.user.isGM||pack.visible))throw Error('Compendium unavailable.');item=await pack.getDocument(row.item.id);if(game.packs.get(row.packId)!==pack||!(game.user.isGM||pack.visible))throw Error('Compendium unavailable.');}
 else {item=game.items.get(row.item.id);if(!item||!(game.user.isGM||item.testUserPermission(game.user,'OBSERVER')))throw Error('Template unavailable.');}
 if(item?.type!=='actionTemplate')throw Error('Template no longer exists.');
 return item;
}
