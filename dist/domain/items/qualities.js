const core = (id, label, ranked, mode, automation = "deferred") => ({
    id,
    label,
    ranked,
    mode,
    automation,
    provenance: { sourceId: "genesys-core", sourceType: "core" }
});
export const CORE_QUALITY_DEFINITIONS = Object.freeze([
    core("accurate", "Accurate", true, "passive", "check"),
    core("auto-fire", "Auto-Fire", false, "active"),
    core("blast", "Blast", true, "active"),
    core("breach", "Breach", true, "passive"),
    core("burn", "Burn", true, "active"),
    core("concussive", "Concussive", true, "active"),
    core("cumbersome", "Cumbersome", true, "passive"),
    core("defensive", "Defensive", true, "passive"),
    core("deflection", "Deflection", true, "passive"),
    core("disorient", "Disorient", true, "active"),
    core("ensnare", "Ensnare", true, "active"),
    core("guided", "Guided", true, "active"),
    core("inaccurate", "Inaccurate", true, "passive", "check"),
    core("inferior", "Inferior", false, "passive"),
    core("knockdown", "Knockdown", false, "active"),
    core("limited-ammo", "Limited Ammo", true, "passive"),
    core("linked", "Linked", true, "active"),
    core("pierce", "Pierce", true, "passive"),
    core("prepare", "Prepare", true, "passive"),
    core("reinforced", "Reinforced", false, "passive"),
    core("slow-firing", "Slow-Firing", true, "passive"),
    core("stun", "Stun", true, "active"),
    core("stun-damage", "Stun Damage", false, "passive"),
    core("sunder", "Sunder", false, "active"),
    core("superior", "Superior", false, "passive"),
    core("tractor", "Tractor", true, "active"),
    core("unwieldy", "Unwieldy", true, "passive"),
    core("vicious", "Vicious", true, "passive")
]);
const QUALITY_BY_ID = new Map(CORE_QUALITY_DEFINITIONS.map((definition) => [definition.id, definition]));
const QUALITY_ID_BY_LABEL = new Map(CORE_QUALITY_DEFINITIONS.map((definition) => [definition.label.toLowerCase(), definition.id]));
function normalizeRank(value) {
    const n = Number(value ?? 1);
    if (!Number.isFinite(n))
        return 1;
    return Math.max(1, Math.trunc(n));
}
export function getQualityDefinition(id) {
    return QUALITY_BY_ID.get(String(id ?? "").trim().toLowerCase());
}
export function normalizeQualityStates(input = []) {
    const combined = new Map();
    for (const entry of input) {
        const id = String(entry?.id ?? "").trim().toLowerCase();
        const definition = QUALITY_BY_ID.get(id);
        if (!definition)
            continue;
        const rank = definition.ranked ? normalizeRank(entry.rank) : 1;
        combined.set(id, definition.ranked ? Math.max(combined.get(id) ?? 0, rank) : 1);
    }
    return [...combined.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, rank]) => ({ id, rank }));
}
export function parseQualityText(text) {
    const entries = [];
    const unknown = [];
    for (const rawPart of String(text ?? "").split(",")) {
        const part = rawPart.trim();
        if (!part)
            continue;
        const match = part.match(/^(.*?)(?:\s+(\d+))?$/);
        const label = String(match?.[1] ?? part).trim();
        const rawRank = match?.[2];
        const normalizedKey = label.toLowerCase();
        const id = QUALITY_BY_ID.has(normalizedKey) ? normalizedKey : QUALITY_ID_BY_LABEL.get(normalizedKey);
        const definition = id ? QUALITY_BY_ID.get(id) : undefined;
        if (!definition) {
            unknown.push(part);
            continue;
        }
        entries.push({ id: definition.id, rank: definition.ranked ? normalizeRank(rawRank ?? 1) : 1 });
    }
    return { qualities: normalizeQualityStates(entries), unknown };
}
export function formatQualityText(input = []) {
    return normalizeQualityStates(input).map((entry) => {
        const definition = QUALITY_BY_ID.get(entry.id);
        if (!definition)
            return entry.id;
        return definition.ranked ? `${definition.label} ${entry.rank}` : definition.label;
    }).join(", ");
}
export function qualityCheckModifiers(input = []) {
    const qualities = normalizeQualityStates(input);
    const modifiers = [];
    for (const quality of qualities) {
        if (quality.id === "accurate") {
            modifiers.push({
                id: `quality:accurate:${quality.rank}`,
                label: `Accurate ${quality.rank}`,
                priority: -100,
                pool: { add: { boost: quality.rank } }
            });
        }
        if (quality.id === "inaccurate") {
            modifiers.push({
                id: `quality:inaccurate:${quality.rank}`,
                label: `Inaccurate ${quality.rank}`,
                priority: -100,
                pool: { add: { setback: quality.rank } }
            });
        }
    }
    return modifiers;
}
//# sourceMappingURL=qualities.js.map