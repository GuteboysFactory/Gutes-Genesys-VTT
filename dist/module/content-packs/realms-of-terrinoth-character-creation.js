const PACK_ID = "realms-of-terrinoth:character-creation";
const SETTING_ID = "realms-of-terrinoth";
const SOURCE_TYPE = "realms-of-terrinoth";

const C = (brawn, agility, intellect, cunning, willpower, presence) => ({ brawn, agility, intellect, cunning, willpower, presence });
const skill = (skillId, rank = 1, options = {}) => ({ skillId, rank, creationCap: 2, ...options });
const ability = (id, label, mechanic, options = {}) => ({ id, label, mechanic, automationStatus: options.automationStatus ?? "catalog-only", ...options });
const item = (id, quantity = 1) => ({ id, quantity });
const choice = (id, label, options) => ({ id, label, options });
const gearPackage = (groups, fundsFormula) => ({ groups, funds: fundsFormula ? { denomination: "silver", formula: fundsFormula } : null });

const HUMAN = { characteristics: C(2, 2, 2, 2, 2, 2), wounds: { base: 10, characteristicId: "brawn" }, strain: { base: 10, characteristicId: "willpower" }, startingXp: 110, silhouette: 1 };
const ELF = { characteristics: C(2, 3, 2, 2, 1, 2), wounds: { base: 9, characteristicId: "brawn" }, strain: { base: 10, characteristicId: "willpower" }, startingXp: 90, silhouette: 1 };
const DWARF = { characteristics: C(2, 1, 2, 2, 3, 2), wounds: { base: 11, characteristicId: "brawn" }, strain: { base: 10, characteristicId: "willpower" }, startingXp: 90, silhouette: 1 };
const ORC = { characteristics: C(3, 2, 2, 2, 2, 1), wounds: { base: 12, characteristicId: "brawn" }, strain: { base: 8, characteristicId: "willpower" }, startingXp: 100, silhouette: 1 };
const CATFOLK = { characteristics: C(2, 2, 1, 3, 2, 2), wounds: { base: 9, characteristicId: "brawn" }, strain: { base: 8, characteristicId: "willpower" }, startingXp: 90, silhouette: 1 };
const HALF_CATFOLK = { characteristics: C(2, 2, 2, 2, 2, 2), wounds: { base: 10, characteristicId: "brawn" }, strain: { base: 9, characteristicId: "willpower" }, startingXp: 100, silhouette: 1 };
const GNOME = { characteristics: C(1, 2, 2, 3, 1, 3), wounds: { base: 6, characteristicId: "brawn" }, strain: { base: 11, characteristicId: "willpower" }, startingXp: 90, silhouette: 0 };

