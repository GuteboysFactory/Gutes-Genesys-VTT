import { getQualityDefinition } from "../domain/items/index.js";
import { applyMinionCritical, normalizeActorRole, normalizeMinionGroup } from "../domain/adversaries/index.js";
import { inflictCriticalInjury, promptCriticalSecondaryResolution } from "./critical-service.js";
import { rerenderRenderedCharacterSheet } from "./live-sheet-state.js";
import { SYSTEM_ID } from "./constants.js";

const SUMMARY_START = "<!-- genesys-narrative-spend:start -->";
const SUMMARY_END = "<!-- genesys-narrative-spend:end -->";
const scheduledSecondaryPrompts = new Set();

function n(value) {
    const x = Number(value ?? 0);
    return Number.isFinite(x) ? Math.max(0, Math.trunc(x)) : 0;
}
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function actorCanBeControlled(actor) {
    if (game?.user?.isGM)
        return true;
    if (typeof actor?.testUserPermission === "function")
        return Boolean(actor.testUserPermission(game?.user, "OWNER"));
    return Boolean(actor?.isOwner);
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
function cloneState(state) {
    return JSON.parse(JSON.stringify(state ?? {}));
}
function activeQualityRows(prepared, hit, targetSilhouette) {
    const qualities = prepared?.preparedWeaponAttack?.weapon?.qualities ?? [];
    return qualities.map((quality) => {
        const definition = getQualityDefinition(quality.id);
        if (!definition || definition.mode !== "active")
            return null;
        let advantageCost = hit ? 2 : null;
        if (quality.id === "guided" || quality.id === "blast")
            advantageCost = hit ? 2 : 3;
        if (quality.id === "knockdown" && hit)
            advantageCost = 2 + Math.max(0, n(targetSilhouette) - 1);
        if (quality.id === "auto-fire")
            advantageCost = null;
        if (quality.id === "sunder" && !hit)
            advantageCost = null;
        return {
            id: quality.id,
            label: definition.label,
            rank: n(quality.rank) || 1,
            advantageCost,
            triumphCost: 1,
            manualEffect: true
        };
    }).filter(Boolean);
}
function criticalSummary(critical) {
    if (!critical?.result)
        return "";
    if (critical.result.kind === "minion-critical")
        return `Minion Critical: ${critical.result.casualtiesAdded} minion removed · ${critical.result.remainingMembers} remaining`;
    return `${critical.result.name} · d100 ${critical.result.rawRoll} → ${critical.result.total}`;
}
function spendLabel(spend) {
    if (spend.type === "critical")
        return `${spend.amount} ${spend.symbol} → Critical Injury`;
    if (spend.type === "recover-strain")
        return `${spend.amount} Advantage → Recover ${spend.healed} Strain`;
    if (spend.type === "quality")
        return `${spend.amount} ${spend.symbol} → Activate ${spend.label}${spend.manualEffect ? " (manual effect)" : ""}`;
    if (spend.type === "narrative")
        return `${spend.amount} ${spend.symbol} → ${spend.note || "Other / Narrative Effect"}`;
    return spend.label ?? "Narrative spend";
}
function availableText(state) {
    const parts = [];
    if (n(state?.remaining?.advantage))
        parts.push(`${n(state.remaining.advantage)} Advantage`);
    if (n(state?.remaining?.triumph))
        parts.push(`${n(state.remaining.triumph)} Triumph`);
    return parts.length ? parts.join(" · ") : "None";
}
function rolledText(state) {
    const parts = [];
    if (n(state?.original?.advantage))
        parts.push(`${n(state.original.advantage)} Advantage`);
    if (n(state?.original?.triumph))
        parts.push(`${n(state.original.triumph)} Triumph`);
    return parts.join(" · ") || "No positive narrative results";
}
function automaticCriticalNote(state) {
    if (!state?.automaticCritical)
        return "";
    return `<p class="genesys-narrative-warning"><strong>${escapeHtml(state.targetName)}</strong> already suffered an <strong>Automatic Critical Injury</strong> because the attack exceeded Wound Threshold: <strong>${escapeHtml(state.automaticCritical.name)}</strong>. Spending Advantage or Triumph on Critical Injury below creates an <strong>additional</strong> Critical.</p>`;
}
function narrativeDialogContent(state) {
    const qualityRows = (state.activeQualities ?? []).map((quality) => `<li>${escapeHtml(quality.label)}${quality.rank > 1 ? ` ${quality.rank}` : ""}${quality.advantageCost ? ` — ${quality.advantageCost} Advantage` : ""} or 1 Triumph</li>`).join("");
    return `<section class="genesys-narrative-spend-dialog">
      <h2>Narrative Results Available</h2>
      <p><strong>Your roll generated ${escapeHtml(rolledText(state))}.</strong></p>
      <p>That is why the system is asking. These results can now be spent on effects that are legal for this attack. Critical Injury is only one possible spend.</p>
      ${automaticCriticalNote(state)}
      <p><strong>Remaining:</strong> ${escapeHtml(availableText(state))}</p>
      ${qualityRows ? `<p><strong>Active weapon qualities on this attack:</strong></p><ul>${qualityRows}</ul>` : ""}
      <p>You may also choose <strong>Other / Narrative Effect</strong> for a GM-approved use that is not automated here.</p>
    </section>`;
}
async function waitForDecision(user, config) {
    const DialogV2 = foundry?.applications?.api?.DialogV2;
    if (!DialogV2?.wait)
        return null;
    const currentUserId = game?.user?.id;
    if (user?.id && user.id !== currentUserId && typeof DialogV2.query === "function")
        return DialogV2.query(user, "wait", config);
    return DialogV2.wait(config);
}
async function promptOtherNarrativeSpend(state, decisionUser) {
    const DialogV2 = foundry?.applications?.api?.DialogV2;
    if (!DialogV2?.wait)
        return null;
    const canAdvantage = n(state.remaining.advantage) > 0;
    const canTriumph = n(state.remaining.triumph) > 0;
    const options = [
        canAdvantage ? `<option value="advantage">Advantage</option>` : "",
        canTriumph ? `<option value="triumph">Triumph</option>` : ""
    ].join("");
    if (!options)
        return null;
    const config = {
        window: { title: "Other / Narrative Effect" },
        content: `<section class="genesys-narrative-custom-spend">
          <p>Describe what you want the narrative result to do. The choice will be recorded in chat so everyone knows what was spent.</p>
          <label>Spend <select data-spend-symbol>${options}</select></label>
          <label>Amount <input data-spend-amount type="number" min="1" value="1" /></label>
          <label>Effect <textarea data-spend-note rows="3" placeholder="Describe the narrative effect..."></textarea></label>
        </section>`,
        buttons: [
            {
                action: "save",
                label: "Record Spend",
                callback: (_event, _button, dialog) => {
                    const root = dialog?.element;
                    return JSON.stringify({
                        symbol: String(root?.querySelector?.("[data-spend-symbol]")?.value ?? "advantage"),
                        amount: n(root?.querySelector?.("[data-spend-amount]")?.value) || 1,
                        note: String(root?.querySelector?.("[data-spend-note]")?.value ?? "").trim()
                    });
                }
            },
            { action: "cancel", label: "Cancel", default: true, callback: () => "" }
        ],
        modal: true,
        rejectClose: false
    };
    const raw = await waitForDecision(decisionUser, config);
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(String(raw));
        const symbol = parsed.symbol === "triumph" ? "triumph" : "advantage";
        const amount = Math.max(1, n(parsed.amount));
        const available = n(state.remaining[symbol]);
        if (amount > available)
            return null;
        return { symbol, amount, note: String(parsed.note ?? "").trim() };
    }
    catch {
        return null;
    }
}
function spendSymbol(state, symbol, amount) {
    const key = symbol === "triumph" ? "triumph" : "advantage";
    const cost = Math.max(1, n(amount));
    if (n(state.remaining[key]) < cost)
        return false;
    state.remaining[key] = n(state.remaining[key]) - cost;
    return true;
}
async function recoverStrain(attacker, state) {
    if (!attacker || n(state.remaining.advantage) < 1)
        return false;
    const before = n(attacker?.system?.strain?.value);
    if (before <= 0)
        return false;
    const after = Math.max(0, before - 1);
    await attacker.update({ "system.strain.value": after });
    spendSymbol(state, "advantage", 1);
    state.spends.push({ type: "recover-strain", symbol: "Advantage", amount: 1, healed: before - after });
    await rerenderRenderedCharacterSheet(attacker);
    return true;
}
function scheduleSecondaryPrompt(actor, criticalId) {
    if (!criticalId)
        return;
    const key = `${actor?.uuid ?? actor?.id ?? "actor"}:${criticalId}`;
    if (scheduledSecondaryPrompts.has(key))
        return;
    scheduledSecondaryPrompts.add(key);
    globalThis.setTimeout(() => {
        void promptCriticalSecondaryResolution(actor, criticalId)
            .catch((error) => {
            console.error("genesys-vtt | Narrative-spend Critical secondary resolution failed", { actor: actor?.name, criticalId, error });
            ui?.notifications?.warn?.(`Critical secondary effect pending on ${actor?.name ?? "target"}. Use Resolve Effect on the Critical Injury.`);
        })
            .finally(() => scheduledSecondaryPrompts.delete(key));
    }, 0);
}
async function applyPendingCritical(target, state) {
    const critical = state?.critical;
    const activations = n(critical?.pendingActivations);
    if (!target || !critical?.eligible || critical.resolved || activations <= 0)
        return null;
    let result;
    if (critical.targetRole === "minion") {
        const group = normalizeMinionGroup({
            members: n(target?.system?.minionGroup?.members ?? 1),
            memberWoundThreshold: n(target?.system?.minionGroup?.memberWoundThreshold ?? 1),
            casualties: n(target?.system?.minionGroup?.casualties ?? 0),
            wounds: n(target?.system?.wounds?.value),
            groupSkillIds: Array.isArray(target?.system?.minionGroup?.groupSkillIds) ? [...target.system.minionGroup.groupSkillIds] : []
        });
        const next = applyMinionCritical(group);
        await target.update({ "system.wounds.value": next.wounds, "system.minionGroup.casualties": next.casualties });
        result = {
            kind: "minion-critical",
            casualtiesAdded: Math.max(0, next.casualties - group.casualties),
            remainingMembers: next.remainingMembers
        };
    }
    else {
        const injury = await inflictCriticalInjury(target, {
            viciousRank: n(critical.viciousRank),
            extraActivations: Math.max(0, activations - 1)
        }, "core:weapon-critical");
        result = {
            kind: "critical-injury",
            id: injury?.state?.id ?? "",
            name: injury?.state?.name ?? "Critical Injury",
            rawRoll: injury?.resolution?.rawRoll ?? 0,
            total: injury?.resolution?.total ?? 0,
            effect: injury?.state?.effect ?? "",
            secondaryStatus: injury?.state?.secondaryStatus ?? ""
        };
        if (result.secondaryStatus === "pending")
            scheduleSecondaryPrompt(target, result.id);
    }
    critical.resolved = true;
    critical.result = result;
    await rerenderRenderedCharacterSheet(target);
    return result;
}
function addCriticalSpend(state, symbol) {
    const critical = state.critical;
    if (!critical?.eligible || critical.resolved)
        return false;
    if (critical.targetRole === "minion" && n(critical.pendingActivations) >= 1)
        return false;
    const cost = symbol === "triumph" ? 1 : n(critical.rating);
    if (cost <= 0 || !spendSymbol(state, symbol, cost))
        return false;
    critical.pendingActivations = n(critical.pendingActivations) + 1;
    state.spends.push({ type: "critical", symbol: symbol === "triumph" ? "Triumph" : "Advantage", amount: cost });
    return true;
}
function addQualitySpend(state, qualityId, symbol) {
    const quality = (state.activeQualities ?? []).find((row) => row.id === qualityId);
    if (!quality)
        return false;
    const cost = symbol === "triumph" ? 1 : n(quality.advantageCost);
    if (cost <= 0 || !spendSymbol(state, symbol, cost))
        return false;
    state.spends.push({
        type: "quality",
        symbol: symbol === "triumph" ? "Triumph" : "Advantage",
        amount: cost,
        qualityId,
        label: quality.label,
        rank: quality.rank,
        manualEffect: true
    });
    return true;
}
function buildButtons(state, attacker) {
    const buttons = [];
    const critical = state.critical;
    if (critical?.eligible && !critical.resolved && !(critical.targetRole === "minion" && n(critical.pendingActivations) >= 1)) {
        if (n(state.remaining.advantage) >= n(critical.rating) && n(critical.rating) > 0) {
            const bonus = n(critical.pendingActivations) * 10;
            buttons.push({ action: "critical-advantage", label: `Critical Injury — ${critical.rating} Advantage${bonus ? ` (+${bonus})` : ""}` });
        }
        if (n(state.remaining.triumph) >= 1) {
            const bonus = n(critical.pendingActivations) * 10;
            buttons.push({ action: "critical-triumph", label: `Critical Injury — 1 Triumph${bonus ? ` (+${bonus})` : ""}` });
        }
    }
    if (n(state.remaining.advantage) >= 1 && n(attacker?.system?.strain?.value) > 0)
        buttons.push({ action: "recover-strain", label: "Recover 1 Strain — 1 Advantage" });
    for (const quality of state.activeQualities ?? []) {
        if (quality.advantageCost && n(state.remaining.advantage) >= quality.advantageCost)
            buttons.push({ action: `quality-advantage:${quality.id}`, label: `Activate ${quality.label} — ${quality.advantageCost} Advantage` });
        if (n(state.remaining.triumph) >= 1)
            buttons.push({ action: `quality-triumph:${quality.id}`, label: `Activate ${quality.label} — 1 Triumph` });
    }
    if (n(state.remaining.advantage) > 0 || n(state.remaining.triumph) > 0)
        buttons.push({ action: "other", label: "Other / Narrative Effect" });
    buttons.push({ action: "done", label: "Done", default: true });
    return buttons;
}
export function createCombatNarrativeSpendState(attacker, target, prepared, resolution, automaticCritical = null) {
    const advantage = n(resolution?.advantage);
    const triumph = n(resolution?.triumph);
    const viciousRank = prepared?.preparedWeaponAttack?.weapon?.qualities?.find((quality) => quality.id === "vicious")?.rank ?? 0;
    const targetRole = normalizeActorRole(target?.system?.role);
    return {
        version: 1,
        kind: "combat-positive-results",
        attackerUuid: String(attacker?.uuid ?? ""),
        attackerName: String(attacker?.name ?? "Attacker"),
        targetUuid: String(target?.uuid ?? ""),
        targetName: String(target?.name ?? "Target"),
        weaponName: String(prepared?.preparedWeaponAttack?.weaponName ?? "Weapon"),
        hit: Boolean(resolution?.hit),
        original: { advantage, triumph },
        remaining: { advantage, triumph },
        activeQualities: activeQualityRows(prepared, Boolean(resolution?.hit), target?.system?.silhouette),
        critical: {
            eligible: Boolean(resolution?.criticalEligible),
            rating: n(resolution?.criticalRating),
            viciousRank: n(viciousRank),
            targetRole,
            pendingActivations: 0,
            resolved: false,
            result: null
        },
        automaticCritical: automaticCritical ? {
            name: String(automaticCritical?.state?.name ?? "Critical Injury"),
            rawRoll: n(automaticCritical?.resolution?.rawRoll),
            total: n(automaticCritical?.resolution?.total)
        } : null,
        spends: []
    };
}
export async function promptCombatNarrativeSpend(attacker, target, stateInput) {
    const state = cloneState(stateInput);
    if (n(state.original?.advantage) <= 0 && n(state.original?.triumph) <= 0)
        return { state, activatedCritical: null };
    const DialogV2 = foundry?.applications?.api?.DialogV2;
    if (!DialogV2?.wait)
        return { state, activatedCritical: null };
    const decisionUser = chooseActorDecisionUser(attacker);
    while (n(state.remaining.advantage) > 0 || n(state.remaining.triumph) > 0) {
        const decision = await waitForDecision(decisionUser, {
            window: { title: `${state.attackerName} — Narrative Results` },
            content: narrativeDialogContent(state),
            buttons: buildButtons(state, attacker),
            modal: true,
            rejectClose: false
        });
        const action = String(decision ?? "done");
        if (!action || action === "done")
            break;
        if (action === "critical-advantage") {
            addCriticalSpend(state, "advantage");
            continue;
        }
        if (action === "critical-triumph") {
            addCriticalSpend(state, "triumph");
            continue;
        }
        if (action === "recover-strain") {
            await recoverStrain(attacker, state);
            continue;
        }
        if (action.startsWith("quality-advantage:")) {
            addQualitySpend(state, action.slice("quality-advantage:".length), "advantage");
            continue;
        }
        if (action.startsWith("quality-triumph:")) {
            addQualitySpend(state, action.slice("quality-triumph:".length), "triumph");
            continue;
        }
        if (action === "other") {
            const custom = await promptOtherNarrativeSpend(state, decisionUser);
            if (custom && spendSymbol(state, custom.symbol, custom.amount)) {
                state.spends.push({
                    type: "narrative",
                    symbol: custom.symbol === "triumph" ? "Triumph" : "Advantage",
                    amount: custom.amount,
                    note: custom.note || "Other / Narrative Effect"
                });
            }
        }
    }
    const activatedCritical = await applyPendingCritical(target, state);
    return { state, activatedCritical };
}
export function renderNarrativeSpendSummary(state) {
    if (n(state?.original?.advantage) <= 0 && n(state?.original?.triumph) <= 0)
        return "";
    const spends = Array.isArray(state.spends) && state.spends.length
        ? `<ul>${state.spends.map((spend) => `<li>✓ ${escapeHtml(spendLabel(spend))}</li>`).join("")}</ul>`
        : "<p>No narrative results have been spent yet.</p>";
    const criticalResult = criticalSummary(state.critical);
    const remaining = n(state.remaining?.advantage) + n(state.remaining?.triumph);
    return `${SUMMARY_START}<section class="genesys-narrative-spend-summary" data-genesys-narrative-spend-summary>
      <hr />
      <p><strong>Narrative Results</strong></p>
      <p><strong>Rolled:</strong> ${escapeHtml(rolledText(state))}</p>
      ${spends}
      ${criticalResult ? `<p><strong>Critical Result:</strong> ${escapeHtml(criticalResult)}</p>` : ""}
      <p><strong>Remaining:</strong> ${escapeHtml(availableText(state))}</p>
      ${remaining > 0 ? `<button type="button" data-genesys-spend-results>Spend Remaining Results</button>` : ""}
    </section>${SUMMARY_END}`;
}
export function withNarrativeSpendSummary(content, state) {
    const summary = renderNarrativeSpendSummary(state);
    if (!summary)
        return content;
    const source = String(content ?? "");
    const start = source.indexOf(SUMMARY_START);
    const end = source.indexOf(SUMMARY_END);
    if (start >= 0 && end >= start)
        return source.slice(0, start) + summary + source.slice(end + SUMMARY_END.length);
    const closing = source.lastIndexOf("</section>");
    return closing >= 0 ? `${source.slice(0, closing)}${summary}${source.slice(closing)}` : `${source}${summary}`;
}
export function narrativeSpendMessageFlags(state) {
    if (n(state?.original?.advantage) <= 0 && n(state?.original?.triumph) <= 0)
        return {};
    return { [SYSTEM_ID]: { narrativeSpend: state } };
}
async function actorFromUuid(uuid) {
    if (!uuid || typeof globalThis.fromUuid !== "function")
        return null;
    try {
        return await globalThis.fromUuid(uuid);
    }
    catch {
        return null;
    }
}
async function reopenSpendFromMessage(message) {
    const raw = message?.getFlag?.(SYSTEM_ID, "narrativeSpend") ?? message?.flags?.[SYSTEM_ID]?.narrativeSpend;
    if (!raw)
        return;
    const attacker = await actorFromUuid(raw.attackerUuid);
    const target = await actorFromUuid(raw.targetUuid);
    if (!attacker || !target) {
        ui?.notifications?.warn?.("The original attacker or target is no longer available.");
        return;
    }
    if (!actorCanBeControlled(attacker)) {
        ui?.notifications?.warn?.("You do not control the actor that made this roll.");
        return;
    }
    if (!(message?.isOwner || game?.user?.isGM)) {
        ui?.notifications?.warn?.("Only the chat-message owner or GM can update this spend history.");
        return;
    }
    const { state } = await promptCombatNarrativeSpend(attacker, target, raw);
    const content = withNarrativeSpendSummary(message.content, state);
    await message.update({ content, [`flags.${SYSTEM_ID}.narrativeSpend`]: state });
}
function bindSpendButtons(message, html) {
    const root = html?.querySelectorAll ? html : html?.[0];
    if (!root?.querySelectorAll)
        return;
    for (const button of root.querySelectorAll("[data-genesys-spend-results]")) {
        if (button.dataset.genesysSpendBound === "true")
            continue;
        button.dataset.genesysSpendBound = "true";
        button.addEventListener("click", () => void reopenSpendFromMessage(message));
    }
}

Hooks.on("renderChatMessageHTML", (message, html) => bindSpendButtons(message, html));
Hooks.on("renderChatMessage", (message, html) => bindSpendButtons(message, html));
