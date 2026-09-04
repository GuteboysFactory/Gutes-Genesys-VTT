import { canClaimCurrentSlot } from "../../domain/initiative/index.js";
import { narrativeHealthState } from "../../domain/encounter/index.js";
import { actorRoleLabel, normalizeActorRole, normalizeMinionGroup } from "../../domain/adversaries/index.js";
import { CORE_CONDITIONS } from "../../domain/conditions/index.js";
import { getActorConditionRules, getActorConditionSummary } from "../condition-service.js";
import { addSceneInitiativeParticipant, adjustSceneInitiativeRound, claimSceneInitiativeSlot, endSceneInitiativeEncounter, endSceneInitiativeTurn, forceClaimSceneInitiativeActor, claimSceneInitiativeActivation, forceEndCurrentSceneTurn, getActorActivationEligibility, getSceneTurnActionEligibility, markSceneActorActed, markSceneActorUnacted, moveSceneSlot, readSceneInitiativeState, removeSceneInitiativeParticipant, resetSceneInitiative, resolveInitiativeActorReference, rewindSceneInitiativeTurn, setSceneInitiativeMode, setSceneSlotSide, startSceneInitiative, startNextSceneInitiativeRound, setSceneParticipantStatus, getSceneEncounterOutcome, pendingSceneSpecialActivations, waiveSceneInitiativeActivation, restoreSceneInitiativeActivation, subscribeInitiativeState, unclaimSceneInitiative, useSceneTurnAction, useSceneTurnManeuver } from "../initiative-service.js";
const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
let trackerApp = null;
function canControlActor(actor) {
    if (game?.user?.isGM)
        return true;
    if (typeof actor?.testUserPermission === "function")
        return Boolean(actor.testUserPermission(game?.user, "OWNER"));
    return Boolean(actor?.isOwner);
}
function participantContext(state, entry) {
    const actor = resolveInitiativeActorReference(entry.actorRef);
    const wounds = Number(actor?.system?.wounds?.value ?? 0);
    const role = normalizeActorRole(actor?.system?.role ?? entry.actorRole);
    const minionGroup = role === "minion" ? normalizeMinionGroup({
        members: actor?.system?.minionGroup?.members ?? 1,
        memberWoundThreshold: actor?.system?.minionGroup?.memberWoundThreshold ?? 1,
        wounds,
        casualties: actor?.system?.minionGroup?.casualties ?? 0,
        groupSkillIds: actor?.system?.minionGroup?.groupSkillIds ?? []
    }) : null;
    const threshold = Number(minionGroup?.groupWoundThreshold ?? actor?.system?.wounds?.threshold ?? 0);
    const strain = Number(actor?.system?.strain?.value ?? 0);
    const strainThreshold = Number(actor?.system?.strain?.threshold ?? 0);
    const health = narrativeHealthState(wounds, threshold);
    const conditions = actor ? getActorConditionSummary(actor) : { active: [] };
    const conditionLabels = Array.isArray(conditions?.active)
        ? conditions.active.map((row) => CORE_CONDITIONS.find((def) => def.id === row.conditionId)?.label ?? row.conditionId)
        : [];
    const rules = actor ? getActorConditionRules(actor) : { canPerformActions: true, canPerformManeuvers: true };
    const actorEligibility = actor ? getActorActivationEligibility(actor) : { allowed: false, incapacitated: false, reason: "Actor unavailable." };
    const encounterStatus = entry.encounterStatus ?? "active";
    const encounterActive = encounterStatus === "active";
    const eligibility = canClaimCurrentSlot(state, entry.actorRef, entry.side);
    const isActive = state.activeActorRef === entry.actorRef;
    const acted = state.actedActorRefs.includes(entry.actorRef);
    const regularActivationRows = (state.activationEntitlements ?? []).filter((row) => row.actorRef === entry.actorRef && row.kind !== "gm-override");
    const totalRegularActivations = regularActivationRows.length || 1;
    let regularIndex = 0;
    const activations = (state.activationEntitlements ?? []).filter((row) => row.actorRef === entry.actorRef).map((row) => {
        const isRegular = row.kind !== "gm-override";
        if (isRegular)
            regularIndex += 1;
        const ordinal = isRegular ? regularIndex : 0;
        const allowedNow = encounterActive && actorEligibility.allowed;
        const isCurrentActivation = state.activeActivationId === row.id;
        return {
            ...row,
            ordinal,
            totalRegularActivations,
            activationLabel: isRegular ? `Activation ${ordinal}/${totalRegularActivations}` : "GM Override",
            statusLabel: isCurrentActivation ? "ACTIVE" : row.used ? "USED" : row.waived ? "WAIVED" : !encounterActive ? `BLOCKED — ${encounterStatus.replaceAll("-", " ")}` : !actorEligibility.allowed ? `BLOCKED — ${actorEligibility.reason}` : "AVAILABLE",
            active: isCurrentActivation,
            available: !state.activeActorRef && !isCurrentActivation && !row.used && !row.waived && allowedNow,
            unresolved: !row.used && !row.waived && !isCurrentActivation,
            blocked: !isCurrentActivation && !row.used && !row.waived && (!allowedNow || Boolean(state.activeActorRef)),
            canWaive: !isCurrentActivation && !row.used && !row.waived,
            canRestore: !isCurrentActivation && (row.used || row.waived),
            isExtra: row.kind === "extra",
            isBase: row.kind === "base",
            isGmOverride: row.kind === "gm-override",
            takeLabel: row.kind === "extra" ? "Take Extra Turn" : row.kind === "base" ? "Take Turn" : "Take GM Override"
        };
    });
    return {
        actorRef: entry.actorRef,
        label: entry.label,
        side: entry.side,
        sideLabel: entry.side.toUpperCase(),
        role,
        roleLabel: actorRoleLabel(role),
        minionMembersRemaining: minionGroup?.remainingMembers ?? null,
        minionMembersTotal: minionGroup?.members ?? null,
        silhouette: Number(actor?.system?.silhouette ?? 1),
        adversaryRank: Number(actor?.system?.adversaryRank ?? 0),
        extraActivations: Number(actor?.system?.extraActivations ?? entry.extraActivations ?? 0),
        activations,
        remainingActivations: activations.filter((row) => row.available).length,
        skillLabel: entry.skill === "cool" ? "Cool" : "Vigilance",
        success: entry.success,
        advantage: entry.advantage,
        isActive,
        acted,
        pending: !acted && !isActive,
        encounterStatus,
        encounterActive,
        statusActive: encounterStatus === "active",
        statusDefeated: encounterStatus === "defeated",
        statusOut: encounterStatus === "out-of-fight",
        statusDead: encounterStatus === "dead",
        encounterStatusLabel: encounterStatus === "out-of-fight" ? "OUT OF FIGHT" : encounterStatus.toUpperCase(),
        healthId: encounterStatus === "dead" ? "dead" : encounterStatus !== "active" ? "out" : actorEligibility.incapacitated ? "incapacitated" : health.id,
        healthLabel: encounterStatus === "dead" ? "Dead" : encounterStatus === "defeated" ? "Defeated" : encounterStatus === "out-of-fight" ? "Out of Fight" : actorEligibility.incapacitated ? "Incapacitated" : health.label,
        incapacitated: actorEligibility.incapacitated,
        activationBlockedReason: actorEligibility.reason,
        wounds,
        threshold,
        strain,
        strainThreshold,
        criticalCount: Array.isArray(actor?.system?.criticalInjuries) ? actor.system.criticalInjuries.filter((row) => !row?.healed).length : 0,
        conditionLabels,
        actionBlocked: !rules.canPerformActions,
        maneuverBlocked: !rules.canPerformManeuvers,
        canControl: canControlActor(actor),
        activationBudgetUsed: activations.filter((row) => row.kind !== "gm-override" && row.used).length,
        activationBudgetTotal: totalRegularActivations,
        canClaim: Boolean(encounterActive && eligibility.allowed && actorEligibility.allowed && canControlActor(actor)),
        claimReason: !encounterActive ? `Actor is ${encounterStatus.replaceAll("-", " ")}.` : actorEligibility.allowed ? eligibility.reason : actorEligibility.reason,
        hasActor: Boolean(actor)
    };
}
export class GenesysEncounterTracker extends HandlebarsApplicationMixin(ApplicationV2) {
    #unsubscribe = null;
    static DEFAULT_OPTIONS = {
        id: "genesys-encounter-tracker",
        classes: ["genesys-vtt", "genesys-encounter-tracker"],
        position: { width: 980, height: 720 },
        window: { title: "Genesys Encounter", resizable: true },
        actions: {
            startEncounter: this.#startEncounter,
            resetEncounter: this.#resetEncounter,
            endEncounter: this.#endEncounter,
            setModeSide: this.#setModeSide,
            setModePopcorn: this.#setModePopcorn,
            claimActor: this.#claimActor,
            forceClaimActor: this.#forceClaimActor,
            markActed: this.#markActed,
            markUnacted: this.#markUnacted,
            openActor: this.#openActor,
            useAction: this.#useAction,
            useManeuver: this.#useManeuver,
            endTurn: this.#endTurn,
            forceEndTurn: this.#forceEndTurn,
            unclaim: this.#unclaim,
            rewindTurn: this.#rewindTurn,
            roundDown: this.#roundDown,
            roundUp: this.#roundUp,
            slotUp: this.#slotUp,
            slotDown: this.#slotDown,
            slotToggleSide: this.#slotToggleSide,
            addSelectedTokens: this.#addSelectedTokens,
            removeParticipant: this.#removeParticipant,
            startNextRound: this.#startNextRound,
            waiveActivation: this.#waiveActivation,
            restoreActivation: this.#restoreActivation,
            useActivation: this.#useActivation,
            markDefeated: this.#markDefeated,
            markOutOfFight: this.#markOutOfFight,
            markDead: this.#markDead,
            reactivateParticipant: this.#reactivateParticipant
        }
    };
    static PARTS = {
        main: { template: "systems/genesys-vtt/templates/encounter/encounter-tracker.hbs" }
    };
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const state = readSceneInitiativeState();
        const participants = state.entries.map((entry) => participantContext(state, entry));
        const activeActor = state.activeActorRef ? resolveInitiativeActorReference(state.activeActorRef) : null;
        const activeRules = activeActor ? getActorConditionRules(activeActor) : { canPerformActions: true, canPerformManeuvers: true };
        const activeActionEligibility = activeActor ? getSceneTurnActionEligibility(activeActor, "action") : { allowed: false, reason: "No active actor." };
        const activeManeuverEligibility = activeActor ? getSceneTurnActionEligibility(activeActor, "maneuver") : { allowed: false, reason: "No active actor." };
        const isGM = Boolean(game?.user?.isGM);
        const outcome = getSceneEncounterOutcome();
        const activeRefs = new Set(state.entries.filter((entry) => (entry.encounterStatus ?? "active") === "active").map((entry) => entry.actorRef));
        const activeRegularActivations = state.activationEntitlements.filter((row) => row.kind !== "gm-override" && activeRefs.has(row.actorRef));
        const activePendingActivations = activeRegularActivations.filter((row) => !row.used && !row.waived);
        const pendingSpecials = pendingSceneSpecialActivations();
        return {
            ...context,
            isGM,
            state,
            collecting: state.status === "collecting",
            active: state.status === "active",
            ended: state.status === "ended",
            modeSide: state.mode === "side-slots",
            modePopcorn: state.mode === "popcorn",
            modeLabel: state.mode === "popcorn" ? "Popcorn Initiative" : "Core Side Slots",
            participants,
            participantCount: participants.length,
            activeParticipantCount: participants.filter((row) => row.encounterActive).length,
            actedCount: state.actedActorRefs.length,
            outcome,
            encounterComplete: state.status === "active" && outcome.complete,
            encounterOutcomeLabel: outcome.winner === "pc" ? "No active hostile NPCs remain" : outcome.winner === "npc" ? "No active PCs remain" : "No active participants remain",
            activationUsedCount: state.activationEntitlements.filter((row) => row.used).length,
            activationWaivedCount: state.activationEntitlements.filter((row) => row.waived).length,
            activationTotalCount: activeRegularActivations.length,
            pendingCount: activePendingActivations.length,
            pendingSpecialCount: pendingSpecials.length,
            endRound: state.roundPhase === "end-round",
            round: state.round,
            nextRound: state.round + 1,
            turnNumber: state.turnNumber,
            totalTurns: isGM ? Math.max(1, activeRegularActivations.length) : Math.max(1, participants.filter((row) => row.encounterActive).length),
            activeActorLabel: state.activeActorLabel || "Awaiting claim",
            hasActiveActor: Boolean(state.activeActorRef),
            activeActorRef: state.activeActorRef,
            turn: state.turn,
            activeActionBlocked: Boolean(state.activeActorRef && !activeActionEligibility.allowed),
            activeManeuverBlocked: Boolean(state.activeActorRef && !activeManeuverEligibility.allowed),
            activeActionBlockedReason: activeActionEligibility.reason,
            activeManeuverBlockedReason: activeManeuverEligibility.reason,
            canUseAction: Boolean(state.activeActorRef && activeActionEligibility.allowed),
            canUseManeuver: Boolean(state.activeActorRef && activeManeuverEligibility.allowed),
            slots: state.slots.map((slot, index) => ({
                ...slot,
                index,
                number: index + 1,
                sideLabel: slot.side.toUpperCase(),
                active: state.mode === "side-slots" && state.status === "active" && index === state.activeSlotIndex,
                statusLabel: slot.completed ? "Complete" : slot.claimedLabel ? `Claimed: ${slot.claimedLabel}` : "Open"
            }))
        };
    }
    async _onRender(context, options) {
        await super._onRender(context, options);
        if (!this.#unsubscribe)
            this.#unsubscribe = subscribeInitiativeState(() => { if (this.rendered)
                void this.render({ force: true }); });
    }
    _onClose(options) {
        this.#unsubscribe?.();
        this.#unsubscribe = null;
        if (trackerApp === this)
            trackerApp = null;
        return super._onClose(options);
    }
    static actorRefFromTarget(target) {
        return String(target.closest("[data-actor-ref]")?.dataset.actorRef ?? "");
    }
    static slotIndexFromTarget(target) {
        return Number(target.closest("[data-slot-index]")?.dataset.slotIndex ?? -1);
    }
    static activationIdFromTarget(target) {
        return String(target.closest("[data-activation-id]")?.dataset.activationId ?? "");
    }
    static async #startEncounter() {
        try {
            await startSceneInitiative();
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #resetEncounter() { await resetSceneInitiative(); }
    static async #endEncounter() { await endSceneInitiativeEncounter(); }
    static async #setModeSide() {
        try {
            await setSceneInitiativeMode("side-slots");
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #setModePopcorn() {
        try {
            await setSceneInitiativeMode("popcorn");
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #claimActor(_event, target) {
        const ref = GenesysEncounterTracker.actorRefFromTarget(target);
        const actor = resolveInitiativeActorReference(ref);
        if (!actor)
            return;
        try {
            await claimSceneInitiativeSlot(actor);
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #forceClaimActor(_event, target) {
        const ref = GenesysEncounterTracker.actorRefFromTarget(target);
        try {
            await forceClaimSceneInitiativeActor(ref);
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #markActed(_event, target) {
        await markSceneActorActed(GenesysEncounterTracker.actorRefFromTarget(target));
    }
    static async #markUnacted(_event, target) {
        await markSceneActorUnacted(GenesysEncounterTracker.actorRefFromTarget(target));
    }
    static async #openActor(_event, target) {
        resolveInitiativeActorReference(GenesysEncounterTracker.actorRefFromTarget(target))?.sheet?.render?.(true);
    }
    static async #useAction() {
        const state = readSceneInitiativeState();
        const actor = resolveInitiativeActorReference(state.activeActorRef);
        if (!actor)
            return;
        try {
            await useSceneTurnAction(actor);
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #useManeuver() {
        const state = readSceneInitiativeState();
        const actor = resolveInitiativeActorReference(state.activeActorRef);
        if (!actor)
            return;
        try {
            await useSceneTurnManeuver(actor);
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #endTurn() {
        const state = readSceneInitiativeState();
        const actor = resolveInitiativeActorReference(state.activeActorRef);
        if (!actor)
            return;
        try {
            await endSceneInitiativeTurn(actor);
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #forceEndTurn() {
        try {
            await forceEndCurrentSceneTurn();
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #unclaim() { await unclaimSceneInitiative(); }
    static async #rewindTurn() { await rewindSceneInitiativeTurn(); }
    static async #roundDown() { await adjustSceneInitiativeRound(-1); }
    static async #roundUp() { await adjustSceneInitiativeRound(1); }
    static async #slotUp(_event, target) {
        await moveSceneSlot(GenesysEncounterTracker.slotIndexFromTarget(target), -1);
    }
    static async #slotDown(_event, target) {
        await moveSceneSlot(GenesysEncounterTracker.slotIndexFromTarget(target), 1);
    }
    static async #slotToggleSide(_event, target) {
        const index = GenesysEncounterTracker.slotIndexFromTarget(target);
        const state = readSceneInitiativeState();
        const slot = state.slots[index];
        if (slot)
            await setSceneSlotSide(index, slot.side === "pc" ? "npc" : "pc");
    }
    static async #startNextRound() {
        if (!game?.user?.isGM)
            return;
        try {
            const state = readSceneInitiativeState();
            const pending = pendingSceneSpecialActivations();
            if (!pending.length) {
                await startNextSceneInitiativeRound();
                return;
            }
            const DialogV2 = foundry?.applications?.api?.DialogV2;
            if (!DialogV2?.wait) {
                ui?.notifications?.warn?.(`${pending.length} special activation${pending.length === 1 ? " remains" : "s remain"}. Use or waive them before starting the next round.`);
                return;
            }
            const rows = pending.map((row) => `<li><strong>${String(row.actorLabel)}</strong> — ${String(row.sourceLabel)}</li>`).join("");
            const result = await DialogV2.wait({
                window: { title: `Round ${state.round} — Pending Special Activations` },
                content: `<section class="genesys-end-round-warning"><p><strong>${pending.length} special activation${pending.length === 1 ? " remains" : "s remain"}.</strong></p><ul>${rows}</ul><p>Starting Round ${state.round + 1} will explicitly waive these unused activations.</p></section>`,
                buttons: [
                    { action: "waive-start", label: `Waive & Start Round ${state.round + 1}` },
                    { action: "keep", label: "Keep Round Open", default: true }
                ],
                modal: true,
                rejectClose: false
            });
            if (result === "waive-start")
                await startNextSceneInitiativeRound({ waivePendingSpecials: true });
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #useActivation(_event, target) {
        if (!game?.user?.isGM)
            return;
        const id = GenesysEncounterTracker.activationIdFromTarget(target);
        if (!id)
            return;
        try {
            await claimSceneInitiativeActivation(id);
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
    static async #waiveActivation(_event, target) {
        if (!game?.user?.isGM)
            return;
        const id = GenesysEncounterTracker.activationIdFromTarget(target);
        if (id)
            await waiveSceneInitiativeActivation(id);
    }
    static async #restoreActivation(_event, target) {
        if (!game?.user?.isGM)
            return;
        const id = GenesysEncounterTracker.activationIdFromTarget(target);
        if (id)
            await restoreSceneInitiativeActivation(id);
    }
    static async #markDefeated(_event, target) {
        if (!game?.user?.isGM)
            return;
        const ref = GenesysEncounterTracker.actorRefFromTarget(target);
        if (ref)
            await setSceneParticipantStatus(ref, "defeated");
    }
    static async #markOutOfFight(_event, target) {
        if (!game?.user?.isGM)
            return;
        const ref = GenesysEncounterTracker.actorRefFromTarget(target);
        if (ref)
            await setSceneParticipantStatus(ref, "out-of-fight");
    }
    static async #markDead(_event, target) {
        if (!game?.user?.isGM)
            return;
        const ref = GenesysEncounterTracker.actorRefFromTarget(target);
        if (ref)
            await setSceneParticipantStatus(ref, "dead");
    }
    static async #reactivateParticipant(_event, target) {
        if (!game?.user?.isGM)
            return;
        const ref = GenesysEncounterTracker.actorRefFromTarget(target);
        if (ref)
            await setSceneParticipantStatus(ref, "active");
    }
    static async #addSelectedTokens() {
        if (!game?.user?.isGM)
            return;
        const selected = Array.isArray(canvas?.tokens?.controlled) ? canvas.tokens.controlled : [];
        if (!selected.length) {
            ui?.notifications?.warn?.("Select one or more tokens on the canvas first.");
            return;
        }
        const existing = new Set(readSceneInitiativeState().entries.map((row) => row.actorRef));
        let added = 0;
        for (const token of selected) {
            const actor = token?.actor;
            const ref = String(actor?.uuid ?? "");
            if (!actor || !ref || existing.has(ref))
                continue;
            await addSceneInitiativeParticipant(actor);
            existing.add(ref);
            added += 1;
        }
        if (added)
            ui?.notifications?.info?.(`Added ${added} participant${added === 1 ? "" : "s"} with manual initiative 0/0.`);
    }
    static async #removeParticipant(_event, target) {
        if (!game?.user?.isGM)
            return;
        const ref = GenesysEncounterTracker.actorRefFromTarget(target);
        if (ref)
            await removeSceneInitiativeParticipant(ref);
    }
}
export function openEncounterTracker() {
    if (!trackerApp)
        trackerApp = new GenesysEncounterTracker();
    void trackerApp.render({ force: true });
    return trackerApp;
}
export function getEncounterTracker() {
    return trackerApp;
}
//# sourceMappingURL=encounter-tracker.js.map