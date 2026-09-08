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

export function heroicSecondaryOptions(actor) {
    const custom = actor.getFlag?.("genesys-vtt", "heroicCustomEffects");
    return [...(game.genesysContent?.getContent?.("heroicAbilities", { settingId: actorSettingId(actor) }) ?? [])
        .filter(row => row.kind === "secondary-effect"), ...(Array.isArray(custom) ? custom : [])];
}
export function heroicLiveSummary(actor) {
    const rules = rulesForSetting(actorSettingId(actor));
    const state = actorHeroicSnapshot(actor);
    const definitions = game.genesysContent?.getContent?.("heroicAbilities", { settingId: actorSettingId(actor) }) ?? [];
    const allDefinitions = [...definitions, ...heroicSecondaryOptions(actor)];
    const label = id => allDefinitions.find(row => row.id === id)?.label ?? id;
    return { customEffects: heroicSecondaryOptions(actor).filter(row => row.description && state.secondaryEffectIds.includes(row.id)), secondaryOptions: heroicSecondaryOptions(actor).map(row => ({ id:row.id, label:row.label,
        source:row.metadata?.printedSource ?? '', owned:state.secondaryEffectIds.includes(row.id) })),
        secondaryLimit:rules.maxSecondaryEffects, secondaryCost:rules.upgradeCosts.secondaryEffect,
        originsLabel: state.origins.map(label).join(" / "), secondaryLabel: state.secondaryEffectIds.map(label).join(" / "), id: actor.id, actorName: actor.name, selected: state.selected && Boolean(state.primaryEffectId),
        name: state.name || state.primaryEffectLabel, cost: state.storyPointCost,
        used: state.usesThisSession, total: heroicAbilityUsesPerSession(state, rules),
        active: state.active, remainingTurns: state.activeTurnBudget,
        availablePoints: heroicAbilityAvailablePoints(state, actor.system?.xp?.earned ?? 0, rules) };
}
const resettingActors = new Set();
export async function resetActorHeroicSession(actor, confirmed = false) {
    if (!game.user?.isGM || game.users?.activeGM?.id !== game.user.id) throw new Error("The active GM must reset Heroic usage.");
    if (game.genesysStoryPoints?.snapshot()?.heroicPending) throw new Error("Recover interrupted Heroic activation before resetting usage.");
    if (!confirmed) throw new Error("Confirm resetting uses and ending the active Heroic effect.");
    if (!actor?.id || !heroicLiveSummary(actor).selected) throw new Error("No Heroic Ability selected.");
    if (resettingActors.has(actor.uuid ?? actor.id)) throw new Error("Heroic reset is already in progress.");
    const key = actor.uuid ?? actor.id;
    resettingActors.add(key);
    try {
        const rules = rulesForSetting(actorSettingId(actor));
        const next = resetHeroicAbilitySession(actorHeroicSnapshot(actor), rules);
        await commitActorHeroicState(actor, next);
        return next;
    } finally { resettingActors.delete(key); }
}

Hooks.once("ready", () => {
    const api = Object.freeze({
        actorRules: actor => rulesForSetting(actorSettingId(actor)),
        liveSummary: heroicLiveSummary,
        secondaryOptions: heroicSecondaryOptions,
        resetActorSession: resetActorHeroicSession,
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
