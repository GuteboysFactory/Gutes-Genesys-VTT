function clone(value) {
    if (value === undefined)
        return undefined;
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function text(value) {
    return String(value ?? "").trim();
}

function magicRulesFor(draft) {
    const settingId = text(draft?.settingId);
    return settingId ? (game?.genesysContent?.getMagicRules?.(settingId) ?? {}) : {};
}

function talentAccessFor(rules, talent) {
    const byId = rules?.accessSources?.talents ?? {};
    const id = text(talent?.id ?? talent?.sourceId);
    return Array.isArray(byId[id]) ? byId[id] : [];
}

function ensureSkillState(draft, skillId) {
    draft.skills ??= {};
    draft.skills[skillId] ??= { rank: 0, career: false, source: "creation" };
    return draft.skills[skillId];
}

function applyAccessGrant(draft, grant, sourceId) {
    const skillId = text(grant?.skillId);
    if (!skillId)
        return;
    const state = ensureSkillState(draft, skillId);
    if (grant.career)
        state.career = true;
    if (Number.isFinite(Number(grant.startingRank)))
        state.rank = Math.max(Number(state.rank ?? 0), Math.max(0, Math.trunc(Number(grant.startingRank))));
    draft.magic ??= {};
    draft.magic.grants ??= {};
    draft.magic.grants[skillId] ??= [];
    const record = { ...clone(grant), sourceId: text(sourceId) };
    const key = JSON.stringify(record);
    if (!draft.magic.grants[skillId].some((entry) => JSON.stringify(entry) === key))
        draft.magic.grants[skillId].push(record);
}

function refreshMagicState(draftInput) {
    const draft = clone(draftInput);
    const rules = magicRulesFor(draft);
    const magicSkillIds = Array.isArray(rules.magicSkillIds) ? rules.magicSkillIds.map(String) : [];
    const minimumRank = Math.max(1, Math.trunc(Number(rules.minimumRankToCast ?? 1) || 1));
    draft.magic ??= {};
    for (const [skillId, grants] of Object.entries(draft.magic.grants ?? {})) {
        const state = ensureSkillState(draft, skillId);
        for (const grant of Array.isArray(grants) ? grants : []) {
            if (grant?.career)
                state.career = true;
            if (Number.isFinite(Number(grant?.startingRank)))
                state.rank = Math.max(Number(state.rank ?? 0), Math.max(0, Math.trunc(Number(grant.startingRank))));
        }
    }
    draft.magic.settingId = text(draft.settingId);
    draft.magic.purchasePolicy = text(rules.purchasePolicy);
    draft.magic.knowledgeSkillForSpellEffects = text(rules.knowledgeSkillForSpellEffects);
    draft.magic.access = {};
    for (const skillId of magicSkillIds) {
        const state = draft.skills?.[skillId] ?? { rank: 0, career: false };
        const grants = Array.isArray(draft.magic.grants?.[skillId]) ? draft.magic.grants[skillId] : [];
        const spellLimit = grants.reduce((value, grant) => {
            const limit = Number(grant?.spellLimitPerEncounter);
            return Number.isFinite(limit) && limit > 0 ? Math.min(value, Math.trunc(limit)) : value;
        }, Number.POSITIVE_INFINITY);
        const actions = Object.entries(rules.actions ?? {})
            .filter(([, skillIds]) => Array.isArray(skillIds) && skillIds.includes(skillId))
            .map(([actionId]) => actionId);
        draft.magic.access[skillId] = {
            rank: Math.max(0, Math.trunc(Number(state.rank ?? 0) || 0)),
            career: Boolean(state.career),
            canPurchase: rules.purchasePolicy !== "career-only" || Boolean(state.career),
            canCast: Boolean(state.career) && Math.max(0, Math.trunc(Number(state.rank ?? 0) || 0)) >= minimumRank,
            actions,
            spellLimitPerEncounter: Number.isFinite(spellLimit) ? spellLimit : null,
            ...(rules.skillRules?.[skillId] ?? {})
        };
    }
    return draft;
}

function validateMagicDraft(draftInput) {
    const draft = refreshMagicState(draftInput);
    const errors = [];
    const warnings = [];
    for (const [skillId, access] of Object.entries(draft.magic?.access ?? {})) {
        if (access.rank > 0 && draft.magic.purchasePolicy === "career-only" && !access.career)
            errors.push(`${skillId} is a magic skill and cannot be purchased as a non-career skill in this setting.`);
    }
    return { draft, errors, warnings };
}

Hooks.once("ready", () => {
    const base = game?.genesysCreation;
    if (!base)
        return;

    const createDraft = (options = {}) => refreshMagicState(base.createDraft(options));
    const selectArchetype = (draft, archetype) => refreshMagicState(base.selectArchetype(draft, archetype));
    const selectCareer = (draft, career) => refreshMagicState(base.selectCareer(draft, career));
    const chooseFreeCareerSkills = (draft, career, skillIds) => refreshMagicState(base.chooseFreeCareerSkills(draft, career, skillIds));
    const purchaseCharacteristic = (draft, characteristicId, targetRating) => refreshMagicState(base.purchaseCharacteristic(draft, characteristicId, targetRating));

    const purchaseSkill = (draft, skillId, targetRank) => {
        const prepared = refreshMagicState(draft);
        const access = prepared.magic?.access?.[text(skillId)];
        if (access && prepared.magic.purchasePolicy === "career-only" && !access.career)
            throw new Error(`${skillId} is a magic skill and may only be purchased as a career skill in Realms of Terrinoth.`);
        return refreshMagicState(base.purchaseSkill(prepared, skillId, targetRank));
    };

    const purchaseTalent = (draft, talent = {}) => {
        let next = base.purchaseTalent(draft, talent);
        const rules = magicRulesFor(next);
        for (const grant of talentAccessFor(rules, talent))
            applyAccessGrant(next, grant, talent.id ?? talent.sourceId);
        return refreshMagicState(next);
    };

    const validate = (draft, options = {}) => {
        const core = base.validate(draft, options);
        const magic = validateMagicDraft(draft);
        const errors = [...core.errors, ...magic.errors];
        const warnings = [...core.warnings, ...magic.warnings];
        return { ...core, valid: errors.length === 0, errors, warnings, magic: clone(magic.draft.magic) };
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
            validate,
            magicRules: magicRulesFor,
            refreshMagic: refreshMagicState,
            validateMagic: validateMagicDraft
        })
    });
});
