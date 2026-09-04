import { DIE_TYPES, emptyDicePool, normalizeDicePool } from "../dice/index.js";
function validateCount(value, label) {
    if (!Number.isInteger(value) || value < 0) {
        throw new RangeError(`${label} must be a non-negative integer.`);
    }
    return value;
}
function clonePool(pool) {
    return { ...pool };
}
export function buildSkillPool(characteristic, skillRank) {
    validateCount(characteristic, "Characteristic rating");
    validateCount(skillRank, "Skill rank");
    const higher = Math.max(characteristic, skillRank);
    const lower = Math.min(characteristic, skillRank);
    const pool = emptyDicePool();
    pool.proficiency = lower;
    pool.ability = higher - lower;
    return pool;
}
export function buildStandardBasePool(characteristic, skillRank, difficulty = 0) {
    validateCount(difficulty, "Difficulty");
    const pool = buildSkillPool(characteristic, skillRank);
    pool.difficulty = difficulty;
    return pool;
}
export function addDice(input, additions = {}) {
    const pool = clonePool(input);
    const normalized = normalizeDicePool(additions);
    for (const type of DIE_TYPES)
        pool[type] += normalized[type];
    return pool;
}
export function upgradePositive(input, amount = 1) {
    validateCount(amount, "Positive upgrades");
    const pool = clonePool(input);
    for (let i = 0; i < amount; i += 1) {
        if (pool.ability > 0) {
            pool.ability -= 1;
            pool.proficiency += 1;
        }
        else {
            pool.ability += 1;
        }
    }
    return pool;
}
export function upgradeNegative(input, amount = 1) {
    validateCount(amount, "Negative upgrades");
    const pool = clonePool(input);
    for (let i = 0; i < amount; i += 1) {
        if (pool.difficulty > 0) {
            pool.difficulty -= 1;
            pool.challenge += 1;
        }
        else {
            pool.difficulty += 1;
        }
    }
    return pool;
}
export function downgradePositive(input, amount = 1) {
    validateCount(amount, "Positive downgrades");
    const pool = clonePool(input);
    const applied = Math.min(amount, pool.proficiency);
    pool.proficiency -= applied;
    pool.ability += applied;
    return pool;
}
export function downgradeNegative(input, amount = 1) {
    validateCount(amount, "Negative downgrades");
    const pool = clonePool(input);
    const applied = Math.min(amount, pool.challenge);
    pool.challenge -= applied;
    pool.difficulty += applied;
    return pool;
}
export function removeDice(input, removals = {}) {
    const pool = clonePool(input);
    const normalized = normalizeDicePool(removals);
    for (const type of DIE_TYPES)
        pool[type] = Math.max(0, pool[type] - normalized[type]);
    return pool;
}
export function applyPoolModifiers(basePool, modifiers = {}) {
    const base = normalizeDicePool(basePool);
    // Core order: basic pool -> add dice -> all upgrades -> all downgrades -> removals.
    const afterAdditions = addDice(base, modifiers.add);
    const afterPositiveUpgrades = upgradePositive(afterAdditions, modifiers.upgradePositive ?? 0);
    const afterUpgrades = upgradeNegative(afterPositiveUpgrades, modifiers.upgradeNegative ?? 0);
    const afterPositiveDowngrades = downgradePositive(afterUpgrades, modifiers.downgradePositive ?? 0);
    const afterDowngrades = downgradeNegative(afterPositiveDowngrades, modifiers.downgradeNegative ?? 0);
    const afterRemovals = removeDice(afterDowngrades, modifiers.remove);
    return {
        pool: afterRemovals,
        trace: {
            base,
            afterAdditions,
            afterUpgrades,
            afterDowngrades,
            afterRemovals
        }
    };
}
export function constructStandardPool(input) {
    const base = buildStandardBasePool(input.characteristic, input.skillRank, input.difficulty ?? 0);
    return applyPoolModifiers(base, input.modifiers);
}
//# sourceMappingURL=pool.js.map