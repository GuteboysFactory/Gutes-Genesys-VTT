export function createSceneCommandQueue() {
 const pending=new Map();
 return function enqueue(key,command) {
  const previous=pending.get(key)??Promise.resolve();
  const result=previous.catch(()=>{}).then(command);
  pending.set(key,result);
  const cleanup=()=>{if(pending.get(key)===result)pending.delete(key);};
  result.then(cleanup,cleanup);
  return result;
 };
}
export function nextInitiativeRevision(proposal,current) {
 if((proposal.revision??0)!==(current.revision??0))throw Error('Encounter changed. Review the current turn and try again.');
 return {...proposal,revision:(current.revision??0)+1};
}
