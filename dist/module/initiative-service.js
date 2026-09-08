import {resolveRenewal} from "./heroic-renewal-v1855.js";
import {getTurnRecovery} from './initiative-recovery-v1860.js';
import {createInitiativeTransport,authorizeInitiativeCommand} from './initiative-transport-v1858.js';
import {createSceneCommandQueue,nextInitiativeRevision} from './initiative-write-queue-v1857.js';
const enqueueSceneCommand=createSceneCommandQueue();
import { rollNarrativePool } from "../domain/dice/index.js";
import { adjustInitiativeRound, canClaimCurrentSlot, claimCurrentInitiativeSlot, completeCurrentInitiativeSlot, currentInitiativeSlot, emptyInitiativeState, endInitiativeEncounter, forceClaimInitiativeActor, forceClaimInitiativeActivation, initiativeEntryForActor, initiativeEntryFromRoll, markInitiativeActorActed, markInitiativeActorUnacted, moveInitiativeSlot, normalizeInitiativeState, recordInitiativeEntry, removeInitiativeParticipant, rewindInitiativeTurn, setInitiativeMode, setInitiativeSlotSide, setInitiativeParticipantStatus, participantEncounterStatus, encounterOutcome, spendTurnAction, spendTurnManeuver, startInitiativeEncounter, startNextInitiativeRound, sortInitiativeEntries, unresolvedExtraActivations, waiveInitiativeActivation, restoreInitiativeActivation, upsertInitiativeParticipant, unclaimInitiativeTurn } from "../domain/initiative/index.js";
import { activationEligibility, normalizeActorRole, normalizeMinionGroup } from "../domain/adversaries/index.js";
import { SYSTEM_ID } from "./constants.js";
import { prepareActorSkillEngineCheck } from "./check-ui.js";
import { formatPool, resultToChatHtml } from "./dice-ui.js";
import { poolTraceToHtml } from "./pool-ui.js";
import { getActorConditionRules, advanceActorTurnConditions } from "./condition-service.js";
import { rerenderAllRenderedCharacterSheets } from "./live-sheet-state.js";
import { endRuleEncounter, startNewRuleEncounter } from "./talent-service-foundation.js";
const FLAG_KEY = "initiativeState";
let fallbackState = emptyInitiativeState();
const stateListeners = new Set();
export function actorInitiativeRef(actor) {
    return String(actor?.uuid ?? (actor?.id ? `Actor.${actor.id}` : ""));
}
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function activeScene() {
    return canvas?.scene ?? game?.scenes?.active ?? null;
}
function currentSceneTokens() {
    return Array.isArray(canvas?.tokens?.placeables) ? canvas.tokens.placeables : [];
}
export function resolveInitiativeActorReference(reference) {
    const ref = String(reference ?? "");
    if (!ref)
        return null;
    const tokenActor = currentSceneTokens().map((token) => token?.actor).find((actor) => actorInitiativeRef(actor) === ref);
    if (tokenActor)
        return tokenActor;
    const sceneActor = Array.from(game.scenes ?? []).flatMap(scene => Array.from(scene.tokens ?? [])).map(token => token.actor).find(actor => actorInitiativeRef(actor) === ref);
    if(sceneActor)return sceneActor;
    const actors = Array.isArray(game?.actors?.contents) ? game.actors.contents : [];
    return actors.find((actor) => actorInitiativeRef(actor) === ref || String(actor?.id ?? "") === ref) ?? game?.actors?.get?.(ref) ?? null;
}
export function getActorActivationEligibility(actor) {
    const criticals = Array.isArray(actor?.system?.criticalInjuries) ? actor.system.criticalInjuries : [];
    const unbowedSupreme=actor?.system?.heroicAbility?.active===true&&actor.system.heroicAbility.primaryEffectId==='rot-heroic:unbowed'&&actor.system.heroicAbility.powerLevel==='supreme';
    const dead = !unbowedSupreme && criticals.some((row) => row?.active !== false && row?.healed !== true && (Number(row?.total ?? 0) >= 151 || String(row?.name ?? "").toLowerCase() === "dead"));
    const role = normalizeActorRole(actor?.system?.role ?? (actor?.hasPlayerOwner ? "pc" : "rival"));
    const minion = role === "minion" ? normalizeMinionGroup({
        members: actor?.system?.minionGroup?.members ?? 1,
        memberWoundThreshold: actor?.system?.minionGroup?.memberWoundThreshold ?? 1,
        wounds: actor?.system?.wounds?.value ?? 0,
        casualties: actor?.system?.minionGroup?.casualties ?? 0,
        groupSkillIds: actor?.system?.minionGroup?.groupSkillIds ?? []
    }) : null;
    return activationEligibility({
        role,
        wounds: actor?.system?.wounds?.value,
        woundThreshold: minion?.groupWoundThreshold ?? actor?.system?.wounds?.threshold,
        strain: actor?.system?.strain?.value,
        strainThreshold: actor?.system?.strain?.threshold,
        dead: dead || Boolean(minion?.defeated)
    });
}
function requireActorCanActivate(actor) {
    const eligibility = getActorActivationEligibility(actor);
    if (!eligibility.allowed)
        throw new Error(eligibility.reason || `${actor?.name ?? "Actor"} cannot activate right now.`);
}
function activeActivation(state) {
    return state.activationEntitlements.find((row) => row.id === state.activeActivationId) ?? null;
}
function activeTurnIsGmOverride(state) {
    return activeActivation(state)?.kind === "gm-override";
}
export function getSceneTurnActionEligibility(actor, kind = "action", scene = activeScene()) {
    const state = readSceneInitiativeState(scene);
    if (state.status !== "active")
        return { allowed: true, outsideEncounter: true, gmOverride: false, reason: "" };
    const ref = actorInitiativeRef(actor);
    const entry = initiativeEntryForActor(state, ref);
    if (!entry)
        return { allowed: false, outsideEncounter: false, gmOverride: false, reason: "Actor is not an encounter participant." };
    if (!state.activeActorRef)
        return { allowed: false, outsideEncounter: false, gmOverride: false, reason: "No encounter turn is currently active." };
    if (state.activeActorRef !== ref)
        return { allowed: false, outsideEncounter: false, gmOverride: false, reason: "It is not this actor's active turn." };
    const gmOverride = activeTurnIsGmOverride(state);
    const encounterStatus = participantEncounterStatus(state, ref);
    if (encounterStatus !== "active" && !gmOverride) {
        return { allowed: false, outsideEncounter: false, gmOverride, reason: `Actor is ${encounterStatus.replaceAll("-", " ")} and is out of the fight.` };
    }
    const activation = getActorActivationEligibility(actor);
    if (!activation.allowed && !gmOverride) {
        return { allowed: false, outsideEncounter: false, gmOverride, reason: activation.reason || "Actor cannot act right now." };
    }
    const rules = getActorConditionRules(actor);
    if (kind === "action") {
        if (!rules.canPerformActions)
            return { allowed: false, outsideEncounter: false, gmOverride, reason: "Actions are blocked by the actor's current conditions." };
        if (state.turn.actionUsed)
            return { allowed: false, outsideEncounter: false, gmOverride, reason: "The actor has already used an action this turn." };
    }
    else {
        if (!rules.canPerformManeuvers)
            return { allowed: false, outsideEncounter: false, gmOverride, reason: "Maneuvers are blocked by the actor's current conditions." };
        if (state.turn.maneuversUsed >= 2)
            return { allowed: false, outsideEncounter: false, gmOverride, reason: "The actor has already used two maneuvers this turn." };
    }
    return { allowed: true, outsideEncounter: false, gmOverride, reason: "" };
}
async function queued_consumeSceneEncounterAction(actor, scene = activeScene()) {
    const eligibility = getSceneTurnActionEligibility(actor, "action", scene);
    if (!eligibility.allowed)
        throw new Error(eligibility.reason || "This action is not legal in the current encounter state.");
    if (eligibility.outsideEncounter)
        return null;
    const current = readSceneInitiativeState(scene);
    return queued_writeSceneInitiativeState(spendTurnAction(current, actorInitiativeRef(actor), getActorConditionRules(actor)), scene);
}
function claimFirstEligiblePopcornStarter(state) {
    if (state.mode !== "popcorn" || state.status !== "active" || state.activeActorRef || state.roundPhase === "end-round")
        return state;
    for (const entry of sortInitiativeEntries(state.entries)) {
        const actor = resolveInitiativeActorReference(entry.actorRef);
        if (!actor || !getActorActivationEligibility(actor).allowed)
            continue;
        try {
            return claimCurrentInitiativeSlot(state, entry.actorRef, entry.label, entry.side);
        }
        catch { /* Try the next eligible participant. */ }
    }
    return state;
}
export function pendingSceneSpecialActivations(scene = activeScene()) {
    return unresolvedExtraActivations(readSceneInitiativeState(scene));
}
export function subscribeInitiativeState(listener) {
    stateListeners.add(listener);
    return () => stateListeners.delete(listener);
}
function notifyStateListeners() {
    for (const listener of [...stateListeners]) {
        try {
            listener();
        }
        catch (error) {
            console.warn("genesys-vtt | Encounter state listener failed", error);
        }
    }
}
export function readSceneInitiativeState(scene = activeScene()) {
    if (!scene)
        return normalizeInitiativeState(fallbackState);
    const raw = scene?.getFlag?.(SYSTEM_ID, FLAG_KEY)
        ?? scene?.flags?.[SYSTEM_ID]?.[FLAG_KEY]
        ?? null;
    return normalizeInitiativeState(raw);
}
async function queued_writeSceneInitiativeState(state, scene = activeScene(), extraFlags = null) {
    if(!initiativeAuthority())throw Error("Active GM changed before saving. Review the encounter.");
    const normalized = nextInitiativeRevision(normalizeInitiativeState(state), readSceneInitiativeState(scene));
    if (!extraFlags) await game.genesysMagicEffects?.prepareTransition?.(scene, readSceneInitiativeState(scene), normalized);
    if(!initiativeAuthority())throw Error("Active GM changed before saving.");
    if (extraFlags) {
        if (!scene?.update) throw Error("Atomic scene updates are required for Concentration.");
        await scene.update({[`flags.${SYSTEM_ID}.${FLAG_KEY}`]:normalized, ...Object.fromEntries(Object.entries(extraFlags).map(([key,value])=>[`flags.${SYSTEM_ID}.${key}`,value]))});
    } else if (scene?.setFlag)
        await scene.setFlag(SYSTEM_ID, FLAG_KEY, normalized);
    else if (scene) {
        scene.flags ??= {};
        scene.flags[SYSTEM_ID] ??= {};
        scene.flags[SYSTEM_ID][FLAG_KEY] = normalized;
    }
    fallbackState = normalized;
    if (normalized.activeActorRef) await game.genesysNpcAbilities?.beginTurn?.(resolveInitiativeActorReference(normalized.activeActorRef), normalized, scene);
    if (normalized.activeActorRef) await game.genesysHeroicLive?.beginTurn?.(resolveInitiativeActorReference(normalized.activeActorRef), normalized, scene);
    await rerenderAllRenderedCharacterSheets();
    notifyStateListeners();
    return normalized;
}
async function queued_resetSceneInitiative(scene = activeScene()) {
    const current = readSceneInitiativeState(scene);
    const result = await queued_writeSceneInitiativeState({...emptyInitiativeState(current.mode),revision:current.revision}, scene);
    await endRuleEncounter(scene);
    return result;
}
async function queued_setSceneInitiativeMode(mode, scene = activeScene()) {
    return queued_writeSceneInitiativeState(setInitiativeMode(readSceneInitiativeState(scene), mode), scene);
}
async function queued_rollActorInitiative(actor, side, skill, scene = activeScene()) {
    const current = readSceneInitiativeState(scene);
    if (current.status !== "collecting")
        throw new Error("Reset or end the current initiative encounter before rolling new initiative.");
    const prepared = prepareActorSkillEngineCheck(actor, skill, { mode: "standard", difficulty: 0 });
    const result = rollNarrativePool(prepared.check.construction.pool);
    const entry = initiativeEntryFromRoll({
        actorRef: actorInitiativeRef(actor),
        label: actor?.name ?? "Actor",
        side,
        skill,
        result,
        actorRole: actor?.system?.role,
        extraActivations: actor?.system?.extraActivations
    });
    const state = await queued_writeSceneInitiativeState(recordInitiativeEntry(current, entry), scene);
    const totalActivations = state.activationEntitlements.filter((row) => row.actorRef === entry.actorRef && row.kind !== "gm-override").length || 1;
    const publicActivationLine = side === "pc"
        ? `<p><strong>Activations:</strong> 1/${totalActivations} starts with the Base Activation.</p>`
        : "";
    const content = `<section class="genesys-initiative-roll">
    <p><strong>INITIATIVE — ${escapeHtml(actor?.name ?? "Actor")}</strong></p>
    <p>${side.toUpperCase()} · ${skill === "cool" ? "Cool" : "Vigilance"}</p>
    <p><strong>Pool:</strong> ${formatPool(prepared.check.construction.pool)}</p>
    ${poolTraceToHtml(prepared.check.construction)}
    ${resultToChatHtml(result)}
    <p><strong>Initiative:</strong> Success ${result.net.success} · Advantage ${result.net.advantage}</p>
    ${publicActivationLine}
  </section>`;
    await foundry.documents.ChatMessage.create({ content, speaker: { alias: actor?.name ?? "Initiative" } });
    if (side === "npc" && totalActivations > 1 && game?.user?.isGM) {
        const recipients = foundry.documents.ChatMessage.getWhisperRecipients?.("GM") ?? [];
        await foundry.documents.ChatMessage.create({
            content: `<section class="genesys-initiative-roll genesys-gm-only"><p><strong>${escapeHtml(actor?.name ?? "Nemesis")} — GM Activation Budget</strong></p><p>Activation 1/${totalActivations}: Base Activation</p><p>Activation 2/${totalActivations}: Nemesis Extra Activation</p></section>`,
            speaker: { alias: actor?.name ?? "Initiative" },
            whisper: recipients.map((user) => user.id ?? user)
        });
    }
    return { state, result, prepared };
}
async function queued_startSceneInitiative(scene = activeScene()) {
    const current = readSceneInitiativeState(scene);
    let next = startInitiativeEncounter(current);
    if (current.status !== "active" && next.status === "active")
        await startNewRuleEncounter(scene);
    if (next.mode === "popcorn") {
        // The domain layer knows who won initiative, but the Foundry service owns live Actor eligibility.
        // Always re-resolve the opening turn here so the highest eligible initiative result starts.
        if (next.activeActorRef)
            next = unclaimInitiativeTurn(next);
        next = claimFirstEligiblePopcornStarter(next);
    }
    return queued_writeSceneInitiativeState(next, scene);
}
async function queued_startNextSceneInitiativeRound(options = {}, scene = activeScene()) {
    let current = readSceneInitiativeState(scene);
    const pending = unresolvedExtraActivations(current);
    if (pending.length && options.waivePendingSpecials) {
        for (const row of pending)
            current = waiveInitiativeActivation(current, row.id);
    }
    let next = startNextInitiativeRound(current, Boolean(options.waivePendingSpecials));
    if (next.mode === "popcorn") {
        if (next.activeActorRef)
            next = unclaimInitiativeTurn(next);
        next = claimFirstEligiblePopcornStarter(next);
    }
    return queued_writeSceneInitiativeState(next, scene);
}
async function queued_waiveSceneInitiativeActivation(activationId, scene = activeScene()) {
    return queued_writeSceneInitiativeState(waiveInitiativeActivation(readSceneInitiativeState(scene), activationId), scene);
}
async function queued_restoreSceneInitiativeActivation(activationId, scene = activeScene()) {
    return queued_writeSceneInitiativeState(restoreInitiativeActivation(readSceneInitiativeState(scene), activationId), scene);
}
async function queued_endSceneInitiativeEncounter(scene = activeScene()) {
    const current = readSceneInitiativeState(scene);
    if (current.status === "active" && scene?.setFlag) {
        const id = scene.getFlag(SYSTEM_ID, "ruleEncounterId") || foundry.utils.randomID();
        await scene.setFlag(SYSTEM_ID, "recoveryEncounterId", id);
    }
    const next = await queued_writeSceneInitiativeState(endInitiativeEncounter(current), scene);
    await endRuleEncounter(scene);
    return next;
}
function entryForActorOrThrow(state, actor) {
    const ref = actorInitiativeRef(actor);
    const entry = initiativeEntryForActor(state, ref);
    if (!entry)
        throw new Error(`${actor?.name ?? "Actor"} has not rolled initiative in this encounter.`);
    return { ref, entry };
}
async function queued_claimSceneInitiativeSlot(actor, scene = activeScene()) {
    requireActorCanActivate(actor);
    const current = readSceneInitiativeState(scene);
    const { ref, entry } = entryForActorOrThrow(current, actor);
    return queued_writeSceneInitiativeState(claimCurrentInitiativeSlot(current, ref, actor?.name ?? entry.label, entry.side), scene);
}
async function queued_forceClaimSceneInitiativeActor(actorRef, scene = activeScene()) {
    const current = readSceneInitiativeState(scene);
    const entry = initiativeEntryForActor(current, actorRef);
    if (!entry)
        throw new Error("Encounter participant not found.");
    const actor = resolveInitiativeActorReference(actorRef);
    const mustOverride = !actor || !getActorActivationEligibility(actor).allowed;
    return queued_writeSceneInitiativeState(forceClaimInitiativeActor(current, actorRef, entry.label, mustOverride), scene);
}
async function queued_claimSceneInitiativeActivation(activationId, scene = activeScene()) {
    const current = readSceneInitiativeState(scene);
    const activation = current.activationEntitlements.find((row) => row.id === activationId);
    if (!activation)
        throw new Error("Activation entitlement not found.");
    const actor = resolveInitiativeActorReference(activation.actorRef);
    if (!actor)
        throw new Error("Encounter Actor could not be resolved.");
    requireActorCanActivate(actor);
    return queued_writeSceneInitiativeState(forceClaimInitiativeActivation(current, activationId), scene);
}
async function queued_forceClaimSceneInitiativeActivation(activationId, scene = activeScene()) {
    return queued_writeSceneInitiativeState(forceClaimInitiativeActivation(readSceneInitiativeState(scene), activationId), scene);
}
async function queued_unclaimSceneInitiative(scene = activeScene()) {
    return queued_writeSceneInitiativeState(unclaimInitiativeTurn(readSceneInitiativeState(scene)), scene);
}
async function queued_markSceneActorActed(actorRef, scene = activeScene()) {
    return queued_writeSceneInitiativeState(markInitiativeActorActed(readSceneInitiativeState(scene), actorRef), scene);
}
async function queued_markSceneActorUnacted(actorRef, scene = activeScene()) {
    return queued_writeSceneInitiativeState(markInitiativeActorUnacted(readSceneInitiativeState(scene), actorRef), scene);
}
async function queued_setSceneParticipantStatus(actorRef, status, scene = activeScene()) {
    return queued_writeSceneInitiativeState(setInitiativeParticipantStatus(readSceneInitiativeState(scene), actorRef, status), scene);
}
export function getSceneEncounterOutcome(scene = activeScene()) {
    return encounterOutcome(readSceneInitiativeState(scene));
}
async function queued_setSceneSlotSide(index, side, scene = activeScene()) {
    return queued_writeSceneInitiativeState(setInitiativeSlotSide(readSceneInitiativeState(scene), index, side), scene);
}
async function queued_moveSceneSlot(index, delta, scene = activeScene()) {
    return queued_writeSceneInitiativeState(moveInitiativeSlot(readSceneInitiativeState(scene), index, delta), scene);
}
async function queued_rewindSceneInitiativeTurn(scene = activeScene()) {
    return queued_writeSceneInitiativeState(rewindInitiativeTurn(readSceneInitiativeState(scene)), scene);
}
async function queued_adjustSceneInitiativeRound(delta, scene = activeScene()) {
    return queued_writeSceneInitiativeState(adjustInitiativeRound(readSceneInitiativeState(scene), delta), scene);
}
async function queued_useSceneTurnAction(actor, scene = activeScene()) {
    const eligibility = getSceneTurnActionEligibility(actor, "action", scene);
    if (!eligibility.allowed)
        throw new Error(eligibility.reason || "Action is blocked.");
    const current = readSceneInitiativeState(scene);
    return queued_writeSceneInitiativeState(spendTurnAction(current, actorInitiativeRef(actor), getActorConditionRules(actor)), scene);
}
async function queued_useSceneTurnManeuver(actor, scene = activeScene()) {
    const eligibility = getSceneTurnActionEligibility(actor, "maneuver", scene);
    if (!eligibility.allowed)
        throw new Error(eligibility.reason || "Maneuver is blocked.");
    const current = readSceneInitiativeState(scene);
    return queued_writeSceneInitiativeState(spendTurnManeuver(current, actorInitiativeRef(actor), getActorConditionRules(actor)), scene);
}
function conditionTurnIdentity(state, scene) {
    const encounter = `${scene.id}:${scene.getFlag(SYSTEM_ID, 'ruleEncounterId') ?? ''}`;
    return {encounter, key: `${state.round}:${state.turnNumber}:${state.activeActivationId}:${state.activeActorRef}`};
}
async function queued_endSceneInitiativeTurn(actor, scene = activeScene()) {
    const current = readSceneInitiativeState(scene);
    const ref = actorInitiativeRef(actor);
    if (current.activeActorRef !== ref)
        throw new Error(`${actor?.name ?? "Actor"} does not own the active encounter turn.`);
    await game.genesysHeroicLive?.finishTurn(actor, current, scene);
    await advanceActorTurnConditions(actor, conditionTurnIdentity(current, scene));
    return queued_writeSceneInitiativeState(completeCurrentInitiativeSlot(current, ref), scene);
}
async function queued_forceEndCurrentSceneTurn(scene = activeScene()) {
    const state = readSceneInitiativeState(scene);
    if (!state.activeActorRef)
        throw new Error("No active actor to end.");
    const actor = resolveInitiativeActorReference(state.activeActorRef);
    if (actor) {
        await game.genesysHeroicLive?.finishTurn(actor, state, scene);
        await advanceActorTurnConditions(actor, conditionTurnIdentity(state, scene));
    }
    return queued_writeSceneInitiativeState(completeCurrentInitiativeSlot(state, state.activeActorRef), scene);
}
export function getInitiativeSheetContext(actor, scene = activeScene()) {
    const state = readSceneInitiativeState(scene);
    const ref = actorInitiativeRef(actor);
    const entry = initiativeEntryForActor(state, ref);
    const currentSlot = currentInitiativeSlot(state);
    const eligibility = entry ? canClaimCurrentSlot(state, ref, entry.side) : { allowed: false, reason: "Roll initiative first." };
    const conditionRules = getActorConditionRules(actor);
    const activationEligibility = getActorActivationEligibility(actor);
    const actionEligibility = getSceneTurnActionEligibility(actor, "action", scene);
    const maneuverEligibility = getSceneTurnActionEligibility(actor, "maneuver", scene);
    const isActiveActor = state.activeActorRef === ref;
    const defaultSide = actor?.hasPlayerOwner ? "pc" : "npc";
    const selectedSide = entry?.side ?? defaultSide;
    const selectedSkill = entry?.skill ?? "vigilance";
    const encounterStatus = entry?.encounterStatus ?? "active";
    const actorActivations = state.activationEntitlements.filter((row) => row.actorRef === ref && row.kind !== "gm-override");
    const usedActivations = actorActivations.filter((row) => row.used).length;
    const activationTotal = actorActivations.length || Math.max(1, 1 + Number(entry?.extraActivations ?? 0));
    return {
        mode: state.mode,
        modeLabel: state.mode === "popcorn" ? "Popcorn Initiative" : "Core Side Slots",
        status: state.status,
        collecting: state.status === "collecting",
        active: state.status === "active",
        ended: state.status === "ended",
        round: state.round,
        turnNumber: game?.user?.isGM ? state.turnNumber : Math.min(state.turnNumber, Math.max(1, state.entries.length)),
        totalTurns: game?.user?.isGM ? (state.activationEntitlements.length || state.entries.length) : state.entries.length,
        activeSlotIndex: state.activeSlotIndex,
        currentSlotNumber: currentSlot ? state.activeSlotIndex + 1 : state.turnNumber,
        currentSlot,
        currentSideLabel: currentSlot?.side?.toUpperCase?.() ?? (state.mode === "popcorn" ? "ANY" : "—"),
        activeActorLabel: state.activeActorLabel || "—",
        participant: entry,
        hasRolled: Boolean(entry),
        encounterStatus,
        activationUsedCount: usedActivations,
        activationTotalCount: activationTotal,
        activationCounterLabel: `${Math.min(activationTotal, usedActivations + (isActiveActor ? 1 : 0))}/${activationTotal}`,
        selectedSide,
        sidePcSelected: selectedSide === "pc",
        sideNpcSelected: selectedSide === "npc",
        selectedSkill,
        skillCoolSelected: selectedSkill === "cool",
        skillVigilanceSelected: selectedSkill === "vigilance",
        canClaim: Boolean(entry && eligibility.allowed && activationEligibility.allowed),
        claimReason: activationEligibility.allowed ? eligibility.reason : activationEligibility.reason,
        incapacitated: activationEligibility.incapacitated,
        isActiveActor,
        actionBlocked: isActiveActor && !actionEligibility.allowed,
        maneuverBlocked: isActiveActor && !maneuverEligibility.allowed,
        actionBlockedReason: actionEligibility.reason,
        maneuverBlockedReason: maneuverEligibility.reason,
        actionUsed: state.turn.actionUsed,
        maneuversUsed: state.turn.maneuversUsed,
        canUseAction: isActiveActor && actionEligibility.allowed,
        canUseManeuver: isActiveActor && maneuverEligibility.allowed,
        conditionRules
    };
}
export function initiativeDebug(scene = activeScene()) {
    return readSceneInitiativeState(scene);
}
async function queued_addSceneInitiativeParticipant(actor, side, skill = "vigilance", scene = activeScene()) {
    if (!actor)
        throw new Error("Actor is required.");
    const current = readSceneInitiativeState(scene);
    const resolvedSide = side ?? (actor?.hasPlayerOwner ? "pc" : "npc");
    const entry = initiativeEntryFromRoll({
        actorRef: actorInitiativeRef(actor),
        label: actor?.name ?? "Actor",
        side: resolvedSide,
        skill,
        result: { net: { success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0 } },
        actorRole: actor?.system?.role,
        extraActivations: actor?.system?.extraActivations
    });
    return queued_writeSceneInitiativeState(upsertInitiativeParticipant(current, entry), scene);
}
async function queued_removeSceneInitiativeParticipant(actorRef, scene = activeScene()) {
    return queued_writeSceneInitiativeState(removeInitiativeParticipant(readSceneInitiativeState(scene), actorRef), scene);
}
//# sourceMappingURL=initiative-service.js.map
export function consumeSceneEncounterAction(actor, scene = activeScene()) {
    return dispatchInitiativeCommand("consumeSceneEncounterAction", [actorInitiativeRef(actor)], scene);
}

