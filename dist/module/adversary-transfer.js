import {copyAdversaryTemplate} from '../domain/adversaries/templates.js';
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
// Explicit placement action; no hidden-token or encounter confirmation chain.
export async function offerAdversaryPlacement(actor, {scene=canvas?.scene,point=null,hidden=false}={}){
 authority();if(!scene||!actor)return;
 if(canvas.scene?.id!==scene.id)throw Error('Scene changed. Place the NPC from Actors.');
 const token=await actor.getTokenDocument({actorLink:false,hidden});
 authority();if(canvas.scene?.id!==scene.id)throw Error('Scene changed. Place the NPC from Actors.');
 const rect=canvas.dimensions.sceneRect,size=canvas.dimensions.size;
 const raw=token.toObject();delete raw._id;
 const center=point??{x:rect.x+rect.width/2,y:rect.y+rect.height/2};
 if(!Number.isFinite(center.x)||!Number.isFinite(center.y))throw Error('Invalid token position.');
 raw.x=Math.max(rect.x,Math.min(rect.x+rect.width-raw.width*size,center.x-raw.width*size/2));
 raw.y=Math.max(rect.y,Math.min(rect.y+rect.height-raw.height*size,center.y-raw.height*size/2));
 const [placed]=await scene.createEmbeddedDocuments('Token',[raw]);
 if(!placed)throw Error('Token placement failed. NPC remains in Actors.');
 return placed;
}
