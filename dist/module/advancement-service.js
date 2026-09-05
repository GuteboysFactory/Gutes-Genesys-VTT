import {
    DEFAULT_ADVANCEMENT_RULES,
    evaluateCharacteristicAdvancement,
    evaluateSkillAdvancement,
    ledgerBucketTotal,
    normalizeAdvancementRules,
    normalizeXpLedgerEntry,
    normalizeXpProgression,
    prepareEarnedXpAdjustment,
    prepareEarnedXpAward,
    prepareXpRefund,
    prepareXpSpend,
    skillXpCost,
    talentXpCost,
    validateXpProgression,
    xpAvailable
} from "../domain/advancement/index.js";
import { rerenderRenderedCharacterSheet } from "./live-sheet-state.js";

const SYSTEM_ID = "genesys-vtt";

function clone(value) {
    if (value === undefined)
        return undefined;
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function text(value, fallback = "") {
    const out = String(value ?? fallback).trim();
    return out || fallback;
}

function integer(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const number = Number(value ?? fallback);
    if (!Number.isFinite(number))
        return fallback;
    return Math.min(max, Math.max(min, Math.trunc(number)));
}

function plainRow(row) {
    if (row?.toObject)
        return row.toObject();
    return clone(row ?? {});
}

function actorXpState(actor) {
    const xp = actor?.system?.xp ?? {};
    return normalizeXpProgression({
        starting: xp.starting,
        earned: xp.earned,
        spent: xp.spent,
        ledger: Array.from(xp.ledger ?? []).map(plainRow)
    });
}

function actorSkillRows(actor) {
    return Array.from(actor?.system?.skills ?? []).map(plainRow);
}

function actorSettingId(actor) {
    const fromDraft = actor?.getFlag?.(SYSTEM_ID, "characterCreationDraft")?.settingId;
    if (fromDraft)
        return String(fromDraft);
    try {
        return String(game?.settings?.get?.(SYSTEM_ID, "rulesProfile") ?? "");
    }
    catch {
        return "";
    }
}

function advancementRulesForActor(actor) {
    const settingId = actorSettingId(actor);
    const creationRules = game?.genesysContent?.getCreationRules?.(settingId) ?? {};
    return normalizeAdvancementRules({
        ...DEFAULT_ADVANCEMENT_RULES,
        characteristicCostMultiplier: creationRules.characteristicCostMultiplier,
        careerSkillCostMultiplier: creationRules.careerSkillCostMultiplier,
        nonCareerSkillSurcharge: creationRules.nonCareerSkillSurcharge,
        talentCostMultiplier: creationRules.talentCostMultiplier,
        allowCharacteristicPurchasesAfterCreation: false
    });
}

function magicPurchasePolicy(actor, skillId, career) {
    const settingId = actorSettingId(actor);
    const rules = game?.genesysContent?.getMagicRules?.(settingId) ?? {};
    const magicSkillIds = Array.isArray(rules.magicSkillIds) ? rules.magicSkillIds.map(String) : [];
    if (!magicSkillIds.includes(String(skillId ?? "")))
        return { allowed: true, reason: "" };
    if (rules.purchasePolicy === "career-only" && !career) {
        return {
            allowed: false,
            reason: `${skillId} is a magic skill and may only be purchased as a career skill under the active setting rules.`
        };
    }
    return { allowed: true, reason: "" };
}

function heroicProgression(actor, earnedOverride = null) {
    const earned = earnedOverride === null ? actorXpState(actor).earned : integer(earnedOverride, 0);
    const settingId = actorSettingId(actor);
    const heroic = game?.genesysHeroic;
    if (!heroic) {
        return Object.freeze({ earnedXp: earned, pointsEarned: 0, pointsSpent: 0, pointsAvailable: 0 });
    }
    const rules = heroic.rulesForSetting?.(settingId) ?? {};
    const state = heroic.actorSnapshot?.(actor, settingId) ?? actor?.system?.heroicAbility ?? {};
    const pointsEarned = heroic.pointsFromEarnedXp?.(earned, rules) ?? 0;
    const pointsAvailable = heroic.availablePoints?.(state, earned, rules) ?? 0;
    return Object.freeze({
        earnedXp: earned,
        pointsEarned,
        pointsSpent: integer(state?.abilityPointsSpent, 0),
        pointsAvailable
    });
}

function requireActor(actor) {
    if (!actor?.update)
        throw new Error("Actor is required.");
}

function requireOwner(actor) {
    requireActor(actor);
    if (!(actor.isOwner !== false || game?.user?.isGM))
        throw new Error("You do not have permission to advance this character.");
}

function requireGm() {
    if (!game?.user?.isGM)
        throw new Error("Only the GM may award or administratively adjust XP.");
}

function xpUpdateData(state) {
    const normalized = normalizeXpProgression(state);
    return {
        "system.xp.starting": normalized.starting,
        "system.xp.earned": normalized.earned,
        "system.xp.spent": normalized.spent,
        "system.xp.ledger": normalized.ledger.map((entry) => ({ ...entry }))
    };
}

async function commitXpState(actor, state) {
    requireActor(actor);
    const normalized = normalizeXpProgression(state);
    await actor.update(xpUpdateData(normalized));
    await rerenderRenderedCharacterSheet(actor);
    return normalized;
}

function appendLedgerWithoutChangingTotals(stateInput, entryInput) {
    const state = normalizeXpProgression(stateInput);
    const entry = normalizeXpLedgerEntry(entryInput, state.ledger.length);
    return normalizeXpProgression({
        starting: state.starting,
        earned: state.earned,
        spent: state.spent,
        ledger: [...state.ledger.map((row) => clone(row)), entry]
    });
}

export function actorAdvancementSnapshot(actor) {
    const xp = actorXpState(actor);
    return Object.freeze({
        actorId: String(actor?.id ?? ""),
        settingId: actorSettingId(actor),
        xp,
        rules: advancementRulesForActor(actor),
        heroic: heroicProgression(actor, xp.earned),
        validation: validateXpProgression(xp)
    });
}

export function actorAvailableXp(actor) {
    return xpAvailable(actorXpState(actor));
}

export function evaluateActorSkillPurchase(actor, skillId, targetRank) {
    const id = text(skillId);
    const skills = actorSkillRows(actor);
    const state = skills.find((row) => String(row.id ?? "") === id);
    if (!state) {
        return Object.freeze({
            allowed: false,
            reasons: Object.freeze([`Unknown actor skill '${id}'.`]),
            skillId: id,
            currentRank: 0,
            targetRank: integer(targetRank, 0),
            career: false,
            cost: 0,
            availableXp: actorAvailableXp(actor)
        });
    }
    const career = Boolean(state.career);
    const magic = magicPurchasePolicy(actor, id, career);
    const evaluation = evaluateSkillAdvancement({
        xp: actorXpState(actor),
        skillId: id,
        currentRank: state.rank,
        targetRank,
        career,
        rules: advancementRulesForActor(actor),
        purchaseAllowed: magic.allowed,
        purchaseBlockedReason: magic.reason
    });
    const reasons = [...evaluation.reasons];
    if (!(actor?.isOwner !== false || game?.user?.isGM))
        reasons.push("You do not have permission to modify this character.");
    return Object.freeze({ ...evaluation, allowed: reasons.length === 0, reasons: Object.freeze(reasons) });
}

export function evaluateActorCharacteristicPurchase(actor, characteristicId, targetRating, options = {}) {
    const id = text(characteristicId);
    const current = integer(actor?.system?.characteristics?.[id], 0, 1, 6);
    if (!current) {
        return Object.freeze({ allowed: false, reasons: Object.freeze([`Unknown characteristic '${id}'.`]), currentRating: 0, targetRating: 0, cost: 0, availableXp: actorAvailableXp(actor) });
    }
    return evaluateCharacteristicAdvancement({
        xp: actorXpState(actor),
        currentRating: current,
        targetRating,
        rules: advancementRulesForActor(actor),
        allowAfterCreation: Boolean(options.allowAfterCreation)
    });
}

export async function awardActorXp(actor, amount, options = {}) {
    requireGm();
    requireActor(actor);
    const before = actorXpState(actor);
    const beforeHeroic = heroicProgression(actor, before.earned);
    const prepared = prepareEarnedXpAward(before, amount, {
        kind: options.kind ?? "award",
        label: options.label ?? `Award ${integer(amount, 0)} XP`,
        sourceId: options.sourceId ?? "gm",
        ruleId: options.ruleId ?? "",
        createdBy: String(game?.user?.id ?? "")
    });
    const after = await commitXpState(actor, prepared.after);
    const afterHeroic = heroicProgression(actor, after.earned);
    Hooks.callAll("genesysXpAwarded", actor, clone(prepared));
    if (afterHeroic.pointsEarned !== beforeHeroic.pointsEarned)
        Hooks.callAll("genesysHeroicAbilityPointsChanged", actor, beforeHeroic, afterHeroic);
    return Object.freeze({ ...prepared, heroicBefore: beforeHeroic, heroicAfter: afterHeroic });
}

export async function adjustActorEarnedXp(actor, delta, options = {}) {
    requireGm();
    requireActor(actor);
    const before = actorXpState(actor);
    const beforeHeroic = heroicProgression(actor, before.earned);
    const prepared = prepareEarnedXpAdjustment(before, delta, {
        kind: options.kind ?? "gm-adjustment",
        label: options.label,
        sourceId: options.sourceId ?? "gm",
        ruleId: options.ruleId ?? "",
        createdBy: String(game?.user?.id ?? "")
    }, { allowOverspend: Boolean(options.allowOverspend) });
    const after = await commitXpState(actor, prepared.after);
    const afterHeroic = heroicProgression(actor, after.earned);
    Hooks.callAll("genesysXpAdjusted", actor, clone(prepared));
    if (afterHeroic.pointsEarned !== beforeHeroic.pointsEarned)
        Hooks.callAll("genesysHeroicAbilityPointsChanged", actor, beforeHeroic, afterHeroic);
    return Object.freeze({ ...prepared, heroicBefore: beforeHeroic, heroicAfter: afterHeroic });
}

export async function spendActorXp(actor, cost, metadata = {}) {
    requireOwner(actor);
    const before = await ensureActorXpLedgerBaseline(actor);
    const prepared = prepareXpSpend(before, cost, {
        ...metadata,
        createdBy: metadata.createdBy ?? String(game?.user?.id ?? "")
    });
    const after = await commitXpState(actor, prepared.after);
    Hooks.callAll("genesysXpSpent", actor, clone(prepared));
    return Object.freeze({ ...prepared, after });
}

export async function refundActorXp(actor, amount, metadata = {}) {
    requireGm();
    requireActor(actor);
    const before = await ensureActorXpLedgerBaseline(actor);
    const prepared = prepareXpRefund(before, amount, {
        ...metadata,
        createdBy: metadata.createdBy ?? String(game?.user?.id ?? "")
    });
    const after = await commitXpState(actor, prepared.after);
    Hooks.callAll("genesysXpRefunded", actor, clone(prepared));
    return Object.freeze({ ...prepared, after });
}

export async function purchaseActorSkill(actor, skillId, targetRank, options = {}) {
    requireOwner(actor);
    const evaluation = evaluateActorSkillPurchase(actor, skillId, targetRank);
    if (!evaluation.allowed)
        throw new Error(evaluation.reasons.join(" "));

    const xpBefore = await ensureActorXpLedgerBaseline(actor);
    const prepared = prepareXpSpend(xpBefore, evaluation.cost, {
        kind: "skill",
        label: `${skillId} ${evaluation.currentRank} -> ${evaluation.targetRank}`,
        targetType: "skill",
        targetId: String(skillId),
        sourceId: options.sourceId ?? String(skillId),
        ruleId: options.ruleId ?? "core:skill-advancement",
        createdBy: String(game?.user?.id ?? "")
    });
    const skills = actorSkillRows(actor);
    const index = skills.findIndex((row) => String(row.id ?? "") === String(skillId));
    skills[index] = { ...skills[index], rank: evaluation.targetRank };
    await actor.update({ ...xpUpdateData(prepared.after), "system.skills": skills });
    await rerenderRenderedCharacterSheet(actor);
    Hooks.callAll("genesysSkillAdvanced", actor, String(skillId), clone(evaluation), clone(prepared));
    return Object.freeze({ evaluation, transaction: prepared, skill: clone(skills[index]) });
}

export async function ensureActorXpLedgerBaseline(actor) {
    requireActor(actor);
    let state = actorXpState(actor);
    const earnedAccounted = ledgerBucketTotal(state.ledger, "earned");
    const spentAccounted = ledgerBucketTotal(state.ledger, "spent");
    const additions = [];
    const createdAt = Date.now();
    if (earnedAccounted !== state.earned) {
        additions.push({
            id: `xp:legacy-earned:${actor.id}:${createdAt}`,
            kind: "legacy-baseline",
            bucket: "earned",
            amount: state.earned - earnedAccounted,
            label: "Pre-0.0.172 earned XP baseline",
            sourceId: "migration:0.0.172",
            before: Math.max(0, earnedAccounted),
            after: state.earned,
            createdAt,
            createdBy: String(game?.user?.id ?? "")
        });
    }
    if (spentAccounted !== state.spent) {
        additions.push({
            id: `xp:legacy-spent:${actor.id}:${createdAt}`,
            kind: "legacy-baseline",
            bucket: "spent",
            amount: state.spent - spentAccounted,
            label: "Pre-0.0.172 spent XP baseline",
            sourceId: "migration:0.0.172",
            before: Math.max(0, spentAccounted),
            after: state.spent,
            createdAt,
            createdBy: String(game?.user?.id ?? "")
        });
    }
    if (!additions.length)
        return state;
    for (const entry of additions)
        state = appendLedgerWithoutChangingTotals(state, entry);
    await actor.update({ "system.xp.ledger": state.ledger.map((entry) => ({ ...entry })) });
    return state;
}

export async function migrateWorldXpLedgers() {
    requireGm();
    const results = [];
    for (const actor of game?.actors?.contents ?? []) {
        if (actor?.type !== "character")
            continue;
        const before = actorXpState(actor);
        const after = await ensureActorXpLedgerBaseline(actor);
        results.push({ actorId: actor.id, actorName: actor.name, changed: after.ledger.length !== before.ledger.length });
    }
    return results;
}

async function recordTalentPurchaseLedger(actor, item, evaluation) {
    try {
        if (!actor?.update || !evaluation?.cost)
            return;
        const state = actorXpState(actor);
        const accounted = ledgerBucketTotal(state.ledger, "spent");
        const gap = state.spent - accounted;
        const cost = integer(evaluation.cost, 0);
        if (cost <= 0 || gap < cost)
            return;
        const currentRank = integer(item?.system?.rank, 1, 1, 99);
        const next = appendLedgerWithoutChangingTotals(state, {
            kind: "talent",
            bucket: "spent",
            amount: cost,
            label: `${item?.name ?? evaluation?.talent?.label ?? "Talent"}${item?.system?.ranked ? ` rank ${currentRank}` : ""}`,
            targetType: "talent",
            targetId: String(item?.system?.sourceId ?? evaluation?.talent?.id ?? ""),
            sourceId: String(item?.system?.sourceId ?? evaluation?.talent?.id ?? ""),
            ruleId: "core:talent-advancement",
            before: Math.max(0, state.spent - cost),
            after: state.spent,
            createdBy: String(game?.user?.id ?? "")
        });
        await actor.update({ "system.xp.ledger": next.ledger.map((entry) => ({ ...entry })) });
    }
    catch (error) {
        console.warn(`${SYSTEM_ID} | Could not record Talent XP ledger entry`, error);
    }
}

Hooks.on("genesysTalentPurchased", (actor, item, evaluation) => {
    void recordTalentPurchaseLedger(actor, item, evaluation);
});

Hooks.once("ready", () => {
    const api = Object.freeze({
        rules: DEFAULT_ADVANCEMENT_RULES,
        normalizeRules: normalizeAdvancementRules,
        normalizeXp: normalizeXpProgression,
        validateXp: validateXpProgression,
        availableXp: actorAvailableXp,
        snapshot: actorAdvancementSnapshot,
        heroicProgression,
        skillCost: skillXpCost,
        talentCost: talentXpCost,
        evaluateSkillPurchase: evaluateActorSkillPurchase,
        purchaseSkill: purchaseActorSkill,
        evaluateCharacteristicPurchase: evaluateActorCharacteristicPurchase,
        awardXp: awardActorXp,
        adjustEarnedXp: adjustActorEarnedXp,
        spendXp: spendActorXp,
        refundXp: refundActorXp,
        ensureLedgerBaseline: ensureActorXpLedgerBaseline,
        migrateWorldLedgers: migrateWorldXpLedgers
    });
    Object.defineProperty(game, "genesysAdvancement", { configurable: true, value: api });
    console.log(`${SYSTEM_ID} | XP & Advancement foundation ready`);
});
