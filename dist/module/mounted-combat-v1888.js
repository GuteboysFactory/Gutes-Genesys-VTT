// Realms of Terrinoth p.83: a scene token relationship; no new Actor class.
const SID='genesys-vtt';
const queues=new Map();
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');}
function enqueue(scene,task){const key=scene.id,job=(queues.get(key)??Promise.resolve()).catch(()=>{}).then(task);queues.set(key,job);return job.finally(()=>{if(queues.get(key)===job)queues.delete(key);});}
function pairs(scene){return scene?.getFlag?.(SID,'mountPairs')??[];}
function token(scene,id){return scene?.tokens?.get(id);}
function incapacitated(actor){
 if(!actor)return true;const s=actor.system;
 return Number(s.wounds?.value)>Number(s.wounds?.threshold)||(['pc','nemesis'].includes(s.role)&&Number(s.strain?.value)>Number(s.strain?.threshold))||(s.criticalInjuries??[]).some(i=>i.active!==false&&!i.healed&&Number(i.total)>=151);
}
export function mountedContext(actor,scene=globalThis.canvas?.scene){
 const matches=[...(scene?.tokens??[])].filter(t=>t.actor?.uuid===actor?.uuid);if(matches.length!==1)return null;
 const t=matches[0],pair=pairs(scene).find(p=>p.riderId===t.id);
 if(!pair||!token(scene,pair.mountId)||incapacitated(token(scene,pair.mountId).actor)||incapacitated(actor))return null;
 return {...pair,mounted:true,mount:token(scene,pair.mountId).actor};
}
export function directedMount(actor,scene=globalThis.canvas?.scene){return pairs(scene).some(p=>token(scene,p.mountId)?.actor?.uuid===actor?.uuid&&mountedContext(token(scene,p.riderId)?.actor,scene));}
export function mountedModifiers(actor,{target,attackMode,magic=false}={},scene=globalThis.canvas?.scene){
 const rider=mountedContext(actor,scene),defender=target&&mountedContext(target,scene);
 if(rider?.modifiers===false)return [];
 if(rider&&(magic||attackMode==='ranged'))return [{id:'mounted:ranged-or-magic',priority:20,pool:{add:{setback:1}}}];
 if(attackMode==='melee'&&target){
  if(rider&&!defender)return [{id:'mounted:height',priority:20,pool:{add:{boost:1}}}];
  if(!rider&&defender&&defender.modifiers!==false)return [{id:'mounted:foot',priority:20,pool:{add:{setback:1}}}];
 }
 return [];
}
export function setMountPair(scene,{riderId,mountId,operation,confirmed,tags=[],modifiers=true}){return enqueue(scene,async()=>{
 authority();if(confirmed!==true)throw Error('Confirm the mounting/dismounting maneuver and situation.');
 const old=pairs(scene),rider=token(scene,riderId);
 if(!rider?.actor)throw Error('Choose a rider token.');
 if(operation==='unlink'){await scene.setFlag(SID,'mountPairs',old.filter(p=>p.riderId!==riderId));return;}
 const mount=token(scene,mountId);if(!mount?.actor||mountId===riderId||mount.actor.uuid===rider.actor.uuid||incapacitated(rider.actor)||incapacitated(mount.actor))throw Error('Choose two different capable characters.');
 if(old.some(p=>[p.riderId,p.mountId].some(id=>id===riderId||id===mountId)))throw Error('A token already belongs to a rider/mount pair. Dismount first.');
 const pair={id:foundry.utils.randomID(),riderId,mountId,tags:tags.filter(t=>['trained','battle-trained','flying'].includes(t)),modifiers:modifiers!==false};
 authority();await scene.setFlag(SID,'mountPairs',[...old,pair]);return pair;
});}
export function reconcileMounts(scene){return enqueue(scene,async()=>{
 authority();const keep=[];
 for(const pair of pairs(scene)){
  const rider=token(scene,pair.riderId),mount=token(scene,pair.mountId);
  if(!rider?.actor||!mount?.actor)continue; // Deleted/transferred tokens unlink without inventing a fall.
  if(incapacitated(mount.actor)){
   const actor=rider.actor,receipts=actor.getFlag(SID,'mountFalls')??[];
   if(!receipts.includes(pair.id)){
    const track=['rival','minion'].includes(actor.system.role)?'wounds':'strain';const value=Number(actor.system[track].value);if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid rider resource.');
    const conditions=[...(actor.system.conditions??[])];if(!conditions.some(c=>c.active!==false&&c.conditionId==='prone'))conditions.push({id:`mount-fall:${pair.id}`,conditionId:'prone',active:true,sourceId:`mount:${pair.id}`,durationType:'manual',remaining:0,createdAt:Date.now()});
    authority();await actor.update({[`system.${track}.value`]:value+3,'system.conditions':conditions,[`flags.${SID}.mountFalls`]:[...receipts,pair.id]});
   }
  }else if(!incapacitated(rider.actor))keep.push(pair);
 }
 if(keep.length!==pairs(scene).length){authority();await scene.setFlag(SID,'mountPairs',keep);}
 return keep;
});}
export async function openMountedCombat(){
 authority();const scene=canvas.scene;if(!scene)throw Error('Open a scene first.');await reconcileMounts(scene);
 const tokens=[...scene.tokens].filter(t=>t.actor);const opts=tokens.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
 const result=await foundry.applications.api.DialogV2.wait({window:{title:'Mounted Combat'},content:`<label>Rider<select name="rider">${opts}</select></label><label>Mount<select name="mount">${opts}</select></label><label><input type="checkbox" name="trained">Trained</label><label><input type="checkbox" name="battle">Battle-trained</label><label><input type="checkbox" name="flying">Flying</label><label><input type="checkbox" name="modifiers" checked>Apply default mounted Boost/Setback (GM decides)</label><label><input type="checkbox" name="confirmed">Mount/dismount maneuver confirmed</label><p>Move the rider token; the mount follows. One rider maneuver directs two movement maneuvers; use a Riding action instead when the GM requires control. The mount shares the rider’s activation and cannot claim its own turn. Targeting the mount requires aimed targeting, subject to GM exceptions. Incapacitated mount: rider falls prone and suffers 3 strain.</p>`,buttons:['link','unlink'].map(operation=>({action:operation,label:operation==='link'?'Mount':'Dismount',callback:(_e,_b,d)=>({operation,riderId:d.element.querySelector('[name=rider]').value,mountId:d.element.querySelector('[name=mount]').value,confirmed:d.element.querySelector('[name=confirmed]').checked,modifiers:d.element.querySelector('[name=modifiers]').checked,tags:[['trained','trained'],['battle','battle-trained'],['flying','flying']].filter(([n])=>d.element.querySelector(`[name=${n}]`).checked).map(([,t])=>t)})})).concat([{action:'cancel',label:'Cancel',callback:()=>null}]),rejectClose:false});
 if(result)await setMountPair(scene,result);
}
function background(task){if(game.user?.isGM&&game.users?.activeGM?.id===game.user.id)void task().catch(e=>ui.notifications.warn(`Mounted combat: ${e.message}`));}
Hooks.on('deleteToken',doc=>background(()=>reconcileMounts(doc.parent)));
Hooks.on('updateActor',()=>background(async()=>{for(const scene of game.scenes)if(pairs(scene).length)await reconcileMounts(scene);}));
Hooks.on('updateToken',(doc,changes,options)=>{
 if(options?.genesysMountFollow||(!('x'in changes)&&!('y'in changes)))return;
 background(()=>enqueue(doc.parent,async()=>{const pair=pairs(doc.parent).find(p=>p.riderId===doc.id),mount=pair&&token(doc.parent,pair.mountId);if(mount){authority();await mount.update({x:doc.x,y:doc.y},{genesysMountFollow:true});}}));
});
Hooks.once('ready',()=>{game.genesysMounts={openMountedCombat,mountedContext,mountedModifiers,directedMount,reconcileMounts,setMountPair};background(async()=>{for(const scene of game.scenes)if(pairs(scene).length)await reconcileMounts(scene);});});
