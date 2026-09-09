// Recovery applies to individuals. Minion-group casualties require explicit GM handling.
export function isRecoveryPatient(actor) {
 return actor?.type==='character' && ['pc','rival','nemesis'].includes(actor.system?.role)
  && !(actor.system.criticalInjuries??[]).some(i=>i.active!==false&&i.healed!==true&&Number(i.total)>=151);
}
export function recoveryPatients(scene) {
 const resolve=game.genesysVtt.initiative.resolveActorRef;
 const state=game.genesysVtt.initiative.sceneState(scene);
 const entries=state.entries??[];
 const rows=new Map(Array.from(game.actors?.contents??[]).map(a=>[a.uuid,{ref:a.uuid,actor:a}]));
 for(const e of entries){const actor=resolve(e.actorRef);if(actor)rows.set(actor.uuid??e.actorRef,{ref:e.actorRef,actor});}
 for(const token of Array.from(scene?.tokens?.contents??[])){const actor=token.actor;if(actor)rows.set(actor.uuid,{ref:actor.uuid,actor});}
 return [...rows.values()].filter(r=>isRecoveryPatient(r.actor)&&!entries.some(e=>e.encounterStatus==='dead'&&resolve(e.actorRef)===r.actor));
}
export function assertRecoveryPatient(actor,scene) {
 if(!isRecoveryPatient(actor))throw Error('Choose a living PC, Rival or Nemesis; minion groups are handled by the GM.');
 const state=game.genesysVtt.initiative.sceneState(scene);
 if((state.entries??[]).some(e=>e.encounterStatus==='dead'&&game.genesysVtt.initiative.resolveActorRef(e.actorRef)===actor))throw Error('A dead participant cannot receive recovery.');
}
const pendingPatients=new Map();
export async function runPatientRecovery(actor,task) {
 const key=actor?.uuid??actor;
 const prior=pendingPatients.get(key)??Promise.resolve();
 const current=prior.catch(()=>{}).then(task);
 pendingPatients.set(key,current);
 try{return await current;}finally{if(pendingPatients.get(key)===current)pendingPatients.delete(key);}
}
