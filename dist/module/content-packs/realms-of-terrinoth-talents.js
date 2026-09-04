import { createCoreParryTalent, createCoreSecondWindTalent, createTerrinothFinesseTalent } from "../../domain/rules/index.js";

const PACK_ID = "realms-of-terrinoth:talents";
const SETTING_ID = "realms-of-terrinoth";

const ROWS = Object.freeze([
    "Adventurer|2|passive|0|rot",
    "Animal Companion|3|passive|1|core",
    "Apothecary|1|passive|1|rot",
    "Back-to-Back|4|passive|0|rot",
    "Backstab|3|action|0|rot",
    "Bard|2|passive|0|rot",
    "Battle Casting|3|passive|0|rot",
    "Berserk|2|maneuver|0|core",
    "Block|2|out-of-turn-incidental|0|rot",
    "Blood Sacrifice|2|incidental|1|rot",
    "Body Guard|3|maneuver|1|core",
    "Bought Info|1|action|0|core",
    "Bullrush|1|incidental|0|rot",
    "Bulwark|2|out-of-turn-incidental|0|rot",
    "Can’t We Talk About This?|4|action|0|core",
    "Cavalier|3|maneuver|0|rot",
    "Challenge!|1|maneuver|1|rot",
    "Chill of Nordros|2|incidental|0|rot",
    "Clever Retort|1|out-of-turn-incidental|0|core",
    "Conduit|4|incidental|0|rot",
    "Coordinated Assault|2|maneuver|1|core",
    "Counterattack|3|out-of-turn-incidental|0|rot",
    "Counteroffer|2|action|0|core",
    "Crushing Blow|5|incidental|0|rot",
    "Dark Insight|1|incidental|0|rot",
    "Deadeye|4|incidental|0|core",
    "Death Rage|4|passive|0|rot",
    "Dedication|5|passive|1|core",
    "Defensive|4|passive|1|core",
    "Defensive Stance|2|maneuver|1|core",
    "Desperate Recovery|1|passive|0|core",
    "Dirty Tricks|2|incidental|0|rot",
    "Dissonance|3|action|0|rot",
    "Dodge|3|out-of-turn-incidental|1|core",
    "Dominion of the Dimora|2|incidental|0|rot",
    "Dual Strike|3|incidental|0|rot",
    "Dual Wielder|2|maneuver|0|core",
    "Duelist|1|passive|0|core",
    "Dungeoneer|1|passive|1|rot",
    "Durable|1|passive|1|core",
    "Eagle Eyes|3|incidental|0|core",
    "Easy Prey|3|maneuver|0|rot",
    "Encouraging Song|2|action|0|rot",
    "Enduring|4|passive|1|core",
    "Exploit|2|incidental|1|rot",
    "Favor of the Fae|2|incidental|0|rot",
    "Field Commander|3|action|0|core",
    "Field Commander (Improved)|4|passive|0|core",
    "Finesse|1|incidental|0|rot",
    "Flames of Kellos|2|incidental|0|rot",
    "Flash of Insight|2|passive|0|rot",
    "Forager|1|passive|0|core",
    "Grapple|2|incidental|0|rot",
    "Grit|1|passive|1|core",
    "Hamstring Shot|1|action|0|core",
    "Heightened Awareness|2|passive|0|core",
    "Heroic Recovery|2|incidental|0|rot",
    "Heroic Will|3|out-of-turn-incidental|0|core",
    "Hunter|2|passive|0|rot",
    "Impaling Strike|2|incidental|0|rot",
    "Inspiring Rhetoric|2|action|0|core",
    "Inspiring Rhetoric (Improved)|3|passive|0|core",
    "Inspiring Rhetoric (Supreme)|4|incidental|0|core",
    "Inventor|2|incidental|1|core",
    "Jump Up|1|incidental|0|core",
    "Justice of the Citadel|3|incidental|0|rot",
    "Knack for It|1|passive|1|core",
    "Know Somebody|1|incidental|1|core",
    "Let’s Ride|1|incidental|0|core",
    "Let’s Talk This Over|5|out-of-turn-incidental|0|rot",
    "Lucky Strike|2|incidental|0|core",
    "Master|5|incidental|0|core",
    "Natural|3|incidental|0|core",
    "Natural Communion|2|passive|0|rot",
    "One with Nature|1|passive|0|core",
    "Painful Blow|1|incidental|0|rot",
    "Painkiller Specialization|3|passive|1|core",
    "Parry|1|out-of-turn-incidental|1|core",
    "Parry (Improved)|3|out-of-turn-incidental|0|core",
    "Potent Concoctions|3|passive|0|rot",
    "Precise Archery|3|passive|0|rot",
    "Precision|1|incidental|0|rot",
    "Pressure Point|3|incidental|0|rot",
    "Proper Upbringing|1|incidental|1|core",
    "Quick Draw|1|incidental|0|core",
    "Quick Strike|1|passive|1|core",
    "Rapid Archery|3|maneuver|0|core",
    "Reckless Charge|2|incidental|0|rot",
    "Retribution!|5|out-of-turn-incidental|0|rot",
    "Runic Lore|2|passive|0|rot",
    "Shapeshifter|1|passive|0|rot",
    "Shapeshifter (Improved)|2|incidental|0|rot",
    "Shield Slam|1|incidental|0|rot",
    "Shockwave|3|passive|0|rot",
    "Signature Spell|2|passive|0|rot",
    "Signature Spell (Improved)|4|passive|0|rot",
    "Tavern Brawler|1|passive|0|rot",
    "Templar|1|passive|0|rot",
    "Templar (Improved)|2|passive|0|rot",
    "Threaten|2|out-of-turn-incidental|1|rot",
    "Tumble|1|incidental|0|rot",
    "Unrelenting|4|incidental|0|rot",
    "Venom Soaked Blade|4|passive|0|rot",
    "Well-Traveled|2|passive|0|rot",
    "Whirlwind|5|action|0|rot",
    "Wraithbane|2|passive|0|rot",
    "Zealous Fire|5|passive|0|rot",
    "Second Wind|1|incidental|1|core",
    "Side Step|2|maneuver|1|core",
    "Swift|1|passive|0|core",
    "Toughened|1|passive|1|core",
    "Unremarkable|1|passive|0|core"
]);

