import { rerenderRenderedCharacterSheet } from "./live-sheet-state.js";

const SYSTEM_ID = "genesys-vtt";
const VERSION = "0.0.1804";

function n(value, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
}

function actorForRoot(root) {
  const id = String(root?.dataset?.actorId ?? "");
  if (id && game?.actors?.get?.(id)) return game.actors.get(id);
  const name = String(root?.dataset?.actorName ?? "").trim();
  const actor = Array.from(game?.actors ?? []).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
    ?? Array.from(globalThis.canvas?.tokens?.placeables ?? []).map((token) => token?.actor).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
    ?? null;
  if (actor && root) root.dataset.actorId = String(actor.id ?? "");
  return actor;
}

function mayEdit(actor) {
  return Boolean(game?.user?.isGM || actor?.isOwner);
}

function statFor(root, resource) {
  const direct = root?.querySelector?.(`.genesys-header-vitals .genesys-header-stat.${resource}`) ?? null;
  if (direct) return direct;
  const wanted = resource === "wounds" ? "wounds" : "strain";
  return Array.from(root?.querySelectorAll?.(".genesys-header-vitals .genesys-header-stat") ?? [])
    .find((stat) => String(stat.querySelector("small")?.textContent ?? "").trim().toLowerCase() === wanted) ?? null;
}

function currentValue(actor, resource) {
  return n(actor?.system?.[resource]?.value);
}

function thresholdValue(actor, resource) {
  return n(actor?.system?.[resource]?.threshold);
}

function renderInlineEditor(root, actor, resource) {
  if (!mayEdit(actor)) return;
  const stat = statFor(root, resource);
  const strong = stat?.querySelector?.("strong");
  if (!stat || !strong) return;

  const existing = strong.querySelector?.(`[data-vital-inline-edit="${resource}"]`);
  if (existing) {
    if (document.activeElement !== existing) existing.value = String(currentValue(actor, resource));
    const thresholdLabel = strong.querySelector?.(".genesys-vital-inline-threshold-v1803");
    if (thresholdLabel) thresholdLabel.textContent = String(thresholdValue(actor, resource));
    stat.classList.toggle("threshold-exceeded", thresholdValue(actor, resource) > 0 && currentValue(actor, resource) > thresholdValue(actor, resource));
    return;
  }

  const current = currentValue(actor, resource);
  const threshold = thresholdValue(actor, resource);
  strong.dataset.vitalsEditV1803 = "true";
  strong.classList.add("genesys-vital-inline-value-v1803");
  strong.replaceChildren();

  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = String(current);
  input.dataset.vitalInlineEdit = resource;
  input.dataset.actorId = String(actor.id ?? "");
  input.setAttribute("aria-label", `Current ${resource}`);
  input.title = `Edit current ${resource}`;

  const slash = document.createElement("span");
  slash.className = "genesys-vital-inline-slash-v1803";
  slash.textContent = "/";

  const thresholdLabel = document.createElement("span");
  thresholdLabel.className = "genesys-vital-inline-threshold-v1803";
  thresholdLabel.textContent = String(threshold);
  thresholdLabel.title = `${resource === "wounds" ? "Wound" : "Strain"} Threshold`;

  strong.append(input, slash, thresholdLabel);
  stat.classList.toggle("threshold-exceeded", threshold > 0 && current > threshold);
}

function enhanceRoot(root) {
  if (!root) return;
  const actor = actorForRoot(root);
  if (!actor || !mayEdit(actor)) return;
  renderInlineEditor(root, actor, "wounds");
  renderInlineEditor(root, actor, "strain");
}

function enhanceSheets() {
  for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]")) enhanceRoot(root);
}

async function commitVital(input) {
  const resource = String(input?.dataset?.vitalInlineEdit ?? "");
  if (!resource || !["wounds", "strain"].includes(resource)) return;
  const actorId = String(input.dataset.actorId ?? "");
  const actor = actorId ? game?.actors?.get?.(actorId) : null;
  if (!actor || !mayEdit(actor)) return;

  const value = n(input.value);
  input.value = String(value);
  input.disabled = true;
  try {
    await actor.update({ [`system.${resource}.value`]: value });
    await rerenderRenderedCharacterSheet(actor);
  }
  catch (error) {
    console.error(`${SYSTEM_ID} | ${VERSION} Failed to update ${resource}`, error);
    ui?.notifications?.error?.(`Could not update ${resource}: ${String(error?.message ?? error)}`);
  }
  finally {
    input.disabled = false;
  }
}

document.addEventListener("change", (event) => {
  const input = event.target?.closest?.("[data-vital-inline-edit]");
  if (!input) return;
  void commitVital(input);
}, true);

document.addEventListener("keydown", (event) => {
  const input = event.target?.closest?.("[data-vital-inline-edit]");
  if (!input || event.key !== "Enter") return;
  event.preventDefault();
  input.blur();
}, true);

const observer = new MutationObserver(() => enhanceSheets());
Hooks.once("ready", () => {
  enhanceSheets();
  observer.observe(document.body, { childList: true, subtree: true });
  for (const delay of [0, 50, 150, 350]) setTimeout(enhanceSheets, delay);
  console.log(`${SYSTEM_ID} | ${VERSION} Character Sheet inline vitals editing ready`);
});
