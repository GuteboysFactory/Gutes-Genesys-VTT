export const DEFAULT_ADVANCEMENT_RULES = Object.freeze({
    characteristicCostMultiplier: 10,
    careerSkillCostMultiplier: 5,
    nonCareerSkillSurcharge: 5,
    talentCostMultiplier: 5,
    maximumSkillRank: 5,
    allowCharacteristicPurchasesAfterCreation: false
});

function integer(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const number = Number(value ?? fallback);
    if (!Number.isFinite(number))
        return fallback;
    return Math.min(max, Math.max(min, Math.trunc(number)));
}

function signedInteger(value, fallback = 0) {
    const number = Number(value ?? fallback);
    return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function text(value, fallback = "") {
    const out = String(value ?? fallback).trim();
    return out || fallback;
}

function clone(value) {
    if (value === undefined)
        return undefined;
    return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function normalizeAdvancementRules(input = {}) {
    return Object.freeze({
        characteristicCostMultiplier: integer(input.characteristicCostMultiplier, DEFAULT_ADVANCEMENT_RULES.characteristicCostMultiplier, 0, 100),
        careerSkillCostMultiplier: integer(input.careerSkillCostMultiplier, DEFAULT_ADVANCEMENT_RULES.careerSkillCostMultiplier, 0, 100),
        nonCareerSkillSurcharge: integer(input.nonCareerSkillSurcharge, DEFAULT_ADVANCEMENT_RULES.nonCareerSkillSurcharge, 0, 100),
        talentCostMultiplier: integer(input.talentCostMultiplier, DEFAULT_ADVANCEMENT_RULES.talentCostMultiplier, 0, 100),
        maximumSkillRank: integer(input.maximumSkillRank, DEFAULT_ADVANCEMENT_RULES.maximumSkillRank, 0, 10),
        allowCharacteristicPurchasesAfterCreation: Boolean(input.allowCharacteristicPurchasesAfterCreation ?? DEFAULT_ADVANCEMENT_RULES.allowCharacteristicPurchasesAfterCreation)
    });
}

export function normalizeXpLedgerEntry(input = {}, index = 0) {
    const bucket = input.bucket === "spent" ? "spent" : "earned";
    return Object.freeze({
        id: text(input.id, `xp:${Date.now()}:${index}`),
        kind: text(input.kind, "adjustment"),
        bucket,
        amount: signedInteger(input.amount, 0),
        label: text(input.label, "XP transaction"),
        targetType: text(input.targetType),
        targetId: text(input.targetId),
        sourceId: text(input.sourceId),
        ruleId: text(input.ruleId),
        before: integer(input.before, 0),
        after: integer(input.after, 0),
        createdAt: integer(input.createdAt, Date.now()),
        createdBy: text(input.createdBy)
    });
}

export function normalizeXpProgression(input = {}) {
    const starting = integer(input.starting, 0);
    const earned = integer(input.earned, 0);
    const spent = integer(input.spent, 0);
    const ledger = (Array.isArray(input.ledger) ? input.ledger : []).map((entry, index) => normalizeXpLedgerEntry(entry, index));
    const total = starting + earned;
    return Object.freeze({
        starting,
        earned,
        spent,
        total,
        available: Math.max(0, total - spent),
        rawAvailable: total - spent,
        ledger: Object.freeze(ledger)
    });
}

export function xpAvailable(input = {}) {
    return normalizeXpProgression(input).available;
}

export function ledgerBucketTotal(ledger = [], bucket = "spent") {
    return (Array.isArray(ledger) ? ledger : [])
        .map((entry, index) => normalizeXpLedgerEntry(entry, index))
        .filter((entry) => entry.bucket === bucket)
        .reduce((sum, entry) => sum + entry.amount, 0);
}

export function validateXpProgression(input = {}) {
    const state = normalizeXpProgression(input);
    const errors = [];
    const warnings = [];
    if (state.spent > state.total)
        errors.push(`XP spent (${state.spent}) exceeds total XP (${state.total}).`);
    const ledgerEarned = ledgerBucketTotal(state.ledger, "earned");
    const ledgerSpent = ledgerBucketTotal(state.ledger, "spent");
    if (ledgerEarned !== state.earned)
        warnings.push(`Earned XP ledger totals ${ledgerEarned}, but actor earned XP is ${state.earned}.`);
    if (ledgerSpent !== state.spent)
        warnings.push(`Spent XP ledger totals ${ledgerSpent}, but actor spent XP is ${state.spent}.`);
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), warnings: Object.freeze(warnings), state });
}

export function characteristicXpCost(current, target, rulesInput = {}) {
    const rules = normalizeAdvancementRules(rulesInput);
    const from = integer(current, 1, 1, 6);
    const to = integer(target, from, 1, 6);
    if (to <= from)
        return 0;
    let cost = 0;
    for (let rating = from + 1; rating <= to; rating += 1)
        cost += rules.characteristicCostMultiplier * rating;
    return cost;
}

export function skillXpCost(current, target, career, rulesInput = {}) {
    const rules = normalizeAdvancementRules(rulesInput);
    const from = integer(current, 0, 0, rules.maximumSkillRank);
    const to = integer(target, from, 0, rules.maximumSkillRank);
    if (to <= from)
        return 0;
    let cost = 0;
    for (let rank = from + 1; rank <= to; rank += 1) {
        cost += rules.careerSkillCostMultiplier * rank;
        if (!career)
            cost += rules.nonCareerSkillSurcharge;
    }
    return cost;
}

export function talentXpCost(effectiveTier, rulesInput = {}) {
    const rules = normalizeAdvancementRules(rulesInput);
    return rules.talentCostMultiplier * integer(effectiveTier, 1, 1, 5);
}

