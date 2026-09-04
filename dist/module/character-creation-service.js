const SYSTEM_ID = "genesys-vtt";
const DRAFT_FLAG = "characterCreationDraft";

export const CHARACTERISTIC_IDS = Object.freeze([
    "brawn", "agility", "intellect", "cunning", "willpower", "presence"
]);

export const DEFAULT_CREATION_RULES = Object.freeze({
    careerSkillGrantCount: 4,
    careerSkillGrantRank: 1,
    creationSkillCap: 2,
    characteristicCostMultiplier: 10,
    careerSkillCostMultiplier: 5,
    nonCareerSkillSurcharge: 5,
    talentCostMultiplier: 5,
    coreStartingFunds: 500,
    allowCharacteristicPurchasesAfterCreation: false
});

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
    const n = Number(value ?? fallback);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
}

function normalizeCharacteristics(input = {}, fallback = 2) {
    return Object.fromEntries(CHARACTERISTIC_IDS.map((id) => [id, integer(input?.[id], fallback, 1, 6)]));
}

export function normalizeCreationRules(input = {}) {
    return {
        careerSkillGrantCount: integer(input.careerSkillGrantCount, DEFAULT_CREATION_RULES.careerSkillGrantCount, 0, 20),
        careerSkillGrantRank: integer(input.careerSkillGrantRank, DEFAULT_CREATION_RULES.careerSkillGrantRank, 0, 5),
        creationSkillCap: integer(input.creationSkillCap, DEFAULT_CREATION_RULES.creationSkillCap, 0, 5),
        characteristicCostMultiplier: integer(input.characteristicCostMultiplier, DEFAULT_CREATION_RULES.characteristicCostMultiplier, 0, 100),
        careerSkillCostMultiplier: integer(input.careerSkillCostMultiplier, DEFAULT_CREATION_RULES.careerSkillCostMultiplier, 0, 100),
        nonCareerSkillSurcharge: integer(input.nonCareerSkillSurcharge, DEFAULT_CREATION_RULES.nonCareerSkillSurcharge, 0, 100),
        talentCostMultiplier: integer(input.talentCostMultiplier, DEFAULT_CREATION_RULES.talentCostMultiplier, 0, 100),
        coreStartingFunds: integer(input.coreStartingFunds, DEFAULT_CREATION_RULES.coreStartingFunds, 0),
        allowCharacteristicPurchasesAfterCreation: Boolean(input.allowCharacteristicPurchasesAfterCreation ?? DEFAULT_CREATION_RULES.allowCharacteristicPurchasesAfterCreation)
    };
}

export function normalizeArchetypeDefinition(input = {}) {
    const characteristics = normalizeCharacteristics(input.characteristics, 2);
    const startingSkills = Array.isArray(input.startingSkills) ? input.startingSkills.map((row) => ({
        skillId: text(row?.skillId),
        rank: integer(row?.rank, 1, 0, 5),
        creationCap: row?.creationCap === undefined ? null : integer(row.creationCap, 2, 0, 5),
        career: Boolean(row?.career)
    })).filter((row) => row.skillId) : [];
    return {
        ...clone(input),
        id: text(input.id, "archetype:custom"),
        label: text(input.label ?? input.name, "Custom Archetype"),
        characteristics,
        startingXp: integer(input.startingXp, 0),
        wounds: {
            base: integer(input.wounds?.base, 10),
            characteristicId: text(input.wounds?.characteristicId, "brawn")
        },
        strain: {
            base: integer(input.strain?.base, 10),
            characteristicId: text(input.strain?.characteristicId, "willpower")
        },
        startingSkills,
        silhouette: integer(input.silhouette, 1, 0, 10),
        defense: {
            melee: integer(input.defense?.melee, 0, 0, 10),
            ranged: integer(input.defense?.ranged, 0, 0, 10)
        },
        abilities: Array.isArray(input.abilities) ? clone(input.abilities) : [],
        choices: Array.isArray(input.choices) ? clone(input.choices) : [],
        tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
        sourceId: text(input.sourceId, "custom"),
        sourceType: text(input.sourceType, "custom")
    };
}

