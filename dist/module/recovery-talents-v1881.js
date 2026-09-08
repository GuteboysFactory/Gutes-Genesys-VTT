import {collectActorTalents} from './talent-service-foundation.js';
export function talentRank(actor, id) {
  return Math.max(0, ...collectActorTalents(actor).filter(t=>t.enabled && t.id===id).map(t=>t.rank));
}
export function encounterRecoveryBonus(actor) {
  const before=Number(actor.system?.strain?.value), threshold=Number(actor.system?.strain?.threshold);
  const desperate=talentRank(actor,'core-talent:desperate-recovery')>0 && Number.isFinite(threshold) && threshold>=0 && before>threshold/2;
  return {amount:desperate?2:0, labels:desperate?['Desperate Recovery +2']:[]};
}
export function apothecaryCare(caregiver) {
  const rank=talentRank(caregiver,'terrinoth-talent:apothecary');
  if(!rank)throw Error('Selected caregiver no longer has enabled Apothecary.');
  return {caregiverId:caregiver.id, caregiverName:String(caregiver.name), rank, bonus:2*rank};
}
