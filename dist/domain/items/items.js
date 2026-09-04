import { prepareStandardCheck } from "../checks/index.js";
import { normalizeQualityStates, qualityCheckModifiers } from "./qualities.js";
function nonNegativeInteger(value, fallback = 0) {
    const n = Number(value ?? fallback);
    if (!Number.isFinite(n))
        return fallback;
    return Math.max(0, Math.trunc(n));
}
export function normalizeWeaponRuleData(input = {}) {
    const allowedRanges = new Set(["engaged", "short", "medium", "long", "extreme"]);
    const range = allowedRanges.has(String(input.range)) ? input.range : "engaged";
    return {
        skillId: String(input.skillId ?? "melee").trim() || "melee",
        attackMode: ["auto", "melee", "ranged"].includes(input.attackMode) ? input.attackMode : "auto",
        engagedProfile: ["auto", "none", "one-handed", "two-handed", "heavy"].includes(input.engagedProfile) ? input.engagedProfile : "auto",
        damageCharacteristic: ["auto", "none", "brawn", "agility", "intellect", "cunning", "willpower", "presence"].includes(input.damageCharacteristic) ? input.damageCharacteristic : "auto",
        damage: nonNegativeInteger(input.damage),
        critical: nonNegativeInteger(input.critical),
        range,
        encumbrance: nonNegativeInteger(input.encumbrance),
        hardPoints: nonNegativeInteger(input.hardPoints),
        price: nonNegativeInteger(input.price),
        rarity: Math.min(10, nonNegativeInteger(input.rarity)),
        equipped: input.equipped !== false,
        qualities: normalizeQualityStates(input.qualities ?? []),
        provenance: input.provenance ?? { sourceId: "custom", sourceType: "custom" }
    };
}
export function prepareWeaponAttack(input) {
    const weapon = normalizeWeaponRuleData(input.weapon);
    const qualityModifiers = qualityCheckModifiers(weapon.qualities);
    const check = prepareStandardCheck({
        actor: input.actor,
        difficulty: input.difficulty,
        context: { tags: ["attack", "weapon", `skill:${weapon.skillId}`, `range:${weapon.range}`, ...(input.contextTags ?? [])] },
        modifiers: [...qualityModifiers, ...(input.modifiers ?? [])]
    });
    return {
        weaponName: String(input.weaponName ?? "Weapon"),
        weapon,
        check,
        qualityModifierIds: qualityModifiers.map((modifier) => modifier.id)
    };
}
//# sourceMappingURL=items.js.map