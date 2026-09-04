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
    }
    else {
        section.insertAdjacentHTML("beforeend", '<p class="genesys-empty-row">No weapons equipped.</p>');
    }

    // Existing combat handlers resolve their controls through this class.
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
        grid.append(clone);
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

function buildActionsPanel(root) {
    if (!root || root.dataset.genesysActionsTab === "true")
        return;

    const tabs = root.querySelector(".genesys-sheet-tabs");
    const equipmentTab = root.querySelector("[data-genesys-tab='equipment']");
    const equipmentPanel = root.querySelector("[data-genesys-tab-panel='equipment']");
    if (!tabs || !equipmentTab || !equipmentPanel)
        return;

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
    layout.className = "genesys-actions-layout";
    layout.append(buildCombatActions(root), buildTalentActions(root), buildGeneralActions());
    panel.append(layout);
    equipmentPanel.before(panel);

    root.dataset.genesysActionsTab = "true";
}

function initializeActionsTabs() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]"))
        buildActionsPanel(root);
}

const observer = new MutationObserver(() => initializeActionsTabs());
Hooks.once("ready", () => {
    initializeActionsTabs();
    observer.observe(document.body, { childList: true, subtree: true });
});
