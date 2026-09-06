const activeTabsByActor = new Map();

function sheetRootFrom(node) {
    return node?.closest?.("[data-genesys-sheet-tabs]") ?? null;
}

function sheetKey(root) {
    return String(root?.dataset?.actorId ?? root?.dataset?.actorName ?? "").trim();
}

function visibleTabId(root) {
    return String(root?.querySelector?.("[data-genesys-tab].active")?.dataset?.genesysTab ?? root?.dataset?.activeTab ?? "").trim();
}

function applyTab(root, tabId) {
    const id = String(tabId ?? "").trim();
    if (!root?.querySelectorAll || !id)
        return false;
    const panel = root.querySelector(`[data-genesys-tab-panel="${id}"]`);
    if (!panel)
        return false;
    for (const button of root.querySelectorAll("[data-genesys-tab]")) {
        const active = button.dataset.genesysTab === id;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
    }
    for (const candidate of root.querySelectorAll("[data-genesys-tab-panel]")) {
        const active = candidate.dataset.genesysTabPanel === id;
        candidate.classList.toggle("active", active);
        candidate.hidden = !active;
    }
    root.dataset.activeTab = id;
    return true;
}

function rememberTab(root, tabId) {
    const key = sheetKey(root);
    const id = String(tabId ?? "").trim();
    if (key && id)
        activeTabsByActor.set(key, id);
}

function initializeTabState(root) {
    if (!root || root.dataset.genesysPersistentTabState === "true")
        return;
    root.dataset.genesysPersistentTabState = "true";
    const key = sheetKey(root);
    const remembered = key ? activeTabsByActor.get(key) : "";
    if (remembered && applyTab(root, remembered))
        return;
    const current = visibleTabId(root);
    if (current)
        rememberTab(root, current);
}

function initializeExistingSheets() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]"))
        initializeTabState(root);
}

document.addEventListener("click", (event) => {
    const target = event.target?.closest?.("button");
    if (!target)
        return;
    const tabId = target.matches("[data-genesys-tab]")
        ? target.dataset.genesysTab
        : target.matches("[data-open-tab]")
            ? target.dataset.openTab
            : "";
    if (!tabId)
        return;
    const root = sheetRootFrom(target);
    rememberTab(root, tabId);
});

const observer = new MutationObserver(() => initializeExistingSheets());
Hooks.once("ready", () => {
    initializeExistingSheets();
    observer.observe(document.body, { childList: true, subtree: true });
});
import { GenesysUiObserver as MutationObserver } from "./ui-mount-coordinator-v1812.js";
