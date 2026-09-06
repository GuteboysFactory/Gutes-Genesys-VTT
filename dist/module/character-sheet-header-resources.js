function integer(value, fallback = 0) {
    const number = Number(value ?? fallback);
    return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : fallback;
}

function numberValue(root, name, fallback = 0) {
    const input = root?.querySelector?.(`[name="${name}"]`);
    return integer(input?.value, fallback);
}

function actorForRoot(root) {
    const actorId = String(root?.dataset?.actorId ?? "");
    if (actorId && game?.actors?.get?.(actorId))
        return game.actors.get(actorId);
    const name = String(root?.dataset?.actorName ?? "");
    const actor = Array.from(game?.actors ?? []).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
        ?? Array.from(globalThis.canvas?.tokens?.placeables ?? []).map((token) => token?.actor).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
        ?? null;
    if (actor && root)
        root.dataset.actorId = String(actor.id ?? "");
    return actor;
}

function actorSettingId(actor) {
    const draft = actor?.getFlag?.("genesys-vtt", "characterCreationDraft") ?? actor?.flags?.["genesys-vtt"]?.characterCreationDraft ?? null;
    const settingId = String(draft?.settingId ?? "").trim();
    if (settingId)
        return settingId;
    const actorProfile = String(actor?.getFlag?.("genesys-vtt", "rulesProfile") ?? actor?.flags?.["genesys-vtt"]?.rulesProfile ?? "").trim();
    if (actorProfile)
        return actorProfile;
    try {
        return String(game?.settings?.get?.("genesys-vtt", "rulesProfile") ?? "").trim();
    }
    catch {
        return "";
    }
}

function currencyDisplay(actor) {
    const resolved = game?.genesysCurrency?.resolve?.(actorSettingId(actor)) ?? null;
    return {
        label: String(resolved?.label ?? actor?.system?.currency?.label ?? "Funds"),
        short: String(resolved?.short ?? "")
    };
}

function makeResource(label, value, iconClass, inputName = "", titleText = "") {
    const box = document.createElement("div");
    box.className = "genesys-header-resource";
    if (titleText)
        box.title = titleText;
    const icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    const title = document.createElement("small");
    title.textContent = label;
    copy.append(title);
    if (inputName) {
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.name = inputName;
        input.value = String(value);
        copy.append(input);
    }
    else {
        const strong = document.createElement("strong");
        strong.textContent = String(value);
        copy.append(strong);
    }
    box.append(icon, copy);
    return box;
}

function makeLedgerButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "genesys-header-ledger-button";
    button.dataset.openXpLedger = "true";
    button.title = "Open XP Ledger";
    button.innerHTML = '<i class="fa-solid fa-list" aria-hidden="true"></i><span>Ledger</span>';
    return button;
}

function buildMagicImplements(root, actor) {
    const panel = root.querySelector("[data-genesys-tab-panel='equipment'] .genesys-inventory-panel");
    if (!panel || !actor)
        return;
    const createBar = panel.querySelector(".genesys-item-createbar");
    if (createBar && !createBar.querySelector("[data-create-magic-implement]")) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.createMagicImplement = "true";
        button.textContent = "+ Magic Implement";
        createBar.append(button);
    }
    if (panel.querySelector("[data-magic-implements-group]"))
        return;
    const implementItems = Array.from(actor.items?.contents ?? []).filter((item) => item?.type === "implement");
    const details = document.createElement("details");
    details.className = "genesys-item-group genesys-v1752-implements";
    details.dataset.magicImplementsGroup = "true";
    details.open = true;
    const rows = implementItems.length
        ? implementItems.map((item) => `<div class="genesys-item-row genesys-simple-item-row" data-item-id="${item.id}"><button type="button" class="genesys-item-name" data-edit-magic-implement="${item.id}">${item.name}</button><span>Damage +${integer(item.system?.damage)} · Enc ${integer(item.system?.encumbrance)}</span><label class="genesys-v1752-equipped"><input type="checkbox" data-toggle-magic-implement="${item.id}" ${item.system?.equipped ? "checked" : ""}/> Equipped</label><span class="genesys-item-actions"><button type="button" data-delete-magic-implement="${item.id}">×</button></span></div>`).join("")
        : '<p class="genesys-empty-row">No magic implements yet.</p>';
    details.innerHTML = `<summary>Magic Implements (${implementItems.length})</summary><div class="genesys-item-table">${rows}</div>`;
    const attachments = Array.from(panel.querySelectorAll("details.genesys-item-group")).find((group) => group.querySelector("summary")?.textContent?.trim()?.toLowerCase()?.startsWith("attachments"));
    if (attachments)
        attachments.before(details);
    else
        panel.append(details);
}

