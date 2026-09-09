import {isWinded} from '../domain/criticals/strain-restriction.js';
const SID='genesys-vtt';
export async function payManeuver({actor,scene,state,next,capability,write,extraFlags={},costOverride=null,forced=false}){
 const authority=()=>{if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)throw Error('Active GM changed.');};
 authority();let journal=scene.getFlag(SID,'maneuverPayment');
 const key=`${scene.id}:${scene.getFlag(SID,'ruleEncounterId')??''}:${state.round}:${state.turnNumber}:${state.activeActivationId}:${state.turn.maneuversUsed}:${state.turn.actionUsed}->${next.turn.actionUsed}:${next.turn.maneuversUsed}`;
 if(journal?.pending&& (journal.key!==key||journal.actorRef!==actor.uuid))throw Error('Resume the interrupted maneuver before changing the turn.');
 if(!journal?.pending){
  const cost=costOverride??2*Math.max(0,next.turn.maneuversUsed-Math.max(state.turn.maneuversUsed,capability.freeManeuvers??1));
  if(!cost)return write(next,extraFlags);
  if(!forced&&isWinded(actor))throw Error('Winded prevents voluntarily suffering strain for another maneuver.');
  if(!forced&&actor.system.role==='minion')throw Error('Minions cannot voluntarily suffer strain for maneuvers.');
  const track=actor.system.role==='rival'?'wounds':'strain';
  const before=Number(actor.system[track].value);if(!Number.isSafeInteger(before)||before<0)throw Error('Invalid maneuver resource.');
  if(!forced&&(!Number.isFinite(Number(actor.system[track].threshold))||before+cost>Number(actor.system[track].threshold)))throw Error('The additional maneuver would exceed the resource threshold.');
  journal={key,actorRef:actor.uuid,track,cost,before,after:before+cost,pending:true,next,extraFlags};
  await scene.setFlag(SID,'maneuverPayment',journal);
 }
 const receipt=actor.getFlag(SID,'maneuverPayment');
 if(receipt?.key!==journal.key){
  if(Number(actor.system[journal.track].value)!==journal.before)throw Error('Resource changed during interrupted maneuver. Restore/reconcile the recorded value before retrying.');
  authority();await actor.update({[`system.${journal.track}.value`]:journal.after,[`flags.${SID}.maneuverPayment`]:{key:journal.key,cost:journal.cost}});
 }
 authority();return write(journal.next,{...journal.extraFlags,maneuverPayment:{...journal,pending:false}});
}
