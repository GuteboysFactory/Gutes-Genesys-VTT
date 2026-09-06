import { equipmentArtFor, equipmentArtForType, GENESYS_DEFAULT_ACTOR_ART, GENESYS_DEFAULT_PC_ART, isFoundryDefaultArt } from "../../assets/art/equipment-art-index.js";

const SYSTEM_ID = "genesys-vtt";

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
    if (!base || base.__artRuntime1772) return;
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
        value: Object.freeze({
            ...base,
            __artRuntime1772: true,
            listDefinitions,
            getDefinition,
            listAttachments,
            artFor: equipmentArtFor,
            artForType: equipmentArtForType
        })
    });
}

function actorNeedsDefaultArt(actor) {
    return actor?.type === "character" && isFoundryDefaultArt(actor?.img);
}

async function migrateActorDefaultArt() {
    if (!game?.user?.isGM) return;
    const actors = Array.from(game?.actors ?? []).filter(actorNeedsDefaultArt);
    for (const actor of actors) {
        try {
            await actor.update({ img: GENESYS_DEFAULT_PC_ART || GENESYS_DEFAULT_ACTOR_ART });
        }
        catch (error) {
            console.warn(`${SYSTEM_ID} | Could not update default actor art for ${actor?.name ?? actor?.id}`, error);
        }
    }
}

Hooks.on("preCreateActor", (_document, data) => {
    if (String(data?.type ?? "character") !== "character") return;
    if (!isFoundryDefaultArt(data?.img)) return;
    data.img = GENESYS_DEFAULT_PC_ART || GENESYS_DEFAULT_ACTOR_ART;
});

Hooks.on("preCreateItem", (_document, data) => {
    const type = String(data?.type ?? "");
    if (!["weapon", "armor", "gear", "attachment", "implement"].includes(type)) return;
    if (!isFoundryDefaultArt(data?.img)) return;
    const contentId = String(data?.flags?.[SYSTEM_ID]?.contentId ?? "");
    data.img = contentId ? equipmentArtFor({ id: contentId, itemType: type }) : equipmentArtForType(type);
});

Hooks.once("ready", async () => {
    wrapEquipmentService();
    await migrateActorDefaultArt();
    console.log(`${SYSTEM_ID} | 0.0.1772 bundled equipment art and Genesys actor defaults ready`);
});
