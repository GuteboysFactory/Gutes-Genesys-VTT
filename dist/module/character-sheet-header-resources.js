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
        ?? Array.from(canvas?.tokens?.placeables ?? []).map((token) => token?.actor).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
        ?? null;
    if (actor && root)
        root.dataset.actorId = String(actor.id ?? "");
    return actor;
}

function makeResource(label, value, iconClass, inputName = "") {
    const box = document.createElement("div");
    box.className = "genesys-header-resource";
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

function buildHeaderResources(root) {
    if (!root || root.dataset.genesysHeaderResources === "true")
        return;
    const header = root.querySelector(".genesys-hero-header");
    const brand = root.querySelector(".genesys-brand-block");
    const portrait = root.querySelector(".genesys-portrait-column");
    const identity = root.querySelector(".genesys-character-identity");
    const actions = root.querySelector(".genesys-header-actions");
    if (!header || !portrait || !identity || !actions)
        return;

    const actor = actorForRoot(root);
    brand?.remove();
    header.prepend(portrait);

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

    resources.append(
        makeResource("XP Available", available, "fa-solid fa-star"),
        makeResource("XP Earned", earned, "fa-solid fa-sparkles"),
        makeResource("XP Spent", spent, "fa-solid fa-arrow-trend-up"),
        makeResource("Funds", funds, "fa-solid fa-sack-dollar", "system.currency.value")
    );

    actions.append(resources, makeLedgerButton());
    if (configure)
        actions.append(configure);
    if (buildId)
        actions.append(buildId);

    root.dataset.genesysHeaderResources = "true";
}

function init() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]"))
        buildHeaderResources(root);
}

const observer = new MutationObserver(init);
Hooks.once("ready", () => {
    init();
    observer.observe(document.body, { childList: true, subtree: true });
});
