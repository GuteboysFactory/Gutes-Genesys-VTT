import { CORE_SKILL_IDS, CORE_SKILL_DEFINITIONS } from "../skills/index.js";
export const CORE_ONLY_PROFILE = Object.freeze({
    id: "core-only",
    label: "Genesys Core Only",
    baseProfileId: null,
    skillIds: CORE_SKILL_IDS,
    provenance: {
        sourceId: "genesys-core",
        sourceLabel: "Genesys Core Rulebook"
    }
});
export class SettingProfileRegistry {
    #profiles = new Map();
    #skills = new Map();
    constructor() {
        this.registerSkillDefinitions(CORE_SKILL_DEFINITIONS, { replace: true });
        this.register(CORE_ONLY_PROFILE);
    }
    registerSkillDefinitions(definitions, { replace = false } = {}) {
        for (const input of Array.isArray(definitions) ? definitions : []) {
            const id = String(input?.id ?? "").trim();
            if (!id)
                throw new Error("Setting skill definitions require a stable id.");
            if (this.#skills.has(id) && !replace)
                throw new Error(`Skill definition '${id}' is already registered.`);
            this.#skills.set(id, Object.freeze({ ...input, id }));
        }
        return this;
    }
    hasSkill(skillId) {
        return this.#skills.has(String(skillId ?? ""));
    }
    getSkill(skillId) {
        return this.#skills.get(String(skillId ?? ""));
    }
    register(profile) {
        if (this.#profiles.has(profile.id))
            throw new Error(`Setting profile '${profile.id}' is already registered.`);
        const skillIds = Object.freeze([...new Set((profile.skillIds ?? []).map(String))]);
        for (const skillId of skillIds) {
            if (!this.#skills.has(skillId))
                throw new Error(`Setting profile '${profile.id}' references unknown skill '${skillId}'.`);
        }
        this.#profiles.set(profile.id, Object.freeze({ ...profile, skillIds }));
    }
    get(profileId) {
        return this.#profiles.get(profileId);
    }
    list() {
        return [...this.#profiles.values()];
    }
    resolveSkills(profileId) {
        const profile = this.get(profileId);
        if (!profile)
            throw new Error(`Unknown setting profile '${profileId}'.`);
        return profile.skillIds.map((id) => {
            const definition = this.#skills.get(id);
            if (!definition)
                throw new Error(`Setting profile '${profileId}' references unknown skill '${id}'.`);
            return definition;
        });
    }
}
export const settingProfiles = new SettingProfileRegistry();
//# sourceMappingURL=registry.js.map
