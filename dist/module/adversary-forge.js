import {FORGE_CHARACTERISTICS,prepareAdversary} from '../domain/adversaries/forge.js';
import {getActiveProfileId,getActiveSkillDefinitions} from './skills-service.js';
const SID='genesys-vtt';
let open=false;
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('The active GM creates adversaries.');}
export async function openAdversaryForge(){
 authority();
 if(open){ui.notifications.info('Adversary Forge is already open.');return null;}
 open=true;
 try{
 const profile=getActiveProfileId(),definitions=getActiveSkillDefinitions();
 const equipment=Array.from(game.items?.contents??[]).filter(i=>['weapon','armor','gear','implement','talent','ability','action'].includes(i.type));
 let draft={name:'',role:'rival',wounds:10,strain:10,soak:2,melee:0,ranged:0,silhouette:1,adversaryRank:0,members:1,extraActivations:0,...Object.fromEntries(FORGE_CHARACTERISTICS.map(k=>[k,2])),skills:[],itemIds:[]};
 let error='';
 while(true){
 const number=(k,label,min,max)=>`<label>${label}<input name="${k}" type="number" min="${min}" max="${max}" value="${esc(draft[k])}"></label>`;
 const content=`${error?`<p role="alert">${esc(error)}</p>`:''}<label>Name<input name="name" maxlength="100" value="${esc(draft.name)}"></label><label>Role<select name="role">${['minion','rival','nemesis'].map(r=>`<option value="${r}" ${draft.role===r?'selected':''}>${r}</option>`).join('')}</select></label><p>Enter NPC statistics from your profile or source. Wounds are per member for Minions. Only Nemeses use Strain Threshold and the optional extra activation.</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${FORGE_CHARACTERISTICS.map(k=>number(k,k,1,6)).join('')}${number('wounds','Wound Threshold',1,100)}${number('strain','Strain Threshold',1,100)}${number('soak','Soak',0,100)}${number('melee','Melee Defense',0,4)}${number('ranged','Ranged Defense',0,4)}${number('silhouette','Silhouette',0,10)}${number('members','Minion members',1,50)}${number('adversaryRank','Adversary rank',0,10)}${number('extraActivations','Nemesis extra activation / round',0,1)}</div><details><summary>Skills · ranks for Rival/Nemesis; group skills for Minions</summary>${definitions.map(d=>{const row=draft.skills.find(s=>s.id===d.id);return `<div style="display:flex;gap:8px;align-items:center"><span style="flex:1">${esc(d.label??d.id)}</span><input aria-label="${esc(d.label??d.id)} rank" data-rank="${esc(d.id)}" type="number" min="0" max="5" value="${esc(row?.rank??0)}" style="width:60px"><label><input type="checkbox" data-group="${esc(d.id)}" ${row?.group?'checked':''}>Group skill</label></div>`;}).join('')}</details><details><summary>Copy Items from world · ${equipment.length}</summary><p>Selected Items become separate copies on the new NPC. Armor does not calculate the entered Soak/Defense for you.</p>${equipment.map(i=>`<label style="display:block"><input type="checkbox" data-item="${esc(i.id)}" ${draft.itemIds.includes(i.id)?'checked':''}>${esc(i.name)} (${esc(i.type)})</label>`).join('')||'<p>No supported world Items. Add equipment on the created sheet.</p>'}</details>`;
 const input=await foundry.applications.api.DialogV2.wait({window:{title:'Adversary Forge',resizable:true},position:{width:680},content,buttons:[{action:'review',label:'Review Adversary',callback:(_e,_b,d)=>{
 const el=d.element;
 return {...Object.fromEntries(Object.keys(draft).filter(k=>!['skills','itemIds'].includes(k)).map(k=>[k,el.querySelector(`[name="${k}"]`).value])),skills:definitions.map(row=>({id:row.id,rank:el.querySelector(`[data-rank="${row.id}"]`).value,group:el.querySelector(`[data-group="${row.id}"]`).checked})),itemIds:[...el.querySelectorAll('[data-item]:checked')].map(e=>e.dataset.item)};
 }},{action:'cancel',label:'Cancel',default:true,callback:()=>null}],rejectClose:false});
 if(!input)return null;
 draft=input;
 let data;
 try{authority();if(getActiveProfileId()!==profile)throw Error('Rules profile changed. Close and reopen Forge.');data=prepareAdversary(draft,definitions);}catch(e){error=e.message;continue;}
 const choice=await foundry.applications.api.DialogV2.wait({window:{title:'Review Adversary'},content:`<h3>${esc(data.name)} · ${esc(data.system.role)}</h3><p>${FORGE_CHARACTERISTICS.map(k=>`${esc(k)} ${data.system.characteristics[k]}`).join(' · ')}</p><p>Wounds ${data.system.wounds.threshold}${data.system.role==='minion'?` (${data.system.minionGroup.members} × ${data.system.minionGroup.memberWoundThreshold})`:''} · Strain ${data.system.strain.threshold} · Soak ${data.system.soak} · Defense ${data.system.defense.melee}/${data.system.defense.ranged}</p><p>Adversary ${data.system.adversaryRank} · Activations per round ${1+data.system.extraActivations}</p><p>${data.system.role==='minion'?'Group skills: '+data.system.minionGroup.groupSkillIds.map(esc).join(', '):data.system.skills.filter(s=>s.rank).map(s=>`${esc(s.id)} ${s.rank}`).join(', ')}</p><p>${draft.itemIds.length} Item copies. A new NPC will appear in Foundry Actors. Place its token and add it to the encounter when ready.</p>`,buttons:[{action:'create',label:'Create NPC',callback:()=>true},{action:'edit',label:'Back to Edit',default:true,callback:()=>false}],rejectClose:false});
 if(choice==null)return null;
 if(choice!==true){error='';continue;}
 authority();
 if(getActiveProfileId()!==profile)throw Error('Rules profile changed. Reopen Forge.');
 const items=draft.itemIds.map(id=>{
 const item=game.items.get(id);
 if(!item||!equipment.some(e=>e.id===id))throw Error('Selected Item is no longer available. Reopen Forge.');
 const raw=item.toObject();
 // Keep native Item data and source provenance, but give each embedded copy a new identity.
 return {name:raw.name,type:raw.type,img:raw.img,system:structuredClone(raw.system),flags:structuredClone(raw.flags??{}),effects:structuredClone(raw.effects??[])};
 });
 const actor=await foundry.documents.Actor.create({...data,items,ownership:{default:0},prototypeToken:{actorLink:false},flags:{[SID]:{rulesProfile:profile,adversaryForge:{version:1,createdAt:Date.now()}}}});
 if(!actor)throw Error('NPC creation did not return an Actor.');
 try{await actor.sheet.render(true);}catch{ui.notifications.warn('NPC saved in Actors; its sheet could not open.');}
 ui.notifications.info(`${actor.name} created.`);
 return actor;
 }
 }finally{open=false;}
}
