import { advanceTurnConditionDurations, conditionRules, makeConditionState, summarizeConditions } from "../domain/conditions/index.js";
import { getMagicAbilityDelta } from "./magic-effect-rules-v1810.js";
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
    const base = getActorConditionRules(actor).checkModifiers;
    const delta = getMagicAbilityDelta(actor);
    const magic = delta > 0
        ? [{ id: "magic:augment", priority: 10, pool: { add: { ability: 1 } } }]
        : delta < 0
            ? [{ id: "magic:curse", priority: 10, pool: { remove: { ability: 1 } } }]
            : [];
    return [...base, ...magic];
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
