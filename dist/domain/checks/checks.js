import { emptyDicePool } from "../dice/index.js";
import { applyPoolModifiers, buildSkillPool } from "../pool/index.js";
import { prepareStoryPointTransaction } from "../story-points/index.js";
function nonNegativeInteger(value, label) {
    const n = Number(value ?? 0);
    if (!Number.isInteger(n) || n < 0)
        throw new RangeError(`${label} must be a non-negative integer.`);
    return n;
}
function cloneRatings(input) {
    return {
        characteristic: nonNegativeInteger(input.characteristic, "Characteristic rating"),
        skillRank: nonNegativeInteger(input.skillRank, "Skill rank"),
        ...(input.label ? { label: input.label } : {})
    };
}
export function predicateMatches(predicate, context = {}) {
    if (!predicate)
        return true;
    const tags = new Set(context.tags ?? []);
    if (predicate.all?.some((tag) => !tags.has(tag)))
        return false;
    if (predicate.any?.length && !predicate.any.some((tag) => tags.has(tag)))
        return false;
    if (predicate.not?.some((tag) => tags.has(tag)))
        return false;
    return true;
}
function mergePoolPlan(target, source) {
    if (!source)
        return target;
    const add = { ...(target.add ?? {}) };
    const remove = { ...(target.remove ?? {}) };
    for (const [type, value] of Object.entries(source.add ?? {})) {
        add[type] = Number(add[type] ?? 0) + nonNegativeInteger(value, `Add ${type}`);
    }
    for (const [type, value] of Object.entries(source.remove ?? {})) {
        remove[type] = Number(remove[type] ?? 0) + nonNegativeInteger(value, `Remove ${type}`);
    }
    return {
        add,
        remove,
        upgradePositive: Number(target.upgradePositive ?? 0) + nonNegativeInteger(source.upgradePositive, "Positive upgrades"),
        upgradeNegative: Number(target.upgradeNegative ?? 0) + nonNegativeInteger(source.upgradeNegative, "Negative upgrades"),
        downgradePositive: Number(target.downgradePositive ?? 0) + nonNegativeInteger(source.downgradePositive, "Positive downgrades"),
        downgradeNegative: Number(target.downgradeNegative ?? 0) + nonNegativeInteger(source.downgradeNegative, "Negative downgrades")
    };
}
function resolveModifierPlan(base, difficulty, modifiers = [], context = {}, storyPoints) {
    let characteristic = base.characteristic;
    let skillRank = base.skillRank;
    let effectiveDifficulty = nonNegativeInteger(difficulty, "Difficulty");
    let pool = {};
    const appliedModifierIds = [];
    const applicable = [...modifiers]
        .filter((modifier) => predicateMatches(modifier.predicate, context))
        .sort((a, b) => Number(a.priority ?? 0) - Number(b.priority ?? 0) || a.id.localeCompare(b.id));
    for (const modifier of applicable) {
        appliedModifierIds.push(modifier.id);
        if (modifier.characteristicOverride !== undefined)
            characteristic = nonNegativeInteger(modifier.characteristicOverride, `${modifier.id} characteristic override`);
        if (modifier.skillRankOverride !== undefined)
            skillRank = nonNegativeInteger(modifier.skillRankOverride, `${modifier.id} skill rank override`);
        if (modifier.difficultyOverride !== undefined)
            effectiveDifficulty = nonNegativeInteger(modifier.difficultyOverride, `${modifier.id} difficulty override`);
        if (modifier.difficultyDelta !== undefined) {
            const delta = Number(modifier.difficultyDelta);
            if (!Number.isInteger(delta))
                throw new RangeError(`${modifier.id} difficulty delta must be an integer.`);
            effectiveDifficulty = Math.max(0, effectiveDifficulty + delta);
        }
        pool = mergePoolPlan(pool, modifier.pool);
    }
    let pendingStoryPointTransaction;
    if (storyPoints) {
        const spend = storyPoints.spend ?? {};
        pendingStoryPointTransaction = prepareStoryPointTransaction(storyPoints.state, spend, {
            maxPlayerSpend: storyPoints.maxPlayerSpend ?? 1,
            maxGmSpend: storyPoints.maxGmSpend ?? 1
        });
        if (storyPoints.playerSpendUpgradesPositive !== false) {
            pool.upgradePositive = Number(pool.upgradePositive ?? 0) + pendingStoryPointTransaction.spend.player;
        }
        if (storyPoints.gmSpendUpgradesNegative !== false) {
            pool.upgradeNegative = Number(pool.upgradeNegative ?? 0) + pendingStoryPointTransaction.spend.gm;
        }
    }
    return {
        characteristic,
        skillRank,
        difficulty: effectiveDifficulty,
        pool,
        appliedModifierIds,
        pendingStoryPointTransaction
    };
}
function negativePoolFromRatings(ratings) {
    const normalized = cloneRatings(ratings);
    const higher = Math.max(normalized.characteristic, normalized.skillRank);
    const lower = Math.min(normalized.characteristic, normalized.skillRank);
    const pool = emptyDicePool();
    pool.challenge = lower;
    pool.difficulty = higher - lower;
    return pool;
}
function prepareFromBasePool(kind, actor, basePool, difficultyForTrace, input, extra = {}) {
    const normalizedActor = cloneRatings(actor);
    const resolved = resolveModifierPlan(normalizedActor, difficultyForTrace, input.modifiers, input.context, input.storyPoints);
    // Overrides rebuild the positive side. For opposed checks, preserve the audited opponent-derived negative dice.
    const rebuiltPositive = buildSkillPool(resolved.characteristic, resolved.skillRank);
    const effectiveBase = { ...basePool, ability: rebuiltPositive.ability, proficiency: rebuiltPositive.proficiency };
    if (kind === "standard" || kind === "assisted" || kind === "competitive") {
        effectiveBase.difficulty = resolved.difficulty;
        effectiveBase.challenge = 0;
    }
    const construction = applyPoolModifiers(effectiveBase, resolved.pool);
    return {
        kind,
        actor: normalizedActor,
        effective: {
            characteristic: resolved.characteristic,
            skillRank: resolved.skillRank,
            difficulty: resolved.difficulty
        },
        construction,
        appliedModifierIds: resolved.appliedModifierIds,
        ...(resolved.pendingStoryPointTransaction ? { pendingStoryPointTransaction: resolved.pendingStoryPointTransaction } : {}),
        ...extra
    };
}
export function prepareStandardCheck(input) {
    const actor = cloneRatings(input.actor);
    const difficulty = nonNegativeInteger(input.difficulty ?? 0, "Difficulty");
    const base = buildSkillPool(actor.characteristic, actor.skillRank);
    base.difficulty = difficulty;
    return prepareFromBasePool("standard", actor, base, difficulty, input);
}
export function prepareCompetitiveCheck(input) {
    const prepared = prepareStandardCheck(input);
    return { ...prepared, kind: "competitive" };
}
export function prepareOpposedCheck(input) {
    const actor = cloneRatings(input.actor);
    const opponent = cloneRatings(input.opponent);
    const positive = buildSkillPool(actor.characteristic, actor.skillRank);
    const negative = negativePoolFromRatings(opponent);
    const base = { ...positive, difficulty: negative.difficulty, challenge: negative.challenge };
    return prepareFromBasePool("opposed", actor, base, negative.difficulty + negative.challenge, input, { opponent });
}
export function prepareAssistedCheck(input) {
    const actor = cloneRatings(input.actor);
    const assistant = cloneRatings(input.assistant);
    const difficulty = nonNegativeInteger(input.difficulty ?? 0, "Difficulty");
    const extraHelpers = nonNegativeInteger(input.extraHelpers ?? 0, "Extra helpers");
    const maximaSplit = (actor.characteristic > assistant.characteristic && assistant.skillRank > actor.skillRank)
        || (assistant.characteristic > actor.characteristic && actor.skillRank > assistant.skillRank);
    let effectiveActor = actor;
    let assistanceMode = "unskilled";
    const modifiers = [...(input.modifiers ?? [])];
    if (maximaSplit) {
        assistanceMode = "skilled";
        effectiveActor = {
            ...actor,
            characteristic: Math.max(actor.characteristic, assistant.characteristic),
            skillRank: Math.max(actor.skillRank, assistant.skillRank)
        };
    }
    else {
        modifiers.push({ id: "core-assistance-unskilled", priority: -1000, pool: { add: { boost: 1 } } });
    }
    if (extraHelpers > 0) {
        modifiers.push({ id: "core-assistance-extra-helpers", priority: -999, pool: { add: { boost: extraHelpers } } });
    }
    const prepared = prepareStandardCheck({ ...input, actor: effectiveActor, difficulty, modifiers });
    return {
        ...prepared,
        kind: "assisted",
        actor,
        assistant,
        assistanceMode
    };
}
export function resolveCompetitiveResults(entries) {
    if (!entries.length)
        return { winners: [], draw: true, ranking: [] };
    const ranking = entries.map(({ id, result }) => ({
        id,
        success: Number(result.net.success ?? 0),
        triumph: Number(result.net.triumph ?? 0),
        advantage: Number(result.net.advantage ?? 0)
    })).sort((a, b) => b.success - a.success || b.triumph - a.triumph || b.advantage - a.advantage || a.id.localeCompare(b.id));
    const top = ranking[0];
    const winners = ranking
        .filter((entry) => entry.success === top.success && entry.triumph === top.triumph && entry.advantage === top.advantage)
        .map((entry) => entry.id);
    return { winners, draw: winners.length !== 1, ranking };
}
//# sourceMappingURL=checks.js.map