const PREREQUISITES = Object.freeze({
    "Block": ["core-talent:parry"],
    "Blood Sacrifice": ["terrinoth-talent:dark-insight"],
    "Bulwark": ["core-talent:parry"],
    "Counterattack": ["core-talent:parry-improved"],
    "Field Commander (Improved)": ["core-talent:field-commander"],
    "Inspiring Rhetoric (Improved)": ["core-talent:inspiring-rhetoric"],
    "Inspiring Rhetoric (Supreme)": ["core-talent:inspiring-rhetoric-improved"],
    "Parry (Improved)": ["core-talent:parry"],
    "Shapeshifter (Improved)": ["terrinoth-talent:shapeshifter"],
    "Signature Spell (Improved)": ["terrinoth-talent:signature-spell"],
    "Templar (Improved)": ["terrinoth-talent:templar"]
});

const EXCLUDES = Object.freeze({
    "Chill of Nordros": ["terrinoth-talent:flames-of-kellos"],
    "Flames of Kellos": ["terrinoth-talent:chill-of-nordros"],
    "Dominion of the Dimora": ["terrinoth-talent:favor-of-the-fae"],
    "Favor of the Fae": ["terrinoth-talent:dominion-of-the-dimora"]
});

function slug(value) {
    return String(value ?? "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[’']/g, "")
        .replace(/\(improved\)/g, " improved ")
        .replace(/\(supreme\)/g, " supreme ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function canonicalId(name, sourceKind) {
    if (name === "Finesse") return "terrinoth-talent:finesse";
    if (name === "Parry") return "core-talent:parry";
    if (name === "Second Wind") return "core-talent:second-wind";
    return `${sourceKind === "rot" ? "terrinoth-talent" : "core-talent"}:${slug(name)}`;
}

function activationLabel(value) {
    switch (value) {
        case "action": return "action";
        case "maneuver": return "maneuver";
        case "incidental": return "incidental";
        case "out-of-turn-incidental": return "out-of-turn-incidental";
        default: return "passive";
    }
}

function automatedDefinitions() {
    const definitions = [createCoreParryTalent(1), createCoreSecondWindTalent(1), createTerrinothFinesseTalent()];
    return new Map(definitions.map((talent) => [talent.id, talent]));
}

export function buildRealmsOfTerrinothTalentCatalog() {
    const automated = automatedDefinitions();
    return ROWS.map((row) => {
        const [name, tierText, activation, rankedText, sourceKind] = row.split("|");
        const id = canonicalId(name, sourceKind);
        const existing = automated.get(id);
        const sourceType = sourceKind === "rot" ? "realms-of-terrinoth" : "genesys-core";
        return {
            id,
            label: name,
            name,
            tier: Number(tierText),
            ranked: rankedText === "1",
            rank: 1,
            activation: activationLabel(activation),
            enabled: true,
            sourceId: id,
            sourceType,
            tags: ["realms-of-terrinoth", sourceType],
            rules: existing?.rules ?? [],
            notes: existing?.notes ?? "Catalog metadata only. Full rules text is not bundled with the public system.",
            requirements: (PREREQUISITES[name] ?? []).map((talentId) => ({ type: "talent", id: talentId })),
            excludes: [...(EXCLUDES[name] ?? [])],
            metadata: {
                printedSource: sourceKind === "rot" ? "Realms of Terrinoth" : "Genesys Core Rulebook",
                authority: "Realms of Terrinoth Table 2-4 + official errata",
                workingIndex: "Genesys Talents Expanded Version 5.0",
                automationStatus: existing ? "implemented" : "catalog-only"
            }
        };
    });
}

export const REALMS_OF_TERRINOTH_TALENT_PACK = Object.freeze({
    id: PACK_ID,
    label: "Realms of Terrinoth — Talent Catalog",
    version: "1.0",
    settingId: SETTING_ID,
    sourceType: "official-setting-catalog",
    complete: true,
    metadata: {
        content: "Talent metadata catalog",
        count: ROWS.length,
        authority: "Official Realms of Terrinoth Table 2-4 with official errata overrides",
        workingIndex: "Genesys Talents Expanded Version 5.0",
        bundledRulesText: false
    },
    talents: buildRealmsOfTerrinothTalentCatalog()
});

Hooks.once("ready", () => {
    try {
        game?.genesysContent?.registerPack?.(REALMS_OF_TERRINOTH_TALENT_PACK, { replace: true });
        console.log(`genesys-vtt | Registered ${ROWS.length} Realms of Terrinoth Talent catalog entries`);
    }
    catch (error) {
        console.error("genesys-vtt | Failed to register Realms of Terrinoth Talent catalog", error);
    }
});
