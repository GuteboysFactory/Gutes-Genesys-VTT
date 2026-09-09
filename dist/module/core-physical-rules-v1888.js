import {resolveDefenseSources} from '../domain/equipment/defense.js';
import {encumbranceState} from '../domain/equipment/encumbrance.js';
const SID='genesys-vtt';
export function actorEncumbrance(actor){
 const items=[...(actor?.items??[])];
 const bonus=items.reduce((n,item)=>n+(item.system?.equipped&&item.getFlag?.(SID,'contentId')==='backpack'?4:0),0)+Number(actor?.getFlag?.(SID,'encumbranceBonus')??0);
 return encumbranceState({brawn:globalThis.game?.genesysCriticalLifecycle?.effectiveCharacteristic?.(actor,"brawn",actor?.system?.characteristics?.brawn)??actor?.system?.characteristics?.brawn,bonus,items:items.filter(i=>['weapon','armor','gear','implement'].includes(i.type)).map(i=>({type:i.type,...i.system,carried:i.getFlag?.(SID,'carried')!==false,reference:i.getFlag?.(SID,'adversaryReference')===true}))});
}
export function physicalCheckModifiers(actor,check={}){
 const enc=actorEncumbrance(actor);
 return enc.overage>0&&['brawn','agility'].includes(check.characteristicId)?[{id:'core:encumbrance',priority:30,pool:{add:{setback:enc.overage}}}]:[];
}
export function actorDefense(actor,axis,stored=Number(actor.system.defense?.[axis]??0)){
 const sources=[{label:actor.system.role==='pc'?'Character defense':'Printed NPC defense',kind:'provide',value:stored}];
 // NPC profiles already include equipment and talents; do not add them a second time.
 if(actor.system.role==='pc')for(const item of actor.items??[]){
  if(!item.system.equipped||Number(actor.getFlag?.(SID,'itemDamage')?.[item.id]??0)>=3)continue;
  if(item.type==='armor')sources.push({label:item.name,kind:'provide',value:Number(item.system.defense??0)});
  if(item.type==='weapon')for(const q of item.system.qualities??[])if(q.id===(axis==='melee'?'defensive':'deflection'))sources.push({label:`${item.name}: ${q.id}`,kind:'increase',value:Number(q.rank??1)});
 }
 for(const source of actor.getFlag?.(SID,'defenseSources')?.[axis]??[])sources.push(source);
 return resolveDefenseSources(sources);
}
export function brawnSoakUpdate(actor,changes){
 const brawn=changes['system.characteristics.brawn']??changes['system.characteristics']?.brawn??changes.system?.characteristics?.brawn;
 const explicit=changes['system.soak']??changes.system?.soak;
 if(brawn!==undefined&&explicit===undefined&&Number.isFinite(Number(brawn))){
  const delta=Number(brawn)-Number(actor.system.characteristics.brawn);
  if(delta)changes['system.soak']=Math.max(0,Number(actor.system.soak)+delta);
 }
 return changes;
}
Hooks.on('preUpdateActor',(actor,changes)=>{if(actor.type==='character')brawnSoakUpdate(actor,changes);});
Hooks.once('ready',()=>{game.genesysPhysicalRules={actorEncumbrance,physicalCheckModifiers,actorDefense};});
