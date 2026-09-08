import {copyAdversaryTemplate} from '../domain/adversaries/templates.js';
import {addSceneInitiativeParticipant} from './initiative-service.js';
const SID='genesys-vtt';
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Only the active GM can manage adversaries.');}
export function parseAdversaryPackage(text){
 if(text.length>10*1024*1024)throw Error('Package exceeds 10 MB.');
 const data=JSON.parse(text);
 if(data.format!=='genesys-adversaries'||data.version!==1||!Array.isArray(data.actors)||!data.actors.length||data.actors.length>500)throw Error('Choose a Genesys adversary package (1–500 templates).');
 return data.actors.map(copyAdversaryTemplate);
}
export function exportAdversaries(actors){
 authority();
 const data={format:'genesys-adversaries',version:1,actors:actors.map(copyAdversaryTemplate)};
 if(!data.actors.length||data.actors.length>500)throw Error('Choose 1–500 templates.');
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='genesys-adversaries.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function offerAdversaryPlacement(actor){
 authority();const scene=canvas?.scene;if(!scene||!actor)return;
 const choice=await foundry.applications.api.DialogV2.confirm({window:{title:'Place NPC'},content:'<p>Place a hidden token at the centre of the current scene? You can move it with Foundry’s token tools afterwards.</p>',rejectClose:false});
 if(!choice)return;
 authority();if(canvas.scene?.id!==scene.id)throw Error('Scene changed. Place the NPC from Actors.');
 const token=await actor.getTokenDocument({actorLink:false,hidden:true});
 const rect=canvas.dimensions.sceneRect,size=canvas.dimensions.size;
 const raw=token.toObject();delete raw._id;
 raw.x=Math.max(rect.x,rect.x+(rect.width-raw.width*size)/2);raw.y=Math.max(rect.y,rect.y+(rect.height-raw.height*size)/2);
 const [placed]=await scene.createEmbeddedDocuments('Token',[raw]);
 if(!placed)throw Error('Token placement failed. NPC remains in Actors.');
 const add=await foundry.applications.api.DialogV2.confirm({window:{title:'Add to encounter'},content:'<p>Token placed hidden. Add this token as an NPC participant? Initiative is initially zero; roll initiative in the normal encounter controls.</p>',rejectClose:false});
 if(add){authority();await addSceneInitiativeParticipant(placed.actor,'npc','vigilance',scene);}
 return placed;
}