export function writeSceneInitiativeState(state, scene = activeScene()) {
    return dispatchInitiativeCommand("writeSceneInitiativeState", [state], scene);
}

export function resetSceneInitiative(scene = activeScene()) {
    return dispatchInitiativeCommand("resetSceneInitiative", [], scene);
}

export function setSceneInitiativeMode(mode, scene = activeScene()) {
    return dispatchInitiativeCommand("setSceneInitiativeMode", [mode], scene);
}

export function rollActorInitiative(actor, side, skill, scene = activeScene()) {
    return dispatchInitiativeCommand("rollActorInitiative", [actorInitiativeRef(actor), side, skill], scene);
}

export function startSceneInitiative(scene = activeScene()) {
    return dispatchInitiativeCommand("startSceneInitiative", [], scene);
}

export function startNextSceneInitiativeRound(options = {}, scene = activeScene()) {
    return dispatchInitiativeCommand("startNextSceneInitiativeRound", [options], scene);
}

export function waiveSceneInitiativeActivation(activationId, scene = activeScene()) {
    return dispatchInitiativeCommand("waiveSceneInitiativeActivation", [activationId], scene);
}

export function restoreSceneInitiativeActivation(activationId, scene = activeScene()) {
    return dispatchInitiativeCommand("restoreSceneInitiativeActivation", [activationId], scene);
}

