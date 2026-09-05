import { CORE_QUALITY_DEFINITIONS, formatQualityText, parseQualityText } from "../../domain/items/index.js";
import { getActiveSkillDefinitions } from "../skills-service.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

const LEGACY_TALENT_PLACEHOLDER = "Catalog metadata only. Full rules text is not bundled with the public system.";

function talentReference(system = {}) {
    try {
        const sourceId = String(system.sourceId ?? "");
        if (!sourceId)
            return null;
        return game?.genesysContent?.getContent?.("talents")?.find?.((entry) => String(entry?.sourceId ?? entry?.id ?? "") === sourceId) ?? null;
    }
    catch {
        return null;
    }
}

function talentSourceLabel(reference, system = {}) {
    const sourceType = String(reference?.sourceType ?? system.sourceType ?? "custom");
    if (sourceType === "realms-of-terrinoth")
        return "Realms of Terrinoth";
    if (sourceType === "genesys-core")
        return "Genesys Core Rulebook";
    return sourceType === "custom" ? "Custom Talent" : sourceType;
}

function talentAutomationLabel(reference, system = {}) {
    const ruleCount = Array.isArray(system.rules) ? system.rules.length : 0;
    const status = String(reference?.metadata?.automationStatus ?? (ruleCount > 0 ? "implemented" : "manual"));
    if (status === "implemented")
        return ruleCount > 0 ? `Automated · ${ruleCount} Rule Element${ruleCount === 1 ? "" : "s"}` : "Automation implemented";
    return "Manual resolution / rules reference";
}

export class GenesysItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["genesys-vtt", "genesys-item-sheet"],
        position: { width: 620, height: 640 },
        form: { closeOnSubmit: false, submitOnChange: true },
        actions: { applyQualities: this.#applyQualities },
        window: { resizable: true }
    };
    static PARTS = { main: { template: "systems/genesys-vtt/templates/item/item-sheet.hbs" } };
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const system = this.item.system ?? {};
        const isTalent = this.item.type === "talent";
        const reference = isTalent ? talentReference(system) : null;
        const legacyNotes = String(system.notes ?? "");
        const rulesSummary = String(reference?.rulesSummary ?? reference?.description ?? "").trim();
        return {
            ...context,
            item: this.item,
            system,
            editable: this.isEditable,
            isWeapon: this.item.type === "weapon",
            isArmor: this.item.type === "armor",
            isGear: this.item.type === "gear",
            isAttachment: this.item.type === "attachment",
            isImplement: this.item.type === "implement",
            isTalent,
            talentRuleCount: Array.isArray(system.rules) ? system.rules.length : 0,
            talentRulesSummary: rulesSummary || "No quick-reference summary is registered for this Talent yet.",
            talentSourceLabel: isTalent ? talentSourceLabel(reference, system) : "",
            talentSourceReference: String(reference?.sourceReference ?? reference?.metadata?.printedSource ?? ""),
            talentAutomationLabel: isTalent ? talentAutomationLabel(reference, system) : "",
            talentNotes: isTalent && legacyNotes === LEGACY_TALENT_PLACEHOLDER ? "" : legacyNotes,
            supportsQualities: this.item.type === "weapon" || this.item.type === "armor",
            skills: getActiveSkillDefinitions().map((skill) => ({ id: skill.id, label: skill.label, selected: skill.id === system.skillId })),
            qualitiesText: formatQualityText(system.qualities ?? []),
            qualityCatalog: CORE_QUALITY_DEFINITIONS,
            rangeOptions: { engaged: "Engaged", short: "Short", medium: "Medium", long: "Long", extreme: "Extreme" },
            attackModeOptions: { auto: "Auto from skill/range", melee: "Melee", ranged: "Ranged" },
            engagedProfileOptions: { auto: "Auto", none: "No modifier", "one-handed": "One-handed (+1 difficulty)", "two-handed": "Two-handed (+2 difficulty)", heavy: "Heavy (cannot attack engaged)" },
            damageCharacteristicOptions: { auto: "Auto", none: "None / fixed damage", brawn: "Brawn", agility: "Agility", intellect: "Intellect", cunning: "Cunning", willpower: "Willpower", presence: "Presence" },
            systemVersion: String(game?.system?.version ?? "0.0.1743")
        };
    }
    static async #applyQualities(_event, target) {
        const root = target.closest(".genesys-quality-editor");
        const input = root?.querySelector("[data-quality-text]");
        if (!input) return;
        const parsed = parseQualityText(input.value);
        if (parsed.unknown.length) ui?.notifications?.warn?.(`Unknown qualities ignored: ${parsed.unknown.join(", ")}`);
        await this.item.update({ "system.qualities": parsed.qualities });
    }
}
//# sourceMappingURL=item-sheet.js.map
