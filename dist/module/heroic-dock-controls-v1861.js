const controls={
 'rot-heroic-secondary:renewal':[{id:'renewal',label:'Renewal · Resolve / Retry'}],
 'rot-heroic-secondary:empower-allies':[{id:'allies',label:'Empower Allies · Set Targets'}],
 'rot-heroic-secondary:diminish':[{id:'enemies',label:'Diminish · Set Targets'}],
 'rot-heroic-secondary:drain':[{id:'drain',label:'Drain · Activation'},{id:'drain-turn',label:'Drain · Turn Start'}],
 'rot-heroic-secondary:rejuvenate-allies':[{id:'heal',label:'Rejuvenate Allies · Activation'},{id:'heal-turn',label:'Rejuvenate Allies · Turn Start'}]
};
export function heroicDockControls(actor,options=[]) {
 const ability=actor?.system?.heroicAbility;
 const selected=new Set(ability?.secondaryEffectIds??[]);
 return {
  effectControls:ability?.active?[...selected].flatMap(id=>controls[id]??[]).map(row=>({...row})):[],
  customEffects:options.filter(row=>selected.has(row.id)&&row.id.startsWith('custom-heroic:')).map(row=>({label:row.label,description:row.description}))
 };
}
export async function runHeroicDockControl(actor,id) {
 if(!heroicDockControls(actor).effectControls.some(row=>row.id===id))throw Error('This effect is not available on the active Heroic Ability.');
 if(id==='renewal')return (await import('./heroic-renewal-ui-v1856.js')).promptRenewal(actor);
 if(['allies','enemies'].includes(id))return (await import('./heroic-aura-v1851.js')).configureAura(actor,id);
 const [kind,phase]=id.split('-');
 return (await import('./heroic-pulse-v1852.js')).applyActivationPulse(actor,kind,phase==='turn'?'turn':'activation');
}
