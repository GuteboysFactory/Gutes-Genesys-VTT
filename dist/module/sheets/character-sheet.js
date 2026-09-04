import { parsePoolFromElement, rollPoolToChat } from "../dice-ui.js";
import { constructAndRollToChat, parseStandardPoolInput } from "../pool-ui.js";
import { buildSkillSheetRows } from "../skill-ui.js";
import { prepareActorSkillEngineCheck, rollPreparedActorCheckToChat } from "../check-ui.js";
import { buildInventoryRows, rollActorWeaponToChat } from "../items-service.js";
import { listCombatTargets, resolveCombatTargetReference, rollActorCombatAttackToChat, scheduleCriticalSecondaryPrompt } from "../combat-service.js";
import { getActiveProfileId, updateActorSkillState } from "../skills-service.js";
import { getDevReactionState, setDevReactionState } from "../reaction-service.js";
import { collectActorTalents, grantCoreParry, grantTerrinothFinesse } from "../talent-service-foundation.js";
import { buildCriticalSheetRows, criticalToChat, getActorCriticalModifier, healCriticalInjury, inflictCriticalInjury, promptCriticalSecondaryResolution } from "../critical-service.js";
import { addActorCondition, getActorConditionRules, getActorConditionSummary, removeActorCondition } from "../condition-service.js";
import { registerRenderedCharacterSheet, unregisterRenderedCharacterSheet } from "../live-sheet-state.js";
import { getInitiativeSheetContext, resetSceneInitiative, rollActorInitiative, startSceneInitiative } from "../initiative-service.js";
import { openEncounterTracker } from "../apps/encounter-tracker.js";
import { actorAdversaryContext, updateActorMinionGroupSkill } from "../adversary-service.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
function readSignedInteger(root, selector, fallback = 0) {
    const input = root?.querySelector(selector);
    const value = Number(input?.value ?? fallback);
    return Number.isFinite(value) ? Math.trunc(value) : fallback;
}
function readInteger(root, selector, fallback = 0) {
    const input = root?.querySelector(selector);
    const value = Number(input?.value ?? fallback);
    return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : fallback;
}
function talentRows(actor) {
    return collectActorTalents(actor).map((talent) => ({
        id: talent.documentId,
        name: talent.label,
        sourceId: talent.id,
        sourceType: talent.sourceType,
        tier: talent.tier,
        ranked: talent.ranked,
        rank: talent.rank,
        activation: talent.activation,
        enabled: talent.enabled,
        ruleCount: talent.rules.length,
        notes: talent.notes
    }));
}
export class GenesysCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["genesys-vtt", "genesys-character-sheet"],
        position: {
            width: 780,
            height: 700
        },
        form: {
            closeOnSubmit: false,
            submitOnChange: true
        },
        actions: {
            rollNarrativeDice: this.#rollNarrativeDice,
            constructAndRoll: this.#constructAndRoll,
            rollSkill: this.#rollSkill,
            createItem: this.#createItem,
            editItem: this.#editItem,
            deleteItem: this.#deleteItem,
            grantParry: this.#grantParry,
            grantFinesse: this.#grantFinesse,
            rollWeapon: this.#rollWeapon,
            rollCombatWeapon: this.#rollCombatWeapon,
            rollCritical: this.#rollCritical,
            healCritical: this.#healCritical,
            resolveCriticalSecondary: this.#resolveCriticalSecondary,
            addCondition: this.#addCondition,
            removeCondition: this.#removeCondition,
            rollInitiative: this.#rollInitiative,
            startInitiative: this.#startInitiative,
            resetInitiative: this.#resetInitiative,
            openEncounterTracker: this.#openEncounterTracker
        },
        window: {
            resizable: true
        }
    };
    static PARTS = {
        main: {
            template: "systems/genesys-vtt/templates/actor/character-sheet.hbs"
        }
    };
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const adversary = actorAdversaryContext(this.actor);
        return {
            ...context,
            actor: this.actor,
            system: this.actor.system,
            actorProfile: {
                ...adversary,
                nemesisExtraOn: adversary.roleNemesis && Number(this.actor.system?.extraActivations ?? 0) > 0,
                nemesisExtraOff: !(adversary.roleNemesis && Number(this.actor.system?.extraActivations ?? 0) > 0)
            },
            adversary,
            skills: buildSkillSheetRows(this.actor),
            inventory: buildInventoryRows(this.actor),
            talents: talentRows(this.actor),
            combatTargets: listCombatTargets(this.actor),
            activeProfileId: getActiveProfileId(),
            reactionDev: getDevReactionState(this.actor),
            criticals: buildCriticalSheetRows(this.actor),
            criticalModifier: getActorCriticalModifier(this.actor),
            conditionSummary: getActorConditionSummary(this.actor),
            conditionRules: getActorConditionRules(this.actor),
            initiative: getInitiativeSheetContext(this.actor),
            editable: this.isEditable,
            foundryVersion: String(game?.version ?? game?.release?.version ?? "unknown"),
            systemVersion: String(game?.system?.version ?? "0.0.14")
        };
    }
    async _onRender(context, options) {
        await super._onRender(context, options);
        const root = this.element;
        if (!root)
            return;
        registerRenderedCharacterSheet(this.actor, this);
        for (const input of Array.from(root.querySelectorAll("[data-skill-rank]"))) {
            input.addEventListener("change", async (event) => {
                event.stopPropagation();
                const row = input.closest("[data-skill-id]");
                const skillId = row?.dataset.skillId;
                if (!skillId)
                    return;
                const rank = Math.min(5, readInteger(row, "[data-skill-rank]", 0));
                await updateActorSkillState(this.actor, skillId, { rank });
            });
        }
        for (const input of Array.from(root.querySelectorAll("[data-skill-career]"))) {
            input.addEventListener("change", async (event) => {
                event.stopPropagation();
                const row = input.closest("[data-skill-id]");
                const skillId = row?.dataset.skillId;
                if (!skillId)
                    return;
                await updateActorSkillState(this.actor, skillId, { career: input.checked });
            });
        }
        for (const input of Array.from(root.querySelectorAll("[data-minion-group-skill]"))) {
            input.addEventListener("change", async (event) => {
                event.stopPropagation();
                const row = input.closest("[data-skill-id]");
                const skillId = row?.dataset.skillId;
                if (!skillId)
                    return;
                await updateActorMinionGroupSkill(this.actor, skillId, input.checked);
                await this.render({ force: true });
            });
        }
        const parryEnabled = root.querySelector("[data-dev-parry-enabled]");
        parryEnabled?.addEventListener("change", async (event) => {
            event.stopPropagation();
            await setDevReactionState(this.actor, { parryEnabled: parryEnabled.checked });
        });
        const parryRank = root.querySelector("[data-dev-parry-rank]");
        parryRank?.addEventListener("change", async (event) => {
            event.stopPropagation();
            await setDevReactionState(this.actor, { parryRank: readInteger(root, "[data-dev-parry-rank]", 1) });
        });
    }
    static async #rollNarrativeDice(_event, target) {
        const root = target.closest(".genesys-dice-lab");
        if (!root)
            return;
        const pool = parsePoolFromElement(root);
        await rollPoolToChat(pool, this.actor?.name ?? "Genesys Roll");
    }
    static async #constructAndRoll(_event, target) {
        const root = target.closest(".genesys-pool-builder");
        if (!root)
            return;
        const input = parseStandardPoolInput(root);
        await constructAndRollToChat(input, this.actor?.name ?? "Genesys Check");
    }
    static async #rollSkill(_event, target) {
        const row = target.closest("[data-skill-id]");
        const panel = target.closest(".genesys-skills-panel");
        const skillId = row?.dataset.skillId;
        if (!row || !skillId)
            return;
        const modeElement = panel?.querySelector("[data-check-mode]");
        const mode = (modeElement?.value ?? "standard");
        const rankOverride = this.actor?.system?.role === "minion" ? undefined : readInteger(row, "[data-skill-rank]", 0);
        const prepared = prepareActorSkillEngineCheck(this.actor, skillId, {
            mode,
            rankOverride,
            difficulty: readInteger(panel, "[data-skill-difficulty]", 2),
            opponentCharacteristic: readInteger(panel, "[data-opponent-characteristic]", 2),
            opponentSkillRank: readInteger(panel, "[data-opponent-skill-rank]", 2),
            assistantCharacteristic: readInteger(panel, "[data-assistant-characteristic]", 2),
            assistantSkillRank: readInteger(panel, "[data-assistant-skill-rank]", 2),
            extraHelpers: readInteger(panel, "[data-extra-helpers]", 0)
        });
        await rollPreparedActorCheckToChat(prepared, this.actor?.name ?? "Genesys Skill Check");
    }
    static async #createItem(_event, target) {
        const type = String(target.dataset.itemType ?? "gear");
        const allowed = new Set(["weapon", "armor", "gear", "attachment", "talent"]);
        if (!allowed.has(type))
            return;
        const defaults = {
            weapon: { name: "New Weapon", type: "weapon", system: { skillId: "melee", damage: 0, critical: 0, range: "engaged", equipped: true } },
            armor: { name: "New Armor", type: "armor", system: {} },
            gear: { name: "New Gear", type: "gear", system: { quantity: 1 } },
            attachment: { name: "New Attachment", type: "attachment", system: { hardPointCost: 1 } },
            talent: { name: "New Talent", type: "talent", system: { sourceId: `custom-talent:${Date.now()}`, sourceType: "custom", tier: 1, ranked: false, rank: 1, activation: "passive", enabled: true, tags: [], rules: [], notes: "" } }
        };
        const created = await this.actor.createEmbeddedDocuments("Item", [defaults[type]]);
        created?.[0]?.sheet?.render?.(true);
    }
    static async #editItem(_event, target) {
        const row = target.closest("[data-item-id]");
        const item = row?.dataset.itemId ? this.actor.items?.get?.(row.dataset.itemId) : null;
        item?.sheet?.render?.(true);
    }
    static async #deleteItem(_event, target) {
        const row = target.closest("[data-item-id]");
        const item = row?.dataset.itemId ? this.actor.items?.get?.(row.dataset.itemId) : null;
        if (item)
            await item.delete();
    }
    static async #grantParry() {
        const existing = collectActorTalents(this.actor).find((talent) => talent.id === "core-talent:parry");
        const nextRank = existing ? Math.min(5, existing.rank + 1) : 1;
        await grantCoreParry(this.actor, nextRank);
        await this.render({ force: true });
    }
    static async #grantFinesse() {
        await grantTerrinothFinesse(this.actor);
        await this.render({ force: true });
    }
    static async #rollWeapon(_event, target) {
        const row = target.closest("[data-item-id]");
        const panel = target.closest(".genesys-inventory-panel");
        const item = row?.dataset.itemId ? this.actor.items?.get?.(row.dataset.itemId) : null;
        if (!item)
            return;
        const difficulty = readInteger(panel, "[data-weapon-difficulty]", 2);
        await rollActorWeaponToChat(this.actor, item, difficulty);
    }
    static async #rollCombatWeapon(_event, target) {
        const row = target.closest("[data-item-id]");
        const panel = target.closest(".genesys-inventory-panel");
        const item = row?.dataset.itemId ? this.actor.items?.get?.(row.dataset.itemId) : null;
        const targetRef = panel?.querySelector("[data-combat-target]")?.value;
        const targetRange = (panel?.querySelector("[data-combat-range]")?.value ?? "engaged");
        const defender = targetRef ? resolveCombatTargetReference(targetRef) : null;
        if (!item)
            return;
        if (!defender) {
            ui?.notifications?.warn?.("Select a combat target Actor first.");
            return;
        }
        try {
            await rollActorCombatAttackToChat(this.actor, item, defender, targetRange);
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #rollCritical(_event, target) {
        const panel = target.closest(".genesys-critical-panel");
        const viciousRank = readInteger(panel, "[data-critical-vicious]", 0);
        const extraActivations = readInteger(panel, "[data-critical-extra-activations]", 0);
        const flatModifier = readSignedInteger(panel, "[data-critical-flat-modifier]", 0);
        const result = await inflictCriticalInjury(this.actor, { viciousRank, extraActivations, flatModifier }, "dev:critical-lab");
        await criticalToChat(this.actor, result);
        if (result.state.secondaryStatus === "pending")
            scheduleCriticalSecondaryPrompt(this.actor, result.state.id);
    }
    static async #resolveCriticalSecondary(_event, target) {
        const row = target.closest("[data-critical-id]");
        const criticalId = row?.dataset.criticalId;
        if (criticalId)
            await promptCriticalSecondaryResolution(this.actor, criticalId);
    }
    static async #healCritical(_event, target) {
        const row = target.closest("[data-critical-id]");
        const criticalId = row?.dataset.criticalId;
        if (criticalId)
            await healCriticalInjury(this.actor, criticalId);
    }
    static async #addCondition(_event, target) {
        const conditionId = String(target.dataset.conditionId ?? "");
        if (!["staggered", "immobilized", "disoriented"].includes(conditionId))
            return;
        await addActorCondition(this.actor, conditionId, { sourceId: "dev:condition-lab", durationType: "manual" });
    }
    static async #removeCondition(_event, target) {
        const conditionStateId = target.dataset.conditionStateId;
        if (conditionStateId)
            await removeActorCondition(this.actor, conditionStateId);
    }
    static async #rollInitiative(_event, target) {
        const panel = target.closest(".genesys-initiative-panel");
        const side = (panel?.querySelector("[data-initiative-side]")?.value ?? "pc");
        const skill = (panel?.querySelector("[data-initiative-skill]")?.value ?? "vigilance");
        try {
            await rollActorInitiative(this.actor, side, skill);
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #startInitiative() {
        try {
            await startSceneInitiative();
            openEncounterTracker();
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #resetInitiative() {
        await resetSceneInitiative();
    }
    static async #openEncounterTracker() {
        openEncounterTracker();
    }
    _onClose(options) {
        unregisterRenderedCharacterSheet(this.actor, this);
        return super._onClose(options);
    }
}
//# sourceMappingURL=character-sheet.js.map