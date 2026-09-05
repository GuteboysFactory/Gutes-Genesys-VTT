function clone(value) {
    if (value === undefined)
        return undefined;
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function integer(value, fallback = 0) {
    const number = Number(value ?? fallback);
    return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : fallback;
}

function creationLedger(draft = {}) {
    let runningSpent = 0;
    return (Array.isArray(draft.xpLedger) ? draft.xpLedger : []).map((row, index) => {
        const cost = integer(row?.cost, 0);
        const before = runningSpent;
        runningSpent += cost;
        return {
            id: String(row?.id ?? `xp:creation:${index + 1}`),
            kind: String(row?.kind ?? "creation"),
            bucket: "spent",
            amount: cost,
            label: String(row?.label ?? `${row?.kind ?? "Creation"}: ${row?.targetId ?? "purchase"}`),
            targetType: String(row?.kind ?? "creation"),
            targetId: String(row?.targetId ?? ""),
            sourceId: String(row?.sourceId ?? "character-creation"),
            ruleId: String(row?.ruleId ?? `core:creation-${row?.kind ?? "purchase"}`),
            before,
            after: runningSpent,
            createdAt: integer(row?.createdAt, Date.now()),
            createdBy: String(game?.user?.id ?? "")
        };
    });
}

Hooks.once("ready", () => {
    const base = game?.genesysCreation;
    if (!base)
        return;

    const actorUpdate = (draftInput) => {
        const draft = clone(draftInput);
        const update = base.actorUpdate(draft);
        update["system.xp.starting"] = integer(draft.startingXp, 0);
        update["system.xp.earned"] = 0;
        update["system.xp.spent"] = integer(draft.xpSpent, 0);
        update["system.xp.ledger"] = creationLedger(draft);
        return update;
    };

    const finalize = async (actor, draftInput, options = {}) => {
        const draft = clone(draftInput);
        const validation = base.validate(draft, options);
        if (!validation.valid)
            throw new Error(validation.errors.join(" "));
        await actor.update(actorUpdate(draft));
        if (game?.genesysEquipment?.replaceCharacterCreationEquipment && draft.startingGearResolution)
            await game.genesysEquipment.replaceCharacterCreationEquipment(actor, draft.startingGearResolution);
        await base.saveDraft(actor, { ...clone(draft), status: "complete", completedAt: Date.now() });
        Hooks.callAll("genesysCharacterCreationFinalized", actor, clone(draft));
        return { actor, draft: clone(draft), validation };
    };

    Object.defineProperty(game, "genesysCreation", {
        configurable: true,
        value: Object.freeze({
            ...base,
            actorUpdate,
            finalize,
            xpLedgerForDraft: creationLedger
        })
    });
});
