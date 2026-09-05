const SYSTEM_ID = "genesys-vtt";
const CUSTOM_ACTIONS_FLAG = "customActions";

function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function actionId() {
    return `action:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function actorForRoot(root) {
    const actorId = String(root?.dataset?.actorId ?? "");
    if (actorId) {
        const direct = game?.actors?.get?.(actorId);
        if (direct)
            return direct;
    }
    const name = String(root?.dataset?.actorName ?? "");
    const worldActor = Array.from(game?.actors ?? []).find((actor) => actor?.name === name && actor?.isOwner);
    if (worldActor) {
        root.dataset.actorId = worldActor.id;
        return worldActor;
    }
    const tokenActor = Array.from(canvas?.tokens?.placeables ?? [])
        .map((token) => token?.actor)
        .find((actor) => actor?.name === name && actor?.isOwner);
    return tokenActor ?? null;
}

function normalizeCustomAction(raw = {}) {
    return {
        id: String(raw.id ?? actionId()),
        name: String(raw.name ?? "Custom Action"),
        activation: String(raw.activation ?? "action"),
        skillId: String(raw.skillId ?? ""),
        difficulty: Math.max(0, Math.min(5, Math.trunc(Number(raw.difficulty ?? 2) || 0))),
        notes: String(raw.notes ?? "")
    };
}

function customActions(actor) {
    const raw = actor?.getFlag?.(SYSTEM_ID, CUSTOM_ACTIONS_FLAG) ?? [];
    return Array.isArray(raw) ? raw.map(normalizeCustomAction) : [];
}

async function writeCustomActions(actor, actions) {
    if (!actor?.setFlag)
        throw new Error("Unable to resolve the Actor for this sheet.");
    await actor.setFlag(SYSTEM_ID, CUSTOM_ACTIONS_FLAG, actions.map(normalizeCustomAction));
}

function makeSection(title, subtitle = "") {
    const section = document.createElement("section");
    section.className = "genesys-fantasy-panel genesys-ornate-panel genesys-actions-section";
    const banner = document.createElement("div");
    banner.className = "genesys-panel-banner";
    const copy = document.createElement("div");
    const heading = document.createElement("h2");
    heading.textContent = title;
    copy.append(heading);
    if (subtitle) {
        const text = document.createElement("p");
        text.textContent = subtitle;
        copy.append(text);
    }
    banner.append(copy);
    section.append(banner);
    return section;
}

function buildQuickDicePool() {
    const pool = document.createElement("section");
    pool.className = "genesys-fantasy-panel genesys-ornate-panel genesys-quick-pool genesys-actions-quick-pool";
    pool.dataset.quickDicePool = "true";
    pool.innerHTML = `<div class="genesys-panel-banner"><h2>Quick Dice Pool</h2></div>
      <div class="genesys-quick-dice-row">
        <button type="button" class="genesys-quick-die die-boost" data-quick-die="boost" title="Boost"><span class="die-glyph">◆</span><strong data-quick-count>0</strong></button>
        <button type="button" class="genesys-quick-die die-ability" data-quick-die="ability" title="Ability"><span class="die-glyph">◆</span><strong data-quick-count>0</strong></button>
        <button type="button" class="genesys-quick-die die-proficiency" data-quick-die="proficiency" title="Proficiency"><span class="die-glyph">✦</span><strong data-quick-count>0</strong></button>
        <button type="button" class="genesys-quick-die die-setback" data-quick-die="setback" title="Setback"><span class="die-glyph">●</span><strong data-quick-count>0</strong></button>
        <button type="button" class="genesys-quick-die die-difficulty" data-quick-die="difficulty" title="Difficulty"><span class="die-glyph">⬢</span><strong data-quick-count>0</strong></button>
        <button type="button" class="genesys-quick-die die-challenge" data-quick-die="challenge" title="Challenge"><span class="die-glyph">▼</span><strong data-quick-count>0</strong></button>
      </div>
      <div class="genesys-quick-pool-actions"><button type="button" class="genesys-primary-action" data-quick-roll><i class="fa-solid fa-dice" aria-hidden="true"></i> Roll Dice</button><button type="button" class="genesys-secondary-action" data-quick-clear>Clear</button></div>`;
    return pool;
}

function buildRollTools(root) {
    const details = document.createElement("details");
    details.className = "genesys-fantasy-panel genesys-ornate-panel genesys-actions-roll-tools genesys-actions-dice-tools";
    details.open = false;
    const summary = document.createElement("summary");
    summary.className = "genesys-actions-dice-tools-summary";
    summary.innerHTML = '<span><i class="fa-solid fa-dice" aria-hidden="true"></i><strong>Dice Tools</strong><small>Quick Dice Pool & Advanced Check Setup</small></span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
    const body = document.createElement("div");
    body.className = "genesys-actions-dice-tools-body";
    body.append(buildQuickDicePool());

    const sourceAdvanced = root.querySelector("[data-genesys-tab-panel='skills'] .genesys-check-engine-lab");
    if (sourceAdvanced) {
        sourceAdvanced.hidden = true;
        sourceAdvanced.classList.add("genesys-check-engine-source");
        const advanced = sourceAdvanced.cloneNode(true);
        advanced.hidden = false;
        advanced.classList.remove("genesys-check-engine-source");
        advanced.classList.add("genesys-actions-check-engine");
        advanced.open = false;
        for (const control of advanced.querySelectorAll("input, select")) {
            control.addEventListener("change", () => {
                const dataKey = Object.keys(control.dataset)[0];
                if (!dataKey)
                    return;
                const source = sourceAdvanced.querySelector(`[data-${dataKey.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}]`);
                if (!source)
                    return;
                source.value = control.value;
                source.dispatchEvent(new Event("change", { bubbles: true }));
            });
        }
        body.append(advanced);
    }
    details.append(summary, body);
    return details;
}

function addExplicitWeaponEditButtons(section) {
    for (const row of section.querySelectorAll(".genesys-item-row[data-item-id]")) {
        const actions = row.querySelector(".genesys-item-actions");
        if (!actions || actions.querySelector("[data-actions-explicit-edit]"))
            continue;
        const edit = document.createElement("button");
        edit.type = "button";
        edit.dataset.action = "editItem";
        edit.dataset.actionsExplicitEdit = "true";
        edit.title = "Edit this Action's source weapon";
        edit.textContent = "Edit";
        actions.prepend(edit);
    }
}

function buildCombatActions(root) {
    const section = makeSection("Combat Actions", "Attack with the character's current weapons using live Skills, Characteristics, Talents, and target state.");
    const inventory = root.querySelector("[data-genesys-tab-panel='equipment'] .genesys-inventory-panel");
    if (!inventory) {
        section.insertAdjacentHTML("beforeend", '<p class="genesys-empty-row">No combat actions available.</p>');
        return section;
    }
    const combatControls = inventory.querySelector(".genesys-combat-controls")?.cloneNode(true);
    if (combatControls)
        section.append(combatControls);
    const weaponDifficulty = inventory.querySelector(".genesys-weapon-difficulty")?.cloneNode(true);
    if (weaponDifficulty) {
        const advanced = document.createElement("details");
        advanced.className = "genesys-actions-advanced";
        const summary = document.createElement("summary");
        summary.textContent = "Raw Roll Options";
        advanced.append(summary, weaponDifficulty);
        section.append(advanced);
    }
    const weaponGroup = Array.from(inventory.querySelectorAll(".genesys-item-group"))
        .find((group) => group.querySelector("summary")?.textContent?.trim()?.toLowerCase()?.startsWith("weapons"));
    if (weaponGroup) {
        const clone = weaponGroup.cloneNode(true);
        clone.open = true;
        section.append(clone);
        addExplicitWeaponEditButtons(section);
    }
    else {
        section.insertAdjacentHTML("beforeend", '<p class="genesys-empty-row">No weapons equipped.</p>');
    }
    section.classList.add("genesys-inventory-panel");
    return section;
}

function buildTalentActions(root) {
    const section = makeSection("Talent Actions", "Active Talents appear here when they provide an action the character can currently invoke.");
    const source = root.querySelector("[data-genesys-tab-panel='talents']");
    const activeCards = Array.from(source?.querySelectorAll?.(".genesys-talent-card") ?? [])
        .filter((card) => card.querySelector("[data-action='useTalent']"));
    if (!activeCards.length) {
        section.insertAdjacentHTML("beforeend", '<p class="genesys-empty-row">No active Talent Actions available right now.</p>');
        return section;
    }
    const grid = document.createElement("div");
    grid.className = "genesys-actions-card-grid";
    for (const card of activeCards) {
        const clone = card.cloneNode(true);
        clone.classList.add("genesys-action-card");
        const actions = clone.querySelector(".genesys-talent-card-actions");
        if (actions && !actions.querySelector("[data-actions-explicit-edit]")) {
            const edit = document.createElement("button");
            edit.type = "button";
            edit.dataset.action = "editItem";
            edit.dataset.actionsExplicitEdit = "true";
            edit.title = "Edit this Action's source Talent";
            edit.textContent = "Edit";
            actions.prepend(edit);
        }
        grid.append(clone);
    }
    section.append(grid);
    return section;
}

function buildCustomActions(root) {
    const section = makeSection("Custom Actions", "Actor-specific actions created by the player or GM.");
    const actor = actorForRoot(root);
    const actions = customActions(actor);
    const grid = document.createElement("div");
    grid.className = "genesys-actions-card-grid genesys-custom-actions-grid";
    if (!actions.length) {
        const empty = document.createElement("p");
        empty.className = "genesys-empty-row";
        empty.textContent = "No Custom Actions yet. Use + Custom Action above to create one.";
        section.append(empty);
        return section;
    }
    for (const action of actions) {
        const card = document.createElement("article");
        card.className = "genesys-general-action-card genesys-custom-action-card";
        card.dataset.customActionId = action.id;
        card.innerHTML = `<i class="fa-solid fa-wand-sparkles" aria-hidden="true"></i><div class="genesys-custom-action-copy"><strong>${esc(action.name)}</strong><p>${esc(action.activation)}${action.skillId ? ` · ${esc(action.skillId)}` : ""} · Difficulty ${action.difficulty}</p>${action.notes ? `<small>${esc(action.notes)}</small>` : ""}</div><div class="genesys-custom-action-buttons"><button type="button" data-custom-action-edit="${esc(action.id)}">Edit</button><button type="button" data-custom-action-delete="${esc(action.id)}" title="Delete Custom Action">×</button></div>`;
        grid.append(card);
    }
    section.append(grid);
    return section;
}

function buildGeneralActions() {
    const section = makeSection("General Actions", "Reusable Action Templates and setting-specific actions will populate this area through the Character Content Registry.");
    const grid = document.createElement("div");
    grid.className = "genesys-actions-general-grid";
    const entries = [
        ["fa-solid fa-hand", "Assist", "Assist another character when the fiction and encounter rules allow it."],
        ["fa-solid fa-person-running", "Maneuver", "Movement and other maneuver-based options remain governed by the encounter state."],
        ["fa-solid fa-dice", "Custom Check", "Use Skills or Quick Dice Pool for checks that are not represented by a dedicated Action yet."]
    ];
    for (const [iconClass, label, description] of entries) {
        const card = document.createElement("div");
        card.className = "genesys-general-action-card";
        card.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i><div><strong>${label}</strong><p>${description}</p></div>`;
        grid.append(card);
    }
    section.append(grid);
    return section;
}

function buildActionsToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "genesys-actions-toolbar";
    toolbar.innerHTML = `<div><strong>Actions</strong><span>Live actions, actor-specific actions, and reusable templates.</span></div><button type="button" class="genesys-primary-action genesys-create-custom-action" data-custom-action-create><i class="fa-solid fa-plus" aria-hidden="true"></i> Custom Action</button>`;
    return toolbar;
}

function buildActionEditor(root) {
    const dialog = document.createElement("dialog");
    dialog.className = "genesys-custom-action-editor";
    dialog.dataset.customActionEditor = "true";
    dialog.innerHTML = `<form method="dialog" class="genesys-custom-action-form"><header><div><strong data-custom-action-editor-title>Custom Action</strong><small>Actor-bound Action</small></div><button type="button" data-custom-action-cancel aria-label="Close">×</button></header><input type="hidden" name="actionId" value="" /><div class="genesys-custom-action-form-grid"><label>Name<input type="text" name="actionName" value="" required /></label><label>Activation<select name="activation"><option value="action">Action</option><option value="maneuver">Maneuver</option><option value="incidental">Incidental</option><option value="out-of-turn-incidental">Out-of-Turn Incidental</option></select></label><label>Skill<input type="text" name="skillId" value="" placeholder="e.g. athletics, melee-heavy" /></label><label>Difficulty<input type="number" name="difficulty" value="2" min="0" max="5" /></label></div><label class="genesys-custom-action-notes">Description<textarea name="notes" rows="5" placeholder="What does this Action do?"></textarea></label><footer><button type="button" data-custom-action-cancel>Cancel</button><button type="submit" class="genesys-primary-action">Save Action</button></footer></form>`;
    root.append(dialog);
    return dialog;
}

