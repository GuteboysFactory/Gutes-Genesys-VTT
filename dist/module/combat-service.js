import { rollNarrativePool } from "../domain/dice/index.js";
import { applyReactionToPendingCombat, buildCombatCommitPlan, createPendingCombatResolution, finalizePendingCombatResolution, prepareCombatWeaponAttack, resolveDamageCharacteristic, getCriticalActivationCapacity, criticalExtraActivations } from "../domain/combat/index.js";
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
import { applyMinionCritical, normalizeActorRole, normalizeMinionGroup, suffersAutomaticThresholdCritical } from "../domain/adversaries/index.js";
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
function chooseActorDecisionUser(actor) {
    const users = Array.isArray(game?.users?.contents) ? game.users.contents : [];
    const activePlayerOwner = users.find((user) => user?.active && !user?.isGM && actor?.testUserPermission?.(user, "OWNER"));
    if (activePlayerOwner)
        return activePlayerOwner;
    if (game?.user?.isGM)
        return game.user;
    const activeGm = users.find((user) => user?.active && user?.isGM);
    return activeGm ?? game?.user;
}
async function promptCriticalActivation(attacker, target, resolution) {
    const capacity = getCriticalActivationCapacity(resolution);
    if (!capacity.eligible)
        return 0;
    const DialogV2 = foundry?.applications?.api?.DialogV2;
    if (!DialogV2?.wait)
        return 0;
    const minionTarget = normalizeActorRole(target?.system?.role) === "minion";
    const selectableActivations = minionTarget ? Math.min(1, capacity.maxActivations) : capacity.maxActivations;
    const sourceBits = [
        capacity.byAdvantage ? `${capacity.byAdvantage} via Advantage` : "",
        capacity.byTriumph ? `${capacity.byTriumph} via Triumph` : ""
    ].filter(Boolean).join(" · ");
    const buttons = Array.from({ length: selectableActivations }, (_, index) => {
        const count = index + 1;
        const bonus = criticalExtraActivations(count) * 10;
        return {
            action: `critical:${count}`,
            label: minionTarget ? "Inflict Critical — Remove 1 Minion" : count === 1 ? "Inflict Critical" : `Inflict Critical (+${bonus})`
        };
    });
    const config = {
        window: { title: `${attacker?.name ?? "Attacker"} — Critical Available` },
        content: `<section class="genesys-critical-spend-dialog">
      <p><strong>${escapeHtml(attacker?.name ?? "Attacker")}</strong> can inflict a Critical on <strong>${escapeHtml(target?.name ?? "Target")}</strong>.</p>
      <p><strong>Weapon Crit:</strong> ${resolution.criticalRating}</p>
      <p><strong>Available activations:</strong> ${capacity.maxActivations}${sourceBits ? ` · ${escapeHtml(sourceBits)}` : ""}</p>
      ${minionTarget ? "<p>A Critical removes one minion from the group. Extra same-hit Critical activations do not create additional Critical Injuries.</p>" : "<p>Each activation beyond the first adds <strong>+10</strong> to the single Critical Injury roll.</p>"}
    </section>`,
        buttons: [...buttons, { action: "skip", label: "Do Not Crit", default: true }],
        modal: true,
        rejectClose: false
    };
    const decisionUser = chooseActorDecisionUser(attacker);
    const currentUserId = game?.user?.id;
    const result = decisionUser?.id && decisionUser.id !== currentUserId && typeof DialogV2.query === "function"
        ? await DialogV2.query(decisionUser, "wait", config)
        : await DialogV2.wait(config);
    const match = /^critical:(\d+)$/.exec(String(result ?? ""));
    if (!match)
        return 0;
    return Math.max(0, Math.min(selectableActivations, n(match[1])));
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
    const criticalActivations = await promptCriticalActivation(attacker, target, resolution);
    let activatedCritical = null;
    if (criticalActivations > 0) {
        if (normalizeActorRole(target?.system?.role) === "minion") {
            const snapshot = actorCombatSnapshot(target);
            const group = normalizeMinionGroup({
                members: snapshot.minionGroup?.members ?? 1,
                memberWoundThreshold: snapshot.minionGroup?.memberWoundThreshold ?? 1,
                casualties: snapshot.minionGroup?.casualties ?? 0,
                wounds: snapshot.woundsValue,
                groupSkillIds: snapshot.minionGroup?.groupSkillIds ?? []
            });
            let next = group;
            for (let i = 0; i < criticalActivations; i += 1)
                next = applyMinionCritical(next);
            await target.update({ "system.wounds.value": next.wounds, "system.minionGroup.casualties": next.casualties });
            activatedCritical = {
                kind: "minion-critical",
                activations: criticalActivations,
                woundsAdded: next.wounds - group.wounds,
                casualtiesAdded: Math.max(0, next.casualties - group.casualties),
                remainingMembers: next.remainingMembers
            };
        }
        else {
            const viciousRank = prepared.preparedWeaponAttack.weapon.qualities.find((quality) => quality.id === "vicious")?.rank ?? 0;
            activatedCritical = await inflictCriticalInjury(target, {
                viciousRank,
                extraActivations: criticalExtraActivations(criticalActivations)
            }, "core:weapon-critical");
        }
        await rerenderRenderedCharacterSheet(target);
    }
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
    const critLine = resolution.criticalEligible
        ? `Critical eligible · Crit ${resolution.criticalRating} · Advantage activations ${resolution.criticalActivationsByAdvantage} · Triumph available ${resolution.criticalTriumphsAvailable}`
        : "Critical not eligible from this hit.";
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
        ? `<p><strong>Automatic Critical:</strong> ${committed.automaticCritical.state.name} · d100 ${committed.automaticCritical.resolution.rawRoll} → ${committed.automaticCritical.resolution.total} · ${committed.automaticCritical.state.effect}</p>`
        : "";
    const activatedCriticalLine = activatedCritical
        ? (activatedCritical.kind === "minion-critical"
            ? `<p><strong>Activated Critical:</strong> Minion group suffers ${activatedCritical.woundsAdded} additional wounds · ${activatedCritical.casualtiesAdded} minion(s) removed · ${activatedCritical.remainingMembers} remaining.</p>`
            : `<p><strong>Activated Critical:</strong> ${activatedCritical.state.name} · d100 ${activatedCritical.resolution.rawRoll} → ${activatedCritical.resolution.total} · ${activatedCritical.state.effect}</p>`)
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
    const content = `
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
      ${activatedCriticalLine}
    </section>`;
    await foundry.documents.ChatMessage.create({ content, speaker: { alias: attacker?.name ?? "Genesys Combat" } });
    if (committed.automaticCritical?.state?.secondaryStatus === "pending") {
        scheduleCriticalSecondaryPrompt(target, committed.automaticCritical.state.id);
    }
    if (activatedCritical?.state?.secondaryStatus === "pending") {
        scheduleCriticalSecondaryPrompt(target, activatedCritical.state.id);
    }
    return { prepared, result, pending, resolution, applied: { ...committed, activatedCritical, criticalActivations } };
}
//# sourceMappingURL=combat-service.js.map