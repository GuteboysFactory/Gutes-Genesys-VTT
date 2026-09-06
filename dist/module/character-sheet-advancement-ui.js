const SYSTEM_ID = "genesys-vtt";

function integer(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const number = Number(value ?? fallback);
    if (!Number.isFinite(number))
        return fallback;
    return Math.min(max, Math.max(min, Math.trunc(number)));
}

function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function actorItems(actor) {
    return Array.isArray(actor?.items?.contents) ? actor.items.contents : Array.from(actor?.items ?? []);
}

function actorForRoot(root) {
    const actorId = String(root?.dataset?.actorId ?? "");
    if (actorId && game?.actors?.get?.(actorId))
        return game.actors.get(actorId);
    const name = String(root?.dataset?.actorName ?? "");
    const actor = Array.from(game?.actors ?? []).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
        ?? Array.from(canvas?.tokens?.placeables ?? []).map((token) => token?.actor).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
        ?? null;
    if (actor && root)
        root.dataset.actorId = String(actor.id ?? "");
    return actor;
}

function isPcActor(actor) {
    return String(actor?.system?.role ?? "pc") === "pc";
}

function advancementApi() {
    return game?.genesysAdvancement ?? null;
}

function xpSnapshot(actor) {
    const api = advancementApi();
    if (api?.snapshot)
        return api.snapshot(actor).xp;
    const xp = actor?.system?.xp ?? {};
    const starting = integer(xp.starting, 0);
    const earned = integer(xp.earned, 0);
    const spent = integer(xp.spent, 0);
    return {
        starting,
        earned,
        spent,
        total: starting + earned,
        available: Math.max(0, starting + earned - spent),
        ledger: Array.from(xp.ledger ?? [])
    };
}

function formatReasonList(reasons = []) {
    return reasons.filter(Boolean).join(" ");
}

function skillLabel(row, skillId) {
    return String(row?.querySelector?.(".genesys-skill-roll")?.textContent ?? skillId ?? "Skill").trim();
}

function skillEvaluation(actor, skillId, targetRank) {
    return advancementApi()?.evaluateSkillPurchase?.(actor, skillId, targetRank) ?? null;
}

function refreshSkillAdvancementRow(root, actor, row) {
    const skillId = String(row?.dataset?.skillId ?? "");
    const input = row?.querySelector?.("[data-skill-rank]");
    const pips = row?.querySelector?.("[data-skill-rank-pips]");
    if (!skillId || !input || !pips)
        return;

    row.querySelector("[data-advancement-skill-cost]")?.remove();
    const currentRank = integer(input.value, 0, 0, 5);
    const badge = document.createElement("span");
    badge.className = "genesys-advancement-skill-cost";
    badge.dataset.advancementSkillCost = "true";

    if (currentRank >= 5) {
        badge.textContent = "MAX";
        badge.classList.add("is-max");
        badge.title = "Maximum skill rank reached.";
    }
    else {
        const evaluation = skillEvaluation(actor, skillId, currentRank + 1);
        const cost = integer(evaluation?.cost, 0);
        badge.textContent = `+${cost} XP`;
        badge.classList.toggle("is-blocked", !evaluation?.allowed);
        badge.title = evaluation?.allowed
            ? `Buy rank ${currentRank + 1} for ${cost} XP.`
            : formatReasonList(evaluation?.reasons ?? []);
    }
    pips.after(badge);

    for (const pip of row.querySelectorAll("[data-skill-rank-pip]")) {
        const targetRank = integer(pip.dataset.skillRankPip, 0, 1, 5);
        if (targetRank <= currentRank) {
            pip.title = targetRank === currentRank
                ? `Current rank ${currentRank}. Purchased ranks cannot be reduced here.`
                : `Rank ${targetRank} already owned.`;
            pip.classList.add("advancement-owned");
            pip.classList.remove("advancement-buyable", "advancement-blocked");
            continue;
        }
        const evaluation = skillEvaluation(actor, skillId, targetRank);
        const cost = integer(evaluation?.cost, 0);
        pip.title = evaluation?.allowed
            ? `Buy rank ${targetRank} for ${cost} XP.`
            : formatReasonList(evaluation?.reasons ?? []);
        pip.classList.toggle("advancement-buyable", Boolean(evaluation?.allowed));
        pip.classList.toggle("advancement-blocked", !evaluation?.allowed);
        pip.classList.remove("advancement-owned");
    }
}