function openActionEditor(root, action = null) {
    const dialog = root.querySelector("[data-custom-action-editor]") ?? buildActionEditor(root);
    const normalized = action ? normalizeCustomAction(action) : normalizeCustomAction({ name: "Custom Action", difficulty: 2 });
    dialog.querySelector("[data-custom-action-editor-title]").textContent = action ? `Edit ${normalized.name}` : "Create Custom Action";
    dialog.querySelector("[name='actionId']").value = action ? normalized.id : "";
    dialog.querySelector("[name='actionName']").value = normalized.name;
    dialog.querySelector("[name='activation']").value = normalized.activation;
    dialog.querySelector("[name='skillId']").value = normalized.skillId;
    dialog.querySelector("[name='difficulty']").value = String(normalized.difficulty);
    dialog.querySelector("[name='notes']").value = normalized.notes;
    dialog.showModal?.();
}

function rebuildActionsPanel(root) {
    root.querySelector("[data-genesys-tab='actions']")?.remove();
    root.querySelector("[data-genesys-tab-panel='actions']")?.remove();
    root.querySelector("[data-custom-action-editor]")?.remove();
    delete root.dataset.genesysActionsTab;
    buildActionsPanel(root);
    root.querySelector("[data-genesys-tab='actions']")?.click?.();
}

