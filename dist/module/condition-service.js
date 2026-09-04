import { advanceTurnConditionDurations, conditionRules, makeConditionState, summarizeConditions } from "../domain/conditions/index.js";
function actorConditions(actor) {
    const raw = actor?.system?.conditions;
    return Array.isArray(raw) ? raw.map((entry) => ({ ...entry })) : [];
}
function id(prefix) {
    const random = foundry?.utils?.randomID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}:${random}`;
}
export function getActorConditions(actor) {
    return actorConditions(actor).filter((entry) => entry.active !== false);
}
export function getActorConditionSummary(actor) {
    return summarizeConditions(getActorConditions(actor));
}
export function getActorConditionRules(actor) {
    return conditionRules(getActorConditions(actor));
}
export function getActorConditionCheckModifiers(actor) {
    return getActorConditionRules(actor).checkModifiers;
}
export async function addActorCondition(actor, conditionId, options = {}) {
    const current = actorConditions(actor);
    const state = makeConditionState(conditionId, id(`condition:${conditionId}`), options.sourceId, {
        durationType: options.durationType,
        remaining: options.remaining
    });
    await actor.update({ "system.conditions": [...current, state] });
    return state;
}
export async function removeActorCondition(actor, conditionStateId) {
    const current = actorConditions(actor);
    const next = current.filter((entry) => entry.id !== conditionStateId);
    await actor.update({ "system.conditions": next });
    return next;
}
export async function removeConditionsBySource(actor, sourceId) {
    const current = actorConditions(actor);
    const next = current.filter((entry) => entry.sourceId !== sourceId);
    if (next.length !== current.length)
        await actor.update({ "system.conditions": next });
    return next;
}
export async function advanceActorTurnConditions(actor) {
    const current = actorConditions(actor);
    const next = advanceTurnConditionDurations(current);
    const changed = JSON.stringify(next) !== JSON.stringify(current);
    if (changed)
        await actor.update({ "system.conditions": next });
    return next;
}
//# sourceMappingURL=condition-service.js.map