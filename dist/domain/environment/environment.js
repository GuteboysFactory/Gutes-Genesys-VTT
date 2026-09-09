export const CONCEALMENT=Object.freeze([{level:1,examples:'Mist, shadows, low vegetation'},{level:2,examples:'Fog, dim light, tall vegetation'},{level:3,examples:'Dense smoke, night, dense undergrowth'}]);
export const FALLS=Object.freeze({short:{damage:10,strain:10},medium:{damage:30,strain:20},long:{threshold:true,strain:30,criticalModifier:50},extreme:{threshold:true,strain:40,criticalModifier:75}});
export function environmentalOutcome({kind,range='short',rating=1,soak=0,wounds=0,woundThreshold,strain=0,strainThreshold,success=0,advantage=0,role='pc'}){
 for(const v of [rating,soak,wounds,woundThreshold,strain,strainThreshold,success,advantage])if(!Number.isSafeInteger(v)||v<0)throw Error('Invalid environmental inputs.');
 let woundDelta=0,strainDelta=0,criticalModifier=null;
 if(kind==='fall'){
  const fall=FALLS[range];if(!fall)throw Error('Unknown fall range.');
  woundDelta=fall.threshold?Math.max(0,woundThreshold+1-wounds):Math.max(0,fall.damage-soak-success);
  strainDelta=Math.max(0,fall.strain-advantage);criticalModifier=fall.criticalModifier??null;
 }else if(kind==='fire'||kind==='acid')woundDelta=rating;
 else if(kind==='suffocation'){strainDelta=3;if(strain>strainThreshold)criticalModifier=0;}
 else if(kind==='vacuum'){woundDelta=3;if(wounds>woundThreshold)criticalModifier=0;}
 else throw Error('Unknown environmental hazard.');
 if(['rival','minion'].includes(role)){woundDelta+=strainDelta;strainDelta=0;}
 const afterWounds=Math.min(woundThreshold*2,wounds+woundDelta),afterStrain=strain+strainDelta;
 if(criticalModifier===null&&['pc','nemesis'].includes(role)&&wounds<=woundThreshold&&afterWounds>woundThreshold)criticalModifier=0;
 if(role==='minion')criticalModifier=null;
 return {wounds:afterWounds,strain:afterStrain,woundDelta,strainDelta,criticalModifier,participantStatusChange:false};
}
