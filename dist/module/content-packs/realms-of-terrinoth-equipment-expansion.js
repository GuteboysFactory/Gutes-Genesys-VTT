const PACK_ID = "realms-of-terrinoth:equipment-expansion";
const SETTING_ID = "realms-of-terrinoth";

const q = (id, rank = 1) => ({ id, rank });
const source = (printedSource, table, extra = {}) => ({
    printedSource,
    table,
    bundledRulesText: false,
    ...extra
});

const attachment = (id, label, compatibleTypes, hardPointCost, price, rarity, metadata = {}) => ({
    id,
    label,
    itemType: "attachment",
    sourceId: `rot-equipment-expansion:${id}`,
    sourceType: metadata.sourceType ?? "realms-of-terrinoth",
    settingId: SETTING_ID,
    system: {
        hardPointCost,
        installed: false,
        hostItemId: "",
        compatibleTypes,
        price: price ?? 0,
        priceMode: price === null ? "priceless" : "priced",
        rarity,
        qualities: metadata.qualities ?? [],
        notes: metadata.rulesSummary ?? ""
    },
    metadata: source(metadata.printedSource ?? "Realms of Terrinoth pp. 106-108", metadata.table ?? "2-13/2-14", {
        category: "attachment",
        priceMode: price === null ? "priceless" : "priced",
        rulesSummary: metadata.rulesSummary ?? "",
        compatibilityTags: metadata.compatibilityTags ?? [],
        effectHints: metadata.effectHints ?? [],
        rulesDeferred: Boolean(metadata.rulesDeferred),
        errataApplied: Boolean(metadata.errataApplied),
        sourceVersion: metadata.sourceVersion ?? "RoT + official errata baseline v1.1"
    })
});

const gear = (id, label, encumbrance, price, rarity, metadata = {}) => ({
    id,
    label,
    itemType: "gear",
    sourceId: `rot-equipment-expansion:${id}`,
    sourceType: "realms-of-terrinoth",
    settingId: SETTING_ID,
    system: {
        quantity: 1,
        encumbrance,
        price,
        rarity,
        category: metadata.category ?? "gear",
        consumable: false,
        activation: "",
        equipped: false,
        notes: metadata.rulesSummary ?? ""
    },
    metadata: source(metadata.printedSource ?? "Realms of Terrinoth p. 105", metadata.table ?? "2-11", {
        category: metadata.category ?? "gear",
        capacityBonus: metadata.capacityBonus ?? 0,
        rulesSummary: metadata.rulesSummary ?? "",
        sourceVersion: "RoT"
    })
});

const rune = (id, label, damage, metadata = {}) => ({
    id,
    label,
    itemType: "implement",
    sourceId: `rot-equipment-expansion:${id}`,
    sourceType: "realms-of-terrinoth",
    settingId: SETTING_ID,
    system: {
        damage,
        encumbrance: 0,
        price: null,
        rarity: null,
        priceMode: "priceless",
        materialId: "",
        tags: ["magic-implement", "runebound-shard", `rune:${id}`],
        equipped: false,
        notes: "Runebound shard. Activation and implement behavior resolve through Terrinoth rune rules."
    },
    metadata: source("Realms of Terrinoth pp. 118-121", "2-19", {
        category: "runebound-shard",
        runeboundShard: true,
        activationAvailableToUntrained: true,
        implementSkillId: "runes",
        implementDamageBonus: damage,
        activationProfile: metadata.activationProfile ?? null,
        activationDeferred: metadata.activationDeferred !== false,
        implementRulesDeferred: true,
        sourceVersion: "RoT"
    })
});

const ruleData = (id, label, ruleKind, data, printedSource, table) => ({
    id,
    label,
    itemType: "rule-data",
    ruleKind,
    data,
    sourceId: `rot-equipment-expansion-rule:${id}`,
    sourceType: "realms-of-terrinoth",
    settingId: SETTING_ID,
    metadata: source(printedSource, table, { sourceVersion: "RoT", bundledRulesText: false })
});

