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
    const actors = Array.isArray(game?.actors?.contents) ? game.actors.contents : [];
    return actors.find((actor) => actorInitiativeRef(actor) === ref || String(actor?.id ?? "") === ref) ?? game?.actors?.get?.(ref) ?? null;
}
export function getActorActivationEligibility(actor) {
    const criticals = Array.isArray(actor?.system?.criticalInjuries) ? actor.system.criticalInjuries : [];
    const dead = criticals.some((row) => row?.active !== false && row?.healed !== true && (Number(row?.total ?? 0) >= 151 || String(row?.name ?? "").toLowerCase() === "dead"));
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
export async function consumeSceneEncounterAction(actor, scene = activeScene()) {
    const eligibility = getSceneTurnActionEligibility(actor, "action", scene);
    if (!eligibility.allowed)
        throw new Error(eligibility.reason || "This action is not legal in the current encounter state.");
    if (eligibility.outsideEncounter)
        return null;
    const current = readSceneInitiativeState(scene);
    return writeSceneInitiativeState(spendTurnAction(current, actorInitiativeRef(actor), getActorConditionRules(actor)), scene);
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
export async function writeSceneInitiativeState(state, scene = activeScene()) {
    const normalized = normalizeInitiativeState(state);
    fallbackState = normalized;
    if (scene?.setFlag)
        await scene.setFlag(SYSTEM_ID, FLAG_KEY, normalized);
    else if (scene) {
        scene.flags ??= {};
        scene.flags[SYSTEM_ID] ??= {};
        scene.flags[SYSTEM_ID][FLAG_KEY] = normalized;
    }
    await rerenderAllRenderedCharacterSheets();
    notifyStateListeners();
    return normalized;
}
export async function resetSceneInitiative(scene = activeScene()) {
    const current = readSceneInitiativeState(scene);
    await endRuleEncounter(scene);
    return writeSceneInitiativeState(emptyInitiativeState(current.mode), scene);
}
export async function setSceneInitiativeMode(mode, scene = activeScene()) {
    return writeSceneInitiativeState(setInitiativeMode(readSceneInitiativeState(scene), mode), scene);
}
export async function rollActorInitiative(actor, side, skill, scene = activeScene()) {
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
    const state = await writeSceneInitiativeState(recordInitiativeEntry(current, entry), scene);
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
export async function startSceneInitiative(scene = activeScene()) {
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
    return writeSceneInitiativeState(next, scene);
}
export async function startNextSceneInitiativeRound(options = {}, scene = activeScene()) {
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
    return writeSceneInitiativeState(next, scene);
}
export async function waiveSceneInitiativeActivation(activationId, scene = activeScene()) {
    return writeSceneInitiativeState(waiveInitiativeActivation(readSceneInitiativeState(scene), activationId), scene);
}
export async function restoreSceneInitiativeActivation(activationId, scene = activeScene()) {
    return writeSceneInitiativeState(restoreInitiativeActivation(readSceneInitiativeState(scene), activationId), scene);
}
export async function endSceneInitiativeEncounter(scene = activeScene()) {
    const next = await writeSceneInitiativeState(endInitiativeEncounter(readSceneInitiativeState(scene)), scene);
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
export async function claimSceneInitiativeSlot(actor, scene = activeScene()) {
    requireActorCanActivate(actor);
    const current = readSceneInitiativeState(scene);
    const { ref, entry } = entryForActorOrThrow(current, actor);
    return writeSceneInitiativeState(claimCurrentInitiativeSlot(current, ref, actor?.name ?? entry.label, entry.side), scene);
}
export async function forceClaimSceneInitiativeActor(actorRef, scene = activeScene()) {
    const current = readSceneInitiativeState(scene);
    const entry = initiativeEntryForActor(current, actorRef);
    if (!entry)
        throw new Error("Encounter participant not found.");
    const actor = resolveInitiativeActorReference(actorRef);
    const mustOverride = !actor || !getActorActivationEligibility(actor).allowed;
    return writeSceneInitiativeState(forceClaimInitiativeActor(current, actorRef, entry.label, mustOverride), scene);
}
export async function claimSceneInitiativeActivation(activationId, scene = activeScene()) {
    const current = readSceneInitiativeState(scene);
    const activation = current.activationEntitlements.find((row) => row.id === activationId);
    if (!activation)
        throw new Error("Activation entitlement not found.");
    const actor = resolveInitiativeActorReference(activation.actorRef);
    if (!actor)
        throw new Error("Encounter Actor could not be resolved.");
    requireActorCanActivate(actor);
    return writeSceneInitiativeState(forceClaimInitiativeActivation(current, activationId), scene);
}
export async function forceClaimSceneInitiativeActivation(activationId, scene = activeScene()) {
    return writeSceneInitiativeState(forceClaimInitiativeActivation(readSceneInitiativeState(scene), activationId), scene);
}
export async function unclaimSceneInitiative(scene = activeScene()) {
    return writeSceneInitiativeState(unclaimInitiativeTurn(readSceneInitiativeState(scene)), scene);
}
export async function markSceneActorActed(actorRef, scene = activeScene()) {
    return writeSceneInitiativeState(markInitiativeActorActed(readSceneInitiativeState(scene), actorRef), scene);
}
export async function markSceneActorUnacted(actorRef, scene = activeScene()) {
    return writeSceneInitiativeState(markInitiativeActorUnacted(readSceneInitiativeState(scene), actorRef), scene);
}
export async function setSceneParticipantStatus(actorRef, status, scene = activeScene()) {
    return writeSceneInitiativeState(setInitiativeParticipantStatus(readSceneInitiativeState(scene), actorRef, status), scene);
}
export function getSceneEncounterOutcome(scene = activeScene()) {
    return encounterOutcome(readSceneInitiativeState(scene));
}
export async function setSceneSlotSide(index, side, scene = activeScene()) {
    return writeSceneInitiativeState(setInitiativeSlotSide(readSceneInitiativeState(scene), index, side), scene);
}
export async function moveSceneSlot(index, delta, scene = activeScene()) {
    return writeSceneInitiativeState(moveInitiativeSlot(readSceneInitiativeState(scene), index, delta), scene);
}
export async function rewindSceneInitiativeTurn(scene = activeScene()) {
    return writeSceneInitiativeState(rewindInitiativeTurn(readSceneInitiativeState(scene)), scene);
}
export async function adjustSceneInitiativeRound(delta, scene = activeScene()) {
    return writeSceneInitiativeState(adjustInitiativeRound(readSceneInitiativeState(scene), delta), scene);
}
export async function useSceneTurnAction(actor, scene = activeScene()) {
    const eligibility = getSceneTurnActionEligibility(actor, "action", scene);
    if (!eligibility.allowed)
        throw new Error(eligibility.reason || "Action is blocked.");
    const current = readSceneInitiativeState(scene);
    return writeSceneInitiativeState(spendTurnAction(current, actorInitiativeRef(actor), getActorConditionRules(actor)), scene);
}
export async function useSceneTurnManeuver(actor, scene = activeScene()) {
    const eligibility = getSceneTurnActionEligibility(actor, "maneuver", scene);
    if (!eligibility.allowed)
        throw new Error(eligibility.reason || "Maneuver is blocked.");
    const current = readSceneInitiativeState(scene);
    return writeSceneInitiativeState(spendTurnManeuver(current, actorInitiativeRef(actor), getActorConditionRules(actor)), scene);
}
export async function endSceneInitiativeTurn(actor, scene = activeScene()) {
    const current = readSceneInitiativeState(scene);
    const ref = actorInitiativeRef(actor);
    if (current.activeActorRef !== ref)
        throw new Error(`${actor?.name ?? "Actor"} does not own the active encounter turn.`);
    await advanceActorTurnConditions(actor);
    return writeSceneInitiativeState(completeCurrentInitiativeSlot(current, ref), scene);
}
export async function forceEndCurrentSceneTurn(scene = activeScene()) {
    const state = readSceneInitiativeState(scene);
    if (!state.activeActorRef)
        throw new Error("No active actor to end.");
    const actor = resolveInitiativeActorReference(state.activeActorRef);
    if (actor)
        await advanceActorTurnConditions(actor);
    return writeSceneInitiativeState(completeCurrentInitiativeSlot(state, state.activeActorRef), scene);
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
export async function addSceneInitiativeParticipant(actor, side, skill = "vigilance", scene = activeScene()) {
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
    return writeSceneInitiativeState(upsertInitiativeParticipant(current, entry), scene);
}
export async function removeSceneInitiativeParticipant(actorRef, scene = activeScene()) {
    return writeSceneInitiativeState(removeInitiativeParticipant(readSceneInitiativeState(scene), actorRef), scene);
}
//# sourceMappingURL=initiative-service.js.map