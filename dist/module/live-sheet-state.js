const actorSheets = new Map();
function actorSheetKey(actor) {
    return String(actor?.uuid ?? actor?.id ?? "");
}
function n(value) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}
function readControlValue(control) {
    const type = String(control?.type ?? "").toLowerCase();
    if (type === "checkbox")
        return Boolean(control?.checked);
    if (type === "number" || type === "range")
        return n(control?.value);
    return control?.value ?? "";
}
function getPath(root, path) {
    const parts = path.split(".");
    let cursor = root;
    for (const part of parts) {
        if (cursor == null)
            return undefined;
        cursor = cursor[part];
    }
    return cursor;
}
function comparable(value) {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : 0;
    return value;
}
export function registerRenderedCharacterSheet(actor, sheet) {
    const key = actorSheetKey(actor);
    if (!key)
        return;
    actorSheets.set(key, sheet);
}
export function unregisterRenderedCharacterSheet(actor, sheet) {
    const key = actorSheetKey(actor);
    if (!key)
        return;
    if (actorSheets.get(key) === sheet)
        actorSheets.delete(key);
}
export function getRenderedCharacterSheet(actor) {
    const key = actorSheetKey(actor);
    if (!key)
        return null;
    const sheet = actorSheets.get(key);
    if (!sheet)
        return null;
    if (sheet.rendered === false || !sheet.element) {
        actorSheets.delete(key);
        return null;
    }
    return sheet;
}
export function readRenderedActorDocumentPatch(actor) {
    const sheet = getRenderedCharacterSheet(actor);
    const root = sheet?.element;
    if (!root?.querySelectorAll)
        return {};
    const patch = {};
    const controls = Array.from(root.querySelectorAll('input[name="name"], input[name^="system."], select[name^="system."], textarea[name^="system."]'));
    for (const control of controls) {
        const path = String(control?.name ?? "");
        if (!path)
            continue;
        patch[path] = readControlValue(control);
    }
    return patch;
}
export async function syncActorFromRenderedCharacterSheet(actor) {
    const sheet = getRenderedCharacterSheet(actor);
    if (!sheet)
        return { found: false, changed: false, patch: {} };
    const visiblePatch = readRenderedActorDocumentPatch(actor);
    const update = {};
    for (const [path, value] of Object.entries(visiblePatch)) {
        const current = getPath(actor, path);
        if (comparable(current) !== comparable(value))
            update[path] = value;
    }
    if (Object.keys(update).length && typeof actor?.update === "function")
        await actor.update(update);
    return { found: true, changed: Object.keys(update).length > 0, patch: update };
}
export function getRenderedActorResourceDebug(actor) {
    const visible = readRenderedActorDocumentPatch(actor);
    return {
        actorId: actor?.id ?? null,
        actorUuid: actor?.uuid ?? null,
        isTokenActor: Boolean(actor?.isToken),
        actorName: actor?.name ?? null,
        sheetFound: Boolean(getRenderedCharacterSheet(actor)),
        domWounds: visible["system.wounds.value"],
        actorWounds: actor?.system?.wounds?.value,
        domStrain: visible["system.strain.value"],
        actorStrain: actor?.system?.strain?.value,
        domSoak: visible["system.soak"],
        actorSoak: actor?.system?.soak
    };
}
export function getRenderedActorFieldValue(actor, path) {
    const visible = readRenderedActorDocumentPatch(actor);
    return Object.prototype.hasOwnProperty.call(visible, path) ? visible[path] : undefined;
}
export async function rerenderRenderedCharacterSheet(actor) {
    const sheet = getRenderedCharacterSheet(actor);
    if (!sheet || typeof sheet.render !== "function")
        return false;
    await sheet.render({ force: true });
    return true;
}
export async function rerenderAllRenderedCharacterSheets() {
    let count = 0;
    for (const [key, sheet] of Array.from(actorSheets.entries())) {
        if (!sheet || sheet.rendered === false || !sheet.element || typeof sheet.render !== "function") {
            actorSheets.delete(key);
            continue;
        }
        await sheet.render({ force: true });
        count += 1;
    }
    return count;
}
//# sourceMappingURL=live-sheet-state.js.map