const CORE_PROVENANCE = Object.freeze({
    sourceId: "genesys-core",
    sourceLabel: "Genesys Core Rulebook",
    profileId: "core-only"
});
function skill(id, label, characteristic, availability, category = "general") {
    return Object.freeze({ id, label, characteristic, availability, category, provenance: CORE_PROVENANCE });
}
/**
 * Core skill catalog from the audited Genesys Core skill table.
 * The catalog is intentionally broader than a single campaign's active list:
 * setting profiles select/patch the skills they expose at runtime.
 */
export const CORE_SKILL_DEFINITIONS = Object.freeze([
    skill("alchemy", "Alchemy", "intellect", "Fantasy/steampunk/weird war"),
    skill("arcana", "Arcana", "intellect", "Magic rules", "magic"),
    skill("astrocartography", "Astrocartography", "intellect", "Space opera", "knowledge"),
    skill("athletics", "Athletics", "brawn", "All"),
    skill("brawl", "Brawl", "brawn", "All", "combat"),
    skill("charm", "Charm", "presence", "All"),
    skill("coercion", "Coercion", "willpower", "All"),
    skill("computers", "Computers", "intellect", "Modern/SF/space opera"),
    skill("cool", "Cool", "presence", "All"),
    skill("coordination", "Coordination", "agility", "All"),
    skill("deception", "Deception", "cunning", "All"),
    skill("discipline", "Discipline", "willpower", "All"),
    skill("divine", "Divine", "willpower", "Magic rules", "magic"),
    skill("driving", "Driving", "agility", "Selected tech settings"),
    skill("gunnery", "Gunnery", "agility", "Selected tech settings", "combat"),
    skill("knowledge", "Knowledge", "intellect", "All; may be split by setting", "knowledge"),
    skill("leadership", "Leadership", "presence", "All"),
    skill("mechanics", "Mechanics", "intellect", "All"),
    skill("medicine", "Medicine", "intellect", "All"),
    skill("melee", "Melee", "brawn", "Selected settings", "combat"),
    skill("melee-heavy", "Melee (Heavy)", "brawn", "Fantasy", "combat"),
    skill("melee-light", "Melee (Light)", "brawn", "Fantasy", "combat"),
    skill("negotiation", "Negotiation", "presence", "All"),
    skill("operating", "Operating", "intellect", "All"),
    skill("perception", "Perception", "cunning", "All"),
    skill("piloting", "Piloting", "agility", "Selected tech settings"),
    skill("primal", "Primal", "cunning", "Magic rules", "magic"),
    skill("ranged", "Ranged", "agility", "Fantasy", "combat"),
    skill("ranged-heavy", "Ranged (Heavy)", "agility", "Selected tech settings", "combat"),
    skill("ranged-light", "Ranged (Light)", "agility", "Selected tech settings", "combat"),
    skill("resilience", "Resilience", "brawn", "All"),
    skill("riding", "Riding", "agility", "Fantasy/steampunk"),
    skill("skulduggery", "Skulduggery", "cunning", "All"),
    skill("stealth", "Stealth", "agility", "All"),
    skill("streetwise", "Streetwise", "cunning", "All"),
    skill("survival", "Survival", "cunning", "All"),
    skill("vigilance", "Vigilance", "willpower", "All")
]);
export const CORE_SKILL_IDS = Object.freeze(CORE_SKILL_DEFINITIONS.map((entry) => entry.id));
const CORE_SKILL_MAP = new Map(CORE_SKILL_DEFINITIONS.map((entry) => [entry.id, entry]));
export function getCoreSkillDefinition(id) {
    return CORE_SKILL_MAP.get(id);
}
//# sourceMappingURL=catalog.js.map