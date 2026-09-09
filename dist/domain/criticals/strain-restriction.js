import {suppressedCriticals} from '../heroic/primary-effects.js';
export function isWinded(actor) {
 const suppressed=new Set(suppressedCriticals(actor).map(i=>i.id));
 return (actor?.system?.criticalInjuries??[]).some(i=>i.active!==false&&i.healed!==true&&!suppressed.has(i.id)&&Number(i.total)>=81&&Number(i.total)<=85);
}
