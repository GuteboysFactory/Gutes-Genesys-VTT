const PACK_ID = "realms-of-terrinoth:equipment";
const SETTING_ID = "realms-of-terrinoth";
const SOURCE_TYPE = "realms-of-terrinoth";

const q = (id, rank = 1) => ({ id, rank });
const source = (page, table, extra = {}) => ({ printedSource: `Realms of Terrinoth p. ${page}`, table, bundledRulesText: false, ...extra });
const base = (id, label, itemType, system, page, table, metadata = {}) => ({
    id,
    label,
    itemType,
    sourceId: `rot-equipment:${id}`,
    sourceType: SOURCE_TYPE,
    settingId: SETTING_ID,
    system,
    metadata: source(page, table, metadata)
});

const weapon = (id, label, skillId, damage, critical, range, encumbrance, hardPoints, price, rarity, qualities = [], metadata = {}) => base(
    id, label, "weapon",
    { skillId, attackMode: range === "engaged" ? "melee" : "ranged", engagedProfile: "auto", damageCharacteristic: metadata.fixedDamage ? "none" : "brawn", damage, critical, range, encumbrance, hardPoints, price, rarity, equipped: false, qualities, craftsmanshipId: "", craftsmanshipSourceId: "", notes: "" },
    metadata.page ?? (range === "engaged" || metadata.meleeTable ? 94 : 95), metadata.table ?? (range === "engaged" || metadata.meleeTable ? "2-5" : "2-6"), metadata
);
const armor = (id, label, defense, soak, encumbrance, hardPoints, price, rarity, metadata = {}) => base(
    id, label, "armor",
    { defense, soak, encumbrance, hardPoints, price, rarity, equipped: false, qualities: [], craftsmanshipId: "", craftsmanshipSourceId: "", notes: "" },
    96, "2-7", metadata
);
const implement = (id, label, damage, encumbrance, price, rarity, metadata = {}) => base(
    id, label, "implement",
    { damage, encumbrance, price, rarity, priceMode: price === null ? "priceless" : "priced", materialId: "", tags: metadata.tags ?? ["magic-implement"], equipped: false, notes: "" },
    metadata.page ?? 99, metadata.table ?? "2-8", metadata
);
const gear = (id, label, encumbrance, price, rarity, metadata = {}) => base(
    id, label, "gear",
    { quantity: 1, encumbrance, price, rarity, category: metadata.category ?? "gear", consumable: Boolean(metadata.consumable), activation: metadata.activation ?? "", equipped: false, notes: "" },
    metadata.page ?? 101, metadata.table ?? "2-9", metadata
);
const ruleData = (id, label, ruleKind, data, page) => ({ id, label, itemType: "rule-data", ruleKind, data, sourceId: `rot-equipment-rule:${id}`, sourceType: SOURCE_TYPE, settingId: SETTING_ID, metadata: source(page, "rules") });

