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
        for (const skill of CORE_SKILL_DEFINITIONS)
            this.#skills.set(skill.id, skill);
        this.register(CORE_ONLY_PROFILE);
    }
    register(profile) {
        if (this.#profiles.has(profile.id))
            throw new Error(`Setting profile '${profile.id}' is already registered.`);
        this.#profiles.set(profile.id, Object.freeze({ ...profile, skillIds: Object.freeze([...profile.skillIds]) }));
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