import { CORE_SKILL_IDS } from "../../domain/skills/index.js";
import { settingProfiles } from "../../domain/profiles/index.js";
import { REALMS_OF_TERRINOTH_CAREERS } from "./realms-of-terrinoth-character-creation.js";

const PACK_ID = "realms-of-terrinoth:skills-magic";
const SETTING_ID = "realms-of-terrinoth";
const SOURCE_TYPE = "realms-of-terrinoth";
const PROVENANCE = Object.freeze({ sourceId: "realms-of-terrinoth", sourceLabel: "Realms of Terrinoth", profileId: SETTING_ID });

function skill(id, label, characteristic, category, source = "core") {
    return Object.freeze({
        id,
        label,
        characteristic,
        category,
        availability: "Realms of Terrinoth",
        sourceId: id,
        sourceType: source === "rot" ? SOURCE_TYPE : "genesys-core",
        provenance: source === "rot" ? PROVENANCE : { sourceId: "genesys-core", sourceLabel: "Genesys Core Rulebook", profileId: SETTING_ID },
        tags: ["realms-of-terrinoth", category]
    });
}

export const REALMS_OF_TERRINOTH_SKILLS = Object.freeze([
    skill("alchemy", "Alchemy", "intellect", "general"),
    skill("arcana", "Arcana", "intellect", "magic"),
    skill("athletics", "Athletics", "brawn", "general"),
    skill("brawl", "Brawl", "brawn", "combat"),
    skill("charm", "Charm", "presence", "social"),
    skill("coercion", "Coercion", "willpower", "social"),
    skill("cool", "Cool", "presence", "general"),
    skill("coordination", "Coordination", "agility", "general"),
    skill("deception", "Deception", "cunning", "social"),
    skill("discipline", "Discipline", "willpower", "general"),
    skill("divine", "Divine", "willpower", "magic"),
    skill("knowledge-adventuring", "Knowledge (Adventuring)", "intellect", "knowledge", "rot"),
    skill("knowledge-forbidden", "Knowledge (Forbidden)", "intellect", "knowledge", "rot"),
    skill("knowledge-geography", "Knowledge (Geography)", "intellect", "knowledge", "rot"),
    skill("knowledge-lore", "Knowledge (Lore)", "intellect", "knowledge", "rot"),
    skill("leadership", "Leadership", "presence", "social"),
    skill("mechanics", "Mechanics", "intellect", "general"),
    skill("medicine", "Medicine", "intellect", "general"),
    skill("melee-heavy", "Melee (Heavy)", "brawn", "combat"),
    skill("melee-light", "Melee (Light)", "brawn", "combat"),
    skill("negotiation", "Negotiation", "presence", "social"),
    skill("perception", "Perception", "cunning", "general"),
    skill("primal", "Primal", "cunning", "magic"),
    skill("ranged", "Ranged", "agility", "combat"),
    skill("resilience", "Resilience", "brawn", "general"),
    skill("riding", "Riding", "agility", "general"),
    skill("runes", "Runes", "intellect", "magic", "rot"),
    skill("skulduggery", "Skulduggery", "cunning", "general"),
    skill("stealth", "Stealth", "agility", "general"),
    skill("streetwise", "Streetwise", "cunning", "general"),
    skill("survival", "Survival", "cunning", "general"),
    skill("verse", "Verse", "presence", "magic", "rot"),
    skill("vigilance", "Vigilance", "willpower", "general")
]);

export const REALMS_OF_TERRINOTH_MAGIC_RULES = Object.freeze({
    purchasePolicy: "career-only",
    minimumRankToCast: 1,
    magicSkillIds: ["arcana", "divine", "primal", "runes", "verse"],
    knowledgeSkillForSpellEffects: "knowledge-lore",
    actions: {
        attack: ["arcana", "divine", "primal", "runes"],
        augment: ["divine", "primal", "runes", "verse"],
        barrier: ["arcana", "divine", "runes"],
        conjure: ["arcana", "primal"],
        curse: ["arcana", "divine", "runes", "verse"],
        dispel: ["arcana", "verse"],
        heal: ["divine", "primal", "verse"],
        utility: ["arcana", "divine", "primal", "runes", "verse"]
    },
    skillRules: {
        runes: {
            requiresImplement: true,
            requiredImplementTags: ["runebound-shard"],
            allowsOtherImplements: false
        },
        verse: {
            performanceBased: true
        }
    },
    accessSources: {
        archetypes: {
            "rot-archetype:highborn-elf": [{ skillId: "divine", career: true, startingRank: 1 }]
        },
        careers: {
            "rot-career:disciple": [{ skillId: "divine", career: true }],
            "rot-career:mage": [{ skillId: "arcana", career: true }],
            "rot-career:runemaster": [{ skillId: "runes", career: true }],
            "rot-career:primalist": [{ skillId: "primal", career: true }],
            "rot-career:scholar": [{ skillId: "runes", career: true }]
        },
        talents: {
            "terrinoth-talent:bard": [
                { skillId: "knowledge-lore", career: true },
                { skillId: "verse", career: true }
            ],
            "terrinoth-talent:runic-lore": [
                { skillId: "knowledge-lore", career: true },
                { skillId: "runes", career: true }
            ],
            "terrinoth-talent:templar": [
                { skillId: "divine", career: true, spellLimitPerEncounter: 1 }
            ]
        }
    }
});