export const REALMS_OF_TERRINOTH_EQUIPMENT_EXPANSION = Object.freeze([
    attachment("balanced-hilt", "Balanced Hilt", "weapon", 1, 1000, 6, { sourceType: "genesys-core", printedSource: "Genesys Core Rulebook p. 207", table: "RoT 2-13", rulesDeferred: true, rulesSummary: "Core weapon attachment; use the Core attachment rules when installed." }),
    attachment("duelist-cross-guard", "Duelist Cross Guard", "weapon", 1, 800, 5, { sourceType: "genesys-core", printedSource: "Genesys Core Rulebook p. 207", table: "RoT 2-13", rulesDeferred: true, rulesSummary: "Core weapon attachment; use the Core attachment rules when installed." }),
    attachment("explosive-missile", "Explosive Missile", "weapon", 1, 1250, 7, { compatibilityTags: ["ranged"], qualities: [q("blast", 5)], effectHints: [{ type: "add-quality", id: "blast", rank: 5 }], rulesSummary: "For a ranged weapon; grants Blast 5." }),
    attachment("razor-edge", "Razor Edge", "weapon", 1, 1250, 6, { sourceType: "genesys-core", printedSource: "Genesys Core Rulebook p. 208", table: "RoT 2-13", rulesDeferred: true, rulesSummary: "Core weapon attachment; use the Core attachment rules when installed." }),
    attachment("recurve-limbs", "Recurve Limbs", "weapon", 1, 300, 4, { sourceType: "genesys-core", printedSource: "Genesys Core Rulebook p. 208", table: "RoT 2-13", rulesDeferred: true, rulesSummary: "Core weapon attachment; use the Core attachment rules when installed." }),
    attachment("rune-of-blades", "Rune of Blades", "weapon", 1, null, 10, { compatibilityTags: ["bladed"], effectHints: [{ type: "critical-replacement", result: "bleeding-out" }], rulesSummary: "For a bladed weapon; replaces the normal rolled Critical Injury with Bleeding Out when its effect applies." }),
    attachment("runic-flame", "Runic Flame", "weapon", 1, 2000, 8, { compatibilityTags: ["melee"], qualities: [q("burn", 1)], effectHints: [{ type: "add-quality", id: "burn", rank: 1 }], rulesSummary: "For a melee weapon; grants Burn 1." }),
    attachment("runic-frost", "Runic Frost", "weapon", 1, 1750, 8, { compatibilityTags: ["melee"], qualities: [q("ensnare", 1), q("stun", 4)], effectHints: [{ type: "add-quality", id: "ensnare", rank: 1 }, { type: "add-quality", id: "stun", rank: 4 }], rulesSummary: "For a melee weapon; grants Ensnare 1 and Stun 4." }),
    attachment("runic-thunder", "Runic Thunder", "weapon", 2, 2000, 8, { qualities: [q("concussive", 1)], effectHints: [{ type: "add-quality", id: "concussive", rank: 1 }], rulesSummary: "For a weapon; grants Concussive 1." }),
    attachment("rune-of-severing", "Rune of Severing", "weapon", 2, null, 10, { compatibilityTags: ["bladed", "melee"], qualities: [q("vicious", 5)], effectHints: [{ type: "add-quality", id: "vicious", rank: 5 }], rulesSummary: "For a bladed melee weapon; grants Vicious 5." }),
    attachment("serrated-edge", "Serrated Edge", "weapon", 1, 75, 2, { sourceType: "genesys-core", printedSource: "Genesys Core Rulebook p. 208", table: "RoT 2-13", rulesDeferred: true, rulesSummary: "Core weapon attachment; use the Core attachment rules when installed." }),
    attachment("superior-weapon-customization", "Superior Weapon Customization", "weapon", 1, 750, 7, { sourceType: "genesys-core", printedSource: "Genesys Core Rulebook p. 208", table: "RoT 2-13", rulesDeferred: true, rulesSummary: "Core weapon attachment; use the Core attachment rules when installed." }),
    attachment("weighted-head", "Weighted Head", "weapon", 1, 250, 2, { sourceType: "genesys-core", printedSource: "Genesys Core Rulebook p. 209", table: "RoT 2-13", rulesDeferred: true, rulesSummary: "Core weapon attachment; use the Core attachment rules when installed." }),
    attachment("ynfernael-corruption", "Ynfernael Corruption", "weapon", 1, null, 8, { effectHints: [{ type: "damage", delta: 2 }, { type: "strain-suffered", delta: 1, predicate: "wielding-host" }], rulesSummary: "For a weapon; increases base damage by 2 and carries an additional strain cost while the corrupted weapon is being used." }),

    attachment("deflective-plating", "Deflective Plating", "armor", 1, 450, 4, { sourceType: "genesys-core", printedSource: "Genesys Core Rulebook p. 209", table: "RoT 2-14", rulesDeferred: true, rulesSummary: "Core armor attachment; use the Core attachment rules when installed." }),
    attachment("gilded", "Gilded", "armor", 0, 1500, 5, { effectHints: [{ type: "add-boost", skills: ["charm", "negotiation", "leadership"], count: 1 }], rulesSummary: "For armor; adds a Boost die to Charm, Negotiation, and Leadership checks while worn." }),
    attachment("intimidating-visage", "Intimidating Visage", "armor", 0, 236, 3, { sourceType: "genesys-core", printedSource: "Genesys Core Rulebook p. 209", table: "RoT 2-14", rulesDeferred: true, rulesSummary: "Core armor attachment; use the Core attachment rules when installed." }),
    attachment("ironbound-rune", "Ironbound Rune", "armor", 2, null, 10, { compatibilityTags: ["metal"], effectHints: [{ type: "defense", delta: 1 }, { type: "soak", delta: 1 }], rulesSummary: "For metal armor; increases defense by 1 and soak by 1." }),
    attachment("reinforced-plating", "Reinforced Plating", "armor", 2, 8000, 7, { sourceType: "genesys-core", printedSource: "Genesys Core Rulebook p. 209", table: "RoT 2-14", rulesDeferred: true, rulesSummary: "Core armor attachment; use the Core attachment rules when installed." }),
    attachment("spikes", "Spikes", "armor", 1, 600, 4, { compatibilityTags: ["plate"], effectHints: [{ type: "melee-retaliation", wounds: 3, spend: "3-threat-or-despair" }], rulesSummary: "For plate armor; can punish a melee attacker when the attack generates the required negative symbols.", errataApplied: true }),
    attachment("twilight-rune", "Twilight Rune", "armor", 1, null, 10, { effectHints: [{ type: "add-boost", skills: ["stealth"], count: 2 }, { type: "ranged-defense", delta: 2 }], rulesSummary: "For armor; adds two Boost dice to Stealth checks and increases ranged defense by 2 while worn." }),

    gear("barding", "Barding", 5, 900, 4, { category: "mount-gear" }),
    gear("saddlebags", "Saddlebags", 0, 75, 3, { category: "mount-gear", capacityBonus: 4, rulesSummary: "Mount carrying gear; increases carrying capacity by 4 encumbrance." }),

    rune("arcane-bolt-rune", "Arcane Bolt Rune", 4, { activationProfile: { skillId: "ranged", damage: 8, critical: 3, range: "medium", qualities: [q("auto-fire")] } }),
    rune("blasting-rune", "Blasting Rune", 5, { activationProfile: { skillId: "discipline", damage: 9, critical: 3, range: "medium", qualities: [q("blast", 7), q("knockdown")] } }),
    rune("ice-storm-rune", "Ice Storm Rune", 4),
    rune("immolation-rune", "Immolation Rune", null),
    rune("lightning-strike-rune", "Lightning Strike Rune", 5, { activationProfile: { skillId: "discipline", damage: 8, critical: 3, range: "long", qualities: [q("auto-fire"), q("disorient", 3)] } }),
    rune("rune-of-collection", "Rune of Collection", 0),
    rune("rune-of-fate", "Rune of Fate", 0),
    rune("rune-of-misery", "Rune of Misery", 0),
    rune("soulstone-rune", "Soulstone Rune", 0),
    rune("stasis-rune", "Stasis Rune", 0),
    rune("sunburst-rune", "Sunburst Rune", 0),
    rune("teleportation-rune", "Teleportation Rune", 0),
    rune("terror-rune", "Terror Rune", 0),
    rune("vision-rune", "Vision Rune", 0),
    rune("wanderers-stone", "Wanderer's Stone", 0),
    rune("ynfernael-rune", "Ynfernael Rune", 3),

    ruleData("mount-beast-of-burden", "Beast of Burden", "mount-catalog", { price: 200, rarity: 1, mountType: "beast-of-burden" }, "Realms of Terrinoth p. 105", "2-11"),
    ruleData("mount-flying", "Flying Mount", "mount-catalog", { price: 2000, rarity: 8, mountType: "flying", errata: "Flying mount profile must not receive the removed Dodge 2 talent." }, "Realms of Terrinoth p. 105", "2-11"),
    ruleData("mount-riding-beast", "Riding Beast", "mount-catalog", { price: 400, rarity: 2, mountType: "riding" }, "Realms of Terrinoth p. 105", "2-11"),
    ruleData("mount-war", "War Mount", "mount-catalog", { price: 1500, rarity: 6, mountType: "war" }, "Realms of Terrinoth p. 105", "2-11"),

    ruleData("service-ale", "Ale (Flagon)", "service", { price: 1, rarity: 0, unit: "flagon" }, "Realms of Terrinoth p. 105", "2-12"),
    ruleData("service-lodging-common", "Lodging (Common Room)", "service", { price: 1, rarity: 0, unit: "night" }, "Realms of Terrinoth p. 105", "2-12"),
    ruleData("service-lodging-private", "Lodging (Private Room)", "service", { price: 5, rarity: 1, unit: "night" }, "Realms of Terrinoth p. 105", "2-12"),
    ruleData("service-meal", "Meal (Tavern)", "service", { price: 2, rarity: 0, unit: "meal" }, "Realms of Terrinoth p. 105", "2-12"),
    ruleData("service-porter", "Porter", "service", { price: 1, rarity: 1, unit: "day" }, "Realms of Terrinoth p. 105", "2-12"),
    ruleData("service-torchbearer", "Torchbearer", "service", { price: 1, rarity: 1, unit: "day" }, "Realms of Terrinoth p. 105", "2-12"),
    ruleData("service-riverboat", "Travel, Riverboat", "service", { price: 5, rarity: 2, unit: "day" }, "Realms of Terrinoth p. 105", "2-12"),
    ruleData("service-wagon", "Travel, Wagon", "service", { price: 2, rarity: 1, unit: "day" }, "Realms of Terrinoth p. 105", "2-12"),
    ruleData("service-wine", "Wine (Bottle)", "service", { price: 2, rarity: 1, unit: "bottle" }, "Realms of Terrinoth p. 105", "2-12")
]);

