function createPanelBanner(title, subtitle = "") {
    const banner = document.createElement("div");
    banner.className = "genesys-panel-banner genesys-biography-banner";
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
    return banner;
}

function findField(panel, name) {
    return panel?.querySelector?.(`[name="${name}"]`)?.closest?.("label") ?? null;
}

function streamlineInitiative(panel) {
    if (!panel)
        return;
    const heading = panel.querySelector(".genesys-panel-banner h2");
    if (heading)
        heading.textContent = "Initiative";

    panel.querySelector("[data-initiative-side]")?.closest?.("label")?.remove();

    const skillSelect = panel.querySelector("[data-initiative-skill]");
    if (skillSelect)
        skillSelect.closest("label")?.classList.add("genesys-initiative-skill-choice");

    const rollButton = panel.querySelector("[data-action='rollInitiative']");
    if (rollButton) {
        rollButton.textContent = "Roll Initiative";
        rollButton.classList.add("genesys-primary-action");
    }

    const isGm = Boolean(game?.user?.isGM);
    for (const selector of ["[data-action='startInitiative']", "[data-action='openEncounterTracker']", "[data-action='resetInitiative']"]) {
        for (const button of panel.querySelectorAll(selector)) {
            if (!isGm)
                button.remove();
            else
                button.classList.add("genesys-gm-initiative-action");
        }
    }

    const firstParagraph = panel.querySelector(":scope > p");
    if (firstParagraph && rollButton)
        firstParagraph.textContent = "Choose Cool or Vigilance, then roll initiative.";
}

function moveQuickPoolToSkills(summaryPanel, skillsPanel) {
    const quickPool = summaryPanel?.querySelector?.(".genesys-quick-pool");
    if (!quickPool || !skillsPanel)
        return;
    quickPool.classList.add("genesys-skills-quick-pool");
    const advanced = skillsPanel.querySelector(".genesys-check-engine-lab");
    if (advanced)
        advanced.before(quickPool);
    else
        skillsPanel.append(quickPool);
}

function buildBiographyLayout(root) {
    if (!root || root.dataset.genesysBiographyLayout === "true")
        return;

    const summaryPanel = root.querySelector("[data-genesys-tab-panel='summary']");
    const notesPanel = root.querySelector("[data-genesys-tab-panel='notes']");
    const skillsPanel = root.querySelector("[data-genesys-tab-panel='skills'] .genesys-skills-panel");
    if (!summaryPanel || !notesPanel)
        return;

    const summaryTab = root.querySelector("[data-genesys-tab='summary']");
    if (summaryTab)
        summaryTab.textContent = "Biography";
    const notesTab = root.querySelector("[data-genesys-tab='notes']");
    if (notesTab)
        notesTab.textContent = "Configure";

    moveQuickPoolToSkills(summaryPanel, skillsPanel);

    const conditions = summaryPanel.querySelector(".genesys-summary-effects");
    const initiative = summaryPanel.querySelector(".genesys-summary-encounter");
    streamlineInitiative(initiative);

    const backgroundField = findField(notesPanel, "system.profile.background");
    const notesField = findField(notesPanel, "system.profile.notes");

    const layout = document.createElement("div");
    layout.className = "genesys-biography-layout";

    const storyPanel = document.createElement("section");
    storyPanel.className = "genesys-fantasy-panel genesys-ornate-panel genesys-biography-story";
    storyPanel.append(createPanelBanner("Biography & Backstory", "Who this character is beyond the numbers."));

    const storyFields = document.createElement("div");
    storyFields.className = "genesys-biography-fields";
    if (backgroundField) {
        backgroundField.classList.add("genesys-biography-field", "genesys-biography-background");
        storyFields.append(backgroundField);
    }
    if (notesField) {
        notesField.classList.add("genesys-biography-field", "genesys-biography-notes");
        storyFields.append(notesField);
    }
    if (!backgroundField && !notesField) {
        const empty = document.createElement("p");
        empty.className = "genesys-empty-row";
        empty.textContent = "Biography fields are unavailable for this actor.";
        storyFields.append(empty);
    }
    storyPanel.append(storyFields);

    const sidebar = document.createElement("aside");
    sidebar.className = "genesys-biography-sidebar";
    if (conditions)
        sidebar.append(conditions);
    if (initiative)
        sidebar.append(initiative);

    layout.append(storyPanel, sidebar);
    summaryPanel.replaceChildren(layout);
    root.dataset.genesysBiographyLayout = "true";
}

function initializeBiographyLayouts() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]"))
        buildBiographyLayout(root);
}

const observer = new MutationObserver(() => initializeBiographyLayouts());
Hooks.once("ready", () => {
    initializeBiographyLayouts();
    observer.observe(document.body, { childList: true, subtree: true });
});