function buildActionsPanel(root) {
    if (!root || root.dataset.genesysActionsTab === "true")
        return;
    const tabs = root.querySelector(".genesys-sheet-tabs");
    const equipmentTab = root.querySelector("[data-genesys-tab='equipment']");
    const equipmentPanel = root.querySelector("[data-genesys-tab-panel='equipment']");
    if (!tabs || !equipmentTab || !equipmentPanel)
        return;
    actorForRoot(root);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.genesysTab = "actions";
    button.textContent = "Actions";
    equipmentTab.before(button);
    const panel = document.createElement("div");
    panel.className = "genesys-tab-panel genesys-actions-panel";
    panel.dataset.genesysTabPanel = "actions";
    panel.hidden = true;

    const layout = document.createElement("div");
    layout.className = "genesys-actions-layout genesys-actions-layout-v1756";
    const diceTools = buildRollTools(root);
    const left = document.createElement("div");
    left.className = "genesys-actions-column genesys-actions-column-left";
    left.append(buildCombatActions(root), buildCustomActions(root));
    const right = document.createElement("div");
    right.className = "genesys-actions-column genesys-actions-column-right";
    right.append(buildTalentActions(root), buildGeneralActions());
    layout.append(diceTools, left, right);

    panel.append(buildActionsToolbar(), layout);
    equipmentPanel.before(panel);
    root.dataset.genesysActionsTab = "true";
}

async function saveEditor(root, form) {
    const actor = actorForRoot(root);
    if (!actor)
        throw new Error("Could not resolve this character Actor.");
    const id = String(form.elements.actionId?.value ?? "");
    const actions = customActions(actor);
    const nextAction = normalizeCustomAction({ id: id || actionId(), name: form.elements.actionName?.value, activation: form.elements.activation?.value, skillId: form.elements.skillId?.value, difficulty: form.elements.difficulty?.value, notes: form.elements.notes?.value });
    const index = actions.findIndex((entry) => entry.id === id);
    if (index >= 0)
        actions[index] = nextAction;
    else
        actions.push(nextAction);
    await writeCustomActions(actor, actions);
    rebuildActionsPanel(root);
}

async function deleteCustomAction(root, id) {
    const actor = actorForRoot(root);
    if (!actor)
        throw new Error("Could not resolve this character Actor.");
    await writeCustomActions(actor, customActions(actor).filter((action) => action.id !== id));
    rebuildActionsPanel(root);
}

function initializeActionsTabs() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]"))
        buildActionsPanel(root);
}

document.addEventListener("click", async (event) => {
    const create = event.target?.closest?.("[data-custom-action-create]");
    if (create) {
        event.preventDefault();
        event.stopPropagation();
        const root = create.closest("[data-genesys-sheet-tabs]");
        if (root)
            openActionEditor(root);
        return;
    }
    const edit = event.target?.closest?.("[data-custom-action-edit]");
    if (edit) {
        event.preventDefault();
        event.stopPropagation();
        const root = edit.closest("[data-genesys-sheet-tabs]");
        const actor = actorForRoot(root);
        const action = customActions(actor).find((entry) => entry.id === edit.dataset.customActionEdit);
        if (root && action)
            openActionEditor(root, action);
        return;
    }
    const remove = event.target?.closest?.("[data-custom-action-delete]");
    if (remove) {
        event.preventDefault();
        event.stopPropagation();
        const root = remove.closest("[data-genesys-sheet-tabs]");
        if (!root)
            return;
        try {
            await deleteCustomAction(root, String(remove.dataset.customActionDelete ?? ""));
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
        return;
    }
    const cancel = event.target?.closest?.("[data-custom-action-cancel]");
    if (cancel) {
        event.preventDefault();
        cancel.closest("dialog")?.close?.();
    }
});

document.addEventListener("submit", async (event) => {
    const form = event.target?.closest?.(".genesys-custom-action-form");
    if (!form)
        return;
    event.preventDefault();
    event.stopPropagation();
    const root = form.closest("[data-genesys-sheet-tabs]");
    if (!root)
        return;
    try {
        await saveEditor(root, form);
    }
    catch (error) {
        ui?.notifications?.warn?.(String(error?.message ?? error));
    }
});

const observer = new MutationObserver(() => initializeActionsTabs());
Hooks.once("ready", () => {
    initializeActionsTabs();
    observer.observe(document.body, { childList: true, subtree: true });
    console.log("genesys-vtt | 0.0.1756 Actions layout ready");
});
