import { prepareStoryPointTransaction } from "../story-points/index.js";

function integer(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const number = Number(value ?? fallback);
    if (!Number.isFinite(number))
        return fallback;
    return Math.min(max, Math.max(min, Math.trunc(number)));
}

function text(value, fallback = "") {
    const out = String(value ?? fallback).trim();
    return out || fallback;
}

function list(value) {
    return Array.isArray(value) ? value.map((entry) => String(entry ?? "").trim()).filter(Boolean) : [];
}

export function normalizeHeroicAbilityRules(input = {}) {
    return Object.freeze({
        activation: text(input.activation, "incidental"),
        storyPointCost: integer(input.storyPointCost, 0),
        baseDurationTurns: integer(input.baseDurationTurns, 1, 1),
        baseUsesPerSession: integer(input.baseUsesPerSession, 1, 1),
        xpPerAbilityPoint: integer(input.xpPerAbilityPoint, 50, 1),
        maxSecondaryEffects: integer(input.maxSecondaryEffects, 2, 0),
        upgradeCosts: Object.freeze({
            duration: integer(input.upgradeCosts?.duration, 1),
            frequency: integer(input.upgradeCosts?.frequency, 2),
            powerImproved: integer(input.upgradeCosts?.powerImproved, 1),
            powerSupreme: integer(input.upgradeCosts?.powerSupreme, 2),
            secondaryEffect: integer(input.upgradeCosts?.secondaryEffect, 1),
            story: integer(input.upgradeCosts?.story, 1)
        }),
        storyUpgradeMinimumCost: integer(input.storyUpgradeMinimumCost, 1, 0)
    });
}

export function normalizeHeroicAbilityState(input = {}, rulesInput = {}) {
    const rules = normalizeHeroicAbilityRules(rulesInput);
    const powerLevel = ["base", "improved", "supreme"].includes(input.powerLevel) ? input.powerLevel : "base";
    const secondaryEffectIds = [...new Set(list(input.secondaryEffectIds))].slice(0, rules.maxSecondaryEffects || undefined);
    const storyUpgradePurchased = Boolean(input.storyUpgradePurchased);
    const storyPointCost = storyUpgradePurchased
        ? Math.max(rules.storyUpgradeMinimumCost, integer(input.storyPointCost, Math.max(rules.storyUpgradeMinimumCost, rules.storyPointCost - 1)))
        : integer(input.storyPointCost, rules.storyPointCost);
    return {
        selected: Boolean(input.selected ?? input.id ?? input.primaryEffectId),
        id: text(input.id),
        name: text(input.name),
        origins: list(input.origins),
        primaryEffectId: text(input.primaryEffectId ?? input.id),
        primaryEffectLabel: text(input.primaryEffectLabel ?? input.label),
        powerLevel,
        secondaryEffectIds,
        durationUpgrades: integer(input.durationUpgrades, 0),
        frequencyUpgrades: integer(input.frequencyUpgrades, 0),
        storyUpgradePurchased,
        abilityPointsSpent: integer(input.abilityPointsSpent, 0),
        activation: text(input.activation, rules.activation),
        storyPointCost,
        usesThisSession: integer(input.usesThisSession, 0),
        active: Boolean(input.active),
        activeTurnBudget: integer(input.activeTurnBudget, 0)
    };
}

export function createHeroicAbilityState(definition = {}, options = {}, rulesInput = {}) {
    const rules = normalizeHeroicAbilityRules(rulesInput);
    return normalizeHeroicAbilityState({
        selected: true,
        id: text(definition.id),
        name: text(options.name, text(definition.label ?? definition.name, "Heroic Ability")),
        origins: list(options.origins ?? (options.origin ? [options.origin] : [])),
        primaryEffectId: text(definition.id),
        primaryEffectLabel: text(definition.label ?? definition.name, definition.id),
        powerLevel: "base",
        secondaryEffectIds: [],
        durationUpgrades: 0,
        frequencyUpgrades: 0,
        storyUpgradePurchased: false,
        abilityPointsSpent: 0,
        activation: rules.activation,
        storyPointCost: rules.storyPointCost,
        usesThisSession: 0,
        active: false,
        activeTurnBudget: 0
    }, rules);
}

export function heroicAbilityPointsFromEarnedXp(earnedXp, rulesInput = {}) {
    const rules = normalizeHeroicAbilityRules(rulesInput);
    return Math.floor(integer(earnedXp, 0) / rules.xpPerAbilityPoint);
}

export function heroicAbilityAvailablePoints(stateInput = {}, earnedXp = 0, rulesInput = {}) {
    const state = normalizeHeroicAbilityState(stateInput, rulesInput);
    return Math.max(0, heroicAbilityPointsFromEarnedXp(earnedXp, rulesInput) - state.abilityPointsSpent);
}

function spendAbilityPoints(stateInput, earnedXp, cost, rulesInput) {
    const state = normalizeHeroicAbilityState(stateInput, rulesInput);
    const available = heroicAbilityAvailablePoints(state, earnedXp, rulesInput);
    if (cost > available)
        throw new Error(`Not enough Ability Points. Need ${cost}, have ${available}.`);
    return { state, cost };
}