function rebuildHeaderResources(root, actor, actions) {
    const configure = actions.querySelector(".genesys-header-button");
    const buildId = actions.querySelector(".genesys-build-id");
    actions.replaceChildren();

    const resources = document.createElement("div");
    resources.className = "genesys-header-resource-grid";

    const starting = integer(actor?.system?.xp?.starting, numberValue(root, "system.xp.starting", 0));
    const earned = integer(actor?.system?.xp?.earned, numberValue(root, "system.xp.earned", 0));
    const spent = integer(actor?.system?.xp?.spent, numberValue(root, "system.xp.spent", 0));
    const available = Math.max(0, starting + earned - spent);
    const funds = integer(actor?.system?.currency?.value, numberValue(root, "system.currency.value", 0));
    const currency = currencyDisplay(actor);
    const currencyLabel = currency.short || currency.label;

    resources.append(
        makeResource("XP Available", available, "fa-solid fa-star"),
        makeResource("XP Earned", earned, "fa-solid fa-sparkles"),
        makeResource("XP Spent", spent, "fa-solid fa-arrow-trend-up"),
        makeResource(currencyLabel, funds, "fa-solid fa-coins", "system.currency.value", currency.label)
    );

    actions.append(resources, makeLedgerButton());
    if (configure)
        actions.append(configure);
    if (buildId)
        actions.append(buildId);
}

function buildHeaderResources(root) {
    if (!root)
        return;
    for (const wallet of root.querySelectorAll("[data-equipment-wallet]"))
        wallet.remove();

    const actor = actorForRoot(root);
    buildMagicImplements(root, actor);

    const header = root.querySelector(".genesys-hero-header");
    const portrait = root.querySelector(".genesys-portrait-column");
    const identity = root.querySelector(".genesys-character-identity");
    const actions = root.querySelector(".genesys-header-actions");
    if (!header || !portrait || !identity || !actions)
        return;

    root.querySelector(".genesys-brand-block")?.remove();
    header.classList.remove("genesys-header-v1755");
    header.classList.add("genesys-header-wizard-baseline");
    if (header.firstElementChild !== portrait)
        header.prepend(portrait);

    const hasResources = Boolean(actions.querySelector(".genesys-header-resource-grid"));
    const hasLedger = Boolean(actions.querySelector("[data-open-xp-ledger]"));
    if (!hasResources || !hasLedger)
        rebuildHeaderResources(root, actor, actions);

    root.dataset.genesysHeaderResources = "true";
}

function init() {
    if (!globalThis.game)
        return;
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]"))
        buildHeaderResources(root);
}

document.addEventListener("click", async (event) => {
    const create = event.target?.closest?.("[data-create-magic-implement]");
    const edit = event.target?.closest?.("[data-edit-magic-implement]");
    const remove = event.target?.closest?.("[data-delete-magic-implement]");
    if (!create && !edit && !remove)
        return;
    const root = event.target.closest("[data-genesys-sheet-tabs]");
    const actor = actorForRoot(root);
    if (!actor)
        return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (create) {
        const created = await actor.createEmbeddedDocuments("Item", [{ name: "New Magic Implement", type: "implement", system: { damage: 0, encumbrance: 0, priceMode: "priced", materialId: "", tags: [], equipped: false, notes: "" } }]);
        created?.[0]?.sheet?.render?.(true);
        return;
    }
    const id = String(edit?.dataset.editMagicImplement ?? remove?.dataset.deleteMagicImplement ?? "");
    const item = actor.items?.get?.(id);
    if (!item)
        return;
    if (edit)
        item.sheet?.render?.(true);
    if (remove)
        await item.delete();
}, true);

document.addEventListener("change", async (event) => {
    const toggle = event.target?.closest?.("[data-toggle-magic-implement]");
    if (!toggle)
        return;
    const root = toggle.closest("[data-genesys-sheet-tabs]");
    const actor = actorForRoot(root);
    const item = actor?.items?.get?.(String(toggle.dataset.toggleMagicImplement ?? ""));
    if (item)
        await item.update({ "system.equipped": Boolean(toggle.checked) });
});

let observerStarted = false;
const observer = new MutationObserver(() => init());
function startHeaderResourceRuntime() {
    init();
    if (!observerStarted && document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
        observerStarted = true;
    }
}

if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", startHeaderResourceRuntime, { once: true });
else
    startHeaderResourceRuntime();

Hooks.once("ready", () => {
    startHeaderResourceRuntime();
    for (const delay of [0, 50, 150, 350])
        setTimeout(init, delay);
    console.log("genesys-vtt | 0.0.1758 Wizard-era XP/Currency header resources ready");
});
import { GenesysUiObserver as MutationObserver } from "./ui-mount-coordinator-v1812.js";
