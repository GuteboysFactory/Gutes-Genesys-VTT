import { settingProfiles } from "../domain/profiles/index.js";
import { coerceSkillStateSnapshot, synchronizeSkillStates } from "../domain/skills/index.js";
import { SYSTEM_ID } from "./constants.js";
export const RULES_PROFILE_SETTING = "rulesProfile";
export function registerRulesProfileSetting() {
    game.settings.register(SYSTEM_ID, RULES_PROFILE_SETTING, {
        name: "Genesys Rules Profile",
        hint: "Primary Genesys rules profile. 0.0.4 ships Core Only; setting profiles are added in later milestones.",
        scope: "world",
        config: false,
        type: String,
        default: "core-only"
    });
}
export function getActiveProfileId() {
    const configured = String(game.settings.get(SYSTEM_ID, RULES_PROFILE_SETTING) ?? "core-only");
    return settingProfiles.get(configured) ? configured : "core-only";
}
export function getActiveSkillDefinitions() {
    return settingProfiles.resolveSkills(getActiveProfileId());
}
function rawSkillState(actor) {
    const live = actor?.system?.skills;
    const source = actor?._source?.system?.skills;
    if (Array.isArray(live) && live.length > 0)
        return live;
    if (source !== undefined && source !== null)
        return source;
    return live;
}
export function skillStateSnapshot(actor) {
    return coerceSkillStateSnapshot(rawSkillState(actor), getActiveSkillDefinitions());
}
export function buildSynchronizedSkillStates(actor) {
    return synchronizeSkillStates(skillStateSnapshot(actor), getActiveSkillDefinitions());
}
export async function updateActorSkillState(actor, skillId, patch) {
    const next = buildSynchronizedSkillStates(actor);
    const index = next.findIndex((state) => state.id === skillId);
    if (index < 0)
        throw new Error(`Unknown active skill '${skillId}'.`);
    next[index] = { ...next[index], ...patch };
    await actor.update({ "system.skills": next });
    return next;
}
export async function synchronizeActorSkills(actor) {
    if (!actor || actor.type !== "character")
        return false;
    const current = skillStateSnapshot(actor);
    const next = synchronizeSkillStates(current, getActiveSkillDefinitions());
    const liveIsArray = Array.isArray(actor?.system?.skills);
    if (liveIsArray && JSON.stringify(actor.system.skills) === JSON.stringify(next))
        return false;
    await actor.update({ "system.skills": next });
    return true;
}
export async function synchronizeWorldCharacterSkills() {
    if (!game.user?.isGM)
        return 0;
    let updated = 0;
    const actors = Array.isArray(game.actors?.contents)
        ? game.actors.contents
        : Array.from(game.actors?.values?.() ?? []);
    for (const actor of actors) {
        if (await synchronizeActorSkills(actor))
            updated += 1;
    }
    return updated;
}
//# sourceMappingURL=skills-service.js.map