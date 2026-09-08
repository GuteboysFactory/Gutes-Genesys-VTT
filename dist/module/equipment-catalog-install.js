import {embeddedItemData} from './equipment-service.js';
let busy=false;
export async function installEquipmentCatalog(settingId){
 const authority=()=>{if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Only the active GM can install equipment.');};
 authority();if(busy)throw Error('Equipment installation is already running.');busy=true;let count=0;
 try{
  const rows=game.genesysEquipment.listDefinitions(settingId);
  if(!rows.length)return 0;
  let folder=game.folders.contents.find(f=>f.type==='Item'&&f.name==='Equipment'&&!f.folder);
  if(!folder)folder=await foundry.documents.Folder.create({name:'Equipment',type:'Item',folder:null,sorting:'a'});
  if(!folder?.id)throw Error('Equipment folder could not be created.');
  for(const row of rows){
   authority();const key=`${settingId}:${row.id}`;
   if(game.items.contents.some(i=>i.flags?.['genesys-vtt']?.equipmentCatalogKey===key))continue;
   const data=embeddedItemData(row);data.folder=folder.id;data.ownership={default:2};data.flags['genesys-vtt'].equipmentCatalogKey=key;
   if(!await foundry.documents.Item.create(data))throw Error('Item creation failed.');count++;
  }
  return count;
 }catch(e){throw Error(`${count} equipment Items created before stopping: ${e.message}`);}finally{busy=false;}
}
