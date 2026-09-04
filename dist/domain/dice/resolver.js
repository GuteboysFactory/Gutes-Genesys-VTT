export function emptySymbolCounts() {
    return {
        success: 0,
        failure: 0,
        advantage: 0,
        threat: 0,
        triumph: 0,
        despair: 0
    };
}
export function resolveRolledDice(dice) {
    const raw = emptySymbolCounts();
    for (const die of dice) {
        for (const [symbol, count] of Object.entries(die.symbols)) {
            raw[symbol] += count;
        }
    }
    // Triumph contributes one Success; Despair contributes one Failure.
    // The special symbols themselves never cancel one another.
    raw.success += raw.triumph;
    raw.failure += raw.despair;
    const successMargin = raw.success - raw.failure;
    const advantageMargin = raw.advantage - raw.threat;
    return {
        raw,
        net: {
            success: Math.max(0, successMargin),
            failure: Math.max(0, -successMargin),
            advantage: Math.max(0, advantageMargin),
            threat: Math.max(0, -advantageMargin),
            triumph: raw.triumph,
            despair: raw.despair
        },
        successMargin,
        advantageMargin,
        succeeded: successMargin > 0
    };
}
//# sourceMappingURL=resolver.js.map