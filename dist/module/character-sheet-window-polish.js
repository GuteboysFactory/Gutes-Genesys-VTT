function polishCharacterSheetWindow(sheetRoot) {
    if (!sheetRoot)
        return;
    const app = sheetRoot.closest?.(".application, .app");
    if (!app || app.dataset.genesysWindowPolished === "true")
        return;
    app.dataset.genesysWindowPolished = "true";

    const viewportWidth = Math.max(0, window.innerWidth || document.documentElement.clientWidth || 0);
    const viewportHeight = Math.max(0, window.innerHeight || document.documentElement.clientHeight || 0);
    if (viewportWidth < 980)
        return;

    const rect = app.getBoundingClientRect();
    const desiredWidth = Math.min(1260, Math.max(1040, viewportWidth - 40));
    const desiredHeight = Math.min(920, Math.max(720, viewportHeight - 48));

    if (rect.width < desiredWidth - 24) {
        app.style.width = `${desiredWidth}px`;
        const maxLeft = Math.max(12, viewportWidth - desiredWidth - 12);
        const centeredLeft = Math.max(12, Math.round((viewportWidth - desiredWidth) / 2));
        app.style.left = `${Math.min(centeredLeft, maxLeft)}px`;
    }

    if (rect.height > desiredHeight + 80 || rect.height < 680) {
        app.style.height = `${desiredHeight}px`;
        const maxTop = Math.max(12, viewportHeight - desiredHeight - 12);
        const centeredTop = Math.max(12, Math.round((viewportHeight - desiredHeight) / 2));
        app.style.top = `${Math.min(centeredTop, maxTop)}px`;
    }
}

function polishExistingSheets() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]"))
        polishCharacterSheetWindow(root);
}

const observer = new MutationObserver(() => polishExistingSheets());
Hooks.once("ready", () => {
    polishExistingSheets();
    observer.observe(document.body, { childList: true, subtree: true });
});
import { GenesysUiObserver as MutationObserver } from "./ui-mount-coordinator-v1812.js";
