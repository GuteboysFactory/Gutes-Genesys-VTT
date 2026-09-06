import { depositWallet, normalizeEquipmentDefinition, normalizeWallet, replaceCraftsmanship, resolveStartingGearPackage, rollFundsFormula, spendWallet, validateHardPointCapacity } from "../domain/equipment/index.js";
import { equipmentArtFor } from "../../assets/art/equipment-art-index.js";

const SYSTEM_ID = "genesys-vtt";
const EQUIPMENT_ITEM_TYPES = Object.freeze(["weapon", "armor", "gear", "implement", "attachment"]);

function clone(value) {
    if (value === undefined) return undefined;
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function settingEquipment(settingId) {
    return game?.genesysContent?.getContent?.("equipment", { settingId: String(settingId ?? "") }) ?? [];
}

export function listEquipmentDefinitions(settingId) {
    return settingEquipment(settingId)
        .filter((entry) => EQUIPMENT_ITEM_TYPES.includes(String(entry?.itemType ?? "")))
        .map(normalizeEquipmentDefinition);
}

export function listAttachmentDefinitions(settingId, compatibleType = "") {
    const type = String(compatibleType ?? "").trim().toLowerCase();
    return listEquipmentDefinitions(settingId)
        .filter((entry) => entry.itemType === "attachment")
        .filter((entry) => {
            if (!type) return true;
            const compatible = String(entry.system?.compatibleTypes ?? "")
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean);
            return compatible.includes(type);
        });
}

export function getEquipmentDefinition(settingId, equipmentId) {
    return listEquipmentDefinitions(settingId).find((entry) => entry.id === String(equipmentId ?? "")) ?? null;
}

export function equipmentRuleEntries(settingId, ruleKind = "") {
    return settingEquipment(settingId)
        .filter((entry) => String(entry?.itemType ?? "") === "rule-data")
        .filter((entry) => !ruleKind || String(entry?.ruleKind ?? "") === String(ruleKind));
}

export function embeddedItemData(definitionInput, quantity = 1, { characterCreation = false } = {}) {
    const definition = normalizeEquipmentDefinition(definitionInput);
    const system = clone(definition.system ?? {});
    if (definition.itemType === "attachment") delete system.priceMode;
    system.provenance = {
        sourceId: definition.sourceId || definition.id,
        sourceType: definition.sourceType,
        sourceUuid: String(definition.sourceUuid ?? ""),
        sourceVersion: String(definition.metadata?.sourceVersion ?? definition.version ?? ""),
        settingId: String(definition.settingId ?? "")
    };
    if (definition.itemType === "gear") system.quantity = Math.max(1, Number(quantity) || 1);
    const flags = {
        [SYSTEM_ID]: {
            contentId: definition.id,
            settingId: String(definition.settingId ?? ""),
            characterCreationItem: Boolean(characterCreation),
            metadata: clone(definition.metadata ?? {})
        }
    };
    return { name: definition.label, type: definition.itemType, img: equipmentArtFor(definition), system, flags };
}

export async function replaceCharacterCreationEquipment(actor, resolved) {
    if (!actor?.createEmbeddedDocuments) throw new Error("Actor with embedded document support is required.");
    const existing = Array.from(actor.items?.contents ?? actor.items ?? [])
        .filter((item) => item?.getFlag?.(SYSTEM_ID, "characterCreationItem") === true)
        .map((item) => item.id)
        .filter(Boolean);
    if (existing.length && actor.deleteEmbeddedDocuments) await actor.deleteEmbeddedDocuments("Item", existing);
    const createData = [];
    for (const row of resolved?.items ?? []) {
        const definition = row.definition;
        const quantity = Math.max(1, Number(row.quantity) || 1);
        if (definition.itemType === "gear") createData.push(embeddedItemData(definition, quantity, { characterCreation: true }));
        else for (let index = 0; index < quantity; index++) createData.push(embeddedItemData(definition, 1, { characterCreation: true }));
    }
    if (createData.length) await actor.createEmbeddedDocuments("Item", createData);
    return createData.length;
}

Hooks.once("ready", () => {
    Object.defineProperty(game, "genesysEquipment", {
        configurable: true,
        value: Object.freeze({
            itemTypes: EQUIPMENT_ITEM_TYPES,
            listDefinitions: listEquipmentDefinitions,
            listAttachments: listAttachmentDefinitions,
            getDefinition: getEquipmentDefinition,
            getRuleEntries: equipmentRuleEntries,
            artFor: equipmentArtFor,
            normalizeDefinition: normalizeEquipmentDefinition,
            normalizeWallet,
            depositWallet,
            spendWallet,
            rollFundsFormula,
            resolveStartingGearPackage,
            validateHardPointCapacity,
            replaceCraftsmanship,
            embeddedItemData,
            replaceCharacterCreationEquipment
        })
    });
});
