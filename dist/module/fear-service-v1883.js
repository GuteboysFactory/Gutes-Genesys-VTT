const SID='genesys-vtt';
let profiles=[];
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('The active GM resolves fear.');}
export function terrifyingProfile(actor,definitions=profiles){
 const meta=actor?.flags?.[SID];const id=meta?.adversarySource?.id??meta?.adversaryTemplate?.id;
 return definitions.find(p=>p.id===id && Array.from(actor.items?.contents??actor.items??[]).some(i=>i.flags?.[SID]?.adversaryReference===true && i.system?.notes?.includes(p.reference)))??null;
}
function context(scene){
 const state=game.genesysVtt.initiative.sceneState(scene),id=scene?.getFlag(SID,'ruleEncounterId');
 if(!id||!['collecting','active'].includes(state.status))throw Error('Prepare or start an encounter first.');
 return {state,key:`${scene.id}:${id}`};
}
export function fearRoster(scene){
 const {state,key}=context(scene);
 const rows=state.entries.filter(e=>!e.encounterStatus||e.encounterStatus==='active').map(e=>({...e,actor:game.genesysVtt.initiative.resolveActorRef(e.actorRef)})).filter(e=>e.actor);
 return {key,sources:rows.filter(e=>e.side==='npc').map(e=>({...e,profile:terrifyingProfile(e.actor)})).filter(e=>e.profile),targets:rows.filter(e=>e.side==='pc'&&e.actor.system?.role==='pc')};
}
/** Called inside the authoritative Scene command queue; consequences remain GM choices. */
export async function resolveFearAuthoritative(actor,options,scene){
 authority();const roster=fearRoster(scene);
 if(!options||options.key!==roster.key||options.confirmed!==true)throw Error('Confirm the current fear circumstances.');
 if(!Array.isArray(options.sources)||!options.sources.length||new Set(options.sources).size!==options.sources.length)throw Error('Choose applicable fear sources.');
 if(!roster.targets.some(r=>r.actor===actor))throw Error('Choose an active PC participant.');
 const sources=options.sources.map(ref=>roster.sources.find(s=>s.actorRef===ref));
 if(sources.some(s=>!s))throw Error('Fear source changed. Reopen the panel.');
 const difficulty=Math.max(...sources.map(s=>s.profile.difficulty));
 const previous=actor.getFlag(SID,'fearChecks')??[];
 if(previous.some(r=>r.key===roster.key))throw Error('Fear already resolved for this encounter.');
 for(const key of ['boost','setback'])if(!Number.isSafeInteger(options[key])||options[key]<0||options[key]>10)throw Error('Boost and Setback must be 0–10.');
 const prepared=game.genesysVtt.checks.prepareActorSkill(actor,'discipline',{mode:'standard',difficulty});
 const pool={...prepared.check.construction.pool};pool.boost=(pool.boost??0)+options.boost;pool.setback=(pool.setback??0)+options.setback;
 const result=game.genesysVtt.dice.roll(pool);
 const record={key:roster.key,sources:options.sources,difficulty,pool,result,timestamp:Date.now(),userId:game.user.id};
 authority();await actor.update({[`flags.${SID}.fearChecks`]:[...previous,record]});
 try{await foundry.documents.ChatMessage.create({speaker:{alias:actor.name},content:`<section><strong>Fear · Discipline</strong><p>Difficulty ${difficulty} · Success ${Number(result.net.success)||0} · Advantage ${Number(result.net.advantage)||0} · Triumph ${Number(result.net.triumph)||0} · Despair ${Number(result.net.despair)||0}</p><p>Sources: ${sources.map(s=>esc(s.actor.name)).join(', ')}. GM resolves fear consequences, motivations and narrative effects.</p></section>`});}catch{ui.notifications.warn('Fear roll saved; chat failed. Do not reroll.');}
 return record;
}
export async function openFearPanel(){
 authority();const scene=canvas.scene,roster=fearRoster(scene);
 if(!roster.sources.length)throw Error('No intact supported Terrifying sources among active NPC participants.');
 const content=`<p>Encounter-start Terrifying: one Discipline check against the strongest applicable enemy. Select sources applying to every selected PC. Resolve exempt characters separately (Specter: Dwarves are exempt). Consequences remain GM decisions.</p>${roster.sources.map((s,n)=>`<label style="display:block"><input type="checkbox" data-source="${n}" checked>${esc(s.actor.name)} · Difficulty ${s.profile.difficulty} ${esc(s.profile.exception)}</label>`).join('')}<hr>${roster.targets.map((t,n)=>`<label style="display:block"><input type="checkbox" data-target="${n}">${esc(t.actor.name)}${(t.actor.getFlag(SID,'fearChecks')??[]).some(r=>r.key===roster.key)?' · already resolved':''}</label>`).join('')}<label>Boost<input name="boost" type="number" value="0" min="0" max="10"></label><label>Setback<input name="setback" type="number" value="0" min="0" max="10"></label><label><input name="confirm" type="checkbox">These sources apply to all selected PCs; exceptions and timing checked.</label>`;
 const choice=await foundry.applications.api.DialogV2.wait({window:{title:'Resolve Fear'},content,buttons:[{action:'roll',label:'Roll Fear',callback:(_e,_b,d)=>({sources:[...d.element.querySelectorAll('[data-source]:checked')].map(e=>roster.sources[Number(e.dataset.source)].actorRef),targets:[...d.element.querySelectorAll('[data-target]:checked')].map(e=>roster.targets[Number(e.dataset.target)].actor),boost:Number(d.element.querySelector('[name=boost]').value),setback:Number(d.element.querySelector('[name=setback]').value),confirmed:d.element.querySelector('[name=confirm]').checked,key:roster.key})},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
 if(!choice)return;
 const {resolveSceneFear}=await import('./initiative-service.js');
 for(const actor of choice.targets){if(canvas.scene!==scene)throw Error('Scene changed.');try{await resolveSceneFear(actor,choice,scene);}catch(e){ui.notifications.warn(`${actor.name}: ${e.message}`);}}
}
Hooks.once('ready',async()=>{
 const response=await fetch(`systems/${SID}/data/terrinoth-terrifying.json`);if(!response.ok){ui.notifications.warn('Terrifying profiles unavailable.');return;}profiles=await response.json();
 game.genesysFear={resolveFearAuthoritative,openFearPanel};
});
