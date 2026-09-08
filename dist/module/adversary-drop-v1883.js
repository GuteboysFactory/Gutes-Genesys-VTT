import {openAdversaryLibrary,requireAdversaryGM} from './adversary-library.js';
import {createAdversaryFromTemplate} from './adversary-forge.js';
import {offerAdversaryPlacement} from './adversary-transfer.js';
import {validateAdversaryImage} from './adversary-art.js';
let pending=false;
export function acceptsForgeDrop(event, view=globalThis.canvas) {
 return Boolean(game.user?.isGM && game.users?.activeGM?.id===game.user.id && view?.ready && view.activeLayer===view.tokens && !event.shiftKey && Array.from(event.dataTransfer?.items??[]).some(i=>i.kind==='file'&&['image/png','image/jpeg','image/webp'].includes(i.type)));
}
export async function completeForgeDrop(template,file,scene,point) {
 const validateContext=()=>{requireAdversaryGM();if(canvas.scene?.id!==scene.id)throw Error('Scene changed. Drop the image again on the intended scene.');};
 validateContext();
 const actor=await createAdversaryFromTemplate(template,{file,validateContext});
 try{validateContext();return await offerAdversaryPlacement(actor,{scene,point,hidden:false});}
 catch(error){
  // Only our newly created Actor is eligible for cleanup, never a source or existing NPC.
  if(game.user?.isGM&&game.users?.activeGM?.id===game.user.id){try{await actor.delete();}catch{ui.notifications.warn(`${actor.name} remains in Actors; placement failed.`);}}
  else ui.notifications.warn(`${actor.name} remains in Actors. The controlling GM changed.`);
  throw error;
 }
}
Hooks.once('ready',()=>{
 document.addEventListener('dragover',event=>{if(event.target===(canvas.app?.canvas??canvas.app?.view) && acceptsForgeDrop(event)){event.preventDefault();event.dataTransfer.dropEffect='copy';}},true);
 document.addEventListener('drop',event=>{
  if(event.target!==(canvas.app?.canvas??canvas.app?.view) || !acceptsForgeDrop(event))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(pending){ui.notifications.info('Finish the current Forge placement first.');return;}
  const files=Array.from(event.dataTransfer.files??[]);
  if(files.length!==1){ui.notifications.warn('Drop one portrait at a time.');return;}
  const file=files[0];try{validateAdversaryImage(file);}catch(e){ui.notifications.warn(e.message);return;}
  const scene=canvas.scene,point=canvas.canvasCoordinatesFromClient({x:event.clientX,y:event.clientY});
  pending=true;
  // DOM preview avoids attaching arbitrary containers to Foundry render groups.
  const preview=document.createElement('img'),url=URL.createObjectURL(file);
  preview.src=url;preview.alt='Pending Forge token';Object.assign(preview.style,{position:'fixed',left:`${event.clientX-40}px`,top:`${event.clientY-40}px`,width:'80px',height:'80px',objectFit:'contain',pointerEvents:'none',zIndex:'100',opacity:'0.7'});document.body.append(preview);
  const cleanup=()=>{preview.remove();URL.revokeObjectURL(url);pending=false;};
  void openAdversaryLibrary({file,onSelect:(raw,image)=>completeForgeDrop(raw,image,scene,point),onClose:cleanup}).catch(e=>{cleanup();ui.notifications.warn(e.message);});
 },true);
});
