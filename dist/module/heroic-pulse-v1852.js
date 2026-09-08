import {prepareActorRoleDamage} from './adversary-service.js';
const SID='genesys-vtt', locks=new Set();
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const gm=()=>game.user?.isGM&&game.users.activeGM?.id===game.user.id;
const position=t=>[t.x,t.y,t.elevation].join(':');
export function pulseUpdate(actor,kind){
 if(kind==='drain')return prepareActorRoleDamage(actor,{strain:2}).update;
 if(kind!=='heal')throw Error('Unknown pulse.');
 const value=Number(actor.system?.strain?.value);
 if(!Number.isFinite(value)||value<0)throw Error('Invalid Strain value.');
 return {'system.strain.value':Math.max(0,value-2)};
}
export async function applyActivationPulse(source,kind){
 if(!gm())throw Error('Active GM required.');
 const effect=kind==='drain'?'rot-heroic-secondary:drain':kind==='heal'?'rot-heroic-secondary:rejuvenate-allies':null;
 if(!effect||!source.system?.heroicAbility?.active||!source.system.heroicAbility.secondaryEffectIds.includes(effect))throw Error('Activate Heroic with this Secondary Effect first.');
 const activation=source.getFlag(SID,'heroicTiming')?.activationId;
 if(!activation)throw Error('This activation predates pulse support. Resolve it manually.');
 if(locks.has(source.uuid))throw Error('Pulse already in progress.');
 locks.add(source.uuid);
 try{
 const scene=canvas.scene;
 const sources=Array.from(scene?.tokens??[]).filter(t=>t.actor?.uuid===source.uuid);
 if(sources.length!==1)throw Error('Exactly one source token is required.');
 const tokens=Array.from(game.user.targets??[]).map(t=>t.document).filter(t=>t.parent?.id===scene.id&&t.actor&&t.actor.uuid!==source.uuid);
 const unique=[...new Map(tokens.map(t=>[t.actor.uuid,t])).values()];
 if(!unique.length)throw Error('Target the affected allies/enemies within Short range.');
 const positions=[sources[0],...unique].map(position);
 const key=`${source.uuid}:${activation}:${kind}`;
 const confirmed=await foundry.applications.api.DialogV2.wait({window:{title:kind==='drain'?'Drain Activation':'Rejuvenate Allies Activation'},content:`<p>Confirm ${kind==='drain'?'enemies suffer 2 Strain (NPC routing applies)':'allies recover 2 Strain'} within Short range:</p><p>${unique.map(t=>esc(t.name)).join(', ')}</p><p>Apply only for this activation. Already processed targets are skipped. Turn-start effects remain manual.</p>`,buttons:[{action:'apply',label:'Confirm and Apply',callback:()=>true},{action:'cancel',label:'Cancel',default:true,callback:()=>false}],rejectClose:false});
 if(confirmed!==true)return false;
 for(const token of unique){
 if(!gm()||!source.system.heroicAbility.active||source.getFlag(SID,'heroicTiming')?.activationId!==activation||[sources[0],...unique].some((t,i)=>position(t)!==positions[i]||!scene.tokens.get(t.id)))throw Error('State changed. Review remaining targets again.');
 const target=token.actor, done=target.getFlag(SID,'heroicPulses')??[];
 if(done.includes(key))continue;
 await target.update({...pulseUpdate(target,kind),[`flags.${SID}.heroicPulses`]:[...done,key]});
 }
 ui.notifications.info('Activation pulse applied. Already processed targets were skipped.');
 return true;
 }finally{locks.delete(source.uuid);}
}
