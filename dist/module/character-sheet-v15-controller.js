import { rollPoolToChat } from "./dice-ui.js";

const DIE_TYPES = ["boost", "ability", "proficiency", "setback", "difficulty", "challenge"];

function sheetRootFrom(node) {
    return node?.closest?.("[data-genesys-sheet-tabs]") ?? null;
}

function setActiveTab(root, tabId) {
    if (!root || !tabId)
        return;
    for (const button of root.querySelectorAll("[data-genesys-tab]")) {
        const active = button.dataset.genesysTab === tabId;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
    }
    for (const panel of root.querySelectorAll("[data-genesys-tab-panel]")) {
        const active = panel.dataset.genesysTabPanel === tabId;
        panel.classList.toggle("active", active);
        panel.hidden = !active;
    }
    root.dataset.activeTab = tabId;
}

function readQuickPool(root) {
    const pool = Object.fromEntries(DIE_TYPES.map((type) => [type, 0]));
    for (const button of root.querySelectorAll("[data-quick-die]")) {
        const type = String(button.dataset.quickDie ?? "");
        if (!DIE_TYPES.includes(type))
            continue;
        const count = Number(button.dataset.count ?? 0);
        pool[type] = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
    }
    return pool;
}

function renderQuickDie(button, count) {
    const normalized = Math.max(0, Math.min(20, Math.trunc(Number(count ?? 0))));
    button.dataset.count = String(normalized);
    button.classList.toggle("has-dice", normalized > 0);
    const label = button.querySelector("[data-quick-count]");
    if (label)
        label.textContent = normalized > 0 ? String(normalized) : "0";
}

function changeQuickDie(button, delta) {
    const current = Number(button.dataset.count ?? 0);
    renderQuickDie(button, (Number.isFinite(current) ? current : 0) + delta);
}

function clearQuickPool(root) {
    for (const button of root.querySelectorAll("[data-quick-die]"))
        renderQuickDie(button, 0);
}

function poolIsEmpty(pool) {
    return DIE_TYPES.every((type) => Number(pool[type] ?? 0) <= 0);
}

function initializeSheet(root) {
    if (!root || root.dataset.genesysV15Bound === "true")
        return;
    root.dataset.genesysV15Bound = "true";
    setActiveTab(root, root.dataset.activeTab || "summary");
    for (const button of root.querySelectorAll("[data-quick-die]"))
        renderQuickDie(button, Number(button.dataset.count ?? 0));
}

function initializeExistingSheets() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]"))
        initializeSheet(root);
}

document.addEventListener("click", async (event) => {
    const target = event.target?.closest?.("button");
    if (!target)
        return;

    if (target.matches("[data-genesys-tab]")) {
        event.preventDefault();
        const root = sheetRootFrom(target);
        setActiveTab(root, target.dataset.genesysTab);
        return;
    }

    if (target.matches("[data-open-tab]")) {
        event.preventDefault();
        const root = sheetRootFrom(target);
        setActiveTab(root, target.dataset.openTab);
        return;
    }

    if (target.matches("[data-quick-die]")) {
        event.preventDefault();
        changeQuickDie(target, 1);
        return;
    }

    if (target.matches("[data-quick-clear]")) {
        event.preventDefault();
        const poolRoot = target.closest("[data-quick-dice-pool]");
        if (poolRoot)
            clearQuickPool(poolRoot);
        return;
    }

    if (target.matches("[data-quick-roll]")) {
        event.preventDefault();
        const poolRoot = target.closest("[data-quick-dice-pool]");
        const sheetRoot = sheetRootFrom(target);
        if (!poolRoot)
            return;
        const pool = readQuickPool(poolRoot);
        if (poolIsEmpty(pool)) {
            ui?.notifications?.warn?.("Add at least one die to the Quick Dice Pool first.");
            return;
        }
        const speaker = String(sheetRoot?.dataset.actorName ?? "Genesys Roll");
        try {
            await rollPoolToChat(pool, speaker);
        }
        catch (error) {
            console.error("genesys-vtt | Quick Dice Pool roll failed", error);
            ui?.notifications?.error?.(String(error?.message ?? error));
        }
    }
});

document.addEventListener("contextmenu", (event) => {
    const target = event.target?.closest?.("[data-quick-die]");
    if (!target)
        return;
    event.preventDefault();
    changeQuickDie(target, -1);
});

const observer = new MutationObserver(() => initializeExistingSheets());
Hooks.once("ready", () => {
    initializeExistingSheets();
    observer.observe(document.body, { childList: true, subtree: true });
});