export function purchaseHeroicAbilityUpgrade(stateInput, upgrade = {}, earnedXp = 0, rulesInput = {}) {
    const rules = normalizeHeroicAbilityRules(rulesInput);
    const type = text(upgrade.type);
    let cost = 0;
    let next = normalizeHeroicAbilityState(stateInput, rules);

    switch (type) {
        case "duration":
            cost = rules.upgradeCosts.duration;
            ({ state: next } = spendAbilityPoints(next, earnedXp, cost, rules));
            next.durationUpgrades += 1;
            break;
        case "frequency":
            cost = rules.upgradeCosts.frequency;
            ({ state: next } = spendAbilityPoints(next, earnedXp, cost, rules));
            next.frequencyUpgrades += 1;
            break;
        case "power":
            if (next.powerLevel === "base") {
                cost = rules.upgradeCosts.powerImproved;
                ({ state: next } = spendAbilityPoints(next, earnedXp, cost, rules));
                next.powerLevel = "improved";
            }
            else if (next.powerLevel === "improved") {
                cost = rules.upgradeCosts.powerSupreme;
                ({ state: next } = spendAbilityPoints(next, earnedXp, cost, rules));
                next.powerLevel = "supreme";
            }
            else {
                throw new Error("Heroic Ability power is already Supreme.");
            }
            break;
        case "secondary-effect": {
            const effectId = text(upgrade.effectId);
            if (!effectId)
                throw new Error("Secondary effect id is required.");
            if (next.secondaryEffectIds.includes(effectId))
                throw new Error("A Heroic Ability cannot purchase the same secondary effect twice.");
            if (next.secondaryEffectIds.length >= rules.maxSecondaryEffects)
                throw new Error(`A Heroic Ability can have at most ${rules.maxSecondaryEffects} secondary effects.`);
            cost = rules.upgradeCosts.secondaryEffect;
            ({ state: next } = spendAbilityPoints(next, earnedXp, cost, rules));
            next.secondaryEffectIds.push(effectId);
            break;
        }
        case "story":
            if (next.storyUpgradePurchased)
                throw new Error("The Story upgrade can only be purchased once.");
            cost = rules.upgradeCosts.story;
            ({ state: next } = spendAbilityPoints(next, earnedXp, cost, rules));
            next.storyUpgradePurchased = true;
            next.storyPointCost = Math.max(rules.storyUpgradeMinimumCost, rules.storyPointCost - 1);
            break;
        default:
            throw new Error(`Unknown Heroic Ability upgrade '${type}'.`);
    }

    next.abilityPointsSpent += cost;
    return normalizeHeroicAbilityState(next, rules);
}

export function heroicAbilityDurationTurns(stateInput = {}, rulesInput = {}) {
    const rules = normalizeHeroicAbilityRules(rulesInput);
    const state = normalizeHeroicAbilityState(stateInput, rules);
    return rules.baseDurationTurns + state.durationUpgrades;
}

export function heroicAbilityUsesPerSession(stateInput = {}, rulesInput = {}) {
    const rules = normalizeHeroicAbilityRules(rulesInput);
    const state = normalizeHeroicAbilityState(stateInput, rules);
    return rules.baseUsesPerSession + state.frequencyUpgrades;
}

export function prepareHeroicAbilityActivation(stateInput, storyPointState, rulesInput = {}) {
    const rules = normalizeHeroicAbilityRules(rulesInput);
    const state = normalizeHeroicAbilityState(stateInput, rules);
    if (!state.selected || !state.primaryEffectId)
        throw new Error("No Heroic Ability is selected.");
    const usesPerSession = heroicAbilityUsesPerSession(state, rules);
    if (state.usesThisSession >= usesPerSession)
        throw new Error(`Heroic Ability has no uses remaining this session (${state.usesThisSession}/${usesPerSession}).`);

    const storyPointTransaction = prepareStoryPointTransaction(storyPointState, {
        player: state.storyPointCost,
        gm: 0
    });
    const nextAbility = normalizeHeroicAbilityState({
        ...state,
        usesThisSession: state.usesThisSession + 1,
        active: true,
        activeTurnBudget: heroicAbilityDurationTurns(state, rules)
    }, rules);

    return Object.freeze({
        beforeAbility: Object.freeze({ ...state }),
        nextAbility: Object.freeze({ ...nextAbility }),
        storyPointTransaction,
        usesPerSession,
        durationTurns: nextAbility.activeTurnBudget
    });
}

export function advanceHeroicAbilityOwnerTurn(stateInput, rulesInput = {}) {
    const rules = normalizeHeroicAbilityRules(rulesInput);
    const state = normalizeHeroicAbilityState(stateInput, rules);
    if (!state.active)
        return state;
    const remaining = Math.max(0, state.activeTurnBudget - 1);
    return normalizeHeroicAbilityState({
        ...state,
        active: remaining > 0,
        activeTurnBudget: remaining
    }, rules);
}

export function resetHeroicAbilitySession(stateInput, rulesInput = {}) {
    const rules = normalizeHeroicAbilityRules(rulesInput);
    return normalizeHeroicAbilityState({
        ...normalizeHeroicAbilityState(stateInput, rules),
        usesThisSession: 0,
        active: false,
        activeTurnBudget: 0
    }, rules);
}
