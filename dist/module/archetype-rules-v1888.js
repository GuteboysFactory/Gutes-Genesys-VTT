import {REALMS_OF_TERRINOTH_ARCHETYPES} from './content-packs/realms-of-terrinoth-character-creation.js';
const SID='genesys-vtt';let queue=Promise.resolve();
export function hasArchetypeAbility(actor,id){
 const profile=REALMS_OF_TERRINOTH_ARCHETYPES.find(a=>a.id===actor?.system?.profile?.archetype);
 const ability=profile?.abilities.find(a=>a.id===id);
 return Boolean(ability&&(!ability.optional||(game.genesysCreation?.getDraft?.(actor)?.selectedArchetypeAbilityIds??[]).includes(id)));
}
export const hotTempered=actor=>hasArchetypeAbility(actor,'hot-tempered')&&Number(actor.system.strain.value)>Number(actor.system.strain.threshold)/2;
export function archetypeCheckModifiers(actor,check={}){
 return hotTempered(actor)&&['charm','coercion','deception','leadership','negotiation'].includes(check.skillId)?[{id:'archetype:hot-tempered',pool:{add:{setback:2}}}]:[];
}
export function socialTargetModifiers(actor){return hasArchetypeAbility(actor,'stubborn')?[{id:'archetype:stubborn',pool:{add:{setback:1}}}]:[];}
export function archetypeMeleeBonus(actor){return hotTempered(actor)?1:0;}
export function readyForAdventure(actor){
 const result=queue.catch(()=>{}).then(async()=>{
  const authority=()=>{if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');};authority();
  if(!hasArchetypeAbility(actor,'ready-for-adventure'))throw Error('This archetype does not grant Ready for Adventure.');
  const session=game.genesysSession.snapshot();if(!session.active)throw Error('Start the session first.');
  const key=`ready-for-adventure:${actor.uuid}:${session.number}`;
  if(actor.getFlag(SID,'readyForAdventure')?.key===key)throw Error('Ready for Adventure already used this session.');
  await game.genesysStoryPoints.spendRule(key,'gm');authority();
  if(game.genesysSession.snapshot().number!==session.number)throw Error('Session changed during the transfer; reconcile the saved Story Point receipt.');
  await actor.update({[`flags.${SID}.readyForAdventure`]:{key,session:session.number}});return {key};
 });queue=result;return result;
}
export async function openArchetypeAbilities(){
 const actors=[...game.actors].filter(a=>hasArchetypeAbility(a,'ready-for-adventure'));
 if(!actors.length)throw Error('No character with Ready for Adventure.');
 const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const actor=await foundry.applications.api.DialogV2.wait({window:{title:'Ready for Adventure'},content:`<p>Once per session, as an out-of-turn incidental: move one GM Story Point to the player pool.</p><select name="actor">${actors.map((a,i)=>`<option value="${i}">${esc(a.name)}</option>`).join('')}</select>`,buttons:[{action:'use',label:'Use ability',callback:(_e,_b,d)=>actors[Number(d.element.querySelector('[name=actor]').value)]},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});if(actor){await readyForAdventure(actor);ui.notifications.info('Ready for Adventure: one Story Point transferred to players.');}
}
Hooks.once('ready',()=>{game.genesysArchetypes={hasArchetypeAbility,hotTempered,archetypeCheckModifiers,socialTargetModifiers,archetypeMeleeBonus,readyForAdventure,openArchetypeAbilities};});
