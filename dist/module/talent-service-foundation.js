import { createCoreParryTalent, createCoreSecondWindTalent, createTerrinothFinesseTalent, getApplicableRuleElements, normalizeTalentDefinition, usageScopeKey } from "../domain/rules/index.js";
import { SYSTEM_ID } from "./constants.js";

const USAGE_FLAG = "ruleUsage";
const ENCOUNTER_FLAG = "ruleEncounterId";
const SESSION_SETTING = "ruleSessionId";

function nowId(prefix) {
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}:${Date.now()}:${random}`;
}

function actorItems(actor) {
    return Array.isArray(actor?.items?.contents) ? actor.items.contents : Array.from(actor?.items ?? []);
}

export function collectActorTalents(actor) {
    return actorItems(actor)
        .filter((item) => item?.type === "talent")
        .map((item) => normalizeTalentDefinition(item));
}

export function actorHasTalent(actor, sourceId) {
    return collectActorTalents(actor).some((talent) => talent.id === sourceId);
}

export function registerRuleEngineSettings() {
    if (registerRuleEngineSettings._registered)
        return;
    registerRuleEngineSettings._registered = true;
    game.settings.register(SYSTEM_ID, SESSION_SETTING, {
        name: "Genesys Rule Session ID",
        hint: "Internal lifecycle key used by once-per-session Rule Elements.",
        scope: "world",
        config: false,
        type: String,
        default: "session:initial"
    });
}

export function getRuleSessionId() {
    try {
        return String(game.settings.get(SYSTEM_ID, SESSION_SETTING) ?? "session:initial");
    }
    catch {
        return "session:initial";
    }
}

export async function startNewRuleSession() {
    const id = nowId("session");
    await game.settings.set(SYSTEM_ID, SESSION_SETTING, id);
    return id;
}

export function getActorRuleUsage(actor) {
    const raw = actor?.getFlag?.(SYSTEM_ID, USAGE_FLAG) ?? actor?.flags?.[SYSTEM_ID]?.[USAGE_FLAG] ?? [];
    return Array.isArray(raw) ? raw.map((entry) => ({
        sourceId: String(entry?.sourceId ?? ""),
        ruleId: String(entry?.ruleId ?? ""),
        period: String(entry?.period ?? "none"),
        scopeKey: String(entry?.scopeKey ?? ""),
        count: Math.max(0, Math.trunc(Number(entry?.count ?? 0))),
        updatedAt: Math.max(0, Math.trunc(Number(entry?.updatedAt ?? 0)))
    })).filter((entry) => entry.sourceId && entry.ruleId && entry.scopeKey) : [];
}

export async function clearActorRuleUsage(actor, period = null) {
    const current = getActorRuleUsage(actor);
    const next = period ? current.filter((entry) => entry.period !== period) : [];
    await actor.setFlag(SYSTEM_ID, USAGE_FLAG, next);
    return next;
}

function activeScene() {
    return canvas?.scene ?? game?.scenes?.active ?? null;
}

export function getRuleEncounterId(scene = activeScene()) {
    return String(scene?.getFlag?.(SYSTEM_ID, ENCOUNTER_FLAG)
        ?? scene?.flags?.[SYSTEM_ID]?.[ENCOUNTER_FLAG]
        ?? "");
}

export async function startNewRuleEncounter(scene = activeScene()) {
    const id = nowId("encounter");
    if (scene?.setFlag)
        await scene.setFlag(SYSTEM_ID, ENCOUNTER_FLAG, id);
    else if (scene) {
        scene.flags ??= {};
        scene.flags[SYSTEM_ID] ??= {};
        scene.flags[SYSTEM_ID][ENCOUNTER_FLAG] = id;
    }
    return id;
}

export async function endRuleEncounter(scene = activeScene()) {
    if (scene?.unsetFlag)
        await scene.unsetFlag(SYSTEM_ID, ENCOUNTER_FLAG);
    else if (scene?.flags?.[SYSTEM_ID])
        delete scene.flags[SYSTEM_ID][ENCOUNTER_FLAG];
}

export function actorRuleLifecycleContext(actor, context = {}) {
    const scene = activeScene();
    const state = scene?.getFlag?.(SYSTEM_ID, "initiativeState")
        ?? scene?.flags?.[SYSTEM_ID]?.initiativeState
        ?? {};
    const actorRef = String(actor?.uuid ?? actor?.id ?? actor?.name ?? "actor");
    const encounterId = String(getRuleEncounterId(scene)
        || `${scene?.id ?? "no-scene"}:${state.status ?? "none"}`);
    return {
        ...context,
        tags: [...(context.tags ?? [])],
        data: { ...(context.data ?? {}), actorRole: actor?.system?.role ?? "pc" },
        scope: {
            sessionId: getRuleSessionId(),
            encounterId,
            round: Number(state.round ?? 0),
            turnNumber: Number(state.turnNumber ?? 0),
            actorRef,
            sceneId: String(scene?.id ?? "no-scene"),
            ...(context.scope ?? {})
        }
    };
}

export async function recordActorRuleUsage(actor, sourceId, ruleId, usage, context = {}) {
    if (!usage?.limit || usage.period === "none" || usage.period === "hit" || usage.period === "check")
        return getActorRuleUsage(actor);
    const lifecycle = actorRuleLifecycleContext(actor, context);
    const scopeKey = usageScopeKey(usage, lifecycle);
    if (!scopeKey)
        return getActorRuleUsage(actor);
    const current = getActorRuleUsage(actor);
    const index = current.findIndex((entry) => entry.sourceId === sourceId && entry.ruleId === ruleId && entry.scopeKey === scopeKey);
    const next = [...current];
    if (index >= 0)
        next[index] = { ...next[index], count: next[index].count + 1, updatedAt: Date.now() };
    else
        next.push({ sourceId, ruleId, period: usage.period, scopeKey, count: 1, updatedAt: Date.now() });
    await actor.setFlag(SYSTEM_ID, USAGE_FLAG, next);
    return next;
}

export function collectActorRuleElements(actor, context = {}) {
    const lifecycle = actorRuleLifecycleContext(actor, context);
    return getApplicableRuleElements(collectActorTalents(actor), lifecycle, getActorRuleUsage(actor));
}

function itemDataFromTalent(talent) {
    return {
        name: talent.label,
        type: "talent",
        system: {
            sourceId: talent.id,
            sourceType: talent.sourceType,
            tier: talent.tier,
            ranked: talent.ranked,
            rank: talent.rank,
            activation: talent.activation,
            enabled: talent.enabled,
            tags: talent.tags,
            rules: talent.rules,
            notes: talent.notes
        }
    };
}

async function grantTalent(actor, talent) {
    const existing = actorItems(actor).find((item) => item?.type === "talent" && String(item?.system?.sourceId ?? "") === talent.id);
    if (existing) {
        await existing.update({
            name: talent.label,
            "system.tier": talent.tier,
            "system.ranked": talent.ranked,
            "system.rank": talent.rank,
            "system.activation": talent.activation,
            "system.enabled": talent.enabled,
            "system.tags": talent.tags,
            "system.rules": talent.rules,
            "system.notes": talent.notes,
            "system.sourceType": talent.sourceType
        });
        return existing;
    }
    const created = await actor.createEmbeddedDocuments("Item", [itemDataFromTalent(talent)]);
    return created[0] ?? null;
}

export async function grantCoreParry(actor, rank = 1) {
    return grantTalent(actor, createCoreParryTalent(rank));
}

export async function grantCoreSecondWind(actor, rank = 1) {
    return grantTalent(actor, createCoreSecondWindTalent(rank));
}

export async function grantTerrinothFinesse(actor) {
    return grantTalent(actor, createTerrinothFinesseTalent());
}

export function talentDebug(actor, context = {}) {
    const lifecycle = actorRuleLifecycleContext(actor, context);
    const talents = collectActorTalents(actor);
    const usage = getActorRuleUsage(actor);
    return {
        actor: actor?.name ?? actor?.id,
        lifecycle,
        talents,
        usage,
        applicable: getApplicableRuleElements(talents, lifecycle, usage)
    };
}
