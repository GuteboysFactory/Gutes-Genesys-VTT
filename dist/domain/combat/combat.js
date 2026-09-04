import { normalizeActorRole, normalizeMinionGroup, routeDamageForActorRole, silhouetteDifficultyModifier } from "../adversaries/index.js";
import { normalizeWeaponRuleData, prepareWeaponAttack } from "../items/index.js";
import { normalizeReactionCost, toAppliedReaction } from "../reactions/index.js";
const RANGE_ORDER = ["engaged", "short", "medium", "long", "extreme"];
const CLOSE_SKILLS = new Set(["brawl", "melee", "melee-light", "melee-heavy"]);
const RANGED_SKILLS = new Set(["ranged", "ranged-light", "ranged-heavy", "gunnery"]);
function nn(value) {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}
function capDefense(value) {
    return Math.min(4, nn(value));
}
export function resolveAttackMode(weapon) {
    if (weapon.attackMode === "melee" || weapon.attackMode === "ranged")
        return weapon.attackMode;
    if (CLOSE_SKILLS.has(weapon.skillId))
        return "melee";
    if (RANGED_SKILLS.has(weapon.skillId))
        return "ranged";
    return weapon.range === "engaged" ? "melee" : "ranged";
}
export function resolveEngagedProfile(weapon) {
    if (weapon.engagedProfile && weapon.engagedProfile !== "auto")
        return weapon.engagedProfile;
    if (weapon.skillId === "ranged-light")
        return "one-handed";
    if (weapon.skillId === "ranged-heavy" || weapon.skillId === "ranged")
        return "two-handed";
    if (weapon.skillId === "gunnery")
        return "heavy";
    return "none";
}
export function resolveDamageCharacteristic(weapon) {
    const value = String(weapon.damageCharacteristic ?? "auto");
    if (value === "none")
        return null;
    if (value !== "auto" && value)
        return value;
    return CLOSE_SKILLS.has(weapon.skillId) ? "brawn" : null;
}
export function getAttackDifficulty(weaponInput, targetRange) {
    const weapon = normalizeWeaponRuleData(weaponInput);
    const attackMode = resolveAttackMode(weapon);
    const engagedProfile = resolveEngagedProfile(weapon);
    const maxRangeIndex = RANGE_ORDER.indexOf(weapon.range);
    const targetRangeIndex = RANGE_ORDER.indexOf(targetRange);
    if (targetRangeIndex < 0)
        throw new RangeError(`Unknown range band: ${targetRange}`);
    if (targetRangeIndex > maxRangeIndex) {
        return { allowed: false, difficulty: 0, attackMode, defenseType: attackMode, engagedProfile, reason: "Target is beyond the weapon's maximum range." };
    }
    if (attackMode === "melee") {
        if (targetRange !== "engaged") {
            return { allowed: false, difficulty: 2, attackMode, defenseType: "melee", engagedProfile, reason: "Melee/Brawl attacks require Engaged range." };
        }
        return { allowed: true, difficulty: 2, attackMode, defenseType: "melee", engagedProfile };
    }
    const rangedBase = { engaged: 1, short: 1, medium: 2, long: 3, extreme: 4 };
    let difficulty = rangedBase[targetRange];
    if (targetRange === "engaged") {
        if (engagedProfile === "heavy") {
            return { allowed: false, difficulty, attackMode, defenseType: "ranged", engagedProfile, reason: "This heavy ranged weapon cannot be used while engaged." };
        }
        if (engagedProfile === "one-handed")
            difficulty += 1;
        if (engagedProfile === "two-handed")
            difficulty += 2;
    }
    return { allowed: true, difficulty, attackMode, defenseType: "ranged", engagedProfile };
}
export function prepareCombatWeaponAttack(input) {
    const weapon = normalizeWeaponRuleData(input.weapon);
    const difficulty = getAttackDifficulty(weapon, input.targetRange);
    if (!difficulty.allowed)
        throw new RangeError(difficulty.reason ?? "Attack is not allowed.");
    const defense = capDefense(difficulty.defenseType === "melee" ? input.target.meleeDefense : input.target.rangedDefense);
    const silhouette = silhouetteDifficultyModifier(input.actor.silhouette ?? 1, input.target.silhouette ?? 1);
    const baseDifficulty = Math.max(0, difficulty.difficulty + silhouette.difficultyDelta);
    const adversaryRank = nn(input.target.adversaryRank);
    const modifiers = [
        ...(adversaryRank ? [{ id: `core-adversary:${adversaryRank}`, priority: -100, pool: { upgradeNegative: adversaryRank } }] : []),
        ...(defense ? [{ id: `core-defense:${difficulty.defenseType}:${defense}`, priority: -50, pool: { add: { setback: defense } } }] : []),
        ...(input.modifiers ?? [])
    ];
    const preparedWeaponAttack = prepareWeaponAttack({
        weaponName: input.weaponName,
        weapon,
        actor: input.actor,
        difficulty: baseDifficulty,
        modifiers,
        contextTags: [
            "combat",
            `target-range:${input.targetRange}`,
            `defense:${difficulty.defenseType}`,
            `silhouette-attacker:${silhouette.attacker}`,
            `silhouette-target:${silhouette.target}`,
            `adversary:${adversaryRank}`,
            ...(input.contextTags ?? [])
        ]
    });
    return {
        preparedWeaponAttack,
        target: {
            role: normalizeActorRole(input.target.role),
            minionGroup: input.target.minionGroup ? {
                members: nn(input.target.minionGroup.members),
                memberWoundThreshold: nn(input.target.minionGroup.memberWoundThreshold),
                groupSkillIds: [...(input.target.minionGroup.groupSkillIds ?? [])]
            } : undefined,
            soak: nn(input.target.soak),
            woundsValue: nn(input.target.woundsValue),
            woundsThreshold: nn(input.target.woundsThreshold),
            strainValue: nn(input.target.strainValue),
            strainThreshold: nn(input.target.strainThreshold),
            meleeDefense: capDefense(input.target.meleeDefense),
            rangedDefense: capDefense(input.target.rangedDefense),
            silhouette: nn(input.target.silhouette ?? 1),
            adversaryRank
        },
        targetRange: input.targetRange,
        rangeDifficulty: difficulty.difficulty,
        silhouetteDifficultyDelta: silhouette.difficultyDelta,
        baseDifficulty,
        adversaryRank,
        defense,
        attackMode: difficulty.attackMode,
        damageCharacteristicValue: nn(input.actor.damageCharacteristicValue)
    };
}
function qualityRank(weapon, id) {
    return weapon.qualities.find((quality) => quality.id === id)?.rank ?? 0;
}
export function resolveCombatAttack(prepared, result) {
    return finalizePendingCombatResolution(createPendingCombatResolution(prepared, result));
}
function recomputePending(pending) {
    const damageBeforeSoak = Math.max(0, pending.originalDamage - pending.preSoakDamageReduction);
    const afterSoakBeforeReaction = pending.hit ? Math.max(0, damageBeforeSoak - pending.effectiveSoak) : 0;
    const damageAfterSoak = Math.max(0, afterSoakBeforeReaction - pending.postSoakDamageReduction);
    const criticalEligible = pending.hit && damageAfterSoak > 0 && pending.criticalRating > 0;
    return {
        ...pending,
        damageBeforeSoak,
        damageAfterSoak,
        criticalEligible,
        criticalActivationsByAdvantage: criticalEligible ? Math.floor(pending.advantage / pending.criticalRating) : 0,
        criticalTriumphsAvailable: criticalEligible ? pending.triumph : 0
    };
}
export function createPendingCombatResolution(prepared, result) {
    const weapon = prepared.preparedWeaponAttack.weapon;
    const success = nn(result.net.success);
    const advantage = nn(result.net.advantage);
    const triumph = nn(result.net.triumph);
    const despair = nn(result.net.despair);
    const hit = success > 0;
    const baseDamage = nn(weapon.damage) + prepared.damageCharacteristicValue;
    const grossDamage = hit ? baseDamage + success : 0;
    const pierce = qualityRank(weapon, "pierce");
    const breach = qualityRank(weapon, "breach");
    const effectiveSoak = Math.max(0, nn(prepared.target.soak) - pierce - breach * 10);
    const damageTrack = qualityRank(weapon, "stun-damage") > 0 ? "strain" : "wounds";
    const criticalRating = nn(weapon.critical);
    const pending = {
        status: "pending",
        hit,
        success,
        advantage,
        triumph,
        despair,
        baseDamage,
        grossDamage,
        originalDamage: grossDamage,
        damageBeforeSoak: grossDamage,
        preSoakDamageReduction: 0,
        postSoakDamageReduction: 0,
        soak: nn(prepared.target.soak),
        effectiveSoak,
        pierce,
        breach,
        damageAfterSoak: 0,
        damageTrack,
        criticalEligible: false,
        criticalRating,
        criticalActivationsByAdvantage: 0,
        criticalTriumphsAvailable: 0,
        appliedReactions: [],
        result
    };
    return recomputePending(pending);
}
export function applyReactionToPendingCombat(pending, reaction) {
    if (pending.status !== "pending")
        throw new Error("Combat resolution is no longer pending.");
    if (pending.appliedReactions.some((entry) => entry.id === reaction.id) && reaction.usage?.period === "hit") {
        throw new Error(`${reaction.label} has already been used for this hit.`);
    }
    const applied = toAppliedReaction(reaction);
    let next = { ...pending, appliedReactions: [...pending.appliedReactions, applied] };
    if (reaction.effect.type === "reduce-damage") {
        if (reaction.timing !== "pre-soak")
            throw new Error("reduce-damage reactions must resolve in the pre-soak window.");
        next = { ...next, preSoakDamageReduction: next.preSoakDamageReduction + nn(reaction.effect.amount) };
    }
    else if (reaction.effect.type === "reduce-post-soak-damage") {
        if (reaction.timing !== "pre-commit")
            throw new Error("reduce-post-soak-damage reactions must resolve in the pre-commit window.");
        next = { ...next, postSoakDamageReduction: next.postSoakDamageReduction + nn(reaction.effect.amount) };
    }
    else if (reaction.effect.type !== "none") {
        throw new Error(`Reaction effect ${reaction.effect.type} cannot be applied to an already-rolled combat resolution.`);
    }
    return recomputePending(next);
}
export function finalizePendingCombatResolution(pending) {
    const final = recomputePending(pending);
    const { status: _status, originalDamage: _originalDamage, preSoakDamageReduction: _pre, postSoakDamageReduction: _post, ...resolution } = final;
    return resolution;
}
export function reactionCostTotals(pending) {
    return pending.appliedReactions.reduce((total, reaction) => {
        const cost = normalizeReactionCost(reaction.cost);
        total.strain += cost.strain;
        total.wounds += cost.wounds;
        total.playerStoryPoints += cost.playerStoryPoints;
        total.gmStoryPoints += cost.gmStoryPoints;
        return total;
    }, { strain: 0, wounds: 0, playerStoryPoints: 0, gmStoryPoints: 0 });
}
export function buildCombatCommitPlan(prepared, pending) {
    const resolution = finalizePendingCombatResolution(pending);
    const reactionCost = reactionCostTotals(pending);
    let woundDamage = reactionCost.wounds;
    let strainDamage = reactionCost.strain;
    if (resolution.hit && resolution.damageAfterSoak > 0) {
        if (resolution.damageTrack === "strain")
            strainDamage += resolution.damageAfterSoak;
        else
            woundDamage += resolution.damageAfterSoak;
    }
    const targetRole = normalizeActorRole(prepared.target.role);
    const routed = routeDamageForActorRole(targetRole, woundDamage, strainDamage);
    woundDamage = routed.wounds;
    strainDamage = routed.strain;
    let wounds;
    let minionGroup;
    if (woundDamage > 0) {
        if (targetRole === "minion" && prepared.target.minionGroup) {
            const beforeGroup = normalizeMinionGroup({
                ...prepared.target.minionGroup,
                wounds: prepared.target.woundsValue
            });
            const afterGroup = normalizeMinionGroup({
                ...prepared.target.minionGroup,
                wounds: beforeGroup.wounds + woundDamage
            });
            wounds = {
                before: beforeGroup.wounds,
                damage: woundDamage,
                after: afterGroup.wounds,
                threshold: beforeGroup.groupWoundThreshold,
                incapacitated: afterGroup.defeated,
                maxTrack: beforeGroup.groupWoundThreshold + 1
            };
            minionGroup = {
                beforeMembers: beforeGroup.remainingMembers,
                afterMembers: afterGroup.remainingMembers,
                casualtiesBefore: beforeGroup.casualties,
                casualtiesAfter: afterGroup.casualties,
                groupWoundThreshold: beforeGroup.groupWoundThreshold
            };
        }
        else {
            wounds = applyPersonalDamage(prepared.target.woundsValue, prepared.target.woundsThreshold, woundDamage);
        }
    }
    return {
        resolution,
        targetRole,
        reactionCost,
        ...(minionGroup ? { minionGroup } : {}),
        ...(wounds ? { wounds } : {}),
        ...(strainDamage > 0 ? { strain: applyPersonalDamage(prepared.target.strainValue ?? 0, prepared.target.strainThreshold ?? 0, strainDamage) } : {})
    };
}
export function applyPersonalDamage(current, threshold, damage) {
    const before = nn(current);
    const normalizedThreshold = nn(threshold);
    const normalizedDamage = nn(damage);
    const maxTrack = normalizedThreshold > 0 ? normalizedThreshold * 2 : before + normalizedDamage;
    const after = Math.min(maxTrack, before + normalizedDamage);
    return {
        before,
        damage: normalizedDamage,
        after,
        threshold: normalizedThreshold,
        incapacitated: after > normalizedThreshold,
        maxTrack
    };
}
/**
 * Return how many weapon Critical activations the rolled result can legally fund.
 * A successful hit must have dealt damage past soak before any activation is available.
 * Advantage can activate the weapon Critical once per full Crit-rating payment; each Triumph
 * can also activate a Critical. Multiple activations on the same hit become +10 each beyond
 * the first on the single Critical Injury roll.
 */
export function getCriticalActivationCapacity(resolution) {
    const byAdvantage = resolution.criticalEligible ? nn(resolution.criticalActivationsByAdvantage) : 0;
    const byTriumph = resolution.criticalEligible ? nn(resolution.criticalTriumphsAvailable) : 0;
    const maxActivations = byAdvantage + byTriumph;
    return {
        eligible: resolution.criticalEligible && maxActivations > 0,
        byAdvantage,
        byTriumph,
        maxActivations
    };
}
export function criticalExtraActivations(totalActivations) {
    return Math.max(0, nn(totalActivations) - 1);
}
//# sourceMappingURL=combat.js.map