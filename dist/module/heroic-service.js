import {
    advanceHeroicAbilityOwnerTurn,
    createHeroicAbilityState,
    heroicAbilityAvailablePoints,
    heroicAbilityDurationTurns,
    heroicAbilityPointsFromEarnedXp,
    heroicAbilityUsesPerSession,
    normalizeHeroicAbilityRules,
    normalizeHeroicAbilityState,
    prepareHeroicAbilityActivation,
    purchaseHeroicAbilityUpgrade,
    resetHeroicAbilitySession
} from "../domain/heroic/index.js";
import { MOTIVATION_FACETS, motivationIsComplete, normalizeMotivation, summarizeMotivation } from "../domain/motivations/index.js";

function rulesForSetting(settingId) {
    return normalizeHeroicAbilityRules(game?.genesysContent?.getHeroicRules?.(String(settingId ?? "")) ?? {});
}

function actorSettingId(actor) {
    const fromDraft = actor?.getFlag?.("genesys-vtt", "characterCreationDraft")?.settingId;
    if (fromDraft)
        return String(fromDraft);
    try {
        return String(game?.settings?.get?.("genesys-vtt", "rulesProfile") ?? "");
    }
    catch {
        return "";
    }
}

function actorHeroicSnapshot(actor, settingId = actorSettingId(actor)) {
    const rules = rulesForSetting(settingId);
    return normalizeHeroicAbilityState(actor?.system?.heroicAbility ?? {}, rules);
}

function actorMotivationSnapshot(actor) {
    return normalizeMotivation(actor?.system?.motivations ?? {});
}

async function commitActorHeroicState(actor, state, settingId = actorSettingId(actor)) {
    if (!actor?.update)
        throw new Error("Actor is required.");
    const rules = rulesForSetting(settingId);
    const next = normalizeHeroicAbilityState(state, rules);
    await actor.update({ "system.heroicAbility": next });
    return next;
}

Hooks.once("ready", () => {
    const api = Object.freeze({
        rulesForSetting,
        normalizeRules: normalizeHeroicAbilityRules,
        normalizeState: normalizeHeroicAbilityState,
        createState: createHeroicAbilityState,
        pointsFromEarnedXp: heroicAbilityPointsFromEarnedXp,
        availablePoints: heroicAbilityAvailablePoints,
        purchaseUpgrade: purchaseHeroicAbilityUpgrade,
        durationTurns: heroicAbilityDurationTurns,
        usesPerSession: heroicAbilityUsesPerSession,
        prepareActivation: prepareHeroicAbilityActivation,
        advanceOwnerTurn: advanceHeroicAbilityOwnerTurn,
        resetSession: resetHeroicAbilitySession,
        actorSnapshot: actorHeroicSnapshot,
        commitActorState: commitActorHeroicState,
        motivations: Object.freeze({
            facets: MOTIVATION_FACETS,
            normalize: normalizeMotivation,
            complete: motivationIsComplete,
            summarize: summarizeMotivation,
            actorSnapshot: actorMotivationSnapshot
        })
    });
    Object.defineProperty(game, "genesysHeroic", { configurable: true, value: api });
    console.log("genesys-vtt | Heroic Ability & Motivation service ready");
});
