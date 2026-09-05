import { GenesysCharacterSheet } from "./sheets/character-sheet.js";

const SYSTEM_ID = "genesys-vtt";
const OBSERVERS = new WeakMap();

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

function actorSettingId(actor) {
    const draft = actor?.getFlag?.(SYSTEM_ID, "characterCreationDraft") ?? actor?.flags?.[SYSTEM_ID]?.characterCreationDraft ?? null;
    const settingId = text(draft?.settingId);
    if (settingId)
        return settingId;
    try {
        return text(game?.settings?.get?.(SYSTEM_ID, "rulesProfile"));
    }
    catch {
        return "";
    }
}

function contentLabel(kind, id, settingId) {
    if (!id)
        return "";
    return game?.genesysContent?.getContent?.(kind, { settingId })?.find?.((row) => String(row.id) === String(id))?.label ?? String(id);
}

function motivationRow(facet, label, value) {
    return `<label class="genesys-v1752-motivation-row"><span>${esc(label)}</span><textarea rows="2" data-v1752-motivation="${esc(facet)}" placeholder="${esc(label)}">${esc(value)}</textarea></label>`;
}

function mountBiography(root, actor) {
    const summary = root.querySelector("[data-genesys-tab-panel='summary']");
    const layout = summary?.querySelector(".genesys-biography-layout");
    if (!summary || !layout)
        return false;

    layout.querySelector("[data-character-story-integration]")?.remove();

    const settingId = actorSettingId(actor);
    const motivation = actor?.system?.motivations ?? {};
    const heroic = actor?.system?.heroicAbility ?? {};
    const originLabels = Array.from(heroic.origins ?? []).map((id) => contentLabel("heroicAbilities", id, settingId)).filter(Boolean);
    const secondaryLabels = Array.from(heroic.secondaryEffectIds ?? []).map((id) => contentLabel("heroicAbilities", id, settingId)).filter(Boolean);
    const heroicSelected = Boolean(heroic.selected || heroic.primaryEffectId || heroic.name);

    const section = document.createElement("section");
    section.className = "genesys-character-story-integration genesys-v1752-story-integration";
    section.dataset.characterStoryIntegration = "true";
    section.innerHTML = `<div class="genesys-v1752-story-stack">
      <section class="genesys-fantasy-panel genesys-ornate-panel genesys-v1752-heroic-panel">
        <div class="genesys-panel-banner"><div><h2>Heroic Ability</h2><p>Character heroic progression</p></div></div>
        ${heroicSelected ? `<div class="genesys-v1752-heroic-name"><strong>${esc(heroic.name || heroic.primaryEffectLabel || "Heroic Ability")}</strong><span>${esc(heroic.primaryEffectLabel || contentLabel("heroicAbilities", heroic.primaryEffectId, settingId))}</span></div>
        <div class="genesys-v1752-heroic-stats">
          <div><span>Power</span><strong>${esc(text(heroic.powerLevel, "base"))}</strong></div>
          <div><span>Activation</span><strong>${esc(text(heroic.activation, "incidental"))}</strong></div>
          <div><span>Story Cost</span><strong>${integer(heroic.storyPointCost)} SP</strong></div>
          <div><span>Uses</span><strong>${integer(heroic.usesThisSession)}</strong></div>
        </div>
        <div class="genesys-v1752-heroic-details"><span><b>Origin:</b> ${esc(originLabels.join(" · ") || "—")}</span>${secondaryLabels.length ? `<span><b>Secondary:</b> ${esc(secondaryLabels.join(" · "))}</span>` : ""}</div>` : '<p class="genesys-empty-row">No Heroic Ability selected.</p>'}
      </section>
      <section class="genesys-fantasy-panel genesys-ornate-panel genesys-v1752-motivation-panel">
        <div class="genesys-panel-banner"><div><h2>Motivation</h2><p>Strength · Flaw · Desire · Fear</p></div></div>
        <div class="genesys-v1752-motivation-list">
          ${motivationRow("strength", "Strength", motivation.strength)}
          ${motivationRow("flaw", "Flaw", motivation.flaw)}
          ${motivationRow("desire", "Desire", motivation.desire)}
          ${motivationRow("fear", "Fear", motivation.fear)}
        </div>
      </section>
    </div>`;

    const storyPanel = layout.querySelector(".genesys-biography-story");
    if (storyPanel)
        layout.insertBefore(section, storyPanel);
    else
        layout.append(section);
    return true;
}