const SKILL_IDS = Object.freeze(REALMS_OF_TERRINOTH_SKILLS.map((entry) => entry.id));
const SKILL_ID_SET = new Set(SKILL_IDS);

export function validateTerrinothCareerSkillIds(careers = REALMS_OF_TERRINOTH_CAREERS) {
    const errors = [];
    for (const career of careers) {
        if ((career.careerSkills?.length ?? 0) !== 8)
            errors.push(`${career.id} must define exactly 8 career skills.`);
        for (const skillId of career.careerSkills ?? []) {
            if (!SKILL_ID_SET.has(skillId))
                errors.push(`${career.id} references unknown Terrinoth skill '${skillId}'.`);
        }
        for (const variant of career.variants ?? []) {
            const remove = variant?.replaceCareerSkill?.remove;
            const add = variant?.replaceCareerSkill?.add;
            if (remove && !career.careerSkills.includes(remove))
                errors.push(`${variant.id} cannot replace missing career skill '${remove}'.`);
            if (add && !SKILL_ID_SET.has(add))
                errors.push(`${variant.id} references unknown replacement skill '${add}'.`);
        }
    }
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export const REALMS_OF_TERRINOTH_CAREER_SKILL_VALIDATION = validateTerrinothCareerSkillIds();
if (!REALMS_OF_TERRINOTH_CAREER_SKILL_VALIDATION.valid)
    throw new Error(`Invalid Realms of Terrinoth career skill registry: ${REALMS_OF_TERRINOTH_CAREER_SKILL_VALIDATION.errors.join(" ")}`);

const coreSkillIds = new Set(CORE_SKILL_IDS);
const profileOnlyDefinitions = REALMS_OF_TERRINOTH_SKILLS.filter((entry) => !coreSkillIds.has(entry.id));
settingProfiles.registerSkillDefinitions(profileOnlyDefinitions);
if (!settingProfiles.get(SETTING_ID)) {
    settingProfiles.register(Object.freeze({
        id: SETTING_ID,
        label: "Realms of Terrinoth",
        baseProfileId: "core-only",
        skillIds: SKILL_IDS,
        provenance: PROVENANCE
    }));
}

export const REALMS_OF_TERRINOTH_SKILLS_MAGIC_PACK = Object.freeze({
    id: PACK_ID,
    label: "Realms of Terrinoth - Skills & Magic",
    version: "1.0",
    settingId: SETTING_ID,
    sourceType: "official-setting-catalog",
    complete: true,
    metadata: {
        content: "Complete setting skill registry and magic-access foundation",
        skillCount: REALMS_OF_TERRINOTH_SKILLS.length,
        magicSkillCount: REALMS_OF_TERRINOTH_MAGIC_RULES.magicSkillIds.length,
        authority: "Realms of Terrinoth Table 2-3 and pp. 115-129",
        bundledRulesText: false
    },
    skills: REALMS_OF_TERRINOTH_SKILLS,
    magicRules: REALMS_OF_TERRINOTH_MAGIC_RULES
});

Hooks.once("ready", () => {
    try {
        game?.genesysContent?.registerPack?.(REALMS_OF_TERRINOTH_SKILLS_MAGIC_PACK, { replace: true });
        Object.defineProperty(game, "genesysTerrinoth", {
            configurable: true,
            value: Object.freeze({
                skills: REALMS_OF_TERRINOTH_SKILLS,
                magicRules: REALMS_OF_TERRINOTH_MAGIC_RULES,
                careerSkillValidation: REALMS_OF_TERRINOTH_CAREER_SKILL_VALIDATION,
                validateCareerSkills: validateTerrinothCareerSkillIds
            })
        });
        console.log(`genesys-vtt | Registered ${REALMS_OF_TERRINOTH_SKILLS.length} Terrinoth skills and magic foundation`);
    }
    catch (error) {
        console.error("genesys-vtt | Failed to register Realms of Terrinoth skills/magic foundation", error);
    }
});
