const SYSTEM_ID = "genesys-vtt";

function text(value, fallback = "") {
  const out = String(value ?? fallback).trim();
  return out || fallback;
}

function integer(value, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function actorForRoot(root) {
  const actorId = text(root?.dataset?.actorId);
  if (actorId && game?.actors?.get?.(actorId)) return game.actors.get(actorId);
  const actorName = text(root?.dataset?.actorName);
  const actor = Array.from(game?.actors?.contents ?? []).find((entry) => entry?.name === actorName) ?? null;
  if (actor && root) root.dataset.actorId = String(actor.id ?? "");
  return actor;
}

function actorSettingId(actor) {
  const draftSetting = actor?.getFlag?.(SYSTEM_ID, "characterCreationDraft")?.settingId;
  if (draftSetting) return String(draftSetting);
  const actorProfile = actor?.getFlag?.(SYSTEM_ID, "rulesProfile");
  if (actorProfile) return String(actorProfile);
  try { return String(game?.settings?.get?.(SYSTEM_ID, "rulesProfile") ?? ""); }
  catch { return ""; }
}

function contentLabel(kind, id, settingId) {
  if (!id) return "";
  return game?.genesysContent?.getContent?.(kind, { settingId })?.find?.((row) => String(row.id) === String(id))?.label ?? String(id);
}

function motivationCard(facet, label, value) {
  return `<label class="genesys-integration-motivation-card"><span>${esc(label)}</span><textarea rows="3" data-integration-motivation="${esc(facet)}" placeholder="${esc(label)}">${esc(value)}</textarea></label>`;
}

function buildBiographyIntegration(root, actor) {
  const summaryPanel = root.querySelector("[data-genesys-tab-panel='summary']");
  if (!summaryPanel) return;
  const host = summaryPanel.querySelector(".genesys-biography-layout") ?? summaryPanel;
  if (host.querySelector("[data-character-story-integration]")) return;

  const settingId = actorSettingId(actor);
  const motivation = actor?.system?.motivations ?? {};
  const heroic = actor?.system?.heroicAbility ?? {};
  const originLabels = Array.from(heroic.origins ?? []).map((id) => contentLabel("heroicAbilities", id, settingId)).filter(Boolean);
  const secondaryLabels = Array.from(heroic.secondaryEffectIds ?? []).map((id) => contentLabel("heroicAbilities", id, settingId)).filter(Boolean);
  const selected = heroic.selected || heroic.primaryEffectId || heroic.name;

  root.querySelector(".genesys-character-quote")?.classList.add("genesys-structured-motivation-active");

  const section = document.createElement("section");
  section.className = "genesys-character-story-integration";
  section.dataset.characterStoryIntegration = "true";
  section.innerHTML = `<div class="genesys-integration-story-grid">
    <section class="genesys-fantasy-panel genesys-ornate-panel genesys-integration-heroic">
      <div class="genesys-panel-banner"><div><h2>Heroic Ability</h2><p>Realms of Terrinoth character progression</p></div></div>
      ${selected ? `<div class="genesys-integration-heroic-title"><strong>${esc(heroic.name || heroic.primaryEffectLabel || "Heroic Ability")}</strong><span>${esc(heroic.primaryEffectLabel || contentLabel("heroicAbilities", heroic.primaryEffectId, settingId))}</span></div>
      <div class="genesys-integration-meta-grid">
        <div><span>Power</span><strong>${esc(text(heroic.powerLevel, "base"))}</strong></div>
        <div><span>Activation</span><strong>${esc(text(heroic.activation, "incidental"))}</strong></div>
        <div><span>Story Cost</span><strong>${integer(heroic.storyPointCost)} SP</strong></div>
        <div><span>Session Uses</span><strong>${integer(heroic.usesThisSession)}</strong></div>
      </div>
      <div class="genesys-integration-heroic-copy"><span><b>Origin:</b> ${esc(originLabels.join(" · ") || "—")}</span>${secondaryLabels.length ? `<span><b>Secondary:</b> ${esc(secondaryLabels.join(" · "))}</span>` : ""}</div>` : '<p class="genesys-empty-row">No Heroic Ability selected.</p>'}
    </section>
    <section class="genesys-fantasy-panel genesys-ornate-panel genesys-integration-motivations">
      <div class="genesys-panel-banner"><div><h2>Motivation</h2><p>Structured character drives</p></div></div>
      <div class="genesys-integration-motivation-grid">
        ${motivationCard("strength", "Strength", motivation.strength)}
        ${motivationCard("flaw", "Flaw", motivation.flaw)}
        ${motivationCard("desire", "Desire", motivation.desire)}
        ${motivationCard("fear", "Fear", motivation.fear)}
      </div>
    </section>
  </div>`;

  const storyPanel = host.querySelector(".genesys-biography-story");
  if (storyPanel) host.insertBefore(section, storyPanel);
  else host.prepend(section);
}

function magicSkillState(actor, id) {
  return Array.from(actor?.system?.skills ?? []).find((row) => String(row?.id) === String(id)) ?? { id, rank: 0, career: false };
}

function equippedRequiredImplement(actor, requiredTags = []) {
  if (!requiredTags.length) return true;
  return Array.from(actor?.items?.contents ?? []).some((item) => item?.type === "implement" && item?.system?.equipped && requiredTags.every((tag) => Array.from(item?.system?.tags ?? []).includes(tag)));
}

function magicActionsForSkill(rules, skillId) {
  return Object.entries(rules?.actions ?? {}).filter(([, skills]) => Array.isArray(skills) && skills.includes(skillId)).map(([action]) => action.replace(/(^|-)([a-z])/g, (_m, lead, chr) => `${lead ? " " : ""}${chr.toUpperCase()}`));
}

function buildMagicIntegration(root, actor) {
  const skillsTab = root.querySelector("[data-genesys-tab-panel='skills']");
  if (!skillsTab) return;
  const skillsPanel = skillsTab.querySelector(".genesys-skills-panel") ?? skillsTab;
  if (skillsPanel.querySelector("[data-magic-integration]")) return;
  const settingId = actorSettingId(actor);
  const rules = game?.genesysContent?.getMagicRules?.(settingId) ?? {};
  const magicIds = Array.from(rules.magicSkillIds ?? []);
  if (!magicIds.length) return;
  const definitions = new Map((game?.genesysContent?.getContent?.("skills", { settingId }) ?? []).map((row) => [row.id, row]));

  const section = document.createElement("section");
  section.className = "genesys-magic-integration genesys-fantasy-panel";
  section.dataset.magicIntegration = "true";
  const cards = magicIds.map((skillId) => {
    const state = magicSkillState(actor, skillId);
    const skillRule = rules?.skillRules?.[skillId] ?? {};
    const implementReady = !skillRule.requiresImplement || equippedRequiredImplement(actor, skillRule.requiredImplementTags ?? []);
    const canCast = Boolean(state.career) && integer(state.rank) >= integer(rules.minimumRankToCast, 1) && implementReady;
    const blockers = [];
    if (!state.career) blockers.push("not a Career Skill");
    if (integer(state.rank) < integer(rules.minimumRankToCast, 1)) blockers.push(`rank ${integer(rules.minimumRankToCast, 1)} required`);
    if (!implementReady) blockers.push("required implement not equipped");
    return `<article class="genesys-magic-access-card ${canCast ? "available" : "locked"}">
      <header><strong>${esc(definitions.get(skillId)?.label ?? skillId)}</strong><span>Rank ${integer(state.rank)}</span></header>
      <div class="genesys-magic-access-status"><b>${canCast ? "CASTING ACCESS" : "LOCKED"}</b><span>${state.career ? "Career" : "Non-Career"}</span></div>
      <p>${esc(magicActionsForSkill(rules, skillId).join(" · ") || "No registered magic actions")}</p>
      ${blockers.length ? `<small>${esc(blockers.join(" · "))}</small>` : ""}
    </article>`;
  }).join("");
  section.innerHTML = `<div class="genesys-panel-banner"><div><h2>Magic Access</h2><p>Career access and registered action families for this character.</p></div></div><div class="genesys-magic-access-grid">${cards}</div>`;

  const magicGroup = Array.from(skillsPanel.querySelectorAll("details.genesys-skill-group, details")).find((details) => /^magic$/i.test(text(details.querySelector(":scope > summary")?.textContent)));
  if (magicGroup) magicGroup.before(section);
  else skillsPanel.append(section);
}

function walletLabel(actor) {
  const currency = actor?.system?.currency ?? {};
  return `${integer(currency.value)} ${text(currency.label, "Funds")}`;
}

function buildEquipmentIntegration(root, actor) {
  const equipmentTab = root.querySelector("[data-genesys-tab-panel='equipment']");
  if (!equipmentTab) return;
  const panel = equipmentTab.querySelector(".genesys-inventory-panel") ?? equipmentTab;

  const banner = panel.querySelector(".genesys-panel-banner");
  if (banner && !banner.querySelector("[data-wallet-summary]")) {
    const wallet = document.createElement("span");
    wallet.className = "genesys-wallet-summary";
    wallet.dataset.walletSummary = "true";
    wallet.innerHTML = `<i class="fa-solid fa-coins" aria-hidden="true"></i> <strong>${esc(walletLabel(actor))}</strong>`;
    banner.append(wallet);
  }

  const createBar = panel.querySelector(".genesys-item-createbar");
  if (createBar && !createBar.querySelector("[data-create-implement]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.createImplement = "true";
    button.textContent = "+ Magic Implement";
    createBar.append(button);
  }

  const implements = Array.from(actor?.items?.contents ?? []).filter((item) => item?.type === "implement");
  const implementIds = new Set(implements.map((item) => String(item.id)));
  for (const row of panel.querySelectorAll("details.genesys-item-group .genesys-item-row")) {
    if (implementIds.has(String(row.dataset.itemId ?? ""))) row.remove();
  }

  if (!panel.querySelector("[data-implements-group]")) {
    const details = document.createElement("details");
    details.className = "genesys-item-group genesys-implements-group";
    details.dataset.implementsGroup = "true";
    details.innerHTML = `<summary>Magic Implements (${implements.length})</summary><div class="genesys-item-table">${implements.length ? implements.map((item) => `<div class="genesys-item-row genesys-simple-item-row" data-item-id="${esc(item.id)}"><button type="button" class="genesys-item-name" data-integration-edit-item="${esc(item.id)}">${esc(item.name)}</button><span>${item.system?.equipped ? "Equipped" : "Carried"} · Damage +${integer(item.system?.damage)} · Enc ${integer(item.system?.encumbrance)}${item.system?.materialId ? ` · ${esc(item.system.materialId)}` : ""}</span><span class="genesys-item-actions"><button type="button" data-integration-delete-item="${esc(item.id)}">×</button></span></div>`).join("") : '<p class="genesys-empty-row">No magic implements yet.</p>'}</div>`;
    const attachmentGroup = Array.from(panel.querySelectorAll("details.genesys-item-group")).find((details) => /^attachments/i.test(text(details.querySelector(":scope > summary")?.textContent)));
    if (attachmentGroup) attachmentGroup.after(details);
    else panel.append(details);
  }
}

function initializeRoot(root) {
  const actor = actorForRoot(root);
  if (!actor) return;
  buildBiographyIntegration(root, actor);
  buildMagicIntegration(root, actor);
  buildEquipmentIntegration(root, actor);
}

function initializeAll() {
  for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]")) initializeRoot(root);
}

async function updateMotivation(actor, facet, value) {
  const motivation = { ...(actor?.system?.motivations?.toObject?.() ?? actor?.system?.motivations ?? {}), [facet]: value };
  const summary = game?.genesysHeroic?.motivations?.summarize?.(motivation) ?? "";
  await actor.update({ [`system.motivations.${facet}`]: value, ...(summary ? { "system.profile.motivation": summary } : {}) });
}

document.addEventListener("change", async (event) => {
  const field = event.target?.closest?.("[data-integration-motivation]");
  if (!field) return;
  const root = field.closest("[data-genesys-sheet-tabs]");
  const actor = actorForRoot(root);
  if (!actor) return;
  try { await updateMotivation(actor, String(field.dataset.integrationMotivation), field.value); }
  catch (error) { console.error(`${SYSTEM_ID} | Motivation update failed`, error); ui?.notifications?.error?.(String(error?.message ?? error)); }
});

document.addEventListener("click", async (event) => {
  const create = event.target?.closest?.("[data-create-implement]");
  const edit = event.target?.closest?.("[data-integration-edit-item]");
  const remove = event.target?.closest?.("[data-integration-delete-item]");
  if (!create && !edit && !remove) return;
  const root = event.target.closest("[data-genesys-sheet-tabs]");
  const actor = actorForRoot(root);
  if (!actor) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  if (create) {
    const created = await actor.createEmbeddedDocuments("Item", [{ name: "New Magic Implement", type: "implement", system: { damage: 0, encumbrance: 0, priceMode: "priced", materialId: "", tags: [], equipped: false, notes: "" } }]);
    created?.[0]?.sheet?.render?.({ force: true });
    return;
  }
  const id = String(edit?.dataset.integrationEditItem ?? remove?.dataset.integrationDeleteItem ?? "");
  const item = actor.items?.get?.(id);
  if (!item) return;
  if (edit) item.sheet?.render?.({ force: true });
  if (remove) await item.delete();
}, true);

const observer = new MutationObserver(() => initializeAll());
Hooks.once("ready", () => {
  initializeAll();
  observer.observe(document.body, { childList: true, subtree: true });
  Object.defineProperty(game, "genesysCharacterIntegration", {
    configurable: true,
    value: Object.freeze({ version: "1.1", refresh: initializeAll, refreshRoot: initializeRoot, actorSettingId })
  });
  console.log(`${SYSTEM_ID} | 0.0.1751 Character / Item / Magic integration ready`);
});
