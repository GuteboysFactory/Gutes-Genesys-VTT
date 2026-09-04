import { activeCriticalCount, applyPermanentCharacteristicReduction, lookupCriticalInjury, rollCriticalInjury, rollCriticalSecondary, toCriticalInjuryState } from "../domain/criticals/index.js";
import { addActorCondition, removeConditionsBySource } from "./condition-service.js";
const CHARACTERISTICS = ["brawn", "agility", "intellect", "cunning", "presence", "willpower"];
function actorCriticals(actor) {
    const raw = actor?.system?.criticalInjuries;
    if (!Array.isArray(raw))
        return [];
    return raw.map((entry) => {
        const state = { ...entry };
        const definition = lookupCriticalInjury(Number(state.total ?? 1));
        // 0.0.9 stored Gruesome Injury as text only. 0.0.9-2 upgrades those unresolved entries to pending secondary resolution.
        if (definition.secondary && (!state.secondaryStatus || state.secondaryStatus === "none")) {
            state.secondaryStatus = "pending";
            state.secondaryKind = definition.secondary.kind;
            state.secondaryMode = definition.secondary.mode;
            state.secondaryAmount = definition.secondary.amount;
            state.secondaryMinimum = definition.secondary.minimum;
        }
        return state;
    });
}
function id() {
    const random = foundry?.utils?.randomID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `critical:${random}`;
}
function integer(value, fallback = 0) {
    const n = Number(value ?? fallback);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
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
    return value.length ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
function chooseDecisionUser(actor) {
    const users = Array.isArray(game?.users?.contents) ? game.users.contents : [];
    const activePlayerOwner = users.find((user) => user?.active && !user?.isGM && actor?.testUserPermission?.(user, "OWNER"));
    if (activePlayerOwner)
        return activePlayerOwner;
    if (game?.user?.isGM)
        return game.user;
    const activeGm = users.find((user) => user?.active && user?.isGM);
    return activeGm ?? game?.user;
}
function chooseGmUser() {
    if (game?.user?.isGM)
        return game.user;
    const users = Array.isArray(game?.users?.contents) ? game.users.contents : [];
    return users.find((user) => user?.active && user?.isGM) ?? game?.user;
}
async function waitDialog(user, config) {
    const DialogV2 = foundry?.applications?.api?.DialogV2;
    if (!DialogV2?.wait)
        return null;
    const currentUserId = game?.user?.id;
    if (user?.id && user.id !== currentUserId && typeof DialogV2.query === "function")
        return DialogV2.query(user, "wait", config);
    return DialogV2.wait(config);
}
function findCritical(actor, criticalId) {
    const states = actorCriticals(actor);
    const index = states.findIndex((entry) => entry.id === criticalId);
    if (index < 0)
        return null;
    return { states, index, state: states[index] };
}
export function getActorCriticalInjuries(actor) {
    return actorCriticals(actor).filter((entry) => entry.active !== false);
}
export function getActorCriticalModifier(actor) {
    return activeCriticalCount(getActorCriticalInjuries(actor)) * 10;
}
export async function inflictCriticalInjury(actor, modifiers = {}, sourceId = "core:critical-injury", rng = Math.random) {
    const current = actorCriticals(actor);
    const resolution = rollCriticalInjury({ ...modifiers, unresolvedCount: activeCriticalCount(current) }, rng);
    const state = toCriticalInjuryState(resolution, id(), sourceId);
    await actor.update({ "system.criticalInjuries": [...current, state] });
    const conditionTag = resolution.injury.tags?.find((tag) => tag.startsWith("condition:"));
    if (conditionTag) {
        const conditionId = conditionTag.slice("condition:".length);
        const untilHealed = resolution.injury.tags?.includes("duration:until-healed");
        await addActorCondition(actor, conditionId, {
            sourceId: `critical:${state.id}`,
            durationType: untilHealed ? "until-healed" : "turns",
            remaining: untilHealed ? 0 : 1
        });
    }
    return { resolution, state };
}
export async function resolveActorCriticalSecondary(actor, criticalId, rng = Math.random) {
    const found = findCritical(actor, criticalId);
    if (!found)
        throw new Error(`Critical Injury '${criticalId}' was not found.`);
    const injury = lookupCriticalInjury(found.state.total);
    if (!injury.secondary)
        throw new Error(`Critical Injury '${found.state.name}' has no secondary resolution.`);
    if (found.state.secondaryStatus === "applied")
        return found.state;
    if (found.state.secondaryStatus === "rolled" && found.state.affectedCharacteristic)
        return found.state;
    const secondary = rollCriticalSecondary(injury, rng);
    const next = {
        ...found.state,
        secondaryStatus: "rolled",
        secondaryKind: secondary.kind,
        secondaryMode: secondary.mode,
        secondaryRawRoll: secondary.rawRoll,
        secondaryRolledCharacteristic: secondary.characteristic,
        affectedCharacteristic: secondary.characteristic,
        secondaryAmount: secondary.amount,
        secondaryMinimum: secondary.minimum
    };
    found.states[found.index] = next;
    await actor.update({ "system.criticalInjuries": found.states });
    return next;
}
export async function applyActorCriticalSecondary(actor, criticalId, characteristicOverride) {
    const found = findCritical(actor, criticalId);
    if (!found)
        throw new Error(`Critical Injury '${criticalId}' was not found.`);
    const state = found.state;
    if (state.secondaryStatus === "applied")
        return state;
    const rolledCharacteristic = (state.secondaryRolledCharacteristic || state.affectedCharacteristic);
    const characteristic = characteristicOverride ?? rolledCharacteristic;
    if (!CHARACTERISTICS.includes(characteristic))
        throw new Error("Resolve the Critical secondary roll before applying it.");
    if (state.secondaryMode !== "permanent-characteristic-reduction")
        throw new Error(`Unsupported secondary mode '${state.secondaryMode}'.`);
    const amount = Math.max(0, integer(state.secondaryAmount, 1));
    const minimum = Math.max(0, integer(state.secondaryMinimum, 1));
    const before = Math.max(0, integer(actor?.system?.characteristics?.[characteristic], minimum));
    const after = applyPermanentCharacteristicReduction(before, amount, minimum);
    const next = {
        ...state,
        secondaryStatus: "applied",
        affectedCharacteristic: characteristic,
        secondaryBefore: before,
        secondaryAfter: after,
        secondaryOverridden: Boolean(characteristicOverride && characteristicOverride !== rolledCharacteristic)
    };
    found.states[found.index] = next;
    await actor.update({
        [`system.characteristics.${characteristic}`]: after,
        "system.criticalInjuries": found.states
    });
    return next;
}
async function promptGmCharacteristicOverride(actor, state) {
    const buttons = CHARACTERISTICS.map((characteristic) => ({ action: characteristic, label: capitalize(characteristic) }));
    const result = await waitDialog(chooseGmUser(), {
        window: { title: `${actor?.name ?? "Actor"} — GM Override` },
        content: `<section class="genesys-critical-secondary-dialog"><p><strong>GM Override</strong></p><p>Select which characteristic is affected by <strong>${escapeHtml(state.name)}</strong>.</p><p>The published result is random; this explicitly overrides the d10 result.</p></section>`,
        buttons: [...buttons, { action: "cancel", label: "Cancel", default: true }],
        modal: false,
        rejectClose: false
    });
    return CHARACTERISTICS.includes(String(result)) ? String(result) : null;
}
async function criticalSecondaryToChat(actor, state) {
    const rolledCharacteristic = capitalize(String(state.secondaryRolledCharacteristic || state.affectedCharacteristic || ""));
    const appliedCharacteristic = capitalize(String(state.affectedCharacteristic ?? ""));
    const overrideLine = state.secondaryOverridden ? `<p><strong>GM Override:</strong> ${escapeHtml(appliedCharacteristic)}</p>` : "";
    const content = `<section class="genesys-critical-secondary-card">
    <p><strong>${escapeHtml(actor?.name ?? "Actor")}</strong> resolves <strong>${escapeHtml(state.name)}</strong></p>
    <p><strong>d10:</strong> ${integer(state.secondaryRawRoll)} → <strong>${escapeHtml(rolledCharacteristic)}</strong></p>
    ${overrideLine}
    <p><strong>Permanent change:</strong> ${escapeHtml(appliedCharacteristic)} ${integer(state.secondaryBefore)} → ${integer(state.secondaryAfter)}</p>
  </section>`;
    await foundry.documents.ChatMessage.create({ content, speaker: { alias: actor?.name ?? "Genesys Critical" } });
}
async function promptApplyCriticalSecondary(actor, state) {
    const characteristic = state.affectedCharacteristic;
    const before = Math.max(0, integer(actor?.system?.characteristics?.[characteristic], 1));
    const after = applyPermanentCharacteristicReduction(before, integer(state.secondaryAmount, 1), integer(state.secondaryMinimum, 1));
    const result = await waitDialog(chooseDecisionUser(actor), {
        window: { title: `${actor?.name ?? "Actor"} — ${state.name}` },
        content: `<section class="genesys-critical-secondary-dialog">
      <h3>${escapeHtml(state.name)}</h3>
      <p><strong>d10 ${integer(state.secondaryRawRoll)} → ${escapeHtml(capitalize(characteristic))}</strong></p>
      <p>${escapeHtml(capitalize(characteristic))} will be permanently reduced by ${integer(state.secondaryAmount, 1)}.</p>
      <p><strong>${escapeHtml(capitalize(characteristic))}: ${before} → ${after}</strong></p>
      <p>This permanent Actor change is not committed until you choose Apply.</p>
    </section>`,
        buttons: [
            { action: "apply", label: "Apply" },
            { action: "override", label: "GM Override" },
            { action: "later", label: "Resolve Later", default: true }
        ],
        modal: false,
        rejectClose: false
    });
    if (result === "apply") {
        const applied = await applyActorCriticalSecondary(actor, state.id);
        await criticalSecondaryToChat(actor, applied);
        return applied;
    }
    if (result === "override") {
        const override = await promptGmCharacteristicOverride(actor, state);
        if (!override)
            return null;
        const applied = await applyActorCriticalSecondary(actor, state.id, override);
        await criticalSecondaryToChat(actor, applied);
        return applied;
    }
    return null;
}
export async function promptCriticalSecondaryResolution(actor, criticalId) {
    const found = findCritical(actor, criticalId);
    if (!found)
        return null;
    if (!found.state.secondaryKind || found.state.secondaryStatus === "none" || found.state.secondaryStatus === "applied")
        return found.state;
    let state = found.state;
    if (state.secondaryStatus === "pending") {
        const result = await waitDialog(chooseDecisionUser(actor), {
            window: { title: `${actor?.name ?? "Actor"} — Secondary Critical Resolution` },
            content: `<section class="genesys-critical-secondary-dialog">
        <h3>${escapeHtml(state.name)}</h3>
        <p>${escapeHtml(state.effect)}</p>
        <p>This Critical Injury requires an additional <strong>1d10</strong> roll before its permanent effect can be resolved.</p>
      </section>`,
            buttons: [
                { action: "roll", label: "Roll d10" },
                { action: "later", label: "Resolve Later", default: true }
            ],
            modal: false,
            rejectClose: false
        });
        if (result !== "roll")
            return null;
        state = await resolveActorCriticalSecondary(actor, criticalId);
    }
    if (state.secondaryStatus === "rolled")
        return promptApplyCriticalSecondary(actor, state);
    return state;
}
export async function healCriticalInjury(actor, criticalId) {
    const current = actorCriticals(actor);
    const next = current.filter((entry) => entry.id !== criticalId);
    if (next.length === current.length)
        return false;
    await actor.update({ "system.criticalInjuries": next });
    await removeConditionsBySource(actor, `critical:${criticalId}`);
    return true;
}
export function buildCriticalSheetRows(actor) {
    return getActorCriticalInjuries(actor).map((entry) => ({
        ...entry,
        severityLabel: entry.severity === "dead" ? "Dead" : `${entry.severity[0].toUpperCase()}${entry.severity.slice(1)}`,
        difficultyLabel: entry.difficulty === 0 ? "—" : `${entry.difficulty}`,
        needsSecondaryResolution: entry.secondaryStatus === "pending" || entry.secondaryStatus === "rolled",
        secondarySummary: entry.secondaryStatus === "pending"
            ? "Secondary resolution pending"
            : entry.secondaryStatus === "rolled"
                ? `d10 ${entry.secondaryRawRoll} → ${capitalize(String(entry.affectedCharacteristic ?? ""))} · awaiting Apply`
                : entry.secondaryStatus === "applied"
                    ? entry.secondaryOverridden
                        ? `d10 ${entry.secondaryRawRoll} → ${capitalize(String(entry.secondaryRolledCharacteristic ?? ""))} · GM Override → ${capitalize(String(entry.affectedCharacteristic ?? ""))} · ${entry.secondaryBefore} → ${entry.secondaryAfter}`
                        : `${capitalize(String(entry.affectedCharacteristic ?? ""))} ${entry.secondaryBefore} → ${entry.secondaryAfter}`
                    : ""
    }));
}
export async function criticalToChat(actor, result) {
    const r = result.resolution;
    const secondary = result.state.secondaryStatus === "pending"
        ? `<p><strong>Secondary resolution:</strong> Required before the permanent effect is committed.</p>`
        : "";
    const content = `<section class="genesys-critical-card">
    <p><strong>${actor?.name ?? "Actor"}</strong> suffers a Critical Injury</p>
    <p><strong>d100:</strong> ${r.rawRoll} · <strong>Total:</strong> ${r.total}</p>
    <p>Existing Criticals +${r.unresolvedBonus} · Vicious +${r.viciousBonus} · Extra activations +${r.extraActivationBonus}${r.flatModifier ? ` · Modifier ${r.flatModifier >= 0 ? "+" : ""}${r.flatModifier}` : ""}</p>
    <h3>${r.injury.name}</h3>
    <p><strong>Severity:</strong> ${r.injury.severity}${r.injury.difficulty ? ` · Healing difficulty ${r.injury.difficulty}` : ""}</p>
    <p>${r.injury.effect}</p>
    ${secondary}
  </section>`;
    await foundry.documents.ChatMessage.create({ content, speaker: { alias: actor?.name ?? "Genesys Critical" } });
}
//# sourceMappingURL=critical-service.js.map