export function endSceneInitiativeEncounter(scene = activeScene()) {
    return dispatchInitiativeCommand("endSceneInitiativeEncounter", [], scene);
}

export function claimSceneInitiativeSlot(actor, scene = activeScene()) {
    return dispatchInitiativeCommand("claimSceneInitiativeSlot", [actorInitiativeRef(actor)], scene);
}

export function forceClaimSceneInitiativeActor(actorRef, scene = activeScene()) {
    return dispatchInitiativeCommand("forceClaimSceneInitiativeActor", [actorRef], scene);
}

export function claimSceneInitiativeActivation(activationId, scene = activeScene()) {
    return dispatchInitiativeCommand("claimSceneInitiativeActivation", [activationId], scene);
}

export function forceClaimSceneInitiativeActivation(activationId, scene = activeScene()) {
    return dispatchInitiativeCommand("forceClaimSceneInitiativeActivation", [activationId], scene);
}

export function unclaimSceneInitiative(scene = activeScene()) {
    return dispatchInitiativeCommand("unclaimSceneInitiative", [], scene);
}

export function markSceneActorActed(actorRef, scene = activeScene()) {
    return dispatchInitiativeCommand("markSceneActorActed", [actorRef], scene);
}

export function markSceneActorUnacted(actorRef, scene = activeScene()) {
    return dispatchInitiativeCommand("markSceneActorUnacted", [actorRef], scene);
}

