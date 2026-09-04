import { predicateMatches } from "../checks/index.js";

function nn(value, fallback = 0) {
    const n = Number(value ?? fallback);
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function getPath(source, path) {
    if (!path)
        return undefined;
    return String(path).split(".").reduce((value, key) => value == null ? undefined : value[key], source);
}

function dataPredicateMatches(test, data) {
    const actual = getPath(data, test?.path);
    const expected = test?.value;
    switch (test?.op ?? "eq") {
        case "exists": return actual !== undefined && actual !== null;
        case "truthy": return Boolean(actual);
        case "ne": return actual !== expected;
        case "gt": return Number(actual) > Number(expected);
        case "gte": return Number(actual) >= Number(expected);
        case "lt": return Number(actual) < Number(expected);
        case "lte": return Number(actual) <= Number(expected);
        case "in": return Array.isArray(expected) && expected.includes(actual);
        case "contains": return Array.isArray(actual) ? actual.includes(expected) : String(actual ?? "").includes(String(expected ?? ""));
        default: return actual === expected;
    }
}

export function rulePredicateMatches(predicate, context = {}) {
    if (!predicateMatches(predicate, { tags: context.tags ?? [] }))
        return false;
    const tests = Array.isArray(predicate?.data) ? predicate.data : [];
    return tests.every((test) => dataPredicateMatches(test, context.data ?? {}));
}

export function normalizeRuleCost(cost = {}) {
    return {
        strain: nn(cost.strain),
        wounds: nn(cost.wounds),
        playerStoryPoints: nn(cost.playerStoryPoints),
        gmStoryPoints: nn(cost.gmStoryPoints),
        action: nn(cost.action),
        maneuver: nn(cost.maneuver),
        incidental: nn(cost.incidental)
    };
}

export function validateRuleCost(cost = {}, context = {}) {
    const normalized = normalizeRuleCost(cost);
    const resources = context.resources ?? {};
    const reasons = [];
    if (normalized.playerStoryPoints > 0 && Number(resources.playerStoryPoints ?? -1) < normalized.playerStoryPoints)
        reasons.push("Not enough Player Story Points.");
    if (normalized.gmStoryPoints > 0 && Number(resources.gmStoryPoints ?? -1) < normalized.gmStoryPoints)
        reasons.push("Not enough GM Story Points.");
    if (normalized.action > 0 && Number(resources.actionsRemaining ?? -1) < normalized.action)
        reasons.push("No Action is available.");
    if (normalized.maneuver > 0 && Number(resources.maneuversRemaining ?? -1) < normalized.maneuver)
        reasons.push("No Maneuver is available.");
    if (resources.canSufferStrain === false && normalized.strain > 0)
        reasons.push("Actor cannot suffer the required Strain cost.");
    if (resources.canSufferWounds === false && normalized.wounds > 0)
        reasons.push("Actor cannot suffer the required Wound cost.");
    return { affordable: reasons.length === 0, reasons, cost: normalized };
}

export function normalizeRuleUsage(usage = {}) {
    const limit = nn(usage.limit);
    return {
        limit,
        period: limit > 0 ? String(usage.period ?? "encounter") : "none"
    };
}

export function usageScopeKey(usage, context = {}) {
    const normalized = normalizeRuleUsage(usage);
    if (!normalized.limit || normalized.period === "none")
        return "";
    const scope = context.scope ?? {};
    switch (normalized.period) {
        case "hit": return String(scope.hitId ?? context.data?.hitId ?? "hit");
        case "check": return String(scope.checkId ?? context.data?.checkId ?? "check");
        case "turn": return `${scope.encounterId ?? "encounter"}:r${scope.round ?? 0}:t${scope.turnNumber ?? 0}:${scope.actorRef ?? "actor"}`;
        case "round": return `${scope.encounterId ?? "encounter"}:r${scope.round ?? 0}`;
        case "encounter": return String(scope.encounterId ?? "encounter");
        case "session": return String(scope.sessionId ?? "session");
        default: return `${normalized.period}:${scope.encounterId ?? scope.sessionId ?? "global"}`;
    }
}

export function ruleUsageCount(entries = [], sourceId, ruleId, usage, context = {}) {
    const key = usageScopeKey(usage, context);
    if (!key)
        return 0;
    return entries
        .filter((entry) => entry?.sourceId === sourceId && entry?.ruleId === ruleId && entry?.scopeKey === key)
        .reduce((total, entry) => total + nn(entry.count), 0);
}

export function normalizeRuleElement(raw = {}, index = 0) {
    return {
        id: String(raw.id ?? `rule-${index + 1}`),
        type: String(raw.type ?? "none"),
        timing: String(raw.timing ?? "passive"),
        priority: Number.isFinite(Number(raw.priority)) ? Number(raw.priority) : 0,
        optional: raw.optional !== false,
        predicate: raw.predicate ?? null,
        cost: normalizeRuleCost(raw.cost),
        usage: normalizeRuleUsage(raw.usage),
        effect: { ...(raw.effect ?? {}) },
        metadata: { ...(raw.metadata ?? {}) }
    };
}

export function normalizeTalentDefinition(input = {}) {
    const system = input.system ?? input;
    const rank = clamp(nn(system.rank, 1) || 1, 1, 99);
    const sourceId = String(system.sourceId ?? system.provenance?.sourceId ?? input.sourceId ?? input.id ?? "custom-talent");
    return {
        id: sourceId,
        documentId: input.id ? String(input.id) : "",
        label: String(input.name ?? input.label ?? sourceId),
        tier: clamp(nn(system.tier, 1) || 1, 1, 5),
        ranked: Boolean(system.ranked),
        rank,
        activation: String(system.activation ?? "passive"),
        enabled: system.enabled !== false,
        tags: [...(system.tags ?? [])].map((tag) => String(tag)),
        rules: [...(system.rules ?? [])].map((rule, index) => normalizeRuleElement(rule, index)),
        notes: String(system.notes ?? ""),
        sourceType: String(system.sourceType ?? system.provenance?.sourceType ?? "custom")
    };
}

function rankedNumber(effect, key, rank) {
    const base = Number(effect?.[key] ?? 0);
    const perRank = Number(effect?.[`${key}PerRank`] ?? 0);
    const value = base + perRank * rank;
    return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function expandRuleElement(rule, talent) {
    const normalized = normalizeRuleElement(rule);
    const rank = Math.max(1, nn(talent?.rank, 1));
    const effect = { ...normalized.effect };
    if (effect.amount !== undefined || effect.amountPerRank !== undefined) {
        effect.amount = rankedNumber(effect, "amount", rank);
        delete effect.amountPerRank;
    }
    if (effect.value !== undefined || effect.valuePerRank !== undefined) {
        effect.value = rankedNumber(effect, "value", rank);
        delete effect.valuePerRank;
    }
    return { ...normalized, effect };
}

export function evaluateRuleElement(rule, talent, context = {}, usageEntries = []) {
    const expanded = expandRuleElement(rule, talent);
    if (!talent?.enabled)
        return { eligible: false, reason: "Talent is disabled.", rule: expanded };
    if (expanded.timing !== "any" && expanded.timing !== context.timing)
        return { eligible: false, reason: `Wrong timing window (${context.timing ?? "none"}).`, rule: expanded };
    if (!rulePredicateMatches(expanded.predicate, context))
        return { eligible: false, reason: "Predicate requirements are not met.", rule: expanded };
    const cost = validateRuleCost(expanded.cost, context);
    if (!cost.affordable)
        return { eligible: false, reason: cost.reasons.join(" "), rule: expanded, cost };
    const usage = expanded.usage;
    const used = ruleUsageCount(usageEntries, talent.id, expanded.id, usage, context);
    if (usage.limit > 0 && used >= usage.limit)
        return { eligible: false, reason: `Usage limit reached (${used}/${usage.limit} ${usage.period}).`, rule: expanded, cost, used };
    return { eligible: true, rule: expanded, cost, used };
}

export function getApplicableRuleElements(talents = [], context = {}, usageEntries = []) {
    const rows = [];
    for (const source of talents) {
        const talent = normalizeTalentDefinition(source);
        for (const rule of talent.rules) {
            const evaluation = evaluateRuleElement(rule, talent, context, usageEntries);
            if (evaluation.eligible)
                rows.push({ talent, rule: evaluation.rule, evaluation });
        }
    }
    return rows.sort((a, b) => a.rule.priority - b.rule.priority || a.talent.id.localeCompare(b.talent.id) || a.rule.id.localeCompare(b.rule.id));
}

export function ruleElementToCheckModifier(rule, talent, actor = null) {
    const expanded = expandRuleElement(rule, talent);
    const effect = expanded.effect;
    const modifier = { id: `${talent.id}:${expanded.id}`, priority: expanded.priority };
    switch (expanded.type) {
        case "check.add-die":
            modifier.pool = { add: { [String(effect.die ?? "boost")]: nn(effect.amount, 1) || 1 } };
            break;
        case "check.remove-die":
            modifier.pool = { remove: { [String(effect.die ?? "setback")]: nn(effect.amount, 1) || 1 } };
            break;
        case "check.upgrade-positive":
            modifier.pool = { upgradePositive: nn(effect.amount, 1) || 1 };
            break;
        case "check.upgrade-negative":
            modifier.pool = { upgradeNegative: nn(effect.amount, 1) || 1 };
            break;
        case "check.downgrade-positive":
            modifier.pool = { downgradePositive: nn(effect.amount, 1) || 1 };
            break;
        case "check.downgrade-negative":
            modifier.pool = { downgradeNegative: nn(effect.amount, 1) || 1 };
            break;
        case "check.characteristic-override": {
            const characteristicId = String(effect.characteristicId ?? "");
            const actorValue = actor?.system?.characteristics?.[characteristicId];
            modifier.characteristicOverride = effect.value !== undefined ? nn(effect.value) : nn(actorValue);
            break;
        }
        case "check.skill-rank-override":
            modifier.skillRankOverride = nn(effect.value);
            break;
        case "check.difficulty-delta":
            modifier.difficultyDelta = Number(effect.value ?? 0);
            break;
        case "check.difficulty-override":
            modifier.difficultyOverride = nn(effect.value);
            break;
        default:
            return null;
    }
    return modifier;
}

export function ruleElementToReaction(rule, talent) {
    const expanded = expandRuleElement(rule, talent);
    if (expanded.type !== "reaction")
        return null;
    const reactionId = String(expanded.metadata?.reactionId ?? `${talent.id}:${expanded.id}`);
    return {
        id: reactionId,
        label: talent.rank > 1 ? `${talent.label} ${talent.rank}` : talent.label,
        sourceId: talent.id,
        talentId: talent.id,
        ruleId: expanded.id,
        description: String(expanded.effect.description ?? talent.notes ?? ""),
        timing: expanded.timing,
        optional: expanded.optional,
        predicate: expanded.predicate,
        cost: expanded.cost,
        effect: expanded.effect,
        usage: expanded.usage
    };
}

export function createCoreParryTalent(rank = 1) {
    const normalizedRank = clamp(nn(rank, 1) || 1, 1, 5);
    return normalizeTalentDefinition({
        id: "core-talent:parry",
        name: "Parry",
        system: {
            sourceId: "core-talent:parry",
            sourceType: "genesys-core",
            tier: 1,
            ranked: true,
            rank: normalizedRank,
            activation: "out-of-turn-incidental",
            enabled: true,
            tags: ["combat", "reaction"],
            notes: "When hit by a melee attack while wielding a melee weapon, suffer 3 strain to reduce damage before soak by 2 plus ranks in Parry.",
            rules: [{
                id: "parry-reaction",
                type: "reaction",
                timing: "pre-soak",
                optional: true,
                predicate: { all: ["combat", "attack:melee", "hit", "target:wielding-melee-weapon"] },
                cost: { strain: 3 },
                effect: { type: "reduce-damage", amount: 2, amountPerRank: 1 },
                usage: { limit: 1, period: "hit" },
                metadata: { reactionId: "core-talent:parry" }
            }]
        }
    });
}

export function createTerrinothFinesseTalent() {
    return normalizeTalentDefinition({
        id: "terrinoth-talent:finesse",
        name: "Finesse",
        system: {
            sourceId: "terrinoth-talent:finesse",
            sourceType: "realms-of-terrinoth",
            tier: 1,
            ranked: false,
            rank: 1,
            activation: "incidental",
            enabled: true,
            tags: ["combat", "check-override"],
            notes: "When making a Brawl or Melee (Light) check, may use Agility instead of Brawn.",
            rules: [{
                id: "finesse-check-characteristic",
                type: "check.characteristic-override",
                timing: "before-check-build",
                optional: true,
                predicate: { any: ["skill:brawl", "skill:melee-light"] },
                effect: { characteristicId: "agility" },
                usage: { limit: 0, period: "none" }
            }]
        }
    });
}
