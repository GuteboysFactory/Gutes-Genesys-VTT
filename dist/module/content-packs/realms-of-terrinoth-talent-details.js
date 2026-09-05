import { REALMS_OF_TERRINOTH_TALENT_PACK } from "./realms-of-terrinoth-talents.js";
import { talentRulesSummary } from "./talent-rules-summaries.js";

const SYSTEM_ID = "genesys-vtt";

const CORE_PAGE_REFERENCES = Object.freeze({
  "Animal Companion": 77,
  "Berserk": 75,
  "Bought Info": 72,
  "Can’t We Talk About This?": 79,
  "Clever Retort": 73,
  "Coordinated Assault": 75,
  "Counteroffer": 75,
  "Deadeye": 79,
  "Dedication": 81,
  "Defensive": 80,
  "Defensive Stance": 75,
  "Desperate Recovery": 73,
  "Dodge": 78,
  "Dual Wielder": 76,
  "Duelist": 73,
  "Durable": 73,
  "Eagle Eyes": 78,
  "Enduring": 80,
  "Field Commander": 78,
  "Field Commander (Improved)": 80,
  "Forager": 73,
  "Grit": 73,
  "Hamstring Shot": 73,
  "Heightened Awareness": 76,
  "Heroic Will": 79,
  "Inspiring Rhetoric": 76,
  "Inspiring Rhetoric (Improved)": 78,
  "Inspiring Rhetoric (Supreme)": 80,
  "Inventor": 76,
  "Jump Up": 73,
  "Knack for It": 73,
  "Know Somebody": 74,
  "Let’s Ride": 74,
  "Lucky Strike": 76,
  "Master": 81,
  "Natural": 79,
  "One with Nature": 74,
  "Painkiller Specialization": 79,
  "Parry": 74,
  "Parry (Improved)": 79,
  "Proper Upbringing": 74,
  "Quick Draw": 74,
  "Quick Strike": 74,
  "Rapid Archery": 79
});

function correctedSourceType(entry) {
  if (entry?.label === "Body Guard") return "realms-of-terrinoth";
  return String(entry?.sourceType ?? "realms-of-terrinoth");
}

function sourceReference(entry, sourceType) {
  if (sourceType === "realms-of-terrinoth") return "Realms of Terrinoth pp. 84–91";
  const page = CORE_PAGE_REFERENCES[entry?.label];
  return page ? `Genesys Core Rulebook p. ${page}` : "Genesys Core Rulebook";
}

function detailTalent(entry) {
  const sourceType = correctedSourceType(entry);
  const rulesSummary = talentRulesSummary(entry?.label);
  const automated = Array.isArray(entry?.rules) && entry.rules.length > 0;
  return Object.freeze({
    ...entry,
    sourceType,
    tags: [...new Set([...(entry?.tags ?? []).filter((tag) => tag !== "genesys-core" && tag !== "realms-of-terrinoth"), sourceType])],
    description: rulesSummary,
    rulesSummary,
    sourceReference: sourceReference(entry, sourceType),
    notes: "",
    metadata: {
      ...(entry?.metadata ?? {}),
      printedSource: sourceType === "realms-of-terrinoth" ? "Realms of Terrinoth" : "Genesys Core Rulebook",
      automationStatus: automated ? "implemented" : "manual",
      rulesSummaryStatus: "quick-reference",
      rulesSummaryAuthority: "Official source remains authoritative; summary is an original paraphrase for table use."
    }
  });
}

export const REALMS_OF_TERRINOTH_TALENT_DETAIL_PACK = Object.freeze({
  ...REALMS_OF_TERRINOTH_TALENT_PACK,
  version: "1.1",
  talents: Object.freeze(REALMS_OF_TERRINOTH_TALENT_PACK.talents.map(detailTalent)),
  metadata: Object.freeze({
    ...(REALMS_OF_TERRINOTH_TALENT_PACK.metadata ?? {}),
    rulesSummaryCount: REALMS_OF_TERRINOTH_TALENT_PACK.talents.length,
    rulesSummaryFormat: "original-paraphrase",
    bundledRulesText: false
  })
});

Hooks.once("ready", () => {
  try {
    game?.genesysContent?.registerPack?.(REALMS_OF_TERRINOTH_TALENT_DETAIL_PACK, { replace: true });
    console.log(`${SYSTEM_ID} | Registered ${REALMS_OF_TERRINOTH_TALENT_DETAIL_PACK.talents.length} Talent quick-reference summaries`);
  }
  catch (error) {
    console.error(`${SYSTEM_ID} | Failed to register Talent quick-reference summaries`, error);
  }
});
