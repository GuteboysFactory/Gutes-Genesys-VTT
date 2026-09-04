function integer(value, fallback = 0) {
    const n = Number(value ?? fallback);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
function count(value) {
    return Math.max(0, integer(value, 0));
}
export const CORE_CRITICAL_INJURY_TABLE = Object.freeze([
    { min: 1, max: 5, severity: "easy", difficulty: 1, name: "Minor Nick", effect: "The target suffers 1 strain." },
    { min: 6, max: 10, severity: "easy", difficulty: 1, name: "Slowed Down", effect: "The target can only act during the last allied Initiative slot on their next turn." },
    { min: 11, max: 15, severity: "easy", difficulty: 1, name: "Sudden Jolt", effect: "The target drops whatever is in hand." },
    { min: 16, max: 20, severity: "easy", difficulty: 1, name: "Distracted", effect: "The target cannot perform a free maneuver during their next turn." },
    { min: 21, max: 25, severity: "easy", difficulty: 1, name: "Off-Balance", effect: "Add one Setback die to the target's next skill check." },
    { min: 26, max: 30, severity: "easy", difficulty: 1, name: "Discouraging Wound", effect: "Move one player pool Story Point to the Game Master pool (reverse if NPC)." },
    { min: 31, max: 35, severity: "easy", difficulty: 1, name: "Stunned", effect: "The target is staggered until the end of their next turn.", tags: ["condition:staggered"] },
    { min: 36, max: 40, severity: "easy", difficulty: 1, name: "Stinger", effect: "Increase the difficulty of the target's next check by one." },
    { min: 41, max: 45, severity: "average", difficulty: 2, name: "Bowled Over", effect: "The target is knocked prone and suffers 1 strain." },
    { min: 46, max: 50, severity: "average", difficulty: 2, name: "Head Ringer", effect: "Increase the difficulty of all Intellect and Cunning checks by one until this Critical Injury is healed." },
    { min: 51, max: 55, severity: "average", difficulty: 2, name: "Fearsome Wound", effect: "Increase the difficulty of all Presence and Willpower checks by one until this Critical Injury is healed." },
    { min: 56, max: 60, severity: "average", difficulty: 2, name: "Agonizing Wound", effect: "Increase the difficulty of all Brawn and Agility checks by one until this Critical Injury is healed." },
    { min: 61, max: 65, severity: "average", difficulty: 2, name: "Slightly Dazed", effect: "The target is disoriented until this Critical Injury is healed.", tags: ["condition:disoriented", "duration:until-healed"] },
    { min: 66, max: 70, severity: "average", difficulty: 2, name: "Scattered Senses", effect: "The target removes all Boost dice from skill checks until this Critical Injury is healed." },
    { min: 71, max: 75, severity: "average", difficulty: 2, name: "Hamstrung", effect: "The target loses their free maneuver until this Critical Injury is healed." },
    { min: 76, max: 80, severity: "average", difficulty: 2, name: "Overpowered", effect: "The attacker may immediately attempt another attack as an incidental using the exact same pool as the original attack." },
    { min: 81, max: 85, severity: "average", difficulty: 2, name: "Winded", effect: "The target cannot voluntarily suffer strain to activate abilities or gain additional maneuvers until this Critical Injury is healed." },
    { min: 86, max: 90, severity: "average", difficulty: 2, name: "Compromised", effect: "Increase the difficulty of all skill checks by one until this Critical Injury is healed." },
    { min: 91, max: 95, severity: "hard", difficulty: 3, name: "At the Brink", effect: "The target suffers 2 strain each time they perform an action until this Critical Injury is healed." },
    { min: 96, max: 100, severity: "hard", difficulty: 3, name: "Crippled", effect: "One limb is impaired until healed; increase difficulty of checks requiring that limb by one." },
    { min: 101, max: 105, severity: "hard", difficulty: 3, name: "Maimed", effect: "One limb is permanently lost. Without a replacement, actions requiring it cannot be performed; all other actions add one Setback die until healed." },
    { min: 106, max: 110, severity: "hard", difficulty: 3, name: "Horrific Injury", effect: "Roll 1d10 for a characteristic; treat that characteristic as one point lower until this Critical Injury is healed." },
    { min: 111, max: 115, severity: "hard", difficulty: 3, name: "Temporarily Disabled", effect: "The target is immobilized until this Critical Injury is healed.", tags: ["condition:immobilized", "duration:until-healed"] },
    { min: 116, max: 120, severity: "hard", difficulty: 3, name: "Blinded", effect: "Upgrade difficulty of all checks twice, and Perception and Vigilance checks three times, until healed." },
    { min: 121, max: 125, severity: "hard", difficulty: 3, name: "Knocked Senseless", effect: "The target is staggered until this Critical Injury is healed.", tags: ["condition:staggered", "duration:until-healed"] },
    { min: 126, max: 130, severity: "daunting", difficulty: 4, name: "Gruesome Injury", effect: "Roll 1d10 for a characteristic; permanently reduce that characteristic by one, to a minimum of 1.", secondary: { kind: "characteristic-roll", mode: "permanent-characteristic-reduction", amount: 1, minimum: 1, die: "d10", requiresConfirmation: true } },
    { min: 131, max: 140, severity: "daunting", difficulty: 4, name: "Bleeding Out", effect: "At the beginning of each turn, suffer 1 wound and 1 strain until healed. Each 5 wounds beyond threshold causes another Critical Injury." },
    { min: 141, max: 150, severity: "daunting", difficulty: 4, name: "The End Is Nigh", effect: "The target dies after the last Initiative slot during the next round unless this Critical Injury is healed." },
    { min: 151, max: null, severity: "dead", difficulty: 0, name: "Dead", effect: "Complete, obliterated death." }
]);
export function criticalCharacteristicFromD10(rawRoll) {
    const roll = integer(rawRoll, 0);
    if (roll < 1 || roll > 10)
        throw new RangeError("Critical characteristic roll must be 1-10.");
    if (roll <= 3)
        return "brawn";
    if (roll <= 6)
        return "agility";
    if (roll === 7)
        return "intellect";
    if (roll === 8)
        return "cunning";
    if (roll === 9)
        return "presence";
    return "willpower";
}
export function resolveCriticalSecondary(injury, rawRoll) {
    const secondary = injury.secondary;
    if (!secondary)
        throw new Error(`Critical Injury '${injury.name}' has no secondary resolution.`);
    if (secondary.kind !== "characteristic-roll" || secondary.die !== "d10")
        throw new Error(`Unsupported Critical secondary resolution '${secondary.kind}'.`);
    return {
        kind: secondary.kind,
        mode: secondary.mode,
        rawRoll: integer(rawRoll, 0),
        characteristic: criticalCharacteristicFromD10(rawRoll),
        amount: count(secondary.amount),
        minimum: count(secondary.minimum)
    };
}
export function rollCriticalSecondary(injury, rng = Math.random) {
    const rawRoll = Math.floor(Math.min(0.999999999, Math.max(0, rng())) * 10) + 1;
    return resolveCriticalSecondary(injury, rawRoll);
}
export function applyPermanentCharacteristicReduction(currentValue, amount = 1, minimum = 1) {
    return Math.max(count(minimum), integer(currentValue, count(minimum)) - count(amount));
}
export function lookupCriticalInjury(total) {
    const value = Math.max(1, integer(total, 1));
    const match = CORE_CRITICAL_INJURY_TABLE.find((entry) => value >= entry.min && (entry.max === null || value <= entry.max));
    if (!match)
        throw new RangeError(`No Critical Injury entry for ${value}.`);
    return match;
}
export function criticalRollBonus(modifiers = {}) {
    const unresolvedBonus = count(modifiers.unresolvedCount) * 10;
    const viciousBonus = count(modifiers.viciousRank) * 10;
    const extraActivationBonus = count(modifiers.extraActivations) * 10;
    const flatModifier = integer(modifiers.flatModifier, 0);
    return { unresolvedBonus, viciousBonus, extraActivationBonus, flatModifier, total: unresolvedBonus + viciousBonus + extraActivationBonus + flatModifier };
}
export function resolveCriticalInjury(rawRoll, modifiers = {}) {
    const roll = integer(rawRoll, 1);
    if (roll < 1 || roll > 100)
        throw new RangeError("Critical Injury percentile roll must be 1-100.");
    const bonus = criticalRollBonus(modifiers);
    const total = Math.max(1, roll + bonus.total);
    return {
        rawRoll: roll,
        unresolvedBonus: bonus.unresolvedBonus,
        viciousBonus: bonus.viciousBonus,
        extraActivationBonus: bonus.extraActivationBonus,
        flatModifier: bonus.flatModifier,
        total,
        injury: lookupCriticalInjury(total)
    };
}
export function rollCriticalInjury(modifiers = {}, rng = Math.random) {
    const rawRoll = Math.floor(Math.min(0.999999999, Math.max(0, rng())) * 100) + 1;
    return resolveCriticalInjury(rawRoll, modifiers);
}
export function toCriticalInjuryState(resolution, id, sourceId = "core:critical-injury", createdAt = Date.now()) {
    return {
        id,
        rawRoll: resolution.rawRoll,
        total: resolution.total,
        name: resolution.injury.name,
        effect: resolution.injury.effect,
        severity: resolution.injury.severity,
        difficulty: resolution.injury.difficulty,
        sourceId,
        active: true,
        createdAt,
        secondaryStatus: resolution.injury.secondary ? "pending" : "none",
        secondaryKind: resolution.injury.secondary?.kind ?? "",
        secondaryMode: resolution.injury.secondary?.mode ?? "",
        secondaryRawRoll: 0,
        secondaryRolledCharacteristic: "",
        affectedCharacteristic: "",
        secondaryAmount: resolution.injury.secondary?.amount ?? 0,
        secondaryMinimum: resolution.injury.secondary?.minimum ?? 0,
        secondaryBefore: 0,
        secondaryAfter: 0,
        secondaryOverridden: false
    };
}
export function activeCriticalCount(states = []) {
    return states.filter((entry) => entry.active !== false).length;
}
//# sourceMappingURL=criticals.js.map