export function normalizeCareerDefinition(input = {}) {
    const careerSkills = [...new Set((Array.isArray(input.careerSkills) ? input.careerSkills : []).map(String).filter(Boolean))];
    return {
        ...clone(input),
        id: text(input.id, "career:custom"),
        label: text(input.label ?? input.name, "Custom Career"),
        careerSkills,
        freeSkillChoices: integer(input.freeSkillChoices, DEFAULT_CREATION_RULES.careerSkillGrantCount, 0, careerSkills.length || 20),
        freeSkillRank: integer(input.freeSkillRank, DEFAULT_CREATION_RULES.careerSkillGrantRank, 0, 5),
        startingGear: Array.isArray(input.startingGear) ? clone(input.startingGear) : [],
        variants: Array.isArray(input.variants) ? clone(input.variants) : [],
        tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
        sourceId: text(input.sourceId, "custom"),
        sourceType: text(input.sourceType, "custom")
    };
}

export function characteristicPurchaseCost(current, target, rules = DEFAULT_CREATION_RULES) {
    const config = normalizeCreationRules(rules);
    const from = integer(current, 1, 1, 6);
    const to = integer(target, from, 1, 6);
    if (to <= from)
        return 0;
    let cost = 0;
    for (let rating = from + 1; rating <= to; rating++)
        cost += config.characteristicCostMultiplier * rating;
    return cost;
}

export function skillPurchaseCost(current, target, career, rules = DEFAULT_CREATION_RULES) {
    const config = normalizeCreationRules(rules);
    const from = integer(current, 0, 0, 5);
    const to = integer(target, from, 0, 5);
    if (to <= from)
        return 0;
    let cost = 0;
    for (let rank = from + 1; rank <= to; rank++) {
        cost += config.careerSkillCostMultiplier * rank;
        if (!career)
            cost += config.nonCareerSkillSurcharge;
    }
    return cost;
}

export function talentPurchaseCost(effectiveTier, rules = DEFAULT_CREATION_RULES) {
    const config = normalizeCreationRules(rules);
    return config.talentCostMultiplier * integer(effectiveTier, 1, 1, 5);
}

function emptySkillState() {
    return { rank: 0, career: false, source: "creation" };
}

export function createCharacterDraft({ settingId = "", packId = "", rules = DEFAULT_CREATION_RULES } = {}) {
    return {
        version: 1,
        status: "draft",
        settingId: text(settingId),
        packId: text(packId),
        rules: normalizeCreationRules(rules),
        identity: { name: "", concept: "", portrait: "" },
        archetypeId: "",
        careerId: "",
        characteristics: normalizeCharacteristics({}, 2),
        startingCharacteristics: normalizeCharacteristics({}, 2),
        startingXp: 0,
        xpSpent: 0,
        xpLedger: [],
        skills: {},
        freeCareerSkills: [],
        talents: [],
        equipment: [],
        motivation: { strength: "", flaw: "", desire: "", fear: "", notes: "" },
        heroicAbility: null,
        wallet: { label: "Funds", value: 0, denominations: {} },
        derived: { wounds: 10, strain: 10, soak: 2, meleeDefense: 0, rangedDefense: 0, silhouette: 1 },
        archetypeAbilities: [],
        archetypeChoices: [],
        careerStartingGear: [],
        updatedAt: Date.now()
    };
}

export function draftAvailableXp(draft) {
    return Math.max(0, integer(draft?.startingXp, 0) - integer(draft?.xpSpent, 0));
}

