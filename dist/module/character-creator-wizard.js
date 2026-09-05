const SYSTEM_ID = "genesys-vtt";
const WIZARD_PROTOCOL = "genesys-character-creator-v1";
const STEPS = Object.freeze([
  { id: "identity", label: "Identity" },
  { id: "archetype", label: "Archetype" },
  { id: "career", label: "Career" },
  { id: "characteristics", label: "Characteristics" },
  { id: "skills", label: "Skills" },
  { id: "talents", label: "Talents" },
  { id: "heroic", label: "Heroic Ability" },
  { id: "story", label: "Story / Motivation" },
  { id: "equipment", label: "Equipment" },
  { id: "review", label: "Review" }
]);
const CHARACTERISTIC_LABELS = Object.freeze({
  brawn: "Brawn",
  agility: "Agility",
  intellect: "Intellect",
  cunning: "Cunning",
  willpower: "Willpower",
  presence: "Presence"
});

let activeSession = null;

function clone(value) {
  if (value === undefined) return undefined;
  return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function text(value, fallback = "") {
  const out = String(value ?? fallback).trim();
  return out || fallback;
}

function integer(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function creation() {
  return game?.genesysCreation ?? null;
}

function content() {
  return game?.genesysContent ?? null;
}

function library() {
  return game?.genesysTalentLibrary ?? null;
}

function equipmentApi() {
  return game?.genesysEquipment ?? null;
}

function settingOptions() {
  const packs = content()?.listPacks?.() ?? [];
  const grouped = new Map();
  for (const pack of packs) {
    if (!(pack.archetypes?.length || pack.careers?.length)) continue;
    const id = text(pack.settingId);
    if (!id) continue;
    const current = grouped.get(id) ?? { id, label: id, archetypes: 0, careers: 0 };
    current.archetypes += pack.archetypes?.length ?? 0;
    current.careers += pack.careers?.length ?? 0;
    if (pack.archetypes?.length) current.label = text(pack.label, id).replace(/\s+[—-]\s+Character Creation$/i, "");
    grouped.set(id, current);
  }
  return [...grouped.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function defaultSettingId() {
  const options = settingOptions();
  if (options.some((entry) => entry.id === "realms-of-terrinoth")) return "realms-of-terrinoth";
  try {
    const active = text(game?.settings?.get?.(SYSTEM_ID, "rulesProfile"));
    if (options.some((entry) => entry.id === active)) return active;
  }
  catch {}
  return options[0]?.id ?? "";
}

function settingContent(kind, settingId) {
  return content()?.getContent?.(kind, { settingId }) ?? [];
}

function archetypesFor(state) {
  return settingContent("archetypes", state.settingId);
}

function careersFor(state) {
  return settingContent("careers", state.settingId);
}

function skillsFor(state) {
  return settingContent("skills", state.settingId).sort((a, b) => text(a.label, a.id).localeCompare(text(b.label, b.id)));
}

function heroicsFor(state, kind) {
  return settingContent("heroicAbilities", state.settingId).filter((entry) => entry.kind === kind);
}

function currentArchetype(state) {
  return archetypesFor(state).find((entry) => entry.id === state.archetypeId) ?? null;
}

function currentCareerBase(state) {
  return careersFor(state).find((entry) => entry.id === state.careerId) ?? null;
}

function applyCareerVariant(careerInput, variantId) {
  const career = clone(careerInput);
  if (!career) return null;
  const variant = (career.variants ?? []).find((entry) => entry.id === variantId);
  if (!variant) return career;
  career.baseCareerId = career.id;
  career.variantId = variant.id;
  career.id = variant.id;
  career.label = variant.label ?? career.label;
  career.tags = [...new Set([...(career.tags ?? []), ...(variant.tags ?? [])])];
  if (variant.replaceCareerSkill) {
    career.careerSkills = (career.careerSkills ?? []).filter((id) => id !== variant.replaceCareerSkill.remove);
    if (variant.replaceCareerSkill.add && !career.careerSkills.includes(variant.replaceCareerSkill.add)) career.careerSkills.push(variant.replaceCareerSkill.add);
  }
  if (variant.replaceStartingGearChoice) {
    career.startingGear = clone(career.startingGear ?? []);
    for (const pack of career.startingGear) {
      for (const group of pack.groups ?? []) {
        if (group.id === variant.replaceStartingGearChoice.groupId) group.options = clone(variant.replaceStartingGearChoice.options ?? group.options ?? []);
      }
    }
  }
  return career;
}

function currentCareer(state) {
  return applyCareerVariant(currentCareerBase(state), state.careerVariantId);
}

function initialState(draft = null) {
  const saved = draft?.wizard ?? {};
  const settingId = text(saved.settingId ?? draft?.settingId, defaultSettingId());
  return {
    settingId,
    identity: {
      name: text(saved.identity?.name ?? draft?.identity?.name),
      concept: text(saved.identity?.concept ?? draft?.identity?.concept),
      portrait: text(saved.identity?.portrait ?? draft?.identity?.portrait)
    },
    archetypeId: text(saved.archetypeId ?? draft?.archetypeId),
    archetypeSkillChoices: clone(saved.archetypeSkillChoices ?? []),
    archetypeAbilityChoices: clone(saved.archetypeAbilityChoices ?? {}),
    careerId: text(saved.careerId ?? draft?.careerId),
    careerVariantId: text(saved.careerVariantId ?? draft?.careerVariantId),
    freeCareerSkills: clone(saved.freeCareerSkills ?? draft?.freeCareerSkills ?? []),
    characteristicTargets: clone(saved.characteristicTargets ?? draft?.characteristics ?? {}),
    skillTargets: clone(saved.skillTargets ?? Object.fromEntries(Object.entries(draft?.skills ?? {}).map(([id, row]) => [id, integer(row?.rank, 0, 0, 5)]))),
    talentPurchases: clone(saved.talentPurchases ?? (draft?.talents ?? []).map((entry) => entry.id)),
    heroicPrimaryId: text(saved.heroicPrimaryId ?? draft?.heroicAbility?.primaryEffectId),
    heroicOriginId: text(saved.heroicOriginId ?? draft?.heroicAbility?.origins?.[0]),
    heroicName: text(saved.heroicName ?? draft?.heroicAbility?.name),
    motivation: clone(saved.motivation ?? draft?.motivation ?? { strength: "", flaw: "", desire: "", fear: "", notes: "" }),
    startingGearSelections: clone(saved.startingGearSelections ?? draft?.startingGearSelections ?? {}),
    startingFundsRoll: clone(saved.startingFundsRoll ?? draft?.startingFundsRoll ?? null),
    wallet: clone(saved.wallet ?? draft?.wallet ?? null),
    step: integer(saved.step, 0, 0, STEPS.length - 1)
  };
}

function wizardSnapshot(state) {
  return {
    version: 1,
    settingId: state.settingId,
    identity: clone(state.identity),
    archetypeId: state.archetypeId,
    archetypeSkillChoices: clone(state.archetypeSkillChoices),
    archetypeAbilityChoices: clone(state.archetypeAbilityChoices),
    careerId: state.careerId,
    careerVariantId: state.careerVariantId,
    freeCareerSkills: clone(state.freeCareerSkills),
    characteristicTargets: clone(state.characteristicTargets),
    skillTargets: clone(state.skillTargets),
    talentPurchases: clone(state.talentPurchases),
    heroicPrimaryId: state.heroicPrimaryId,
    heroicOriginId: state.heroicOriginId,
    heroicName: state.heroicName,
    motivation: clone(state.motivation),
    startingGearSelections: clone(state.startingGearSelections),
    startingFundsRoll: clone(state.startingFundsRoll),
    wallet: clone(state.wallet),
    step: state.step
  };
}

function resetAfterSetting(state) {
  const identity = clone(state.identity);
  Object.assign(state, initialState(null), { settingId: state.settingId, identity, step: 0 });
}

function resetAfterArchetype(state) {
  state.archetypeSkillChoices = [];
  state.archetypeAbilityChoices = {};
  state.careerId = "";
  state.careerVariantId = "";
  state.freeCareerSkills = [];
  state.characteristicTargets = {};
  state.skillTargets = {};
  state.talentPurchases = [];
  state.heroicPrimaryId = "";
  state.heroicOriginId = "";
  state.heroicName = "";
  state.startingGearSelections = {};
  state.startingFundsRoll = null;
  state.wallet = null;
}

function resetAfterCareer(state) {
  state.archetypeSkillChoices = [];
  state.freeCareerSkills = [];
  state.skillTargets = {};
  state.talentPurchases = [];
  state.startingGearSelections = {};
  state.startingFundsRoll = null;
  state.wallet = null;
}

function applyArchetypeChoicesToDraft(draftInput, state, archetype, career) {
  const draft = clone(draftInput);
  for (const choice of archetype?.choices ?? []) {
    if (choice.type === "skill-grant") {
      const selected = state.archetypeSkillChoices.slice(0, integer(choice.count, 0));
      for (const skillId of selected) {
        if (career?.careerSkills?.includes(skillId)) continue;
        const existing = draft.skills?.[skillId] ?? { rank: 0, career: false, source: "archetype-choice" };
        existing.rank = Math.max(integer(existing.rank, 0), integer(choice.rank, 1, 0, 5));
        existing.career = false;
        existing.grantRank = Math.max(integer(existing.grantRank, 0), integer(choice.rank, 1, 0, 5));
        existing.creationCap = choice.creationCap ?? existing.creationCap ?? draft.rules?.creationSkillCap ?? 2;
        existing.source = "archetype-choice";
        draft.skills[skillId] = existing;
      }
    }
    if (choice.type === "ability-choice") {
      const selectedId = text(state.archetypeAbilityChoices?.[choice.id]);
      if (selectedId) draft.selectedArchetypeAbilityIds ??= [];
      if (selectedId && !draft.selectedArchetypeAbilityIds.includes(selectedId)) draft.selectedArchetypeAbilityIds.push(selectedId);
    }
  }
  return draft;
}

function talentDefinitionsById() {
  return new Map((library()?.list?.() ?? []).map((entry) => [entry.id, entry]));
}

function draftTalentCounts(purchaseIds, definitions) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const ranks = new Map();
  for (const id of purchaseIds) {
    const talent = definitions.get(id);
    if (!talent) continue;
    const currentRank = ranks.get(id) ?? 0;
    const effectiveTier = talent.ranked ? Math.min(5, integer(talent.tier, 1, 1, 5) + currentRank) : integer(talent.tier, 1, 1, 5);
    counts[effectiveTier] += 1;
    ranks.set(id, currentRank + 1);
  }
  return { counts, ranks };
}

function evaluateDraftTalentPurchase(draft, state, talent) {
  const definitions = talentDefinitionsById();
  const { counts, ranks } = draftTalentCounts(state.talentPurchases, definitions);
  const currentRank = ranks.get(talent.id) ?? 0;
  const effectiveTier = talent.ranked ? Math.min(5, integer(talent.tier, 1, 1, 5) + currentRank) : integer(talent.tier, 1, 1, 5);
  const cost = creation()?.talentCost?.(effectiveTier, draft.rules) ?? (effectiveTier * 5);
  const availableXp = creation()?.availableXp?.(draft) ?? 0;
  const reasons = [];
  if (!talent.ranked && currentRank > 0) reasons.push(`${talent.label} is not ranked and is already selected.`);
  const after = { ...counts, [effectiveTier]: counts[effectiveTier] + 1 };
  if (effectiveTier > 1 && after[effectiveTier - 1] <= after[effectiveTier]) reasons.push(`Talent Pyramid requires more Tier ${effectiveTier - 1} purchases than Tier ${effectiveTier} purchases.`);
  if (cost > availableXp) reasons.push(`Not enough XP. Need ${cost}, have ${availableXp}.`);
  return { allowed: reasons.length === 0, reasons, currentRank, effectiveTier, cost, availableXp, counts, after };
}

function rebuildDraft(state) {
  const api = creation();
  if (!api) throw new Error("Character Creation services are not ready.");
  const rules = content()?.getCreationRules?.(state.settingId) ?? api.rules;
  let draft = api.createDraft({ settingId: state.settingId, rules });
  draft.identity = clone(state.identity);
  draft.careerVariantId = state.careerVariantId;

  const archetype = currentArchetype(state);
  if (archetype) {
    draft = api.selectArchetype(draft, archetype);
    if (!Object.keys(state.characteristicTargets ?? {}).length) state.characteristicTargets = clone(draft.characteristics);
  }

  const career = currentCareer(state);
  if (career) draft = api.selectCareer(draft, career);
  if (archetype) draft = applyArchetypeChoicesToDraft(draft, state, archetype, career);

  if (career && state.freeCareerSkills.length === integer(career.freeSkillChoices, 0)) draft = api.chooseFreeCareerSkills(draft, career, state.freeCareerSkills);

  for (const id of api.characteristicIds ?? []) {
    const current = integer(draft.characteristics?.[id], 2, 1, 6);
    const target = integer(state.characteristicTargets?.[id], current, current, 6);
    if (target > current) draft = api.purchaseCharacteristic(draft, id, target);
  }

  for (const [skillId, targetValue] of Object.entries(state.skillTargets ?? {})) {
    const current = integer(draft.skills?.[skillId]?.rank, 0, 0, 5);
    const target = integer(targetValue, current, 0, 5);
    if (target > current) draft = api.purchaseSkill(draft, skillId, target);
  }

  const definitions = talentDefinitionsById();
  const applied = [];
  for (const talentId of state.talentPurchases) {
    const talent = definitions.get(talentId);
    if (!talent) continue;
    const tempState = { ...state, talentPurchases: applied };
    const evaluation = evaluateDraftTalentPurchase(draft, tempState, talent);
    if (!evaluation.allowed) throw new Error(evaluation.reasons.join(" "));
    draft = api.purchaseTalent(draft, { ...talent, effectiveTier: evaluation.effectiveTier, rank: evaluation.currentRank + 1 });
    applied.push(talentId);
  }

  if (api.setMotivation) draft = api.setMotivation(draft, state.motivation);
  const primary = heroicsFor(state, "primary-effect").find((entry) => entry.id === state.heroicPrimaryId);
  if (primary && api.selectHeroicAbility) draft = api.selectHeroicAbility(draft, primary, { name: state.heroicName || primary.label, origin: state.heroicOriginId });

  if (api.setStartingGearChoice) {
    for (const [groupId, optionIndex] of Object.entries(state.startingGearSelections ?? {})) draft = api.setStartingGearChoice(draft, groupId, optionIndex);
  }
  if (state.startingFundsRoll) {
    draft.startingFundsRoll = clone(state.startingFundsRoll);
    draft.wallet = clone(state.wallet);
    if (api.refreshEquipment) draft = api.refreshEquipment(draft);
  }

  draft.identity = clone(state.identity);
  draft.wizard = wizardSnapshot(state);
  return draft;
}

function wizardValidation(session) {
  const state = session.state;
  const draft = session.draft;
  const errors = [];
  const warnings = [];
  if (!text(state.identity.name)) errors.push("Enter a character name.");
  if (!state.archetypeId) errors.push("Choose an archetype/species.");
  if (!state.careerId) errors.push("Choose a career.");
  const archetype = currentArchetype(state);
  const career = currentCareer(state);
  for (const choice of archetype?.choices ?? []) {
    if (choice.type === "skill-grant") {
      if (state.archetypeSkillChoices.length !== integer(choice.count, 0)) errors.push(`Choose ${choice.count} skills for ${choice.label}.`);
      for (const id of state.archetypeSkillChoices) if (career?.careerSkills?.includes(id)) errors.push(`${id} is a career skill and cannot satisfy ${choice.label}.`);
    }
    if (choice.type === "ability-choice" && !text(state.archetypeAbilityChoices?.[choice.id])) errors.push(`Choose an option for ${choice.label}.`);
  }
  if (career && state.freeCareerSkills.length !== integer(career.freeSkillChoices, 0)) errors.push(`Choose ${career.freeSkillChoices} free career skills.`);
  if (draft) {
    if (draft.startingGearResolution?.funds?.formula && !state.startingFundsRoll) errors.push("Roll starting funds before creating the character.");
    const base = creation()?.validate?.(draft, { career }) ?? { valid: true, errors: [], warnings: [] };
    errors.push(...(base.errors ?? []));
    warnings.push(...(base.warnings ?? []));
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

function stepRequirements(session) {
  const state = session.state;
  const archetype = currentArchetype(state);
  const career = currentCareer(state);
  switch (STEPS[state.step]?.id) {
    case "identity": return text(state.identity.name) ? [] : ["Enter a character name."];
    case "archetype": return state.archetypeId ? [] : ["Choose an archetype/species."];
    case "career": return state.careerId ? [] : ["Choose a career."];
    case "skills": {
      const errors = [];
      for (const choice of archetype?.choices ?? []) {
        if (choice.type === "skill-grant" && state.archetypeSkillChoices.length !== integer(choice.count, 0)) errors.push(`Choose ${choice.count} archetype skill grants.`);
        if (choice.type === "ability-choice" && !text(state.archetypeAbilityChoices?.[choice.id])) errors.push(`Choose ${choice.label}.`);
      }
      if (career && state.freeCareerSkills.length !== integer(career.freeSkillChoices, 0)) errors.push(`Choose ${career.freeSkillChoices} free career skills.`);
      return errors;
    }
    case "heroic": {
      const rules = content()?.getHeroicRules?.(state.settingId) ?? {};
      return rules.requiredAtCreation && !state.heroicPrimaryId ? ["Choose a Heroic Ability."] : [];
    }
    case "equipment": {
      const errors = (session.draft?.startingGearResolution?.unresolvedChoices ?? []).map((choice) => `Choose ${choice.label}.`);
      if (session.draft?.startingGearResolution?.funds?.formula && !state.startingFundsRoll) errors.push("Roll starting funds.");
      return errors;
    }
    default: return [];
  }
}

function xpBar(session) {
  const draft = session.draft;
  const total = integer(draft?.startingXp, 0);
  const spent = integer(draft?.xpSpent, 0);
  const available = creation()?.availableXp?.(draft) ?? Math.max(0, total - spent);
  return `<div class="genesys-creator-xp"><span>Starting XP <strong>${total}</strong></span><span>Spent <strong>${spent}</strong></span><span class="available">Available <strong>${available}</strong></span></div>`;
}

function renderIdentity(session) {
  const settings = settingOptions();
  const state = session.state;
  return `<section class="genesys-creator-panel"><h2>Identity</h2><p>Start with the character and the setting profile. The rest of the wizard reads from that profile's registered content packs.</p>
    <div class="genesys-creator-form-grid">
      <label>Character Name<input type="text" data-creator-field="identity.name" value="${esc(state.identity.name)}" placeholder="Character name" /></label>
      <label>Setting<select data-creator-setting>${settings.map((entry) => `<option value="${esc(entry.id)}" ${entry.id === state.settingId ? "selected" : ""}>${esc(entry.label)}</option>`).join("")}</select></label>
      <label class="wide">Concept<input type="text" data-creator-field="identity.concept" value="${esc(state.identity.concept)}" placeholder="A short character concept" /></label>
      <label class="wide">Portrait Path<input type="text" data-creator-field="identity.portrait" value="${esc(state.identity.portrait)}" placeholder="Optional Foundry image path" /></label>
    </div>
  </section>`;
}

function characteristicSummary(characteristics = {}) {
  return Object.entries(CHARACTERISTIC_LABELS).map(([id, label]) => `${label.slice(0, 3)} ${integer(characteristics[id], 2)}`).join(" · ");
}

function renderArchetype(session) {
  const state = session.state;
  const rows = archetypesFor(state);
  return `<section class="genesys-creator-panel"><h2>Archetype / Species</h2><p>Choose the species/archetype foundation. Starting characteristics and starting XP are applied by the creation service.</p>
    <div class="genesys-creator-card-grid">${rows.map((entry) => `<button type="button" class="genesys-creator-choice-card ${entry.id === state.archetypeId ? "selected" : ""}" data-creator-archetype="${esc(entry.id)}"><strong>${esc(entry.label)}</strong><span>${esc(characteristicSummary(entry.characteristics))}</span><small>${integer(entry.startingXp, 0)} starting XP · Wounds ${integer(entry.wounds?.base, 10)} + ${esc(entry.wounds?.characteristicId ?? "Brawn")} · Strain ${integer(entry.strain?.base, 10)} + ${esc(entry.strain?.characteristicId ?? "Willpower")}</small></button>`).join("")}</div>
  </section>`;
}

function skillLabels(ids, state) {
  const map = new Map(skillsFor(state).map((entry) => [entry.id, entry.label]));
  return ids.map((id) => map.get(id) ?? id).join(" · ");
}

function renderCareer(session) {
  const state = session.state;
  const rows = careersFor(state);
  const cards = [];
  for (const career of rows) {
    cards.push(`<button type="button" class="genesys-creator-choice-card ${career.id === state.careerId && !state.careerVariantId ? "selected" : ""}" data-creator-career="${esc(career.id)}" data-creator-career-variant=""><strong>${esc(career.label)}</strong><span>${esc(skillLabels(career.careerSkills ?? [], state))}</span><small>Choose ${integer(career.freeSkillChoices, 4)} free career skills at rank ${integer(career.freeSkillRank, 1)}.</small></button>`);
    for (const variant of career.variants ?? []) {
      const resolved = applyCareerVariant(career, variant.id);
      cards.push(`<button type="button" class="genesys-creator-choice-card variant ${career.id === state.careerId && variant.id === state.careerVariantId ? "selected" : ""}" data-creator-career="${esc(career.id)}" data-creator-career-variant="${esc(variant.id)}"><strong>${esc(variant.label)}</strong><span>${esc(skillLabels(resolved.careerSkills ?? [], state))}</span><small>${esc(career.label)} variant</small></button>`);
    }
  }
  return `<section class="genesys-creator-panel"><h2>Career</h2><p>Your Career marks career skills and supplies the four free starting ranks plus starting gear choices.</p><div class="genesys-creator-card-grid">${cards.join("")}</div></section>`;
}

function renderCharacteristics(session) {
  const draft = session.draft;
  const state = session.state;
  if (!currentArchetype(state)) return `<section class="genesys-creator-panel"><p>Choose an archetype first.</p></section>`;
  const rows = (creation()?.characteristicIds ?? []).map((id) => {
    const start = integer(draft?.startingCharacteristics?.[id], 2, 1, 6);
    const value = integer(draft?.characteristics?.[id], start, 1, 6);
    const nextCost = value < 5 ? creation()?.characteristicCost?.(value, value + 1, draft.rules) ?? ((value + 1) * 10) : 0;
    return `<div class="genesys-creator-characteristic"><span>${esc(CHARACTERISTIC_LABELS[id] ?? id)}</span><small>Starts ${start}</small><div><button type="button" data-creator-characteristic-minus="${id}" ${value <= start ? "disabled" : ""}>−</button><strong>${value}</strong><button type="button" data-creator-characteristic-plus="${id}" ${value >= 5 ? "disabled" : ""}>+</button></div><em>${value < 5 ? `Next +${nextCost} XP` : "Creation max"}</em></div>`;
  });
  return `<section class="genesys-creator-panel"><h2>Characteristics</h2><p>Characteristic increases use the same creation cost service as the rules engine. You can lower a choice here and the draft is rebuilt, refunding that creation purchase cleanly.</p><div class="genesys-creator-characteristics">${rows.join("")}</div></section>`;
}

function renderArchetypeChoices(session, skills) {
  const state = session.state;
  const archetype = currentArchetype(state);
  const career = currentCareer(state);
  const blocks = [];
  for (const choice of archetype?.choices ?? []) {
    if (choice.type === "skill-grant") {
      const eligible = skills.filter((entry) => !career?.careerSkills?.includes(entry.id));
      blocks.push(`<div class="genesys-creator-choice-block"><h3>${esc(choice.label)}</h3><p>Choose ${integer(choice.count, 0)}. These are free archetype grants.</p><div class="genesys-creator-check-grid">${eligible.map((entry) => `<label><input type="checkbox" data-creator-archetype-skill="${esc(entry.id)}" ${state.archetypeSkillChoices.includes(entry.id) ? "checked" : ""} />${esc(entry.label)}</label>`).join("")}</div></div>`);
    }
    if (choice.type === "ability-choice") {
      const abilityMap = new Map((archetype.abilities ?? []).map((entry) => [entry.id, entry]));
      blocks.push(`<div class="genesys-creator-choice-block"><h3>${esc(choice.label)}</h3><div class="genesys-creator-card-grid compact">${(choice.options ?? []).map((id) => `<button type="button" class="genesys-creator-choice-card ${state.archetypeAbilityChoices?.[choice.id] === id ? "selected" : ""}" data-creator-archetype-ability-choice="${esc(choice.id)}" data-creator-archetype-ability="${esc(id)}"><strong>${esc(abilityMap.get(id)?.label ?? id)}</strong><small>Archetype ability choice</small></button>`).join("")}</div></div>`);
    }
  }
  return blocks.join("");
}

function renderSkills(session) {
  const state = session.state;
  const draft = session.draft;
  const career = currentCareer(state);
  const skills = skillsFor(state);
  if (!career) return `<section class="genesys-creator-panel"><p>Choose a career first.</p></section>`;
  const freeComplete = state.freeCareerSkills.length === integer(career.freeSkillChoices, 0);
  const archetypeChoiceBlocks = renderArchetypeChoices(session, skills);
  const free = `<div class="genesys-creator-choice-block"><h3>Free Career Skill Ranks</h3><p>Choose exactly ${integer(career.freeSkillChoices, 0)} career skills. Selected: ${state.freeCareerSkills.length}/${integer(career.freeSkillChoices, 0)}.</p><div class="genesys-creator-check-grid">${(career.careerSkills ?? []).map((id) => `<label><input type="checkbox" data-creator-free-career="${esc(id)}" ${state.freeCareerSkills.includes(id) ? "checked" : ""} />${esc(skills.find((entry) => entry.id === id)?.label ?? id)}</label>`).join("")}</div></div>`;
  const rows = skills.map((entry) => {
    const skillState = draft?.skills?.[entry.id] ?? { rank: 0, career: career.careerSkills?.includes(entry.id) };
    const rank = integer(skillState.rank, 0, 0, 5);
    const cap = integer(skillState.creationCap ?? draft?.rules?.creationSkillCap, 2, 0, 5);
    return `<div class="genesys-creator-skill-row"><div><strong>${esc(entry.label)}</strong><small>${skillState.career ? "Career" : "Non-Career"} · ${esc(entry.characteristicLabel ?? entry.characteristic ?? "")}</small></div><div class="rank-buttons">${Array.from({ length: cap + 1 }, (_, target) => `<button type="button" data-creator-skill="${esc(entry.id)}" data-creator-skill-rank="${target}" class="${target === rank ? "selected" : ""}" ${!freeComplete && target > rank ? "disabled" : ""}>${target}</button>`).join("")}</div></div>`;
  }).join("");
  return `<section class="genesys-creator-panel"><h2>Skills</h2><p>Free ranks are applied first. Paid ranks then use the character-creation skill cost engine and rank cap.</p>${archetypeChoiceBlocks}${free}<div class="genesys-creator-skill-list">${rows}</div></section>`;
}

function renderTalents(session) {
  const state = session.state;
  const draft = session.draft;
  const talents = library()?.list?.() ?? [];
  const definitions = talentDefinitionsById();
  const selected = state.talentPurchases.map((id, index) => {
    const talent = definitions.get(id);
    if (!talent) return "";
    const previous = state.talentPurchases.slice(0, index).filter((row) => row === id).length;
    const effectiveTier = talent.ranked ? Math.min(5, integer(talent.tier, 1) + previous) : integer(talent.tier, 1);
    return `<div class="genesys-creator-selected-talent"><span><strong>${esc(talent.label)}</strong><small>${talent.ranked ? `Rank ${previous + 1} · ` : ""}Effective Tier ${effectiveTier}</small></span><button type="button" data-creator-remove-talent-index="${index}">Remove</button></div>`;
  }).join("");
  const cards = talents.map((talent) => {
    const evaluation = evaluateDraftTalentPurchase(draft, state, talent);
    return `<button type="button" class="genesys-creator-talent-card" data-creator-buy-talent="${esc(talent.id)}" ${evaluation.allowed ? "" : "disabled"} title="${esc(evaluation.reasons.join(" "))}"><span><strong>${esc(talent.label)}</strong><small>${talent.ranked ? `Ranked · next rank ${evaluation.currentRank + 1}` : "Non-Ranked"}</small></span><b>T${evaluation.effectiveTier} · ${evaluation.cost} XP</b></button>`;
  }).join("");
  return `<section class="genesys-creator-panel"><h2>Talents</h2><p>Talent purchases use effective Tier, XP cost and Talent Pyramid validation. Talents can be removed here before final creation.</p><div class="genesys-creator-selected-list">${selected || '<p class="genesys-empty-row">No Talents selected.</p>'}</div><div class="genesys-creator-talent-list">${cards}</div></section>`;
}

function renderHeroic(session) {
  const state = session.state;
  const primary = heroicsFor(state, "primary-effect");
  const origins = heroicsFor(state, "origin");
  const rules = content()?.getHeroicRules?.(state.settingId) ?? {};
  if (!primary.length) return `<section class="genesys-creator-panel"><h2>Heroic Ability</h2><p>This setting does not register Heroic Ability content. You can continue.</p></section>`;
  return `<section class="genesys-creator-panel"><h2>Heroic Ability</h2><p>${rules.requiredAtCreation ? "This setting requires a Heroic Ability during creation." : "Choose a Heroic Ability if the setting uses them."}</p>
    <div class="genesys-creator-card-grid">${primary.map((entry) => `<button type="button" class="genesys-creator-choice-card ${entry.id === state.heroicPrimaryId ? "selected" : ""}" data-creator-heroic="${esc(entry.id)}"><strong>${esc(entry.label)}</strong><small>Primary Effect · ${integer(rules.storyPointCost, 0)} Story Points to activate</small></button>`).join("")}</div>
    <div class="genesys-creator-form-grid"><label>Heroic Ability Name<input type="text" data-creator-field="heroicName" value="${esc(state.heroicName)}" placeholder="Optional custom name" /></label><label>Origin<select data-creator-heroic-origin><option value="">Choose / leave open</option>${origins.map((entry) => `<option value="${esc(entry.id)}" ${entry.id === state.heroicOriginId ? "selected" : ""}>${esc(entry.label)}</option>`).join("")}</select></label></div>
  </section>`;
}

function renderStory(session) {
  const motivation = session.state.motivation;
  return `<section class="genesys-creator-panel"><h2>Story / Motivation</h2><p>Genesys Motivation is stored as four structured facets. You can also add notes for the character's story.</p><div class="genesys-creator-form-grid">
    <label>Strength<textarea data-creator-motivation="strength" rows="3">${esc(motivation.strength)}</textarea></label>
    <label>Flaw<textarea data-creator-motivation="flaw" rows="3">${esc(motivation.flaw)}</textarea></label>
    <label>Desire<textarea data-creator-motivation="desire" rows="3">${esc(motivation.desire)}</textarea></label>
    <label>Fear<textarea data-creator-motivation="fear" rows="3">${esc(motivation.fear)}</textarea></label>
    <label class="wide">Story Notes<textarea data-creator-motivation="notes" rows="4">${esc(motivation.notes)}</textarea></label>
  </div></section>`;
}

function itemLabelMap(state) {
  return new Map((equipmentApi()?.listDefinitions?.(state.settingId) ?? []).map((entry) => [entry.id, entry.label ?? entry.name ?? entry.id]));
}

function gearOptionLabel(option, labels) {
  return (option ?? []).map((row) => `${integer(row.quantity, 1) > 1 ? `${integer(row.quantity, 1)}× ` : ""}${labels.get(row.id) ?? row.id}`).join(", ");
}

function renderEquipment(session) {
  const state = session.state;
  const draft = session.draft;
  const labels = itemLabelMap(state);
  const pack = draft?.careerStartingGear?.[0] ?? null;
  if (!pack) return `<section class="genesys-creator-panel"><h2>Equipment</h2><p>This career does not register a starting gear package.</p></section>`;
  const groups = (pack.groups ?? []).map((group) => {
    if (group.type === "fixed") return `<div class="genesys-creator-gear-group"><h3>${esc(group.label ?? group.id)}</h3><p>${esc(gearOptionLabel(group.items, labels))}</p></div>`;
    if (group.type === "choice") return `<div class="genesys-creator-gear-group"><h3>${esc(group.label ?? group.id)}</h3><div class="genesys-creator-card-grid compact">${(group.options ?? []).map((option, index) => `<button type="button" class="genesys-creator-choice-card ${Number(state.startingGearSelections[group.id]) === index ? "selected" : ""}" data-creator-gear-choice="${esc(group.id)}" data-creator-gear-option="${index}"><strong>Option ${index + 1}</strong><small>${esc(gearOptionLabel(option, labels))}</small></button>`).join("")}</div></div>`;
    return "";
  }).join("");
  const formula = draft?.startingGearResolution?.funds?.formula;
  const funds = formula ? `<div class="genesys-creator-funds"><div><strong>Starting Funds</strong><span>${esc(formula)}</span></div>${state.startingFundsRoll ? `<b>${integer(state.wallet?.value, 0)} ${esc(state.wallet?.abbreviation ?? "")}</b><button type="button" data-creator-roll-funds>Reroll</button>` : `<button type="button" class="genesys-primary-action" data-creator-roll-funds>Roll ${esc(formula)}</button>`}</div>` : "";
  return `<section class="genesys-creator-panel"><h2>Equipment</h2><p>Choose the Career starting package. The resulting Items are created on the final Actor.</p>${groups}${funds}</section>`;
}

function reviewLine(label, value) {
  return `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}

function renderReview(session) {
  const state = session.state;
  const draft = session.draft;
  const archetype = currentArchetype(state);
  const career = currentCareer(state);
  const validation = wizardValidation(session);
  const skillMap = new Map(skillsFor(state).map((entry) => [entry.id, entry.label]));
  const purchasedSkills = Object.entries(draft?.skills ?? {}).filter(([, row]) => integer(row.rank, 0) > 0).map(([id, row]) => `${skillMap.get(id) ?? id} ${integer(row.rank, 0)}`).join(" · ");
  const talentMap = talentDefinitionsById();
  const talents = state.talentPurchases.map((id) => talentMap.get(id)?.label ?? id).join(" · ") || "None";
  const gearLabels = itemLabelMap(state);
  const gear = (draft?.startingGearResolution?.items ?? []).map((row) => `${integer(row.quantity, 1) > 1 ? `${integer(row.quantity, 1)}× ` : ""}${gearLabels.get(row.id) ?? row.id}`).join(" · ") || "None";
  return `<section class="genesys-creator-panel"><h2>Review</h2><p>Review the complete draft before the Actor is created. This is the same draft that will be written by the creation services.</p>
    <div class="genesys-creator-review-grid">
      ${reviewLine("Name", state.identity.name || "—")}${reviewLine("Setting", state.settingId)}${reviewLine("Archetype", archetype?.label ?? "—")}${reviewLine("Career", career?.label ?? "—")}${reviewLine("Characteristics", characteristicSummary(draft?.characteristics ?? {}))}${reviewLine("Skills", purchasedSkills || "None")}${reviewLine("Talents", talents)}${reviewLine("Heroic Ability", draft?.heroicAbility?.name || "—")}${reviewLine("Equipment", gear)}${reviewLine("Funds", `${integer(draft?.wallet?.value, 0)} ${text(draft?.wallet?.abbreviation)}`)}
    </div>
    ${validation.errors.length ? `<div class="genesys-creator-validation error"><strong>Must fix before creation</strong>${validation.errors.map((row) => `<p>${esc(row)}</p>`).join("")}</div>` : '<div class="genesys-creator-validation ok"><strong>Ready to create.</strong></div>'}
    ${validation.warnings.length ? `<div class="genesys-creator-validation warning"><strong>Warnings</strong>${validation.warnings.map((row) => `<p>${esc(row)}</p>`).join("")}</div>` : ""}
  </section>`;
}

function renderStepBody(session) {
  switch (STEPS[session.state.step]?.id) {
    case "identity": return renderIdentity(session);
    case "archetype": return renderArchetype(session);
    case "career": return renderCareer(session);
    case "characteristics": return renderCharacteristics(session);
    case "skills": return renderSkills(session);
    case "talents": return renderTalents(session);
    case "heroic": return renderHeroic(session);
    case "story": return renderStory(session);
    case "equipment": return renderEquipment(session);
    case "review": return renderReview(session);
    default: return "";
  }
}

function renderWizard(session) {
  const dialog = session.dialog;
  const requirements = stepRequirements(session);
  const isReview = STEPS[session.state.step]?.id === "review";
  const validation = isReview ? wizardValidation(session) : null;
  dialog.innerHTML = `<div class="genesys-creator-shell">
    <header class="genesys-creator-header"><div><strong>Genesys Character Creator</strong><small>${esc(STEPS[session.state.step]?.label ?? "")}</small></div>${xpBar(session)}<button type="button" data-creator-close aria-label="Close">×</button></header>
    <div class="genesys-creator-layout"><nav class="genesys-creator-steps">${STEPS.map((step, index) => `<button type="button" data-creator-go-step="${index}" class="${index === session.state.step ? "active" : ""} ${index < session.state.step ? "visited" : ""}"><span>${index + 1}</span>${esc(step.label)}</button>`).join("")}</nav><main class="genesys-creator-main">${renderStepBody(session)}</main></div>
    ${requirements.length ? `<div class="genesys-creator-step-warning">${requirements.map((row) => `<span>${esc(row)}</span>`).join("")}</div>` : ""}
    <footer class="genesys-creator-footer"><div><button type="button" data-creator-save>Save Draft</button>${session.actor ? `<span class="genesys-creator-saved-actor">Draft Actor: ${esc(session.actor.name)}</span>` : ""}</div><div><button type="button" data-creator-back ${session.state.step === 0 ? "disabled" : ""}>Back</button>${isReview ? `<button type="button" class="genesys-primary-action" data-creator-finalize ${validation?.valid ? "" : "disabled"}>Create Character</button>` : `<button type="button" class="genesys-primary-action" data-creator-next ${requirements.length ? "disabled" : ""}>Next</button>`}</div></footer>
  </div>`;
}

function setPath(root, path, value) {
  const parts = String(path).split(".");
  let cursor = root;
  for (let index = 0; index < parts.length - 1; index++) {
    cursor[parts[index]] ??= {};
    cursor = cursor[parts[index]];
  }
  cursor[parts.at(-1)] = value;
}

function rebuildAndRender(session, { notify = true } = {}) {
  try {
    session.draft = rebuildDraft(session.state);
    renderWizard(session);
    return true;
  }
  catch (error) {
    if (notify) ui?.notifications?.warn?.(String(error?.message ?? error));
    return false;
  }
}

function mutateAndRebuild(session, mutator) {
  const before = clone(session.state);
  mutator(session.state);
  try {
    session.draft = rebuildDraft(session.state);
    renderWizard(session);
  }
  catch (error) {
    session.state = before;
    session.draft = rebuildDraft(session.state);
    renderWizard(session);
    ui?.notifications?.warn?.(String(error?.message ?? error));
  }
}

async function ensureDraftActor(session) {
  if (session.actor) return session.actor;
  const name = text(session.state.identity.name, "Unfinished Character");
  const actor = await Actor.create({ name, type: "character", ...(text(session.state.identity.portrait) ? { img: text(session.state.identity.portrait) } : {}) });
  if (!actor) throw new Error("Foundry could not create the draft Actor.");
  session.actor = actor;
  return actor;
}

async function saveDraft(session) {
  session.draft = rebuildDraft(session.state);
  const actor = await ensureDraftActor(session);
  if (actor.name !== text(session.state.identity.name, actor.name)) await actor.update({ name: text(session.state.identity.name, actor.name) });
  session.draft.wizard = wizardSnapshot(session.state);
  session.draft.status = "draft";
  await creation().saveDraft(actor, session.draft);
  ui?.notifications?.info?.(`${actor.name} draft saved.`);
  renderWizard(session);
}

async function syncCreationTalents(actor, session) {
  const lib = library();
  if (!lib?.purchase) return;
  const definitions = talentDefinitionsById();
  for (const talentId of session.state.talentPurchases) {
    const talent = definitions.get(talentId);
    if (!talent) continue;
    await lib.purchase(actor, talent, { chargeXp: false });
  }
}

async function finalizeCharacter(session) {
  session.draft = rebuildDraft(session.state);
  const validation = wizardValidation(session);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  const actor = await ensureDraftActor(session);
  const career = currentCareer(session.state);
  const archetype = currentArchetype(session.state);
  session.draft.wizard = wizardSnapshot(session.state);
  await creation().finalize(actor, session.draft, { career });
  await syncCreationTalents(actor, session);
  const update = {
    name: text(session.state.identity.name, actor.name),
    "system.profile.archetype": archetype?.label ?? session.state.archetypeId,
    "system.profile.career": career?.label ?? session.state.careerId
  };
  if (text(session.state.identity.concept)) update["system.profile.background"] = text(session.state.identity.concept);
  if (text(session.state.identity.portrait)) update.img = text(session.state.identity.portrait);
  await actor.update(update);
  ui?.notifications?.info?.(`${actor.name} created.`);
  session.dialog.close();
  actor.sheet?.render?.({ force: true });
}

function actorDrafts() {
  const api = creation();
  return Array.from(game?.actors?.contents ?? []).map((actor) => ({ actor, draft: api?.getDraft?.(actor) })).filter(({ draft }) => draft && draft.status !== "complete");
}

function closeActiveSession() {
  if (activeSession?.dialog?.open) activeSession.dialog.close();
}

function openWizard({ actor = null, draft = null } = {}) {
  closeActiveSession();
  const state = initialState(draft);
  const dialog = document.createElement("dialog");
  dialog.className = "genesys-character-creator";
  document.body.append(dialog);
  const session = { actor, state, draft: null, dialog };
  activeSession = session;
  try {
    session.draft = rebuildDraft(state);
  }
  catch (error) {
    console.error(`${SYSTEM_ID} | Could not initialize Character Creator draft`, error);
    session.draft = creation()?.createDraft?.({ settingId: state.settingId, rules: content()?.getCreationRules?.(state.settingId) }) ?? null;
  }
  renderWizard(session);
  dialog.addEventListener("close", () => {
    dialog.remove();
    if (activeSession === session) activeSession = null;
  }, { once: true });
  dialog.addEventListener("input", (event) => {
    const field = event.target?.dataset?.creatorField;
    if (field) setPath(session.state, field, event.target.value);
    const motivation = event.target?.dataset?.creatorMotivation;
    if (motivation) session.state.motivation[motivation] = event.target.value;
  });
  dialog.addEventListener("change", (event) => {
    if (event.target?.matches?.("[data-creator-setting]")) {
      session.state.settingId = event.target.value;
      resetAfterSetting(session.state);
      session.draft = rebuildDraft(session.state);
      renderWizard(session);
      return;
    }
    if (event.target?.matches?.("[data-creator-heroic-origin]")) {
      mutateAndRebuild(session, (state) => { state.heroicOriginId = event.target.value; });
      return;
    }
    const archetypeSkill = event.target?.dataset?.creatorArchetypeSkill;
    if (archetypeSkill) {
      const archetype = currentArchetype(session.state);
      const choice = (archetype?.choices ?? []).find((entry) => entry.type === "skill-grant");
      const max = integer(choice?.count, 0);
      const current = new Set(session.state.archetypeSkillChoices);
      if (event.target.checked) current.add(archetypeSkill); else current.delete(archetypeSkill);
      if (current.size > max) {
        event.target.checked = false;
        ui?.notifications?.warn?.(`Choose exactly ${max} archetype skill grants.`);
        return;
      }
      mutateAndRebuild(session, (state) => { state.archetypeSkillChoices = [...current]; });
      return;
    }
    const freeCareer = event.target?.dataset?.creatorFreeCareer;
    if (freeCareer) {
      const career = currentCareer(session.state);
      const max = integer(career?.freeSkillChoices, 0);
      const current = new Set(session.state.freeCareerSkills);
      if (event.target.checked) current.add(freeCareer); else current.delete(freeCareer);
      if (current.size > max) {
        event.target.checked = false;
        ui?.notifications?.warn?.(`Choose exactly ${max} free career skills.`);
        return;
      }
      mutateAndRebuild(session, (state) => { state.freeCareerSkills = [...current]; });
    }
  });
  dialog.addEventListener("click", async (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;
    if (button.matches("[data-creator-close]")) { dialog.close(); return; }
    if (button.matches("[data-creator-back]")) { session.state.step = Math.max(0, session.state.step - 1); rebuildAndRender(session); return; }
    if (button.matches("[data-creator-next]")) {
      session.draft = rebuildDraft(session.state);
      const requirements = stepRequirements(session);
      if (requirements.length) { ui?.notifications?.warn?.(requirements.join(" ")); return; }
      session.state.step = Math.min(STEPS.length - 1, session.state.step + 1);
      renderWizard(session);
      return;
    }
    if (button.matches("[data-creator-go-step]")) {
      const target = integer(button.dataset.creatorGoStep, session.state.step, 0, STEPS.length - 1);
      if (target <= session.state.step) { session.state.step = target; rebuildAndRender(session); }
      return;
    }
    if (button.matches("[data-creator-archetype]")) {
      mutateAndRebuild(session, (state) => { state.archetypeId = button.dataset.creatorArchetype; resetAfterArchetype(state); state.archetypeId = button.dataset.creatorArchetype; });
      return;
    }
    if (button.matches("[data-creator-career]")) {
      mutateAndRebuild(session, (state) => { state.careerId = button.dataset.creatorCareer; state.careerVariantId = button.dataset.creatorCareerVariant ?? ""; resetAfterCareer(state); state.careerId = button.dataset.creatorCareer; state.careerVariantId = button.dataset.creatorCareerVariant ?? ""; });
      return;
    }
    if (button.matches("[data-creator-characteristic-plus]")) {
      const id = button.dataset.creatorCharacteristicPlus;
      mutateAndRebuild(session, (state) => { const current = integer(state.characteristicTargets?.[id], session.draft?.characteristics?.[id] ?? 2, 1, 6); state.characteristicTargets[id] = Math.min(5, current + 1); });
      return;
    }
    if (button.matches("[data-creator-characteristic-minus]")) {
      const id = button.dataset.creatorCharacteristicMinus;
      const start = integer(session.draft?.startingCharacteristics?.[id], 2, 1, 6);
      mutateAndRebuild(session, (state) => { const current = integer(state.characteristicTargets?.[id], start, 1, 6); state.characteristicTargets[id] = Math.max(start, current - 1); });
      return;
    }
    if (button.matches("[data-creator-skill]")) {
      const id = button.dataset.creatorSkill;
      const rank = integer(button.dataset.creatorSkillRank, 0, 0, 5);
      mutateAndRebuild(session, (state) => { state.skillTargets[id] = rank; });
      return;
    }
    if (button.matches("[data-creator-archetype-ability-choice]")) {
      mutateAndRebuild(session, (state) => { state.archetypeAbilityChoices[button.dataset.creatorArchetypeAbilityChoice] = button.dataset.creatorArchetypeAbility; });
      return;
    }
    if (button.matches("[data-creator-buy-talent]")) {
      mutateAndRebuild(session, (state) => { state.talentPurchases.push(button.dataset.creatorBuyTalent); });
      return;
    }
    if (button.matches("[data-creator-remove-talent-index]")) {
      mutateAndRebuild(session, (state) => { state.talentPurchases.splice(integer(button.dataset.creatorRemoveTalentIndex, 0), 1); });
      return;
    }
    if (button.matches("[data-creator-heroic]")) {
      mutateAndRebuild(session, (state) => { state.heroicPrimaryId = button.dataset.creatorHeroic; });
      return;
    }
    if (button.matches("[data-creator-gear-choice]")) {
      mutateAndRebuild(session, (state) => { state.startingGearSelections[button.dataset.creatorGearChoice] = integer(button.dataset.creatorGearOption, 0); });
      return;
    }
    if (button.matches("[data-creator-roll-funds]")) {
      try {
        let draft = rebuildDraft(session.state);
        draft = creation().rollStartingFunds(draft);
        session.state.startingFundsRoll = clone(draft.startingFundsRoll);
        session.state.wallet = clone(draft.wallet);
        session.draft = rebuildDraft(session.state);
        renderWizard(session);
      }
      catch (error) { ui?.notifications?.warn?.(String(error?.message ?? error)); }
      return;
    }
    if (button.matches("[data-creator-save]")) {
      try { await saveDraft(session); }
      catch (error) { console.error(`${SYSTEM_ID} | Save Character Creator draft failed`, error); ui?.notifications?.error?.(String(error?.message ?? error)); }
      return;
    }
    if (button.matches("[data-creator-finalize]")) {
      button.disabled = true;
      try { await finalizeCharacter(session); }
      catch (error) { button.disabled = false; console.error(`${SYSTEM_ID} | Finalize Character Creator failed`, error); ui?.notifications?.error?.(String(error?.message ?? error)); }
    }
  });
  dialog.showModal();
  return session;
}

function openLauncher() {
  const drafts = actorDrafts();
  const dialog = document.createElement("dialog");
  dialog.className = "genesys-character-creator-launcher";
  dialog.innerHTML = `<div class="genesys-creator-launcher-shell"><header><div><strong>Genesys Character Creator</strong><small>Create a new character or resume a saved draft.</small></div><button type="button" data-launcher-close>×</button></header><button type="button" class="genesys-primary-action genesys-creator-new" data-launcher-new><i class="fa-solid fa-user-plus"></i> New Character</button><div class="genesys-creator-draft-list"><h3>Saved Drafts</h3>${drafts.length ? drafts.map(({ actor, draft }) => `<button type="button" data-launcher-resume="${esc(actor.id)}"><span><strong>${esc(draft.identity?.name || actor.name)}</strong><small>${esc(draft.archetypeId || "No archetype")} · ${esc(draft.careerId || "No career")}</small></span><b>Resume</b></button>`).join("") : '<p class="genesys-empty-row">No unfinished character drafts.</p>'}</div></div>`;
  document.body.append(dialog);
  dialog.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;
    if (button.matches("[data-launcher-close]")) dialog.close();
    if (button.matches("[data-launcher-new]")) { dialog.close(); openWizard(); }
    if (button.matches("[data-launcher-resume]")) {
      const actor = game.actors.get(button.dataset.launcherResume);
      const draft = creation()?.getDraft?.(actor);
      dialog.close();
      openWizard({ actor, draft });
    }
  });
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.showModal();
  return dialog;
}

function installActorDirectoryButton(app, html) {
  if (!game?.user?.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0] ?? app?.element;
  if (!root?.querySelector || root.querySelector("[data-open-genesys-character-creator]")) return;
  const header = root.querySelector(".directory-header .header-actions") ?? root.querySelector(".directory-header");
  if (!header) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "genesys-character-creator-directory-button";
  button.dataset.openGenesysCharacterCreator = "true";
  button.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Character Creator';
  button.addEventListener("click", (event) => { event.preventDefault(); openLauncher(); });
  header.append(button);
}

Hooks.on("renderActorDirectory", installActorDirectoryButton);
Hooks.once("ready", () => {
  const api = Object.freeze({ protocol: WIZARD_PROTOCOL, open: openLauncher, newCharacter: () => openWizard(), resume: (actor) => openWizard({ actor, draft: creation()?.getDraft?.(actor) }) });
  Object.defineProperty(game, "genesysCharacterCreator", { configurable: true, value: api });
  console.log(`${SYSTEM_ID} | Character Creator Wizard ready`);
});
