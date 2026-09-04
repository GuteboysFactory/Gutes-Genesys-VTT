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

function renderResourceTrack(track) {
    const boxes = track?.querySelector?.("[data-resource-boxes]");
    if (!boxes)
        return;
    const current = Math.max(0, Math.trunc(Number(track.dataset.current ?? 0) || 0));
    const threshold = Math.max(0, Math.min(30, Math.trunc(Number(track.dataset.threshold ?? 0) || 0)));
    boxes.replaceChildren();
    for (let i = 1; i <= threshold; i += 1) {
        const box = document.createElement("span");
        box.className = "genesys-track-box";
        box.classList.toggle("filled", i <= current);
        boxes.append(box);
    }
}

function renderTalentRankPips(card) {
    const holder = card?.querySelector?.("[data-talent-rank-pips]");
    if (!holder)
        return;
    const ranked = String(card.dataset.ranked ?? "false") === "true";
    const rank = Math.max(1, Math.min(5, Math.trunc(Number(card.dataset.talentRank ?? 1) || 1)));
    holder.replaceChildren();
    if (!ranked) {
        holder.hidden = true;
        return;
    }
    holder.hidden = false;
    for (let i = 1; i <= 5; i += 1) {
        const pip = document.createElement("span");
        pip.className = "genesys-talent-rank-pip";
        pip.classList.toggle("filled", i <= rank);
        holder.append(pip);
    }
}

function arrangeTalentPyramid(root) {
    const pyramid = root?.querySelector?.("[data-talent-pyramid]");
    if (!pyramid || pyramid.dataset.arranged === "true")
        return;
    pyramid.dataset.arranged = "true";
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const cards = Array.from(pyramid.querySelectorAll("[data-talent-source] .genesys-talent-card"));
    for (const card of cards) {
        const tier = Math.max(1, Math.min(5, Math.trunc(Number(card.dataset.tier ?? 1) || 1)));
        counts[tier] += 1;
        renderTalentRankPips(card);
        pyramid.querySelector(`[data-talent-lane="${tier}"] [data-tier-cards]`)?.append(card);
    }
    for (let tier = 1; tier <= 5; tier += 1) {
        const lane = pyramid.querySelector(`[data-talent-lane="${tier}"]`);
        const count = counts[tier];
        const laneCount = lane?.querySelector?.("[data-lane-count]");
        if (laneCount)
            laneCount.textContent = `${count} Talent${count === 1 ? "" : "s"}`;
        const status = pyramid.querySelector(`[data-tier-status="${tier}"]`);
        const countLabel = status?.querySelector?.("[data-tier-count]");
        if (countLabel)
            countLabel.textContent = String(count);
        const lowerCount = tier === 1 ? count : counts[tier - 1];
        const denominator = Math.max(1, tier === 1 ? count : lowerCount);
        const ratio = tier === 1 ? (count > 0 ? 1 : 0) : Math.min(1, count / denominator);
        const fill = status?.querySelector?.("[data-tier-meter-fill]");
        if (fill)
            fill.style.width = `${Math.round(ratio * 100)}%`;
    }
}

function inputValue(root, name, fallback = "0") {
    const input = root?.querySelector?.(`[name="${name}"]`);
    const value = input?.value;
    return value === undefined || value === null || value === "" ? fallback : String(value);
}

function resourceSnapshot(root, resourceName) {
    const value = inputValue(root, `system.${resourceName}.value`, "0");
    let threshold = inputValue(root, `system.${resourceName}.threshold`, "");
    if (!threshold) {
        const track = root?.querySelector?.(`[data-resource-track="${resourceName}"]`);
        threshold = String(track?.dataset?.threshold ?? "");
    }
    return threshold ? `${value}/${threshold}` : value;
}

function createSnapshotStat(label, value, iconClass, tone = "") {
    const item = document.createElement("div");
    item.className = `genesys-header-stat${tone ? ` ${tone}` : ""}`;
    const icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    const name = document.createElement("small");
    name.textContent = label;
    const number = document.createElement("strong");
    number.textContent = value;
    copy.append(name, number);
    item.append(icon, copy);
    return item;
}

function buildHeaderSnapshot(root) {
    if (!root || root.querySelector("[data-header-snapshot]"))
        return;
    const header = root.querySelector(".genesys-hero-header");
    const tabs = root.querySelector(".genesys-sheet-tabs");
    if (!header || !tabs)
        return;

    root.querySelector(".genesys-rank-seal")?.remove();

    const strip = document.createElement("section");
    strip.className = "genesys-header-snapshot";
    strip.dataset.headerSnapshot = "true";
    strip.setAttribute("aria-label", "Character quick statistics");

    const characteristics = document.createElement("div");
    characteristics.className = "genesys-header-stat-group genesys-header-characteristics";
    characteristics.append(
        createSnapshotStat("Brawn", inputValue(root, "system.characteristics.brawn"), "fa-solid fa-hand-fist"),
        createSnapshotStat("Agility", inputValue(root, "system.characteristics.agility"), "fa-solid fa-person-running"),
        createSnapshotStat("Intellect", inputValue(root, "system.characteristics.intellect"), "fa-solid fa-book-open"),
        createSnapshotStat("Cunning", inputValue(root, "system.characteristics.cunning"), "fa-solid fa-mask"),
        createSnapshotStat("Willpower", inputValue(root, "system.characteristics.willpower"), "fa-solid fa-sun"),
        createSnapshotStat("Presence", inputValue(root, "system.characteristics.presence"), "fa-solid fa-crown")
    );

    const vitals = document.createElement("div");
    vitals.className = "genesys-header-stat-group genesys-header-vitals";
    vitals.append(
        createSnapshotStat("Wounds", resourceSnapshot(root, "wounds"), "fa-solid fa-heart", "wounds"),
        createSnapshotStat("Strain", resourceSnapshot(root, "strain"), "fa-solid fa-circle-notch", "strain"),
        createSnapshotStat("Soak", inputValue(root, "system.soak"), "fa-solid fa-shield-halved"),
        createSnapshotStat("Melee Def", inputValue(root, "system.defense.melee"), "fa-solid fa-shield"),
        createSnapshotStat("Ranged Def", inputValue(root, "system.defense.ranged"), "fa-regular fa-compass")
    );

    strip.append(characteristics, vitals);
    tabs.before(strip);
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
    for (const track of root.querySelectorAll("[data-resource-track]"))
        renderResourceTrack(track);
    arrangeTalentPyramid(root);
    buildHeaderSnapshot(root);
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
        setActiveTab(sheetRootFrom(target), target.dataset.genesysTab);
        return;
    }

    if (target.matches("[data-open-tab]")) {
        event.preventDefault();
        setActiveTab(sheetRootFrom(target), target.dataset.openTab);
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