function clone(value) {
    if (value === undefined)
        return undefined;
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function n(value, fallback = 0) {
    const number = Number(value ?? fallback);
    return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : fallback;
}

function recalcDerived(draft) {
    const archetype = draft?.archetypeSnapshot ?? null;
    if (!archetype)
        return draft;
    const c = draft.characteristics ?? {};
    const woundCharacteristic = String(archetype.wounds?.characteristicId ?? "brawn");
    const strainCharacteristic = String(archetype.strain?.characteristicId ?? "willpower");
    draft.derived = {
        wounds: n(archetype.wounds?.base, 10) + n(c[woundCharacteristic], 0),
        strain: n(archetype.strain?.base, 10) + n(c[strainCharacteristic], 0),
        soak: n(c.brawn, 2),
        meleeDefense: n(archetype.defense?.melee, 0),
        rangedDefense: n(archetype.defense?.ranged, 0),
        silhouette: n(archetype.silhouette, 1)
    };
    return draft;
}

Hooks.once("ready", () => {
    const base = game?.genesysCreation;
    if (!base)
        return;

    const selectArchetype = (draft, archetype) => {
        const next = base.selectArchetype(draft, archetype);
        next.archetypeSnapshot = clone(base.normalizeArchetype(archetype));
        return recalcDerived(next);
    };

    const purchaseCharacteristic = (draft, characteristicId, targetRating) => {
        const next = base.purchaseCharacteristic(draft, characteristicId, targetRating);
        if (!next.archetypeSnapshot && draft?.archetypeSnapshot)
            next.archetypeSnapshot = clone(draft.archetypeSnapshot);
        return recalcDerived(next);
    };

    Object.defineProperty(game, "genesysCreation", {
        configurable: true,
        value: Object.freeze({
            ...base,
            selectArchetype,
            purchaseCharacteristic,
            recalcDerived
        })
    });
});
