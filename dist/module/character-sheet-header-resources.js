function numberValue(root, name, fallback = 0) {
    const input = root?.querySelector?.(`[name="${name}"]`);
    const value = Number(input?.value ?? fallback);
    return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : fallback;
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

    brand?.remove();
    header.prepend(portrait);

    const configure = actions.querySelector(".genesys-header-button");
    const buildId = actions.querySelector(".genesys-build-id");
    actions.replaceChildren();

    const resources = document.createElement("div");
    resources.className = "genesys-header-resource-grid";

    const starting = numberValue(root, "system.xp.starting", 0);
    const earned = numberValue(root, "system.xp.earned", 0);
    const spent = numberValue(root, "system.xp.spent", 0);
    const available = Math.max(0, starting + earned - spent);
    const funds = numberValue(root, "system.currency.value", 0);

    resources.append(
        makeResource("XP Available", available, "fa-solid fa-star"),
        makeResource("XP Earned", earned, "fa-solid fa-sparkles", "system.xp.earned"),
        makeResource("Funds", funds, "fa-solid fa-sack-dollar", "system.currency.value")
    );

    actions.append(resources);
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