function recomputeDerived(draft, archetype = null) {
    const characteristics = normalizeCharacteristics(draft.characteristics, 2);
    const woundsBase = integer(archetype?.wounds?.base, 10);
    const woundCharacteristic = text(archetype?.wounds?.characteristicId, "brawn");
    const strainBase = integer(archetype?.strain?.base, 10);
    const strainCharacteristic = text(archetype?.strain?.characteristicId, "willpower");
    draft.derived = {
        wounds: woundsBase + integer(characteristics[woundCharacteristic], 0),
        strain: strainBase + integer(characteristics[strainCharacteristic], 0),
        soak: integer(characteristics.brawn, 2),
        meleeDefense: integer(archetype?.defense?.melee, draft.derived?.meleeDefense ?? 0, 0, 10),
        rangedDefense: integer(archetype?.defense?.ranged, draft.derived?.rangedDefense ?? 0, 0, 10),
        silhouette: integer(archetype?.silhouette, draft.derived?.silhouette ?? 1, 0, 10)
    };
    return draft;
}

export function selectDraftArchetype(draftInput, archetypeInput) {
    const draft = clone(draftInput);
    const archetype = normalizeArchetypeDefinition(archetypeInput);
    draft.archetypeId = archetype.id;
    draft.characteristics = clone(archetype.characteristics);
    draft.startingCharacteristics = clone(archetype.characteristics);
    draft.startingXp = archetype.startingXp;
    draft.xpSpent = 0;
    draft.xpLedger = [];
    draft.skills = {};
    for (const grant of archetype.startingSkills) {
        draft.skills[grant.skillId] = {
            ...emptySkillState(),
            rank: grant.rank,
            career: grant.career,
            grantRank: grant.rank,
            creationCap: grant.creationCap,
            source: "archetype"
        };
    }
    draft.archetypeAbilities = clone(archetype.abilities);
    draft.archetypeChoices = clone(archetype.choices);
    recomputeDerived(draft, archetype);
    draft.updatedAt = Date.now();
    return draft;
}

export function selectDraftCareer(draftInput, careerInput) {
    const draft = clone(draftInput);
    const career = normalizeCareerDefinition(careerInput);
    draft.careerId = career.id;
    draft.freeCareerSkills = [];
    for (const skillId of career.careerSkills) {
        draft.skills[skillId] ??= emptySkillState();
        draft.skills[skillId].career = true;
    }
    draft.careerStartingGear = clone(career.startingGear);
    draft.updatedAt = Date.now();
    return draft;
}

export function chooseFreeCareerSkills(draftInput, careerInput, skillIds) {
    const draft = clone(draftInput);
    const career = normalizeCareerDefinition(careerInput);
    const chosen = [...new Set((Array.isArray(skillIds) ? skillIds : []).map(String))];
    if (chosen.length !== career.freeSkillChoices)
        throw new Error(`Choose exactly ${career.freeSkillChoices} career skills.`);
    for (const id of chosen) {
        if (!career.careerSkills.includes(id))
            throw new Error(`${id} is not a career skill for ${career.label}.`);
    }
    // Remove previous free career grants without erasing archetype-granted ranks.
    for (const [id, state] of Object.entries(draft.skills)) {
        if (state.freeCareerGrant) {
            const grantRank = integer(state.grantRank, 0, 0, 5);
            state.rank = Math.max(grantRank, integer(state.rank, 0) - integer(state.freeCareerGrant, 0));
            delete state.freeCareerGrant;
        }
    }
    for (const id of chosen) {
        draft.skills[id] ??= emptySkillState();
        const state = draft.skills[id];
        state.career = true;
        const before = integer(state.rank, 0, 0, 5);
        const after = Math.max(before, career.freeSkillRank);
        state.freeCareerGrant = Math.max(0, after - before);
        state.rank = after;
    }
    draft.freeCareerSkills = chosen;
    draft.updatedAt = Date.now();
    return draft;
}

export function purchaseDraftCharacteristic(draftInput, characteristicId, targetRating) {
    const draft = clone(draftInput);
    const id = text(characteristicId);
    if (!CHARACTERISTIC_IDS.includes(id))
        throw new Error(`Unknown characteristic '${id}'.`);
    const current = integer(draft.characteristics?.[id], 2, 1, 6);
    const target = integer(targetRating, current, 1, 6);
    if (target <= current)
        throw new Error("Characteristic purchases must increase the current rating.");
    const cost = characteristicPurchaseCost(current, target, draft.rules);
    if (cost > draftAvailableXp(draft))
        throw new Error(`Not enough XP. Need ${cost}, have ${draftAvailableXp(draft)}.`);
    draft.characteristics[id] = target;
    draft.xpSpent += cost;
    draft.xpLedger.push({ id: `xp:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`, kind: "characteristic", targetId: id, from: current, to: target, cost, createdAt: Date.now() });
    recomputeDerived(draft);
    draft.updatedAt = Date.now();
    return draft;
}

