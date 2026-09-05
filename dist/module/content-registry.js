const SYSTEM_ID = "genesys-vtt";
const PERSISTED_PACKS_SETTING = "characterContentPacks";
const memoryPacks = new Map();

const CONTENT_KEYS = Object.freeze([
    "archetypes",
    "careers",
    "skills",
    "talents",
    "equipment",
    "actions",
    "heroicAbilities",
    "motivations"
]);

function text(value, fallback = "") {
    const out = String(value ?? fallback).trim();
    return out || fallback;
}

function clone(value) {
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function list(value) {
    return Array.isArray(value) ? value.map((entry) => clone(entry)) : [];
}

function normalizeCurrency(currency = {}) {
    const denominations = Array.isArray(currency.denominations)
        ? currency.denominations.map((entry, index) => ({
            id: text(entry?.id, `currency-${index + 1}`),
            label: text(entry?.label, entry?.id ?? `Currency ${index + 1}`),
            abbreviation: text(entry?.abbreviation, ""),
            baseValue: Math.max(0, Number(entry?.baseValue ?? 1) || 1),
            icon: text(entry?.icon, "fa-solid fa-coins")
        }))
        : [];
    return {
        mode: text(currency.mode, denominations.length > 1 ? "denominations" : "single"),
        label: text(currency.label, "Funds"),
        denominations
    };
}

function normalizeCreationRules(rules = {}) {
    return {
        careerSkillGrantCount: Math.max(0, Math.trunc(Number(rules.careerSkillGrantCount ?? 4) || 0)),
        careerSkillGrantRank: Math.max(0, Math.trunc(Number(rules.careerSkillGrantRank ?? 1) || 0)),
        creationSkillCap: Math.max(0, Math.min(5, Math.trunc(Number(rules.creationSkillCap ?? 2) || 0))),
        characteristicCostMultiplier: Math.max(0, Math.trunc(Number(rules.characteristicCostMultiplier ?? 10) || 0)),
        careerSkillCostMultiplier: Math.max(0, Math.trunc(Number(rules.careerSkillCostMultiplier ?? 5) || 0)),
        nonCareerSkillSurcharge: Math.max(0, Math.trunc(Number(rules.nonCareerSkillSurcharge ?? 5) || 0)),
        talentCostMultiplier: Math.max(0, Math.trunc(Number(rules.talentCostMultiplier ?? 5) || 0)),
        coreStartingFunds: Math.max(0, Math.trunc(Number(rules.coreStartingFunds ?? 500) || 0)),
        heroicAbilityAtCreation: Boolean(rules.heroicAbilityAtCreation),
        heroicAbilityStoryPointCost: Math.max(0, Math.trunc(Number(rules.heroicAbilityStoryPointCost ?? 0) || 0)),
        notes: text(rules.notes, "")
    };
}

function normalizeContentEntry(entry = {}, kind, index) {
    return {
        ...clone(entry),
        id: text(entry?.id, `${kind}-${index + 1}`),
        label: text(entry?.label ?? entry?.name, entry?.id ?? `${kind} ${index + 1}`),
        sourceId: text(entry?.sourceId, ""),
        sourceType: text(entry?.sourceType, "custom")
    };
}

export function normalizeCharacterContentPack(pack = {}) {
    const id = text(pack.id, `content-pack:${Date.now()}`);
    const normalized = {
        id,
        label: text(pack.label ?? pack.name, id),
        version: text(pack.version, "1"),
        settingId: text(pack.settingId, id),
        sourceType: text(pack.sourceType, "custom"),
        complete: Boolean(pack.complete),
        currency: normalizeCurrency(pack.currency),
        creationRules: normalizeCreationRules(pack.creationRules),
        creationSteps: Array.isArray(pack.creationSteps) ? clone(pack.creationSteps) : [],
        magicRules: pack.magicRules && typeof pack.magicRules === "object" ? clone(pack.magicRules) : {},
        heroicRules: pack.heroicRules && typeof pack.heroicRules === "object" ? clone(pack.heroicRules) : {},
        metadata: { ...(pack.metadata ?? {}) }
    };
    for (const key of CONTENT_KEYS)
        normalized[key] = list(pack[key]).map((entry, index) => normalizeContentEntry(entry, key, index));
    return normalized;
}

export function registerCharacterContentPack(pack, { replace = true } = {}) {
    const normalized = normalizeCharacterContentPack(pack);
    if (!replace && memoryPacks.has(normalized.id))
        throw new Error(`Character content pack already registered: ${normalized.id}`);
    memoryPacks.set(normalized.id, normalized);
    Hooks.callAll("genesysCharacterContentPackRegistered", clone(normalized));
    return clone(normalized);
}

export function unregisterCharacterContentPack(packId) {
    const id = text(packId);
    const removed = memoryPacks.delete(id);
    if (removed)
        Hooks.callAll("genesysCharacterContentPackUnregistered", id);
    return removed;
}

export function getCharacterContentPack(packId) {
    const pack = memoryPacks.get(text(packId));
    return pack ? clone(pack) : null;
}

export function listCharacterContentPacks() {
    return Array.from(memoryPacks.values())
        .map((pack) => clone(pack))
        .sort((a, b) => a.label.localeCompare(b.label));
}

export function getCharacterContent(kind, { packIds = null, settingId = "" } = {}) {
    if (!CONTENT_KEYS.includes(kind))
        return [];
    const allowed = Array.isArray(packIds) && packIds.length ? new Set(packIds.map(String)) : null;
    const rows = [];
    for (const pack of memoryPacks.values()) {
        if (allowed && !allowed.has(pack.id))
            continue;
        if (settingId && pack.settingId !== settingId)
            continue;
        for (const entry of pack[kind] ?? [])
            rows.push({ ...clone(entry), packId: pack.id, packLabel: pack.label, settingId: pack.settingId });
    }
    return rows;
}

export function getSettingCurrency(settingId) {
    const pack = Array.from(memoryPacks.values()).find((entry) => entry.settingId === settingId && entry.currency?.denominations?.length);
    return pack ? clone(pack.currency) : { mode: "single", label: "Funds", denominations: [] };
}

export function getSettingCreationRules(settingId) {
    const pack = Array.from(memoryPacks.values()).find((entry) => entry.settingId === settingId && entry.creationRules);
    return pack ? clone(pack.creationRules) : normalizeCreationRules({});
}

export function getSettingCreationSteps(settingId) {
    const pack = Array.from(memoryPacks.values()).find((entry) => entry.settingId === settingId && entry.creationSteps?.length);
    return pack ? clone(pack.creationSteps) : [];
}

export function getSettingMagicRules(settingId) {
    const packs = Array.from(memoryPacks.values()).filter((entry) => entry.settingId === settingId && Object.keys(entry.magicRules ?? {}).length);
    if (!packs.length)
        return {};
    return packs.reduce((merged, pack) => ({ ...merged, ...clone(pack.magicRules) }), {});
}

export function getSettingHeroicRules(settingId) {
    const packs = Array.from(memoryPacks.values()).filter((entry) => entry.settingId === settingId && Object.keys(entry.heroicRules ?? {}).length);
    if (!packs.length)
        return {};
    return packs.reduce((merged, pack) => ({ ...merged, ...clone(pack.heroicRules) }), {});
}

function persistedPacks() {
    try {
        const value = game.settings.get(SYSTEM_ID, PERSISTED_PACKS_SETTING);
        return Array.isArray(value) ? value : [];
    }
    catch {
        return [];
    }
}

export async function importCharacterContentPack(pack, { persist = true } = {}) {
    const normalized = registerCharacterContentPack(pack);
    if (!persist)
        return normalized;
    const current = persistedPacks().map((entry) => normalizeCharacterContentPack(entry));
    const next = current.filter((entry) => entry.id !== normalized.id);
    next.push(normalized);
    await game.settings.set(SYSTEM_ID, PERSISTED_PACKS_SETTING, next);
    return normalized;
}

export async function removeImportedCharacterContentPack(packId) {
    const id = text(packId);
    unregisterCharacterContentPack(id);
    const next = persistedPacks().filter((entry) => text(entry?.id) !== id);
    await game.settings.set(SYSTEM_ID, PERSISTED_PACKS_SETTING, next);
    return true;
}

export function characterContentRegistrySnapshot() {
    const packs = listCharacterContentPacks();
    return {
        packCount: packs.length,
        packs,
        counts: Object.fromEntries(CONTENT_KEYS.map((key) => [key, packs.reduce((sum, pack) => sum + (pack[key]?.length ?? 0), 0)]))
    };
}

function exposeApi() {
    const api = Object.freeze({
        contentKeys: CONTENT_KEYS,
        normalizePack: normalizeCharacterContentPack,
        registerPack: registerCharacterContentPack,
        unregisterPack: unregisterCharacterContentPack,
        importPack: importCharacterContentPack,
        removeImportedPack: removeImportedCharacterContentPack,
        getPack: getCharacterContentPack,
        listPacks: listCharacterContentPacks,
        getContent: getCharacterContent,
        getCurrency: getSettingCurrency,
        getCreationRules: getSettingCreationRules,
        getCreationSteps: getSettingCreationSteps,
        getMagicRules: getSettingMagicRules,
        getHeroicRules: getSettingHeroicRules,
        snapshot: characterContentRegistrySnapshot
    });
    Object.defineProperty(game, "genesysContent", { configurable: true, value: api });
}

Hooks.once("init", () => {
    game.settings.register(SYSTEM_ID, PERSISTED_PACKS_SETTING, {
        name: "Genesys Character Content Packs",
        hint: "Imported/private character creation content packs. Managed by Genesys tools rather than Foundry settings UI.",
        scope: "world",
        config: false,
        type: Array,
        default: []
    });
});

Hooks.once("ready", () => {
    for (const pack of persistedPacks()) {
        try {
            registerCharacterContentPack(pack);
        }
        catch (error) {
            console.warn(`${SYSTEM_ID} | Failed to register imported character content pack`, error);
        }
    }
    exposeApi();
    console.log(`${SYSTEM_ID} | Character Content Registry ready`, characterContentRegistrySnapshot());
});
