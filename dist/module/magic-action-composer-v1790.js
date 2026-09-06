const SYSTEM_ID = "genesys-vtt";
const VERSION = "0.0.1790";
let activeComposer = null;

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
  const actor = Array.from(game?.actors ?? []).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
    ?? Array.from(globalThis.canvas?.tokens?.placeables ?? []).map((token) => token?.actor).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
    ?? null;
  if (actor && root) root.dataset.actorId = String(actor.id ?? "");
  return actor;
}

function makeMagicSection(actor, state) {
  const section = document.createElement("section");
  section.className = "genesys-fantasy-panel genesys-ornate-panel genesys-actions-section genesys-magic-actions-section";
  section.dataset.genesysMagicActions = "true";
  const castable = state.skills.filter((entry) => entry.canCast && entry.actions.length);
  const rows = castable.map((skill) => `<span class="genesys-magic-skill-chip"><strong>${esc(skill.label)}</strong><small>Rank ${skill.rank} · ${skill.actions.length} actions</small></span>`).join("");
  const minionBlocked = Boolean(state.adversary?.roleMinion);
  section.innerHTML = `
    <div class="genesys-panel-banner genesys-magic-actions-banner">
      <div><h2>Magic Actions</h2><p>Build a spell from live skill access, effects, difficulty, and implements.</p></div>
      <button type="button" class="genesys-primary-action" data-open-magic-composer ${!castable.length || minionBlocked ? "disabled" : ""}><i class="fa-solid fa-wand-magic-sparkles"></i> Compose Spell</button>
    </div>
    ${rows ? `<div class="genesys-magic-skill-chips">${rows}</div>` : '<p class="genesys-empty-row">No cast-ready magic skill on this Actor.</p>'}
    ${minionBlocked ? '<p class="genesys-magic-inline-warning">Core Minions cannot voluntarily suffer the strain required to perform standard magic actions.</p>' : ""}`;
  return section;
}

function ensureMagicSections() {
  if (!game?.genesysMagic) return;
  for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]")) {
    const right = root.querySelector("[data-genesys-tab-panel='actions'] .genesys-actions-column-right");
    if (!right || right.querySelector("[data-genesys-magic-actions]")) continue;
    const actor = actorForRoot(root);
    if (!actor) continue;
    let state;
    try { state = game.genesysMagic.getActorState(actor); }
    catch { continue; }
    if (!state.hasMagicAccess) continue;
    right.prepend(makeMagicSection(actor, state));
  }
}

function compatibleEffects(actionDef, skillId) {
  return (actionDef?.effects ?? []).filter((entry) => !entry.skillIds?.length || entry.skillIds.includes(skillId));
}

function defaultImplementId(state, skillId) {
  const rows = state.implements ?? [];
  if (skillId === "runes") {
    return rows.find((entry) => entry.tags?.includes("runebound-shard") && entry.equipped)?.id
      ?? rows.find((entry) => entry.tags?.includes("runebound-shard"))?.id
      ?? "";
  }
  return rows.find((entry) => entry.equipped)?.id ?? "";
}

function composerMarkup(session) {
  return `<div class="genesys-magic-composer-shell">
    <header class="genesys-magic-composer-header">
      <div><strong>Magic Action Composer</strong><small>${esc(session.actor.name)} · ${esc(session.state.settingId || "Genesys")}</small></div>
      <button type="button" data-magic-close aria-label="Close">×</button>
    </header>
    <div class="genesys-magic-composer-main">
      <section class="genesys-magic-composer-setup">
        <div class="genesys-magic-composer-selects">
          <label>Magic Skill<select data-magic-skill></select></label>
          <label>Magic Action<select data-magic-action></select></label>
          <label>Implement<select data-magic-implement></select></label>
        </div>
        <div class="genesys-magic-action-summary" data-magic-action-summary></div>
        <div class="genesys-magic-effects-heading"><div><strong>Additional Effects</strong><span>Select effects before rolling. Range may be added more than once.</span></div><button type="button" data-magic-clear-effects>Clear Effects</button></div>
        <div class="genesys-magic-effects-grid" data-magic-effects></div>
      </section>
      <aside class="genesys-magic-composer-sidebar">
        <div class="genesys-magic-difficulty-card">
          <span>Final Difficulty</span><strong data-magic-difficulty>—</strong><small data-magic-difficulty-breakdown>Choose a spell.</small>
        </div>
        <div class="genesys-magic-roll-preview" data-magic-roll-preview></div>
        <div class="genesys-magic-validation" data-magic-validation></div>
      </aside>
    </div>
    <footer class="genesys-magic-composer-footer">
      <div><strong>Magic Cost</strong><span data-magic-cost>2 strain</span></div>
      <div><button type="button" data-magic-close>Cancel</button><button type="button" class="genesys-primary-action" data-magic-roll><i class="fa-solid fa-dice"></i> Roll Spell</button></div>
    </footer>
  </div>`;
}

