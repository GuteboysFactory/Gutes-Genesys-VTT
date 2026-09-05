import { settingProfiles } from "../domain/profiles/index.js";
import { coerceSkillStateSnapshot, synchronizeSkillStates } from "../domain/skills/index.js";
import { SYSTEM_ID } from "./constants.js";
export const RULES_PROFILE_SETTING = "rulesProfile";
const CREATION_DRAFT_FLAG = "characterCreationDraft";
export function registerRulesProfileSetting() {
    game.settings.register(SYSTEM_ID, RULES_PROFILE_SETTING, {
        name: "Genesys Rules Profile",
        hint: "Primary Genesys rules profile. Character Actors created from a setting pack retain that setting profile independently.",
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
export function getActorProfileId(actor) {
    const draft = actor?.getFlag?.(SYSTEM_ID, CREATION_DRAFT_FLAG) ?? actor?.flags?.[SYSTEM_ID]?.[CREATION_DRAFT_FLAG] ?? null;
    const settingId = String(draft?.settingId ?? "");
    if (settingId && settingProfiles.get(settingId))
        return settingId;
    const actorProfile = String(actor?.getFlag?.(SYSTEM_ID, "rulesProfile") ?? actor?.flags?.[SYSTEM_ID]?.rulesProfile ?? "");
    if (actorProfile && settingProfiles.get(actorProfile))
        return actorProfile;
    return getActiveProfileId();
}
export function getActorSkillDefinitions(actor) {
    return settingProfiles.resolveSkills(getActorProfileId(actor));
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
    return coerceSkillStateSnapshot(rawSkillState(actor), getActorSkillDefinitions(actor));
}
export function buildSynchronizedSkillStates(actor) {
    return synchronizeSkillStates(skillStateSnapshot(actor), getActorSkillDefinitions(actor));
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
    const next = synchronizeSkillStates(current, getActorSkillDefinitions(actor));
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