export function purchaseDraftSkill(draftInput, skillId, targetRank) {
    const draft = clone(draftInput);
    const id = text(skillId);
    if (!id)
        throw new Error("Skill id is required.");
    draft.skills[id] ??= emptySkillState();
    const state = draft.skills[id];
    const current = integer(state.rank, 0, 0, 5);
    const target = integer(targetRank, current, 0, 5);
    const cap = state.creationCap === null || state.creationCap === undefined
        ? integer(draft.rules?.creationSkillCap, DEFAULT_CREATION_RULES.creationSkillCap, 0, 5)
        : integer(state.creationCap, 2, 0, 5);
    if (target > cap)
        throw new Error(`${id} cannot be raised above rank ${cap} during character creation.`);
    if (target <= current)
        throw new Error("Skill purchases must increase the current rank.");
    const cost = skillPurchaseCost(current, target, Boolean(state.career), draft.rules);
    if (cost > draftAvailableXp(draft))
        throw new Error(`Not enough XP. Need ${cost}, have ${draftAvailableXp(draft)}.`);
    state.rank = target;
    draft.xpSpent += cost;
    draft.xpLedger.push({ id: `xp:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`, kind: "skill", targetId: id, from: current, to: target, career: Boolean(state.career), cost, createdAt: Date.now() });
    draft.updatedAt = Date.now();
    return draft;
}

export function addDraftTalentPurchase(draftInput, talent = {}) {
    const draft = clone(draftInput);
    const effectiveTier = integer(talent.effectiveTier ?? talent.tier, 1, 1, 5);
    const cost = talentPurchaseCost(effectiveTier, draft.rules);
    if (cost > draftAvailableXp(draft))
        throw new Error(`Not enough XP. Need ${cost}, have ${draftAvailableXp(draft)}.`);
    const purchase = {
        id: text(talent.id, `talent:${Date.now()}`),
        label: text(talent.label ?? talent.name, "Talent"),
        tier: integer(talent.tier, effectiveTier, 1, 5),
        effectiveTier,
        ranked: Boolean(talent.ranked),
        rank: integer(talent.rank, 1, 1),
        sourceId: text(talent.sourceId, "custom")
    };
    draft.talents.push(purchase);
    draft.xpSpent += cost;
    draft.xpLedger.push({ id: `xp:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`, kind: "talent", targetId: purchase.id, effectiveTier, cost, createdAt: Date.now() });
    draft.updatedAt = Date.now();
    return draft;
}

export function validateCharacterDraft(draftInput, { career = null } = {}) {
    const draft = clone(draftInput);
    const errors = [];
    const warnings = [];
    if (!draft.archetypeId)
        errors.push("Choose an archetype/species.");
    if (!draft.careerId)
        errors.push("Choose a career.");
    if (career) {
        const normalizedCareer = normalizeCareerDefinition(career);
        if (draft.freeCareerSkills.length !== normalizedCareer.freeSkillChoices)
            errors.push(`Choose ${normalizedCareer.freeSkillChoices} free career skills.`);
    }
    if (integer(draft.xpSpent, 0) > integer(draft.startingXp, 0))
        errors.push("XP spent exceeds starting XP.");
    if (draftAvailableXp(draft) > 0)
        warnings.push(`${draftAvailableXp(draft)} starting XP remains unspent.`);
    for (const [skillId, state] of Object.entries(draft.skills ?? {})) {
        const cap = state.creationCap === null || state.creationCap === undefined
            ? integer(draft.rules?.creationSkillCap, 2, 0, 5)
            : integer(state.creationCap, 2, 0, 5);
        if (integer(state.rank, 0) > cap)
            errors.push(`${skillId} exceeds the character-creation rank cap of ${cap}.`);
    }
    return { valid: errors.length === 0, errors, warnings, availableXp: draftAvailableXp(draft) };
}

