export const CORE_CONDITIONS = Object.freeze([
    { id: "staggered", label: "Staggered", description: "Cannot perform actions (including downgrading actions to maneuvers)." },
    { id: "immobilized", label: "Immobilized", description: "Cannot perform maneuvers (including maneuvers purchased via strain or Advantage)." },
    { id: "disoriented", label: "Disoriented", description: "Adds one Setback die to all checks." }
]);
export function summarizeConditions(states = []) {
    const active = states.filter((entry) => entry.active !== false);
    return {
        staggered: active.some((entry) => entry.conditionId === "staggered"),
        immobilized: active.some((entry) => entry.conditionId === "immobilized"),
        disoriented: active.some((entry) => entry.conditionId === "disoriented"),
        active
    };
}
export function conditionRules(states = []) {
    const summary = summarizeConditions(states);
    return {
        canPerformActions: !summary.staggered,
        canPerformManeuvers: !summary.immobilized,
        checkModifiers: summary.disoriented
            ? [{ id: "core-condition:disoriented", priority: -2000, pool: { add: { setback: 1 } } }]
            : []
    };
}
export function makeConditionState(conditionId, id, sourceId = `core-condition:${conditionId}`, options = {}) {
    return {
        id,
        conditionId,
        sourceId,
        durationType: options.durationType ?? "manual",
        remaining: Math.max(0, Math.trunc(Number(options.remaining ?? 0))),
        active: true,
        createdAt: Number(options.createdAt ?? Date.now())
    };
}
export function stackConditionDuration(current, additional) {
    if (current.durationType !== "turns")
        return current;
    return { ...current, remaining: Math.max(0, current.remaining + Math.max(0, Math.trunc(additional))) };
}
export function advanceTurnConditionDurations(states = []) {
    return states.flatMap((state) => {
        if (state.active === false || state.durationType !== "turns")
            return [{ ...state }];
        const remaining = Math.max(0, Math.trunc(Number(state.remaining ?? 0)) - 1);
        if (remaining <= 0)
            return [];
        return [{ ...state, remaining }];
    });
}
//# sourceMappingURL=conditions.js.map