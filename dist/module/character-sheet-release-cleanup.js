function removeLegacyQaSurfaces(root) {
    if (!root)
        return;

    // The old 0.0.14 Talents & Rule Elements regression panel is still injected
    // by the legacy sheet controller. Keep the underlying talent/rule services,
    // but remove this QA-only presentation from the normal Equipment tab.
    for (const panel of root.querySelectorAll(".genesys-talents-panel"))
        panel.remove();

    // Effects and Configure are utility destinations now. They remain as hidden
    // panels so status-bar Manage actions and the header Configure button can
    // open them, but they no longer occupy permanent primary navigation slots.
    root.querySelector("[data-genesys-tab='effects']")?.remove();
    root.querySelector("[data-genesys-tab='notes']")?.remove();

    // Remove explicit developer/QA blocks from the normal Configure surface.
    for (const details of root.querySelectorAll("details.genesys-v15-advanced")) {
        const label = details.querySelector(":scope > summary")?.textContent?.trim()?.toLowerCase() ?? "";
        if (label.includes("advanced / qa") || label.includes("legacy reaction test"))
            details.remove();
    }
}

function cleanExistingSheets() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]"))
        removeLegacyQaSurfaces(root);
}

const observer = new MutationObserver(() => cleanExistingSheets());
Hooks.once("ready", () => {
    cleanExistingSheets();
    observer.observe(document.body, { childList: true, subtree: true });
});
import { GenesysUiObserver as MutationObserver } from "./ui-mount-coordinator-v1812.js";
