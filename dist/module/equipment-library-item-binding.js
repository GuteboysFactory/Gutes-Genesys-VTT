const SYSTEM_ID = "genesys-vtt";

function applicationInstance(app) {
    const applicationId = String(app?.dataset?.applicationId ?? app?.id ?? "");
    if (!applicationId) return null;
    return foundry?.applications?.instances?.get?.(applicationId)
        ?? globalThis.ui?.windows?.[applicationId]
        ?? null;
}

function itemFromApplication(app) {
    const instance = applicationInstance(app);
    const candidate = instance?.document ?? instance?.item ?? instance?.object ?? null;
    return candidate?.documentName === "Item" ? candidate : null;
}

function bindImageTarget(target) {
    if (!target || target.dataset.itemUuid) return;
    const app = target.closest?.(".application, .app");
    const item = itemFromApplication(app);
    if (!item?.uuid) return;
    target.dataset.itemUuid = String(item.uuid);
    target.dataset.itemBinding = "application-instance";
    const img = target.querySelector("img");
    if (img && item.img) img.src = item.img;
}

function bindAll() {
    for (const target of document.querySelectorAll("[data-genesys-item-image-drop]")) bindImageTarget(target);
}

Hooks.once("ready", () => {
    bindAll();
    const observer = new MutationObserver(() => bindAll());
    observer.observe(document.body, { childList: true, subtree: true });
    console.log(`${SYSTEM_ID} | Equipment Item image binding ready`);
});
import { GenesysUiObserver as MutationObserver } from "./ui-mount-coordinator-v1812.js";
