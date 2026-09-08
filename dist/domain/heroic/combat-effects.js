export function heroicWeaponDamageBonus(state) {
    return state?.active === true && state.secondaryEffectIds?.includes("rot-heroic-secondary:devastating") ? 2 : 0;
}

export function heroicCheckModifiers(state) {
    return state?.active === true && state.secondaryEffectIds?.includes("rot-heroic-secondary:empowered")
        ? [{id:"heroic:empowered",priority:10,pool:{add:{boost:1}}}] : [];
}
