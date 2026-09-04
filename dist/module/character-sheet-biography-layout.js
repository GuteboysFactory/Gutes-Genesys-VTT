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

function parseCriticalCount(panel) {
    const text = panel?.querySelector?.(".genesys-critical-quick")?.textContent ?? "";
    const match = text.match(/Critical Injuries\s*·\s*(\d+)/i);
    return Math.max(0, Number(match?.[1] ?? 0) || 0);
}

function makeStatusDetails({ className, iconClass, label, count, body }) {
    const details = document.createElement("details");
    details.className = `genesys-biography-status-details ${className}`;

    const summary = document.createElement("summary");
    summary.className = "genesys-biography-status-summary";

    const icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("aria-hidden", "true");

    const title = document.createElement("span");
    title.className = "genesys-biography-status-label";
    title.textContent = label;

    const badge = document.createElement("span");
    badge.className = `genesys-biography-status-badge${count > 0 ? " active" : ""}`;
    badge.textContent = String(count);
    badge.title = `${count} ${label.toLowerCase()}`;

    const chevron = document.createElement("i");
    chevron.className = "fa-solid fa-chevron-down genesys-biography-status-chevron";
    chevron.setAttribute("aria-hidden", "true");

    summary.append(icon, title, badge, chevron);

    const popover = document.createElement("div");
    popover.className = "genesys-biography-status-popover";
    if (body)
        popover.append(body);

    details.append(summary, popover);
    return details;
}

function buildConditionsDropdown(conditionsPanel) {
    const body = document.createElement("div");
    body.className = "genesys-biography-condition-dropdown";

    const activeRows = Array.from(conditionsPanel?.querySelectorAll?.(".genesys-condition-active") ?? []);
    if (activeRows.length) {
        const heading = document.createElement("strong");
        heading.className = "genesys-biography-dropdown-heading";
        heading.textContent = "Active Conditions";
        body.append(heading);
        for (const row of activeRows)
            body.append(row);
    }
    else {
        const empty = document.createElement("p");
        empty.className = "genesys-empty-row";
        empty.textContent = "No active conditions.";
        body.append(empty);
    }

    const quickGrid = conditionsPanel?.querySelector?.(".genesys-condition-quick-grid");
    if (quickGrid) {
        const addHeading = document.createElement("strong");
        addHeading.className = "genesys-biography-dropdown-heading";
        addHeading.textContent = "Add Condition";
        body.append(addHeading, quickGrid);
    }

    const manage = document.createElement("button");
    manage.type = "button";
    manage.className = "genesys-biography-manage-button";
    manage.dataset.openTab = "effects";
    manage.textContent = "Manage Effects";
    body.append(manage);

    return { body, count: activeRows.length };
}

function buildCriticalDropdown(conditionsPanel) {
    const count = parseCriticalCount(conditionsPanel);
    const body = document.createElement("div");
    body.className = "genesys-biography-critical-dropdown";

    const summary = document.createElement("p");
    summary.className = "genesys-biography-critical-summary";
    summary.textContent = count > 0
        ? `${count} unresolved Critical ${count === 1 ? "Injury" : "Injuries"}.`
        : "No unresolved Critical Injuries.";
    body.append(summary);

    const manage = document.createElement("button");
    manage.type = "button";
    manage.className = "genesys-biography-manage-button";
    manage.dataset.openTab = "effects";
    manage.textContent = count > 0 ? "View Critical Injuries" : "Open Effects";
    body.append(manage);

    return { body, count };
}

function buildInitiativeStatus(initiativePanel) {
    const status = document.createElement("div");
    status.className = "genesys-biography-initiative-status";

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-bolt";
    icon.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "genesys-biography-status-label";
    label.textContent = "Initiative";

    const skillSelect = initiativePanel?.querySelector?.("[data-initiative-skill]");
    if (skillSelect) {
        skillSelect.closest("label")?.replaceWith(skillSelect);
        skillSelect.classList.add("genesys-biography-initiative-select");
    }

    initiativePanel?.querySelector?.("[data-initiative-side]")?.closest?.("label")?.remove();

    const rollButton = initiativePanel?.querySelector?.("[data-action='rollInitiative']");
    if (rollButton) {
        rollButton.textContent = "Roll Initiative";
        rollButton.classList.add("genesys-biography-initiative-roll");
    }

    const controls = document.createElement("div");
    controls.className = "genesys-biography-initiative-controls";
    if (skillSelect)
        controls.append(skillSelect);
    if (rollButton)
        controls.append(rollButton);

    status.append(icon, label, controls);

    if (game?.user?.isGM) {
        const gmDetails = document.createElement("details");
        gmDetails.className = "genesys-biography-gm-initiative";
        const gmSummary = document.createElement("summary");
        gmSummary.title = "GM Encounter Controls";
        gmSummary.innerHTML = '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
        const gmMenu = document.createElement("div");
        gmMenu.className = "genesys-biography-gm-menu";
        for (const selector of ["[data-action='startInitiative']", "[data-action='openEncounterTracker']", "[data-action='resetInitiative']"]) {
            for (const button of initiativePanel?.querySelectorAll?.(selector) ?? []) {
                button.classList.add("genesys-gm-initiative-action");
                gmMenu.append(button);
            }
        }
        gmDetails.append(gmSummary, gmMenu);
        status.append(gmDetails);
    }

    return status;
}

function buildBiographyStatusBar(conditionsPanel, initiativePanel) {
    const bar = document.createElement("div");
    bar.className = "genesys-biography-statusbar";

    const conditions = buildConditionsDropdown(conditionsPanel);
    const criticals = buildCriticalDropdown(conditionsPanel);

    bar.append(
        makeStatusDetails({
            className: "genesys-biography-conditions-status",
            iconClass: "fa-solid fa-circle-exclamation",
            label: "Conditions",
            count: conditions.count,
            body: conditions.body
        }),
        makeStatusDetails({
            className: "genesys-biography-criticals-status",
            iconClass: "fa-solid fa-heart-crack",
            label: "Criticals",
            count: criticals.count,
            body: criticals.body
        }),
        buildInitiativeStatus(initiativePanel)
    );

    return bar;
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

    const conditionsPanel = summaryPanel.querySelector(".genesys-summary-effects");
    const initiativePanel = summaryPanel.querySelector(".genesys-summary-encounter");
    const backgroundField = findField(notesPanel, "system.profile.background");
    const notesField = findField(notesPanel, "system.profile.notes");

    const statusBar = buildBiographyStatusBar(conditionsPanel, initiativePanel);

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

    const layout = document.createElement("div");
    layout.className = "genesys-biography-layout genesys-biography-layout-wide";
    layout.append(statusBar, storyPanel);

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