export const REALMS_OF_TERRINOTH_ARCHETYPES = Object.freeze([
    {
        id: "rot-archetype:human", label: "Human", ...HUMAN, startingSkills: [],
        choices: [{ id: "human-starting-skills", type: "skill-grant", count: 2, rank: 1, career: false, distinct: true, creationCap: 2, label: "Choose two different non-career skills" }],
        abilities: [ability("ready-for-adventure", "Ready for Adventure", { type: "story-point-transfer", amount: 1, from: "gm", to: "players", timing: "out-of-turn-incidental", usage: { limit: 1, period: "session" } })],
        tags: ["human"]
    },
    {
        id: "rot-archetype:deep-elf", label: "Deep Elf", ...ELF,
        startingSkills: [skill("discipline", 1), skill("knowledge-forbidden", 2, { career: true })],
        abilities: [ability("ynfernael-lore", "Ynfernael Lore", { type: "career-skill-grant", skillId: "knowledge-forbidden", startingRank: 2 })],
        tags: ["elf", "deep-elf"]
    },
    {
        id: "rot-archetype:free-cities-elf", label: "Free Cities Elf", ...ELF,
        startingSkills: [skill("streetwise", 1)], defense: { melee: 1, ranged: 1 },
        abilities: [ability("nimble", "Nimble", { type: "defense", melee: 1, ranged: 1 }, { automationStatus: "creation-applied" })],
        tags: ["elf", "free-cities"]
    },
    {
        id: "rot-archetype:highborn-elf", label: "Highborn Elf", ...ELF,
        startingSkills: [skill("negotiation", 1), skill("divine", 1, { career: true })],
        abilities: [ability("empyrean-magic", "Empyrean Magic", { type: "career-skill-grant", skillId: "divine", startingRank: 1 })],
        tags: ["elf", "highborn", "magic"]
    },
    {
        id: "rot-archetype:lowborn-elf", label: "Lowborn Elf", ...ELF,
        startingSkills: [skill("survival", 1)], defense: { melee: 1, ranged: 1 },
        abilities: [ability("nimble", "Nimble", { type: "defense", melee: 1, ranged: 1 }, { automationStatus: "creation-applied" })],
        tags: ["elf", "lowborn"]
    },
    {
        id: "rot-archetype:dunwarr-dwarf", label: "Dunwarr Dwarf", ...DWARF,
        startingSkills: [skill("resilience", 1)],
        abilities: [ability("dark-vision", "Dark Vision", { type: "remove-setback", source: "darkness", amount: 2 }), ability("tough-as-nails", "Tough as Nails", { type: "critical-result-override", result: 1, storyPointCost: 1, timing: "out-of-turn-incidental", usage: { limit: 1, period: "session" } })],
        tags: ["dwarf", "dunwarr"]
    },
    {
        id: "rot-archetype:forge-dwarf", label: "Forge Dwarf", ...DWARF,
        startingSkills: [skill("negotiation", 1)],
        abilities: [ability("stubborn", "Stubborn", { type: "target-social-setback", amount: 1 }), ability("tough-as-nails", "Tough as Nails", { type: "critical-result-override", result: 1, storyPointCost: 1, timing: "out-of-turn-incidental", usage: { limit: 1, period: "session" } })],
        tags: ["dwarf", "forge"]
    },
    {
        id: "rot-archetype:broken-plains-orc", label: "Broken Plains Orc", ...ORC,
        startingSkills: [skill("coercion", 1)],
        abilities: [ability("battle-rage", "Battle Rage", { type: "melee-risk-damage", addSetback: 1, damageBonus: 2 })],
        tags: ["orc", "broken-plains"]
    },
    {
        id: "rot-archetype:stone-dweller-orc", label: "Stone-Dweller Orc", ...ORC,
        startingSkills: [skill("cool", 1)],
        abilities: [ability("hot-tempered", "Hot Tempered", { type: "strain-threshold-condition", condition: "strain-over-half", socialSetback: 2, meleeDamageBonus: 1 })],
        tags: ["orc", "stone-dweller"]
    },
    {
        id: "rot-archetype:sunderlands-orc", label: "Sunderlands Orc", ...ORC,
        startingSkills: [skill("alchemy", 1)],
        abilities: [ability("tenacious", "Tenacious", { type: "target-marker", trigger: "successful-combat-hit", benefit: { combatTargetSetback: 1 }, duration: "encounter" })],
        tags: ["orc", "sunderlands", "alchemy"]
    },
    {
        id: "rot-archetype:catfolk", label: "Catfolk", ...CATFOLK,
        startingSkills: [skill("perception", 1)],
        abilities: [ability("claws", "Claws", { type: "natural-weapon", skillId: "brawl", damage: "+1", critical: 3, range: "engaged", qualities: [{ id: "vicious", rank: 1 }] }), ability("fleet-of-paw", "Fleet of Paw", { type: "second-move-maneuver", strainCost: 0, maneuverCap: 2 })],
        tags: ["catfolk"]
    },
    {
        id: "rot-archetype:half-catfolk", label: "Half-Catfolk", ...HALF_CATFOLK,
        startingSkills: [skill("cool", 1)],
        choices: [{ id: "catfolk-ancestry", type: "ability-choice", count: 1, label: "Catfolk Ancestry", options: ["claws", "fleet-of-paw"] }],
        abilities: [ability("claws", "Claws", { type: "natural-weapon", skillId: "brawl", damage: "+1", critical: 3, range: "engaged", qualities: [{ id: "vicious", rank: 1 }] }, { optional: true }), ability("fleet-of-paw", "Fleet of Paw", { type: "second-move-maneuver", strainCost: 0, maneuverCap: 2 }, { optional: true })],
        tags: ["human", "catfolk", "half-catfolk"]
    },
    {
        id: "rot-archetype:burrow-gnome", label: "Burrow Gnome", ...GNOME,
        startingSkills: [skill("charm", 1), skill("resilience", 1)],
        abilities: [ability("small", "Small", { type: "silhouette", value: 0 }, { automationStatus: "creation-applied" }), ability("militia-training", "Militia Training", { type: "combat-target-size-bonus", addBoost: 1, targetSilhouetteGreaterThanSelf: true })],
        tags: ["gnome", "burrow", "small"]
    },
    {
        id: "rot-archetype:wanderer-gnome", label: "Wanderer Gnome", ...GNOME,
        startingSkills: [skill("charm", 1), skill("stealth", 1)],
        abilities: [ability("small", "Small", { type: "silhouette", value: 0 }, { automationStatus: "creation-applied" }), ability("tricksy", "Tricksy", { type: "produce-item", storyPointCost: 1, timing: "turn", usage: { limit: 1, period: "encounter" }, constraints: { maxEncumbrance: 1, maxRarity: 4, weaponRequiresQuality: { id: "limited-ammo", rank: 1 } } })],
        tags: ["gnome", "wanderer", "small"]
    }
].map((entry) => ({ ...entry, sourceId: entry.id, sourceType: SOURCE_TYPE, metadata: { printedSource: "Realms of Terrinoth pp. 60-69", automationStatus: "creation-metadata" } }))));