export function setSceneParticipantStatus(actorRef, status, scene = activeScene()) {
    return dispatchInitiativeCommand("setSceneParticipantStatus", [actorRef, status], scene);
}

export function setSceneSlotSide(index, side, scene = activeScene()) {
    return dispatchInitiativeCommand("setSceneSlotSide", [index, side], scene);
}

export function moveSceneSlot(index, delta, scene = activeScene()) {
    return dispatchInitiativeCommand("moveSceneSlot", [index, delta], scene);
}

export function rewindSceneInitiativeTurn(scene = activeScene()) {
    return dispatchInitiativeCommand("rewindSceneInitiativeTurn", [], scene);
}

export function adjustSceneInitiativeRound(delta, scene = activeScene()) {
    return dispatchInitiativeCommand("adjustSceneInitiativeRound", [delta], scene);
}

export function useSceneTurnAction(actor, scene = activeScene()) {
    return dispatchInitiativeCommand("useSceneTurnAction", [actorInitiativeRef(actor)], scene);
}

export function useSceneTurnManeuver(actor, scene = activeScene()) {
    return dispatchInitiativeCommand("useSceneTurnManeuver", [actorInitiativeRef(actor)], scene);
}

export function endSceneInitiativeTurn(actor, scene = activeScene()) {
    return dispatchInitiativeCommand("endSceneInitiativeTurn", [actorInitiativeRef(actor)], scene);
}

