import { rollNarrativePool } from "../domain/dice/index.js";
import { applyReactionToPendingCombat, buildCombatCommitPlan, createPendingCombatResolution, finalizePendingCombatResolution, prepareCombatWeaponAttack, resolveDamageCharacteristic } from "../domain/combat/index.js";
import { getEligibleReactions } from "../domain/reactions/index.js";
import { normalizeWeaponRuleData } from "../domain/items/index.js";
import { formatPool, resultToChatHtml } from "./dice-ui.js";
import { poolTraceToHtml } from "./pool-ui.js";
import { prepareActorSkillCheck } from "./skill-ui.js";
import { buildActorReactionTags, collectActorReactions, promptReactionChoice } from "./reaction-service.js";
import { getActorConditionCheckModifiers } from "./condition-service.js";
import { inflictCriticalInjury, promptCriticalSecondaryResolution } from "./critical-service.js";
import { getRenderedActorResourceDebug, getRenderedActorFieldValue, rerenderRenderedCharacterSheet } from "./live-sheet-state.js";
import { consumeSceneEncounterAction } from "./initiative-service.js";
import { normalizeActorRole, normalizeMinionGroup, suffersAutomaticThresholdCritical } from "../domain/adversaries/index.js";
import { createCombatNarrativeSpendState, narrativeSpendMessageFlags, promptCombatNarrativeSpend, withNarrativeSpendSummary } from "./narrative-spend-service.js";

const scheduledSecondaryPrompts = new Set();
export function scheduleCriticalSecondaryPrompt(actor, criticalId) {
    const key = `${actor?.id ?? "actor"}:${criticalId}`;
    if (scheduledSecondaryPrompts.has(key))
        return;
    scheduledSecondaryPrompts.add(key);
    globalThis.setTimeout(() => {
        void promptCriticalSecondaryResolution(actor, criticalId)
            .catch((error) => {
            console.error("genesys-vtt | Critical secondary resolution prompt failed", { actor: actor?.name, criticalId, error });
            ui?.notifications?.warn?.(`Critical secondary effect pending on ${actor?.name ?? "target"}. Use Resolve Effect on the Critical Injury.`);
        })
            .finally(() => scheduledSecondaryPrompts.delete(key));
    }, 0);
}
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function capitalize(value) {
    const text = String(value ?? "");
    return text.length ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}
