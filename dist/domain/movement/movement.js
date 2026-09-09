export function disengagementPlan({grapple=false,tumble=false,tumbleAvailable=false,maneuversUsed=0,maxManeuvers=2}){
 if(grapple&&tumble)throw Error('Grapple requires two maneuvers; Tumble cannot bypass it.');
 if(tumble&&!tumbleAvailable)throw Error('Tumble is unavailable or already used this round.');
 const maneuvers=tumble?0:grapple?2:1;
 if(maneuversUsed+maneuvers>maxManeuvers)throw Error('Not enough maneuvers remain to disengage.');
 return {maneuvers,strain:tumble?2:0,clearAll:true};
}