const TRAVELING_GEAR = Object.freeze([item("backpack"), item("bedroll"), item("rope"), item("flint-and-steel"), item("torch", 3), item("waterskin")]);

export const REALMS_OF_TERRINOTH_CAREERS = Object.freeze([
    {
        id: "rot-career:disciple", label: "Disciple",
        careerSkills: ["athletics", "charm", "discipline", "divine", "knowledge-lore", "leadership", "melee-light", "resilience"], freeSkillChoices: 4, freeSkillRank: 1,
        startingGear: [gearPackage([{ id: "weapon", type: "fixed", items: [item("mace")] }, choice("faith-or-defense", "Holy icon or shield with leather armor", [[item("holy-icon")], [item("shield"), item("leather-armor")]]), choice("supplies", "Lantern and healing herbs or traveling gear", [[item("lantern"), item("herb-of-healing", 2)], [...TRAVELING_GEAR]])], "1d100")]
    },
    {
        id: "rot-career:envoy", label: "Envoy",
        careerSkills: ["charm", "cool", "deception", "knowledge-geography", "leadership", "melee-light", "negotiation", "vigilance"], freeSkillChoices: 4, freeSkillRank: 1,
        startingGear: [gearPackage([{ id: "dagger", type: "fixed", items: [item("dagger")] }, choice("sidearm", "Sword or musical instrument", [[item("sword")], [item("musical-instrument")]]), choice("travel", "Fine cloak or traveling gear", [[item("fine-cloak")], [...TRAVELING_GEAR]]), { id: "armor", type: "fixed", items: [item("padded-armor")] }], "200+1d100")]
    },
    {
        id: "rot-career:mage", label: "Mage",
        careerSkills: ["alchemy", "arcana", "cool", "discipline", "knowledge-adventuring", "knowledge-forbidden", "knowledge-lore", "perception"], freeSkillChoices: 4, freeSkillRank: 1,
        startingGear: [gearPackage([choice("implement", "Magic staff or magic wand", [[item("magic-staff")], [item("magic-wand")]]), choice("weapon", "Dagger or sling", [[item("dagger")], [item("sling")]]), choice("robes-or-elixir", "Heavy robes or stamina elixir", [[item("heavy-robes")], [item("stamina-elixir")]])], "1d100")],
        variants: [{ id: "rot-career:runemaster", label: "Runemaster", replaceCareerSkill: { remove: "arcana", add: "runes" }, replaceStartingGearChoice: { groupId: "implement", options: [[item("lesser-rune")]] }, tags: ["magic", "runes"] }],
        tags: ["magic", "arcana"]
    },
    {
        id: "rot-career:primalist", label: "Primalist",
        careerSkills: ["alchemy", "brawl", "discipline", "knowledge-lore", "medicine", "melee-heavy", "primal", "survival"], freeSkillChoices: 4, freeSkillRank: 1,
        startingGear: [gearPackage([choice("weapon", "Staff or greataxe with leather armor", [[item("staff")], [item("greataxe"), item("leather-armor")]]), choice("supplies", "Apothecary's kit or traveling gear", [[item("apothecarys-kit")], [...TRAVELING_GEAR]])], "1d100")], tags: ["magic", "primal"]
    },
    {
        id: "rot-career:scholar", label: "Scholar",
        careerSkills: ["alchemy", "knowledge-forbidden", "knowledge-geography", "knowledge-lore", "mechanics", "medicine", "perception", "runes"], freeSkillChoices: 4, freeSkillRank: 1,
        startingGear: [gearPackage([{ id: "dagger", type: "fixed", items: [item("dagger")] }, choice("kit-or-sword", "Alchemist's kit or sword", [[item("alchemists-kit")], [item("sword")]]), choice("lantern-or-herbs", "Lantern or healing herbs", [[item("lantern")], [item("herb-of-healing")]]), choice("travel", "Fine cloak or traveling gear", [[item("fine-cloak")], [...TRAVELING_GEAR]])], "1d100")], tags: ["knowledge", "alchemy", "runes"]
    },
    {
        id: "rot-career:scoundrel", label: "Scoundrel",
        careerSkills: ["charm", "cool", "coordination", "deception", "ranged", "skulduggery", "stealth", "streetwise"], freeSkillChoices: 4, freeSkillRank: 1,
        startingGear: [gearPackage([choice("small-weapon", "Dagger or cestus", [[item("dagger")], [item("cestus")]]), choice("primary-weapons", "Sword with dagger or bow", [[item("sword"), item("dagger")], [item("bow")]]), choice("cloak-or-tools", "Fine cloak or thieves' tools", [[item("fine-cloak")], [item("thieves-tools")]]), { id: "traveling-gear", type: "fixed", items: [...TRAVELING_GEAR] }], "1d100")]
    },
    {
        id: "rot-career:scout", label: "Scout",
        careerSkills: ["knowledge-adventuring", "knowledge-geography", "perception", "ranged", "riding", "stealth", "survival", "vigilance"], freeSkillChoices: 4, freeSkillRank: 1,
        startingGear: [gearPackage([choice("primary-weapon", "Bow or light spear", [[item("bow")], [item("light-spear")]]), choice("backup-or-healing", "Dagger or two healing elixirs", [[item("dagger")], [item("healing-elixir", 2)]]), { id: "armor", type: "fixed", items: [item("leather-armor")] }, choice("field-gear", "Healing herbs with climbing gear or winter clothing", [[item("herb-of-healing"), item("climbing-gear")], [item("winter-clothing")]]), { id: "traveling-gear", type: "fixed", items: [...TRAVELING_GEAR] }], "1d100")],
        metadata: { errata: "ROT-ERR-01: first gear bullet is bow or light spear." }
    },
    {
        id: "rot-career:warrior", label: "Warrior",
        careerSkills: ["brawl", "coercion", "leadership", "melee-heavy", "melee-light", "resilience", "riding", "vigilance"], freeSkillChoices: 4, freeSkillRank: 1,
        startingGear: [gearPackage([choice("weapon-set", "Sword and shield, axe and shield, or halberd", [[item("sword"), item("shield")], [item("axe"), item("shield")], [item("halberd")]]), { id: "armor", type: "fixed", items: [item("leather-armor")] }, { id: "healing", type: "fixed", items: [item("healing-elixir", 2)] }, { id: "traveling-gear", type: "fixed", items: [...TRAVELING_GEAR] }], "1d100")], tags: ["martial"]
    }
].map((entry) => ({ ...entry, sourceId: entry.id, sourceType: SOURCE_TYPE, metadata: { printedSource: "Realms of Terrinoth pp. 70-73", ...(entry.metadata ?? {}) } }))));

