import { normalizeActorRole } from "../adversaries/index.js";
function nonNegativeInteger(value) {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}
function blankTurn() {
    return { actionUsed: false, maneuversUsed: 0 };
}
function normalizeEncounterParticipantStatus(value) {
    return value === "defeated" || value === "out-of-fight" || value === "dead" ? value : "active";
}
function normalizedExtraActivations(role, value) {
    const count = nonNegativeInteger(value);
    // Core Nemesis Extra Activation grants one extra activation (two total turns/round).
    // More than one future/custom extra must come from a distinct rule source, not this Core switch.
    return normalizeActorRole(role) === "nemesis" ? Math.min(1, count) : count;
}
function baseActivationId(actorRef) {
    return `activation:${actorRef}:base`;
}
function extraActivationId(actorRef, index) {
    return `activation:${actorRef}:extra:${index + 1}`;
}
function makeBaseActivation(entry) {
    return {
        id: baseActivationId(entry.actorRef),
        actorRef: entry.actorRef,
        actorLabel: entry.label,
        side: entry.side,
        kind: "base",
        sourceId: "core:base-activation",
        sourceLabel: "Base Activation",
        gmOnly: false,
        used: false,
        waived: false
    };
}
function makeExtraActivation(entry, index) {
    const nemesis = entry.actorRole === "nemesis";
    const suffix = !nemesis && entry.extraActivations > 1 ? ` #${index + 1}` : "";
    return {
        id: extraActivationId(entry.actorRef, index),
        actorRef: entry.actorRef,
        actorLabel: entry.label,
        side: entry.side,
        kind: "extra",
        sourceId: nemesis ? "core:nemesis-extra-activation" : "custom:extra-activation",
        sourceLabel: `${nemesis ? "Nemesis Extra Activation" : "Extra Activation"}${suffix}`,
        // NPC/adversary extra activation sources are hidden from player-facing encounter UI.
        gmOnly: entry.side === "npc",
        used: false,
        waived: false
    };
}
export function buildActivationEntitlements(entries) {
    const out = [];
    for (const entry of entries) {
        out.push(makeBaseActivation(entry));
        const extras = normalizedExtraActivations(entry.actorRole, entry.extraActivations);
        for (let i = 0; i < extras; i += 1)
            out.push(makeExtraActivation({ ...entry, extraActivations: extras }, i));
    }
    return out;
}
function mergeStoredActivationState(entries, raw) {
    const built = buildActivationEntitlements(entries);
    if (!Array.isArray(raw))
        return built;
    const stored = new Map(raw.map((row) => [String(row?.id ?? ""), row]));
    const core = built.map((entry) => {
        const previous = stored.get(entry.id);
        return previous ? { ...entry, used: Boolean(previous.used), waived: Boolean(previous.waived) } : entry;
    });
    const validRefs = new Set(entries.map((entry) => entry.actorRef));
    const gmOverrides = raw
        .filter((row) => row?.kind === "gm-override" && validRefs.has(String(row?.actorRef ?? "")))
        .map((row) => ({
        id: String(row.id),
        actorRef: String(row.actorRef),
        actorLabel: String(row.actorLabel ?? "Actor"),
        side: row.side === "npc" ? "npc" : "pc",
        kind: "gm-override",
        sourceId: "gm:override",
        sourceLabel: "GM Override",
        gmOnly: true,
        used: Boolean(row.used),
        waived: Boolean(row.waived)
    }));
    return [...core, ...gmOverrides];
}
function baseActivation(state, actorRef) {
    return state.activationEntitlements.find((row) => row.actorRef === actorRef && row.kind === "base") ?? null;
}
export function participantEncounterStatus(state, actorRef) {
    return initiativeEntryForActor(state, actorRef)?.encounterStatus ?? "active";
}
export function participantIsEncounterActive(state, actorRef) {
    return participantEncounterStatus(state, actorRef) === "active";
}
export function activationForActor(state, actorRef) {
    if (!participantIsEncounterActive(state, actorRef))
        return null;
    return state.activationEntitlements.find((row) => row.actorRef === actorRef && row.id !== state.activeActivationId && !row.used && !row.waived) ?? null;
}
export function availableActivationsForActor(state, actorRef) {
    if (!participantIsEncounterActive(state, actorRef))
        return [];
    return state.activationEntitlements.filter((row) => row.actorRef === actorRef && row.id !== state.activeActivationId && !row.used && !row.waived);
}
export function unresolvedExtraActivations(state) {
    return state.activationEntitlements.filter((row) => row.kind !== "base" && !row.used && !row.waived && participantIsEncounterActive(state, row.actorRef));
}
export function usedActivationCount(state) {
    return state.activationEntitlements.filter((row) => row.used).length;
}
export function baseActivationCount(state) {
    return state.activationEntitlements.filter((row) => row.kind === "base").length;
}
function allBaseActivationsResolved(state) {
    const activeRefs = new Set(state.entries.filter((entry) => entry.encounterStatus === "active").map((entry) => entry.actorRef));
    const base = state.activationEntitlements.filter((row) => row.kind === "base" && activeRefs.has(row.actorRef));
    return base.every((row) => row.used || row.waived);
}
function actedRefsFromEntitlements(state) {
    const refs = [];
    for (const entry of state.entries) {
        const base = baseActivation(state, entry.actorRef);
        if (base && (base.used || base.waived))
            refs.push(entry.actorRef);
    }
    return refs;
}
export function emptyInitiativeState(mode = "side-slots") {
    return {
        version: 4,
        mode,
        status: "collecting",
        roundPhase: "turns",
        entries: [],
        slots: [],
        activationEntitlements: [],
        round: 0,
        turnNumber: 0,
        activeSlotIndex: 0,
        actedActorRefs: [],
        activeActorRef: "",
        activeActorLabel: "",
        activeActivationId: "",
        turn: blankTurn()
    };
}
function normalizeEntries(source) {
    return Array.isArray(source?.entries) ? source.entries.map((entry, index) => ({
        actorRef: String(entry?.actorRef ?? ""),
        label: String(entry?.label ?? entry?.actorRef ?? "Actor"),
        side: entry?.side === "npc" ? "npc" : "pc",
        skill: entry?.skill === "cool" ? "cool" : "vigilance",
        success: nonNegativeInteger(entry?.success),
        advantage: nonNegativeInteger(entry?.advantage),
        rollOrder: nonNegativeInteger(entry?.rollOrder ?? index),
        actorRole: normalizeActorRole(entry?.actorRole ?? (entry?.side === "npc" ? "rival" : "pc")),
        extraActivations: normalizedExtraActivations(entry?.actorRole ?? (entry?.side === "npc" ? "rival" : "pc"), entry?.extraActivations),
        encounterStatus: normalizeEncounterParticipantStatus(entry?.encounterStatus)
    })).filter((entry) => entry.actorRef) : [];
}
function normalizeStoredSlots(rawSlots, builtSlots, preserveState) {
    if (!preserveState || !Array.isArray(rawSlots) || rawSlots.length !== builtSlots.length)
        return builtSlots;
    const validRefs = new Set(builtSlots.map((slot) => slot.sourceActorRef));
    const stored = rawSlots.map((slot, index) => ({
        id: String(slot?.id ?? `slot:${index + 1}`),
        side: slot?.side === "npc" ? "npc" : "pc",
        success: nonNegativeInteger(slot?.success),
        advantage: nonNegativeInteger(slot?.advantage),
        sourceActorRef: String(slot?.sourceActorRef ?? ""),
        sourceLabel: String(slot?.sourceLabel ?? "Actor"),
        sourceSkill: slot?.sourceSkill === "cool" ? "cool" : "vigilance",
        claimedBy: String(slot?.claimedBy ?? ""),
        claimedLabel: String(slot?.claimedLabel ?? ""),
        completed: Boolean(slot?.completed)
    }));
    if (stored.some((slot) => !validRefs.has(slot.sourceActorRef)))
        return builtSlots;
    return stored;
}
export function normalizeInitiativeState(raw) {
    if (!raw || typeof raw !== "object")
        return emptyInitiativeState();
    const source = raw;
    const entries = normalizeEntries(source);
    const builtSlots = buildInitiativeSlots(entries);
    const status = source.status === "active" || source.status === "ended" ? source.status : "collecting";
    const mode = source.mode === "popcorn" ? "popcorn" : "side-slots";
    const slots = normalizeStoredSlots(source.slots, builtSlots, status !== "collecting");
    const activationEntitlements = mergeStoredActivationState(entries, source.activationEntitlements);
    // Migration from v2 actedActorRefs into v3 base activations.
    if (!Array.isArray(source.activationEntitlements) && Array.isArray(source.actedActorRefs)) {
        const acted = new Set(source.actedActorRefs.map(String));
        for (const row of activationEntitlements)
            if (row.kind === "base" && acted.has(row.actorRef))
                row.used = true;
    }
    const activeSlotIndex = Math.min(Math.max(0, nonNegativeInteger(source.activeSlotIndex)), Math.max(0, slots.length - 1));
    const round = status === "active" ? Math.max(1, nonNegativeInteger(source.round)) : nonNegativeInteger(source.round);
    const baseState = {
        version: 4,
        mode,
        status,
        roundPhase: source.roundPhase === "end-round" ? "end-round" : "turns",
        entries,
        slots,
        activationEntitlements,
        round,
        turnNumber: status === "active" ? Math.max(1, nonNegativeInteger(source.turnNumber) || 1) : 0,
        activeSlotIndex,
        actedActorRefs: [],
        activeActorRef: String(source.activeActorRef ?? ""),
        activeActorLabel: String(source.activeActorLabel ?? ""),
        activeActivationId: String(source.activeActivationId ?? ""),
        turn: {
            actionUsed: Boolean(source.turn?.actionUsed),
            maneuversUsed: Math.min(2, nonNegativeInteger(source.turn?.maneuversUsed))
        }
    };
    baseState.actedActorRefs = actedRefsFromEntitlements(baseState);
    // v2 active popcorn actor did not store an activation id; bind it to its base activation.
    if (baseState.activeActorRef && !baseState.activeActivationId) {
        const candidate = activationForActor(baseState, baseState.activeActorRef);
        baseState.activeActivationId = candidate?.id ?? "";
    }
    return baseState;
}
export function setInitiativeMode(state, mode) {
    if (state.status !== "collecting")
        throw new Error("Initiative mode can only be changed before the encounter starts.");
    return { ...state, mode: mode === "popcorn" ? "popcorn" : "side-slots" };
}
export function initiativeEntryFromRoll(input, rollOrder = 0) {
    const actorRef = String(input.actorRef ?? "").trim();
    if (!actorRef)
        throw new Error("Initiative actorRef is required.");
    const side = input.side === "npc" ? "npc" : "pc";
    return {
        actorRef,
        label: String(input.label ?? actorRef),
        side,
        skill: input.skill === "cool" ? "cool" : "vigilance",
        success: nonNegativeInteger(input.result?.net?.success),
        advantage: nonNegativeInteger(input.result?.net?.advantage),
        rollOrder: nonNegativeInteger(rollOrder),
        actorRole: normalizeActorRole(input.actorRole ?? (side === "npc" ? "rival" : "pc")),
        extraActivations: normalizedExtraActivations(input.actorRole ?? (side === "npc" ? "rival" : "pc"), input.extraActivations),
        encounterStatus: normalizeEncounterParticipantStatus(input.encounterStatus)
    };
}
export function sortInitiativeEntries(entries) {
    return [...entries].sort((a, b) => b.success - a.success
        || b.advantage - a.advantage
        || (a.side === b.side ? 0 : (a.side === "pc" ? -1 : 1))
        || a.rollOrder - b.rollOrder
        || a.actorRef.localeCompare(b.actorRef));
}
export function buildInitiativeSlots(entries) {
    return sortInitiativeEntries(entries).map((entry, index) => ({
        id: `slot:${index + 1}`,
        side: entry.side,
        success: entry.success,
        advantage: entry.advantage,
        sourceActorRef: entry.actorRef,
        sourceLabel: entry.label,
        sourceSkill: entry.skill,
        claimedBy: "",
        claimedLabel: "",
        completed: false
    }));
}
function refreshActivationDefinitions(state, entries) {
    const existing = new Map(state.activationEntitlements.map((row) => [row.id, row]));
    const activationEntitlements = buildActivationEntitlements(entries).map((row) => {
        const previous = existing.get(row.id);
        return previous ? { ...row, used: previous.used, waived: previous.waived } : row;
    });
    const next = { ...state, entries, activationEntitlements };
    return { ...next, actedActorRefs: actedRefsFromEntitlements(next) };
}
export function recordInitiativeEntry(state, entry) {
    if (state.status !== "collecting")
        throw new Error("Initiative rolls can only be changed while collecting initiative.");
    const index = state.entries.findIndex((current) => current.actorRef === entry.actorRef);
    const rollOrder = index >= 0
        ? state.entries[index].rollOrder
        : Math.max(-1, ...state.entries.map((current) => current.rollOrder)) + 1;
    const normalized = { ...entry, rollOrder };
    const entries = index >= 0
        ? state.entries.map((current, i) => i === index ? normalized : current)
        : [...state.entries, normalized];
    return refreshActivationDefinitions({ ...state, slots: buildInitiativeSlots(entries) }, entries);
}
export function removeInitiativeEntry(state, actorRef) {
    if (state.status !== "collecting")
        throw new Error("Initiative entries can only be removed while collecting initiative.");
    const entries = state.entries.filter((entry) => entry.actorRef !== actorRef);
    return refreshActivationDefinitions({ ...state, slots: buildInitiativeSlots(entries) }, entries);
}
function topInitiativeEntry(state) {
    return sortInitiativeEntries(state.entries)[0] ?? null;
}
function claimActivation(state, actorRef, actorLabel, activation) {
    return {
        ...state,
        activeActorRef: actorRef,
        activeActorLabel: actorLabel,
        activeActivationId: activation.id,
        turn: blankTurn()
    };
}
export function startInitiativeEncounter(state) {
    if (state.status !== "collecting")
        throw new Error("Initiative encounter is already active or ended.");
    if (!state.slots.length)
        throw new Error("At least one initiative roll is required before starting the encounter.");
    const activationEntitlements = buildActivationEntitlements(state.entries);
    let base = {
        ...state,
        version: 4,
        status: "active",
        roundPhase: "turns",
        activationEntitlements,
        round: 1,
        turnNumber: 1,
        activeSlotIndex: 0,
        actedActorRefs: [],
        activeActorRef: "",
        activeActorLabel: "",
        activeActivationId: "",
        slots: state.slots.map((slot) => ({ ...slot, claimedBy: "", claimedLabel: "", completed: false })),
        turn: blankTurn()
    };
    if (state.mode !== "popcorn")
        return base;
    const starter = topInitiativeEntry(base);
    if (!starter)
        return base;
    const activation = activationForActor(base, starter.actorRef);
    return activation ? claimActivation(base, starter.actorRef, starter.label, activation) : base;
}
export function currentInitiativeSlot(state) {
    if (state.status !== "active" || state.mode === "popcorn" || state.roundPhase === "end-round")
        return null;
    return state.slots[state.activeSlotIndex] ?? null;
}
export function initiativeEntryForActor(state, actorRef) {
    return state.entries.find((entry) => entry.actorRef === actorRef) ?? null;
}
export function canClaimCurrentSlot(state, actorRef, side) {
    if (state.status !== "active")
        return { allowed: false, reason: "Encounter is not active." };
    if (state.activeActorRef)
        return { allowed: false, reason: "The current turn is already claimed." };
    const entry = initiativeEntryForActor(state, actorRef);
    if (!entry)
        return { allowed: false, reason: "Actor is not an encounter participant." };
    if (entry.encounterStatus !== "active")
        return { allowed: false, reason: `Actor is ${entry.encounterStatus.replaceAll("-", " ")} and is out of normal encounter activations.` };
    const activation = activationForActor(state, actorRef);
    if (!activation)
        return { allowed: false, reason: "This actor has no available activation this round." };
    if (state.roundPhase === "end-round") {
        if (activation.kind === "base")
            return { allowed: false, reason: "Base activations are complete; GM must reopen or start the next round." };
        return { allowed: true };
    }
    if (state.mode === "popcorn")
        return { allowed: true };
    const slot = currentInitiativeSlot(state);
    if (!slot)
        return { allowed: false, reason: "No current side slot." };
    if (slot.side !== side)
        return { allowed: false, reason: `Current slot belongs to ${slot.side.toUpperCase()}.` };
    if (activation.kind !== "base")
        return { allowed: false, reason: "Core side slots claim base activations; extra activations are handled separately." };
    return { allowed: true };
}
export function claimCurrentInitiativeSlot(state, actorRef, actorLabel, side) {
    const eligibility = canClaimCurrentSlot(state, actorRef, side);
    if (!eligibility.allowed)
        throw new Error(eligibility.reason ?? "Actor cannot claim this turn.");
    const activation = activationForActor(state, actorRef);
    if (!activation)
        throw new Error("No available activation.");
    if (state.mode === "popcorn" || state.roundPhase === "end-round")
        return claimActivation(state, actorRef, actorLabel, activation);
    const slots = state.slots.map((slot, index) => index === state.activeSlotIndex
        ? { ...slot, claimedBy: actorRef, claimedLabel: actorLabel }
        : slot);
    return { ...claimActivation(state, actorRef, actorLabel, activation), slots };
}
function addGmOverrideActivation(state, actorRef, actorLabel) {
    const count = state.activationEntitlements.filter((row) => row.actorRef === actorRef && row.kind === "gm-override").length + 1;
    const entry = initiativeEntryForActor(state, actorRef);
    if (!entry)
        throw new Error("Actor is not an encounter participant.");
    const activation = {
        id: `activation:${actorRef}:gm-override:${count}`,
        actorRef,
        actorLabel,
        side: entry.side,
        kind: "gm-override",
        sourceId: "gm:override",
        sourceLabel: "GM Override",
        gmOnly: true,
        used: false,
        waived: false
    };
    return [{ ...state, activationEntitlements: [...state.activationEntitlements, activation] }, activation];
}
export function forceClaimInitiativeActivation(state, activationId) {
    if (state.status !== "active")
        throw new Error("Encounter is not active.");
    if (state.activeActorRef)
        throw new Error("End or unclaim the active turn before taking another activation.");
    const activation = state.activationEntitlements.find((row) => row.id === activationId);
    if (!activation)
        throw new Error("Activation entitlement not found.");
    if (activation.used || activation.waived)
        throw new Error("Activation entitlement is already resolved.");
    if (activation.id === state.activeActivationId)
        throw new Error("Activation entitlement is already active.");
    return claimActivation(state, activation.actorRef, activation.actorLabel, activation);
}
export function forceClaimInitiativeActor(state, actorRef, actorLabel, forceOverride = false) {
    if (state.status !== "active")
        throw new Error("Encounter is not active.");
    if (!initiativeEntryForActor(state, actorRef))
        throw new Error("Actor is not an encounter participant.");
    let working = state.activeActorRef ? unclaimInitiativeTurn(state) : state;
    let activation = forceOverride ? null : activationForActor(working, actorRef);
    if (!activation)
        [working, activation] = addGmOverrideActivation(working, actorRef, actorLabel);
    const actedActorRefs = working.actedActorRefs.filter((ref) => ref !== actorRef || activation.kind !== "base");
    if (working.mode === "popcorn" || working.roundPhase === "end-round") {
        return { ...claimActivation(working, actorRef, actorLabel, activation), actedActorRefs };
    }
    const slots = working.slots.map((slot, index) => index === working.activeSlotIndex
        ? { ...slot, claimedBy: actorRef, claimedLabel: actorLabel }
        : slot);
    return { ...claimActivation(working, actorRef, actorLabel, activation), slots, actedActorRefs };
}
export function unclaimInitiativeTurn(state) {
    if (state.status !== "active")
        return state;
    const clear = { ...state, activeActorRef: "", activeActorLabel: "", activeActivationId: "", turn: blankTurn() };
    if (state.mode === "popcorn" || state.roundPhase === "end-round")
        return clear;
    const slots = state.slots.map((slot, index) => index === state.activeSlotIndex
        ? { ...slot, claimedBy: "", claimedLabel: "", completed: false }
        : slot);
    return { ...clear, slots };
}
function requireActiveActor(state, actorRef) {
    if (state.status !== "active")
        throw new Error("No active initiative encounter.");
    if (!state.activeActorRef)
        throw new Error("The current turn has not been claimed.");
    if (state.activeActorRef !== actorRef)
        throw new Error("This actor does not own the current turn.");
}
export function spendTurnAction(state, actorRef, capability) {
    requireActiveActor(state, actorRef);
    if (!capability.canPerformActions)
        throw new Error("Actions are blocked by the actor's current conditions.");
    if (state.turn.actionUsed)
        throw new Error("The actor has already used an action this turn.");
    return { ...state, turn: { ...state.turn, actionUsed: true } };
}
export function spendTurnManeuver(state, actorRef, capability) {
    requireActiveActor(state, actorRef);
    if (!capability.canPerformManeuvers)
        throw new Error("Maneuvers are blocked by the actor's current conditions.");
    if (state.turn.maneuversUsed >= 2)
        throw new Error("An actor cannot perform more than two maneuvers on its turn.");
    return { ...state, turn: { ...state.turn, maneuversUsed: state.turn.maneuversUsed + 1 } };
}
function markActiveActivationUsed(state) {
    const id = state.activeActivationId;
    if (!id)
        return state;
    const activationEntitlements = state.activationEntitlements.map((row) => row.id === id ? { ...row, used: true, waived: false } : row);
    const next = { ...state, activationEntitlements };
    return { ...next, actedActorRefs: actedRefsFromEntitlements(next) };
}
function toEndRound(state) {
    return {
        ...state,
        roundPhase: "end-round",
        activeActorRef: "",
        activeActorLabel: "",
        activeActivationId: "",
        turnNumber: Math.max(1, usedActivationCount(state)),
        turn: blankTurn()
    };
}
export function completeCurrentInitiativeSlot(state, actorRef) {
    requireActiveActor(state, actorRef);
    let next = markActiveActivationUsed(state);
    next = { ...next, activeActorRef: "", activeActorLabel: "", activeActivationId: "", turn: blankTurn() };
    if (next.roundPhase === "end-round")
        return next;
    if (next.mode === "popcorn") {
        if (allBaseActivationsResolved(next))
            return toEndRound(next);
        return { ...next, turnNumber: usedActivationCount(next) + 1 };
    }
    const slots = next.slots.map((slot, index) => index === next.activeSlotIndex ? { ...slot, completed: true } : slot);
    const nextIndex = next.activeSlotIndex + 1;
    if (nextIndex < slots.length) {
        return { ...next, slots, activeSlotIndex: nextIndex, turnNumber: nextIndex + 1 };
    }
    return toEndRound({ ...next, slots });
}
export function startNextInitiativeRound(state, allowUnresolvedSpecials = false) {
    if (state.status !== "active")
        throw new Error("Encounter is not active.");
    if (state.activeActorRef)
        throw new Error("End or unclaim the active turn before starting the next round.");
    const unresolvedSpecials = unresolvedExtraActivations(state);
    if (unresolvedSpecials.length && !allowUnresolvedSpecials) {
        throw new Error(`${unresolvedSpecials.length} special activation${unresolvedSpecials.length === 1 ? " remains" : "s remain"}; use or waive before starting the next round.`);
    }
    const activationEntitlements = state.activationEntitlements
        .filter((row) => row.kind !== "gm-override")
        .map((row) => ({ ...row, used: false, waived: false }));
    let next = {
        ...state,
        round: state.round + 1,
        roundPhase: "turns",
        turnNumber: 1,
        activeSlotIndex: 0,
        activationEntitlements,
        actedActorRefs: [],
        activeActorRef: "",
        activeActorLabel: "",
        activeActivationId: "",
        slots: state.slots.map((slot) => ({ ...slot, claimedBy: "", claimedLabel: "", completed: false })),
        turn: blankTurn()
    };
    if (next.mode === "popcorn") {
        const starter = topInitiativeEntry(next);
        const activation = starter ? activationForActor(next, starter.actorRef) : null;
        if (starter && activation)
            next = claimActivation(next, starter.actorRef, starter.label, activation);
    }
    return next;
}
export function waiveInitiativeActivation(state, activationId) {
    if (state.status !== "active")
        return state;
    const activationEntitlements = state.activationEntitlements.map((row) => row.id === activationId ? { ...row, waived: true, used: false } : row);
    const next = { ...state, activationEntitlements };
    return { ...next, actedActorRefs: actedRefsFromEntitlements(next) };
}
export function restoreInitiativeActivation(state, activationId) {
    const activationEntitlements = state.activationEntitlements.map((row) => row.id === activationId ? { ...row, waived: false, used: false } : row);
    const next = { ...state, activationEntitlements, roundPhase: "turns" };
    return { ...next, actedActorRefs: actedRefsFromEntitlements(next) };
}
export function markInitiativeActorActed(state, actorRef) {
    const base = baseActivation(state, actorRef);
    if (!base)
        return state;
    const activationEntitlements = state.activationEntitlements.map((row) => row.id === base.id ? { ...row, used: true, waived: false } : row);
    let next = { ...state, activationEntitlements };
    next = { ...next, actedActorRefs: actedRefsFromEntitlements(next) };
    if (state.activeActorRef === actorRef)
        next = { ...next, activeActorRef: "", activeActorLabel: "", activeActivationId: "", turn: blankTurn() };
    return allBaseActivationsResolved(next) ? toEndRound(next) : next;
}
export function markInitiativeActorUnacted(state, actorRef) {
    const base = baseActivation(state, actorRef);
    if (!base)
        return state;
    const activationEntitlements = state.activationEntitlements.map((row) => row.id === base.id ? { ...row, used: false, waived: false } : row);
    const next = { ...state, activationEntitlements, roundPhase: "turns" };
    return { ...next, actedActorRefs: actedRefsFromEntitlements(next) };
}
export function setInitiativeSlotSide(state, index, side) {
    if (state.mode !== "side-slots")
        return state;
    if (index < 0 || index >= state.slots.length)
        return state;
    return { ...state, slots: state.slots.map((slot, i) => i === index ? { ...slot, side: side === "npc" ? "npc" : "pc" } : slot) };
}
export function moveInitiativeSlot(state, index, delta) {
    if (state.mode !== "side-slots")
        return state;
    const target = index + delta;
    if (index < 0 || index >= state.slots.length || target < 0 || target >= state.slots.length)
        return state;
    const slots = [...state.slots];
    [slots[index], slots[target]] = [slots[target], slots[index]];
    return { ...state, slots, activeSlotIndex: state.activeSlotIndex === index ? target : state.activeSlotIndex === target ? index : state.activeSlotIndex };
}
export function rewindInitiativeTurn(state) {
    if (state.status !== "active")
        return state;
    if (state.activeActorRef)
        return unclaimInitiativeTurn(state);
    if (state.mode === "popcorn") {
        const previousRef = state.actedActorRefs.at(-1);
        if (!previousRef)
            return state;
        const entry = initiativeEntryForActor(state, previousRef);
        const base = baseActivation(state, previousRef);
        if (!base)
            return state;
        const activationEntitlements = state.activationEntitlements.map((row) => row.id === base.id ? { ...row, used: false, waived: false } : row);
        const next = { ...state, activationEntitlements, roundPhase: "turns", turnNumber: Math.max(1, state.turnNumber - 1) };
        return { ...claimActivation(next, previousRef, entry?.label ?? "Actor", { ...base, used: false, waived: false }), actedActorRefs: actedRefsFromEntitlements(next) };
    }
    if (state.activeSlotIndex <= 0)
        return state;
    const previousIndex = state.activeSlotIndex - 1;
    const previousSlot = state.slots[previousIndex];
    const claimed = previousSlot?.claimedBy ?? "";
    let next = state;
    if (claimed)
        next = markInitiativeActorUnacted(next, claimed);
    const slots = next.slots.map((slot, index) => index === previousIndex ? { ...slot, completed: false } : slot);
    return {
        ...next,
        slots,
        roundPhase: "turns",
        activeSlotIndex: previousIndex,
        turnNumber: previousIndex + 1,
        activeActorRef: claimed,
        activeActorLabel: previousSlot?.claimedLabel ?? "",
        activeActivationId: claimed ? baseActivationId(claimed) : "",
        turn: blankTurn()
    };
}
export function adjustInitiativeRound(state, delta) {
    if (state.status !== "active")
        return state;
    return { ...state, round: Math.max(1, state.round + Math.trunc(delta || 0)) };
}
export function endInitiativeEncounter(state) {
    return { ...state, status: "ended", activeActorRef: "", activeActorLabel: "", activeActivationId: "", turn: blankTurn() };
}
/** GM/runtime participant management. Adds or replaces an entry without requiring collecting state. */
export function upsertInitiativeParticipant(state, entry) {
    if (state.status === "collecting")
        return recordInitiativeEntry(state, entry);
    const existingIndex = state.entries.findIndex((row) => row.actorRef === entry.actorRef);
    const rollOrder = existingIndex >= 0 ? state.entries[existingIndex].rollOrder : Math.max(-1, ...state.entries.map((row) => row.rollOrder)) + 1;
    const previousStatus = existingIndex >= 0 ? state.entries[existingIndex].encounterStatus : entry.encounterStatus;
    const normalized = { ...entry, rollOrder, encounterStatus: previousStatus ?? "active" };
    const entries = existingIndex >= 0 ? state.entries.map((row, index) => index === existingIndex ? normalized : row) : [...state.entries, normalized];
    let slots = state.slots;
    if (state.mode === "side-slots") {
        if (existingIndex >= 0) {
            slots = state.slots.map((slot) => slot.sourceActorRef === entry.actorRef
                ? { ...slot, side: normalized.side, success: normalized.success, advantage: normalized.advantage, sourceLabel: normalized.label, sourceSkill: normalized.skill }
                : slot);
        }
        else {
            const slot = buildInitiativeSlots([normalized])[0];
            slots = [...state.slots, { ...slot, id: `slot:${state.slots.length + 1}` }];
        }
    }
    return refreshActivationDefinitions({ ...state, slots }, entries);
}
export function setInitiativeParticipantStatus(state, actorRef, status) {
    const normalizedStatus = normalizeEncounterParticipantStatus(status);
    if (!initiativeEntryForActor(state, actorRef))
        return state;
    const entries = state.entries.map((entry) => entry.actorRef === actorRef ? { ...entry, encounterStatus: normalizedStatus } : entry);
    let next = { ...state, entries };
    if (normalizedStatus !== "active" && next.activeActorRef === actorRef) {
        next = { ...next, activeActorRef: "", activeActorLabel: "", activeActivationId: "", turn: blankTurn() };
    }
    if (normalizedStatus === "active") {
        const base = baseActivation(next, actorRef);
        if (next.roundPhase === "end-round" && base && !base.used && !base.waived)
            next = { ...next, roundPhase: "turns" };
    }
    else if (next.status === "active" && allBaseActivationsResolved(next)) {
        next = toEndRound(next);
    }
    return { ...next, actedActorRefs: actedRefsFromEntitlements(next) };
}
export function encounterOutcome(state) {
    const activePc = state.entries.filter((entry) => entry.side === "pc" && entry.encounterStatus === "active").length;
    const activeNpc = state.entries.filter((entry) => entry.side === "npc" && entry.encounterStatus === "active").length;
    if (activePc > 0 && activeNpc === 0)
        return { complete: true, winner: "pc", activePc, activeNpc, reason: "No active hostile NPC participants remain." };
    if (activeNpc > 0 && activePc === 0)
        return { complete: true, winner: "npc", activePc, activeNpc, reason: "No active PC participants remain." };
    if (activePc === 0 && activeNpc === 0 && state.entries.length)
        return { complete: true, winner: "none", activePc, activeNpc, reason: "No active encounter participants remain." };
    return { complete: false, winner: "none", activePc, activeNpc, reason: "" };
}
export function removeInitiativeParticipant(state, actorRef) {
    const entries = state.entries.filter((row) => row.actorRef !== actorRef);
    const slots = state.slots.filter((slot) => slot.sourceActorRef !== actorRef && slot.claimedBy !== actorRef);
    const activeRemoved = state.activeActorRef === actorRef;
    const activationEntitlements = state.activationEntitlements.filter((row) => row.actorRef !== actorRef);
    const next = {
        ...state,
        entries,
        activationEntitlements,
        slots: slots.map((slot, index) => ({ ...slot, id: `slot:${index + 1}` })),
        activeSlotIndex: Math.min(state.activeSlotIndex, Math.max(0, slots.length - 1)),
        turnNumber: state.status === "active" ? Math.min(Math.max(1, state.turnNumber), Math.max(1, activationEntitlements.length)) : 0,
        actedActorRefs: [],
        activeActorRef: activeRemoved ? "" : state.activeActorRef,
        activeActorLabel: activeRemoved ? "" : state.activeActorLabel,
        activeActivationId: activeRemoved ? "" : state.activeActivationId,
        turn: activeRemoved ? blankTurn() : state.turn
    };
    next.actedActorRefs = actedRefsFromEntitlements(next);
    return next;
}
//# sourceMappingURL=initiative.js.map