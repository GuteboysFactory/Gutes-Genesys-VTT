function clone(value) {
    if (value === undefined) return undefined;
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function text(value) {
    return String(value ?? "").trim();
}

function currencyFor(draft) {
    return game?.genesysContent?.getCurrency?.(text(draft?.settingId)) ?? { label: "Funds", denominations: [] };
}

function catalogFor(draft) {
    return game?.genesysEquipment?.listDefinitions?.(text(draft?.settingId)) ?? [];
}

function primaryGearPackage(draft) {
    return Array.isArray(draft?.careerStartingGear) && draft.careerStartingGear.length ? draft.careerStartingGear[0] : null;
}

function refreshEquipmentState(draftInput) {
    const draft = clone(draftInput);
    draft.startingGearSelections ??= {};
    draft.startingFundsRoll ??= null;
    draft.wallet = { ...game.genesysEquipment.normalizeWallet(draft.wallet ?? {}, currencyFor(draft)) };
    const pack = primaryGearPackage(draft);
    draft.startingGearResolution = pack
        ? game.genesysEquipment.resolveStartingGearPackage(pack, draft.startingGearSelections, catalogFor(draft))
        : { items: [], unresolvedChoices: [], unresolvedItems: [], funds: null, valid: true };
    draft.equipment = (draft.startingGearResolution.items ?? []).map((row) => ({ id: row.id, quantity: row.quantity }));
    return draft;
}

Hooks.once("ready", () => {
    const base = game?.genesysCreation;
    if (!base || !game?.genesysEquipment) return;

    const createDraft = (options = {}) => refreshEquipmentState(base.createDraft(options));
    const selectArchetype = (draft, archetype) => refreshEquipmentState(base.selectArchetype(draft, archetype));
    const selectCareer = (draft, career) => {
        const next = base.selectCareer(draft, career);
        next.startingGearSelections = {};
        next.startingFundsRoll = null;
        next.wallet = { ...game.genesysEquipment.normalizeWallet({}, currencyFor(next)) };
        return refreshEquipmentState(next);
    };
    const chooseFreeCareerSkills = (draft, career, skillIds) => refreshEquipmentState(base.chooseFreeCareerSkills(draft, career, skillIds));
    const purchaseCharacteristic = (draft, id, rating) => refreshEquipmentState(base.purchaseCharacteristic(draft, id, rating));
    const purchaseSkill = (draft, id, rank) => refreshEquipmentState(base.purchaseSkill(draft, id, rank));
    const purchaseTalent = (draft, talent) => refreshEquipmentState(base.purchaseTalent(draft, talent));
    const setMotivation = base.setMotivation ? (draft, patch) => refreshEquipmentState(base.setMotivation(draft, patch)) : undefined;
    const selectHeroicAbility = base.selectHeroicAbility ? (draft, definition, options) => refreshEquipmentState(base.selectHeroicAbility(draft, definition, options)) : undefined;
    const purchaseHeroicUpgrade = base.purchaseHeroicUpgrade ? (draft, upgrade) => refreshEquipmentState(base.purchaseHeroicUpgrade(draft, upgrade)) : undefined;

    const setStartingGearChoice = (draftInput, groupId, optionIndex) => {
        const draft = refreshEquipmentState(draftInput);
        draft.startingGearSelections[text(groupId)] = Number(optionIndex);
        draft.updatedAt = Date.now();
        return refreshEquipmentState(draft);
    };

    const rollStartingFunds = (draftInput, rng = Math.random) => {
        const draft = refreshEquipmentState(draftInput);
        const funds = draft.startingGearResolution?.funds;
        if (!funds?.formula) return draft;
        const roll = game.genesysEquipment.rollFundsFormula(funds.formula, rng);
        const currency = currencyFor(draft);
        const denomination = (currency.denominations ?? []).find((row) => row.id === funds.denomination) ?? currency.denominations?.[0] ?? {};
        draft.startingFundsRoll = clone(roll);
        draft.wallet = {
            label: currency.label ?? "Funds",
            value: roll.total,
            denominationId: denomination.id ?? funds.denomination ?? "",
            abbreviation: denomination.abbreviation ?? ""
        };
        draft.updatedAt = Date.now();
        return draft;
    };

    const validate = (draftInput, options = {}) => {
        const draft = refreshEquipmentState(draftInput);
        const core = base.validate(draft, options);
        const errors = [...core.errors];
        const warnings = [...core.warnings];
        for (const choice of draft.startingGearResolution?.unresolvedChoices ?? []) errors.push(`Choose starting gear for ${choice.label}.`);
        for (const item of draft.startingGearResolution?.unresolvedItems ?? []) errors.push(`Starting equipment '${item.id}' is not registered for this setting.`);
        if (draft.startingGearResolution?.funds?.formula && !draft.startingFundsRoll) warnings.push("Starting funds have not been rolled yet.");
        return { ...core, valid: errors.length === 0, errors, warnings, equipment: clone(draft.equipment), wallet: clone(draft.wallet) };
    };

    const actorUpdate = (draftInput) => {
        const draft = refreshEquipmentState(draftInput);
        const update = base.actorUpdate(draft);
        update["system.currency.value"] = Math.max(0, Math.trunc(Number(draft.wallet?.value ?? 0) || 0));
        update["system.currency.label"] = text(draft.wallet?.label) || "Funds";
        return update;
    };

    const finalize = async (actor, draftInput, options = {}) => {
        const draft = refreshEquipmentState(draftInput);
        const validation = validate(draft, options);
        if (!validation.valid) throw new Error(validation.errors.join(" "));
        await actor.update(actorUpdate(draft));
        await game.genesysEquipment.replaceCharacterCreationEquipment(actor, draft.startingGearResolution);
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
            ...(setMotivation ? { setMotivation } : {}),
            ...(selectHeroicAbility ? { selectHeroicAbility } : {}),
            ...(purchaseHeroicUpgrade ? { purchaseHeroicUpgrade } : {}),
            setStartingGearChoice,
            rollStartingFunds,
            refreshEquipment: refreshEquipmentState,
            validate,
            actorUpdate,
            finalize
        })
    });
});
