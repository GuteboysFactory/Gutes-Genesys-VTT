import { CORE_QUALITY_DEFINITIONS, formatQualityText, parseQualityText } from "../../domain/items/index.js";
import { getActiveSkillDefinitions } from "../skills-service.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
export class GenesysItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["genesys-vtt", "genesys-item-sheet"],
        position: { width: 620, height: 640 },
        form: { closeOnSubmit: false, submitOnChange: true },
        actions: {
            applyQualities: this.#applyQualities
        },
        window: { resizable: true }
    };
    static PARTS = {
        main: { template: "systems/genesys-vtt/templates/item/item-sheet.hbs" }
    };
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const system = this.item.system ?? {};
        return {
            ...context,
            item: this.item,
            system,
            editable: this.isEditable,
            isWeapon: this.item.type === "weapon",
            isArmor: this.item.type === "armor",
            isGear: this.item.type === "gear",
            isAttachment: this.item.type === "attachment",
            isTalent: this.item.type === "talent",
            talentRuleCount: Array.isArray(system.rules) ? system.rules.length : 0,
            supportsQualities: this.item.type === "weapon" || this.item.type === "armor",
            skills: getActiveSkillDefinitions().map((skill) => ({ id: skill.id, label: skill.label, selected: skill.id === system.skillId })),
            qualitiesText: formatQualityText(system.qualities ?? []),
            qualityCatalog: CORE_QUALITY_DEFINITIONS,
            rangeOptions: { engaged: "Engaged", short: "Short", medium: "Medium", long: "Long", extreme: "Extreme" },
            attackModeOptions: { auto: "Auto from skill/range", melee: "Melee", ranged: "Ranged" },
            engagedProfileOptions: { auto: "Auto", none: "No modifier", "one-handed": "One-handed (+1 difficulty)", "two-handed": "Two-handed (+2 difficulty)", heavy: "Heavy (cannot attack engaged)" },
            damageCharacteristicOptions: { auto: "Auto", none: "None / fixed damage", brawn: "Brawn", agility: "Agility", intellect: "Intellect", cunning: "Cunning", willpower: "Willpower", presence: "Presence" },
            systemVersion: String(game?.system?.version ?? "0.0.141")
        };
    }
    static async #applyQualities(_event, target) {
        const root = target.closest(".genesys-quality-editor");
        const input = root?.querySelector("[data-quality-text]");
        if (!input)
            return;
        const parsed = parseQualityText(input.value);
        if (parsed.unknown.length) {
            ui?.notifications?.warn?.(`Unknown qualities ignored: ${parsed.unknown.join(", ")}`);
        }
        await this.item.update({ "system.qualities": parsed.qualities });
    }
}
//# sourceMappingURL=item-sheet.js.map