export const REALMS_OF_TERRINOTH_CHARACTER_CREATION_PACK = Object.freeze({
    id: PACK_ID,
    label: "Realms of Terrinoth — Character Creation",
    version: "1.0",
    settingId: SETTING_ID,
    sourceType: "official-setting-catalog",
    complete: false,
    currency: { mode: "single", label: "Silver Coins", denominations: [{ id: "silver", label: "Silver Coins", abbreviation: "sp", baseValue: 1, icon: "fa-solid fa-coins" }] },
    metadata: { content: "Archetype/species and Career creation metadata", archetypeCount: REALMS_OF_TERRINOTH_ARCHETYPES.length, careerCount: REALMS_OF_TERRINOTH_CAREERS.length, careerVariantCount: 1, authority: "Realms of Terrinoth pp. 60-73 + official errata", bundledRulesText: false },
    archetypes: REALMS_OF_TERRINOTH_ARCHETYPES,
    careers: REALMS_OF_TERRINOTH_CAREERS
});

Hooks.once("ready", () => {
    try {
        game?.genesysContent?.registerPack?.(REALMS_OF_TERRINOTH_CHARACTER_CREATION_PACK, { replace: true });
        console.log(`genesys-vtt | Registered ${REALMS_OF_TERRINOTH_ARCHETYPES.length} Terrinoth archetypes and ${REALMS_OF_TERRINOTH_CAREERS.length} careers`);
    }
    catch (error) {
        console.error("genesys-vtt | Failed to register Realms of Terrinoth character creation catalog", error);
    }
});
