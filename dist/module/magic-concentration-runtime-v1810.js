import { concentrateSceneSpells } from "./initiative-service.js";
import { getActorMagicEffects, MAGIC_EFFECT_FLAG } from "./magic-effect-rules-v1810.js";
import { rerenderRenderedCharacterSheet } from "./live-sheet-state.js";

const SYSTEM_ID = "genesys-vtt";
const VERSION = "0.0.1881";
const JOURNAL = "magicConcentrationJournal";
function authority() {
  if (!game.user?.isGM || game.users?.activeGM?.id !== game.user.id) throw Error("Active GM changed. Retry Concentrate or End Turn with the active GM.");
}

function actorRef(actor) {
  return String(actor?.uuid ?? (actor?.id ? `Actor.${actor.id}` : ""));
}
function mayUpdate(actor) {
  return Boolean(game?.user?.isGM || actor?.isOwner);
}
function currentScene() {
  return globalThis.canvas?.scene ?? game?.scenes?.active ?? null;
}
function currentState(scene = currentScene()) {
  return game?.genesysVtt?.initiative?.sceneState?.(scene) ?? null;
}
function turnKey(state, scene = currentScene()) {
  if (!state || state.status !== "active" || !state.activeActorRef) return "";
  const sceneId = String(scene?.id ?? "scene");
  return `${sceneId}:${Number(state.round ?? 0)}:${Number(state.turnNumber ?? 0)}:${String(state.activeActorRef)}:${String(state.activeActivationId ?? "")}`;
}
function allEffectActors(scene = currentScene()) {
  const rows = [];
  const seen = new Set();
  const add = (actor) => {
    if (actor?.type !== "character") return;
    const key = String(actor?.uuid ?? actor?.id ?? actor?.name ?? "");
    if (!key || seen.has(key)) return;
    seen.add(key);
    rows.push(actor);
  };
  for (const actor of Array.from(game?.actors?.contents ?? game?.actors ?? [])) add(actor);
  for (const token of Array.from(scene?.tokens?.contents ?? [])) add(token?.actor);
  return rows;
}
async function replaceEffects(actor, effects) {
  if (!mayUpdate(actor)) return false;
  await actor.setFlag(SYSTEM_ID, MAGIC_EFFECT_FLAG, effects);
  await rerenderRenderedCharacterSheet(actor);
  return true;
}
function effectsCastBy(caster, { concentrationOnly = false, scene = currentScene() } = {}) {
  const ref = actorRef(caster);
  const rows = [];
  for (const target of allEffectActors(scene)) {
    for (const effect of getActorMagicEffects(target)) {
      if (effect.casterRef ? String(effect.casterRef) !== ref : (caster?.isToken || String(effect.casterId ?? "") !== String(caster?.id ?? ""))) continue;
      if (concentrationOnly && !effect.concentration) continue;
      rows.push({ target, effect });
    }
  }
  return rows;
}
function durationSeedForCast(caster) {
  const scene = currentScene();
  const state = currentState(scene);
  const key = turnKey(state, scene);
  const ref = actorRef(caster);
  const autoManaged = Boolean(key && String(state?.activeActorRef ?? "") === ref);
  return {
    autoManaged,
    createdTurnKey: autoManaged ? key : "",
    lastExtendedTurnKey: autoManaged ? key : "",
    lastExtendedBy: autoManaged ? "cast" : "manual",
    encounterSceneId: autoManaged ? String(scene?.id ?? "") : ""
  };
}
async function normalizeFreshPersistentEffect(caster, outcome) {
  const record = outcome?.resolution?.effect;
  const target = outcome?.target ?? null;
  if (!record || !target || !mayUpdate(target)) return outcome;
  const seed = record.concentration ? durationSeedForCast(caster) : {};
  const actionId = String(record.actionId ?? "");
  const nonStacking = new Set(["augment", "curse", "barrier"]);
  const current = getActorMagicEffects(target);
  const next = current
    .filter((effect) => !(nonStacking.has(actionId) && effect.id !== record.id && effect.actionId === actionId))
    .map((effect) => effect.id === record.id ? { ...effect, duration: { ...(effect.duration ?? {}), ...seed } } : effect);
  await replaceEffects(target, next);
  return outcome;
}
// A single authoritative scene queue owns maneuver payment, target writes and expiry.
// Payment and its receipt are one Scene update; each target is then idempotent.
function journalFor(scene) { return scene.getFlag(SYSTEM_ID, JOURNAL); }
function encounterId(scene) { return String(scene.getFlag(SYSTEM_ID, "ruleEncounterId") ?? ""); }
async function saveJournal(scene, journal) {
  authority();
  await scene.setFlag(SYSTEM_ID, JOURNAL, journal);
}
async function resumeJournal(scene) {
  const journal = journalFor(scene);
  if (!journal || journal.done) return journal;
  authority();
  if (journal.encounterId !== encounterId(scene)) throw Error("Concentration recovery belongs to another encounter. GM review required.");
  for (const row of journal.rows) {
    authority();
    const target = allEffectActors(scene).find(a => actorRef(a) === row.targetRef);
    // Removed Actors/effects stay removed; retries never recreate them.
    if (!target) continue;
    const current = getActorMagicEffects(target);
    const effect = current.find(e => e.id === row.effectId);
    if (!effect) continue;
    if (JSON.stringify(effect) === JSON.stringify(row.after)) continue;
    if (JSON.stringify(effect) !== JSON.stringify(row.before)) throw Error(`Concentration target ${target.name ?? row.targetRef}, effect ${row.effectId}, changed during recovery. Restore or remove that effect before retrying.`);
    const next = row.after ? current.map(e => e.id === row.effectId ? row.after : e) : current.filter(e => e.id !== row.effectId);
    await replaceEffects(target, next);
  }
  await saveJournal(scene, { ...journal, done: true });
  return { ...journal, done: true };
}
async function concentrate(caster) {
  if (!mayUpdate(caster)) throw Error("Caster ownership required.");
  return concentrateSceneSpells(caster, currentScene());
}
async function concentrateAuthoritative(caster, scene, deps) {
  authority();
  const state = deps.read();
  const key = turnKey(state, scene);
  if (!key || state.activeActorRef !== actorRef(caster)) throw Error("Concentrate requires this caster's active encounter turn.");
  const old = journalFor(scene);
  if (old && !old.done) await resumeJournal(scene);
  // Repeated clicks/reconnect retries in the same turn cannot pay again.
  const saved = journalFor(scene);
  if (saved?.kind === "sustain" && saved.turnKey === key && saved.encounterId === encounterId(scene)) return { sustained: saved.rows.length, turnKey: key, reused: true };
  const rows = effectsCastBy(caster, { concentrationOnly: true, scene })
    .filter(({effect}) => effect.duration?.autoManaged !== false && (!effect.duration?.encounterSceneId || effect.duration.encounterSceneId === scene.id))
    .map(({target, effect}) => ({ targetRef: actorRef(target), effectId: effect.id, before: effect, after: {
      ...effect, casterRef: actorRef(caster), duration: { ...effect.duration, autoManaged: true, lastExtendedTurnKey: key, lastExtendedBy: "concentrate", encounterSceneId: scene.id }
    }}));
  if (!rows.length) throw Error("This caster has no active Concentration spell to sustain.");
  const journal = { kind: "sustain", encounterId: encounterId(scene), turnKey: key, rows, done: false };
  // deps.pay persists the changed initiative state AND this journal atomically.
  await deps.pay(journal);
  await resumeJournal(scene);
  return { sustained: rows.length, turnKey: key };
}
async function prepareTransition(scene, previous, next) {
  authority();
  const changedTurn = turnKey(previous, scene) !== turnKey(next, scene);
  const ending = previous.status === "active" && next.status !== "active";
  if (!ending && !changedTurn) return;
  await resumeJournal(scene);
  const endedKey = turnKey(previous, scene);
  if (!ending && !endedKey) return;
  // Unclaim/rewind preserves durations. Forward turn completion or encounter end expires them.
  if (!ending && !(next.round > previous.round || next.turnNumber > previous.turnNumber)) return;
  const rows = [];
  for (const target of allEffectActors(scene)) for (const effect of getActorMagicEffects(target)) {
    const d = effect.duration ?? {};
    if (!effect.concentration || d.autoManaged !== true || d.encounterSceneId !== scene.id) continue;
    if (!ending && (effect.casterRef !== previous.activeActorRef || d.lastExtendedTurnKey === endedKey)) continue;
    rows.push({targetRef: actorRef(target), effectId: effect.id, before: effect, after: null});
  }
  if (!rows.length) return;
  await saveJournal(scene, {kind: "expire", encounterId: encounterId(scene), turnKey: endedKey, rows, done: false});
  await resumeJournal(scene);
}
function wrapMagicResolutionApi() {
  const base = game?.genesysMagicResolution;
  if (!base?.cast || base.__effectRuntimeV1810) return;
  const wrapped = Object.freeze({
    ...base,
    version: VERSION,
    __effectRuntimeV1810: true,
    async cast(caster, input = {}) {
      const outcome = await base.cast(caster, input);
      await normalizeFreshPersistentEffect(caster, outcome);
      return outcome;
    }
  });
  Object.defineProperty(game, "genesysMagicResolution", { configurable: true, value: wrapped });
}
Hooks.once("ready", () => {
  wrapMagicResolutionApi();
  const api = Object.freeze({
    version: VERSION,
    durationSeedForCast,
    listForCaster: (caster) => effectsCastBy(caster, { concentrationOnly: false }),
    listConcentrationForCaster: (caster) => effectsCastBy(caster, { concentrationOnly: true }),
    concentrate,
    concentrateAuthoritative,
    prepareTransition,
    recoveryStatus: (scene = currentScene()) => { const j = scene && journalFor(scene); return j && !j.done ? {kind:j.kind, targets:j.rows.map(r=>`${r.targetRef} · ${r.effectId}`)} : null; },
    turnKey: () => turnKey(currentState(), currentScene())
  });
  Object.defineProperty(game, "genesysMagicEffects", { configurable: true, value: api });
  console.log(`${SYSTEM_ID} | ${VERSION} Magic Concentration Runtime ready`);
});
