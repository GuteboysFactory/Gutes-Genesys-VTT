import { rollNarrativePool } from "../domain/dice/index.js";
import { formatQualityText, normalizeWeaponRuleData, prepareWeaponAttack } from "../domain/items/index.js";
import { formatPool, resultToChatHtml } from "./dice-ui.js";
import { poolTraceToHtml } from "./pool-ui.js";
import { prepareActorSkillCheck } from "./skill-ui.js";
function itemCollection(actor) {
    if (Array.isArray(actor?.items))
        return actor.items;
    if (Array.isArray(actor?.items?.contents))
        return actor.items.contents;
    return [];
}
function integer(value, fallback = 0) {
    const n = Number(value ?? fallback);
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}
function capitalize(value) {
    const text = String(value ?? "");
    return text.length ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}
export function buildInventoryRows(actor) {
    const groups = { weapons: [], armor: [], gear: [], attachments: [] };
    for (const item of itemCollection(actor)) {
        const system = item?.system ?? {};
        const base = { id: item.id, name: item.name, type: item.type, editable: item.isOwner !== false };
        if (item.type === "weapon") {
            groups.weapons.push({
                ...base,
                skillId: String(system.skillId ?? "melee"),
                damage: integer(system.damage),
                critical: integer(system.critical),
                range: String(system.range ?? "engaged"),
                encumbrance: integer(system.encumbrance),
                hardPoints: integer(system.hardPoints),
                equipped: system.equipped !== false,
                qualitiesText: formatQualityText(system.qualities ?? []) || "—"
            });
        }
        else if (item.type === "armor") {
            groups.armor.push({ ...base, soak: integer(system.soak), defense: integer(system.defense), encumbrance: integer(system.encumbrance), hardPoints: integer(system.hardPoints), equipped: Boolean(system.equipped), qualitiesText: formatQualityText(system.qualities ?? []) || "—" });
        }
        else if (item.type === "gear") {
            groups.gear.push({ ...base, quantity: integer(system.quantity, 1), encumbrance: integer(system.encumbrance), equipped: Boolean(system.equipped) });
        }
        else if (item.type === "attachment") {
            groups.attachments.push({ ...base, hardPointCost: integer(system.hardPointCost, 1), installed: Boolean(system.installed), hostItemId: String(system.hostItemId ?? ""), qualitiesText: formatQualityText(system.qualities ?? []) || "—" });
        }
    }
    return groups;
}
export function prepareActorWeaponAttack(actor, item, difficulty = 2, checkOptions = {}) {
    if (!item || item.type !== "weapon")
        throw new Error("A weapon Item is required.");
    const weapon = normalizeWeaponRuleData(item.system ?? {});
    const skill = prepareActorSkillCheck(actor, weapon.skillId, 0, checkOptions.rankOverride, checkOptions.characteristicOverrideId);
    const prepared = prepareWeaponAttack({
        weaponName: item.name ?? "Weapon",
        weapon,
        actor: {
            characteristic: skill.characteristicValue,
            skillRank: skill.skillRank,
            label: skill.skillLabel
        },
        difficulty,
        contextTags: [weapon.equipped ? "equipped" : "unequipped"]
    });
    return {
        ...prepared,
        checkContext: {
            skillId: skill.skillId,
            skillLabel: skill.skillLabel,
            characteristicId: skill.characteristicId,
            characteristicValue: skill.characteristicValue,
            appliedRuleLabel: String(checkOptions.appliedRuleLabel ?? ""),
            sourceId: String(checkOptions.sourceId ?? ""),
            ruleId: String(checkOptions.ruleId ?? "")
        }
    };
}
export async function rollPreparedWeaponAttackToChat(prepared, speakerAlias) {
    const result = rollNarrativePool(prepared.check.construction.pool);
    const qualities = formatQualityText(prepared.weapon.qualities) || "None";
    const checkContext = prepared.checkContext ?? {};
    const skillLabel = checkContext.skillLabel || prepared.weapon.skillId;
    const characteristicLabel = checkContext.characteristicId ? `${capitalize(checkContext.characteristicId)} ${checkContext.characteristicValue}` : "";
    const ruleLabel = checkContext.appliedRuleLabel ? ` · ${checkContext.appliedRuleLabel}` : "";
    const content = `
    <section class="genesys-constructed-check genesys-weapon-check">
      <p><strong>${prepared.weaponName}</strong> · Skill ${skillLabel} · Range ${prepared.weapon.range}</p>
      ${characteristicLabel ? `<p><strong>Check:</strong> ${characteristicLabel}${ruleLabel}</p>` : ""}
      <p>Damage ${prepared.weapon.damage} · Crit ${prepared.weapon.critical || "—"} · Qualities ${qualities}</p>
      <p class="genesys-check-pool"><strong>Pool:</strong> ${formatPool(prepared.check.construction.pool)}</p>
      ${poolTraceToHtml(prepared.check.construction)}
      ${resultToChatHtml(result)}
    </section>`;
    const data = { content };
    if (speakerAlias)
        data.speaker = { alias: speakerAlias };
    await foundry.documents.ChatMessage.create(data);
    return { prepared, result };
}
export async function rollActorWeaponToChat(actor, item, difficulty = 2, checkOptions = {}) {
    const prepared = prepareActorWeaponAttack(actor, item, difficulty, checkOptions);
    return rollPreparedWeaponAttackToChat(prepared, actor?.name ?? "Genesys Weapon Check");
}
//# sourceMappingURL=items-service.js.map