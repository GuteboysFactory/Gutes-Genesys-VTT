import { addDice, removeDice } from "../domain/pool/index.js";

const SYSTEM_ID = "genesys-vtt";
const EFFECT_FLAG = "activeMagicEffectsV1800";

function n(value, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
}

export function getActorMagicEffects(actor) {
  const raw = actor?.getFlag?.(SYSTEM_ID, EFFECT_FLAG) ?? actor?.flags?.[SYSTEM_ID]?.[EFFECT_FLAG] ?? [];
  return Array.isArray(raw) ? raw.filter((entry) => entry?.active !== false).map((entry) => ({ ...entry })) : [];
}

export function getMagicAbilityDelta(actor) {
  const effects = getActorMagicEffects(actor);
  const augmented = effects.some((effect) => effect.actionId === "augment");
  const cursed = effects.some((effect) => effect.actionId === "curse");
  return (augmented ? 1 : 0) - (cursed ? 1 : 0);
}

export function applyMagicAbilityDeltaToPool(inputPool, delta) {
  let pool = { ...inputPool };
  const amount = Math.trunc(Number(delta ?? 0));
  if (amount > 0) return addDice(pool, { ability: Math.min(1, amount) });
  if (amount < 0 && n(pool.ability) > 0) pool = removeDice(pool, { ability: 1 });
  return pool;
}

export function applyMagicAbilityEffectsToPrepared(prepared, actor) {
  const delta = getMagicAbilityDelta(actor);
  if (!delta || !prepared?.construction?.pool) return prepared;
  const pool = applyMagicAbilityDeltaToPool(prepared.construction.pool, delta);
  const trace = prepared.construction.trace
    ? { ...prepared.construction.trace, afterRemovals: { ...pool } }
    : prepared.construction.trace;
  return {
    ...prepared,
    construction: { ...prepared.construction, pool, ...(trace ? { trace } : {}) },
    magicEffectModifiers: {
      ...(prepared.magicEffectModifiers ?? {}),
      abilityDelta: delta
    }
  };
}

function hasSelectedEffect(effect, id) {
  return Array.isArray(effect?.effects) && effect.effects.some((entry) => String(entry?.id ?? "") === id && n(entry?.count, 1) > 0);
}

export function getMagicBarrierState(actor) {
  const barrier = getActorMagicEffects(actor).find((entry) => entry.actionId === "barrier") ?? null;
  if (!barrier) return { reduction: 0, sources: [] };
  const successes = n(barrier.success);
  if (successes <= 0) return { reduction: 0, sources: [] };
  const empowered = hasSelectedEffect(barrier, "empowered");
  const amount = empowered ? successes : 1 + Math.floor(Math.max(0, successes - 1) / 2);
  return {
    reduction: amount,
    sources: amount > 0 ? [{ id: barrier.id, casterName: barrier.casterName ?? "Caster", amount, empowered }] : []
  };
}

export function getMagicBarrierDamageReduction(actor) {
  return getMagicBarrierState(actor).reduction;
}

export function getMagicBarrierReaction(actor) {
  const state = getMagicBarrierState(actor);
  if (state.reduction <= 0) return null;
  return {
    id: `magic-barrier:${state.sources.map((entry) => entry.id).join("|")}`,
    label: "Magic Barrier",
    sourceId: "magic-action:barrier",
    description: `Reduce post-soak damage by ${state.reduction}.`,
    timing: "pre-commit",
    optional: false,
    predicate: { all: [] },
    cost: {},
    effect: { type: "reduce-post-soak-damage", amount: state.reduction },
    usage: { limit: 1, period: "hit" }
  };
}

export function summarizeMagicEffect(effect) {
  const action = String(effect?.actionId ?? "magic");
  if (action === "augment") return "+1 Ability die to skill checks";
  if (action === "curse") return "-1 Ability die from skill checks";
  if (action === "barrier") {
    const successes = n(effect?.success);
    const empowered = hasSelectedEffect(effect, "empowered");
    const reduction = successes > 0 ? (empowered ? successes : 1 + Math.floor(Math.max(0, successes - 1) / 2)) : 0;
    return `reduce hit damage by ${reduction}`;
  }
  if (action === "conjure") return "conjuration pending GM follow-up";
  return String(effect?.actionLabel ?? action);
}

export const MAGIC_EFFECT_FLAG = EFFECT_FLAG;