export const REALMS_OF_TERRINOTH_EQUIPMENT = Object.freeze([
    weapon("axe", "Axe", "melee-light", 3, 3, "engaged", 2, 1, 150, 1, [q("vicious", 1)]),
    weapon("cestus", "Cestus", "brawl", 1, 4, "engaged", 1, 0, 40, 1, [q("disorient", 3)]),
    weapon("dagger", "Dagger", "melee-light", 2, 3, "engaged", 1, 1, 60, 1, [q("accurate", 1)], { alternateProfiles: [{ skillId: "ranged", damage: 2, critical: 3, range: "short", qualities: [q("accurate", 1), q("limited-ammo", 1)] }] }),
    weapon("flail", "Flail", "melee-heavy", 4, 3, "engaged", 4, 2, 150, 3, [q("cumbersome", 3), q("linked", 1), q("unwieldy", 3)]),
    weapon("greataxe", "Greataxe", "melee-heavy", 4, 3, "engaged", 4, 2, 300, 4, [q("cumbersome", 3), q("pierce", 2), q("vicious", 1)]),
    weapon("greatsword", "Greatsword", "melee-heavy", 4, 2, "engaged", 3, 2, 300, 4, [q("defensive", 1), q("pierce", 1), q("unwieldy", 3)]),
    weapon("halberd", "Halberd", "melee-heavy", 3, 3, "engaged", 5, 3, 250, 3, [q("defensive", 1), q("pierce", 3)]),
    weapon("katar", "Katar", "brawl", 1, 2, "engaged", 1, 1, 175, 4, [q("accurate", 1)]),
    weapon("mace", "Mace", "melee-light", 3, 4, "engaged", 2, 1, 75, 1),
    weapon("military-pick", "Military Pick", "melee-light", 1, 2, "engaged", 3, 1, 160, 2, [q("pierce", 2)]),
    weapon("pike", "Pike", "melee-heavy", 4, 4, "short", 4, 2, 100, 2, [q("prepare", 1)], { meleeTable: true }),
    weapon("shield", "Shield", "melee-light", 0, 6, "engaged", 1, 1, 80, 1, [q("defensive", 1), q("deflection", 1), q("inaccurate", 1), q("knockdown")]),
    weapon("large-shield", "Shield, Large", "melee-light", 1, 5, "engaged", 2, 2, 160, 2, [q("defensive", 2), q("deflection", 2), q("inaccurate", 2), q("knockdown")]),
    weapon("bulwark-shield", "Shield, Bulwark", "melee-light", 2, 5, "engaged", 3, 2, 280, 3, [q("cumbersome", 4), q("defensive", 2), q("deflection", 3), q("inaccurate", 2), q("knockdown"), q("reinforced")]),
    weapon("spear", "Spear", "melee-heavy", 3, 3, "engaged", 3, 1, 110, 2, [q("accurate", 1)]),
    weapon("light-spear", "Spear, Light", "melee-light", 2, 4, "engaged", 2, 1, 90, 1, [q("accurate", 1), q("defensive", 1)], { alternateProfiles: [{ skillId: "ranged", damage: 2, critical: 4, range: "short", qualities: [q("accurate", 1), q("limited-ammo", 1)] }] }),
    weapon("staff", "Staff", "melee-heavy", 2, 4, "engaged", 2, 1, 40, 0, [q("defensive", 1)]),
    weapon("sword", "Sword", "melee-light", 3, 2, "engaged", 1, 1, 200, 2, [q("defensive", 1)]),
    weapon("war-hammer", "War Hammer", "melee-heavy", 5, 4, "engaged", 4, 2, 600, 3, [q("concussive", 1), q("cumbersome", 4), q("inaccurate", 1), q("knockdown")]),

    weapon("bow", "Bow", "ranged", 7, 3, "medium", 2, 1, 275, 2, [q("unwieldy", 2)], { fixedDamage: true }),
    weapon("crossbow", "Crossbow", "ranged", 7, 2, "medium", 3, 1, 600, 4, [q("pierce", 2), q("prepare", 1)], { fixedDamage: true }),
    weapon("hand-crossbow", "Crossbow, Hand", "ranged", 5, 2, "short", 2, 0, 750, 5, [q("pierce", 1), q("prepare", 1)], { fixedDamage: true }),
    weapon("heavy-crossbow", "Crossbow, Heavy", "ranged", 8, 2, "long", 4, 2, 1000, 5, [q("cumbersome", 3), q("pierce", 3), q("prepare", 2)], { fixedDamage: true }),
    weapon("repeating-crossbow", "Crossbow, Repeating", "ranged", 6, 2, "short", 3, 2, 800, 7, [q("linked", 2), q("prepare", 2)], { fixedDamage: true }),
    weapon("longbow", "Longbow", "ranged", 8, 3, "long", 3, 2, 450, 4, [q("unwieldy", 3)], { fixedDamage: true }),
    weapon("sling", "Sling", "ranged", 4, 4, "medium", 0, 0, 20, 0, [q("disorient", 2), q("prepare", 1)], { fixedDamage: true }),
    weapon("throwing-axe", "Throwing Axe", "ranged", 2, 3, "short", 1, 1, 50, 1, [q("inaccurate", 1), q("limited-ammo", 1), q("vicious", 1)], { alternateProfiles: [{ skillId: "melee-light", damage: 2, critical: 3, range: "engaged", qualities: [q("inaccurate", 1), q("vicious", 1)] }] }),

    armor("brigandine", "Brigandine", 1, 1, 2, 1, 400, 5),
    armor("chainmail", "Chainmail", 0, 2, 3, 2, 550, 4, { ruleHints: ["stealth-setback-1"] }),
    armor("heavy-robes", "Heavy Robes", 1, 0, 1, 1, 45, 0),
    armor("leather-armor", "Leather Armor", 0, 1, 2, 1, 50, 3),
    armor("padded-armor", "Padded Armor", 0, 1, 2, 0, 35, 2),
    armor("plate-armor", "Plate Armor", 1, 2, 4, 2, 1000, 6, { ruleHints: ["stealth-setback-2"] }),
    armor("scale-armor", "Scale Armor", 0, 2, 4, 1, 410, 4, { ruleHints: ["stealth-setback-1"] }),

    implement("holy-icon", "Holy Icon", 0, 0, 250, 4),
    implement("magic-scepter", "Magic Scepter", 2, 1, 350, 5),
    implement("magic-staff", "Magic Staff", 4, 2, 400, 6),
    implement("magic-tome", "Magic Tome", 0, 1, 750, 7),
    implement("magic-wand", "Magic Wand", 3, 1, 400, 7),
    implement("musical-instrument", "Musical Instrument", 0, 1, 200, 4),
    implement("lesser-rune", "Lesser Rune", 3, 0, null, null, { page: 119, table: "2-19", tags: ["magic-implement", "runebound-shard", "lesser-rune"], rulesDeferred: true, priceless: true }),

    gear("alchemists-kit", "Alchemist's Kit", 3, 300, 5),
    gear("alchemists-lab-supplies", "Alchemist's Lab (Supplies)", 8, 600, 6),
    gear("apothecarys-kit", "Apothecary's Kit", 2, 150, 4),
    gear("backpack", "Backpack", 0, 50, 3, { encumbranceThresholdBonus: 4 }),
    gear("bedroll", "Bedroll", 1, 15, 1),
    gear("climbing-gear", "Climbing Gear", 1, 20, 2),
    gear("extra-quiver", "Extra Quiver", 2, 25, 2),
    gear("fine-cloak", "Fine Cloak", 1, 90, 4),
    gear("flask-empty", "Flask (Empty)", 0, 1, 1),
    gear("flint-and-steel", "Flint and Steel", 0, 10, 2),
    gear("herb-of-healing", "Herbs of Healing", 0, 50, 6),
    gear("lantern", "Lantern", 1, 50, 1),
    gear("pole", "Pole (30 hands long)", 2, 10, 1),
    gear("rope", "Rope", 1, 5, 1),
    gear("thieves-tools", "Thieves' Tools", 1, 75, 5),
    gear("torch", "Torch", 1, 1, 0, { bundleSizeInTable: 3 }),
    gear("trail-rations", "Trail Rations (1 day)", 0, 2, 0),
    gear("wagon", "Wagon", 0, 200, 2, { capacity: 50 }),
    gear("waterskin", "Waterskin (Empty)", 1, 5, 1, { fullEncumbrance: 2 }),
    gear("winter-clothing", "Winter Clothing", 4, 100, 3, { wornEncumbrance: 1 }),

    gear("acid-flask", "Acid Flask", 0, 200, 6, { table: "2-10", page: 102, category: "potion", consumable: true, activation: "maneuver" }),
    gear("bottled-courage", "Bottled Courage", 1, 25, 5, { table: "2-10", page: 102, category: "potion", consumable: true, activation: "maneuver" }),
    gear("healing-elixir", "Health Elixir", 0, 25, 3, { table: "2-10", page: 102, category: "elixir", consumable: true, activation: "maneuver", aliases: ["health-elixir"] }),
    gear("immunity-elixir", "Immunity Elixir", 1, 100, 4, { table: "2-10", page: 102, category: "elixir", consumable: true, activation: "maneuver" }),
    gear("invisibility-potion", "Invisibility Potion", 1, 1000, 9, { table: "2-10", page: 102, category: "potion", consumable: true, activation: "maneuver" }),
    gear("poison", "Poison", 0, 200, 5, { table: "2-10", page: 102, category: "consumable", consumable: true, activation: "maneuver" }),
    gear("power-potion", "Power Potion", 1, 250, 6, { table: "2-10", page: 102, category: "potion", consumable: true, activation: "maneuver" }),
    gear("protective-tonic", "Protective Tonic", 1, 125, 6, { table: "2-10", page: 102, category: "potion", consumable: true, activation: "maneuver" }),
    gear("regeneration-elixir", "Regeneration Elixir", 1, 50, 4, { table: "2-10", page: 102, category: "elixir", consumable: true, activation: "maneuver" }),
    gear("smokebomb-vial", "Smokebomb Vial", 0, 25, 4, { table: "2-10", page: 102, category: "consumable", consumable: true, activation: "maneuver" }),
    gear("speed-potion", "Speed Potion", 1, 200, 7, { table: "2-10", page: 102, category: "potion", consumable: true, activation: "maneuver" }),
    gear("stamina-elixir", "Stamina Elixir", 0, 50, 3, { table: "2-10", page: 102, category: "elixir", consumable: true, activation: "maneuver", errata: "Usable to heal strain during a social encounter." }),

    ruleData("craftsmanship-ancient", "Ancient Craftsmanship", "craftsmanship", { id: "ancient", compatibleItemTypes: ["weapon", "armor"], priceMultiplier: 20, rarityMode: "set", rarityValue: 10, singleSlot: true }, 97),
    ruleData("craftsmanship-dwarven", "Dwarven Craftsmanship", "craftsmanship", { id: "dwarven", compatibleItemTypes: ["weapon", "armor"], priceMultiplier: 2, rarityMode: "add", rarityValue: 2, singleSlot: true }, 97),
    ruleData("craftsmanship-elven", "Elven Craftsmanship", "craftsmanship", { id: "elven", compatibleItemTypes: ["weapon", "armor"], priceMultiplier: 2, rarityMode: "add", rarityValue: 3, singleSlot: true }, 97),
    ruleData("implement-material-bone", "Bone Implement Material", "implement-material", { id: "bone", priceMultiplier: 1.5, rarityDelta: 2, errataApplied: true }, 99),
    ruleData("implement-material-oak", "Oak Implement Material", "implement-material", { id: "oak", priceMultiplier: 1, rarityDelta: 0 }, 99),
    ruleData("implement-material-hazel", "Hazel Implement Material", "implement-material", { id: "hazel", priceMultiplier: 1.5, rarityDelta: 1, errataApplied: true }, 99),
    ruleData("implement-material-willow", "Willow Implement Material", "implement-material", { id: "willow", priceMultiplier: 2, rarityDelta: 2 }, 99),
    ruleData("implement-material-yew", "Yew Implement Material", "implement-material", { id: "yew", priceMultiplier: 1.5, rarityDelta: 1, errataApplied: true }, 99)
]);

