import {criticalCheckModifiers} from '../domain/criticals/check-modifiers.js';
import { suppressedCriticals } from '../domain/heroic/primary-effects.js';
import { auraModifiers } from "./heroic-aura-v1851.js";
import { heroicCheckModifiers } from "../domain/heroic/combat-effects.js";
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
    const suppressed=new Set(suppressedCriticals(actor).map(row=>`critical:${row.id}`));
    const rules=conditionRules(getActorConditions(actor).filter(row=>!suppressed.has(row.sourceId)));
    const speed=Number(actor?.getFlag?.('genesys-vtt','consumables')?.speed?.remaining)>0;
    const ignored=new Set(suppressedCriticals(actor).map(i=>i.id));
    const hamstrung=(actor.system?.criticalInjuries??[]).some(i=>i.active!==false&&!i.healed&&!ignored.has(i.id)&&i.total>=71&&i.total<=75);
    const encumbered=globalThis.game?.genesysPhysicalRules?.actorEncumbrance?.(actor)?.losesFreeManeuver;
    return {...rules,maxManeuvers:speed?3:2,freeManeuvers:(speed?2:1)-(hamstrung||encumbered||globalThis.game?.genesysCriticalLifecycle?.losesNextFreeManeuver?.(actor)?1:0)};
}
export function getActorConditionCheckModifiers(actor, check = {}) {
    const base = getActorConditionRules(actor).checkModifiers;
    const delta = getMagicAbilityDelta(actor);
    const magic = delta > 0
        ? [{ id: "magic:augment", priority: 10, pool: { add: { ability: 1 } } }]
        : delta < 0
            ? [{ id: "magic:curse", priority: 10, pool: { remove: { ability: 1 } } }]
            : [];
    return [...base, ...(globalThis.game?.genesysCriticalLifecycle?.criticalRuntimeModifiers?.(actor)??[]), ...(globalThis.game?.genesysArchetypes?.archetypeCheckModifiers?.(actor,check)??[]), ...(globalThis.game?.genesysPhysicalRules?.physicalCheckModifiers?.(actor,check)??[]), ...criticalCheckModifiers(actor.system?.criticalInjuries ?? [], check, suppressedCriticals(actor).map(i=>i.id)), ...magic, ...heroicCheckModifiers(actor?.system?.heroicAbility), ...auraModifiers(actor)];
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
export async function advanceActorTurnConditions(actor, turn = null) {
    const journal = actor.getFlag?.('genesys-vtt', 'conditionTurnJournal');
    const completed = turn && journal?.encounter === turn.encounter ? journal.completed ?? [] : [];
    if (turn && completed.includes(turn.key)) return actorConditions(actor);
    const current = actorConditions(actor);
    const next = advanceTurnConditionDurations(current);
    const changed = JSON.stringify(next) !== JSON.stringify(current);
    if (changed || turn)
        await actor.update({ "system.conditions": next, ...(turn ? {
            "flags.genesys-vtt.conditionTurnJournal": {encounter: turn.encounter, completed: [...completed, turn.key]}
        } : {}) });
    return next;
}
//# sourceMappingURL=condition-service.js.map
