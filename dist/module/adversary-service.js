import { minionSkillRank, normalizeActorRole, normalizeMinionGroup, routeDamageForActorRole, tracksStrainNormally } from "../domain/adversaries/index.js";
import { rerenderRenderedCharacterSheet } from "./live-sheet-state.js";
function n(value, fallback = 0) {
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
}
export function actorAdversaryContext(actor) {
    const role = normalizeActorRole(actor?.system?.role ?? (actor?.hasPlayerOwner ? "pc" : "rival"));
    const minionGroup = normalizeMinionGroup({
        members: actor?.system?.minionGroup?.members ?? 1,
        memberWoundThreshold: actor?.system?.minionGroup?.memberWoundThreshold ?? 1,
        wounds: actor?.system?.wounds?.value ?? 0,
        casualties: actor?.system?.minionGroup?.casualties ?? 0,
        groupSkillIds: actor?.system?.minionGroup?.groupSkillIds ?? []
    });
    return {
        role,
        rolePc: role === "pc",
        roleMinion: role === "minion",
        roleRival: role === "rival",
        roleNemesis: role === "nemesis",
        tracksStrain: tracksStrainNormally(role),
        strainConvertedToWounds: role === "minion" || role === "rival",
        minionGroup,
        minionGroupSkillRank: Math.max(0, minionGroup.remainingMembers - 1)
    };
}
export async function updateActorMinionGroupSkill(actor, skillId, enabled) {
    const current = Array.isArray(actor?.system?.minionGroup?.groupSkillIds)
        ? actor.system.minionGroup.groupSkillIds.map((id) => String(id))
        : [];
    const next = new Set(current);
    if (enabled)
        next.add(skillId);
    else
        next.delete(skillId);
    const values = [...next];
    await actor.update({ "system.minionGroup.groupSkillIds": values });
    return values;
}
export function actorEffectiveSkillRank(actor, skillId, storedRank = 0) {
    if (normalizeActorRole(actor?.system?.role) !== "minion")
        return n(storedRank);
    return minionSkillRank({
        members: actor?.system?.minionGroup?.members ?? 1,
        memberWoundThreshold: actor?.system?.minionGroup?.memberWoundThreshold ?? 1,
        wounds: actor?.system?.wounds?.value ?? 0,
        casualties: actor?.system?.minionGroup?.casualties ?? 0,
        groupSkillIds: actor?.system?.minionGroup?.groupSkillIds ?? []
    }, skillId);
}
/** Apply direct strain/wound effects outside combat with the same role-routing rules. */
export async function applyActorRoleDamage(actor, input) {
    const role = normalizeActorRole(actor?.system?.role);
    const routed = routeDamageForActorRole(role, input.wounds ?? 0, input.strain ?? 0);
    const update = {};
    if (role === "minion" && routed.wounds > 0) {
        const before = normalizeMinionGroup({
            members: actor?.system?.minionGroup?.members ?? 1,
            memberWoundThreshold: actor?.system?.minionGroup?.memberWoundThreshold ?? 1,
            wounds: actor?.system?.wounds?.value ?? 0,
            casualties: actor?.system?.minionGroup?.casualties ?? 0,
            groupSkillIds: actor?.system?.minionGroup?.groupSkillIds ?? []
        });
        const after = normalizeMinionGroup({
            ...before,
            wounds: before.wounds + routed.wounds
        });
        update["system.wounds.value"] = after.wounds;
        update["system.minionGroup.casualties"] = after.casualties;
    }
    else if (routed.wounds > 0) {
        update["system.wounds.value"] = n(actor?.system?.wounds?.value) + routed.wounds;
    }
    if (routed.strain > 0)
        update["system.strain.value"] = n(actor?.system?.strain?.value) + routed.strain;
    if (Object.keys(update).length)
        await actor.update(update);
    await rerenderRenderedCharacterSheet(actor);
    return { role, routed, update };
}
//# sourceMappingURL=adversary-service.js.map