function count(value, label) {
    const number = Number(value ?? 0);
    if (!Number.isInteger(number) || number < 0)
        throw new RangeError(`${label} must be a non-negative integer.`);
    return number;
}
export function normalizeStoryPointState(state) {
    return {
        player: count(state?.player, "Player Story Points"),
        gm: count(state?.gm, "GM Story Points")
    };
}
export function prepareStoryPointTransaction(state, spend = {}, limits = {}) {
    const before = normalizeStoryPointState(state);
    const normalizedSpend = {
        player: count(spend.player, "Player Story Point spend"),
        gm: count(spend.gm, "GM Story Point spend")
    };
    const maxPlayerSpend = limits.maxPlayerSpend === undefined ? Number.POSITIVE_INFINITY : count(limits.maxPlayerSpend, "Maximum player spend");
    const maxGmSpend = limits.maxGmSpend === undefined ? Number.POSITIVE_INFINITY : count(limits.maxGmSpend, "Maximum GM spend");
    if (normalizedSpend.player > maxPlayerSpend)
        throw new RangeError(`Player Story Point spend exceeds limit ${maxPlayerSpend}.`);
    if (normalizedSpend.gm > maxGmSpend)
        throw new RangeError(`GM Story Point spend exceeds limit ${maxGmSpend}.`);
    if (normalizedSpend.player > before.player)
        throw new RangeError("Not enough player Story Points.");
    if (normalizedSpend.gm > before.gm)
        throw new RangeError("Not enough GM Story Points.");
    return {
        before,
        spend: normalizedSpend,
        // Transfer is simultaneous and intentionally represented as a pending transaction.
        after: {
            player: before.player - normalizedSpend.player + normalizedSpend.gm,
            gm: before.gm - normalizedSpend.gm + normalizedSpend.player
        }
    };
}
//# sourceMappingURL=story-points.js.map