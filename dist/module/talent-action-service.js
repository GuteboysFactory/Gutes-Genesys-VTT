import { ruleElementToActiveAction, usageScopeKey } from "../domain/rules/index.js";
import { collectActorRuleElements, getActorRuleUsage, actorRuleLifecycleContext } from "./talent-service-foundation.js";
import { executeSceneTalent, actorInitiativeRef, getActorActivationEligibility, readSceneInitiativeState } from "./initiative-service.js";
import { rerenderRenderedCharacterSheet } from "./live-sheet-state.js";

function n(value) {
    const x = Number(value ?? 0);
    return Number.isFinite(x) ? Math.max(0, Math.trunc(x)) : 0;
}

function activeTalentContext(actor, scene = canvas.scene) {
    const state = readSceneInitiativeState(scene);
    const strainValue = n(actor?.system?.strain?.value);
    const strainThreshold = n(actor?.system?.strain?.threshold);
    const woundsValue = n(actor?.system?.wounds?.value);
    const woundsThreshold = n(actor?.system?.wounds?.threshold);
    return {
        scope:{sceneId:scene?.id??"no-scene",encounterId:scene?.getFlag?.("genesys-vtt","ruleEncounterId")??"",round:state.round,turnNumber:state.turnNumber,actorRef:actor.uuid},
        timing: "activate",
        tags: ["active-talent"],
        resources: {
            actionsRemaining: state.turn?.actionUsed ? 0 : 1,
            maneuversRemaining: Math.max(0, 2 - n(state.turn?.maneuversUsed)),
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

function incidentalEligibility(actor, scene = canvas.scene) {
    const state = readSceneInitiativeState(scene);
    if (state.status !== "active")
        return { allowed: false, reason: "No active encounter." };
    const ref = actorInitiativeRef(actor);
    const entry = state.entries?.find?.((row) => row.actorRef === ref) ?? null;
    if (!entry)
        return { allowed: false, reason: "Actor is not an encounter participant." };
    if (state.activeActorRef !== ref)
        return { allowed: false, reason: "It is not this actor's active turn." };
    if (String(entry.encounterStatus ?? "active") !== "active")
        return { allowed: false, reason: "Actor is out of the fight." };
    const activation = getActorActivationEligibility(actor);
    if (!activation.allowed)
        return { allowed: false, reason: activation.reason || "Actor cannot activate right now." };
    return { allowed: true, reason: "" };
}

export function listActorActiveTalentActions(actor, scene = canvas.scene) {
    const context = activeTalentContext(actor, scene);
    const rows = collectActorRuleElements(actor, context)
        .map(({ talent, rule }) => ({ talent, rule, action: ruleElementToActiveAction(rule, talent) }))
        .filter((entry) => entry.action);
    return rows.map(({ talent, rule, action }) => {
        const activation = String(action.activation ?? "");
        const turnGate = activation === "incidental" ? incidentalEligibility(actor, scene) : { allowed: true, reason: "" };
        return {
            ...action,
            talentRank: talent.rank,
            available: turnGate.allowed,
            unavailableReason: turnGate.reason,
            rule
        };
    });
}

export function executeActorActiveTalent(actor, sourceId, ruleId) {
    return executeSceneTalent(actor, sourceId, ruleId, canvas.scene);
}
export async function executeActorActiveTalentAuthoritative(actor, sourceId, ruleId, scene) {
    if(!game.user?.isGM || game.users?.activeGM?.id!==game.user.id)throw Error('Active GM required.');
    const entry = listActorActiveTalentActions(actor, scene).find((row) => row.sourceId === sourceId && row.ruleId === ruleId);
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
    const usage=getActorRuleUsage(actor);
    const scopeKey=usageScopeKey(entry.usage,actorRuleLifecycleContext(actor,activeTalentContext(actor,scene)));
    const tracked=entry.usage?.limit && !['none','hit','check'].includes(entry.usage.period);
    if(tracked && !scopeKey)throw Error('Talent usage scope is unavailable.');
    const next=[...usage];
    if(tracked){
        const index=next.findIndex(r=>r.sourceId===entry.sourceId && r.ruleId===entry.ruleId && r.scopeKey===scopeKey);
        const record={sourceId:entry.sourceId,ruleId:entry.ruleId,period:entry.usage.period,scopeKey,count:(index>=0?next[index].count:0)+1,updatedAt:Date.now()};
        if(index>=0)next[index]=record;else next.push(record);
    }
    await actor.update({ "system.strain.value": after, 'flags.genesys-vtt.ruleUsage':next });
    await rerenderRenderedCharacterSheet(actor);
    try { await foundry.documents.ChatMessage.create({
        content: `<section class="genesys-talent-action"><p><strong>${actor?.name ?? "Actor"}</strong> uses <strong>${entry.label}</strong>.</p><p>Strain: ${before} → ${after} (${healed} healed)</p></section>`,
        speaker: { alias: actor?.name ?? "Genesys Talent" }
    });
    } catch { ui.notifications.warn('Talent recovery saved; chat failed. Do not use the talent again.'); }
    return { entry, before, after, healed };
}
