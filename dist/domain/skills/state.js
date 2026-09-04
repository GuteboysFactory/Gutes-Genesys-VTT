function normalizeRank(value) {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric))
        return 0;
    return Math.min(5, Math.max(0, Math.trunc(numeric)));
}
function asRecord(value) {
    if (!value || typeof value !== "object")
        return null;
    return value;
}
function recoverStateAtIndex(rawState, index, definitions) {
    const record = asRecord(rawState);
    if (!record)
        return null;
    const fallbackId = definitions[index]?.id;
    const id = typeof record.id === "string" && record.id.length > 0 ? record.id : fallbackId;
    if (!id)
        return null;
    return {
        id,
        rank: normalizeRank(record.rank),
        career: Boolean(record.career),
        characteristicOverride: typeof record.characteristicOverride === "string" ? record.characteristicOverride : "",
        sourceId: typeof record.sourceId === "string" && record.sourceId.length > 0 ? record.sourceId : undefined
    };
}
/**
 * Recover persistent skill state from either the intended ArrayField shape or
 * a numeric-key object produced by an over-eager generic form submission.
 * Index fallback is safe for the active published catalog because the sheet
 * writes rows in resolved registry order.
 */
export function coerceSkillStateSnapshot(raw, definitions) {
    if (Array.isArray(raw)) {
        return raw
            .map((entry, index) => recoverStateAtIndex(entry, index, definitions))
            .filter((entry) => Boolean(entry));
    }
    const record = asRecord(raw);
    if (!record)
        return [];
    return Object.keys(record)
        .filter((key) => /^\d+$/.test(key))
        .map((key) => Number(key))
        .sort((a, b) => a - b)
        .map((index) => recoverStateAtIndex(record[String(index)], index, definitions))
        .filter((entry) => Boolean(entry));
}
export function createSkillState(definition) {
    return {
        id: definition.id,
        rank: 0,
        career: false,
        characteristicOverride: "",
        sourceId: definition.provenance.sourceId
    };
}
/**
 * Merge active registry definitions into persistent Actor skill state.
 * Unknown states are retained so profile switching never destroys campaign data.
 */
export function synchronizeSkillStates(existing = [], definitions) {
    const existingById = new Map();
    for (const state of existing) {
        if (typeof state.id === "string" && state.id.length > 0)
            existingById.set(state.id, state);
    }
    const knownIds = new Set();
    const synchronized = definitions.map((definition) => {
        knownIds.add(definition.id);
        const current = existingById.get(definition.id);
        return {
            id: definition.id,
            rank: normalizeRank(current?.rank),
            career: Boolean(current?.career),
            characteristicOverride: typeof current?.characteristicOverride === "string" ? current.characteristicOverride : "",
            sourceId: definition.provenance.sourceId
        };
    });
    for (const state of existing) {
        if (typeof state.id !== "string" || !state.id || knownIds.has(state.id))
            continue;
        synchronized.push({
            id: state.id,
            rank: normalizeRank(state.rank),
            career: Boolean(state.career),
            characteristicOverride: typeof state.characteristicOverride === "string" ? state.characteristicOverride : "",
            sourceId: typeof state.sourceId === "string" && state.sourceId ? state.sourceId : "custom"
        });
    }
    return synchronized;
}
//# sourceMappingURL=state.js.map