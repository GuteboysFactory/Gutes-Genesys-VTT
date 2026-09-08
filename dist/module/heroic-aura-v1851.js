const SID='genesys-vtt';
const EFFECTS={allies:'rot-heroic-secondary:empower-allies',enemies:'rot-heroic-secondary:diminish'};
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function stamp(token){return [token.x,token.y,token.elevation,token.width,token.height].map(v=>Number(v??0)).join(':');}
function active(actor,kind){return actor?.system?.heroicAbility?.active===true&&actor.system.heroicAbility.secondaryEffectIds?.includes(EFFECTS[kind]);}
export function auraModifiers(actor,scene=globalThis.canvas?.scene){
 const rows=scene?.getFlag?.(SID,'heroicAuras')??[];
 const tokens=Array.from(scene?.tokens??[]);
 const modifiers=[];
 for(const row of rows){
  const source=tokens.find(t=>t.id===row.sourceId);
  if(!source||!active(source.actor,row.kind)||stamp(source)!==row.sourcePosition)continue;
  if(JSON.stringify(source.actor.getFlag(SID,'heroicTiming')??{})!==row.timing)continue;
  if(!row.targets.some(target=>tokens.some(t=>t.id===target.id&&t.actor?.uuid===actor?.uuid&&stamp(t)===target.position)))continue;
  modifiers.push({id:`heroic:${row.kind==='allies'?'empower-allies':'diminish'}:${source.id}`,priority:10,pool:{add:{[row.kind==='allies'?'boost':'setback']:1}}});
 }
 return modifiers;
}
export async function configureAura(actor,kind){
 if(!game.user?.isGM||game.users.activeGM?.id!==game.user.id)throw Error('Active GM required.');
 if(!EFFECTS[kind]||!active(actor,kind))throw Error('Activate Heroic with the matching Secondary Effect first.');
 const scene=canvas.scene;
 const sources=Array.from(scene?.tokens??[]).filter(t=>t.actor?.uuid===actor.uuid);
 if(sources.length!==1)throw Error('Exactly one token for this character must be on the current scene.');
 const source=sources[0];
 const targets=Array.from(game.user.targets??[]).map(t=>t.document).filter(t=>t?.parent?.id===scene.id&&t.actor&&t.actor.uuid!==actor.uuid);
 const row={sourceId:source.id,kind,sourcePosition:stamp(source),timing:JSON.stringify(actor.getFlag(SID,'heroicTiming')??{}),targets:targets.map(t=>({id:t.id,position:stamp(t)}))};
 const confirmed=await foundry.applications.api.DialogV2.wait({window:{title:kind==='allies'?'Empower Allies':'Diminish'},content:`<p>Confirm these ${kind} are within Short range of ${esc(actor.name)}:</p><p>${targets.map(t=>esc(t.name)).join(', ')||'None — clear targets'}</p><p>Moving tokens or advancing the source turn requires fresh confirmation. Bonuses stop when Heroic ends.</p>`,buttons:[{action:'save',label:'Confirm Range and Side',callback:()=>true},{action:'cancel',label:'Cancel',default:true,callback:()=>false}],rejectClose:false});
 if(confirmed!==true)return false;
 if(!game.user?.isGM||game.users.activeGM?.id!==game.user.id||!active(actor,kind)||stamp(source)!==row.sourcePosition||JSON.stringify(actor.getFlag(SID,'heroicTiming')??{})!==row.timing||targets.some((t,i)=>stamp(t)!==row.targets[i].position))throw Error('State changed. Confirm targets again.');
 const rows=scene.getFlag(SID,'heroicAuras')??[];
 await scene.setFlag(SID,'heroicAuras',[...rows.filter(r=>r.sourceId!==source.id||r.kind!==kind),row]);
 return true;
}
