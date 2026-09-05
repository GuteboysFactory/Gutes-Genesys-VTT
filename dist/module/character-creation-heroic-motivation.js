import { createHeroicAbilityState, normalizeHeroicAbilityRules, normalizeHeroicAbilityState, purchaseHeroicAbilityUpgrade } from "../domain/heroic/index.js";
import { motivationIsComplete, normalizeMotivation, summarizeMotivation } from "../domain/motivations/index.js";

function clone(value) {
    if (value === undefined)
        return undefined;
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function text(value) {
    return String(value ?? "").trim();
}

function rulesForDraft(draft) {
    return normalizeHeroicAbilityRules(game?.genesysContent?.getHeroicRules?.(text(draft?.settingId)) ?? {});
}

function rawRulesForDraft(draft) {
    return game?.genesysContent?.getHeroicRules?.(text(draft?.settingId)) ?? {};
}

function refreshHeroicMotivationState(draftInput) {
    const draft = clone(draftInput);
    draft.motivation = { ...normalizeMotivation(draft.motivation ?? {}) };
    if (draft.heroicAbility) {
        const rules = rulesForDraft(draft);
        draft.heroicAbility = normalizeHeroicAbilityState(draft.heroicAbility, rules);
    }
    return draft;
}

Hooks.once("ready", () => {
    const base = game?.genesysCreation;
    if (!base)
        return;

    const createDraft = (options = {}) => refreshHeroicMotivationState(base.createDraft(options));
    const selectArchetype = (draft, archetype) => refreshHeroicMotivationState(base.selectArchetype(draft, archetype));
    const selectCareer = (draft, career) => refreshHeroicMotivationState(base.selectCareer(draft, career));
    const chooseFreeCareerSkills = (draft, career, skillIds) => refreshHeroicMotivationState(base.chooseFreeCareerSkills(draft, career, skillIds));
    const purchaseCharacteristic = (draft, characteristicId, targetRating) => refreshHeroicMotivationState(base.purchaseCharacteristic(draft, characteristicId, targetRating));
    const purchaseSkill = (draft, skillId, targetRank) => refreshHeroicMotivationState(base.purchaseSkill(draft, skillId, targetRank));
    const purchaseTalent = (draft, talent) => refreshHeroicMotivationState(base.purchaseTalent(draft, talent));

    const setMotivation = (draftInput, patch = {}) => {
        const draft = refreshHeroicMotivationState(draftInput);
        draft.motivation = { ...normalizeMotivation({ ...draft.motivation, ...patch }) };
        draft.updatedAt = Date.now();
        return draft;
    };

    const selectHeroicAbility = (draftInput, definition = {}, options = {}) => {
        const draft = refreshHeroicMotivationState(draftInput);
        const rules = rulesForDraft(draft);
        draft.heroicAbility = createHeroicAbilityState(definition, options, rules);
        draft.updatedAt = Date.now();
        return draft;
    };

    const purchaseHeroicUpgrade = (draftInput, upgrade = {}) => {
        const draft = refreshHeroicMotivationState(draftInput);
        if (!draft.heroicAbility)
            throw new Error("Choose a Heroic Ability before purchasing upgrades.");
        const rules = rulesForDraft(draft);
        const earnedXp = Number(draft?.xpEarned ?? 0) || 0;
        draft.heroicAbility = purchaseHeroicAbilityUpgrade(draft.heroicAbility, upgrade, earnedXp, rules);
        draft.updatedAt = Date.now();
        return draft;
    };

    const validate = (draftInput, options = {}) => {
        const draft = refreshHeroicMotivationState(draftInput);
        const core = base.validate(draft, options);
        const rules = rawRulesForDraft(draft);
        const errors = [...core.errors];
        const warnings = [...core.warnings];
        if (rules.requiredAtCreation && !draft.heroicAbility?.selected)
            errors.push("Choose a Heroic Ability for this setting.");
        if (!motivationIsComplete(draft.motivation)) {
            const message = "Motivation is incomplete. Strength, Flaw, Desire, and Fear are all available as structured facets.";
            if (rules.motivationCompleteness === "error")
                errors.push(message);
            else
                warnings.push(message);
        }
        return { ...core, valid: errors.length === 0, errors, warnings, heroicAbility: clone(draft.heroicAbility), motivation: clone(draft.motivation) };
    };

    const actorUpdate = (draftInput) => {
        const draft = refreshHeroicMotivationState(draftInput);
        const update = base.actorUpdate(draft);
        update["system.motivations"] = { ...normalizeMotivation(draft.motivation) };
        update["system.profile.motivation"] = summarizeMotivation(draft.motivation);
        if (draft.heroicAbility)
            update["system.heroicAbility"] = normalizeHeroicAbilityState(draft.heroicAbility, rulesForDraft(draft));
        return update;
    };

    const finalize = async (actor, draftInput, options = {}) => {
        const draft = refreshHeroicMotivationState(draftInput);
        const validation = validate(draft, options);
        if (!validation.valid)
            throw new Error(validation.errors.join(" "));
        await actor.update(actorUpdate(draft));
        await base.saveDraft(actor, { ...clone(draft), status: "complete", completedAt: Date.now() });
        Hooks.callAll("genesysCharacterCreationFinalized", actor, clone(draft));
        return { actor, draft: clone(draft), validation };
    };

    Object.defineProperty(game, "genesysCreation", {
        configurable: true,
        value: Object.freeze({
            ...base,
            createDraft,
            selectArchetype,
            selectCareer,
            chooseFreeCareerSkills,
            purchaseCharacteristic,
            purchaseSkill,
            purchaseTalent,
            setMotivation,
            selectHeroicAbility,
            purchaseHeroicUpgrade,
            refreshHeroicMotivation: refreshHeroicMotivationState,
            heroicRules: rulesForDraft,
            validate,
            actorUpdate,
            finalize
        })
    });
});
