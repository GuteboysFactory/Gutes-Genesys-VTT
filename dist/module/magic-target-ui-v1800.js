const SYSTEM_ID = "genesys-vtt";
const VERSION = "0.0.1800";
let pendingCasterId = "";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function actorForRoot(root) {
  const id = String(root?.dataset?.actorId ?? "");
  if (id && game?.actors?.get?.(id)) return game.actors.get(id);
  const name = String(root?.dataset?.actorName ?? "").trim();
  return Array.from(game?.actors ?? []).find((actor) => actor?.name === name && (actor?.isOwner || game?.user?.isGM)) ?? null;
}

function inferCaster(dialog) {
  const id = String(dialog?.dataset?.magicCasterId ?? pendingCasterId);
  if (id && game?.actors?.get?.(id)) return game.actors.get(id);
  const header = String(dialog?.querySelector?.(".genesys-magic-composer-header small")?.textContent ?? "");
  const name = header.split("·")[0]?.trim();
  return Array.from(game?.actors ?? []).find((actor) => actor?.name === name && (actor?.isOwner || game?.user?.isGM)) ?? null;
}

function currentTargetRef() {
  const targets = Array.from(game?.user?.targets ?? []);
  const token = targets.length === 1 ? targets[0] : null;
  const id = String(token?.id ?? token?.document?.id ?? "");
  return id ? `token:${id}` : "";
}

function actionId(dialog) {
  return String(dialog.querySelector("[data-magic-action]")?.value ?? "");
}

function targetRows(caster, action) {
  const all = game?.genesysMagicResolution?.listTargets?.(caster) ?? [];
  const selfAllowed = ["heal", "barrier", "augment"].includes(action);
  return all.filter((entry) => selfAllowed || entry.id !== "self");
}

function populateTargetSelect(dialog, { preserve = true } = {}) {
  const caster = inferCaster(dialog);
  const select = dialog.querySelector("[data-magic-target]");
  const wrap = dialog.querySelector("[data-magic-target-wrap]");
  if (!caster || !select || !wrap) return;
  const action = actionId(dialog);
  const required = game?.genesysMagicResolution?.actionNeedsTarget?.(action) ?? false;
  wrap.hidden = !required;
  select.disabled = !required;
  if (!required) {
    select.innerHTML = '<option value="">No target required</option>';
    populateDispelSelect(dialog);
    return;
  }
  const previous = preserve ? select.value : "";
  const rows = targetRows(caster, action);
  select.innerHTML = `<option value="">Choose target…</option>${rows.map((entry) => `<option value="${esc(entry.id)}">${esc(entry.name)}</option>`).join("")}`;
  const valid = rows.some((entry) => entry.id === previous);
  const sceneTarget = currentTargetRef();
  if (valid) select.value = previous;
  else if (rows.some((entry) => entry.id === sceneTarget)) select.value = sceneTarget;
  else if (["heal", "barrier", "augment"].includes(action) && rows.some((entry) => entry.id === "self")) select.value = "self";
  else select.value = "";
  populateDispelSelect(dialog);
}

function populateDispelSelect(dialog) {
  const caster = inferCaster(dialog);
  const wrap = dialog.querySelector("[data-magic-dispel-wrap]");
  const select = dialog.querySelector("[data-magic-dispel-effect]");
  const targetSelect = dialog.querySelector("[data-magic-target]");
  if (!caster || !wrap || !select || !targetSelect) return;
  const isDispel = actionId(dialog) === "dispel";
  const target = isDispel ? game?.genesysMagicResolution?.resolveTarget?.(caster, targetSelect.value) : null;
  const effects = target ? (game?.genesysMagicResolution?.getActiveEffects?.(target) ?? []) : [];
  wrap.hidden = !isDispel;
  select.disabled = !isDispel;
  if (!isDispel) {
    select.innerHTML = '<option value="">Not applicable</option>';
    return;
  }
  select.innerHTML = effects.length
    ? effects.map((entry) => `<option value="${esc(entry.id)}">${esc(entry.actionLabel ?? entry.actionId ?? "Magic Effect")} · ${esc(entry.casterName ?? "Caster")}</option>`).join("")
    : '<option value="">No tracked magic effects</option>';
}

