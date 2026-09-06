import { getActorMagicEffects, MAGIC_EFFECT_FLAG } from "./magic-effect-rules-v1810.js";
import { rerenderAllRenderedCharacterSheets, rerenderRenderedCharacterSheet } from "./live-sheet-state.js";

const SYSTEM_ID = "genesys-vtt";
const VERSION = "0.0.1810";
const sceneStates = new Map();
let lifecycleQueue = Promise.resolve();

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
function allEffectActors() {
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
  for (const token of Array.from(globalThis.canvas?.tokens?.placeables ?? [])) add(token?.actor);
  return rows;
}
async function replaceEffects(actor, effects) {
  if (!mayUpdate(actor)) return false;
  await actor.setFlag(SYSTEM_ID, MAGIC_EFFECT_FLAG, effects);
  await rerenderRenderedCharacterSheet(actor);
  return true;
}
async function updateEffect(actor, effectId, mutate) {
  const current = getActorMagicEffects(actor);
  let changed = false;
  const next = current.map((effect) => {
    if (effect.id !== effectId) return effect;
    changed = true;
    return mutate({ ...effect });
  });
  if (!changed) return false;
  return replaceEffects(actor, next);
}
function effectsCastBy(caster, { concentrationOnly = false } = {}) {
  const ref = actorRef(caster);
  const rows = [];
  for (const target of allEffectActors()) {
    for (const effect of getActorMagicEffects(target)) {
      if (String(effect.casterRef ?? "") !== ref && String(effect.casterId ?? "") !== String(caster?.id ?? "")) continue;
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
async function concentrate(caster) {
  const initiative = game?.genesysVtt?.initiative;
  if (!initiative?.sceneState || !initiative?.useSceneManeuver) throw new Error("Encounter maneuver service is not ready.");
  const scene = currentScene();
  const state = initiative.sceneState(scene);
  const ref = actorRef(caster);
  if (state?.status !== "active") throw new Error("Concentrate requires an active structured encounter.");
  if (String(state.activeActorRef ?? "") !== ref) throw new Error("Concentrate can only be used during this caster's active turn.");
  const key = turnKey(state, scene);
  if (!key) throw new Error("Could not resolve the current encounter turn.");
  const rows = effectsCastBy(caster, { concentrationOnly: true }).filter(({ effect }) => effect?.duration?.autoManaged !== false);
  if (!rows.length) throw new Error("This caster has no active Concentration spell to sustain.");
  await initiative.useSceneManeuver(caster, scene);
  let sustained = 0;
  for (const { target, effect } of rows) {
    const applied = await updateEffect(target, effect.id, (entry) => ({
      ...entry,
      duration: {
        ...(entry.duration ?? {}),
        autoManaged: true,
        lastExtendedTurnKey: key,
        lastExtendedBy: "concentrate",
        encounterSceneId: String(scene?.id ?? "")
      }
    }));
    if (applied) sustained += 1;
  }
  await rerenderAllRenderedCharacterSheets();
  return { sustained, turnKey: key };
}
async function expireForEndedTurn(previousState, scene) {
  const endedRef = String(previousState?.activeActorRef ?? "");
  const endedKey = turnKey(previousState, scene);
  if (!endedRef || !endedKey) return 0;
  let expired = 0;
  for (const target of allEffectActors()) {
    const current = getActorMagicEffects(target);
    const next = [];
    let changed = false;
    for (const effect of current) {
      const duration = effect?.duration ?? {};
      const sameCaster = String(effect.casterRef ?? "") === endedRef;
      const managed = Boolean(effect.concentration && duration.autoManaged === true);
      if (!sameCaster || !managed || String(duration.encounterSceneId ?? "") !== String(scene?.id ?? "")) {
        next.push(effect);
        continue;
      }
      if (String(duration.lastExtendedTurnKey ?? "") === endedKey) {
        next.push(effect);
        continue;
      }
      changed = true;
      expired += 1;
    }
    if (changed) await replaceEffects(target, next);
  }
  return expired;
}
async function clearManagedEncounterEffects(scene) {
  let removed = 0;
  for (const target of allEffectActors()) {
    const current = getActorMagicEffects(target);
    const next = current.filter((effect) => {
      const managedHere = Boolean(effect?.concentration && effect?.duration?.autoManaged === true && String(effect?.duration?.encounterSceneId ?? "") === String(scene?.id ?? ""));
      if (managedHere) removed += 1;
      return !managedHere;
    });
    if (next.length !== current.length) await replaceEffects(target, next);
  }
  return removed;
}
function stateAdvancedPastTurn(previous, next) {
  if (!previous?.activeActorRef) return false;
  const previousRound = Number(previous.round ?? 0);
  const nextRound = Number(next?.round ?? 0);
  const previousTurn = Number(previous.turnNumber ?? 0);
  const nextTurn = Number(next?.turnNumber ?? 0);
  return nextRound > previousRound || nextTurn > previousTurn;
}
async function processSceneTransition(scene, previous, next) {
  if (previous?.status === "active" && next?.status === "ended") {
    await clearManagedEncounterEffects(scene);
    return;
  }
  if (previous?.status === "active" && stateAdvancedPastTurn(previous, next)) await expireForEndedTurn(previous, scene);
}
function queueSceneTransition(scene, previous, next) {
  lifecycleQueue = lifecycleQueue
    .then(() => processSceneTransition(scene, previous, next))
    .catch((error) => console.error(`${SYSTEM_ID} | ${VERSION} Magic concentration lifecycle failed`, error));
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
Hooks.on("updateScene", (scene) => {
  const id = String(scene?.id ?? "");
  if (!id || !game?.genesysVtt?.initiative?.sceneState) return;
  const previous = sceneStates.get(id) ?? null;
  const next = game.genesysVtt.initiative.sceneState(scene);
  sceneStates.set(id, next);
  if (previous) queueSceneTransition(scene, previous, next);
});
Hooks.once("ready", () => {
  wrapMagicResolutionApi();
  for (const scene of Array.from(game?.scenes?.contents ?? game?.scenes ?? [])) sceneStates.set(String(scene.id), game?.genesysVtt?.initiative?.sceneState?.(scene) ?? null);
  const api = Object.freeze({
    version: VERSION,
    durationSeedForCast,
    listForCaster: (caster) => effectsCastBy(caster, { concentrationOnly: false }),
    listConcentrationForCaster: (caster) => effectsCastBy(caster, { concentrationOnly: true }),
    concentrate,
    turnKey: () => turnKey(currentState(), currentScene())
  });
  Object.defineProperty(game, "genesysMagicEffects", { configurable: true, value: api });
  console.log(`${SYSTEM_ID} | ${VERSION} Magic Concentration Runtime ready`);
});