export const REALMS_OF_TERRINOTH_EQUIPMENT_EXPANSION_PACK = Object.freeze({
    id: PACK_ID,
    label: "Realms of Terrinoth - Equipment Expansion",
    version: "1.0",
    settingId: SETTING_ID,
    sourceType: "realms-of-terrinoth",
    complete: false,
    metadata: {
        source: "Realms of Terrinoth",
        sourceScope: "Tables 2-11 through 2-14 and 2-19",
        crossReference: "Equipment Encyclopedia v2.0.5 / GenesysRef ledger",
        attachmentCount: REALMS_OF_TERRINOTH_EQUIPMENT_EXPANSION.filter((entry) => entry.itemType === "attachment").length,
        runeCount: REALMS_OF_TERRINOTH_EQUIPMENT_EXPANSION.filter((entry) => entry.itemType === "implement").length,
        gearCount: REALMS_OF_TERRINOTH_EQUIPMENT_EXPANSION.filter((entry) => entry.itemType === "gear").length,
        ruleDataCount: REALMS_OF_TERRINOTH_EQUIPMENT_EXPANSION.filter((entry) => entry.itemType === "rule-data").length
    },
    equipment: REALMS_OF_TERRINOTH_EQUIPMENT_EXPANSION
});

Hooks.once("ready", () => {
    try {
        game?.genesysContent?.registerPack?.(REALMS_OF_TERRINOTH_EQUIPMENT_EXPANSION_PACK, { replace: true });
        console.log(`genesys-vtt | Registered Terrinoth equipment expansion: ${REALMS_OF_TERRINOTH_EQUIPMENT_EXPANSION.length} entries`);
    }
    catch (error) {
        console.error("genesys-vtt | Failed to register Terrinoth equipment expansion", error);
    }
});
