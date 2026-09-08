const controls={
 'rot-heroic-secondary:renewal':[{id:'renewal',label:'Renewal · Resolve / Retry'}],
 'rot-heroic-secondary:empower-allies':[{id:'allies',label:'Empower Allies · Set Targets'}],
 'rot-heroic-secondary:diminish':[{id:'enemies',label:'Diminish · Set Targets'}],
 'rot-heroic-secondary:drain':[{id:'drain',label:'Drain · Activation'},{id:'drain-turn',label:'Drain · Turn Start'}],
 'rot-heroic-secondary:rejuvenate-allies':[{id:'heal',label:'Rejuvenate Allies · Activation'},{id:'heal-turn',label:'Rejuvenate Allies · Turn Start'}]
};
export function heroicDockControls(actor,options=[]) {
 const ability=actor?.system?.heroicAbility;
 const temporary=(actor?.getFlag?.('genesys-vtt','heroicTemporaryPoints')??[]).filter(row=>!row.spent).length;
 const selected=new Set(ability?.secondaryEffectIds??[]);
 return {
  effectControls:[...(!ability?.active&&ability?.primaryEffectId?[{id:'configure-primary',label:'Primary · Configure'}]:[]), ...(temporary?[{id:'temporary-point',label:`Temporary SP · Spend (${temporary})`}]:[]), ...(ability?.active?[...(ability.primaryEffectId ? [{id:'primary',label:'Primary · Resolve'}] : []), ...(ability.primaryEffectId==='rot-heroic:influential'?[{id:'influential',label:'Influential · Social Strain'}]:[]), ...(ability.primaryEffectId==='rot-heroic:foretelling'&&ability.powerLevel==='supreme'?[{id:'foretelling-copy',label:'Foretelling · Copy NPC Roll'}]:[]), ...(ability.primaryEffectId==='rot-heroic:unleash' ? [{id:'unleash',label:'Unleash · This Round'}, ...(ability.powerLevel==='supreme'?[{id:'unleash-activation',label:'Unleash · Activation'}]:[])] : []), ...[...selected].flatMap(id=>controls[id]??[]).map(row=>({...row}))]:[])],
  customEffects:options.filter(row=>selected.has(row.id)&&row.id.startsWith('custom-heroic:')).map(row=>({label:row.label,description:row.description}))
 };
}
export async function runHeroicDockControl(actor,id) {
 if(!heroicDockControls(actor).effectControls.some(row=>row.id===id))throw Error('This effect is not available on the active Heroic Ability.');
 if(id==='configure-primary')return (await import('./heroic-primary-ui.js')).configurePrimary(actor);
 if(id==='influential')return (await import('./heroic-social.js')).resolveInfluential(actor);
 if(id==='foretelling-copy')return (await import('./heroic-primary-ui.js')).foretellingCopy(actor);
 if(id==='temporary-point')return (await import('./heroic-primary-ui.js')).spendTemporaryPoint(actor);
 if(id.startsWith('unleash'))return (await import('./heroic-unleash.js')).resolveUnleash(actor,id==='unleash-activation');
 if(id==='primary')return (await import('./heroic-primary-ui.js')).resolvePrimary(actor);
 if(id==='renewal')return (await import('./heroic-renewal-ui-v1856.js')).promptRenewal(actor);
 if(['allies','enemies'].includes(id))return (await import('./heroic-aura-v1851.js')).configureAura(actor,id);
 const [kind,phase]=id.split('-');
 return (await import('./heroic-pulse-v1852.js')).applyActivationPulse(actor,kind,phase==='turn'?'turn':'activation');
}
