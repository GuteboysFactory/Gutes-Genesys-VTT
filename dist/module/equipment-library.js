const SYSTEM_ID = "genesys-vtt";
const LIBRARY_PROTOCOL = "genesys-equipment-library-v1";
const CUSTOM_LIBRARY_FLAG = "equipmentLibraryTemplate";
const ITEM_TYPES = Object.freeze(["weapon", "armor", "gear", "attachment", "implement"]);

function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function clone(value) {
    if (value === undefined) return undefined;
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function actorForRoot(root) {
    const actorId = String(root?.dataset?.actorId ?? "");
    if (actorId && game?.actors?.get?.(actorId)) return game.actors.get(actorId);
    const name = String(root?.dataset?.actorName ?? "");
    const actor = Array.from(game?.actors ?? []).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
        ?? Array.from(globalThis.canvas?.tokens?.placeables ?? []).map((token) => token?.actor).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
        ?? null;
    if (actor && root) root.dataset.actorId = String(actor.id ?? "");
    return actor;
}

function actorSettingId(actor) {
    const draft = actor?.getFlag?.(SYSTEM_ID, "characterCreationDraft") ?? actor?.flags?.[SYSTEM_ID]?.characterCreationDraft ?? null;
    const draftSetting = String(draft?.settingId ?? "").trim();
    if (draftSetting) return draftSetting;
    const actorProfile = String(actor?.getFlag?.(SYSTEM_ID, "rulesProfile") ?? actor?.flags?.[SYSTEM_ID]?.rulesProfile ?? "").trim();
    if (actorProfile) return actorProfile;
    try { return String(game?.settings?.get?.(SYSTEM_ID, "rulesProfile") ?? "").trim(); }
    catch { return ""; }
}

function typeLabel(type) {
    return ({ weapon: "Weapon", armor: "Armor", gear: "Gear", attachment: "Attachment", implement: "Magic Implement" })[type] ?? type;
}

function priceText(system = {}, metadata = {}) {
    if (metadata?.priceMode === "priceless" || system?.priceMode === "priceless") return "Priceless";
    const price = Number(system?.price);
    return Number.isFinite(price) ? String(Math.max(0, Math.trunc(price))) : "—";
}

function rarityText(system = {}) {
    const rarity = Number(system?.rarity);
    return Number.isFinite(rarity) ? String(Math.max(0, Math.trunc(rarity))) : "—";
}

function settingEntries(actor) {
    const settingId = actorSettingId(actor);
    const rows = game?.genesysEquipment?.listDefinitions?.(settingId) ?? [];
    return rows.map((row) => ({
        id: `setting:${row.id}`,
        sourceKind: "setting",
        definitionId: row.id,
        label: row.label,
        itemType: row.itemType,
        img: String(row.img ?? "icons/svg/item-bag.svg"),
        sourceLabel: row.metadata?.printedSource ?? row.packLabel ?? row.sourceType ?? "Setting Content",
        sourceId: row.sourceId || row.id,
        sourceType: row.sourceType || "content-pack",
        settingId: row.settingId || settingId,
        system: clone(row.system ?? {}),
        metadata: clone(row.metadata ?? {}),
        raw: row
    }));
}

function customEntries() {
    return Array.from(game?.items ?? [])
        .filter((item) => ITEM_TYPES.includes(String(item?.type ?? "")))
        .filter((item) => item?.getFlag?.(SYSTEM_ID, CUSTOM_LIBRARY_FLAG) === true)
        .map((item) => ({
            id: `custom:${item.id}`,
            sourceKind: "custom",
            documentId: item.id,
            label: item.name,
            itemType: item.type,
            img: String(item.img ?? "icons/svg/item-bag.svg"),
            sourceLabel: "Custom Library",
            sourceId: String(item.system?.provenance?.sourceId ?? `custom:${item.id}`),
            sourceType: "custom",
            settingId: String(item.system?.provenance?.settingId ?? ""),
            sourceUuid: String(item.uuid ?? ""),
            system: clone(item.system ?? {}),
            metadata: clone(item.getFlag?.(SYSTEM_ID, "libraryMetadata") ?? {}),
            document: item
        }));
}

export function listEquipmentLibraryEntries(actor) {
    return [...settingEntries(actor), ...customEntries()]
        .sort((a, b) => a.itemType.localeCompare(b.itemType) || a.label.localeCompare(b.label));
}

function qualityText(system = {}) {
    const rows = Array.isArray(system.qualities) ? system.qualities : [];
    if (!rows.length) return "—";
    return rows.map((row) => `${row.id}${Number(row.rank ?? 0) > 0 ? ` ${row.rank}` : ""}`).join(", ");
}

function summaryText(entry) {
    const s = entry.system ?? {};
    if (entry.itemType === "weapon") return `${s.skillId ?? "—"} · Damage ${s.damage ?? "—"} · Crit ${s.critical ?? "—"} · ${s.range ?? "—"}`;
    if (entry.itemType === "armor") return `Soak ${s.soak ?? 0} · Defense ${s.defense ?? 0} · HP ${s.hardPoints ?? 0}`;
    if (entry.itemType === "attachment") return `HP ${s.hardPointCost ?? 0} · ${s.compatibleTypes ?? "weapon, armor"}`;
    if (entry.itemType === "implement") return `Damage Bonus ${s.damage ?? 0} · ${Array.isArray(s.tags) ? s.tags.join(", ") : "Magic Implement"}`;
    return `Enc ${s.encumbrance ?? 0} · ${s.category ?? "Gear"}`;
}

function libraryHtml(actor) {
    const entries = listEquipmentLibraryEntries(actor);
    const types = ITEM_TYPES.map((type) => `<option value="${type}">${typeLabel(type)}</option>`).join("");
    const cards = entries.map((entry) => {
        const search = `${entry.label} ${entry.itemType} ${entry.sourceLabel} ${summaryText(entry)} ${qualityText(entry.system)}`.toLowerCase();
        return `<article class="genesys-equipment-library-card" data-equipment-entry="${esc(entry.id)}" data-type="${esc(entry.itemType)}" data-source-kind="${esc(entry.sourceKind)}" data-rarity="${esc(rarityText(entry.system))}" data-search="${esc(search)}">
          <img src="${esc(entry.img)}" alt="" />
          <div class="genesys-equipment-library-card-copy"><header><strong>${esc(entry.label)}</strong><span>${esc(typeLabel(entry.itemType))}</span></header><p>${esc(summaryText(entry))}</p><small>${esc(entry.sourceLabel)} · Price ${esc(priceText(entry.system, entry.metadata))} · Rarity ${esc(rarityText(entry.system))}</small></div>
          <div class="genesys-equipment-library-card-actions"><button type="button" data-equipment-view="${esc(entry.id)}">View</button><button type="button" class="genesys-primary-action" data-equipment-add="${esc(entry.id)}">Add</button></div>
        </article>`;
    }).join("") || `<p class="genesys-empty-row">No equipment is registered for this setting yet.</p>`;

    return `<dialog class="genesys-equipment-library" data-equipment-library-dialog>
      <div class="genesys-equipment-library-shell">
        <header class="genesys-equipment-library-header"><div><strong>Equipment Library</strong><small>${esc(actor?.name ?? "Character")} · ${entries.length} registered entries</small></div><div class="genesys-equipment-library-header-actions">${game?.user?.isGM ? `<button type="button" data-equipment-new-custom><i class="fa-solid fa-plus"></i> Custom Item</button>` : ""}<button type="button" data-equipment-library-close aria-label="Close">×</button></div></header>
        <div class="genesys-equipment-library-controls"><input type="search" data-equipment-search placeholder="Search equipment…"/><select data-equipment-type><option value="all">All Types</option>${types}</select><select data-equipment-source><option value="all">All Sources</option><option value="setting">Setting Content</option><option value="custom">Custom Content</option></select><select data-equipment-rarity><option value="all">All Rarities</option>${Array.from({length:11},(_,i)=>`<option value="${i}">Rarity ${i}</option>`).join("")}</select></div>
        <div class="genesys-equipment-library-body"><div class="genesys-equipment-library-list">${cards}</div><aside class="genesys-equipment-library-detail" data-equipment-detail><div class="genesys-equipment-detail-placeholder"><i class="fa-solid fa-shield-halved"></i><strong>Select an Item</strong><p>Inspect the source, statistics, qualities, and provenance before adding it to the character.</p></div></aside></div>
      </div>
    </dialog>`;
}

function renderDetail(dialog, actor, entry) {
    const detail = dialog.querySelector("[data-equipment-detail]");
    if (!detail) return;
    const s = entry.system ?? {};
    const sourceReference = String(entry.metadata?.printedSource ?? entry.sourceLabel ?? "");
    detail.innerHTML = `<div class="genesys-equipment-detail-title"><img src="${esc(entry.img)}" alt=""/><div><strong>${esc(entry.label)}</strong><span>${esc(typeLabel(entry.itemType))} · ${esc(entry.sourceKind === "custom" ? "Custom Content" : "Setting Content")}</span></div></div>
      <dl><div><dt>Price</dt><dd>${esc(priceText(s, entry.metadata))}</dd></div><div><dt>Rarity</dt><dd>${esc(rarityText(s))}</dd></div><div><dt>Encumbrance</dt><dd>${esc(s.encumbrance ?? "—")}</dd></div><div><dt>Source</dt><dd>${esc(sourceReference || entry.sourceType)}</dd></div></dl>
      <section><h3>Profile</h3><p>${esc(summaryText(entry))}</p></section>
      ${entry.itemType === "weapon" || entry.itemType === "armor" ? `<section><h3>Qualities</h3><p>${esc(qualityText(s))}</p></section>` : ""}
      ${entry.metadata?.rulesSummary || s.notes ? `<section><h3>Notes</h3><p>${esc(entry.metadata?.rulesSummary || s.notes)}</p></section>` : ""}
      <section><h3>Provenance</h3><p>${esc(entry.sourceId)}${entry.sourceUuid ? `<br/>${esc(entry.sourceUuid)}` : ""}</p></section>
      <div class="genesys-equipment-detail-actions"><button type="button" data-equipment-view="${esc(entry.id)}">Open Item</button><button type="button" class="genesys-primary-action" data-equipment-add="${esc(entry.id)}">Add to ${esc(actor.name)}</button></div>`;
}

function applyFilters(dialog) {
    const query = String(dialog.querySelector("[data-equipment-search]")?.value ?? "").trim().toLowerCase();
    const type = String(dialog.querySelector("[data-equipment-type]")?.value ?? "all");
    const source = String(dialog.querySelector("[data-equipment-source]")?.value ?? "all");
    const rarity = String(dialog.querySelector("[data-equipment-rarity]")?.value ?? "all");
    for (const card of dialog.querySelectorAll("[data-equipment-entry]")) {
        const visible = (!query || String(card.dataset.search ?? "").includes(query))
            && (type === "all" || card.dataset.type === type)
            && (source === "all" || card.dataset.sourceKind === source)
            && (rarity === "all" || card.dataset.rarity === rarity);
        card.hidden = !visible;
    }
}

async function viewEntry(entry) {
    if (entry.sourceKind === "custom" && entry.document) {
        entry.document.sheet?.render?.(true);
        return entry.document;
    }
    const data = game?.genesysEquipment?.embeddedItemData?.(entry.raw, 1) ?? null;
    if (!data) return null;
    data.img = entry.img;
    data.system ??= {};
    data.system.provenance ??= {};
    data.system.provenance.sourceId = entry.sourceId;
    data.system.provenance.sourceType = entry.sourceType;
    data.system.provenance.sourceVersion = String(entry.metadata?.sourceVersion ?? "1");
    data.system.provenance.settingId = entry.settingId;
    const preview = await Item.create(data, { temporary: true });
    preview?.sheet?.render?.(true);
    return preview;
}

function actorItems(actor) {
    return Array.from(actor?.items?.contents ?? actor?.items ?? []);
}

async function addEntryToActor(actor, entry) {
    if (!actor?.createEmbeddedDocuments) throw new Error("Character cannot receive Items.");
    if (!(actor.isOwner || game?.user?.isGM)) throw new Error("You do not have permission to modify this character.");

    const sourceUuid = entry.sourceKind === "custom" ? String(entry.document?.uuid ?? "") : "";
    const sourceVersion = entry.sourceKind === "custom" ? String(entry.document?.getFlag?.(SYSTEM_ID, "libraryVersion") ?? "1") : String(entry.metadata?.sourceVersion ?? "1");
    const sourceId = entry.sourceId;

    if (entry.itemType === "gear") {
        const existing = actorItems(actor).find((item) => item.type === "gear" && String(item.system?.provenance?.sourceId ?? "") === sourceId);
        if (existing) {
            const quantity = Math.max(0, Number(existing.system?.quantity ?? 0) || 0) + 1;
            await existing.update({ "system.quantity": quantity });
            return existing;
        }
    }

    let data;
    if (entry.sourceKind === "custom" && entry.document) {
        data = entry.document.toObject(false);
        delete data._id;
        delete data.folder;
        delete data.sort;
        delete data.ownership;
    }
    else {
        data = game?.genesysEquipment?.embeddedItemData?.(entry.raw, 1) ?? null;
    }
    if (!data) throw new Error("Equipment entry could not be converted into a Foundry Item.");

    data.img = entry.img;
    data.system ??= {};
    data.system.provenance = {
        ...(data.system.provenance ?? {}),
        sourceId,
        sourceType: entry.sourceType,
        sourceUuid,
        sourceVersion,
        settingId: entry.settingId
    };
    if (entry.itemType === "attachment") {
        data.system.installed = false;
        data.system.hostItemId = "";
    }
    if (["weapon", "armor", "gear", "implement"].includes(entry.itemType)) data.system.equipped = false;
    const created = await actor.createEmbeddedDocuments("Item", [data]);
    return created?.[0] ?? null;
}

async function ensureCustomLibraryFolder() {
    if (!game?.user?.isGM) return null;
    const existing = game.folders?.find?.((folder) => folder.type === "Item" && folder.name === "Genesys Custom Equipment Library");
    if (existing) return existing;
    try { return await Folder.create({ name: "Genesys Custom Equipment Library", type: "Item", sorting: "a" }); }
    catch { return null; }
}

async function createCustomLibraryItem(type = "weapon") {
    if (!game?.user?.isGM) throw new Error("Only the GM can create Custom Library Items.");
    if (!ITEM_TYPES.includes(type)) type = "weapon";
    const folder = await ensureCustomLibraryFolder();
    const created = await Item.create({
        name: `New Custom ${typeLabel(type)}`,
        type,
        folder: folder?.id ?? null,
        flags: {
            [SYSTEM_ID]: {
                [CUSTOM_LIBRARY_FLAG]: true,
                libraryVersion: "1",
                libraryMetadata: { createdAt: Date.now() }
            }
        },
        system: {
            provenance: { sourceId: "custom", sourceType: "custom", sourceUuid: "", sourceVersion: "1", settingId: "" }
        }
    }, { renderSheet: false });
    if (created) {
        await created.update({
            "system.provenance.sourceId": `custom:${created.id}`,
            "system.provenance.sourceUuid": String(created.uuid ?? "")
        });
        created.sheet?.render?.(true);
    }
    return created;
}

export function openEquipmentLibrary(actor, root = null) {
    if (!actor) throw new Error("Equipment Library requires a character Actor.");
    const host = root ?? document.body;
    host.querySelector?.("[data-equipment-library-dialog]")?.remove();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = libraryHtml(actor);
    const dialog = wrapper.firstElementChild;
    host.append(dialog);
    dialog.showModal?.();
    return dialog;
}

function installEquipmentLibraryButton(root) {
    if (!root) return;
    const panel = root.querySelector("[data-genesys-tab-panel='equipment']");
    const createbar = panel?.querySelector(".genesys-item-createbar");
    if (!createbar || createbar.querySelector("[data-open-equipment-library]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "genesys-primary-action";
    button.dataset.openEquipmentLibrary = "true";
    button.innerHTML = '<i class="fa-solid fa-box-open" aria-hidden="true"></i> Equipment Library';
    createbar.prepend(button);
    for (const custom of createbar.querySelectorAll("[data-action='createItem']")) {
        const type = String(custom.dataset.itemType ?? "");
        if (ITEM_TYPES.includes(type)) custom.textContent = `+ Custom ${typeLabel(type)}`;
    }
}

function initializeEquipmentButtons() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]")) installEquipmentLibraryButton(root);
}

function installItemImageDrop(sheetRoot) {
    if (!sheetRoot || sheetRoot.querySelector("[data-genesys-item-image-drop]")) return;
    const body = sheetRoot.querySelector?.(".genesys-item-body") ?? sheetRoot;
    const header = body.querySelector?.(".genesys-sheet-header");
    if (!header) return;
    const app = sheetRoot.closest?.(".application, .app");
    const itemId = String(app?.dataset?.documentId ?? app?.dataset?.itemId ?? "");
    const title = app?.querySelector?.(".window-title")?.textContent ?? "Item";
    const item = (itemId && game?.items?.get?.(itemId)) || Array.from(game?.items ?? []).find((entry) => entry?.name === title) || null;
    const image = document.createElement("div");
    image.className = "genesys-item-image-drop";
    image.dataset.genesysItemImageDrop = "true";
    image.dataset.itemUuid = String(item?.uuid ?? "");
    image.innerHTML = `<img src="${esc(item?.img ?? "icons/svg/item-bag.svg")}" alt="Item image"/><div><strong>Item Image</strong><small>Drop an image from your computer here, or click to choose a file.</small></div><input type="file" accept="image/*" hidden />`;
    header.after(image);
}

function initializeItemImageDrops() {
    for (const root of document.querySelectorAll(".genesys-item-sheet")) installItemImageDrop(root);
}

async function itemFromImageDrop(target) {
    const uuid = String(target?.dataset?.itemUuid ?? "");
    if (uuid && globalThis.fromUuid) {
        const document = await fromUuid(uuid);
        if (document?.documentName === "Item") return document;
    }
    const app = target?.closest?.(".application, .app");
    const id = String(app?.dataset?.documentId ?? app?.dataset?.itemId ?? "");
    return id ? game?.items?.get?.(id) ?? null : null;
}

async function uploadItemImage(file, item) {
    if (!file || !item) return null;
    if (!String(file.type ?? "").startsWith("image/")) throw new Error("Please drop an image file.");
    const picker = globalThis.FilePicker ?? foundry?.applications?.apps?.FilePicker;
    if (!picker?.upload) throw new Error("Foundry file upload is unavailable in this client.");
    const worldId = String(game?.world?.id ?? "world");
    const directory = `worlds/${worldId}/genesys-vtt-items`;
    try { await picker.createDirectory?.("data", directory); } catch {}
    const result = await picker.upload("data", directory, file, {}, { notify: true });
    const path = String(result?.path ?? result?.file ?? "");
    if (!path) throw new Error("Foundry did not return an uploaded image path.");
    await item.update({ img: path });
    return path;
}

async function handleImageFile(target, file) {
    const item = await itemFromImageDrop(target);
    if (!item) throw new Error("Could not resolve this Foundry Item.");
    const path = await uploadItemImage(file, item);
    const img = target.querySelector("img");
    if (img && path) img.src = path;
    return path;
}

document.addEventListener("click", async (event) => {
    const open = event.target?.closest?.("[data-open-equipment-library]");
    if (open) {
        event.preventDefault();
        event.stopPropagation();
        const root = open.closest("[data-genesys-sheet-tabs]");
        const actor = actorForRoot(root);
        if (!actor) return ui?.notifications?.warn?.("Could not resolve this character for Equipment Library.");
        openEquipmentLibrary(actor, root);
        return;
    }

    const close = event.target?.closest?.("[data-equipment-library-close]");
    if (close) {
        event.preventDefault();
        close.closest("dialog")?.close?.();
        return;
    }

    const newCustom = event.target?.closest?.("[data-equipment-new-custom]");
    if (newCustom) {
        event.preventDefault();
        const type = await foundry.applications.api.DialogV2.prompt({
            window: { title: "Create Custom Equipment" },
            content: `<label>Item Type<select name="type">${ITEM_TYPES.map((type) => `<option value="${type}">${typeLabel(type)}</option>`).join("")}</select></label>`,
            ok: { label: "Create", callback: (_event, button, dialog) => dialog.element.querySelector("select[name='type']")?.value ?? "weapon" }
        });
        if (type) await createCustomLibraryItem(type);
        return;
    }

    const view = event.target?.closest?.("[data-equipment-view]");
    if (view) {
        event.preventDefault();
        const dialog = view.closest("[data-equipment-library-dialog]");
        const root = dialog?.closest("[data-genesys-sheet-tabs]");
        const actor = actorForRoot(root);
        const entry = actor ? listEquipmentLibraryEntries(actor).find((row) => row.id === view.dataset.equipmentView) : null;
        if (dialog && actor && entry) {
            renderDetail(dialog, actor, entry);
            if (event.detail > 1 || view.closest("[data-equipment-detail]")) await viewEntry(entry);
        }
        return;
    }

    const add = event.target?.closest?.("[data-equipment-add]");
    if (add) {
        event.preventDefault();
        event.stopPropagation();
        const dialog = add.closest("[data-equipment-library-dialog]");
        const root = dialog?.closest("[data-genesys-sheet-tabs]");
        const actor = actorForRoot(root);
        const entry = actor ? listEquipmentLibraryEntries(actor).find((row) => row.id === add.dataset.equipmentAdd) : null;
        if (!actor || !entry) return;
        try {
            await addEntryToActor(actor, entry);
            ui?.notifications?.info?.(`${entry.label} added to ${actor.name}.`);
        }
        catch (error) { ui?.notifications?.warn?.(String(error?.message ?? error)); }
        return;
    }

    const imageTarget = event.target?.closest?.("[data-genesys-item-image-drop]");
    if (imageTarget) {
        event.preventDefault();
        imageTarget.querySelector("input[type='file']")?.click?.();
    }
});

document.addEventListener("input", (event) => {
    const dialog = event.target?.closest?.("[data-equipment-library-dialog]");
    if (dialog && event.target?.matches?.("[data-equipment-search]")) applyFilters(dialog);
});

document.addEventListener("change", async (event) => {
    const dialog = event.target?.closest?.("[data-equipment-library-dialog]");
    if (dialog && event.target?.matches?.("[data-equipment-type],[data-equipment-source],[data-equipment-rarity]")) {
        applyFilters(dialog);
        return;
    }
    const input = event.target?.closest?.("[data-genesys-item-image-drop] input[type='file']");
    if (input?.files?.[0]) {
        try { await handleImageFile(input.closest("[data-genesys-item-image-drop]"), input.files[0]); }
        catch (error) { ui?.notifications?.warn?.(String(error?.message ?? error)); }
        input.value = "";
    }
});

document.addEventListener("dragover", (event) => {
    const target = event.target?.closest?.("[data-genesys-item-image-drop]");
    if (!target) return;
    event.preventDefault();
    target.classList.add("is-dragover");
});

document.addEventListener("dragleave", (event) => {
    event.target?.closest?.("[data-genesys-item-image-drop]")?.classList.remove("is-dragover");
});

document.addEventListener("drop", async (event) => {
    const target = event.target?.closest?.("[data-genesys-item-image-drop]");
    if (!target) return;
    event.preventDefault();
    target.classList.remove("is-dragover");
    const file = Array.from(event.dataTransfer?.files ?? []).find((entry) => String(entry.type ?? "").startsWith("image/"));
    if (!file) return ui?.notifications?.warn?.("Drop an image file onto the Item Image area.");
    try { await handleImageFile(target, file); }
    catch (error) { ui?.notifications?.warn?.(String(error?.message ?? error)); }
});

Hooks.once("ready", () => {
    Object.defineProperty(game, "genesysEquipmentLibrary", {
        configurable: true,
        value: Object.freeze({
            protocol: LIBRARY_PROTOCOL,
            list: listEquipmentLibraryEntries,
            open: openEquipmentLibrary,
            add: addEntryToActor,
            createCustom: createCustomLibraryItem,
            view: viewEntry
        })
    });
    initializeEquipmentButtons();
    initializeItemImageDrops();
    const observer = new MutationObserver(() => {
        initializeEquipmentButtons();
        initializeItemImageDrops();
    });
    observer.observe(document.body, { childList: true, subtree: true });
});
import { GenesysUiObserver as MutationObserver } from "./ui-mount-coordinator-v1812.js";