export function draftActorUpdate(draftInput) {
    const draft = clone(draftInput);
    const skills = Object.entries(draft.skills ?? {}).map(([id, state]) => ({
        id,
        rank: integer(state.rank, 0, 0, 5),
        career: Boolean(state.career),
        characteristicOverride: "",
        sourceId: text(state.sourceId, state.source === "archetype" ? draft.archetypeId : draft.careerId || "creation")
    }));
    return {
        "system.profile.archetype": draft.archetypeId,
        "system.profile.career": draft.careerId,
        "system.profile.motivation": [draft.motivation?.strength, draft.motivation?.flaw, draft.motivation?.desire, draft.motivation?.fear].filter(Boolean).join(" · "),
        "system.characteristics": clone(draft.characteristics),
        "system.xp.starting": integer(draft.startingXp, 0),
        "system.xp.spent": integer(draft.xpSpent, 0),
        "system.skills": skills,
        "system.wounds.threshold": integer(draft.derived?.wounds, 10),
        "system.strain.threshold": integer(draft.derived?.strain, 10),
        "system.soak": integer(draft.derived?.soak, 2),
        "system.defense.melee": integer(draft.derived?.meleeDefense, 0),
        "system.defense.ranged": integer(draft.derived?.rangedDefense, 0),
        "system.silhouette": integer(draft.derived?.silhouette, 1, 0, 10)
    };
}

export async function saveActorCharacterCreationDraft(actor, draft) {
    if (!actor?.setFlag)
        throw new Error("Actor is required.");
    const normalized = { ...clone(draft), updatedAt: Date.now() };
    await actor.setFlag(SYSTEM_ID, DRAFT_FLAG, normalized);
    return normalized;
}

export function getActorCharacterCreationDraft(actor) {
    return clone(actor?.getFlag?.(SYSTEM_ID, DRAFT_FLAG) ?? null);
}

export async function clearActorCharacterCreationDraft(actor) {
    if (actor?.unsetFlag)
        await actor.unsetFlag(SYSTEM_ID, DRAFT_FLAG);
}

export async function finalizeCharacterDraft(actor, draft, options = {}) {
    const validation = validateCharacterDraft(draft, options);
    if (!validation.valid)
        throw new Error(validation.errors.join(" "));
    await actor.update(draftActorUpdate(draft));
    await saveActorCharacterCreationDraft(actor, { ...clone(draft), status: "complete", completedAt: Date.now() });
    Hooks.callAll("genesysCharacterCreationFinalized", actor, clone(draft));
    return { actor, draft: clone(draft), validation };
}

function exposeCreationApi() {
    Object.defineProperty(game, "genesysCreation", {
        configurable: true,
        value: Object.freeze({
            rules: DEFAULT_CREATION_RULES,
            characteristicIds: CHARACTERISTIC_IDS,
            normalizeRules: normalizeCreationRules,
            normalizeArchetype: normalizeArchetypeDefinition,
            normalizeCareer: normalizeCareerDefinition,
            createDraft: createCharacterDraft,
            selectArchetype: selectDraftArchetype,
            selectCareer: selectDraftCareer,
            chooseFreeCareerSkills,
            purchaseCharacteristic: purchaseDraftCharacteristic,
            purchaseSkill: purchaseDraftSkill,
            purchaseTalent: addDraftTalentPurchase,
            characteristicCost: characteristicPurchaseCost,
            skillCost: skillPurchaseCost,
            talentCost: talentPurchaseCost,
            availableXp: draftAvailableXp,
            validate: validateCharacterDraft,
            actorUpdate: draftActorUpdate,
            saveDraft: saveActorCharacterCreationDraft,
            getDraft: getActorCharacterCreationDraft,
            clearDraft: clearActorCharacterCreationDraft,
            finalize: finalizeCharacterDraft
        })
    });
}

Hooks.once("ready", exposeCreationApi);