function selectedSkill(session) {
  return session.state.skills.find((entry) => entry.id === session.skillId) ?? null;
}

function selectedAction(session) {
  return game.genesysMagic.actionCatalog?.[session.actionId] ?? null;
}

function populateSkillSelect(session) {
  const select = session.dialog.querySelector("[data-magic-skill]");
  const castable = session.state.skills.filter((entry) => entry.canCast && entry.actions.length);
  select.innerHTML = castable.map((skill) => `<option value="${esc(skill.id)}">${esc(skill.label)} · Rank ${skill.rank}</option>`).join("");
  if (!castable.some((entry) => entry.id === session.skillId)) session.skillId = castable[0]?.id ?? "";
  select.value = session.skillId;
}

function populateActionSelect(session) {
  const select = session.dialog.querySelector("[data-magic-action]");
  const skill = selectedSkill(session);
  const ids = skill?.actions ?? [];
  select.innerHTML = ids.map((id) => `<option value="${esc(id)}">${esc(game.genesysMagic.actionCatalog?.[id]?.label ?? id)}</option>`).join("");
  if (!ids.includes(session.actionId)) session.actionId = ids[0] ?? "";
  select.value = session.actionId;
}

function populateImplementSelect(session) {
  const select = session.dialog.querySelector("[data-magic-implement]");
  const rows = session.state.implements ?? [];
  select.innerHTML = `<option value="">No implement</option>${rows.map((item) => `<option value="${esc(item.id)}">${esc(item.name)}${item.equipped ? " · Equipped" : ""}</option>`).join("")}`;
  if (session.skillId === "runes" && !rows.some((entry) => entry.id === session.implementId && entry.tags?.includes("runebound-shard"))) {
    session.implementId = defaultImplementId(session.state, session.skillId);
  }
  if (!rows.some((entry) => entry.id === session.implementId)) session.implementId = defaultImplementId(session.state, session.skillId);
  select.value = session.implementId;
}

function renderActionSummary(session) {
  const box = session.dialog.querySelector("[data-magic-action-summary]");
  const actionDef = selectedAction(session);
  if (!actionDef) { box.innerHTML = ""; return; }
  box.innerHTML = `<div><strong>${esc(actionDef.label)}</strong><span>Base Difficulty ${actionDef.baseDifficulty}</span><span>${actionDef.concentration ? "Concentration" : "No Concentration"}</span></div><p>${esc(actionDef.summary)}</p>`;
}

function renderEffects(session) {
  const container = session.dialog.querySelector("[data-magic-effects]");
  const actionDef = selectedAction(session);
  const effects = compatibleEffects(actionDef, session.skillId);
  if (!effects.length) {
    container.innerHTML = '<p class="genesys-empty-row">This action has no structured additional-effect list.</p>';
    return;
  }
  container.innerHTML = effects.map((entry) => {
    const count = Number(session.effects[entry.id] ?? 0);
    if (entry.repeatable) {
      return `<article class="genesys-magic-effect-card ${count ? "selected" : ""}" data-magic-effect-card="${esc(entry.id)}"><div><strong>${esc(entry.label)}</strong><span>+${entry.difficulty} difficulty each</span></div><p>${esc(entry.summary)}</p><div class="genesys-magic-effect-stepper"><button type="button" data-magic-effect-minus="${esc(entry.id)}" ${count <= 0 ? "disabled" : ""}>−</button><b>${count}</b><button type="button" data-magic-effect-plus="${esc(entry.id)}" ${count >= entry.maxCount ? "disabled" : ""}>+</button></div></article>`;
    }
    return `<button type="button" class="genesys-magic-effect-card genesys-magic-effect-toggle ${count ? "selected" : ""}" data-magic-effect-toggle="${esc(entry.id)}"><div><strong>${esc(entry.label)}</strong><span>+${entry.difficulty} difficulty</span></div><p>${esc(entry.summary)}</p><i class="fa-solid ${count ? "fa-circle-check" : "fa-circle"}"></i></button>`;
  }).join("");
}

