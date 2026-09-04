function nn(value, fallback = 0) {
    const n = Number(value ?? fallback);
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}
export function normalizeActorRole(value) {
    return value === "minion" || value === "rival" || value === "nemesis" ? value : "pc";
}
export function normalizeAdversaryProfile(input) {
    return {
        role: normalizeActorRole(input?.role),
        silhouette: nn(input?.silhouette, 1),
        adversaryRank: nn(input?.adversaryRank, 0),
        extraActivations: nn(input?.extraActivations, 0)
    };
}
/** Core silhouette comparison for personal combat: only a difference of 2+ matters. */
export function silhouetteDifficultyModifier(attackerSilhouette, targetSilhouette) {
    const attacker = nn(attackerSilhouette, 1);
    const target = nn(targetSilhouette, 1);
    const difference = target - attacker;
    const difficultyDelta = Math.abs(difference) < 2 ? 0 : (difference > 0 ? -1 : 1);
    return { attacker, target, difference, difficultyDelta };
}
export function actorRoleLabel(role) {
    if (role === "minion")
        return "Minion";
    if (role === "rival")
        return "Rival";
    if (role === "nemesis")
        return "Nemesis";
    return "PC";
}
/** Runtime-neutral activation eligibility. PCs and Nemeses track strain incapacitation; Minions/Rivals are wound-driven here. */
export function activationEligibility(input) {
    const role = normalizeActorRole(input.role);
    const wounds = nn(input.wounds, 0);
    const woundThreshold = nn(input.woundThreshold, 0);
    const strain = nn(input.strain, 0);
    const strainThreshold = nn(input.strainThreshold, 0);
    const dead = Boolean(input.dead);
    const woundExceeded = woundThreshold > 0 && wounds > woundThreshold;
    const tracksStrainIncapacitation = role === "pc" || role === "nemesis";
    const strainExceeded = tracksStrainIncapacitation && strainThreshold > 0 && strain > strainThreshold;
    const incapacitated = dead || woundExceeded || strainExceeded;
    let reason = "";
    if (dead)
        reason = "Actor is dead.";
    else if (woundExceeded && strainExceeded)
        reason = "Actor is incapacitated: Wounds and Strain exceed their thresholds.";
    else if (woundExceeded)
        reason = role === "minion" || role === "rival"
            ? "NPC is defeated: Wounds exceed Wound Threshold."
            : "Actor is incapacitated: Wounds exceed Wound Threshold.";
    else if (strainExceeded)
        reason = "Actor is incapacitated: Strain exceeds Strain Threshold.";
    return { allowed: !incapacitated, incapacitated, reason, woundExceeded, strainExceeded, dead };
}
export function minionGroupWoundThreshold(memberWoundThreshold, members) {
    return nn(memberWoundThreshold) * nn(members);
}
/**
 * Core minion shared-wound model. Wounds are tracked against the combined group threshold.
 * A casualty occurs each time total wounds exceed another member-sized threshold share.
 */
export function normalizeMinionGroup(input) {
    const members = Math.max(1, nn(input.members, 1));
    const memberWoundThreshold = Math.max(1, nn(input.memberWoundThreshold, 1));
    const groupWoundThreshold = minionGroupWoundThreshold(memberWoundThreshold, members);
    const wounds = Math.min(groupWoundThreshold + 1, nn(input.wounds, 0));
    const woundDerivedCasualties = wounds <= 0 ? 0 : Math.min(members, Math.floor((wounds - 1) / memberWoundThreshold));
    const casualties = Math.min(members, Math.max(nn(input.casualties, 0), woundDerivedCasualties));
    const remainingMembers = Math.max(0, members - casualties);
    const groupSkillIds = [...new Set((input.groupSkillIds ?? []).map((id) => String(id).trim()).filter(Boolean))];
    return {
        members,
        memberWoundThreshold,
        groupWoundThreshold,
        wounds,
        casualties,
        remainingMembers,
        defeated: remainingMembers <= 0 || wounds > groupWoundThreshold,
        groupSkillIds
    };
}
export function minionGroupSkillRank(memberCount, listedSkill) {
    if (!listedSkill)
        return 0;
    return Math.max(0, nn(memberCount, 1) - 1);
}
export function minionSkillRank(group, skillId) {
    const state = normalizeMinionGroup(group);
    return minionGroupSkillRank(state.remainingMembers, state.groupSkillIds.includes(skillId));
}
/** A Critical Injury against a minion group adds one member WT + 1 wounds to the shared wound track. */
export function applyMinionCritical(group) {
    const before = normalizeMinionGroup(group);
    const woundsAdded = before.memberWoundThreshold + 1;
    const after = normalizeMinionGroup({ ...before, wounds: before.wounds + woundsAdded });
    return {
        ...after,
        woundsAdded,
        casualtiesAdded: Math.max(0, after.casualties - before.casualties)
    };
}
/** FAQ-safe area/multi-target helper: soak is applied to every affected minion separately. */
export function resolveMinionAreaHit(input) {
    const affectedMembers = nn(input.affectedMembers);
    const damagePerMember = nn(input.damagePerMember);
    const soakPerMember = nn(input.soakPerMember);
    const woundsPerMember = Math.max(0, damagePerMember - soakPerMember);
    return {
        affectedMembers,
        damagePerMember,
        soakPerMember,
        woundsPerMember,
        totalGroupWounds: woundsPerMember * affectedMembers
    };
}
/** Minions and Rivals do not have a separate strain track; inflicted strain becomes wounds. */
export function routeDamageForActorRole(roleInput, incomingWounds, incomingStrain) {
    const role = normalizeActorRole(roleInput);
    const rawWounds = nn(incomingWounds);
    const rawStrain = nn(incomingStrain);
    const convert = role === "minion" || role === "rival";
    return {
        role,
        incomingWounds: rawWounds,
        incomingStrain: rawStrain,
        wounds: rawWounds + (convert ? rawStrain : 0),
        strain: convert ? 0 : rawStrain,
        strainConvertedToWounds: convert ? rawStrain : 0
    };
}
export function tracksStrainNormally(roleInput) {
    const role = normalizeActorRole(roleInput);
    return role === "pc" || role === "nemesis";
}
export function suffersAutomaticThresholdCritical(roleInput) {
    const role = normalizeActorRole(roleInput);
    return role === "pc" || role === "nemesis";
}
//# sourceMappingURL=adversaries.js.map