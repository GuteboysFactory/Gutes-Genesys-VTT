// Native document events supply the requesting user, never a payload userId.
export function createInitiativeTransport(deps) {
 const pending=new Map(),seen=new Set();
 const settle=(id,error,result)=>{const p=pending.get(id);if(!p)return;pending.delete(id);clearTimeout(p.timer);error?p.reject(Error(error)):p.resolve(result);};
 return {
  request(request) {
   const gm=deps.gm();
   if(!gm) return Promise.reject(Error('An active GM is required for encounter commands.'));
   const id=deps.id();
   return new Promise((resolve,reject)=>{
    const entry={resolve,reject,gm,timer:setTimeout(()=>settle(id,'No GM response. Check the encounter before trying again.'),15000)};
    pending.set(id,entry);
    Promise.resolve().then(()=>deps.create({...request,id,gm})).catch(error=>settle(id,error.message));
   });
  },
  async created(message,userId) {
   const request=message.request;
   if(!request || !deps.authority() || request.gm!==deps.userId() || seen.has(message.id))return;
   seen.add(message.id);
   // No startup scan or replay; retain IDs for this connection's lifetime.
   const snapshot=structuredClone(request);
   let reply;
   try {reply={id:snapshot.id,ok:true,result:await deps.execute(snapshot,userId)};}
   catch(error){reply={id:snapshot.id,ok:false,error:error.message};}
   try {await deps.reply(message,reply);}catch(error){deps.warn('Encounter request processed but reply failed. Check the current encounter before retrying.');}
  },
  updated(reply,userId) {
   const p=pending.get(reply?.id);
   if(!p || userId!==p.gm)return;
   settle(reply.id,reply.ok?null:reply.error,reply.result);
  }
 };
}
export function authorizeInitiativeCommand(name,user,actor,args) {
 if(!user?.active)throw Error('Requesting user is no longer connected.');
 if(user.isGM)return;
 const allowed=['consumeSceneEncounterAction','rollActorInitiative','claimSceneInitiativeSlot','claimSceneInitiativeActivation','useSceneTurnAction','useSceneTurnManeuver','endSceneInitiativeTurn'];
 if(!allowed.includes(name))throw Error('GM command required.');
 if(!actor?.testUserPermission?.(user,'OWNER'))throw Error('Actor ownership required.');
 if(name==='rollActorInitiative'&&args[1]!=='pc')throw Error('Players may roll PC initiative only.');
}