function installSkillsAdvancement(root, actor) {
    if (!isPcActor(actor))
        return;
    const xp = xpSnapshot(actor);
    const banner = root.querySelector("[data-genesys-tab-panel='skills'] .genesys-panel-banner-action");
    if (banner && !banner.querySelector("[data-advancement-xp-chip]")) {
        const chip = document.createElement("span");
        chip.className = "genesys-sheet-chip genesys-advancement-xp-chip";
        chip.dataset.advancementXpChip = "true";
        chip.textContent = `XP ${xp.available}`;
        chip.title = `${xp.available} XP available for advancement.`;
        banner.append(chip);
    }
    for (const row of root.querySelectorAll("[data-genesys-tab-panel='skills'] [data-skill-id]"))
        refreshSkillAdvancementRow(root, actor, row);

    if (!game?.user?.isGM) {
        for (const checkbox of root.querySelectorAll("[data-skill-career]")) {
            checkbox.disabled = true;
            checkbox.title = "Career-skill status is set by character creation and GM administration.";
        }
        for (const input of root.querySelectorAll("[name^='system.characteristics.']")) {
            input.disabled = true;
            input.title = "Characteristics are not purchased with normal XP after character creation.";
        }
    }
}

function initializeRoot(root) {
    if (!root || root.dataset.genesysAdvancementUi === "true")
        return;
    const actor = actorForRoot(root);
    if (!actor)
        return;
    root.dataset.genesysAdvancementUi = "true";
    installSkillsAdvancement(root, actor);
}

function initializeExistingSheets() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]"))
        initializeRoot(root);
}

function purchaseDialogHtml({ title, subtitle, currentLabel, targetLabel, cost, available, extraRows = [] }) {
    const after = Math.max(0, integer(available, 0) - integer(cost, 0));
    const rows = [
        ["Current", currentLabel],
        ["Purchase", targetLabel],
        ...extraRows,
        ["Cost", `${cost} XP`],
        ["XP Available", `${available} XP`],
        ["After Purchase", `${after} XP`]
    ];
    return `<form method="dialog" class="genesys-advancement-confirm-form">
      <header><div><strong>${esc(title)}</strong><small>${esc(subtitle)}</small></div></header>
      <div class="genesys-advancement-confirm-grid">${rows.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}</div>
      <p class="genesys-advancement-confirm-note">The purchase is recorded in the XP Ledger. Refunds and administrative corrections are handled by the GM.</p>
      <footer><button type="submit" value="cancel">Cancel</button><button type="submit" class="genesys-primary-action" value="purchase">Purchase · ${integer(cost, 0)} XP</button></footer>
    </form>`;
}

function confirmPurchase(root, options) {
    return new Promise((resolve) => {
        const dialog = document.createElement("dialog");
        dialog.className = "genesys-advancement-confirm";
        dialog.innerHTML = purchaseDialogHtml(options);
        root.append(dialog);
        dialog.addEventListener("close", () => {
            const accepted = dialog.returnValue === "purchase";
            dialog.remove();
            resolve(accepted);
        }, { once: true });
        dialog.addEventListener("cancel", () => {
            dialog.returnValue = "cancel";
        });
        dialog.showModal?.();
    });
}

