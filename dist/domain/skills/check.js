import { constructStandardPool } from "../pool/index.js";
import { CHARACTERISTIC_IDS } from "./types.js";
function isCharacteristicId(value) {
    return CHARACTERISTIC_IDS.includes(value);
}
export function prepareSkillCheck(input) {
    const stateOverride = input.state.characteristicOverride;
    const characteristicId = input.characteristicOverride
        ?? (isCharacteristicId(stateOverride) ? stateOverride : input.definition.characteristic);
    const characteristicValue = Number(input.characteristics[characteristicId] ?? 0);
    const skillRank = Number(input.state.rank ?? 0);
    const difficulty = Number(input.difficulty ?? 0);
    const construction = constructStandardPool({
        characteristic: characteristicValue,
        skillRank,
        difficulty,
        modifiers: input.modifiers
    });
    return {
        skillId: input.definition.id,
        skillLabel: input.definition.label,
        characteristicId,
        characteristicValue,
        skillRank,
        career: Boolean(input.state.career),
        difficulty,
        construction
    };
}
//# sourceMappingURL=check.js.map