export function forceEndCurrentSceneTurn(scene = activeScene()) {
    return dispatchInitiativeCommand("forceEndCurrentSceneTurn", [], scene);
}

export function addSceneInitiativeParticipant(actor, side, skill = "vigilance", scene = activeScene()) {
    return dispatchInitiativeCommand("addSceneInitiativeParticipant", [actorInitiativeRef(actor), side, skill], scene);
}

export function removeSceneInitiativeParticipant(actorRef, scene = activeScene()) {
    return dispatchInitiativeCommand("removeSceneInitiativeParticipant", [actorRef], scene);
}

export function recoverSceneTurn(expectedKey, scene = activeScene()) {
    return dispatchInitiativeCommand('recoverSceneTurn', [expectedKey], scene);
}
async function queued_recoverSceneTurn(expectedKey, scene) {
    const state=readSceneInitiativeState(scene);
    const actor=resolveInitiativeActorReference(state.activeActorRef);
    if(getTurnRecovery(state,actor,scene)?.key!==expectedKey)throw Error('Recovery turn changed. Reopen Encounter Tracker and review the current turn.');
    return queued_endSceneInitiativeTurn(actor,scene);
}
export function concentrateSceneSpells(actor, scene = activeScene()) {
    return dispatchInitiativeCommand('concentrateSceneSpells', [actorInitiativeRef(actor)], scene);
}
async function queued_concentrateSceneSpells(actor, scene) {
    if (!game.genesysMagicEffects?.concentrateAuthoritative) throw Error('Concentration service unavailable.');
    return game.genesysMagicEffects.concentrateAuthoritative(actor, scene, {
        read:()=>readSceneInitiativeState(scene),
        pay:journal=>{
            const eligibility=getSceneTurnActionEligibility(actor, 'maneuver', scene);
            if(!eligibility.allowed)throw Error(eligibility.reason || 'Maneuver is blocked.');
            return queued_writeSceneInitiativeState(spendTurnManeuver(readSceneInitiativeState(scene), actorInitiativeRef(actor), getActorConditionRules(actor)), scene, {magicConcentrationJournal:journal});
        }
    });
}
export function resolveSceneRenewal(actor, skill, activationId, scene = activeScene()) {
    return dispatchInitiativeCommand('resolveSceneRenewal', [actorInitiativeRef(actor), skill, activationId], scene);
}
async function queued_resolveSceneRenewal(actor, skill, activationId, scene) {
    if (!['cool','vigilance'].includes(skill)) throw Error('Choose Cool or Vigilance.');
    if(actor.getFlag(SYSTEM_ID,'heroicTiming')?.activationId!==activationId)throw Error('Heroic activation changed. Reopen Renewal.');
    return resolveRenewal(actor, {scene, isGM:initiativeAuthority, read:()=>readSceneInitiativeState(scene), write:next=>queued_writeSceneInitiativeState(next,scene), choose:async()=>skill,
        roll:chosen=>rollNarrativePool(prepareActorSkillEngineCheck(actor,chosen,{mode:'standard',difficulty:0}).check.construction.pool)});
}
export function executeSceneTalent(actor, sourceId, ruleId, scene = activeScene()) {
    return dispatchInitiativeCommand('executeSceneTalent', [actorInitiativeRef(actor),sourceId,ruleId], scene);
}
async function queued_executeSceneTalent(actor, sourceId, ruleId, scene) {
    if(!game.genesysRules?.talents?.executeAuthoritative)throw Error('Talent service unavailable.');
    return game.genesysRules.talents.executeAuthoritative(actor,sourceId,ruleId,scene);
}
export function resolveSceneFear(actor, options, scene = activeScene()) {
    const {key,sources,boost,setback,confirmed}=options;
    return dispatchInitiativeCommand('resolveSceneFear',[actorInitiativeRef(actor),{key,sources,boost,setback,confirmed}],scene);
}
async function queued_resolveSceneFear(actor, options, scene) {
    if(!initiativeAuthority())throw Error('The active GM resolves fear.');
    if(!game.genesysFear)throw Error('Fear service unavailable.');
    return game.genesysFear.resolveFearAuthoritative(actor,options,scene);
}
const commandRegistry = {
    resolveSceneFear:{run:queued_resolveSceneFear,argc:2,actor:true},
    executeSceneTalent:{run:queued_executeSceneTalent,argc:3,actor:true},
    concentrateSceneSpells: {run:queued_concentrateSceneSpells, argc:1, actor:true},
    resolveSceneRenewal: {run:queued_resolveSceneRenewal, argc:3, actor:true},
    recoverSceneTurn: {run: queued_recoverSceneTurn, argc: 1, actor: false},
    removeSceneInitiativeParticipant: {run: queued_removeSceneInitiativeParticipant, argc: 1, actor: false},
    addSceneInitiativeParticipant: {run: queued_addSceneInitiativeParticipant, argc: 3, actor: true},
    forceEndCurrentSceneTurn: {run: queued_forceEndCurrentSceneTurn, argc: 0, actor: false},
    endSceneInitiativeTurn: {run: queued_endSceneInitiativeTurn, argc: 1, actor: true},
    useSceneTurnManeuver: {run: queued_useSceneTurnManeuver, argc: 1, actor: true},
    useSceneTurnAction: {run: queued_useSceneTurnAction, argc: 1, actor: true},
    adjustSceneInitiativeRound: {run: queued_adjustSceneInitiativeRound, argc: 1, actor: false},
    rewindSceneInitiativeTurn: {run: queued_rewindSceneInitiativeTurn, argc: 0, actor: false},
    moveSceneSlot: {run: queued_moveSceneSlot, argc: 2, actor: false},
    setSceneSlotSide: {run: queued_setSceneSlotSide, argc: 2, actor: false},
    setSceneParticipantStatus: {run: queued_setSceneParticipantStatus, argc: 2, actor: false},
    markSceneActorUnacted: {run: queued_markSceneActorUnacted, argc: 1, actor: false},
    markSceneActorActed: {run: queued_markSceneActorActed, argc: 1, actor: false},
    unclaimSceneInitiative: {run: queued_unclaimSceneInitiative, argc: 0, actor: false},
    forceClaimSceneInitiativeActivation: {run: queued_forceClaimSceneInitiativeActivation, argc: 1, actor: false},
    claimSceneInitiativeActivation: {run: queued_claimSceneInitiativeActivation, argc: 1, actor: false},
    forceClaimSceneInitiativeActor: {run: queued_forceClaimSceneInitiativeActor, argc: 1, actor: false},
    claimSceneInitiativeSlot: {run: queued_claimSceneInitiativeSlot, argc: 1, actor: true},
    endSceneInitiativeEncounter: {run: queued_endSceneInitiativeEncounter, argc: 0, actor: false},
    restoreSceneInitiativeActivation: {run: queued_restoreSceneInitiativeActivation, argc: 1, actor: false},
    waiveSceneInitiativeActivation: {run: queued_waiveSceneInitiativeActivation, argc: 1, actor: false},
    startNextSceneInitiativeRound: {run: queued_startNextSceneInitiativeRound, argc: 1, actor: false},
    startSceneInitiative: {run: queued_startSceneInitiative, argc: 0, actor: false},
    rollActorInitiative: {run: queued_rollActorInitiative, argc: 3, actor: true},
    setSceneInitiativeMode: {run: queued_setSceneInitiativeMode, argc: 1, actor: false},
    resetSceneInitiative: {run: queued_resetSceneInitiative, argc: 0, actor: false},
    writeSceneInitiativeState: {run: queued_writeSceneInitiativeState, argc: 1, actor: false},
    consumeSceneEncounterAction: {run: queued_consumeSceneEncounterAction, argc: 1, actor: true}
};
function initiativeAuthority() {return game.user?.isGM && game.users.activeGM?.id===game.user.id;}
function executeInitiativeCommand(request,userId) {
    const scene=game.scenes.get(request.sceneId);
    if(!scene)throw Error('Encounter scene no longer exists.');
    return enqueueSceneCommand(scene, async()=>{
        if(!initiativeAuthority())throw Error('Active GM changed. Review the encounter and retry.');
        const command=Object.hasOwn(commandRegistry,request.name)?commandRegistry[request.name]:null;
        if(!command || !Array.isArray(request.args) || request.args.length!==command.argc)throw Error('Unknown encounter command.');
        const current=readSceneInitiativeState(scene);
        if(request.revision!==current.revision)throw Error('Encounter changed. Review the current turn and try again.');
        const args=[...request.args];
        let actor=command.actor?resolveInitiativeActorReference(args[0]):null;
        if(request.name==='claimSceneInitiativeActivation')actor=resolveInitiativeActorReference(current.activationEntitlements.find(row=>row.id===args[0])?.actorRef);
        authorizeInitiativeCommand(request.name,game.users.get(userId),actor,args);
        if(command.actor){if(!actor)throw Error('Encounter Actor no longer exists.');args[0]=actor;}
        if(current.activeActorRef)await game.genesysNpcAbilities?.beginTurn?.(resolveInitiativeActorReference(current.activeActorRef),current,scene);
        return command.run(...args,scene);
    });
}
const initiativeTransport=createInitiativeTransport({
    gm:()=>game.users.activeGM?.id, userId:()=>game.user.id, authority:initiativeAuthority,
    id:()=>foundry.utils.randomID(),
    create:request=>foundry.documents.ChatMessage.create({content:'<p>Encounter command requested.</p>',whisper:[request.gm,game.user.id],flags:{[SYSTEM_ID]:{initiativeRequest:request}}}),
    execute:executeInitiativeCommand,
    reply:(message,reply)=>message.document.update({content:reply.ok?'<p>Encounter command completed.</p>':'<p>Encounter command rejected. Review the current encounter.</p>',[`flags.${SYSTEM_ID}.initiativeReply`]:reply}),
    warn:message=>ui.notifications.warn(message)
});
Hooks.on('createChatMessage',(document,_options,userId)=>{
    void initiativeTransport.created({id:document.id,document,request:document.getFlag(SYSTEM_ID,'initiativeRequest')},userId);
});
Hooks.on('updateChatMessage',(document,change,_options,userId)=>{
    const reply=document.getFlag(SYSTEM_ID,'initiativeReply');
    if(reply)initiativeTransport.updated(reply,userId);
});
function dispatchInitiativeCommand(name,args,scene) {
    if(!scene)return Promise.reject(Error('An active scene is required for encounter commands.'));
    const request={name,args,sceneId:scene.id,revision:readSceneInitiativeState(scene).revision};
    if(initiativeAuthority())return executeInitiativeCommand(request,game.user.id);
    return initiativeTransport.request(request);
}