export const REALMS_OF_TERRINOTH_EQUIPMENT_PACK = Object.freeze({
    id: PACK_ID,
    label: "Realms of Terrinoth - Equipment & Wallet",
    version: "1.0",
    settingId: SETTING_ID,
    sourceType: "official-setting-catalog",
    complete: true,
    currency: { mode: "single", label: "Silver Coins", denominations: [{ id: "silver", label: "Silver Coins", abbreviation: "sp", baseValue: 1, icon: "fa-solid fa-coins" }] },
    metadata: {
        content: "Weapons, armor, magic implements, adventuring gear, potions/elixirs, craftsmanship and implement-material metadata",
        authority: "Realms of Terrinoth Tables 2-5 through 2-10 and Table 2-19 + official FAQ/errata",
        bundledRulesText: false,
        equipmentEntryCount: REALMS_OF_TERRINOTH_EQUIPMENT.filter((entry) => entry.itemType !== "rule-data").length,
        ruleDataCount: REALMS_OF_TERRINOTH_EQUIPMENT.filter((entry) => entry.itemType === "rule-data").length
    },
    equipment: REALMS_OF_TERRINOTH_EQUIPMENT
});

Hooks.once("ready", () => {
    try {
        game?.genesysContent?.registerPack?.(REALMS_OF_TERRINOTH_EQUIPMENT_PACK, { replace: true });
        console.log(`genesys-vtt | Registered ${REALMS_OF_TERRINOTH_EQUIPMENT_PACK.metadata.equipmentEntryCount} Terrinoth equipment entries`);
    }
    catch (error) {
        console.error("genesys-vtt | Failed to register Terrinoth equipment catalog", error);
    }
});
