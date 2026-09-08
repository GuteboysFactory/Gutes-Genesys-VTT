import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
let count=0;
globalThis.__conditionDeps={advanceTurnConditionDurations:rows=>{count++;return rows.map(r=>({...r,remaining:r.remaining-1}));}};
let source=await fs.readFile(new URL('../dist/module/condition-service.js',import.meta.url),'utf8');
source=source.replace(/import \{([^}]+)\} from [^;]+;/g,(_m,names)=>`const {${names}}=globalThis.__conditionDeps;`);
const {advanceActorTurnConditions}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
let journal,fail=false;
const actor={system:{conditions:[{id:'c',remaining:4}]},getFlag:()=>journal,update:async update=>{if(fail)throw Error('offline');actor.system.conditions=update['system.conditions'];journal=update['flags.genesys-vtt.conditionTurnJournal'];}};
const turn={encounter:'scene:enc',key:'1:1:base:pc'};
await advanceActorTurnConditions(actor,turn);assert.equal(actor.system.conditions[0].remaining,3);
// A scene-write failure/reload leaves this actor journal persisted; retry the same turn.
await advanceActorTurnConditions(actor,turn);assert.equal(actor.system.conditions[0].remaining,3);assert.equal(count,1);
const second={...turn,key:'2:1:base:pc'};fail=true;await assert.rejects(advanceActorTurnConditions(actor,second),/offline/);assert.equal(journal.completed.length,1);
fail=false;await advanceActorTurnConditions(actor,second);assert.equal(actor.system.conditions[0].remaining,2);
await advanceActorTurnConditions(actor,turn);assert.equal(actor.system.conditions[0].remaining,2,'rewind must not tick twice');
await advanceActorTurnConditions(actor,{...turn,encounter:'scene:new'});assert.equal(actor.system.conditions[0].remaining,1);assert.equal(journal.completed.length,1);
console.log('PASS: atomic condition tick marker, retry after scene failure, failed actor save, rewind and new encounter');
