import { DIE_FACES } from "./faces.js";
import { resolveRolledDice } from "./resolver.js";
import { DIE_TYPES } from "./types.js";
export function emptyDicePool() {
    return {
        boost: 0,
        ability: 0,
        proficiency: 0,
        setback: 0,
        difficulty: 0,
        challenge: 0
    };
}
export function normalizeDicePool(input) {
    const pool = emptyDicePool();
    for (const dieType of DIE_TYPES) {
        const value = input[dieType] ?? 0;
        if (!Number.isInteger(value) || value < 0) {
            throw new RangeError(`Dice count for ${dieType} must be a non-negative integer.`);
        }
        pool[dieType] = value;
    }
    return pool;
}
export function rollDie(type, random = Math.random) {
    const faces = DIE_FACES[type];
    const sample = random();
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
        throw new RangeError("Random source must return a finite number in the range [0, 1).");
    }
    const faceIndex = Math.floor(sample * faces.length);
    const selected = faces[faceIndex];
    return {
        type,
        faceIndex,
        symbols: { ...selected.symbols }
    };
}
export function rollNarrativePool(input, random = Math.random) {
    const pool = normalizeDicePool(input);
    const dice = [];
    for (const dieType of DIE_TYPES) {
        for (let index = 0; index < pool[dieType]; index += 1) {
            dice.push(rollDie(dieType, random));
        }
    }
    return {
        pool,
        dice,
        ...resolveRolledDice(dice)
    };
}
//# sourceMappingURL=roller.js.map