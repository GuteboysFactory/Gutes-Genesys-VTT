import { rollPoolToChat } from "./dice-ui.js";

const DIE_TYPES = ["boost", "ability", "proficiency", "setback", "difficulty", "challenge"];
const LEGACY_CANVAS_DICE_CONTROLS = new Set(["Genesys Dice Lab", "Roll Pool"]);

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

function renderSkillRankPips(row) {
    const input = row?.querySelector?.("[data-skill-rank]");
    if (!input || row.querySelector("[data-skill-rank-pips]"))
        return;
    const current = Math.max(0, Math.min(5, Math.trunc(Number(input.value ?? 0) || 0)));
    input.classList.add("genesys-skill-rank-native");
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;

    const pips = document.createElement("div");
    pips.className = "genesys-skill-rank-pips";
    pips.dataset.skillRankPips = "true";
    pips.setAttribute("role", "group");
    pips.setAttribute("aria-label", "Skill rank 0 to 5");
    for (let rank = 1; rank <= 5; rank += 1) {
        const pip = document.createElement("button");
        pip.type = "button";
        pip.className = "genesys-skill-rank-pip";
        pip.dataset.skillRankPip = String(rank);
        pip.classList.toggle("filled", rank <= current);
        pip.setAttribute("aria-pressed", rank <= current ? "true" : "false");
        pip.setAttribute("aria-label", `Set skill rank ${rank}`);
        pip.title = `Rank ${rank}`;
        pips.append(pip);
    }
    input.after(pips);
}

function refreshSkillRankPips(row, rank) {
    const normalized = Math.max(0, Math.min(5, Math.trunc(Number(rank ?? 0) || 0)));
    for (const pip of row.querySelectorAll("[data-skill-rank-pip]")) {
        const pipRank = Number(pip.dataset.skillRankPip ?? 0);
        const filled = pipRank <= normalized;
        pip.classList.toggle("filled", filled);
        pip.setAttribute("aria-pressed", filled ? "true" : "false");
    }
}

function setSkillRankFromPip(pip) {
    const row = pip?.closest?.("[data-skill-id]");
    const input = row?.querySelector?.("[data-skill-rank]");
    if (!row || !input || input.disabled)
        return;
    const clickedRank = Math.max(1, Math.min(5, Math.trunc(Number(pip.dataset.skillRankPip ?? 1))));
    const current = Math.max(0, Math.min(5, Math.trunc(Number(input.value ?? 0) || 0)));
    const next = current === clickedRank ? clickedRank - 1 : clickedRank;
    input.value = String(next);
    refreshSkillRankPips(row, next);
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

function removeLegacyCanvasDiceControls(root = document) {
    const nodes = root?.querySelectorAll?.("button, [role='button'], [aria-label], [data-tooltip], [title]") ?? [];
    for (const node of nodes) {
        const labels = [
            node.getAttribute?.("aria-label"),
            node.getAttribute?.("data-tooltip"),
            node.getAttribute?.("title"),
            node.textContent?.trim?.()
        ].filter(Boolean);
        if (!labels.some((label) => LEGACY_CANVAS_DICE_CONTROLS.has(String(label).trim())))
            continue;
        const wrapper = node.closest?.("li.control-tool, li.scene-control, .control-tool") ?? node;
        wrapper.remove?.();
    }
}

function initializeSheet(root) {
    if (!root || root.dataset.genesysV15Bound === "true")
        return;
    root.dataset.genesysV15Bound = "true";
    setActiveTab(root, root.dataset.activeTab || "summary");
    for (const button of root.querySelectorAll("[data-quick-die]"))
        renderQuickDie(button, Number(button.dataset.count ?? 0));
    for (const row of root.querySelectorAll("[data-skill-id]"))
        renderSkillRankPips(row);
}

function initializeExistingSheets() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]"))
        initializeSheet(root);
}

document.addEventListener("click", async (event) => {
    const target = event.target?.closest?.("button");
    if (!target)
        return;

    if (target.matches("[data-skill-rank-pip]")) {
        event.preventDefault();
        event.stopPropagation();
        setSkillRankFromPip(target);
        return;
    }

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

const observer = new MutationObserver(() => {
    initializeExistingSheets();
    removeLegacyCanvasDiceControls();
});
Hooks.once("ready", () => {
    initializeExistingSheets();
    removeLegacyCanvasDiceControls();
    observer.observe(document.body, { childList: true, subtree: true });
});
