import { normalizeMinionGroup } from "../domain/adversaries/index.js";
import { actorCombatSnapshot, listCombatTargets, resolveCombatTargetReference } from "./combat-service.js";
import { actorAdversaryContext, applyActorRoleDamage } from "./adversary-service.js";
import { rollNarrativeWithPresentation } from "./dice-renderer-bridge.js";
import { resultToChatHtml } from "./dice-ui.js";
import { rerenderRenderedCharacterSheet } from "./live-sheet-state.js";

const SYSTEM_ID = "genesys-vtt";
const VERSION = "0.0.1800";
const EFFECT_FLAG = "activeMagicEffectsV1800";
const TARGET_ACTIONS = Object.freeze(new Set(["attack", "augment", "barrier", "curse", "heal", "dispel"]));

function text(value) {
  return String(value ?? "").trim();
}

function n(value, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function randomId(prefix = "magic-effect") {
  const id = foundry?.utils?.randomID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefix}:${id}`;
}

function actorIdentity(actor) {
  return String(actor?.uuid ?? (actor?.id ? `Actor.${actor.id}` : actor?.name ?? ""));
}

function mayUpdate(actor) {
  return Boolean(game?.user?.isGM || actor?.isOwner);
}

export function actionNeedsMagicTarget(actionId) {
  return TARGET_ACTIONS.has(text(actionId));
}

export function listMagicTargets(caster) {
  const rows = listCombatTargets(caster).map((entry) => ({ ...entry }));
  return [
    { id: "self", name: `${caster?.name ?? "Caster"} [Self]`, kind: "self", actorId: caster?.id ?? "", actorUuid: caster?.uuid ?? null },
    ...rows
  ];
}

export function resolveMagicTarget(caster, reference) {
  const ref = text(reference);
  if (!ref) return null;
  if (ref === "self") return caster;
  return resolveCombatTargetReference(ref);
}

export function getActiveMagicEffects(actor) {
  const raw = actor?.getFlag?.(SYSTEM_ID, EFFECT_FLAG) ?? actor?.flags?.[SYSTEM_ID]?.[EFFECT_FLAG] ?? [];
  return Array.isArray(raw) ? raw.filter((entry) => entry?.active !== false).map((entry) => ({ ...entry })) : [];
}

async function writeActiveMagicEffects(actor, effects) {
  if (!mayUpdate(actor)) return false;
  await actor.setFlag(SYSTEM_ID, EFFECT_FLAG, effects);
  await rerenderRenderedCharacterSheet(actor);
  return true;
}

export async function removeActiveMagicEffect(actor, effectId) {
  const id = text(effectId);
  const current = getActiveMagicEffects(actor);
  const next = current.filter((entry) => entry.id !== id);
  if (next.length === current.length) return { removed: null, applied: false };
  const removed = current.find((entry) => entry.id === id) ?? null;
  const applied = await writeActiveMagicEffects(actor, next);
  return { removed, applied };
}

async function addPersistentEffect(caster, target, prepared, result, options = {}) {
  const selected = prepared.selected.map((entry) => ({ id: entry.effect.id, label: entry.effect.label, count: entry.count }));
  const record = {
    id: randomId(`magic:${prepared.action.id}`),
    active: true,
    sourceType: "magic-action",
    sourceVersion: VERSION,
    actionId: prepared.action.id,
    actionLabel: prepared.action.label,
    skillId: prepared.skill.id,
    skillLabel: prepared.skill.label,
    casterRef: actorIdentity(caster),
    casterId: String(caster?.id ?? ""),
    casterName: String(caster?.name ?? "Caster"),
    targetRef: actorIdentity(target),
    targetId: String(target?.id ?? ""),
    targetName: String(target?.name ?? "Target"),
    success: n(result?.net?.success),
    advantage: n(result?.net?.advantage),
    knowledgeRank: n(prepared.knowledgeRank),
    effects: selected,
    concentration: Boolean(prepared.concentration),
    duration: {
      type: options.durationType ?? (prepared.concentration ? "through-end-next-turn" : "manual"),
      remaining: options.remaining ?? (prepared.concentration ? 1 : null),
      sustainMode: prepared.concentration ? "concentrate-maneuver" : "none"
    },
    createdAt: Date.now(),
    notes: text(options.notes)
  };
  const current = getActiveMagicEffects(target);
  const applied = await writeActiveMagicEffects(target, [...current, record]);
  return { record, applied };
}

async function resolveAttack(caster, target, prepared, result) {
  if (!result?.succeeded) return { kind: "attack", applied: false, summary: "Attack missed; no damage applied." };
  const grossDamage = n(prepared.attackBaseDamage) + n(result?.net?.success);
  const snapshot = actorCombatSnapshot(target);
  const soak = n(snapshot.soak);
  const damageAfterSoak = Math.max(0, grossDamage - soak);
  const nonLethal = prepared.selected.some((entry) => entry.effect.id === "non-lethal");
  if (!mayUpdate(target)) {
    return {
      kind: "attack",
      applied: false,
      pending: true,
      grossDamage,
      soak,
      damageAfterSoak,
      track: nonLethal ? "strain" : "wounds",
      summary: `${target.name}: ${damageAfterSoak} ${nonLethal ? "strain" : "wound"} damage remains after Soak ${soak}; GM application required.`
    };
  }
  if (damageAfterSoak > 0) {
    await applyActorRoleDamage(target, nonLethal ? { strain: damageAfterSoak } : { wounds: damageAfterSoak });
  }
  return {
    kind: "attack",
    applied: true,
    grossDamage,
    soak,
    damageAfterSoak,
    track: nonLethal ? "strain" : "wounds",
    summary: `${target.name}: ${grossDamage} gross damage − Soak ${soak} = ${damageAfterSoak} ${nonLethal ? "strain" : "wound"} damage.`
  };
}

async function resolveHeal(target, prepared, result) {
  if (!result?.succeeded) return { kind: "heal", applied: false, summary: "Heal failed; no recovery applied." };
  const woundsRecovered = n(result?.net?.success) + n(prepared?.implementMods?.healWoundsBonus);
  const strainRecovered = n(result?.net?.advantage);
  if (!mayUpdate(target)) {
    return {
      kind: "heal",
      applied: false,
      pending: true,
      woundsRecovered,
      strainRecovered,
      summary: `${target.name}: recover ${woundsRecovered} wounds${strainRecovered ? ` and ${strainRecovered} strain` : ""}; GM application required.`
    };
  }

  const role = actorAdversaryContext(target);
  const currentWounds = n(target?.system?.wounds?.value);
  const nextWounds = Math.max(0, currentWounds - woundsRecovered);
  const update = { "system.wounds.value": nextWounds };
  let actualStrain = 0;
  if (role.tracksStrain && strainRecovered > 0) {
    const currentStrain = n(target?.system?.strain?.value);
    const nextStrain = Math.max(0, currentStrain - strainRecovered);
    update["system.strain.value"] = nextStrain;
    actualStrain = currentStrain - nextStrain;
  }
  if (role.roleMinion) {
    const group = normalizeMinionGroup({
      members: target?.system?.minionGroup?.members ?? 1,
      memberWoundThreshold: target?.system?.minionGroup?.memberWoundThreshold ?? 1,
      wounds: nextWounds,
      casualties: target?.system?.minionGroup?.casualties ?? 0,
      groupSkillIds: target?.system?.minionGroup?.groupSkillIds ?? []
    });
    update["system.minionGroup.casualties"] = group.casualties;
  }
  await target.update(update);
  await rerenderRenderedCharacterSheet(target);
  const actualWounds = currentWounds - nextWounds;
  return {
    kind: "heal",
    applied: true,
    woundsRecovered: actualWounds,
    strainRecovered: actualStrain,
    summary: `${target.name}: recovered ${actualWounds} wounds${actualStrain ? ` and ${actualStrain} strain` : ""}.`
  };
}

async function resolveDispel(target, effectId, result) {
  if (!result?.succeeded) return { kind: "dispel", applied: false, summary: "Dispel failed; the magical effect remains." };
  const active = getActiveMagicEffects(target);
  if (!active.length) return { kind: "dispel", applied: false, summary: `${target.name} has no tracked active magic effect to dispel.` };
  const selected = active.find((entry) => entry.id === text(effectId)) ?? active[active.length - 1];
  const removal = await removeActiveMagicEffect(target, selected.id);
  return {
    kind: "dispel",
    applied: removal.applied,
    removedEffect: selected,
    summary: removal.applied
      ? `${target.name}: removed ${selected.actionLabel ?? selected.actionId ?? "magic effect"}.`
      : `${target.name}: ${selected.actionLabel ?? selected.actionId ?? "magic effect"} is ready to remove; GM application required.`
  };
}

async function resolvePersistent(caster, target, prepared, result) {
  if (!result?.succeeded) return { kind: prepared.action.id, applied: false, summary: `${prepared.action.label} failed; no effect created.` };
  const added = await addPersistentEffect(caster, target, prepared, result);
  const suffix = prepared.concentration ? " It lasts through the end of the caster's next turn and is marked for Concentrate sustain." : "";
  return {
    kind: prepared.action.id,
    applied: added.applied,
    effect: added.record,
    summary: added.applied
      ? `${target.name}: ${prepared.action.label} effect created.${suffix}`
      : `${target.name}: ${prepared.action.label} succeeded; GM application required.${suffix}`
  };
}

async function resolveConjure(caster, prepared, result) {
  if (!result?.succeeded) return { kind: "conjure", applied: false, summary: "Conjure failed; nothing is created." };
  const added = await addPersistentEffect(caster, caster, prepared, result, {
    durationType: "conjuration",
    remaining: null,
    notes: "Pending conjuration record. Concrete Item/Actor creation remains a GM choice in this foundation."
  });
  return {
    kind: "conjure",
    applied: added.applied,
    effect: added.record,
    summary: added.applied
      ? "Conjuration succeeded and was recorded on the caster for follow-up creation/spawn."
      : "Conjuration succeeded; GM follow-up is required."
  };
}

export async function resolveMagicAction(caster, prepared, result, input = {}) {
  const actionId = prepared.action.id;
  const target = actionNeedsMagicTarget(actionId) ? resolveMagicTarget(caster, input.targetRef) : null;
  if (actionNeedsMagicTarget(actionId) && !target) throw new Error(`${prepared.action.label} requires a valid target.`);
  if (actionId === "attack") return resolveAttack(caster, target, prepared, result);
  if (actionId === "heal") return resolveHeal(target, prepared, result);
  if (actionId === "dispel") return resolveDispel(target, input.effectId, result);
  if (["augment", "barrier", "curse"].includes(actionId)) return resolvePersistent(caster, target, prepared, result);
  if (actionId === "conjure") return resolveConjure(caster, prepared, result);
  return { kind: actionId, applied: false, summary: `${prepared.action.label} resolved narratively; no direct Actor mutation is required.` };
}

function effectList(prepared) {
  if (!prepared.selected.length) return "None";
  return prepared.selected.map((entry) => `${esc(entry.effect.label)}${entry.count > 1 ? ` ×${entry.count}` : ""}`).join(" · ");
}

async function postCastChat(caster, target, prepared, result, resolution) {
  const implementLabel = prepared.implement?.name ?? "None";
  const targetLine = target ? `<p><strong>Target:</strong> ${esc(target.name)}</p>` : "";
  const attackLine = prepared.attackBaseDamage !== null
    ? `<p><strong>Attack base damage:</strong> ${prepared.attackBaseDamage} + uncancelled Success</p>`
    : "";
  const content = `
    <section class="genesys-constructed-check genesys-magic-check genesys-magic-check-v1800">
      <h3>${esc(prepared.action.label)} · ${esc(prepared.skill.label)}</h3>
      ${targetLine}
      <p><strong>Difficulty:</strong> ${prepared.totalDifficulty}</p>
      <p><strong>Effects:</strong> ${effectList(prepared)}</p>
      <p><strong>Implement:</strong> ${esc(implementLabel)}</p>
      <p><strong>Magic cost:</strong> ${prepared.magicCostStrain} strain</p>
      ${attackLine}
      ${resultToChatHtml(result)}
      <div class="genesys-magic-resolution-summary"><strong>Resolution</strong><span>${esc(resolution.summary)}</span></div>
    </section>`;
  await foundry.documents.ChatMessage.create({ content, speaker: { alias: caster.name } });
}

export async function castMagicAction(caster, input = {}) {
  const base = game?.genesysMagic;
  if (!base?.prepare) throw new Error("Magic Action service is not ready.");
  const prepared = base.prepare(caster, input);
  const target = actionNeedsMagicTarget(prepared.action.id) ? resolveMagicTarget(caster, input.targetRef) : null;
  if (actionNeedsMagicTarget(prepared.action.id) && !target) throw new Error(`${prepared.action.label} requires a target before rolling.`);
  if (prepared.action.id === "dispel" && target && !getActiveMagicEffects(target).length) throw new Error(`${target.name} has no tracked active magic effect to dispel.`);

  const { result } = await rollNarrativeWithPresentation(prepared.pool, {
    sourceType: "magic-action",
    sourceId: prepared.action.id,
    sourceLabel: `${prepared.action.label} (${prepared.skill.label})`,
    actorName: caster.name,
    speakerAlias: caster.name,
    metadata: {
      settingId: prepared.settingId,
      skillId: prepared.skill.id,
      actionId: prepared.action.id,
      difficulty: prepared.totalDifficulty,
      implementId: prepared.implement?.id ?? "",
      targetRef: text(input.targetRef),
      effectId: text(input.effectId),
      effects: prepared.selected.map((entry) => ({ id: entry.effect.id, count: entry.count }))
    }
  });

  await applyActorRoleDamage(caster, { strain: prepared.magicCostStrain });
  const resolution = await resolveMagicAction(caster, prepared, result, input);
  await postCastChat(caster, target, prepared, result, resolution);
  return { prepared, result, target, resolution };
}

Hooks.once("ready", () => {
  const api = Object.freeze({
    version: VERSION,
    actionNeedsTarget: actionNeedsMagicTarget,
    listTargets: listMagicTargets,
    resolveTarget: resolveMagicTarget,
    getActiveEffects: getActiveMagicEffects,
    removeEffect: removeActiveMagicEffect,
    resolve: resolveMagicAction,
    cast: castMagicAction
  });
  Object.defineProperty(game, "genesysMagicResolution", { configurable: true, value: api });
  console.log(`${SYSTEM_ID} | ${VERSION} Magic Effects & Target Resolution service ready`);
});