function specification(session) {
  return {
    skillId: session.skillId,
    actionId: session.actionId,
    implementId: session.implementId,
    effects: { ...session.effects }
  };
}

function renderPrepared(session) {
  const diff = session.dialog.querySelector("[data-magic-difficulty]");
  const breakdown = session.dialog.querySelector("[data-magic-difficulty-breakdown]");
  const preview = session.dialog.querySelector("[data-magic-roll-preview]");
  const validation = session.dialog.querySelector("[data-magic-validation]");
  const roll = session.dialog.querySelector("[data-magic-roll]");
  try {
    const prepared = game.genesysMagic.prepare(session.actor, specification(session));
    session.prepared = prepared;
    diff.textContent = String(prepared.totalDifficulty);
    const reduction = prepared.implementMods?.difficultyReduction ?? 0;
    breakdown.textContent = `Base ${prepared.action.baseDifficulty} + Effects ${prepared.rawEffectDifficulty}${reduction ? ` − Implement ${reduction}` : ""}`;
    const effects = prepared.selected.length ? prepared.selected.map((entry) => `${entry.effect.label}${entry.count > 1 ? ` ×${entry.count}` : ""}`).join(" · ") : "No additional effects";
    preview.innerHTML = `<div><strong>${esc(prepared.skill.label)} · ${esc(prepared.action.label)}</strong><span>${esc(effects)}</span></div><div><strong>Pool</strong><span>${prepared.pool.proficiency ?? 0} Proficiency · ${prepared.pool.ability ?? 0} Ability · ${prepared.pool.difficulty ?? 0} Difficulty${prepared.pool.boost ? ` · ${prepared.pool.boost} Boost` : ""}</span></div>${prepared.attackBaseDamage !== null ? `<div><strong>Attack Base Damage</strong><span>${prepared.attackBaseDamage} + uncancelled Success</span></div>` : ""}${prepared.implement ? `<div><strong>Implement</strong><span>${esc(prepared.implement.name)}</span></div>` : ""}`;
    validation.innerHTML = prepared.implementMods?.notes?.length ? prepared.implementMods.notes.map((note) => `<span class="genesys-magic-valid"><i class="fa-solid fa-circle-check"></i>${esc(note)}</span>`).join("") : '<span class="genesys-magic-valid"><i class="fa-solid fa-circle-check"></i>Spell is legal and ready to roll.</span>';
    roll.disabled = false;
  }
  catch (error) {
    session.prepared = null;
    diff.textContent = "—";
    breakdown.textContent = "Spell is not ready.";
    preview.innerHTML = "";
    validation.innerHTML = `<span class="genesys-magic-invalid"><i class="fa-solid fa-triangle-exclamation"></i>${esc(error?.message ?? error)}</span>`;
    roll.disabled = true;
  }
}

function refreshComposer(session, { resetEffects = false, resetAction = false } = {}) {
  if (resetAction) session.actionId = "";
  if (resetEffects) session.effects = {};
  populateSkillSelect(session);
  populateActionSelect(session);
  populateImplementSelect(session);
  renderActionSummary(session);
  renderEffects(session);
  renderPrepared(session);
}