function ensureTargetControls(dialog) {
  if (!dialog || dialog.dataset.magicTargetsV1800 === "true") return;
  const caster = inferCaster(dialog);
  const selects = dialog.querySelector(".genesys-magic-composer-selects");
  if (!caster || !selects) return;
  dialog.dataset.magicCasterId = String(caster.id ?? "");
  const target = document.createElement("label");
  target.dataset.magicTargetWrap = "true";
  target.innerHTML = 'Target<select data-magic-target><option value="">Choose target…</option></select>';
  const dispel = document.createElement("label");
  dispel.dataset.magicDispelWrap = "true";
  dispel.hidden = true;
  dispel.innerHTML = 'Dispel Effect<select data-magic-dispel-effect><option value="">No tracked magic effects</option></select>';
  selects.append(target, dispel);
  const hint = document.createElement("div");
  hint.className = "genesys-magic-target-hint-v1800";
  hint.innerHTML = '<i class="fa-solid fa-crosshairs"></i><span>Target-aware casting is active. A single Foundry target is selected automatically when possible.</span>';
  selects.after(hint);
  dialog.dataset.magicTargetsV1800 = "true";
  populateTargetSelect(dialog, { preserve: false });
}

function ensureOpenComposers() {
  if (!game?.genesysMagicResolution) return;
  for (const dialog of document.querySelectorAll("dialog.genesys-magic-composer")) ensureTargetControls(dialog);
}

function readEffects(dialog) {
  const effects = {};
  for (const toggle of dialog.querySelectorAll("[data-magic-effect-toggle].selected")) {
    const id = String(toggle.dataset.magicEffectToggle ?? "");
    if (id) effects[id] = 1;
  }
  for (const card of dialog.querySelectorAll("[data-magic-effect-card]")) {
    const id = String(card.dataset.magicEffectCard ?? "");
    const count = Math.max(0, Math.trunc(Number(card.querySelector(".genesys-magic-effect-stepper b")?.textContent ?? 0) || 0));
    if (id && count > 0) effects[id] = count;
  }
  return effects;
}

function readSpecification(dialog) {
  return {
    skillId: String(dialog.querySelector("[data-magic-skill]")?.value ?? ""),
    actionId: String(dialog.querySelector("[data-magic-action]")?.value ?? ""),
    implementId: String(dialog.querySelector("[data-magic-implement]")?.value ?? ""),
    targetRef: String(dialog.querySelector("[data-magic-target]")?.value ?? ""),
    effectId: String(dialog.querySelector("[data-magic-dispel-effect]")?.value ?? ""),
    effects: readEffects(dialog)
  };
}

async function castFromComposer(dialog, button) {
  const caster = inferCaster(dialog);
  if (!caster) throw new Error("Could not resolve the caster Actor for this Magic Action.");
  const input = readSpecification(dialog);
  if (game.genesysMagicResolution.actionNeedsTarget(input.actionId) && !input.targetRef) throw new Error("Choose a target before rolling this spell.");
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Casting…';
  try {
    const outcome = await game.genesysMagicResolution.cast(caster, input);
    const targetName = outcome?.target?.name ? ` on ${outcome.target.name}` : "";
    ui?.notifications?.info?.(`${outcome.prepared.action.label}${targetName}: ${outcome.result.succeeded ? "SUCCESS" : "FAILURE"}.`);
    dialog.close?.();
    return outcome;
  }
  finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

document.addEventListener("click", (event) => {
  const open = event.target?.closest?.("[data-open-magic-composer]");
  if (!open) return;
  const root = open.closest("[data-genesys-sheet-tabs]");
  const actor = actorForRoot(root);
  pendingCasterId = String(actor?.id ?? "");
}, true);

document.addEventListener("change", (event) => {
  const dialog = event.target?.closest?.("dialog.genesys-magic-composer");
  if (!dialog) return;
  if (event.target.matches("[data-magic-action]")) {
    queueMicrotask(() => populateTargetSelect(dialog, { preserve: false }));
    return;
  }
  if (event.target.matches("[data-magic-target]")) populateDispelSelect(dialog);
}, true);

document.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-magic-roll]");
  const dialog = button?.closest?.("dialog.genesys-magic-composer");
  if (!button || !dialog || !game?.genesysMagicResolution) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    await castFromComposer(dialog, button);
  }
  catch (error) {
    console.error(`${SYSTEM_ID} | ${VERSION} Magic cast failed`, error);
    ui?.notifications?.warn?.(String(error?.message ?? error));
  }
}, true);

const observer = new MutationObserver(() => ensureOpenComposers());
Hooks.once("ready", () => {
  ensureOpenComposers();
  observer.observe(document.body, { childList: true, subtree: true });
  console.log(`${SYSTEM_ID} | ${VERSION} Magic target UI ready`);
});
