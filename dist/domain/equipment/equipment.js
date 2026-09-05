function integer(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const number = Number(value ?? fallback);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(number)));
}

function text(value, fallback = "") {
    const out = String(value ?? fallback).trim();
    return out || fallback;
}

function clone(value) {
    if (value === undefined) return undefined;
    return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function normalizeWallet(wallet = {}, currency = {}) {
    const denominations = Array.isArray(currency?.denominations) ? currency.denominations : [];
    const primary = denominations[0] ?? {};
    return Object.freeze({
        label: text(wallet.label, text(currency.label, "Funds")),
        value: integer(wallet.value, 0),
        denominationId: text(wallet.denominationId, text(primary.id, "")),
        abbreviation: text(wallet.abbreviation, text(primary.abbreviation, ""))
    });
}

export function depositWallet(wallet, amount, currency = {}) {
    const current = normalizeWallet(wallet, currency);
    return Object.freeze({ ...current, value: current.value + integer(amount, 0) });
}

export function spendWallet(wallet, amount, currency = {}) {
    const current = normalizeWallet(wallet, currency);
    const cost = integer(amount, 0);
    if (cost > current.value) throw new RangeError(`Not enough ${current.label}. Need ${cost}, have ${current.value}.`);
    return Object.freeze({ ...current, value: current.value - cost });
}

export function rollFundsFormula(formula, rng = Math.random) {
    const expression = text(formula, "0").replace(/\s+/g, "");
    if (!/^[+-]?(?:\d+|\d*d\d+)(?:[+-](?:\d+|\d*d\d+))*$/i.test(expression)) {
        throw new Error(`Unsupported funds formula '${formula}'.`);
    }
    const terms = expression.match(/[+-]?[^+-]+/g) ?? [];
    const rolls = [];
    let total = 0;
    for (const raw of terms) {
        const sign = raw.startsWith("-") ? -1 : 1;
        const term = raw.replace(/^[+-]/, "");
        const dice = term.match(/^(\d*)d(\d+)$/i);
        if (!dice) {
            total += sign * integer(term, 0);
            continue;
        }
        const count = integer(dice[1] || 1, 1, 1, 100);
        const faces = integer(dice[2], 0, 1, 10000);
        for (let index = 0; index < count; index++) {
            const rawRandom = Number(rng());
            const bounded = Number.isFinite(rawRandom) ? Math.min(0.999999999999, Math.max(0, rawRandom)) : 0;
            const result = Math.floor(bounded * faces) + 1;
            rolls.push({ faces, result, sign });
            total += sign * result;
        }
    }
    return Object.freeze({ formula: expression, total: Math.max(0, total), rolls: Object.freeze(rolls) });
}

export function normalizeEquipmentDefinition(input = {}) {
    return Object.freeze({
        ...clone(input),
        id: text(input.id),
        label: text(input.label ?? input.name, text(input.id, "Equipment")),
        itemType: text(input.itemType ?? input.type, "gear"),
        sourceId: text(input.sourceId, text(input.id, "custom")),
        sourceType: text(input.sourceType, "custom"),
        system: clone(input.system ?? {}),
        metadata: clone(input.metadata ?? {})
    });
}

function catalogMap(catalog = []) {
    return new Map((Array.isArray(catalog) ? catalog : []).map((row) => {
        const normalized = normalizeEquipmentDefinition(row);
        return [normalized.id, normalized];
    }));
}

function normalizedPackage(packageDefinition = {}) {
    return {
        groups: Array.isArray(packageDefinition.groups) ? clone(packageDefinition.groups) : [],
        funds: packageDefinition.funds && typeof packageDefinition.funds === "object" ? clone(packageDefinition.funds) : null
    };
}

export function resolveStartingGearPackage(packageDefinition = {}, selections = {}, catalog = []) {
    const pack = normalizedPackage(packageDefinition);
    const byId = catalogMap(catalog);
    const unresolvedChoices = [];
    const unresolvedItems = [];
    const quantities = new Map();

    const addItems = (items = []) => {
        for (const row of items) {
            const id = text(row?.id);
            if (!id) continue;
            const quantity = integer(row?.quantity, 1, 1);
            quantities.set(id, (quantities.get(id) ?? 0) + quantity);
        }
    };

    for (const group of pack.groups) {
        if (group?.type === "fixed") {
            addItems(group.items);
            continue;
        }
        if (group?.type !== "choice") continue;
        const options = Array.isArray(group.options) ? group.options : [];
        const selectedIndex = Number(selections?.[group.id]);
        if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= options.length) {
            unresolvedChoices.push({ id: text(group.id), label: text(group.label, text(group.id, "Choice")), optionCount: options.length });
            continue;
        }
        addItems(options[selectedIndex]);
    }

    const items = [];
    for (const [id, quantity] of quantities) {
        const definition = byId.get(id);
        if (!definition) {
            unresolvedItems.push({ id, quantity });
            continue;
        }
        items.push({ id, quantity, definition });
    }

    return Object.freeze({
        items: Object.freeze(items),
        unresolvedChoices: Object.freeze(unresolvedChoices),
        unresolvedItems: Object.freeze(unresolvedItems),
        funds: pack.funds ? Object.freeze(pack.funds) : null,
        valid: unresolvedChoices.length === 0 && unresolvedItems.length === 0
    });
}

export function attachmentHardPointUsage(attachments = []) {
    return (Array.isArray(attachments) ? attachments : []).reduce((sum, attachment) => {
        if (attachment?.installed === false) return sum;
        return sum + integer(attachment?.hardPointCost, 0);
    }, 0);
}

export function validateHardPointCapacity(totalHardPoints, attachments = []) {
    const total = integer(totalHardPoints, 0);
    const used = attachmentHardPointUsage(attachments);
    return Object.freeze({ total, used, available: Math.max(0, total - used), valid: used <= total, overflow: Math.max(0, used - total) });
}

export function replaceCraftsmanship(current, nextId) {
    const previousId = text(current?.id ?? current);
    const id = text(nextId);
    return Object.freeze({ id, replacedId: previousId && previousId !== id ? previousId : "" });
}