async function handleSkillPurchase(root, actor, row, targetRank) {
    const skillId = String(row?.dataset?.skillId ?? "");
    const input = row?.querySelector?.("[data-skill-rank]");
    const currentRank = integer(input?.value, 0, 0, 5);
    if (!skillId || !input)
        return;
    if (targetRank <= currentRank) {
        ui?.notifications?.info?.("Purchased skill ranks cannot be reduced through Advancement.");
        return;
    }
    const evaluation = skillEvaluation(actor, skillId, targetRank);
    if (!evaluation?.allowed) {
        ui?.notifications?.warn?.(formatReasonList(evaluation?.reasons ?? ["This skill purchase is not legal."]));
        return;
    }
    const label = skillLabel(row, skillId);
    const accepted = await confirmPurchase(root, {
        title: `Advance ${label}`,
        subtitle: evaluation.career ? "Career Skill" : "Non-Career Skill",
        currentLabel: `Rank ${currentRank}`,
        targetLabel: `Rank ${targetRank}`,
        cost: evaluation.cost,
        available: evaluation.availableXp,
        extraRows: [["Skill Type", evaluation.career ? "Career" : "Non-Career"]]
    });
    if (!accepted)
        return;
    try {
        await advancementApi().purchaseSkill(actor, skillId, targetRank);
        ui?.notifications?.info?.(`${label} advanced to rank ${targetRank} for ${evaluation.cost} XP.`);
    }
    catch (error) {
        console.error(`${SYSTEM_ID} | Skill advancement purchase failed`, error);
        ui?.notifications?.error?.(String(error?.message ?? error));
    }
}

function ownedTalentItem(actor, sourceId) {
    return actorItems(actor).find((item) => item?.type === "talent" && String(item?.system?.sourceId ?? "") === String(sourceId)) ?? null;
}

async function rollbackTalentPurchase(actor, talent, beforeSnapshot, purchasedItem) {
    try {
        if (!purchasedItem)
            return;
        if (!beforeSnapshot) {
            await purchasedItem.delete();
            return;
        }
        await purchasedItem.update({
            name: beforeSnapshot.name,
            system: beforeSnapshot.system
        });
    }
    catch (rollbackError) {
        console.error(`${SYSTEM_ID} | Talent purchase rollback failed`, rollbackError, { actor, talent });
    }
}

async function purchaseTalentWithAdvancement(actor, talent, evaluation) {
    const library = game?.genesysTalentLibrary;
    const advancement = advancementApi();
    if (!library?.purchase || !advancement?.spendXp)
        throw new Error("Advancement services are not ready.");

    const existing = ownedTalentItem(actor, talent.id);
    const beforeSnapshot = existing?.toObject ? existing.toObject() : null;
    const result = await library.purchase(actor, talent, { chargeXp: false });
    try {
        const rankLabel = talent.ranked ? ` rank ${integer(evaluation.currentRank, 0) + 1}` : "";
        const transaction = await advancement.spendXp(actor, evaluation.cost, {
            kind: "talent",
            label: `${talent.label}${rankLabel}`,
            targetType: "talent",
            targetId: talent.id,
            sourceId: talent.id,
            ruleId: "core:talent-advancement"
        });
        return { ...result, transaction };
    }
    catch (error) {
        await rollbackTalentPurchase(actor, talent, beforeSnapshot, result?.item);
        throw error;
    }
}

async function handleTalentPurchase(root, actor, talentId) {
    const library = game?.genesysTalentLibrary;
    const talent = library?.list?.().find((entry) => entry.id === talentId);
    if (!talent)
        return;
    const evaluation = library.evaluatePurchase(actor, talent);
    if (!evaluation?.allowed) {
        ui?.notifications?.warn?.(formatReasonList(evaluation?.reasons ?? ["This Talent purchase is not legal."]));
        return;
    }
    const accepted = await confirmPurchase(root, {
        title: talent.ranked && evaluation.owned ? `Buy ${talent.label} Rank ${evaluation.currentRank + 1}` : `Purchase ${talent.label}`,
        subtitle: `Talent · Effective Tier ${evaluation.effectiveTier}`,
        currentLabel: talent.ranked ? `Rank ${evaluation.currentRank}` : (evaluation.owned ? "Owned" : "Not owned"),
        targetLabel: talent.ranked ? `Rank ${evaluation.currentRank + 1}` : "Owned",
        cost: evaluation.cost,
        available: evaluation.availableXp,
        extraRows: [["Effective Tier", `Tier ${evaluation.effectiveTier}`]]
    });
    if (!accepted)
        return;
    try {
        await purchaseTalentWithAdvancement(actor, talent, evaluation);
        ui?.notifications?.info?.(`${talent.label} purchased for ${evaluation.cost} XP.`);
        root.querySelector("[data-talent-library-dialog]")?.remove();
        game?.genesysTalentLibrary?.open?.(actor, root);
    }
    catch (error) {
        console.error(`${SYSTEM_ID} | Talent advancement purchase failed`, error);
        ui?.notifications?.error?.(String(error?.message ?? error));
    }
}

