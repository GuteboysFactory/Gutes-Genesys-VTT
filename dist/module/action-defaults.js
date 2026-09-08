export const ACTION_BINDINGS = ['skill-check','assist','maneuver','custom-check'];
export const DEFAULT_ACTIONS = [
 {key:'assist',name:'Assist',activation:'maneuver',binding:'assist',notes:'Spend a maneuver to assist an engaged ally. GM resolves eligibility and the assistance bonus.'},
 {key:'maneuver',name:'Maneuver',activation:'maneuver',binding:'maneuver',notes:'Spend a maneuver using the encounter turn controls. Resolve movement and other effects manually.'},
 {key:'custom-check',name:'Custom Check',activation:'action',binding:'custom-check',notes:'Open Dice Tools to configure a check. This shortcut does not spend an action.'}
];
let busy=false;
export async function installDefaultActions(){
 const authority=()=>{if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Only the active GM can install default Actions.');};
 authority();if(busy)throw Error('Actions installation is already running.');busy=true;let count=0;
 try{
  let folder=game.folders.contents.find(f=>f.type==='Item'&&f.name==='Actions'&&!f.folder);
  if(!folder)folder=await foundry.documents.Folder.create({name:'Actions',type:'Item',folder:null,sorting:'a'});
  if(!folder?.id)throw Error('Actions folder could not be created.');
  for(const {key,...system} of DEFAULT_ACTIONS){
   authority();
   if(game.items.contents.some(i=>i.type==='actionTemplate'&&i.flags?.['genesys-vtt']?.defaultActionKey===key))continue;
   const {name,...data}=system;
   if(!await foundry.documents.Item.create({name,type:'actionTemplate',folder:folder.id,ownership:{default:2},system:{...data,skillId:'',difficulty:2},flags:{'genesys-vtt':{defaultActionKey:key}}}))throw Error('Action creation failed.');
   count++;
  }
  return count;
 }finally{busy=false;}
}
