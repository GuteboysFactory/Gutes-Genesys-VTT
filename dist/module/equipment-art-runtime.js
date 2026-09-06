import { equipmentArtFor, equipmentArtForType, GENESYS_DEFAULT_ACTOR_ART, GENESYS_DEFAULT_PC_ART, isFoundryDefaultArt } from "./equipment-art-paths-v1775.js";

const SYSTEM_ID = "genesys-vtt";
const EQUIPMENT_TYPES = new Set(["weapon", "armor", "gear", "attachment", "implement"]);

function clone(value) {
    if (value === undefined) return undefined;
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function decorateDefinition(row) {
    if (!row) return row;
    const out = clone(row);
    if (isFoundryDefaultArt(out.img)) out.img = equipmentArtFor(out);
    return out;
}

function wrapEquipmentService() {
    const base = game?.genesysEquipment;
    if (!base || base.__artRuntime1775) return;
    const listDefinitions = (settingId) => (base.listDefinitions?.(settingId) ?? []).map(decorateDefinition);
    const getDefinition = (settingId, equipmentId) => {
        const direct = base.getDefinition?.(settingId, equipmentId);
        return direct ? decorateDefinition(direct) : listDefinitions(settingId).find((row) => row.id === String(equipmentId ?? "")) ?? null;
    };
    const listAttachments = (settingId, compatibleType = "") => {
        const type = String(compatibleType ?? "").trim().toLowerCase();
        return listDefinitions(settingId)
            .filter((row) => row.itemType === "attachment")
            .filter((row) => !type || String(row.system?.compatibleTypes ?? "").split(",").map((value) => value.trim().toLowerCase()).includes(type));
    };
    Object.defineProperty(game, "genesysEquipment", {
        configurable: true,
        value: Object.freeze({ ...base, __artRuntime1775: true, listDefinitions, getDefinition, listAttachments, artFor: equipmentArtFor, artForType: equipmentArtForType })
    });
}

function contentIdForItem(item) {
    const flagged = String(item?.getFlag?.(SYSTEM_ID, "contentId") ?? item?.flags?.[SYSTEM_ID]?.contentId ?? "").trim();
    if (flagged) return flagged;
    const sourceId = String(item?.system?.provenance?.sourceId ?? "").trim();
    if (!sourceId || sourceId === "custom") return "";
    return sourceId.includes(":") ? sourceId.split(":").pop() : sourceId;
}

async function migrateActorDefaultArt() {
    if (!game?.user?.isGM) return;
    for (const actor of Array.from(game?.actors ?? [])) {
        if (actor?.type === "character" && isFoundryDefaultArt(actor?.img)) {
            try { await actor.update({ img: GENESYS_DEFAULT_PC_ART || GENESYS_DEFAULT_ACTOR_ART }); }
            catch (error) { console.warn(`${SYSTEM_ID} | Could not update default actor art for ${actor?.name ?? actor?.id}`, error); }
        }
        for (const item of Array.from(actor?.items?.contents ?? actor?.items ?? [])) {
            if (!EQUIPMENT_TYPES.has(String(item?.type ?? "")) || !isFoundryDefaultArt(item?.img)) continue;
            const id = contentIdForItem(item);
            if (!id) continue;
            try { await item.update({ img: equipmentArtFor({ id, itemType: item.type }) }); }
            catch (error) { console.warn(`${SYSTEM_ID} | Could not migrate equipment art for ${item?.name ?? item?.id}`, error); }
        }
    }
    for (const item of Array.from(game?.items ?? [])) {
        if (!EQUIPMENT_TYPES.has(String(item?.type ?? "")) || !isFoundryDefaultArt(item?.img)) continue;
        const id = contentIdForItem(item);
        try { await item.update({ img: id ? equipmentArtFor({ id, itemType: item.type }) : equipmentArtForType(item.type) }); }
        catch (error) { console.warn(`${SYSTEM_ID} | Could not migrate world equipment art for ${item?.name ?? item?.id}`, error); }
    }
}

Hooks.on("preCreateActor", (_document, data) => {
    if (String(data?.type ?? "character") !== "character" || !isFoundryDefaultArt(data?.img)) return;
    data.img = GENESYS_DEFAULT_PC_ART || GENESYS_DEFAULT_ACTOR_ART;
});

Hooks.on("preCreateItem", (_document, data) => {
    const type = String(data?.type ?? "");
    if (!EQUIPMENT_TYPES.has(type) || !isFoundryDefaultArt(data?.img)) return;
    const contentId = String(data?.flags?.[SYSTEM_ID]?.contentId ?? "");
    data.img = contentId ? equipmentArtFor({ id: contentId, itemType: type }) : equipmentArtForType(type);
});

Hooks.once("ready", async () => {
    wrapEquipmentService();
    await migrateActorDefaultArt();
    console.log(`${SYSTEM_ID} | 0.0.1775 standalone equipment assets and Genesys actor defaults ready`);
});
