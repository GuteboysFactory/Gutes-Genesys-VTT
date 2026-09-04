import { ruleElementToActiveAction } from "../domain/rules/index.js";
import { collectActorRuleElements, recordActorRuleUsage } from "./talent-service-foundation.js";
import { getSceneTurnActionEligibility, readSceneInitiativeState } from "./initiative-service.js";
import { rerenderRenderedCharacterSheet } from "./live-sheet-state.js";

function n(value) {
    const x = Number(value ?? 0);
    return Number.isFinite(x) ? Math.max(0, Math.trunc(x)) : 0;
}

function activeTalentContext(actor) {
    const state = readSceneInitiativeState();
    const turnEligibility = getSceneTurnActionEligibility(actor, "action");
    const strainValue = n(actor?.system?.strain?.value);
    const strainThreshold = n(actor?.system?.strain?.threshold);
    const woundsValue = n(actor?.system?.wounds?.value);
    const woundsThreshold = n(actor?.system?.wounds?.threshold);
    return {
        timing: "activate",
        tags: ["active-talent"],
        resources: {
            actionsRemaining: turnEligibility.allowed ? 1 : 0,
            maneuversRemaining: 0,
            canSufferStrain: true,
            canSufferWounds: true
        },
        data: {
            encounterActive: state.status === "active",
            resources: {
                strain: { value: strainValue, threshold: strainThreshold },
                wounds: { value: woundsValue, threshold: woundsThreshold }
            }
        }
    };
}

function incidentalEligibility(actor) {
    const state = readSceneInitiativeState();
    if (state.status !== "active")
        return { allowed: false, reason: "No active encounter." };
    const actionEligibility = getSceneTurnActionEligibility(actor, "action");
    if (!actionEligibility.allowed)
        return { allowed: false, reason: actionEligibility.reason || "This actor cannot use an incidental right now." };
    return { allowed: true, reason: "" };
}

export function listActorActiveTalentActions(actor) {
    const context = activeTalentContext(actor);
    const rows = collectActorRuleElements(actor, context)
        .map(({ talent, rule }) => ({ talent, rule, action: ruleElementToActiveAction(rule, talent) }))
        .filter((entry) => entry.action);
    return rows.map(({ talent, rule, action }) => {
        const activation = String(action.activation ?? "");
        const turnGate = activation === "incidental" ? incidentalEligibility(actor) : { allowed: true, reason: "" };
        return {
            ...action,
            talentRank: talent.rank,
            available: turnGate.allowed,
            unavailableReason: turnGate.reason,
            rule
        };
    });
}

export async function executeActorActiveTalent(actor, sourceId, ruleId) {
    const entry = listActorActiveTalentActions(actor).find((row) => row.sourceId === sourceId && row.ruleId === ruleId);
    if (!entry)
        throw new Error("Talent action is not currently available.");
    if (!entry.available)
        throw new Error(entry.unavailableReason || "Talent action is not legal right now.");
    if (entry.effect?.resource !== "strain")
        throw new Error(`Unsupported active resource effect: ${entry.effect?.resource ?? "unknown"}.`);
    const before = n(actor?.system?.strain?.value);
    const healed = Math.min(before, n(entry.effect?.amount));
    if (healed <= 0)
        throw new Error("No Strain can be healed.");
    const after = Math.max(0, before - healed);
    await actor.update({ "system.strain.value": after });
    await recordActorRuleUsage(actor, entry.sourceId, entry.ruleId, entry.usage, activeTalentContext(actor));
    await rerenderRenderedCharacterSheet(actor);
    await foundry.documents.ChatMessage.create({
        content: `<section class="genesys-talent-action"><p><strong>${actor?.name ?? "Actor"}</strong> uses <strong>${entry.label}</strong>.</p><p>Strain: ${before} → ${after} (${healed} healed)</p></section>`,
        speaker: { alias: actor?.name ?? "Genesys Talent" }
    });
    return { entry, before, after, healed };
}
