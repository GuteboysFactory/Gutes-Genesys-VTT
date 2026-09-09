import {addSupportedAdversaryAbilities} from '../domain/adversaries/supported-abilities.js';
import {copyAdversaryTemplate,copyAdversaryItem,adversaryDraft} from '../domain/adversaries/templates.js';
import {validateAdversaryImage,uploadAdversaryImage} from './adversary-art.js';
import {FORGE_CHARACTERISTICS,prepareAdversary} from '../domain/adversaries/forge.js';
import {getActiveProfileId,getActiveSkillDefinitions,getActorSkillDefinitions} from './skills-service.js';
const SID='genesys-vtt';
let open=false;
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('The active GM creates adversaries.');}
export async function openAdversaryForge({template=null,file=null}={}){
 authority();
 if(open){ui.notifications.info('Adversary Forge is already open.');return null;}
 open=true;
 let previewUrl=null;
 try{
 const base=template?addSupportedAdversaryAbilities(copyAdversaryTemplate(template)):null;
 if(file){validateAdversaryImage(file);previewUrl=URL.createObjectURL(file);}
 const profile=base?.flags['genesys-vtt'].rulesProfile??getActiveProfileId(),definitions=base?getActorSkillDefinitions(base):getActiveSkillDefinitions();
 const equipment=Array.from(game.items?.contents??[]).filter(i=>['weapon','armor','gear','implement','talent','actionTemplate'].includes(i.type));
 let draft={name:'',role:'rival',wounds:10,strain:10,soak:2,melee:0,ranged:0,silhouette:1,adversaryRank:0,members:1,extraActivations:0,...Object.fromEntries(FORGE_CHARACTERISTICS.map(k=>[k,2])),skills:[],itemIds:[]};
 if(base)draft={...adversaryDraft(base),templateItems:base.items.map((_i,n)=>String(n))};
 let error='';
 while(true){
 const number=(k,label,min,max)=>`<label>${label}<input name="${k}" type="number" min="${min}" max="${max}" value="${esc(draft[k])}"></label>`;
 const content=`${base?`<p>Template: ${esc(base.name)} · ${esc(base.flags['genesys-vtt'].adversaryTemplate.origin)}. ${base.items.length} source Items included. Reviewed Regeneration/Second Wind support, when applicable, is included as selectable Talents.</p>`:''}${previewUrl?`<img src="${esc(previewUrl)}" alt="NPC portrait preview" style="width:100px;height:100px;object-fit:contain">`:base?.img?`<img src="${esc(base.img)}" alt="NPC portrait" style="width:100px;height:100px;object-fit:contain">`:''}${file?`<p>Image: ${esc(file.name)} · uploaded when you create the NPC.</p>`:''}${error?`<p role="alert">${esc(error)}</p>`:''}<label>Name<input name="name" maxlength="100" value="${esc(draft.name)}"></label><label>Role<select name="role">${['minion','rival','nemesis'].map(r=>`<option value="${r}" ${draft.role===r?'selected':''}>${r}</option>`).join('')}</select></label><p>Enter NPC statistics from your profile or source. Wounds are per member for Minions. Only Nemeses use Strain Threshold and the optional extra activation.</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${FORGE_CHARACTERISTICS.map(k=>number(k,k,1,6)).join('')}${number('wounds','Wound Threshold',1,100)}${number('strain','Strain Threshold',1,100)}${number('soak','Soak',0,100)}${number('melee','Melee Defense',0,4)}${number('ranged','Ranged Defense',0,4)}${number('silhouette','Silhouette',0,10)}${number('members','Minion members',1,50)}${number('adversaryRank','Adversary rank',0,10)}${number('extraActivations','Nemesis extra activation / round',0,1)}</div><details><summary>Skills · ranks for Rival/Nemesis; group skills for Minions</summary>${definitions.map(d=>{const row=draft.skills.find(s=>s.id===d.id);return `<div style="display:flex;gap:8px;align-items:center"><span style="flex:1">${esc(d.label??d.id)}</span><input aria-label="${esc(d.label??d.id)} rank" data-rank="${esc(d.id)}" type="number" min="0" max="5" value="${esc(row?.rank??0)}" style="width:60px"><label><input type="checkbox" data-group="${esc(d.id)}" ${row?.group?'checked':''}>Group skill</label></div>`;}).join('')}</details>${base?`<details><summary>Template Items · ${base.items.length}</summary>${base.items.map((item,n)=>`<label style="display:block"><input type="checkbox" data-template-item="${n}" ${draft.templateItems.includes(String(n))?'checked':''}>${esc(item.name)} (${esc(item.type)})</label>`).join('')}</details>`:''}<details><summary>Copy Items from world · ${equipment.length}</summary><p>Selected Items become separate copies on the new NPC. Armor does not calculate the entered Soak/Defense for you.</p>${equipment.map(i=>`<label style="display:block"><input type="checkbox" data-item="${esc(i.id)}" ${draft.itemIds.includes(i.id)?'checked':''}>${esc(i.name)} (${esc(i.type)})</label>`).join('')||'<p>No supported world Items. Add equipment on the created sheet.</p>'}</details>`;
 const input=await foundry.applications.api.DialogV2.wait({window:{title:'Adversary Forge',resizable:true},position:{width:680},content,buttons:[{action:'review',label:'Review Adversary',callback:(_e,_b,d)=>{
 const el=d.element;
 return {...Object.fromEntries(Object.keys(draft).filter(k=>!['skills','itemIds','templateItems'].includes(k)).map(k=>[k,el.querySelector(`[name="${k}"]`).value])),skills:definitions.map(row=>({id:row.id,rank:el.querySelector(`[data-rank="${row.id}"]`).value,group:el.querySelector(`[data-group="${row.id}"]`).checked})),...(base?{templateItems:[...el.querySelectorAll('[data-template-item]:checked')].map(e=>e.dataset.templateItem)}:{}),itemIds:[...el.querySelectorAll('[data-item]:checked')].map(e=>e.dataset.item)};
 }},{action:'cancel',label:'Cancel',default:true,callback:()=>null}],rejectClose:false});
 if(!input)return null;
 draft=input;
 let data;
 try{authority();if(!base&&getActiveProfileId()!==profile)throw Error('Rules profile changed. Close and reopen Forge.');data=prepareAdversary(draft,definitions);}catch(e){error=e.message;continue;}
 const folders=Array.from(game.folders?.contents??[]).filter(f=>f.type==='Actor');
 const folderLabel=f=>{const parts=[f.name],seen=new Set([f.id]);let parent=f.folder;while(parent){const id=typeof parent==='string'?parent:parent.id;const row=folders.find(x=>x.id===id);if(!row||seen.has(id))break;seen.add(id);parts.unshift(row.name);parent=row.folder;}return parts.join(' / ');};
 const destination=`<label>Actor folder<select name="actorFolder"><option value="">Actors root</option>${folders.sort((a,b)=>folderLabel(a).localeCompare(folderLabel(b))).map(f=>`<option value="${esc(f.id)}">${esc(folderLabel(f))}</option>`).join('')}</select></label><label>New folder (optional)<input name="newActorFolder" maxlength="100" placeholder="Create inside the selected folder"></label>`;
 const choice=await foundry.applications.api.DialogV2.wait({window:{title:'Review Adversary'},content:`<h3>${esc(data.name)} · ${esc(data.system.role)}</h3><p>${FORGE_CHARACTERISTICS.map(k=>`${esc(k)} ${data.system.characteristics[k]}`).join(' · ')}</p><p>Wounds ${data.system.wounds.threshold}${data.system.role==='minion'?` (${data.system.minionGroup.members} × ${data.system.minionGroup.memberWoundThreshold})`:''} · Strain ${data.system.strain.threshold} · Soak ${data.system.soak} · Defense ${data.system.defense.melee}/${data.system.defense.ranged}</p><p>Adversary ${data.system.adversaryRank} · Activations per round ${1+data.system.extraActivations}</p><p>${data.system.role==='minion'?'Group skills: '+data.system.minionGroup.groupSkillIds.map(esc).join(', '):data.system.skills.filter(s=>s.rank).map(s=>`${esc(s.id)} ${s.rank}`).join(', ')}</p><p>${draft.itemIds.length} Item copies. A new NPC will appear in Foundry Actors. Place its token and add it to the encounter when ready.</p>${destination}`,buttons:[{action:'create',label:'Create NPC',callback:(_e,_b,d)=>({create:true,folder:d.element.querySelector('[name=actorFolder]').value,newFolder:d.element.querySelector('[name=newActorFolder]').value.trim()})},{action:'edit',label:'Back to Edit',default:true,callback:()=>false}],rejectClose:false});
 if(choice==null)return null;
 if(choice!==true&&!choice.create){error='';continue;}
 authority();
 if(!base&&getActiveProfileId()!==profile)throw Error('Rules profile changed. Reopen Forge.');
 const items=draft.itemIds.map(id=>{
 const item=game.items.get(id);
 if(!item||!equipment.some(e=>e.id===id))throw Error('Selected Item is no longer available. Reopen Forge.');
 const raw=item.toObject();
 // Keep native Item data and source provenance, but give each embedded copy a new identity.
 return copyAdversaryItem(raw);
 });
 let folder=choice.folder||null;
 if(folder){const selected=game.folders?.get(folder);if(!selected||selected.type!=='Actor')throw Error('Actor folder is no longer available. Reopen Forge.');}
 if(choice.newFolder){
 const name=String(choice.newFolder).trim();
 if(!name||name.length>100)throw Error('Folder name must contain 1–100 characters.');
 const createdFolder=await foundry.documents.Folder.create({name,type:'Actor',folder,sorting:'a'});
 if(!createdFolder?.id)throw Error('Folder creation failed. No NPC was created.');
 folder=createdFolder.id;
 }
 authority();
 const img=file?await uploadAdversaryImage(file):base?.img;
 authority();
 if(!base&&getActiveProfileId()!==profile)throw Error('Rules profile changed. Reopen Forge.');
 const actor=await foundry.documents.Actor.create({...data,...(img?{img}:{}),system:{...(base?.system??{}),...data.system},folder,items:[...(base?.items??[]).filter((_i,n)=>draft.templateItems.includes(String(n))),...items],ownership:{default:0},prototypeToken:{actorLink:false,...(img?{texture:{src:img}}:{})},flags:{[SID]:{rulesProfile:profile,...(base?{adversarySource:base.flags['genesys-vtt'].adversaryTemplate}:{}),adversaryForge:{version:1,createdAt:Date.now()}}}});
 if(!actor)throw Error('NPC creation did not return an Actor.');
 try{await actor.sheet.render(true);}catch{ui.notifications.warn('NPC saved in Actors; its sheet could not open.');}
 ui.notifications.info(`${actor.name} created.`);
 return actor;
 }
 }finally{if(previewUrl)URL.revokeObjectURL(previewUrl);open=false;}
}

/** Fast template path: same validator and copy rules, without editor/review dialogs. */
export async function createAdversaryFromTemplate(template, {file=null,validateContext=()=>{}}={}) {
 authority();validateContext();
 const base=addSupportedAdversaryAbilities(copyAdversaryTemplate(template));
 const profile=base.flags[SID].rulesProfile;
 const data=prepareAdversary(adversaryDraft(base),getActorSkillDefinitions(base));
 const img=file?await uploadAdversaryImage(file):base.img;
 authority();validateContext();
 if(!game.genesysPortraitTokenForge?.createStandardToken)throw Error('Token Forge is not ready.');
 const tokenImg=await game.genesysPortraitTokenForge.createStandardToken(img||'icons/svg/mystery-man.svg');
 authority();validateContext();
 const actor=await foundry.documents.Actor.create({...data,img,system:{...base.system,...data.system},items:base.items,ownership:{default:0},prototypeToken:{actorLink:false,texture:{src:tokenImg}},flags:{[SID]:{rulesProfile:profile,adversarySource:base.flags[SID].adversaryTemplate,adversaryForge:{version:2,createdAt:Date.now()}}}});
 if(!actor)throw Error('NPC creation failed.');
 return actor;
}
