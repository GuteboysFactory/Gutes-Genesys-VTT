export function getTurnRecovery(state,actor,scene) {
 if(state.status!=='active'||!state.activeActorRef||!actor||!scene)return null;
 const encounter=`${scene.id}:${scene.getFlag('genesys-vtt','ruleEncounterId')??''}`;
 const turn=`${state.round}:${state.turnNumber}:${state.activeActivationId}`;
 const key=`${encounter}:${turn}:${state.activeActorRef}`;
 const journal=actor.getFlag('genesys-vtt','conditionTurnJournal');
 const conditionsDone=journal?.encounter===encounter&&journal.completed?.includes(`${turn}:${state.activeActorRef}`);
 const heroicDone=actor.getFlag('genesys-vtt','heroicTiming')?.lastTurn===`${encounter}:${turn}`;
 const concentration=scene.getFlag('genesys-vtt','magicConcentrationJournal');
 const concentrationPending=concentration?.done===false && concentration.encounterId===String(scene.getFlag("genesys-vtt","ruleEncounterId")??"") && concentration.turnKey===`${scene.id}:${state.round}:${state.turnNumber}:${state.activeActorRef}:${state.activeActivationId}`;
 return conditionsDone||heroicDone||concentrationPending?{key,conditionsDone:Boolean(conditionsDone),heroicDone,concentrationPending:Boolean(concentrationPending),actorLabel:state.activeActorLabel}:null;
}