function magicSkillState(actor, skillId) {
    return Array.from(actor?.system?.skills ?? []).find((row) => String(row?.id) === String(skillId)) ?? { id: skillId, rank: 0, career: false };
}

function equippedRequiredImplement(actor, requiredTags = []) {
    if (!requiredTags.length)
        return true;
    return Array.from(actor?.items?.contents ?? []).some((item) => item?.type === "implement" && item?.system?.equipped && requiredTags.every((tag) => Array.from(item?.system?.tags ?? []).includes(tag)));
}

function actionLabel(id) {
    return String(id ?? "").replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function mountMagicAccess(root, actor) {
    const panel = root.querySelector("[data-genesys-tab-panel='skills'] .genesys-skills-panel") ?? root.querySelector("[data-genesys-tab-panel='skills']");
    if (!panel)
        return false;
    panel.querySelector("[data-magic-integration]")?.remove();

    const settingId = actorSettingId(actor);
    const rules = game?.genesysContent?.getMagicRules?.(settingId) ?? {};
    const magicIds = Array.from(rules.magicSkillIds ?? []);
    if (!magicIds.length)
        return true;
    const definitions = new Map((game?.genesysContent?.getContent?.("skills", { settingId }) ?? []).map((row) => [row.id, row]));

    const section = document.createElement("section");
    section.className = "genesys-magic-integration genesys-fantasy-panel genesys-v1752-magic-access";
    section.dataset.magicIntegration = "true";
    section.innerHTML = `<div class="genesys-panel-banner"><div><h2>Magic Access</h2><p>What this character can cast with each magic skill.</p></div></div><div class="genesys-v1752-magic-grid">${magicIds.map((skillId) => {
        const state = magicSkillState(actor, skillId);
        const skillRule = rules?.skillRules?.[skillId] ?? {};
        const implementReady = !skillRule.requiresImplement || equippedRequiredImplement(actor, skillRule.requiredImplementTags ?? []);
        const canCast = Boolean(state.career) && integer(state.rank) >= integer(rules.minimumRankToCast, 1) && implementReady;
        const blockers = [];
        if (!state.career)
            blockers.push("Not a Career Skill");
        if (integer(state.rank) < integer(rules.minimumRankToCast, 1))
            blockers.push(`Rank ${integer(rules.minimumRankToCast, 1)} required`);
        if (!implementReady)
            blockers.push("Required implement not equipped");
        const actions = Object.entries(rules.actions ?? {}).filter(([, ids]) => Array.isArray(ids) && ids.includes(skillId)).map(([id]) => actionLabel(id));
        return `<article class="genesys-v1752-magic-card ${canCast ? "available" : "locked"}"><header><strong>${esc(definitions.get(skillId)?.label ?? skillId)}</strong><span>Rank ${integer(state.rank)}</span></header><div class="genesys-v1752-magic-status"><b>${canCast ? "CASTING ACCESS" : "LOCKED"}</b><span>${state.career ? "Career" : "Non-Career"}</span></div><p>${esc(actions.join(" · ") || "No registered actions")}</p>${blockers.length ? `<small>${esc(blockers.join(" · "))}</small>` : ""}</article>`;
    }).join("")}</div>`;

    const magicGroup = Array.from(panel.querySelectorAll("details.genesys-skill-group")).find((details) => /^magic/i.test(text(details.querySelector(":scope > summary")?.textContent)));
    if (magicGroup)
        magicGroup.before(section);
    else
        panel.append(section);
    return true;
}

function mountQuickPoolOnActions(root) {
    const quickPool = root.querySelector(".genesys-quick-pool");
    const actionsPanel = root.querySelector("[data-genesys-tab-panel='actions']");
    if (!quickPool || !actionsPanel)
        return false;
    if (quickPool.closest("[data-genesys-tab-panel='actions']"))
        return true;
    quickPool.classList.remove("genesys-skills-quick-pool");
    quickPool.classList.add("genesys-actions-quick-pool");
    const toolbar = actionsPanel.querySelector(".genesys-actions-toolbar");
    if (toolbar)
        toolbar.after(quickPool);
    else
        actionsPanel.prepend(quickPool);
    return true;
}

function currencyDisplay(actor) {
    const currency = actor?.system?.currency ?? {};
    return { value: integer(currency.value), label: text(currency.label, "Funds") };
}

function implementRows(actor) {
    return Array.from(actor?.items?.contents ?? []).filter((item) => item?.type === "implement");
}

function mountEquipment(root, actor) {
    const panel = root.querySelector("[data-genesys-tab-panel='equipment'] .genesys-inventory-panel") ?? root.querySelector("[data-genesys-tab-panel='equipment']");
    if (!panel)
        return false;

    panel.querySelector("[data-wallet-summary]")?.remove();
    panel.querySelector("[data-implements-group]")?.remove();
    panel.querySelector("[data-create-implement]")?.remove();

    const currency = currencyDisplay(actor);
    const wallet = document.createElement("div");
    wallet.className = "genesys-v1752-wallet";
    wallet.dataset.walletSummary = "true";
    wallet.innerHTML = `<div><i class="fa-solid fa-coins" aria-hidden="true"></i><span>Wallet</span></div><strong>${currency.value} ${esc(currency.label)}</strong>`;
    const banner = panel.querySelector(".genesys-panel-banner");
    if (banner)
        banner.after(wallet);
    else
        panel.prepend(wallet);

    const createBar = panel.querySelector(".genesys-item-createbar");
    if (createBar) {
        const createButton = document.createElement("button");
        createButton.type = "button";
        createButton.dataset.createImplement = "true";
        createButton.textContent = "+ Magic Implement";
        createBar.append(createButton);
    }

    const implements = implementRows(actor);
    const implementIds = new Set(implements.map((item) => String(item.id)));
    for (const row of panel.querySelectorAll("details.genesys-item-group .genesys-item-row")) {
        if (implementIds.has(String(row.dataset.itemId ?? "")))
            row.remove();
    }

    const details = document.createElement("details");
    details.className = "genesys-item-group genesys-implements-group genesys-v1752-implements";
    details.dataset.implementsGroup = "true";
    details.open = true;
    details.innerHTML = `<summary>Magic Implements (${implements.length})</summary><div class="genesys-item-table">${implements.length ? implements.map((item) => `<div class="genesys-item-row genesys-simple-item-row" data-item-id="${esc(item.id)}"><button type="button" class="genesys-item-name" data-v1752-edit-implement="${esc(item.id)}">${esc(item.name)}</button><span>Damage +${integer(item.system?.damage)} · Enc ${integer(item.system?.encumbrance)}${item.system?.materialId ? ` · ${esc(item.system.materialId)}` : ""}</span><label class="genesys-v1752-equipped"><input type="checkbox" data-v1752-implement-equipped="${esc(item.id)}" ${item.system?.equipped ? "checked" : ""}/> Equipped</label><span class="genesys-item-actions"><button type="button" data-v1752-delete-implement="${esc(item.id)}">×</button></span></div>`).join("") : '<p class="genesys-empty-row">No magic implements yet.</p>'}</div>`;

    const attachmentGroup = Array.from(panel.querySelectorAll("details.genesys-item-group")).find((group) => /^attachments/i.test(text(group.querySelector(":scope > summary")?.textContent)));
    if (attachmentGroup)
        attachmentGroup.before(details);
    else
        panel.append(details);
    return true;
}

async function updateMotivation(actor, facet, value) {
    const current = actor?.system?.motivations?.toObject?.() ?? actor?.system?.motivations ?? {};
    const next = { ...current, [facet]: value };
    const summary = game?.genesysHeroic?.motivations?.summarize?.(next) ?? "";
    await actor.update({ [`system.motivations.${facet}`]: value, "system.profile.motivation": summary });
}

function installRootEvents(root, actor) {
    if (root.dataset.genesysV1752Events === "true")
        return;
    root.dataset.genesysV1752Events = "true";

    root.addEventListener("change", async (event) => {
        const motivation = event.target?.closest?.("[data-v1752-motivation]");
        if (motivation) {
            try {
                await updateMotivation(actor, String(motivation.dataset.v1752Motivation), motivation.value);
            }
            catch (error) {
                console.error(`${SYSTEM_ID} | Motivation update failed`, error);
                ui?.notifications?.error?.(String(error?.message ?? error));
            }
            return;
        }
        const equipped = event.target?.closest?.("[data-v1752-implement-equipped]");
        if (equipped) {
            const item = actor.items?.get?.(String(equipped.dataset.v1752ImplementEquipped ?? ""));
            if (item)
                await item.update({ "system.equipped": Boolean(equipped.checked) });
        }
    });

    root.addEventListener("click", async (event) => {
        const create = event.target?.closest?.("[data-create-implement]");
        const edit = event.target?.closest?.("[data-v1752-edit-implement]");
        const remove = event.target?.closest?.("[data-v1752-delete-implement]");
        if (!create && !edit && !remove)
            return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (create) {
            const created = await actor.createEmbeddedDocuments("Item", [{ name: "New Magic Implement", type: "implement", system: { damage: 0, encumbrance: 0, priceMode: "priced", materialId: "", tags: [], equipped: false, notes: "" } }]);
            created?.[0]?.sheet?.render?.({ force: true });
            return;
        }
        const id = String(edit?.dataset.v1752EditImplement ?? remove?.dataset.v1752DeleteImplement ?? "");
        const item = actor.items?.get?.(id);
        if (!item)
            return;
        if (edit)
            item.sheet?.render?.({ force: true });
        if (remove)
            await item.delete();
    }, true);
}

export function mountCharacterSheetIntegration(root, actor) {
    if (!root || !actor)
        return;
    root.dataset.actorId = String(actor.id ?? "");
    mountBiography(root, actor);
    mountMagicAccess(root, actor);
    mountQuickPoolOnActions(root);
    mountEquipment(root, actor);
    installRootEvents(root, actor);
}

export function scheduleCharacterSheetIntegration(root, actor) {
    if (!root || !actor)
        return;
    mountCharacterSheetIntegration(root, actor);
    for (const delay of [0, 25, 75, 150, 300]) {
        setTimeout(() => {
            if (root.isConnected)
                mountCharacterSheetIntegration(root, actor);
        }, delay);
    }
    if (!OBSERVERS.has(root)) {
        const observer = new MutationObserver(() => {
            if (!root.isConnected) {
                observer.disconnect();
                OBSERVERS.delete(root);
                return;
            }
            mountCharacterSheetIntegration(root, actor);
        });
        observer.observe(root, { childList: true, subtree: true });
        OBSERVERS.set(root, observer);
    }
}

const originalOnRender = GenesysCharacterSheet.prototype._onRender;
if (!GenesysCharacterSheet.prototype.__genesysV1752Mounted) {
    Object.defineProperty(GenesysCharacterSheet.prototype, "__genesysV1752Mounted", { configurable: true, value: true });
    GenesysCharacterSheet.prototype._onRender = async function(context, options) {
        await originalOnRender.call(this, context, options);
        scheduleCharacterSheetIntegration(this.element, this.actor);
    };
}

console.log(`${SYSTEM_ID} | 0.0.1752 direct Character Sheet integration mounted`);