function transactionId() {
    return `xp:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function prepareXpTransaction(stateInput = {}, transaction = {}, options = {}) {
    const state = normalizeXpProgression(stateInput);
    const bucket = transaction.bucket === "spent" ? "spent" : "earned";
    const amount = signedInteger(transaction.amount, 0);
    if (amount === 0)
        throw new Error("XP transaction amount must not be zero.");

    const before = bucket === "earned" ? state.earned : state.spent;
    const after = before + amount;
    if (after < 0)
        throw new RangeError(`${bucket === "earned" ? "Earned" : "Spent"} XP cannot be negative.`);

    const nextEarned = bucket === "earned" ? after : state.earned;
    const nextSpent = bucket === "spent" ? after : state.spent;
    const nextTotal = state.starting + nextEarned;
    if (!options.allowOverspend && nextSpent > nextTotal)
        throw new RangeError(`Not enough XP. Need ${nextSpent - state.spent}, have ${Math.max(0, nextTotal - state.spent)}.`);

    const entry = normalizeXpLedgerEntry({
        id: transaction.id || transactionId(),
        kind: transaction.kind,
        bucket,
        amount,
        label: transaction.label,
        targetType: transaction.targetType,
        targetId: transaction.targetId,
        sourceId: transaction.sourceId,
        ruleId: transaction.ruleId,
        before,
        after,
        createdAt: transaction.createdAt ?? Date.now(),
        createdBy: transaction.createdBy
    }, state.ledger.length);

    const next = normalizeXpProgression({
        starting: state.starting,
        earned: nextEarned,
        spent: nextSpent,
        ledger: [...state.ledger.map((row) => clone(row)), entry]
    });
    return Object.freeze({ before: state, entry, after: next });
}

export function prepareEarnedXpAward(state, amount, metadata = {}) {
    const value = integer(amount, 0);
    if (value <= 0)
        throw new RangeError("Awarded XP must be greater than zero.");
    return prepareXpTransaction(state, {
        ...metadata,
        bucket: "earned",
        amount: value,
        kind: metadata.kind ?? "award",
        label: metadata.label ?? `Award ${value} XP`
    });
}

export function prepareEarnedXpAdjustment(state, delta, metadata = {}, options = {}) {
    const value = signedInteger(delta, 0);
    if (value === 0)
        throw new RangeError("XP adjustment must not be zero.");
    return prepareXpTransaction(state, {
        ...metadata,
        bucket: "earned",
        amount: value,
        kind: metadata.kind ?? "gm-adjustment",
        label: metadata.label ?? `GM XP adjustment ${value > 0 ? "+" : ""}${value}`
    }, options);
}

export function prepareXpSpend(state, cost, metadata = {}) {
    const value = integer(cost, 0);
    if (value <= 0)
        throw new RangeError("XP spend must be greater than zero.");
    return prepareXpTransaction(state, {
        ...metadata,
        bucket: "spent",
        amount: value,
        kind: metadata.kind ?? "purchase",
        label: metadata.label ?? `Spend ${value} XP`
    });
}

export function prepareXpRefund(state, amount, metadata = {}) {
    const value = integer(amount, 0);
    if (value <= 0)
        throw new RangeError("XP refund must be greater than zero.");
    return prepareXpTransaction(state, {
        ...metadata,
        bucket: "spent",
        amount: -value,
        kind: metadata.kind ?? "refund",
        label: metadata.label ?? `Refund ${value} XP`
    });
}

export function evaluateSkillAdvancement(input = {}) {
    const rules = normalizeAdvancementRules(input.rules ?? {});
    const currentRank = integer(input.currentRank, 0, 0, rules.maximumSkillRank);
    const targetRank = integer(input.targetRank, currentRank, 0, rules.maximumSkillRank);
    const career = Boolean(input.career);
    const availableXp = xpAvailable(input.xp ?? {});
    const reasons = [];
    if (targetRank <= currentRank)
        reasons.push("Skill advancement must increase the current rank.");
    if (targetRank > rules.maximumSkillRank)
        reasons.push(`Skill rank cannot exceed ${rules.maximumSkillRank}.`);
    if (input.purchaseAllowed === false)
        reasons.push(text(input.purchaseBlockedReason, "This skill cannot be purchased under the active rules."));
    const cost = skillXpCost(currentRank, targetRank, career, rules);
    if (cost > availableXp)
        reasons.push(`Not enough XP. Need ${cost}, have ${availableXp}.`);
    return Object.freeze({
        allowed: reasons.length === 0,
        reasons: Object.freeze(reasons),
        skillId: text(input.skillId),
        currentRank,
        targetRank,
        career,
        cost,
        availableXp
    });
}

export function evaluateCharacteristicAdvancement(input = {}) {
    const rules = normalizeAdvancementRules(input.rules ?? {});
    const currentRating = integer(input.currentRating, 1, 1, 6);
    const targetRating = integer(input.targetRating, currentRating, 1, 6);
    const availableXp = xpAvailable(input.xp ?? {});
    const allowAfterCreation = Boolean(input.allowAfterCreation ?? rules.allowCharacteristicPurchasesAfterCreation);
    const reasons = [];
    if (!allowAfterCreation)
        reasons.push("Characteristics cannot normally be purchased with XP after character creation.");
    if (targetRating <= currentRating)
        reasons.push("Characteristic advancement must increase the current rating.");
    const cost = characteristicXpCost(currentRating, targetRating, rules);
    if (cost > availableXp)
        reasons.push(`Not enough XP. Need ${cost}, have ${availableXp}.`);
    return Object.freeze({ allowed: reasons.length === 0, reasons: Object.freeze(reasons), currentRating, targetRating, cost, availableXp });
}
