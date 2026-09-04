import { rollNarrativePool } from "../domain/dice/index.js";
import { prepareSkillCheck } from "../domain/skills/index.js";
import { formatPool, resultToChatHtml } from "./dice-ui.js";
import { poolTraceToHtml } from "./pool-ui.js";
import { buildSynchronizedSkillStates, getActiveSkillDefinitions } from "./skills-service.js";
import { minionSkillRank, normalizeMinionGroup } from "../domain/adversaries/index.js";
let transientCharacteristicOverride = null;
function capitalize(value) {
    return value.length ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
function actorRef(actor) {
    return String(actor?.uuid ?? actor?.id ?? actor?.name ?? "");
}
function getTransientCharacteristicOverride(actor, skillId) {
    const state = transientCharacteristicOverride;
    if (!state || state.skillId !== skillId)
        return undefined;
    const ref = actorRef(actor);
    if (state.actorRef && ref && state.actorRef !== ref)
        return undefined;
    return state.characteristicId;
}
export async function withActorCheckCharacteristicOverride(actor, skillId, characteristicId, callback) {
    if (!actor || !characteristicId)
        return callback();
    const previous = transientCharacteristicOverride;
    transientCharacteristicOverride = {
        actorRef: actorRef(actor),
        skillId,
        characteristicId: String(characteristicId)
    };
    try {
        return await callback();
    }
    finally {
        transientCharacteristicOverride = previous;
    }
}
export function findSkillState(actor, skillId) {
    return buildSynchronizedSkillStates(actor).find((entry) => entry?.id === skillId);
}
export function buildSkillSheetRows(actor) {
    const states = buildSynchronizedSkillStates(actor);
    const indexById = new Map(states.map((state, index) => [state.id, index]));
    const definitions = getActiveSkillDefinitions();
    const groups = { general: [], combat: [], knowledge: [], magic: [] };
    for (const definition of definitions) {
        const index = indexById.get(definition.id);
        if (typeof index !== "number")
            continue;
        const state = states[index];
        const characteristicId = state.characteristicOverride || definition.characteristic;
        const isMinion = actor?.system?.role === "minion";
        const minionState = isMinion ? normalizeMinionGroup({
            members: actor?.system?.minionGroup?.members ?? 1,
            memberWoundThreshold: actor?.system?.minionGroup?.memberWoundThreshold ?? 1,
            wounds: actor?.system?.wounds?.value ?? 0,
            casualties: actor?.system?.minionGroup?.casualties ?? 0,
            groupSkillIds: actor?.system?.minionGroup?.groupSkillIds ?? []
        }) : null;
        const groupSkill = Boolean(minionState?.groupSkillIds.includes(definition.id));
        const rank = isMinion && minionState
            ? minionSkillRank(minionState, definition.id)
            : Number(state.rank ?? 0);
        groups[definition.category].push({
            ...definition,
            index,
            rank,
            career: Boolean(state.career),
            characteristicId,
            characteristicLabel: capitalize(characteristicId),
            sourceId: state.sourceId || definition.provenance.sourceId,
            isMinion,
            groupSkill,
            minionMembers: minionState?.remainingMembers ?? 0
        });
    }
    return groups;
}
export function prepareActorSkillCheck(actor, skillId, difficulty = 2, rankOverride, characteristicOverrideId) {
    const definition = getActiveSkillDefinitions().find((entry) => entry.id === skillId);
    if (!definition)
        throw new Error(`Unknown active skill '${skillId}'.`);
    const state = findSkillState(actor, skillId);
    if (!state)
        throw new Error(`Actor '${actor?.name ?? "Unknown"}' has no persistent state for skill '${skillId}'.`);
    const isMinion = actor?.system?.role === "minion";
    let effectiveRank = rankOverride === undefined ? Number(state.rank ?? 0) : Number(rankOverride ?? 0);
    if (isMinion) {
        const group = normalizeMinionGroup({
            members: actor?.system?.minionGroup?.members ?? 1,
            memberWoundThreshold: actor?.system?.minionGroup?.memberWoundThreshold ?? 1,
            wounds: actor?.system?.wounds?.value ?? 0,
            casualties: actor?.system?.minionGroup?.casualties ?? 0,
            groupSkillIds: actor?.system?.minionGroup?.groupSkillIds ?? []
        });
        effectiveRank = minionSkillRank(group, skillId);
    }
    const transientOverride = getTransientCharacteristicOverride(actor, skillId);
    const effectiveCharacteristicOverride = characteristicOverrideId || transientOverride || state.characteristicOverride || undefined;
    const effectiveState = {
        ...state,
        rank: effectiveRank,
        ...(effectiveCharacteristicOverride ? { characteristicOverride: effectiveCharacteristicOverride } : {})
    };
    return prepareSkillCheck({
        definition,
        state: effectiveState,
        characteristics: actor.system.characteristics,
        difficulty
    });
}
export async function rollPreparedSkillCheckToChat(prepared, speakerAlias) {
    const result = rollNarrativePool(prepared.construction.pool);
    const content = `
    <section class="genesys-constructed-check genesys-skill-check">
      <p><strong>${prepared.skillLabel}</strong> · ${capitalize(prepared.characteristicId)} ${prepared.characteristicValue} + Rank ${prepared.skillRank} · Difficulty ${prepared.difficulty}</p>
      <p class="genesys-check-pool"><strong>Pool:</strong> ${formatPool(prepared.construction.pool)}</p>
      ${poolTraceToHtml(prepared.construction)}
      ${resultToChatHtml(result)}
    </section>`;
    const data = { content };
    if (speakerAlias)
        data.speaker = { alias: speakerAlias };
    await foundry.documents.ChatMessage.create(data);
    return { prepared, result };
}
//# sourceMappingURL=skill-ui.js.map