import { rollNarrativePool } from "../domain/dice/index.js";
import { prepareAssistedCheck, prepareOpposedCheck, prepareStandardCheck } from "../domain/checks/index.js";
import { ruleElementToCheckModifier } from "../domain/rules/index.js";
import { formatPool, resultToChatHtml } from "./dice-ui.js";
import { poolTraceToHtml } from "./pool-ui.js";
import { prepareActorSkillCheck } from "./skill-ui.js";
import { getActorConditionCheckModifiers } from "./condition-service.js";
import { collectActorRuleElements } from "./talent-service-foundation.js";
function capitalize(value) {
    return value.length ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function kindLabel(kind) {
    switch (kind) {
        case "opposed": return "Opposed";
        case "assisted": return "Assisted";
        case "competitive": return "Competitive";
        default: return "Standard";
    }
}
function chooseDecisionUser(actor) {
    const users = Array.isArray(game?.users?.contents) ? game.users.contents : [];
    const activePlayerOwner = users.find((user) => user?.active && !user?.isGM && actor?.testUserPermission?.(user, "OWNER"));
    if (activePlayerOwner)
        return activePlayerOwner;
    if (game?.user?.isGM)
        return game.user;
    const activeGm = users.find((user) => user?.active && user?.isGM);
    return activeGm ?? game?.user;
}
export function actorCheckCharacteristicRuleChoices(actor, skillId, extraContext = {}) {
    const tags = [...new Set([`skill:${skillId}`, ...(extraContext.tags ?? [])])];
    const applicable = collectActorRuleElements(actor, {
        ...extraContext,
        timing: "before-check-build",
        tags,
        data: { ...(extraContext.data ?? {}), skillId }
    });
    return applicable.map((entry) => {
        const modifier = ruleElementToCheckModifier(entry.rule, entry.talent, actor);
        const characteristicId = String(entry.rule?.effect?.characteristicId ?? "");
        if (!modifier || !characteristicId || modifier.characteristicOverride === undefined)
            return null;
        return {
            talentId: entry.talent.id,
            talentLabel: entry.talent.label,
            ruleId: entry.rule.id,
            optional: entry.rule.optional !== false,
            characteristicId,
            characteristicValue: Number(modifier.characteristicOverride ?? 0),
            sourceType: entry.talent.sourceType
        };
    }).filter(Boolean);
}
export async function promptActorCheckCharacteristicChoice(actor, skillId, extraContext = {}) {
    const base = prepareActorSkillCheck(actor, skillId, 0);
    const choices = actorCheckCharacteristicRuleChoices(actor, skillId, extraContext)
        .filter((choice) => choice.characteristicId !== base.characteristicId);
    if (!choices.length)
        return null;
    const required = choices.find((choice) => !choice.optional);
    if (required)
        return required;
    const DialogV2 = foundry?.applications?.api?.DialogV2;
    if (!DialogV2?.wait)
        return null;
    const buttons = choices.map((choice) => ({
        action: `${choice.talentId}:${choice.ruleId}`,
        label: `Use ${choice.talentLabel}`
    }));
    const cards = choices.map((choice) => `<div class="genesys-reaction-option"><strong>${escapeHtml(choice.talentLabel)}</strong><br />Use <strong>${escapeHtml(capitalize(choice.characteristicId))} ${choice.characteristicValue}</strong> instead of <strong>${escapeHtml(capitalize(base.characteristicId))} ${base.characteristicValue}</strong> for this check.</div>`).join("");
    const config = {
        window: { title: `${actor?.name ?? "Actor"} — Check Option` },
        content: `<section class="genesys-reaction-dialog"><p><strong>${escapeHtml(base.skillLabel)}</strong> has an optional Rule Element before the dice pool is built.</p>${cards}<p class="genesys-reaction-note">This changes the check characteristic only. Weapon damage characteristics remain separate.</p></section>`,
        buttons: [...buttons, { action: "base", label: `Use ${capitalize(base.characteristicId)}`, default: true }],
        modal: true,
        rejectClose: false
    };
    const decisionUser = chooseDecisionUser(actor);
    const currentUserId = game?.user?.id;
    const result = decisionUser?.id && decisionUser.id !== currentUserId && typeof DialogV2.query === "function"
        ? await DialogV2.query(decisionUser, "wait", config)
        : await DialogV2.wait(config);
    if (!result || result === "base")
        return null;
    return choices.find((choice) => `${choice.talentId}:${choice.ruleId}` === String(result)) ?? null;
}
export function prepareActorSkillEngineCheck(actor, skillId, options = {}) {
    const skill = prepareActorSkillCheck(actor, skillId, 0, options.rankOverride, options.characteristicOverrideId);
    const ratings = {
        characteristic: skill.characteristicValue,
        skillRank: skill.skillRank,
        label: skill.skillLabel
    };
    const mode = options.mode ?? "standard";
    const conditionModifiers = getActorConditionCheckModifiers(actor);
    let check;
    if (mode === "opposed") {
        check = prepareOpposedCheck({
            actor: ratings,
            opponent: {
                characteristic: Number(options.opponentCharacteristic ?? 2),
                skillRank: Number(options.opponentSkillRank ?? 2),
                label: "Opponent"
            },
            modifiers: conditionModifiers
        });
    }
    else if (mode === "assisted") {
        check = prepareAssistedCheck({
            actor: ratings,
            assistant: {
                characteristic: Number(options.assistantCharacteristic ?? 2),
                skillRank: Number(options.assistantSkillRank ?? 2),
                label: "Assistant"
            },
            difficulty: Number(options.difficulty ?? 2),
            extraHelpers: Number(options.extraHelpers ?? 0),
            modifiers: conditionModifiers
        });
    }
    else {
        check = prepareStandardCheck({
            actor: ratings,
            difficulty: Number(options.difficulty ?? 2),
            modifiers: conditionModifiers
        });
    }
    return {
        skillId: skill.skillId,
        skillLabel: skill.skillLabel,
        characteristicId: skill.characteristicId,
        characteristicLabel: capitalize(skill.characteristicId),
        appliedRuleLabel: String(options.appliedRuleLabel ?? ""),
        check
    };
}
export async function rollPreparedActorCheckToChat(prepared, speakerAlias) {
    const result = rollNarrativePool(prepared.check.construction.pool);
    const assistance = prepared.check.kind === "assisted"
        ? ` · ${prepared.check.assistanceMode === "skilled" ? "Skilled assistance" : "Unskilled assistance"}`
        : "";
    const opponent = prepared.check.kind === "opposed" && prepared.check.opponent
        ? ` · Opponent ${prepared.check.opponent.characteristic}/${prepared.check.opponent.skillRank}`
        : "";
    const rule = prepared.appliedRuleLabel ? ` · <strong>${escapeHtml(prepared.appliedRuleLabel)}</strong>` : "";
    const content = `
    <section class="genesys-constructed-check genesys-skill-check genesys-check-engine-roll">
      <p><strong>${prepared.skillLabel}</strong> · ${prepared.characteristicLabel} ${prepared.check.actor.characteristic} + Rank ${prepared.check.actor.skillRank}${rule}</p>
      <p><strong>${kindLabel(prepared.check.kind)}</strong>${assistance}${opponent}</p>
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
//# sourceMappingURL=check-ui.js.map