function n(value) {
    const x = Number(value ?? 0);
    return Number.isFinite(x) ? Math.max(0, Math.trunc(x)) : 0;
}
export async function flushRenderedDocumentSheet(document) {
    const sheet = document?.sheet;
    if (!sheet?.rendered || typeof sheet.submit !== "function")
        return false;
    await sheet.submit();
    return true;
}
function isSyntheticTokenActor(actor) {
    const uuid = String(actor?.uuid ?? "");
    return Boolean(actor?.isToken) || (uuid.startsWith("Scene.") && uuid.includes(".Token."));
}
function reacquireActor(actor) {
    if (isSyntheticTokenActor(actor))
        return actor;
    const id = actor?.id;
    return id ? (game?.actors?.get?.(id) ?? actor) : actor;
}
function reacquireEmbeddedItem(actor, item) {
    const id = item?.id;
    return id ? (actor?.items?.get?.(id) ?? item) : item;
}
function liveNumber(actor, path, fallback) {
    const visible = getRenderedActorFieldValue(actor, path);
    return n(visible === undefined ? fallback : visible);
}
export function actorCombatSnapshot(actor) {
    const role = normalizeActorRole(actor?.system?.role ?? (actor?.hasPlayerOwner ? "pc" : "rival"));
    const woundsValue = liveNumber(actor, "system.wounds.value", actor?.system?.wounds?.value);
    const minionGroup = role === "minion" ? {
        members: liveNumber(actor, "system.minionGroup.members", actor?.system?.minionGroup?.members ?? 1),
        memberWoundThreshold: liveNumber(actor, "system.minionGroup.memberWoundThreshold", actor?.system?.minionGroup?.memberWoundThreshold ?? 1),
        casualties: liveNumber(actor, "system.minionGroup.casualties", actor?.system?.minionGroup?.casualties ?? 0),
        groupSkillIds: Array.isArray(actor?.system?.minionGroup?.groupSkillIds) ? [...actor.system.minionGroup.groupSkillIds] : []
    } : undefined;
    const minionState = minionGroup ? normalizeMinionGroup({ ...minionGroup, wounds: woundsValue }) : null;
    return {
        role,
        ...(minionGroup ? { minionGroup } : {}),
        soak: liveNumber(actor, "system.soak", actor?.system?.soak),
        woundsValue,
        woundsThreshold: minionState?.groupWoundThreshold ?? liveNumber(actor, "system.wounds.threshold", actor?.system?.wounds?.threshold),
        strainValue: liveNumber(actor, "system.strain.value", actor?.system?.strain?.value),
        strainThreshold: liveNumber(actor, "system.strain.threshold", actor?.system?.strain?.threshold),
        meleeDefense: liveNumber(actor, "system.defense.melee", actor?.system?.defense?.melee),
        rangedDefense: liveNumber(actor, "system.defense.ranged", actor?.system?.defense?.ranged),
        silhouette: liveNumber(actor, "system.silhouette", actor?.system?.silhouette ?? 1),
        adversaryRank: liveNumber(actor, "system.adversaryRank", actor?.system?.adversaryRank ?? 0)
    };
}
export function combatLiveStateDebug(actor) {
    return getRenderedActorResourceDebug(actor);
}
function currentSceneTokens() {
    return Array.isArray(canvas?.tokens?.placeables) ? canvas.tokens.placeables : [];
}
function tokenId(token) {
    return String(token?.id ?? token?.document?.id ?? "");
}
function actorIdentity(actor) {
    return String(actor?.uuid ?? (actor?.id ? `Actor.${actor.id}` : ""));
}
export function resolveCombatTargetReference(reference) {
    const ref = String(reference ?? "");
    if (ref.startsWith("token:")) {
        const id = ref.slice(6);
        const token = canvas?.tokens?.get?.(id) ?? currentSceneTokens().find((entry) => tokenId(entry) === id);
        return token?.actor ?? null;
    }
    if (ref.startsWith("actor:"))
        return game?.actors?.get?.(ref.slice(6)) ?? null;
    return game?.actors?.get?.(ref) ?? null;
}
export function listCombatTargets(attacker) {
    const attackerIdentity = actorIdentity(attacker);
    const attackerIsToken = isSyntheticTokenActor(attacker);
    const tokens = currentSceneTokens();
    const representedBaseActorIds = new Set();
    const tokenTargets = [];
    for (const token of tokens) {
        const actor = token?.actor;
        const id = tokenId(token);
        if (!id || actor?.type !== "character")
            continue;
        const baseActorId = String(token?.document?.actorId ?? actor?.id ?? "");
        if (baseActorId)
            representedBaseActorIds.add(baseActorId);
        if (attackerIsToken) {
            if (actorIdentity(actor) === attackerIdentity)
                continue;
        }
        else if (baseActorId && baseActorId === String(attacker?.id ?? "")) {
            continue;
        }
        tokenTargets.push({
            id: `token:${id}`,
            name: `${token?.name ?? actor?.name ?? "Unnamed Token"} [Token]`,
            kind: "token",
            tokenId: id,
            actorId: baseActorId,
            actorUuid: actor?.uuid ?? null
        });
    }
    const actors = Array.isArray(game?.actors?.contents) ? game.actors.contents : [];
    const actorTargets = actors
        .filter((actor) => actor?.type === "character")
        .filter((actor) => actorIdentity(actor) !== attackerIdentity)
        .filter((actor) => !representedBaseActorIds.has(String(actor?.id ?? "")))
        .map((actor) => ({
        id: `actor:${actor.id}`,
        name: `${actor.name ?? "Unnamed Actor"} [Actor]`,
        kind: "actor",
        actorId: actor.id,
        actorUuid: actor?.uuid ?? null
    }));
    return [...tokenTargets, ...actorTargets];
}
export function prepareActorCombatAttack(attacker, item, target, targetRange, checkOptions = {}) {
    if (!item || item.type !== "weapon")
        throw new Error("A weapon Item is required.");
    if (!target || target.type !== "character")
        throw new Error("A character target Actor is required.");
    const weapon = normalizeWeaponRuleData(item.system ?? {});
    const characteristicIds = ["brawn", "agility", "intellect", "cunning", "willpower", "presence"];
    const liveCharacteristics = { ...(attacker?.system?.characteristics ?? {}) };
    for (const id of characteristicIds) {
        const visible = getRenderedActorFieldValue(attacker, `system.characteristics.${id}`);
        if (visible !== undefined)
            liveCharacteristics[id] = n(visible);
    }
    const liveAttacker = { ...attacker, system: { ...(attacker?.system ?? {}), characteristics: liveCharacteristics } };
    const skill = prepareActorSkillCheck(liveAttacker, weapon.skillId, 0, checkOptions.rankOverride, checkOptions.characteristicOverrideId);
    const damageCharacteristicId = resolveDamageCharacteristic(weapon);
    const damageCharacteristicValue = damageCharacteristicId ? n(liveCharacteristics?.[damageCharacteristicId]) : 0;
    const prepared = prepareCombatWeaponAttack({
        weaponName: item.name ?? "Weapon",
        weapon,
        actor: {
            characteristic: skill.characteristicValue,
            skillRank: skill.skillRank,
            damageCharacteristicValue,
            silhouette: n(getRenderedActorFieldValue(attacker, "system.silhouette") ?? attacker?.system?.silhouette ?? 1),
            label: skill.skillLabel
        },
        target: actorCombatSnapshot(target),
        targetRange,
        modifiers: getActorConditionCheckModifiers(attacker),
        contextTags: [weapon.equipped ? "equipped" : "unequipped", `target:${target.id}`]
    });
    return {
        ...prepared,
        checkContext: {
            skillId: skill.skillId,
            skillLabel: skill.skillLabel,
            characteristicId: skill.characteristicId,
            characteristicValue: skill.characteristicValue,
            appliedRuleLabel: String(checkOptions.appliedRuleLabel ?? ""),
            sourceId: String(checkOptions.sourceId ?? ""),
            ruleId: String(checkOptions.ruleId ?? "")
        },
        damageContext: {
            characteristicId: damageCharacteristicId,
            characteristicValue: damageCharacteristicValue
        }
    };
}
export function buildCombatReactionContext(prepared, pending, target, timing) {
    return {
        timing,
        tags: buildActorReactionTags(target, [
            "combat",
            `attack:${prepared.attackMode}`,
            pending.hit ? "hit" : "miss",
            `damage-track:${pending.damageTrack}`,
            `target-range:${prepared.targetRange}`
        ]),
        data: {
            attackMode: prepared.attackMode,
            targetRange: prepared.targetRange,
            incomingDamage: pending.originalDamage,
            damageBeforeSoak: pending.damageBeforeSoak,
            damageAfterSoak: pending.damageAfterSoak,
            soak: pending.soak,
            effectiveSoak: pending.effectiveSoak
        }
    };
}
export async function resolveCombatReactionWindow(prepared, pending, target, timing) {
    let current = pending;
    while (true) {
        const context = buildCombatReactionContext(prepared, current, target, timing);
        const all = collectActorReactions(target, context);
        const used = current.appliedReactions.map((reaction) => reaction.id);
        const eligible = getEligibleReactions(all, context, used);
        if (!eligible.length)
            return current;
        const choice = await promptReactionChoice(target, context, eligible, {
            incomingDamage: current.originalDamage,
            damageAfterReactions: current.damageBeforeSoak
        });
        if (!choice)
            return current;
        const reaction = eligible.find((entry) => entry.id === choice);
        if (!reaction)
            return current;
        current = applyReactionToPendingCombat(current, reaction);
    }
}
export async function commitPendingCombatResolutionToActor(target, prepared, pending) {
    target = reacquireActor(target);
    const live = actorCombatSnapshot(target);
    const commitPrepared = {
        ...prepared,
        target: {
            ...prepared.target,
            woundsValue: live.woundsValue,
            woundsThreshold: live.woundsThreshold,
            strainValue: live.strainValue,
            strainThreshold: live.strainThreshold
        }
    };
    const plan = buildCombatCommitPlan(commitPrepared, pending);
    if (!(target?.isOwner !== false || game?.user?.isGM))
        return { plan, applied: false };
    const update = {};
    if (plan.wounds)
        update["system.wounds.value"] = plan.wounds.after;
    if (plan.minionGroup)
        update["system.minionGroup.casualties"] = plan.minionGroup.casualtiesAfter;
    if (plan.strain)
        update["system.strain.value"] = plan.strain.after;
    if (Object.keys(update).length)
        await target.update(update);
    let automaticCritical = null;
    if (plan.wounds && suffersAutomaticThresholdCritical(plan.targetRole) && plan.wounds.before <= plan.wounds.threshold && plan.wounds.after > plan.wounds.threshold) {
        const viciousRank = prepared.preparedWeaponAttack.weapon.qualities.find((quality) => quality.id === "vicious")?.rank ?? 0;
        automaticCritical = await inflictCriticalInjury(target, { viciousRank }, "core:wound-threshold");
    }
    await rerenderRenderedCharacterSheet(target);
    return { plan, applied: true, automaticCritical };
}
export async function applyCombatResolutionToActor(target, resolution) {
    if (!resolution.hit || resolution.damageAfterSoak <= 0)
        return null;
    const track = resolution.damageTrack === "strain" ? "strain" : "wounds";
    const before = n(target?.system?.[track]?.value);
    const threshold = n(target?.system?.[track]?.threshold);
    const maxTrack = threshold > 0 ? threshold * 2 : before + resolution.damageAfterSoak;
    const after = Math.min(maxTrack, before + resolution.damageAfterSoak);
    await target.update({ [`system.${track}.value`]: after });
    return { before, damage: resolution.damageAfterSoak, after, threshold, incapacitated: after > threshold, maxTrack };
}
function reactionLines(pending) {
    if (!pending.appliedReactions.length)
        return "";
    return pending.appliedReactions.map((reaction) => {
        const reduction = reaction.effect.type === "reduce-damage" || reaction.effect.type === "reduce-post-soak-damage" ? n(reaction.effect.amount) : 0;
        const cost = reaction.cost.strain ? ` · Cost ${reaction.cost.strain} Strain` : "";
        return `<strong>${reaction.label.toUpperCase()}:</strong> ${reduction ? `-${reduction} Damage` : reaction.effect.type}${cost}<br />`;
    }).join("");
}
export async function rollActorCombatAttackToChat(attacker, item, target, targetRange, checkOptions = {}) {
    await flushRenderedDocumentSheet(item);
    attacker = reacquireActor(attacker);
    target = reacquireActor(target);
    item = reacquireEmbeddedItem(attacker, item);
    const prepared = prepareActorCombatAttack(attacker, item, target, targetRange, checkOptions);
    await consumeSceneEncounterAction(attacker);
    const result = rollNarrativePool(prepared.preparedWeaponAttack.check.construction.pool);
    let pending = createPendingCombatResolution(prepared, result);
    if (pending.hit)
        pending = await resolveCombatReactionWindow(prepared, pending, target, "pre-soak");
    pending = await resolveCombatReactionWindow(prepared, pending, target, "pre-commit");
    const committed = await commitPendingCombatResolutionToActor(target, prepared, pending);
    const resolution = finalizePendingCombatResolution(pending);

    const initialNarrativeState = createCombatNarrativeSpendState(attacker, target, prepared, resolution, committed.automaticCritical);
    const narrativeOutcome = await promptCombatNarrativeSpend(attacker, target, initialNarrativeState);
    const narrativeSpend = narrativeOutcome.state;
    const activatedCritical = narrativeOutcome.activatedCritical;
    const criticalActivations = n(narrativeSpend?.critical?.pendingActivations);

    const p = prepared.preparedWeaponAttack;
    const targetRole = normalizeActorRole(target?.system?.role);
    const strainConvertsToWounds = resolution.damageTrack === "strain" && (targetRole === "minion" || targetRole === "rival");
    const damageLine = resolution.hit
        ? `<strong>DAMAGE:</strong> ${pending.originalDamage}<br />`
            + reactionLines(pending)
            + (pending.preSoakDamageReduction > 0 ? `<strong>DAMAGE AFTER REACTIONS:</strong> ${pending.damageBeforeSoak}<br />` : "")
            + `<strong>SOAK:</strong> ${resolution.soak}<br />`
            + (resolution.pierce > 0 ? `<strong>PIERCE:</strong> ${resolution.pierce}<br />` : "")
            + (resolution.breach > 0 ? `<strong>BREACH:</strong> ${resolution.breach}<br />` : "")
            + `<strong>EFFECTIVE SOAK:</strong> ${resolution.effectiveSoak}<br />`
            + `<strong>POST-SOAK ${resolution.damageTrack.toUpperCase()} DAMAGE:</strong> ${resolution.damageAfterSoak}`
            + (strainConvertsToWounds ? `<br /><strong>${targetRole.toUpperCase()} RULE:</strong> Strain damage converts to Wounds` : "")
        : `<strong>DAMAGE:</strong> 0 · Miss — no damage.`;
    const canFundCritical = resolution.criticalEligible && (n(resolution.advantage) >= n(resolution.criticalRating) || n(resolution.triumph) > 0);
    const critLine = canFundCritical
        ? `Available as a Narrative Result spend · Crit ${resolution.criticalRating}`
        : resolution.criticalEligible
            ? `Hit is Critical-eligible, but this roll has insufficient Advantage/Triumph for a weapon Critical.`
            : "Critical Injury is not available from this hit.";
    const plan = committed.plan;
    const applications = [
        plan.wounds ? `Wounds: ${plan.wounds.before} → ${plan.wounds.after} / ${plan.wounds.threshold}${plan.wounds.incapacitated ? (plan.targetRole === "minion" || plan.targetRole === "rival" ? " · DEFEATED" : " · INCAPACITATED") : ""}${plan.wounds.after >= plan.wounds.maxTrack && plan.wounds.damage > 0 ? ` · WOUND CAP ${plan.wounds.maxTrack}` : ""}` : "",
        plan.strain ? `Strain: ${plan.strain.before} → ${plan.strain.after} / ${plan.strain.threshold}${plan.strain.incapacitated ? " · INCAPACITATED" : ""}${plan.strain.after >= plan.strain.maxTrack && plan.strain.damage > 0 ? ` · STRAIN CAP ${plan.strain.maxTrack}` : ""}` : "",
        plan.minionGroup ? `Minions: ${plan.minionGroup.beforeMembers} → ${plan.minionGroup.afterMembers}` : ""
    ].filter(Boolean).join(" · ");
    const appliedLine = committed.applied
        ? (applications || "No resource change.")
        : "Target resource not changed (no permission).";
    const autoCriticalLine = committed.automaticCritical
        ? `<p><strong>Automatic Critical — Wound Threshold exceeded:</strong> ${committed.automaticCritical.state.name} · d100 ${committed.automaticCritical.resolution.rawRoll} → ${committed.automaticCritical.resolution.total} · ${committed.automaticCritical.state.effect}</p>`
        : "";
    const checkContext = prepared.checkContext ?? {};
    const damageContext = prepared.damageContext ?? {};
    const checkRule = checkContext.appliedRuleLabel ? ` · ${escapeHtml(checkContext.appliedRuleLabel)}` : "";
    const checkSummary = checkContext.characteristicId
        ? `${escapeHtml(capitalize(checkContext.characteristicId))} ${checkContext.characteristicValue}${checkRule}`
        : "—";
    const damageSummary = damageContext.characteristicId
        ? `${escapeHtml(capitalize(damageContext.characteristicId))} ${damageContext.characteristicValue}`
        : "None";
    const baseContent = `
    <section class="genesys-constructed-check genesys-combat-check">
      <p><strong>${attacker?.name ?? "Attacker"}</strong> attacks <strong>${target?.name ?? "Target"}</strong> with <strong>${p.weaponName}</strong></p>
      <p><strong>Attack Mode:</strong> ${prepared.attackMode.toUpperCase()} · <strong>Skill:</strong> ${escapeHtml(checkContext.skillLabel || p.weapon.skillId)} · <strong>Check:</strong> ${checkSummary}</p>
      <p>Target range ${prepared.targetRange} · Range difficulty ${prepared.rangeDifficulty}${prepared.silhouetteDifficultyDelta ? ` · Silhouette ${prepared.silhouetteDifficultyDelta > 0 ? "+1" : "−1"} Difficulty` : ""} · Adversary ${prepared.adversaryRank} · Defense ${prepared.defense}</p>
      <p><strong>Damage Characteristic:</strong> ${damageSummary}</p>
      <p class="genesys-check-pool"><strong>Pool:</strong> ${formatPool(p.check.construction.pool)}</p>
      ${poolTraceToHtml(p.check.construction)}
      ${resultToChatHtml(result)}
      <hr />
      <p class="genesys-combat-damage">${damageLine}</p>
      <p><strong>Critical:</strong> ${critLine}</p>
      <p><strong>Applied:</strong> ${appliedLine}</p>
      ${autoCriticalLine}
    </section>`;
    const content = withNarrativeSpendSummary(baseContent, narrativeSpend);
    await foundry.documents.ChatMessage.create({
        content,
        speaker: { alias: attacker?.name ?? "Genesys Combat" },
        flags: narrativeSpendMessageFlags(narrativeSpend)
    });
    if (committed.automaticCritical?.state?.secondaryStatus === "pending")
        scheduleCriticalSecondaryPrompt(target, committed.automaticCritical.state.id);
    return {
        prepared,
        result,
        pending,
        resolution,
        narrativeSpend,
        applied: { ...committed, activatedCritical, criticalActivations }
    };
}
//# sourceMappingURL=combat-service.js.map
