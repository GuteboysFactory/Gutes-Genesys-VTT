import { resolveAttackMode } from "../domain/combat/index.js";
import { createCoreParryReaction, formatReactionCost, getEligibleReactions } from "../domain/reactions/index.js";
import { normalizeWeaponRuleData } from "../domain/items/index.js";
import { SYSTEM_ID } from "./constants.js";
const providers = new Set();
function integer(value, fallback = 0) {
    const n = Number(value ?? fallback);
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
export function registerReactionProvider(provider) {
    providers.add(provider);
    return () => providers.delete(provider);
}
export function collectActorReactions(actor, context) {
    return Array.from(providers).flatMap((provider) => [...(provider(actor, context) ?? [])]);
}
export function getDevReactionState(actor) {
    const raw = actor?.getFlag?.(SYSTEM_ID, "devReactions") ?? actor?.flags?.[SYSTEM_ID]?.devReactions ?? {};
    return {
        parryEnabled: Boolean(raw?.parryEnabled),
        parryRank: Math.max(1, Math.min(5, integer(raw?.parryRank, 1)))
    };
}
export async function setDevReactionState(actor, patch) {
    const current = getDevReactionState(actor);
    const next = {
        parryEnabled: patch.parryEnabled === undefined ? current.parryEnabled : Boolean(patch.parryEnabled),
        parryRank: patch.parryRank === undefined ? current.parryRank : Math.max(1, Math.min(5, integer(patch.parryRank, current.parryRank)))
    };
    await actor.setFlag(SYSTEM_ID, "devReactions", next);
    return next;
}
export function actorWieldsMeleeWeapon(actor) {
    const items = Array.isArray(actor?.items?.contents) ? actor.items.contents : Array.from(actor?.items ?? []);
    return items.some((item) => {
        if (item?.type !== "weapon")
            return false;
        const weapon = normalizeWeaponRuleData(item.system ?? {});
        return weapon.equipped && resolveAttackMode(weapon) === "melee";
    });
}
export function buildActorReactionTags(actor, extra = []) {
    const tags = [...extra];
    if (actorWieldsMeleeWeapon(actor))
        tags.push("target:wielding-melee-weapon");
    return tags;
}
export function registerBuiltInReactionProviders() {
    if (registerBuiltInReactionProviders._registered)
        return;
    registerBuiltInReactionProviders._registered = true;
    registerReactionProvider((actor) => {
        const dev = getDevReactionState(actor);
        return dev.parryEnabled ? [createCoreParryReaction(dev.parryRank)] : [];
    });
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
export async function promptReactionChoice(actor, context, reactions, summary = {}) {
    const eligible = getEligibleReactions(reactions, context);
    if (!eligible.length)
        return null;
    const damageLine = summary.incomingDamage === undefined
        ? ""
        : `<p><strong>Incoming Damage:</strong> ${integer(summary.incomingDamage)}</p>`;
    const cards = eligible.map((reaction) => {
        const effect = reaction.effect.type === "reduce-damage" || reaction.effect.type === "reduce-post-soak-damage"
            ? `Reduce Damage by <strong>${integer(reaction.effect.amount)}</strong>`
            : escapeHtml(reaction.description ?? reaction.effect.type);
        return `<div class="genesys-reaction-option"><strong>${escapeHtml(reaction.label)}</strong><br />${effect}<br /><span>Cost: ${escapeHtml(formatReactionCost(reaction.cost))}</span></div>`;
    }).join("");
    const config = {
        window: { title: `${actor?.name ?? "Actor"} — Available Reaction` },
        content: `<section class="genesys-reaction-dialog"><p><strong>${escapeHtml(actor?.name ?? "Actor")}</strong> has a legal option before resolution continues.</p>${damageLine}${cards}<p class="genesys-reaction-note">Choose a reaction, or continue without using one.</p></section>`,
        buttons: [
            ...eligible.map((reaction) => ({ action: reaction.id, label: `Use ${reaction.label}` })),
            { action: "skip", label: "Take Damage", default: true }
        ],
        modal: true,
        rejectClose: false
    };
    const DialogV2 = foundry?.applications?.api?.DialogV2;
    if (!DialogV2?.wait)
        return null;
    const decisionUser = chooseDecisionUser(actor);
    const currentUserId = game?.user?.id;
    const result = decisionUser?.id && decisionUser.id !== currentUserId && typeof DialogV2.query === "function"
        ? await DialogV2.query(decisionUser, "wait", config)
        : await DialogV2.wait(config);
    return result && result !== "skip" ? String(result) : null;
}
//# sourceMappingURL=reaction-service.js.map