function ledgerAmountText(entry) {
    const amount = Number(entry?.amount ?? 0) || 0;
    const bucket = String(entry?.bucket ?? "");
    const delta = bucket === "spent" ? -amount : amount;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta} XP`;
}

function ledgerDate(entry) {
    const timestamp = Number(entry?.createdAt ?? 0);
    if (!Number.isFinite(timestamp) || timestamp <= 0)
        return "";
    try {
        return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
    }
    catch {
        return new Date(timestamp).toLocaleString();
    }
}

function openXpLedger(root, actor) {
    root.querySelector("[data-xp-ledger-dialog]")?.remove();
    const xp = xpSnapshot(actor);
    const entries = Array.from(xp.ledger ?? []).slice().reverse();
    const dialog = document.createElement("dialog");
    dialog.className = "genesys-xp-ledger";
    dialog.dataset.xpLedgerDialog = "true";
    dialog.innerHTML = `<div class="genesys-xp-ledger-shell">
      <header><div><strong>XP Ledger</strong><small>${esc(actor?.name ?? "Character")}</small></div><button type="button" data-xp-ledger-close aria-label="Close">×</button></header>
      <div class="genesys-xp-ledger-summary"><div><span>Starting</span><strong>${xp.starting}</strong></div><div><span>Earned</span><strong>${xp.earned}</strong></div><div><span>Spent</span><strong>${xp.spent}</strong></div><div class="available"><span>Available</span><strong>${xp.available}</strong></div></div>
      <div class="genesys-xp-ledger-list">${entries.length ? entries.map((entry) => `<article><div><strong>${esc(entry.label || entry.kind || "XP transaction")}</strong><small>${esc(ledgerDate(entry))}</small></div><span class="${String(entry.bucket ?? "") === "spent" ? "spent" : "earned"}">${esc(ledgerAmountText(entry))}</span></article>`).join("") : '<p class="genesys-empty-row">No XP transactions recorded yet.</p>'}</div>
    </div>`;
    root.append(dialog);
    dialog.querySelector("[data-xp-ledger-close]")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.showModal?.();
}

document.addEventListener("click", async (event) => {
    const skillPip = event.target?.closest?.("[data-skill-rank-pip]");
    if (skillPip) {
        const root = skillPip.closest("[data-genesys-sheet-tabs]");
        const actor = actorForRoot(root);
        if (root && actor && isPcActor(actor)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            const row = skillPip.closest("[data-skill-id]");
            const targetRank = integer(skillPip.dataset.skillRankPip, 1, 1, 5);
            await handleSkillPurchase(root, actor, row, targetRank);
            return;
        }
    }

    const talentPurchase = event.target?.closest?.("[data-library-purchase]");
    if (talentPurchase) {
        const root = talentPurchase.closest("[data-genesys-sheet-tabs]");
        const actor = actorForRoot(root);
        if (root && actor && isPcActor(actor)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            await handleTalentPurchase(root, actor, String(talentPurchase.dataset.libraryPurchase ?? ""));
            return;
        }
    }

    const ledger = event.target?.closest?.("[data-open-xp-ledger]");
    if (ledger) {
        const root = ledger.closest("[data-genesys-sheet-tabs]");
        const actor = actorForRoot(root);
        if (root && actor) {
            event.preventDefault();
            event.stopImmediatePropagation();
            openXpLedger(root, actor);
        }
    }
}, true);

const observer = new MutationObserver(() => initializeExistingSheets());
Hooks.once("ready", () => {
    initializeExistingSheets();
    observer.observe(document.body, { childList: true, subtree: true });
    console.log(`${SYSTEM_ID} | Character Advancement UI ready`);
});
import { GenesysUiObserver as MutationObserver } from "./ui-mount-coordinator-v1812.js";
