import { addDice } from "../domain/pool/index.js";
import { getActorProfileId, getActorSkillDefinitions, buildSynchronizedSkillStates } from "./skills-service.js";
import { prepareActorSkillCheck } from "./skill-ui.js";
import { formatPool, resultToChatHtml } from "./dice-ui.js";
import { rollNarrativeWithPresentation } from "./dice-renderer-bridge.js";
import { actorAdversaryContext, applyActorRoleDamage } from "./adversary-service.js";

const SYSTEM_ID = "genesys-vtt";
const VERSION = "0.0.1790";
const MAGIC_COST_STRAIN = 2;

function clone(value) {
  if (value === undefined) return undefined;
  return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function text(value) {
  return String(value ?? "").trim();
}

function n(value, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
}

function effect(id, label, difficulty, summary, options = {}) {
  return Object.freeze({
    id,
    label,
    difficulty,
    summary,
    skillIds: Object.freeze((options.skillIds ?? []).map(String)),
    repeatable: Boolean(options.repeatable),
    maxCount: Math.max(1, n(options.maxCount, 4)),
    tags: Object.freeze((options.tags ?? []).map(String))
  });
}

function action(id, label, baseDifficulty, concentration, summary, effects = []) {
  return Object.freeze({ id, label, baseDifficulty, concentration, summary, effects: Object.freeze(effects) });
}

export const CORE_MAGIC_ACTIONS = Object.freeze({
  attack: action("attack", "Attack", 1, false, "A direct magical attack. Base range is Short and the basic hit uses the casting characteristic for base damage.", [
    effect("blast", "Blast", 1, "Adds a Blast-style area effect whose rating scales with Knowledge (Lore)."),
    effect("close-combat", "Close Combat", 1, "Allows the attack to target an engaged opponent."),
    effect("deadly", "Deadly", 1, "Makes the attack easier to crit and adds a Vicious-style critical boost."),
    effect("fire", "Fire", 1, "Adds a burning ongoing-damage quality."),
    effect("holy-unholy", "Holy / Unholy", 1, "Improves damage against a target that is the antithesis of the caster's faith.", { skillIds: ["divine"], tags: ["divine-only"] }),
    effect("ice", "Ice", 1, "Adds an Ensnare-style control quality."),
    effect("impact", "Impact", 1, "Adds knockdown and disorientation potential."),
    effect("lightning", "Lightning", 1, "Adds stun and automatic-fire potential."),
    effect("manipulative", "Manipulative", 1, "Lets Advantage reposition a target after a hit.", { skillIds: ["arcana"] }),
    effect("non-lethal", "Non-Lethal", 1, "Converts the attack to strain damage.", { skillIds: ["primal"] }),
    effect("range", "Range", 1, "Extends the spell by one range band per selection.", { repeatable: true, maxCount: 4 }),
    effect("destructive", "Destructive", 2, "Adds armor-piercing and item-damaging qualities."),
    effect("empowered", "Empowered", 2, "Raises the attack's base damage from one casting characteristic to twice that characteristic."),
    effect("poisonous", "Poisonous", 2, "Adds a poison-style secondary effect after damage is dealt.")
  ]),
  augment: action("augment", "Augment", 2, true, "Enhances a target's capabilities until the end of the caster's next turn; it can be sustained with Concentrate.", [
    effect("divine-health", "Divine Health", 1, "Temporarily increases wound threshold based on Knowledge (Lore).", { skillIds: ["divine"], tags: ["divine-only"] }),
    effect("haste", "Haste", 1, "Allows a second maneuver without the usual strain payment."),
    effect("primal-fury", "Primal Fury", 1, "Improves unarmed damage and critical potential.", { skillIds: ["primal"] }),
    effect("range", "Range", 1, "Extends the spell by one range band per selection.", { repeatable: true, maxCount: 4 }),
    effect("swift", "Swift", 1, "Lets affected targets ignore difficult terrain and resist immobilization."),
    effect("additional-target", "Additional Target", 2, "Adds another target and enables further targets through Advantage.")
  ]),
  barrier: action("barrier", "Barrier", 1, true, "Creates magical protection that reduces incoming hit damage; it can be sustained with Concentrate.", [
    effect("additional-target", "Additional Target", 1, "Protects another target and enables further targets through Advantage."),
    effect("range", "Range", 1, "Extends the spell by one range band per selection.", { repeatable: true, maxCount: 4 }),
    effect("add-defense", "Add Defense", 2, "Adds melee and ranged defense based on Knowledge (Lore)."),
    effect("empowered", "Empowered", 2, "Makes the barrier's damage reduction scale directly with uncancelled Success."),
    effect("reflection", "Reflection", 2, "May reflect a hostile magic attack when the attacker generates a sufficiently bad narrative result.", { skillIds: ["arcana"] }),
    effect("sanctuary", "Sanctuary", 2, "Keeps foes opposed to the caster's faith from engaging protected targets.", { skillIds: ["divine"], tags: ["divine-only"] })
  ]),
  conjure: action("conjure", "Conjure", 1, true, "Creates or summons an item, weapon, or creature; it can be sustained with Concentrate.", [
    effect("additional-summon", "Additional Summon", 1, "Creates one additional item, weapon, or creature."),
    effect("medium-summon", "Medium Summon", 1, "Allows a more complex item, a two-handed melee weapon, or a small Rival."),
    effect("range", "Range", 1, "Moves the conjuration point one range band farther away per selection.", { repeatable: true, maxCount: 4 }),
    effect("summon-ally", "Summon Ally", 1, "Makes a summoned creature friendly and commandable."),
    effect("grand-summon", "Grand Summon", 2, "Allows a larger Rival summon up to silhouette 3.")
  ]),
  curse: action("curse", "Curse", 2, true, "Weakens a target's checks until the end of the caster's next turn; it can be sustained with Concentrate.", [
    effect("enervate", "Enervate", 1, "Makes further strain suffered by the target more punishing."),
    effect("misfortune", "Misfortune", 1, "Lets the caster worsen one favorable die result after the target rolls."),
    effect("range", "Range", 1, "Extends the spell by one range band per selection.", { repeatable: true, maxCount: 4 }),
    effect("additional-target", "Additional Target", 2, "Adds another target and enables further targets through Advantage."),
    effect("despair", "Despair", 2, "Temporarily lowers wound and strain thresholds based on Knowledge (Lore).", { skillIds: ["divine"], tags: ["divine-only"] }),
    effect("doom", "Doom", 2, "Lets the caster alter a die face after the cursed target rolls.", { skillIds: ["arcana"] }),
    effect("paralyzed", "Paralyzed", 3, "Staggers the target for the duration of the spell.")
  ]),
  dispel: action("dispel", "Dispel", 3, false, "Ends a magical effect on a target.", [
    effect("range", "Range", 1, "Extends the spell by one range band per selection.", { repeatable: true, maxCount: 4 }),
    effect("additional-target", "Additional Target", 2, "Adds another target and enables further targets through Advantage.")
  ]),
  heal: action("heal", "Heal", 1, false, "Restores wounds and strain through a magic check.", [
    effect("additional-target", "Additional Target", 1, "Adds another target and enables further targets through Advantage."),
    effect("range", "Range", 1, "Extends the spell by one range band per selection.", { repeatable: true, maxCount: 4 }),
    effect("restoration", "Restoration", 1, "Ends one ongoing status effect on the target."),
    effect("heal-critical", "Heal Critical", 2, "Also attempts to remove one Critical Injury."),
    effect("revive-incapacitated", "Revive Incapacitated", 2, "Allows an incapacitated character to be selected."),
    effect("resurrection", "Resurrection", 4, "Allows an attempt to restore someone who died during the current encounter.")
  ]),
  utility: action("utility", "Utility", 1, false, "Minor narrative magic. If the intended result is more powerful than a small magical trick, use another action instead.", [])
});

function actorItems(actor) {
  return Array.from(actor?.items?.contents ?? actor?.items ?? []);
}

function itemContentId(item) {
  const flagged = text(item?.getFlag?.(SYSTEM_ID, "contentId") ?? item?.flags?.[SYSTEM_ID]?.contentId);
  if (flagged) return flagged;
  const sourceId = text(item?.system?.provenance?.sourceId);
  return sourceId.startsWith("rot-equipment:") ? sourceId.slice("rot-equipment:".length) : sourceId;
}

function itemTags(item) {
  return Array.isArray(item?.system?.tags) ? item.system.tags.map(String) : [];
}

export function listActorMagicImplements(actor) {
  return actorItems(actor)
    .filter((item) => item?.type === "implement")
    .map((item) => ({
      id: String(item.id),
      name: String(item.name ?? "Magic Implement"),
      contentId: itemContentId(item),
      tags: itemTags(item),
      equipped: Boolean(item?.system?.equipped),
      damage: n(item?.system?.damage),
      materialId: text(item?.system?.materialId),
      boundEffectId: text(item?.system?.boundEffectId),
      boundEffectIds: Array.isArray(item?.system?.boundEffectIds) ? item.system.boundEffectIds.map(String) : []
    }))
    .sort((a, b) => Number(b.equipped) - Number(a.equipped) || a.name.localeCompare(b.name));
}

function rulesForActor(actor) {
  const settingId = getActorProfileId(actor);
  const rules = game?.genesysContent?.getMagicRules?.(settingId) ?? {};
  return { settingId, rules };
}

function actorSkillIndex(actor) {
  const states = buildSynchronizedSkillStates(actor);
  const definitions = getActorSkillDefinitions(actor);
  const byState = new Map(states.map((entry) => [String(entry.id), entry]));
  return new Map(definitions.map((definition) => [String(definition.id), { definition, state: byState.get(String(definition.id)) ?? {} }]));
}

function actionIdsForSkill(rules, skillId) {
  return Object.entries(rules?.actions ?? {})
    .filter(([, skillIds]) => Array.isArray(skillIds) && skillIds.map(String).includes(String(skillId)))
    .map(([id]) => id)
    .filter((id) => CORE_MAGIC_ACTIONS[id]);
}

export function getActorMagicState(actor) {
  const { settingId, rules } = rulesForActor(actor);
  const minimumRank = Math.max(1, n(rules.minimumRankToCast, 1));
  const purchasePolicy = text(rules.purchasePolicy);
  const skills = actorSkillIndex(actor);
  const magicSkillIds = Array.isArray(rules.magicSkillIds) ? rules.magicSkillIds.map(String) : [];
  const magicSkills = magicSkillIds.map((skillId) => {
    const row = skills.get(skillId) ?? { definition: { id: skillId, label: skillId, characteristic: "" }, state: {} };
    const rank = n(row.state?.rank);
    const career = Boolean(row.state?.career);
    const careerRequired = purchasePolicy === "career-only";
    const canCast = rank >= minimumRank && (!careerRequired || career);
    return {
      id: skillId,
      label: String(row.definition?.label ?? skillId),
      characteristic: text(row.state?.characteristicOverride ?? row.definition?.characteristic),
      rank,
      career,
      canCast,
      actions: actionIdsForSkill(rules, skillId)
    };
  });
  const knowledgeId = text(rules.knowledgeSkillForSpellEffects);
  const knowledge = skills.get(knowledgeId);
  const adversary = actorAdversaryContext(actor);
  const implementsOwned = listActorMagicImplements(actor);
  return Object.freeze({
    settingId,
    rules: clone(rules),
    minimumRank,
    purchasePolicy,
    knowledgeSkillId: knowledgeId,
    knowledgeRank: n(knowledge?.state?.rank),
    skills: Object.freeze(magicSkills),
    implements: Object.freeze(implementsOwned),
    adversary: Object.freeze(adversary),
    hasMagicAccess: magicSkills.some((entry) => entry.career || entry.rank > 0),
    canCastAny: magicSkills.some((entry) => entry.canCast && entry.actions.length > 0)
  });
}

function availableEffects(actionDef, skillId) {
  return actionDef.effects.filter((entry) => !entry.skillIds.length || entry.skillIds.includes(skillId));
}

function normalizeSelections(actionDef, skillId, selections = {}) {
  const allowed = new Map(availableEffects(actionDef, skillId).map((entry) => [entry.id, entry]));
  const out = [];
  for (const [effectId, rawCount] of Object.entries(selections ?? {})) {
    const effectDef = allowed.get(effectId);
    if (!effectDef) continue;
    let count = n(rawCount);
    if (!effectDef.repeatable) count = count > 0 ? 1 : 0;
    count = Math.min(count, effectDef.maxCount);
    if (count > 0) out.push({ effect: effectDef, count });
  }
  return out;
}

function implementById(actorState, implementId) {
  const id = text(implementId);
  return id ? actorState.implements.find((entry) => entry.id === id) ?? null : null;
}

function reductionForImplement(implement, skillId, actionId, selected) {
  if (!implement) return { difficultyReduction: 0, boost: 0, attackDamageBonus: 0, healWoundsBonus: 0, notes: [] };
  let difficultyReduction = 0;
  let boost = 0;
  let healWoundsBonus = 0;
  const notes = [];
  const contentId = implement.contentId;

  if (contentId === "magic-scepter") {
    boost += 1;
    if (actionId === "attack" && selected.some((entry) => entry.effect.id === "close-combat")) {
      difficultyReduction += 1;
      notes.push("Scepter: Close Combat effect is free.");
    }
  }
  if (contentId === "magic-staff") {
    const range = selected.find((entry) => entry.effect.id === "range");
    if (range?.count > 0) {
      difficultyReduction += 1;
      notes.push("Staff: first Range effect is free.");
    }
  }
  if (contentId === "holy-icon" && skillId === "divine") {
    for (const entry of selected) {
      if (entry.effect.tags.includes("divine-only")) difficultyReduction += Math.min(entry.effect.difficulty * entry.count, entry.count);
    }
    if (actionId === "heal") healWoundsBonus += 2;
    if (selected.some((entry) => entry.effect.tags.includes("divine-only"))) notes.push("Holy Icon: Divine-only effect cost reduced.");
  }
  if (contentId === "musical-instrument" && skillId === "verse") {
    const additional = selected.find((entry) => entry.effect.id === "additional-target");
    if (additional) {
      difficultyReduction += additional.effect.difficulty * additional.count;
      notes.push("Instrument: Additional Target effect is free for Verse.");
    }
  }
  if (contentId === "magic-wand" && implement.boundEffectId) {
    const bound = selected.find((entry) => entry.effect.id === implement.boundEffectId);
    if (bound) {
      difficultyReduction += bound.effect.difficulty;
      notes.push(`Wand: ${bound.effect.label} is free.`);
    }
  }
  if (contentId === "magic-tome" && implement.boundEffectIds.length) {
    for (const effectId of implement.boundEffectIds.slice(0, 2)) {
      const bound = selected.find((entry) => entry.effect.id === effectId);
      if (bound) difficultyReduction += bound.effect.difficulty;
    }
    if (difficultyReduction > 0) notes.push("Tome: bound spell effects reduce difficulty.");
  }

  return {
    difficultyReduction,
    boost,
    attackDamageBonus: actionId === "attack" ? n(implement.damage) : 0,
    healWoundsBonus,
    notes
  };
}

export function prepareMagicAction(actor, input = {}) {
  if (!actor) throw new Error("Actor is required.");
  const actorState = getActorMagicState(actor);
  const skillId = text(input.skillId);
  const skill = actorState.skills.find((entry) => entry.id === skillId);
  if (!skill) throw new Error(`'${skillId}' is not an active magic skill for this Actor.`);
  if (!skill.canCast) throw new Error(`${skill.label} requires career access and at least rank ${actorState.minimumRank} before it can cast.`);
  if (actorState.adversary.roleMinion) throw new Error("Minions cannot voluntarily suffer the strain required to perform a standard magic action.");

  const actionId = text(input.actionId);
  if (!skill.actions.includes(actionId)) throw new Error(`${skill.label} cannot use the ${actionId || "selected"} magic action in this setting.`);
  const actionDef = CORE_MAGIC_ACTIONS[actionId];
  if (!actionDef) throw new Error(`Unknown magic action '${actionId}'.`);

  const selected = normalizeSelections(actionDef, skillId, input.effects);
  const rawEffectDifficulty = selected.reduce((sum, entry) => sum + entry.effect.difficulty * entry.count, 0);
  const implement = implementById(actorState, input.implementId);
  const skillRules = actorState.rules?.skillRules?.[skillId] ?? {};
  if (skillRules.requiresImplement) {
    if (!implement) throw new Error(`${skill.label} requires a magic implement.`);
    const requiredTags = Array.isArray(skillRules.requiredImplementTags) ? skillRules.requiredImplementTags.map(String) : [];
    if (requiredTags.length && !requiredTags.every((tag) => implement.tags.includes(tag))) {
      throw new Error(`${skill.label} requires a compatible runebound shard implement.`);
    }
  }

  const implementMods = reductionForImplement(implement, skillId, actionId, selected);
  const totalDifficulty = Math.max(0, actionDef.baseDifficulty + rawEffectDifficulty - implementMods.difficultyReduction);
  if (totalDifficulty > 5) throw new Error(`Spell difficulty ${totalDifficulty} exceeds Formidable (5) after implement reductions.`);

  const prepared = prepareActorSkillCheck(actor, skillId, totalDifficulty);
  let pool = clone(prepared.construction.pool);
  if (implementMods.boost > 0) pool = addDice(pool, { boost: implementMods.boost });

  const empowered = selected.some((entry) => entry.effect.id === "empowered");
  const attackBaseDamage = actionId === "attack"
    ? (empowered ? prepared.characteristicValue * 2 : prepared.characteristicValue) + implementMods.attackDamageBonus
    : null;

  return Object.freeze({
    actorId: String(actor.id ?? ""),
    settingId: actorState.settingId,
    skill,
    action: actionDef,
    selected: Object.freeze(selected.map((entry) => ({ effect: entry.effect, count: entry.count }))),
    implement,
    implementMods: Object.freeze(implementMods),
    rawEffectDifficulty,
    totalDifficulty,
    prepared,
    pool: Object.freeze(pool),
    attackBaseDamage,
    magicCostStrain: MAGIC_COST_STRAIN,
    knowledgeRank: actorState.knowledgeRank,
    concentration: actionDef.concentration
  });
}

function selectedText(prepared) {
  if (!prepared.selected.length) return "No additional effects";
  return prepared.selected.map((entry) => `${entry.effect.label}${entry.count > 1 ? ` x${entry.count}` : ""} (+${entry.effect.difficulty * entry.count})`).join(" · ");
}

async function postMagicChat(actor, prepared, result) {
  const implementLabel = prepared.implement?.name ?? "None";
  const effectReduction = prepared.implementMods.difficultyReduction;
  const baseLine = `${prepared.action.label} ${prepared.action.baseDifficulty} + Effects ${prepared.rawEffectDifficulty}${effectReduction ? ` - Implement ${effectReduction}` : ""} = Difficulty ${prepared.totalDifficulty}`;
  const extras = [];
  if (prepared.attackBaseDamage !== null) extras.push(`<span><strong>Attack base damage:</strong> ${prepared.attackBaseDamage} + uncancelled Success</span>`);
  if (prepared.implementMods.healWoundsBonus) extras.push(`<span><strong>Heal implement bonus:</strong> +${prepared.implementMods.healWoundsBonus} wounds on a successful Heal</span>`);
  if (prepared.concentration) extras.push("<span><strong>Concentration:</strong> Yes</span>");
  const content = `
    <section class="genesys-constructed-check genesys-magic-check">
      <h3>${prepared.action.label} · ${prepared.skill.label}</h3>
      <p><strong>Difficulty:</strong> ${baseLine}</p>
      <p><strong>Effects:</strong> ${selectedText(prepared)}</p>
      <p><strong>Implement:</strong> ${implementLabel}${prepared.implementMods.boost ? ` · +${prepared.implementMods.boost} Boost` : ""}</p>
      <p><strong>Magic cost:</strong> ${MAGIC_COST_STRAIN} strain</p>
      ${extras.length ? `<div class="genesys-magic-chat-notes">${extras.join("")}</div>` : ""}
      <p><strong>Pool:</strong> ${formatPool(prepared.pool)}</p>
      ${resultToChatHtml(result)}
    </section>`;
  await foundry.documents.ChatMessage.create({ content, speaker: { alias: actor.name } });
}

export async function rollMagicAction(actor, input = {}) {
  const prepared = prepareMagicAction(actor, input);
  const { result } = await rollNarrativeWithPresentation(prepared.pool, {
    sourceType: "magic-action",
    sourceId: prepared.action.id,
    sourceLabel: `${prepared.action.label} (${prepared.skill.label})`,
    actorName: actor.name,
    speakerAlias: actor.name,
    metadata: {
      settingId: prepared.settingId,
      skillId: prepared.skill.id,
      actionId: prepared.action.id,
      difficulty: prepared.totalDifficulty,
      implementId: prepared.implement?.id ?? "",
      effects: prepared.selected.map((entry) => ({ id: entry.effect.id, count: entry.count }))
    }
  });
  await applyActorRoleDamage(actor, { strain: MAGIC_COST_STRAIN });
  await postMagicChat(actor, prepared, result);
  return { prepared, result };
}

Hooks.once("ready", () => {
  const api = Object.freeze({
    version: VERSION,
    actionCatalog: CORE_MAGIC_ACTIONS,
    getActorState: getActorMagicState,
    listImplements: listActorMagicImplements,
    prepare: prepareMagicAction,
    roll: rollMagicAction
  });
  Object.defineProperty(game, "genesysMagic", { configurable: true, value: api });
  console.log(`${SYSTEM_ID} | ${VERSION} Magic Action service ready`);
});
