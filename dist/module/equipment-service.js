import { depositWallet, normalizeEquipmentDefinition, normalizeWallet, replaceCraftsmanship, resolveStartingGearPackage, rollFundsFormula, spendWallet, validateHardPointCapacity } from "../domain/equipment/index.js";
import { equipmentArtFor } from "./equipment-art-paths-v1775.js";

const SYSTEM_ID = "genesys-vtt";
const TERRINOTH_SETTING_ID = "realms-of-terrinoth";
const EQUIPMENT_ITEM_TYPES = Object.freeze(["weapon", "armor", "gear", "implement", "attachment"]);

export const TERRINOTH_WEAPON_SKILL_BY_ID = Object.freeze({
    axe: "melee-light",
    cestus: "brawl",
    dagger: "melee-light",
    flail: "melee-heavy",
    greataxe: "melee-heavy",
    greatsword: "melee-heavy",
    halberd: "melee-heavy",
    katar: "brawl",
    mace: "melee-light",
    "military-pick": "melee-light",
    pike: "melee-heavy",
    shield: "melee-light",
    "large-shield": "melee-light",
    "bulwark-shield": "melee-light",
    spear: "melee-heavy",
    "light-spear": "melee-light",
    staff: "melee-heavy",
    sword: "melee-light",
    "war-hammer": "melee-heavy",
    bow: "ranged",
    crossbow: "ranged",
    "hand-crossbow": "ranged",
    "heavy-crossbow": "ranged",
    "repeating-crossbow": "ranged",
    longbow: "ranged",
    sling: "ranged",
    "throwing-axe": "ranged"
});

function clone(value) {
    if (value === undefined) return undefined;
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function settingEquipment(settingId) {
    return game?.genesysContent?.getContent?.("equipment", { settingId: String(settingId ?? "") }) ?? [];
}

function isTerrinothDefinition(definition = {}) {
    const settingId = String(definition?.settingId ?? "");
    const sourceId = String(definition?.sourceId ?? "");
    return settingId === TERRINOTH_SETTING_ID || sourceId.startsWith("rot-equipment:");
}

function expectedAttackMode(skillId) {
    return String(skillId ?? "") === "ranged" ? "ranged" : "melee";
}

export function enforceTerrinothWeaponProfile(input = {}) {
    const definition = normalizeEquipmentDefinition(input);
    if (definition.itemType !== "weapon" || !isTerrinothDefinition(definition)) return definition;
    const expectedSkill = TERRINOTH_WEAPON_SKILL_BY_ID[definition.id];
    if (!expectedSkill) return definition;
    const system = clone(definition.system ?? {});
    system.skillId = expectedSkill;
    system.attackMode = expectedAttackMode(expectedSkill);
    return Object.freeze({ ...definition, system });
}

export function listEquipmentDefinitions(settingId) {
    return settingEquipment(settingId)
        .filter((entry) => EQUIPMENT_ITEM_TYPES.includes(String(entry?.itemType ?? "")))
        .map(enforceTerrinothWeaponProfile);
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

export function auditTerrinothWeaponSkills() {
    const rows = listEquipmentDefinitions(TERRINOTH_SETTING_ID).filter((entry) => entry.itemType === "weapon");
    const errors = [];
    for (const row of rows) {
        const expectedSkill = TERRINOTH_WEAPON_SKILL_BY_ID[row.id];
        if (!expectedSkill) {
            errors.push(`${row.id}: no audited Terrinoth skill mapping.`);
            continue;
        }
        if (String(row.system?.skillId ?? "") !== expectedSkill)
            errors.push(`${row.id}: expected ${expectedSkill}, got ${row.system?.skillId ?? "(blank)"}.`);
        const expectedMode = expectedAttackMode(expectedSkill);
        if (String(row.system?.attackMode ?? "") !== expectedMode)
            errors.push(`${row.id}: expected attackMode ${expectedMode}, got ${row.system?.attackMode ?? "(blank)"}.`);
    }
    for (const id of Object.keys(TERRINOTH_WEAPON_SKILL_BY_ID)) {
        if (!rows.some((row) => row.id === id)) errors.push(`${id}: audited weapon is missing from the Terrinoth catalog.`);
    }
    return Object.freeze({
        valid: errors.length === 0,
        weaponCount: rows.length,
        mappedCount: Object.keys(TERRINOTH_WEAPON_SKILL_BY_ID).length,
        errors: Object.freeze(errors)
    });
}

export function embeddedItemData(definitionInput, quantity = 1, { characterCreation = false } = {}) {
    const definition = enforceTerrinothWeaponProfile(definitionInput);
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

function contentIdForItem(item) {
    const flagged = String(item?.getFlag?.(SYSTEM_ID, "contentId") ?? item?.flags?.[SYSTEM_ID]?.contentId ?? "").trim();
    if (flagged) return flagged;
    const sourceId = String(item?.system?.provenance?.sourceId ?? "").trim();
    if (!sourceId || sourceId === "custom") return "";
    return sourceId.startsWith("rot-equipment:") ? sourceId.slice("rot-equipment:".length) : "";
}

async function repairTerrinothWeaponItem(item) {
    if (!item || item.type !== "weapon") return false;
    const contentId = contentIdForItem(item);
    const expectedSkill = TERRINOTH_WEAPON_SKILL_BY_ID[contentId];
    if (!expectedSkill) return false;
    const expectedMode = expectedAttackMode(expectedSkill);
    const patch = {};
    if (String(item.system?.skillId ?? "") !== expectedSkill) patch["system.skillId"] = expectedSkill;
    if (String(item.system?.attackMode ?? "") !== expectedMode) patch["system.attackMode"] = expectedMode;
    if (!Object.keys(patch).length) return false;
    await item.update(patch);
    return true;
}

export async function repairWorldTerrinothWeaponSkills() {
    if (!game?.user?.isGM) return 0;
    let repaired = 0;
    for (const actor of Array.from(game?.actors ?? [])) {
        for (const item of Array.from(actor?.items?.contents ?? actor?.items ?? [])) {
            try {
                if (await repairTerrinothWeaponItem(item)) repaired += 1;
            }
            catch (error) {
                console.warn(`${SYSTEM_ID} | Could not repair weapon skill for ${item?.name ?? item?.id}`, error);
            }
        }
    }
    for (const item of Array.from(game?.items ?? [])) {
        try {
            if (await repairTerrinothWeaponItem(item)) repaired += 1;
        }
        catch (error) {
            console.warn(`${SYSTEM_ID} | Could not repair world weapon skill for ${item?.name ?? item?.id}`, error);
        }
    }
    return repaired;
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

Hooks.once("ready", async () => {
    const audit = auditTerrinothWeaponSkills();
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
            enforceTerrinothWeaponProfile,
            auditTerrinothWeaponSkills,
            weaponSkillMap: TERRINOTH_WEAPON_SKILL_BY_ID,
            normalizeWallet,
            depositWallet,
            spendWallet,
            rollFundsFormula,
            resolveStartingGearPackage,
            validateHardPointCapacity,
            replaceCraftsmanship,
            embeddedItemData,
            replaceCharacterCreationEquipment,
            repairWorldTerrinothWeaponSkills
        })
    });
    const repaired = await repairWorldTerrinothWeaponSkills();
    if (!audit.valid) console.error(`${SYSTEM_ID} | Terrinoth weapon skill audit failed`, audit.errors);
    else console.log(`${SYSTEM_ID} | Terrinoth weapon skill audit PASS: ${audit.weaponCount}/${audit.mappedCount} weapons mapped; repaired ${repaired} existing Item(s).`);
});
