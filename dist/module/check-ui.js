import { rollNarrativePool } from "../domain/dice/index.js";
import { prepareAssistedCheck, prepareOpposedCheck, prepareStandardCheck } from "../domain/checks/index.js";
import { formatPool, resultToChatHtml } from "./dice-ui.js";
import { poolTraceToHtml } from "./pool-ui.js";
import { prepareActorSkillCheck } from "./skill-ui.js";
import { getActorConditionCheckModifiers } from "./condition-service.js";
function capitalize(value) {
    return value.length ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
function kindLabel(kind) {
    switch (kind) {
        case "opposed": return "Opposed";
        case "assisted": return "Assisted";
        case "competitive": return "Competitive";
        default: return "Standard";
    }
}
export function prepareActorSkillEngineCheck(actor, skillId, options = {}) {
    const skill = prepareActorSkillCheck(actor, skillId, 0, options.rankOverride);
    const ratings = {
        characteristic: skill.characteristicValue,
        skillRank: skill.skillRank,
        label: skill.skillLabel
    };
    const mode = options.mode ?? "standard";
    const conditionModifiers = getActorConditionCheckModifiers(actor);
    let check;
    if (mode === "opposed") {
        check = prepareOpposedCheck({
            actor: ratings,
            opponent: {
                characteristic: Number(options.opponentCharacteristic ?? 2),
                skillRank: Number(options.opponentSkillRank ?? 2),
                label: "Opponent"
            },
            modifiers: conditionModifiers
        });
    }
    else if (mode === "assisted") {
        check = prepareAssistedCheck({
            actor: ratings,
            assistant: {
                characteristic: Number(options.assistantCharacteristic ?? 2),
                skillRank: Number(options.assistantSkillRank ?? 2),
                label: "Assistant"
            },
            difficulty: Number(options.difficulty ?? 2),
            extraHelpers: Number(options.extraHelpers ?? 0),
            modifiers: conditionModifiers
        });
    }
    else {
        check = prepareStandardCheck({
            actor: ratings,
            difficulty: Number(options.difficulty ?? 2),
            modifiers: conditionModifiers
        });
    }
    return {
        skillId: skill.skillId,
        skillLabel: skill.skillLabel,
        characteristicLabel: capitalize(skill.characteristicId),
        check
    };
}
export async function rollPreparedActorCheckToChat(prepared, speakerAlias) {
    const result = rollNarrativePool(prepared.check.construction.pool);
    const assistance = prepared.check.kind === "assisted"
        ? ` · ${prepared.check.assistanceMode === "skilled" ? "Skilled assistance" : "Unskilled assistance"}`
        : "";
    const opponent = prepared.check.kind === "opposed" && prepared.check.opponent
        ? ` · Opponent ${prepared.check.opponent.characteristic}/${prepared.check.opponent.skillRank}`
        : "";
    const content = `
    <section class="genesys-constructed-check genesys-skill-check genesys-check-engine-roll">
      <p><strong>${prepared.skillLabel}</strong> · ${prepared.characteristicLabel} ${prepared.check.actor.characteristic} + Rank ${prepared.check.actor.skillRank}</p>
      <p><strong>${kindLabel(prepared.check.kind)}</strong>${assistance}${opponent}</p>
      <p class="genesys-check-pool"><strong>Pool:</strong> ${formatPool(prepared.check.construction.pool)}</p>
      ${poolTraceToHtml(prepared.check.construction)}
      ${resultToChatHtml(result)}
    </section>`;
    const data = { content };
    if (speakerAlias)
        data.speaker = { alias: speakerAlias };
    await foundry.documents.ChatMessage.create(data);
    return { prepared, result };
}
//# sourceMappingURL=check-ui.js.map