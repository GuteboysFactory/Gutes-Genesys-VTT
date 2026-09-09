import {craftingPlan,resolveCrafting,CRAFT_SPENDS} from '../domain/crafting/crafting.js';
import {runPatientRecovery} from './recovery-patients-v1887.js';
const SID='genesys-vtt';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const clone=v=>JSON.parse(JSON.stringify(v));
function authority(){if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');}
function record(actor){return actor.getFlag(SID,'craftingJob');}
async function save(actor,job,extra={}){authority();await actor.update({...extra,[`flags.${SID}.craftingJob`]:job});}
function item(actor,id){return actor.items.get(id);}
export async function startCrafting(actor,options){return runPatientRecovery(actor,async()=>{
 authority();if(actor?.type!=='character')throw Error('Choose a character.');
 const old=record(actor);if(old&&old.stage!=='complete')throw Error('Resume the unfinished crafting attempt first.');
 if(options?.confirmed!==true)throw Error('Confirm recipe, tools, time and materials.');
 const recipe=game.genesysEquipment.getDefinition('realms-of-terrinoth',options.recipeId);
 if(!recipe||!['weapon','armor','gear'].includes(recipe.itemType)||recipe.system.priceMode==='priceless')throw Error('Choose an ordinary craftable recipe; magical enchantment requires a GM recipe.');
 const plan=craftingPlan({mode:options.mode,rarity:recipe.system.rarity,price:recipe.system.price});
 if(plan.mode==='alchemy'&&!recipe.system.consumable)throw Error('Alchemy requires a consumable recipe.');
 const material=plan.mode==='gather'?null:item(actor,options.materialId);
 if(plan.mode!=='gather'&&(!material||material.type!=='gear'||!Number.isSafeInteger(material.system.quantity)||material.system.quantity<1))throw Error('Choose one available material batch in this character’s gear.');
 // A unit is a GM-approved complete component batch, not one coin or an inferred component.
 const job={id:foundry.utils.randomID(),stage:'materials',recipe:clone(recipe),plan,materialId:material?.id??'',createdAt:Date.now(),gmId:game.user.id,notes:String(options.notes??'').slice(0,1000)};
 await save(actor,job);return resumeLocked(actor);
});}
async function resumeLocked(actor){
 authority();let job=clone(record(actor));if(!job)throw Error('No crafting attempt.');
 if(job.stage==='complete'||job.stage==='spends')return job;
 if(job.stage==='materials'){
  if(job.materialId){
   const material=item(actor,job.materialId);if(!material)throw Error('The committed material batch is missing. Restore it to resume.');
   const receipts=material.getFlag(SID,'craftingConsumption')??[];
   if(!receipts.includes(job.id)){
    const qty=material.system.quantity;if(!Number.isSafeInteger(qty)||qty<1)throw Error('The component batch is no longer available.');
    authority();await material.update({'system.quantity':qty-1,[`flags.${SID}.craftingConsumption`]:[...receipts,job.id]});
   }
  }
  const prepared=game.genesysVtt.checks.prepareActorSkill(actor,job.plan.skill,{mode:'standard',difficulty:job.plan.difficulty});
  const pool=prepared.check.construction.pool;
  const rolled=game.genesysVtt.dice.roll(pool),completed=game.genesysCriticalLifecycle?.prepareRuleCheckResult?.(actor,rolled)??{result:rolled,patch:{}};
  job={...job,pool,result:completed.result,stage:'spends'};
  await save(actor,job,completed.patch);return job;
 }
 if(job.stage==='output'){
  for(let i=0;i<job.output.length;i++){
   const key=`${job.id}:${i}`;
   if([...actor.items].some(it=>it.getFlag(SID,'craftingOutput')===key))continue;
   const data=clone(job.output[i]);data.flags??={};data.flags[SID]??={};data.flags[SID].craftingOutput=key;
   authority();await actor.createEmbeddedDocuments('Item',[data]);
  }
  job={...job,stage:'complete',completedAt:Date.now()};await save(actor,job);
 }
 return job;
}
export function resumeCrafting(actor){return runPatientRecovery(actor,()=>resumeLocked(actor));}
export function finishCrafting(actor,options){return runPatientRecovery(actor,async()=>{
 authority();let job=clone(record(actor));if(!job||job.id!==options?.jobId)throw Error('Crafting attempt changed.');
 if(job.stage==='output'||job.stage==='complete')return resumeLocked(actor);
 if(job.stage!=='spends')throw Error('Resume material consumption first.');
 const recipe=job.recipe;
 const outcome=resolveCrafting(job.plan,job.result,options.spends??[],{confirmed:options.confirmed===true,singleUse:recipe.system.consumable===true||(recipe.system.qualities??[]).some(q=>q.id==='limited-ammo'&&q.rank===1),weapon:recipe.itemType==='weapon',poison:/poison/i.test(recipe.id)});
 if(options.confirmed!==true)throw Error('GM must confirm elapsed time and any remaining symbol consequences.');
 const output=[];
 if(job.plan.mode==='gather'&&outcome.success){output.push({name:`Ingredients: ${recipe.label}`,type:'gear',system:{quantity:1,price:recipe.system.price/2,rarity:Math.ceil(recipe.system.rarity/2),notes:`One batch for ${recipe.label}. Realms of Terrinoth p.114.`},flags:{[SID]:{ingredientRecipe:recipe.id}}});}
 else if(job.plan.mode!=='gather'){
  for(let n=0;n<outcome.quantity;n++){
   const data=game.genesysEquipment.embeddedItemData(recipe,1);
   data.system.encumbrance=Math.max(0,Number(data.system.encumbrance??0)+outcome.encumbranceDelta);
   if(['weapon','armor'].includes(data.type))data.system.hardPoints=Math.max(0,Number(data.system.hardPoints??0)+outcome.hardPointsDelta);
   if(outcome.qualities.length)data.system.qualities=[...(data.system.qualities??[]),...outcome.qualities];
   data.flags[SID].craftingEffects={effects:outcome.effects,source:job.plan.source,notes:String(options.notes??'').slice(0,2000)};
   data.system.notes=[data.system.notes,`Crafted: ${outcome.duration} ${outcome.unit}. Effects: ${outcome.effects.join(', ')||'none'}. ${String(options.notes??'').slice(0,2000)}`].filter(Boolean).join('\n');
   output.push(data);
  }
 }
 // Consequences requiring a fictional target or future check remain explicit in the durable GM record.
 job={...job,stage:'output',outcome,output,adjudication:String(options.notes??'').slice(0,2000)};
 await save(actor,job);return resumeLocked(actor);
});}
export async function openCrafting(){
 authority();const actors=[...game.actors].filter(a=>a.type==='character');
 const recipes=game.genesysEquipment.listDefinitions('realms-of-terrinoth').filter(r=>['weapon','armor','gear'].includes(r.itemType)&&Number.isSafeInteger(r.system.price)&&r.system.priceMode!=='priceless'&&Number.isSafeInteger(r.system.rarity));
 const first=await foundry.applications.api.DialogV2.wait({window:{title:'Crafting / Alchemy'},content:`<label>Character<select name="actor">${actors.map((a,i)=>`<option value="${i}">${esc(a.name)}${record(a)&&record(a).stage!=='complete'?' · unfinished attempt':''}</option>`).join('')}</select></label><p>Resume keeps consumed materials and the saved roll. New attempts use one complete component batch from inventory, even on failure.</p>`,buttons:[{action:'open',label:'Continue',callback:(_e,_b,d)=>actors[Number(d.element.querySelector('[name=actor]').value)]},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
 if(!first)return;const actor=first;
 let job=record(actor);
 if(!job||job.stage==='complete'){
  const materials=[...actor.items].filter(i=>i.type==='gear'&&i.system.quantity>0);
  const choice=await foundry.applications.api.DialogV2.wait({window:{title:`${actor.name} · Recipe`},content:`<label>Process<select name="mode"><option value="craft">Craft · Mechanics · rarity + 1 days</option><option value="alchemy">Brew · Alchemy · rarity + 1 hours</option><option value="gather">Gather ingredients · Survival</option></select></label><label>Recipe<select name="recipe">${recipes.map(r=>`<option value="${esc(r.id)}">${esc(r.label)} · rarity ${r.system.rarity} · materials ${r.system.price/2}</option>`).join('')}</select></label><label>Complete component batch (ignored when gathering)<select name="material">${materials.map(i=>`<option value="${esc(i.id)}">${esc(i.name)} · ${i.system.quantity}</option>`).join('')}</select></label><label><input type="checkbox" name="confirmed">I confirm suitable tools/location and one complete batch worth half the recipe price. Gathering needs no batch.</label><p>For exceptional recipes or modified circumstances, use Custom Check and GM adjudication. This recipe flow uses the printed default difficulty.</p>`,buttons:[{action:'begin',label:'Consume batch and roll',callback:(_e,_b,d)=>({mode:d.element.querySelector('[name=mode]').value,recipeId:d.element.querySelector('[name=recipe]').value,materialId:d.element.querySelector('[name=material]').value,confirmed:d.element.querySelector('[name=confirmed]').checked})},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
  if(!choice)return;job=await startCrafting(actor,choice);
 }else job=await resumeCrafting(actor);
 if(job.stage==='spends'){
  const available=Object.entries(CRAFT_SPENDS).filter(([,s])=>s.modes.includes(job.plan.mode));
  const choice=await foundry.applications.api.DialogV2.wait({window:{title:'Crafting result'},content:`<p>${esc(job.recipe.label)} · ${esc(JSON.stringify(job.result.net))}</p><p>Materials already consumed. Closing preserves this result.</p>${available.map(([id,s])=>{const c=['advantage','threat','triumph','despair'].find(k=>s[k]);return `<label>${esc(id)} · ${s[c]} ${c}${s.repeat?' (repeatable)':''}<input type="number" min="0" max="${s.repeat?20:1}" value="0" name="spend-${id}"><select name="currency-${id}"><option value="${c}">${c}</option>${c==='advantage'?'<option value="triumph">Triumph (1 instead)</option>':c==='threat'?'<option value="despair">Despair (1 instead)</option>':''}</select></label>`;}).join('')}<label>GM consequences / future modifiers / narrative details<textarea name="notes"></textarea></label><label><input type="checkbox" name="confirmed">I confirm symbol choices, any future or narrative effects, and elapsed crafting time.</label>`,buttons:[{action:'finish',label:'Resolve and create Items',callback:(_e,_b,d)=>({jobId:job.id,confirmed:d.element.querySelector('[name=confirmed]').checked,notes:d.element.querySelector('[name=notes]').value,spends:available.flatMap(([id])=>Array.from({length:Math.min(20,Math.max(0,Number(d.element.querySelector(`[name=spend-${id}]`).value)||0))},()=>({id,currency:d.element.querySelector(`[name=currency-${id}]`).value})))})},{action:'cancel',label:'Resume later',callback:()=>null}],rejectClose:false});
  if(!choice)return;job=await finishCrafting(actor,choice);
 }
 if(job.stage==='complete')ui.notifications.info(`Crafting resolved: ${job.outcome.success?'success':'failure'}. ${job.output.length} Item(s) created.`);
}
Hooks.once('ready',()=>{game.genesysCrafting={openCrafting,startCrafting,resumeCrafting,finishCrafting};});
