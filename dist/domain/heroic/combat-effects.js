export function heroicWeaponDamageBonus(state) {
    return state?.active === true && state.secondaryEffectIds?.includes("rot-heroic-secondary:devastating") ? 2 : 0;
}
