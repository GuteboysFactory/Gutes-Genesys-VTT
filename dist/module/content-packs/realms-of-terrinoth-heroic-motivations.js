const PACK_ID = "realms-of-terrinoth:heroic-motivations";
const SETTING_ID = "realms-of-terrinoth";

const primary = (id, label, page) => ({
    id: `rot-heroic:${id}`,
    label,
    kind: "primary-effect",
    sourceId: `rot-heroic:${id}`,
    sourceType: "realms-of-terrinoth",
    tags: ["realms-of-terrinoth", "heroic-ability", "primary-effect"],
    metadata: { printedSource: `Realms of Terrinoth p. ${page}`, automationStatus: "catalog-only", bundledRulesText: false }
});

const secondary = (id, label) => ({
    id: `rot-heroic-secondary:${id}`,
    label,
    kind: "secondary-effect",
    sourceId: `rot-heroic-secondary:${id}`,
    sourceType: "realms-of-terrinoth",
    tags: ["realms-of-terrinoth", "heroic-ability", "secondary-effect"],
    metadata: { printedSource: "Realms of Terrinoth p. 79", automationStatus: "catalog-only", bundledRulesText: false }
});

const origin = (roll, id, label) => ({
    id: `rot-heroic-origin:${id}`,
    label,
    kind: "origin",
    roll,
    sourceId: `rot-heroic-origin:${id}`,
    sourceType: "realms-of-terrinoth",
    tags: ["realms-of-terrinoth", "heroic-ability", "origin"],
    metadata: { printedSource: "Realms of Terrinoth p. 80", automationStatus: "catalog-only", bundledRulesText: false }
});

export const REALMS_OF_TERRINOTH_HEROIC_RULES = Object.freeze({
    requiredAtCreation: true,
    activation: "incidental",
    storyPointCost: 2,
    baseDurationTurns: 1,
    baseUsesPerSession: 1,
    xpPerAbilityPoint: 50,
    maxSecondaryEffects: 2,
    upgradeCosts: Object.freeze({
        duration: 1,
        frequency: 2,
        powerImproved: 1,
        powerSupreme: 2,
        secondaryEffect: 1,
        story: 1
    }),
    storyUpgradeMinimumCost: 1,
    originRoll: Object.freeze({ die: "d10", multipleOriginsResult: 0, ignoreDuplicateMultipleOriginsResult: true }),
    motivationFacets: Object.freeze(["strength", "flaw", "desire", "fear"]),
    motivationCompleteness: "warning"
});

export const REALMS_OF_TERRINOTH_HEROIC_PRIMARY_EFFECTS = Object.freeze([
    primary("all-the-facts", "All the Facts", 74),
    primary("connected", "Connected", 75),
    primary("foretelling", "Foretelling", 75),
    primary("hard-to-kill", "Hard to Kill", 76),
    primary("influential", "Influential", 76),
    primary("miraculous-recovery", "Miraculous Recovery", 76),
    primary("paragon", "Paragon", 76),
    primary("sixth-sense", "Sixth Sense", 77),
    primary("signature-weapon", "Signature Weapon", 77),
    primary("unbowed", "Unbowed", 78),
    primary("unleash", "Unleash", 78)
]);

export const REALMS_OF_TERRINOTH_HEROIC_SECONDARY_EFFECTS = Object.freeze([
    secondary("devastating", "Devastating"),
    secondary("diminish", "Diminish"),
    secondary("drain", "Drain"),
    secondary("empowered", "Empowered"),
    secondary("empower-allies", "Empower Allies"),
    secondary("rejuvenation", "Rejuvenation"),
    secondary("rejuvenate-allies", "Rejuvenate Allies"),
    secondary("renewal", "Renewal")
]);

export const REALMS_OF_TERRINOTH_HEROIC_ORIGINS = Object.freeze([
    origin(1, "in-your-blood", "In Your Blood"),
    origin(2, "chosen-one", "Chosen One"),
    origin(3, "artifact-of-power", "Artifact of Power"),
    origin(4, "favored-by-unseen-forces", "Favored by Unseen Forces"),
    origin(5, "driven", "Driven"),
    origin(6, "life-changing-experience", "Life-Changing Experience"),
    origin(7, "blessed-cursed", "Blessed/Cursed"),
    origin(8, "peerless-training", "Peerless Training"),
    origin(9, "magical-exposure", "Magical Exposure"),
    origin(0, "multiple-origins", "Multiple Origins")
]);

export const GENESYS_MOTIVATION_FACETS = Object.freeze([
    { id: "motivation:strength", label: "Strength", facet: "strength", sourceId: "motivation:strength", sourceType: "genesys-core" },
    { id: "motivation:flaw", label: "Flaw", facet: "flaw", sourceId: "motivation:flaw", sourceType: "genesys-core" },
    { id: "motivation:desire", label: "Desire", facet: "desire", sourceId: "motivation:desire", sourceType: "genesys-core" },
    { id: "motivation:fear", label: "Fear", facet: "fear", sourceId: "motivation:fear", sourceType: "genesys-core" }
]);

export const REALMS_OF_TERRINOTH_HEROIC_MOTIVATION_PACK = Object.freeze({
    id: PACK_ID,
    label: "Realms of Terrinoth - Heroic Abilities & Motivations",
    version: "1.0",
    settingId: SETTING_ID,
    sourceType: "official-setting-catalog",
    complete: true,
    heroicRules: REALMS_OF_TERRINOTH_HEROIC_RULES,
    metadata: {
        content: "Heroic Ability catalogue, origins, upgrades foundation, and Core Motivation facets",
        primaryEffectCount: REALMS_OF_TERRINOTH_HEROIC_PRIMARY_EFFECTS.length,
        secondaryEffectCount: REALMS_OF_TERRINOTH_HEROIC_SECONDARY_EFFECTS.length,
        originCount: REALMS_OF_TERRINOTH_HEROIC_ORIGINS.length,
        authority: "Genesys Core motivation framework + Realms of Terrinoth pp. 74-80 + official errata",
        bundledRulesText: false
    },
    heroicAbilities: [
        ...REALMS_OF_TERRINOTH_HEROIC_PRIMARY_EFFECTS,
        ...REALMS_OF_TERRINOTH_HEROIC_SECONDARY_EFFECTS,
        ...REALMS_OF_TERRINOTH_HEROIC_ORIGINS
    ],
    motivations: GENESYS_MOTIVATION_FACETS
});

Hooks.once("ready", () => {
    try {
        game?.genesysContent?.registerPack?.(REALMS_OF_TERRINOTH_HEROIC_MOTIVATION_PACK, { replace: true });
        console.log(`genesys-vtt | Registered Terrinoth Heroic Ability/Motivation foundation (${REALMS_OF_TERRINOTH_HEROIC_PRIMARY_EFFECTS.length} primary effects)`);
    }
    catch (error) {
        console.error("genesys-vtt | Failed to register Terrinoth Heroic Ability/Motivation foundation", error);
    }
});
