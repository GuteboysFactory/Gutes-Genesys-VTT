const SYSTEM_ID = "genesys-vtt";
const TOOLBAR_SELECTOR = "[data-genesys-equipment-toolbar]";
const CUSTOM_TYPES = Object.freeze([
    ["weapon", "Custom Weapon"],
    ["armor", "Custom Armor"],
    ["gear", "Custom Gear"],
    ["attachment", "Custom Attachment"],
    ["implement", "Magic Implement"]
]);

function equipmentPanel(root) {
    return root?.querySelector?.("[data-genesys-tab-panel='equipment'] .genesys-inventory-panel") ?? null;
}

function sourceCreatebar(panel) {
    return panel?.querySelector?.(":scope > .genesys-item-createbar") ?? panel?.querySelector?.(".genesys-item-createbar") ?? null;
}

function sourceCreateButton(panel, type) {
    return sourceCreatebar(panel)?.querySelector?.(`[data-action='createItem'][data-item-type='${type}']`) ?? null;
}

function buildCustomMenu() {
    const details = document.createElement("details");
    details.className = "genesys-equipment-create-custom";
    details.dataset.equipmentCreateCustom = "true";

    const summary = document.createElement("summary");
    summary.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i><span>Create Custom</span><i class="fa-solid fa-chevron-down genesys-equipment-create-chevron" aria-hidden="true"></i>';

    const menu = document.createElement("div");
    menu.className = "genesys-equipment-create-menu";
    for (const [type, label] of CUSTOM_TYPES) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.equipmentCustomType = type;
        button.textContent = label;
        menu.append(button);
    }

    details.append(summary, menu);
    return details;
}

function ensureToolbar(root) {
    const panel = equipmentPanel(root);
    if (!panel) return;
    const banner = panel.querySelector(":scope > .genesys-panel-banner") ?? panel.querySelector(".genesys-panel-banner");
    const createbar = sourceCreatebar(panel);
    if (!banner || !createbar) return;

    createbar.classList.add("genesys-equipment-createbar-source-v1777");

    let toolbar = banner.querySelector(TOOLBAR_SELECTOR);
    if (!toolbar) {
        toolbar = document.createElement("div");
        toolbar.className = "genesys-equipment-toolbar-v1777";
        toolbar.dataset.genesysEquipmentToolbar = "true";
        toolbar.append(buildCustomMenu());
        banner.append(toolbar);
    }

    const library = panel.querySelector("[data-open-equipment-library]");
    if (library && library.parentElement !== toolbar) {
        library.classList.add("genesys-equipment-library-top-button");
        toolbar.prepend(library);
    }

    const customMenu = toolbar.querySelector("[data-equipment-create-custom]");
    if (customMenu) {
        for (const [type] of CUSTOM_TYPES) {
            const menuButton = customMenu.querySelector(`[data-equipment-custom-type='${type}']`);
            if (!menuButton) continue;
            menuButton.disabled = !sourceCreateButton(panel, type);
        }
    }
}

function initializeEquipmentToolbars() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]")) ensureToolbar(root);
}

function relayCustomCreate(button) {
    const type = String(button?.dataset?.equipmentCustomType ?? "");
    if (!type) return;
    const root = button.closest("[data-genesys-sheet-tabs]");
    const panel = equipmentPanel(root);
    const source = sourceCreateButton(panel, type);
    if (!source) {
        ui?.notifications?.warn?.(`Custom ${type} creation is not available on this sheet.`);
        return;
    }
    button.closest("details")?.removeAttribute("open");
    source.click();
}

document.addEventListener("click", (event) => {
    const custom = event.target?.closest?.("[data-equipment-custom-type]");
    if (custom) {
        event.preventDefault();
        event.stopPropagation();
        relayCustomCreate(custom);
        return;
    }

    if (!event.target?.closest?.("[data-equipment-create-custom]")) {
        for (const details of document.querySelectorAll("[data-equipment-create-custom][open]")) details.removeAttribute("open");
    }
});

Hooks.once("ready", () => {
    initializeEquipmentToolbars();
    const observer = new MutationObserver(() => initializeEquipmentToolbars());
    observer.observe(document.body, { childList: true, subtree: true });
    console.log(`${SYSTEM_ID} | 0.0.1777 Equipment toolbar polish ready`);
});
