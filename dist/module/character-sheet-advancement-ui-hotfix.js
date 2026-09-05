const SYSTEM_ID = "genesys-vtt";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function integer(value, fallback = 0) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : fallback;
}

function actorForRoot(root) {
  const actorId = String(root?.dataset?.actorId ?? "");
  if (actorId && game?.actors?.get?.(actorId)) return game.actors.get(actorId);
  const name = String(root?.dataset?.actorName ?? "");
  return Array.from(game?.actors ?? []).find((actor) => actor?.name === name && (actor?.isOwner || game?.user?.isGM))
    ?? Array.from(canvas?.tokens?.placeables ?? []).map((token) => token?.actor).find((actor) => actor?.name === name && (actor?.isOwner || game?.user?.isGM))
    ?? null;
}

function liveRootForActor(actor) {
  const actorId = String(actor?.id ?? "");
  const actorName = String(actor?.name ?? "");
  return Array.from(document.querySelectorAll("[data-genesys-sheet-tabs]"))
    .find((root) => root.isConnected && (
      (actorId && String(root.dataset.actorId ?? "") === actorId)
      || (actorName && String(root.dataset.actorName ?? "") === actorName)
    )) ?? null;
}

function activateTalents(root) {
  const button = root?.querySelector?.("[data-genesys-tab='talents']");
  if (!button) return false;
  button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  return true;
}

function confirmTalentPurchase(host, talent, evaluation) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "genesys-advancement-confirm";
    const current = talent.ranked ? `Rank ${integer(evaluation.currentRank, 0)}` : (evaluation.owned ? "Owned" : "Not owned");
    const target = talent.ranked ? `Rank ${integer(evaluation.currentRank, 0) + 1}` : "Owned";
    const after = Math.max(0, integer(evaluation.availableXp, 0) - integer(evaluation.cost, 0));
    dialog.innerHTML = `<form method="dialog" class="genesys-advancement-confirm-form">
      <header><div><strong>${esc(talent.ranked && evaluation.owned ? `Buy ${talent.label} Rank ${integer(evaluation.currentRank, 0) + 1}` : `Purchase ${talent.label}`)}</strong><small>Talent · Effective Tier ${integer(evaluation.effectiveTier, 1)}</small></div></header>
      <div class="genesys-advancement-confirm-grid">
        <div><span>Current</span><strong>${esc(current)}</strong></div>
        <div><span>Purchase</span><strong>${esc(target)}</strong></div>
        <div><span>Effective Tier</span><strong>Tier ${integer(evaluation.effectiveTier, 1)}</strong></div>
        <div><span>Cost</span><strong>${integer(evaluation.cost, 0)} XP</strong></div>
        <div><span>XP Available</span><strong>${integer(evaluation.availableXp, 0)} XP</strong></div>
        <div><span>After Purchase</span><strong>${after} XP</strong></div>
      </div>
      <p class="genesys-advancement-confirm-note">The purchase is recorded in the XP Ledger. Refunds and administrative corrections are handled by the GM.</p>
      <footer><button type="submit" value="cancel">Cancel</button><button type="submit" class="genesys-primary-action" value="purchase">Purchase · ${integer(evaluation.cost, 0)} XP</button></footer>
    </form>`;
    (host?.isConnected ? host : document.body).append(dialog);
    dialog.addEventListener("close", () => {
      const accepted = dialog.returnValue === "purchase";
      dialog.remove();
      resolve(accepted);
    }, { once: true });
    dialog.addEventListener("cancel", () => {
      dialog.returnValue = "cancel";
    });
    dialog.showModal();
  });
}

async function handleTalentPurchase(target) {
  const oldRoot = target.closest("[data-genesys-sheet-tabs]");
  const actor = actorForRoot(oldRoot);
  const library = game?.genesysTalentLibrary;
  const talentId = String(target.dataset.libraryPurchase ?? "");
  const talent = library?.list?.().find((entry) => entry.id === talentId);
  if (!oldRoot || !actor || !talent || !library?.evaluatePurchase || !library?.purchase) return;

  const evaluation = library.evaluatePurchase(actor, talent);
  if (!evaluation?.allowed) {
    ui?.notifications?.warn?.((evaluation?.reasons ?? ["This Talent purchase is not legal."]).filter(Boolean).join(" "));
    return;
  }

  const accepted = await confirmTalentPurchase(oldRoot, talent, evaluation);
  if (!accepted) return;

  await library.purchase(actor, talent);
  ui?.notifications?.info?.(`${talent.label} purchased for ${evaluation.cost} XP.`);

  const freshRoot = liveRootForActor(actor);
  if (!freshRoot) throw new Error("The refreshed Character Sheet could not be resolved after Talent purchase.");
  activateTalents(freshRoot);
  freshRoot.querySelector("[data-talent-library-dialog]")?.remove();
  library.open(actor, freshRoot);
}

window.addEventListener("click", async (event) => {
  const target = event.target?.closest?.("[data-library-purchase]");
  if (!target) return;
  const root = target.closest("[data-genesys-sheet-tabs]");
  const actor = actorForRoot(root);
  if (!root || !actor || String(actor?.system?.role ?? "pc") !== "pc") return;

  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    await handleTalentPurchase(target);
  }
  catch (error) {
    console.error(`${SYSTEM_ID} | Talent advancement hotfix purchase failed`, error);
    ui?.notifications?.error?.(String(error?.message ?? error));
  }
}, true);

Hooks.once("ready", () => {
  console.log(`${SYSTEM_ID} | Talent Advancement live-root hotfix ready`);
});