function wireComposer(session) {
  const dialog = session.dialog;
  dialog.addEventListener("change", (event) => {
    if (event.target.matches("[data-magic-skill]")) {
      session.skillId = event.target.value;
      session.implementId = defaultImplementId(session.state, session.skillId);
      refreshComposer(session, { resetEffects: true, resetAction: true });
      return;
    }
    if (event.target.matches("[data-magic-action]")) {
      session.actionId = event.target.value;
      refreshComposer(session, { resetEffects: true });
      return;
    }
    if (event.target.matches("[data-magic-implement]")) {
      session.implementId = event.target.value;
      renderPrepared(session);
    }
  });

  dialog.addEventListener("click", async (event) => {
    const close = event.target.closest?.("[data-magic-close]");
    if (close) { event.preventDefault(); dialog.close(); return; }
    const clear = event.target.closest?.("[data-magic-clear-effects]");
    if (clear) { event.preventDefault(); session.effects = {}; renderEffects(session); renderPrepared(session); return; }
    const toggle = event.target.closest?.("[data-magic-effect-toggle]");
    if (toggle) {
      event.preventDefault();
      const id = toggle.dataset.magicEffectToggle;
      session.effects[id] = session.effects[id] ? 0 : 1;
      renderEffects(session);
      renderPrepared(session);
      return;
    }
    const plus = event.target.closest?.("[data-magic-effect-plus]");
    if (plus) {
      event.preventDefault();
      const id = plus.dataset.magicEffectPlus;
      const effectDef = compatibleEffects(selectedAction(session), session.skillId).find((entry) => entry.id === id);
      session.effects[id] = Math.min(effectDef?.maxCount ?? 4, Number(session.effects[id] ?? 0) + 1);
      renderEffects(session);
      renderPrepared(session);
      return;
    }
    const minus = event.target.closest?.("[data-magic-effect-minus]");
    if (minus) {
      event.preventDefault();
      const id = minus.dataset.magicEffectMinus;
      session.effects[id] = Math.max(0, Number(session.effects[id] ?? 0) - 1);
      renderEffects(session);
      renderPrepared(session);
      return;
    }
    const roll = event.target.closest?.("[data-magic-roll]");
    if (roll) {
      event.preventDefault();
      roll.disabled = true;
      const original = roll.innerHTML;
      roll.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rolling…';
      try {
        await game.genesysMagic.roll(session.actor, specification(session));
        session.state = game.genesysMagic.getActorState(session.actor);
        ui?.notifications?.info?.(`${session.actor.name}: ${selectedAction(session)?.label ?? "Magic"} rolled; magic cost applied.`);
        renderPrepared(session);
      }
      catch (error) {
        console.error(`${SYSTEM_ID} | Magic Composer roll failed`, error);
        ui?.notifications?.error?.(String(error?.message ?? error));
        renderPrepared(session);
      }
      finally {
        roll.innerHTML = original;
        if (session.prepared) roll.disabled = false;
      }
    }
  });

  dialog.addEventListener("close", () => {
    if (activeComposer === session) activeComposer = null;
    dialog.remove();
  });
}

export function openMagicComposer(actor) {
  if (!actor || !game?.genesysMagic) return null;
  if (activeComposer?.dialog?.open) activeComposer.dialog.close();
  const state = game.genesysMagic.getActorState(actor);
  const firstSkill = state.skills.find((entry) => entry.canCast && entry.actions.length);
  if (!firstSkill) {
    ui?.notifications?.warn?.(`${actor.name} has no cast-ready magic skill.`);
    return null;
  }
  const dialog = document.createElement("dialog");
  dialog.className = "genesys-magic-composer";
  const session = {
    actor,
    state,
    dialog,
    skillId: firstSkill.id,
    actionId: firstSkill.actions[0] ?? "",
    implementId: defaultImplementId(state, firstSkill.id),
    effects: {},
    prepared: null
  };
  dialog.innerHTML = composerMarkup(session);
  document.body.append(dialog);
  wireComposer(session);
  refreshComposer(session);
  dialog.showModal();
  activeComposer = session;
  return session;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest?.("[data-open-magic-composer]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const root = button.closest("[data-genesys-sheet-tabs]");
  const actor = actorForRoot(root);
  if (actor) openMagicComposer(actor);
});

Hooks.once("ready", () => {
  Object.defineProperty(game, "genesysMagicComposer", { configurable: true, value: Object.freeze({ open: openMagicComposer }) });
  ensureMagicSections();
  const observer = new MutationObserver(() => ensureMagicSections());
  observer.observe(document.body, { childList: true, subtree: true });
  console.log(`${SYSTEM_ID} | ${VERSION} Magic Action Composer ready`);
});
import { GenesysUiObserver as MutationObserver } from "./ui-mount-coordinator-v1812.js";
