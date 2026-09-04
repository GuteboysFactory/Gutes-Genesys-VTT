import { predicateMatches } from "../checks/index.js";
function count(value, label) {
    const n = Number(value ?? 0);
    if (!Number.isInteger(n) || n < 0)
        throw new RangeError(`${label} must be a non-negative integer.`);
    return n;
}
export function normalizeReactionCost(cost = {}) {
    return {
        strain: count(cost.strain, "Reaction strain cost"),
        wounds: count(cost.wounds, "Reaction wound cost"),
        playerStoryPoints: count(cost.playerStoryPoints, "Reaction player Story Point cost"),
        gmStoryPoints: count(cost.gmStoryPoints, "Reaction GM Story Point cost")
    };
}
export function evaluateReaction(reaction, context, usedReactionIds = []) {
    if (reaction.timing !== context.timing)
        return { reaction, eligible: false, reason: `Wrong timing window (${context.timing}).` };
    if (usedReactionIds.includes(reaction.id) && reaction.usage?.period === "hit") {
        return { reaction, eligible: false, reason: "Already used for this hit." };
    }
    if (!predicateMatches(reaction.predicate, { tags: context.tags, data: context.data })) {
        return { reaction, eligible: false, reason: "Predicate requirements are not met." };
    }
    return { reaction, eligible: true };
}
export function getEligibleReactions(reactions, context, usedReactionIds = []) {
    return reactions
        .map((reaction) => evaluateReaction(reaction, context, usedReactionIds))
        .filter((entry) => entry.eligible)
        .map((entry) => entry.reaction);
}
export function toAppliedReaction(reaction) {
    return {
        id: reaction.id,
        label: reaction.label,
        ...(reaction.sourceId ? { sourceId: reaction.sourceId } : {}),
        timing: reaction.timing,
        cost: normalizeReactionCost(reaction.cost),
        effect: reaction.effect
    };
}
export function createCoreParryReaction(rank) {
    const normalizedRank = Math.max(1, count(rank, "Parry rank"));
    return {
        id: "core-talent:parry",
        label: `Parry ${normalizedRank}`,
        sourceId: "core-talent:parry",
        description: `Reduce damage by ${2 + normalizedRank} before soak is applied.`,
        timing: "pre-soak",
        optional: true,
        predicate: { all: ["combat", "attack:melee", "hit", "target:wielding-melee-weapon"] },
        cost: { strain: 3 },
        effect: { type: "reduce-damage", amount: 2 + normalizedRank },
        usage: { limit: 1, period: "hit" }
    };
}
export function formatReactionCost(cost = {}) {
    const normalized = normalizeReactionCost(cost);
    const parts = [];
    if (normalized.strain)
        parts.push(`${normalized.strain} Strain`);
    if (normalized.wounds)
        parts.push(`${normalized.wounds} Wounds`);
    if (normalized.playerStoryPoints)
        parts.push(`${normalized.playerStoryPoints} Player Story Point${normalized.playerStoryPoints === 1 ? "" : "s"}`);
    if (normalized.gmStoryPoints)
        parts.push(`${normalized.gmStoryPoints} GM Story Point${normalized.gmStoryPoints === 1 ? "" : "s"}`);
    return parts.length ? parts.join(" + ") : "None";
}
//# sourceMappingURL=reactions.js.map