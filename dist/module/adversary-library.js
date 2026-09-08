import {copyAdversaryTemplate} from '../domain/adversaries/templates.js';
import {getActorProfileId} from './skills-service.js';
import {openAdversaryForge} from './adversary-forge.js';
import {validateAdversaryImage} from './adversary-art.js';
const SID='genesys-vtt',PACK='world.genesys-adversary-templates',CUSTOM='world.genesys-my-adversaries';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
let initializing=null,dialog=null,opening=false;
export function requireAdversaryGM(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('The active GM manages Adversary Forge.');}
Hooks.once('init',()=>game.settings.register(SID,'adversaryLibrarySeeded',{scope:'world',config:false,type:Boolean,default:false}));
async function createPack(name,label){
 requireAdversaryGM();
 return foundry.documents.collections.CompendiumCollection.createCompendium({name,label,type:'Actor',system:SID,ownership:{PLAYER:'NONE',TRUSTED:'NONE',ASSISTANT:'OWNER'}});
}
export async function ensureAdversaryLibrary(){
 requireAdversaryGM();
 if(initializing)return initializing;
 initializing=(async()=>{
  let pack=game.packs.get(PACK),fresh=!pack;
  if(!pack)pack=await createPack('genesys-adversary-templates','Genesys · Terrinoth & Everyday NPCs');
  if(fresh||!game.settings.get(SID,'adversaryLibrarySeeded')){
   if(pack.locked)throw Error('Unlock the Genesys adversary compendium to finish installing templates.');
   const rows=(await Promise.all(['terrinoth-adversaries','everyday-adversaries'].map(async name=>{
    const response=await fetch(`systems/${SID}/data/${name}.json`);if(!response.ok)throw Error('Could not load adversary templates.');return response.json();
   }))).flat();
   const index=await pack.getIndex();
   const missing=rows.filter(row=>!index.has(row._id));
   requireAdversaryGM();
   if(missing.length)await foundry.documents.Actor.createDocuments(missing,{pack:pack.collection,keepId:true});
   await game.settings.set(SID,'adversaryLibrarySeeded',true);
  }
  return pack;
 })();
 try{return await initializing;}finally{initializing=null;}
}
export async function saveAdversaryTemplate(actor){
 requireAdversaryGM();
 const data=copyAdversaryTemplate(actor);data.flags[SID].rulesProfile=getActorProfileId(actor);
 data.flags[SID].adversaryTemplate={id:`custom:${foundry.utils.randomID()}`,origin:'Custom Genesys',category:'My templates',revision:1};
 let pack=game.packs.get(CUSTOM);if(!pack)pack=await createPack('genesys-my-adversaries','Genesys · My Adversary Templates');
 if(pack.locked)throw Error('Unlock My Adversary Templates before saving.');
 requireAdversaryGM();
 const saved=await foundry.documents.Actor.create(data,{pack:pack.collection});
 if(!saved)throw Error('Template could not be saved.');
 return saved;
}
export async function openAdversaryLibrary({file=null}={}){
 requireAdversaryGM();if(file)validateAdversaryImage(file);
 if(dialog||opening){ui.notifications.info('Adversary Library is already open.');return;}
 opening=true;
 try{await ensureAdversaryLibrary();}catch(e){opening=false;throw e;}
 opening=false;
 const el=document.createElement('dialog');dialog=el;el.className='genesys-adversary-library';
 el.innerHTML=`<header><h2>Adversary Library</h2><button type="button" data-close aria-label="Close">×</button></header><p>Choose a template or drop a PNG, JPEG or WebP image on its card.</p><div class="adversary-toolbar"><input data-search aria-label="Search templates" placeholder="Search names, creatures, professions…"><select data-role aria-label="Role"><option value="">All roles</option><option>minion</option><option>rival</option><option>nemesis</option></select><select data-source aria-label="Source"><option value="">All sources</option><option>Realms of Terrinoth</option><option>Custom Genesys</option><option>World Actors</option></select><select data-category aria-label="Category"><option value="">All categories</option></select></div><div class="adversary-toolbar"><button type="button" data-image>Choose image</button><input type="file" data-file accept="image/png,image/jpeg,image/webp" hidden><span data-image-name></span><button type="button" data-clear-image>Clear image</button><button type="button" data-blank>Create from scratch</button><button type="button" data-refresh>Refresh</button></div><div class="adversary-toolbar"><select data-actor aria-label="World Actor to save as template"></select><button type="button" data-save>Save Actor as template</button></div><p data-status role="status"></p><main data-cards></main>`;
 document.body.append(el);
 let rows=[],busy=false,pending=file,closed=false,refreshing=false;
 const query=selector=>el.querySelector(selector);
 const status=text=>{query('[data-status]').textContent=text;};
 const showFile=()=>{query('[data-image-name]').textContent=pending?pending.name:'No image selected';};showFile();
 const hooks=[];
 const close=()=>{if(closed)return;closed=true;for(const [name,id] of hooks)Hooks.off(name,id);el.close();el.remove();if(dialog===el)dialog=null;};
 el.addEventListener('cancel',event=>{event.preventDefault();close();});query('[data-close]').onclick=close;
 function render(){
  const term=query('[data-search]').value.toLowerCase(),role=query('[data-role]').value,source=query('[data-source]').value,category=query('[data-category]').value;
  const visible=rows.filter(r=>(!role||r.actor.system.role===role)&&(!source||r.origin===source)&&(!category||r.category===category)&&`${r.actor.name} ${r.aliases} ${r.category}`.toLowerCase().includes(term));
  query('[data-cards]').innerHTML=visible.map(r=>`<button type="button" class="adversary-card" data-key="${esc(r.key)}"><img src="${esc(r.actor.img||'icons/svg/mystery-man.svg')}" alt="" loading="lazy"><strong>${esc(r.actor.name)}</strong><span>${esc(r.actor.system.role)} · ${esc(r.category)}</span><small>${esc(r.origin)}${r.page?` · p. ${r.page}`:''}</small></button>`).join('');
  status(`${visible.length} of ${rows.length} templates and NPCs. Special abilities and spells are documented on reference Items; resolve manual effects as GM.`);
 }
 async function refresh(){
  if(refreshing||closed)return;refreshing=true;
  try{
   const packs=[game.packs.get(PACK),game.packs.get(CUSTOM)].filter(Boolean);
   const docs=(await Promise.all(packs.map(p=>p.getDocuments()))).flat();
   const worlds=Array.from(game.actors?.contents??[]).filter(a=>a.type==='character'&&['minion','rival','nemesis'].includes(a.system.role));
   rows=[...docs,...worlds].map((actor,n)=>{const meta=actor.flags?.[SID]?.adversaryTemplate??{};return {key:String(n),actor,origin:worlds.includes(actor)?'World Actors':meta.origin||'Custom Genesys',category:meta.category||'My templates',page:meta.page,aliases:meta.aliases||''};});
   if(closed)return;
   const category=query('[data-category]').value;
   query('[data-category]').innerHTML='<option value="">All categories</option>'+[...new Set(rows.map(r=>r.category))].sort().map(c=>`<option>${esc(c)}</option>`).join('');query('[data-category]').value=category;
   query('[data-actor]').innerHTML='<option value="">Choose world NPC…</option>'+worlds.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');render();
  }catch(e){if(!closed)status(e.message);}finally{refreshing=false;}
 }
 async function launch(template,image){
  if(busy)return;busy=true;
  try{requireAdversaryGM();if(image)validateAdversaryImage(image);const raw=template?template.toObject():null;if(raw)raw.flags={...raw.flags,[SID]:{...raw.flags?.[SID],rulesProfile:getActorProfileId(template)}};close();await openAdversaryForge({template:raw,file:image});}
  catch(e){ui.notifications.warn(e.message);}finally{busy=false;}
 }
 query('[data-cards]').onclick=event=>{const card=event.target.closest('[data-key]');if(card)void launch(rows.find(r=>r.key===card.dataset.key)?.actor,pending);};
 for(const selector of ['[data-search]','[data-role]','[data-source]','[data-category]'])query(selector).addEventListener('input',render);
 query('[data-refresh]').onclick=refresh;
 query('[data-image]').onclick=()=>query('[data-file]').click();
 query('[data-file]').onchange=()=>{try{pending=validateAdversaryImage(query('[data-file]').files[0]);showFile();}catch(e){status(e.message);}};
 query('[data-clear-image]').onclick=()=>{pending=null;showFile();};
 query('[data-blank]').onclick=()=>launch(null,pending);
 el.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
 el.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();const image=e.dataTransfer.files[0];try{validateAdversaryImage(image);const card=e.target.closest('[data-key]');if(card)void launch(rows.find(r=>r.key===card.dataset.key)?.actor,image);else{pending=image;showFile();status('Image selected. Choose a template.');}}catch(error){status(error.message);}});
 query('[data-save]').onclick=async()=>{if(busy)return;const actor=game.actors.get(query('[data-actor]').value);if(!actor){status('Choose an NPC first.');return;}busy=true;try{await saveAdversaryTemplate(actor);await refresh();status(`${actor.name} saved as an independent template.`);}catch(e){status(e.message);}finally{busy=false;}};
 for(const name of ['createActor','updateActor','deleteActor','updateCompendium'])hooks.push([name,Hooks.on(name,()=>void refresh())]);
 el.showModal();await refresh();
}
