import { getActorMagicEffects, summarizeMagicEffect } from "./magic-effect-rules-v1810.js";

const SYSTEM_ID = "genesys-vtt";
const VERSION = "0.0.1810";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function actorForRoot(root) {
  const actorId = String(root?.dataset?.actorId ?? "");
  if (actorId && game?.actors?.get?.(actorId)) return game.actors.get(actorId);
  const name = String(root?.dataset?.actorName ?? "").trim();
  const actor = Array.from(game?.actors?.contents ?? game?.actors ?? []).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
    ?? Array.from(globalThis.canvas?.tokens?.placeables ?? []).map((token) => token?.actor).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
    ?? null;
  if (actor && root) root.dataset.actorId = String(actor.id ?? "");
  return actor;
}
function canEdit(actor) {
  return Boolean(game?.user?.isGM || actor?.isOwner);
}
function effectSignature(effects) {
  return effects.map((effect) => `${effect.id}:${effect.actionId}:${effect.duration?.lastExtendedTurnKey ?? ""}`).join("|");
}
function buildMagicStatus(actor, effects) {
  const details = document.createElement("details");
  details.className = "genesys-biography-status-details genesys-biography-magic-status";
  details.dataset.magicEffectsStatus = "true";
  details.dataset.magicEffectSignature = effectSignature(effects);
  const summary = document.createElement("summary");
  summary.className = "genesys-biography-status-summary";
  summary.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><span class="genesys-biography-status-label">Magic</span><span class="genesys-biography-status-badge active">${effects.length}</span><i class="fa-solid fa-chevron-down genesys-biography-status-chevron" aria-hidden="true"></i>`;
  const popover = document.createElement("div");
  popover.className = "genesys-biography-status-popover genesys-magic-effects-popover-v1810";
  for (const effect of effects) {
    const row = document.createElement("div");
    row.className = "genesys-magic-effect-row-v1810";
    const duration = effect.concentration
      ? (effect.duration?.autoManaged === false ? "Concentration · manual duration" : "Concentration · through caster's next turn")
      : "Active magic effect";
    row.innerHTML = `<div><strong>${esc(effect.actionLabel ?? effect.actionId ?? "Magic Effect")}</strong><small>${esc(summarizeMagicEffect(effect))}</small><span>Caster: ${esc(effect.casterName ?? "Unknown")} · ${esc(duration)}</span></div>`;
    if (canEdit(actor)) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.removeMagicEffect = String(effect.id ?? "");
      remove.title = "Remove this magic effect";
      remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      row.append(remove);
    }
    popover.append(row);
  }
  details.append(summary, popover);
  return details;
}
function enhanceBiography(root, actor) {
  const bar = root.querySelector(".genesys-biography-statusbar");
  if (!bar) return;
  const effects = getActorMagicEffects(actor);
  const existing = bar.querySelector("[data-magic-effects-status]");
  if (!effects.length) {
    existing?.remove();
    return;
  }
  const signature = effectSignature(effects);
  if (existing?.dataset?.magicEffectSignature === signature) return;
  const replacement = buildMagicStatus(actor, effects);
  if (existing) existing.replaceWith(replacement);
  else bar.append(replacement);
}
function enhanceConcentration(root, actor) {
  const section = root.querySelector("[data-genesys-magic-actions]");
  if (!section || !game?.genesysMagicEffects) return;
  const rows = game.genesysMagicEffects.listConcentrationForCaster(actor) ?? [];
  const existing = section.querySelector("[data-magic-concentration-controls]");
  if (!rows.length) {
    existing?.remove();
    return;
  }
  const signature = rows.map(({ effect, target }) => `${effect.id}:${target?.uuid ?? target?.id ?? ""}:${effect.duration?.lastExtendedTurnKey ?? ""}`).join("|");
  if (existing?.dataset?.magicConcentrationSignature === signature) return;
  const controls = document.createElement("div");
  controls.className = "genesys-magic-concentration-controls-v1810";
  controls.dataset.magicConcentrationControls = "true";
  controls.dataset.magicConcentrationSignature = signature;
  controls.innerHTML = `<div><strong>Concentration</strong><span>${rows.length} active spell${rows.length === 1 ? "" : "s"} · sustain all with one maneuver</span></div><button type="button" data-concentrate-magic><i class="fa-solid fa-hourglass-half"></i> Concentrate</button>`;
  if (existing) existing.replaceWith(controls);
  else section.append(controls);
}
function enhanceRoot(root) {
  const actor = actorForRoot(root);
  if (!actor) return;
  enhanceBiography(root, actor);
  enhanceConcentration(root, actor);
}
function enhanceSheets() {
  for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]")) enhanceRoot(root);
}
document.addEventListener("click", async (event) => {
  const remove = event.target?.closest?.("[data-remove-magic-effect]");
  if (remove) {
    event.preventDefault();
    event.stopPropagation();
    const root = remove.closest("[data-genesys-sheet-tabs]");
    const actor = actorForRoot(root);
    if (!actor || !canEdit(actor)) return;
    try {
      await game?.genesysMagicResolution?.removeEffect?.(actor, remove.dataset.removeMagicEffect);
      ui?.notifications?.info?.(`${actor.name}: magic effect removed.`);
      enhanceSheets();
    }
    catch (error) {
      console.error(`${SYSTEM_ID} | ${VERSION} Remove magic effect failed`, error);
      ui?.notifications?.error?.(String(error?.message ?? error));
    }
    return;
  }
  const concentrate = event.target?.closest?.("[data-concentrate-magic]");
  if (!concentrate) return;
  event.preventDefault();
  event.stopPropagation();
  const root = concentrate.closest("[data-genesys-sheet-tabs]");
  const actor = actorForRoot(root);
  if (!actor) return;
  const original = concentrate.innerHTML;
  concentrate.disabled = true;
  concentrate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Concentrating…';
  try {
    const result = await game?.genesysMagicEffects?.concentrate?.(actor);
    ui?.notifications?.info?.(`${actor.name}: sustained ${result?.sustained ?? 0} Concentration spell${result?.sustained === 1 ? "" : "s"}.`);
    enhanceSheets();
  }
  catch (error) {
    console.error(`${SYSTEM_ID} | ${VERSION} Concentrate failed`, error);
    ui?.notifications?.warn?.(String(error?.message ?? error));
  }
  finally {
    concentrate.disabled = false;
    concentrate.innerHTML = original;
  }
}, true);
const observer = new MutationObserver(() => enhanceSheets());
Hooks.once("ready", () => {
  enhanceSheets();
  observer.observe(document.body, { childList: true, subtree: true });
  Hooks.on("updateActor", () => queueMicrotask(enhanceSheets));
  Hooks.on("updateToken", () => queueMicrotask(enhanceSheets));
  console.log(`${SYSTEM_ID} | ${VERSION} Magic Effect UI ready`);
});
import { GenesysUiObserver as MutationObserver } from "./ui-mount-coordinator-v1812.js";
