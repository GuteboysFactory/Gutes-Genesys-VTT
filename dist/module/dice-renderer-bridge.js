import { normalizeDicePool, rollNarrativePool } from "../domain/dice/index.js";

export const DICE_RENDERER_PROTOCOL = "genesys-dice-renderer-v1";
const RENDER_TIMEOUT_MS = 15000;
const renderers = new Map();
let rollSequence = 0;

function clone(value) {
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function text(value, fallback = "") {
    const normalized = String(value ?? fallback).trim();
    return normalized || fallback;
}

function makeRollId() {
    rollSequence += 1;
    return `genesys-${Date.now().toString(36)}-${rollSequence.toString(36)}`;
}

function rendererSnapshot(renderer) {
    return {
        id: renderer.id,
        label: renderer.label,
        protocol: renderer.protocol,
        priority: renderer.priority,
        capabilities: clone(renderer.capabilities)
    };
}

function normalizeRenderer(renderer = {}) {
    const id = text(renderer.id);
    if (!id)
        throw new Error("A dice renderer requires a stable id.");
    if (typeof renderer.render !== "function")
        throw new Error(`Dice renderer '${id}' must provide render(request).`);
    const protocol = text(renderer.protocol, DICE_RENDERER_PROTOCOL);
    if (protocol !== DICE_RENDERER_PROTOCOL)
        throw new Error(`Dice renderer '${id}' uses unsupported protocol '${protocol}'. Expected '${DICE_RENDERER_PROTOCOL}'.`);
    return {
        id,
        label: text(renderer.label, id),
        protocol,
        priority: Number.isFinite(Number(renderer.priority)) ? Number(renderer.priority) : 0,
        capabilities: {
            threeDimensional: Boolean(renderer.capabilities?.threeDimensional),
            exactFaceLanding: renderer.capabilities?.exactFaceLanding !== false,
            sound: Boolean(renderer.capabilities?.sound),
            multiDiePool: renderer.capabilities?.multiDiePool !== false
        },
        canRender: typeof renderer.canRender === "function" ? renderer.canRender : () => true,
        render: renderer.render
    };
}

export function registerDiceRenderer(renderer, { replace = true } = {}) {
    const normalized = normalizeRenderer(renderer);
    if (!replace && renderers.has(normalized.id))
        throw new Error(`Dice renderer already registered: ${normalized.id}`);
    renderers.set(normalized.id, normalized);
    Hooks.callAll("genesysVttDiceRendererRegistered", rendererSnapshot(normalized));
    return rendererSnapshot(normalized);
}

export function unregisterDiceRenderer(rendererId) {
    const id = text(rendererId);
    const removed = renderers.delete(id);
    if (removed)
        Hooks.callAll("genesysVttDiceRendererUnregistered", id);
    return removed;
}

export function listDiceRenderers() {
    return Array.from(renderers.values())
        .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label))
        .map(rendererSnapshot);
}

function exactDice(result) {
    return (result?.dice ?? []).map((die, index) => ({
        index,
        type: die.type,
        faceIndex: Number(die.faceIndex ?? 0),
        faceNumber: Number(die.faceIndex ?? 0) + 1,
        symbols: clone(die.symbols ?? {})
    }));
}

export function buildDicePresentationRequest(result, context = {}) {
    return Object.freeze({
        protocol: DICE_RENDERER_PROTOCOL,
        rollId: text(context.rollId, makeRollId()),
        systemId: "genesys-vtt",
        systemVersion: String(game?.system?.version ?? "unknown"),
        pool: clone(normalizeDicePool(result?.pool ?? {})),
        dice: exactDice(result),
        net: clone(result?.net ?? {}),
        context: Object.freeze({
            sourceType: text(context.sourceType, "narrative-roll"),
            sourceId: text(context.sourceId),
            sourceLabel: text(context.sourceLabel),
            actorId: text(context.actorId),
            actorName: text(context.actorName ?? context.speakerAlias),
            itemId: text(context.itemId),
            targetId: text(context.targetId),
            metadata: clone(context.metadata ?? {})
        })
    });
}

async function withTimeout(promise, timeoutMs, rendererId) {
    let timer;
    try {
        return await Promise.race([
            Promise.resolve(promise),
            new Promise((_, reject) => {
                timer = globalThis.setTimeout(() => reject(new Error(`Dice renderer '${rendererId}' timed out.`)), timeoutMs);
            })
        ]);
    }
    finally {
        if (timer)
            globalThis.clearTimeout(timer);
    }
}

function eligibleRenderers(request, preferredRendererId = "") {
    const rows = Array.from(renderers.values())
        .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label));
    if (preferredRendererId) {
        const preferred = rows.find((renderer) => renderer.id === preferredRendererId);
        if (preferred)
            return [preferred, ...rows.filter((renderer) => renderer.id !== preferredRendererId)];
    }
    return rows;
}

export async function presentResolvedNarrativeRoll(result, context = {}) {
    const request = buildDicePresentationRequest(result, context);
    Hooks.callAll("genesysVttBeforeDicePresentation", request);

    for (const renderer of eligibleRenderers(request, text(context.rendererId))) {
        try {
            if (!await renderer.canRender(request))
                continue;
            await withTimeout(renderer.render(request), Number(context.timeoutMs ?? RENDER_TIMEOUT_MS), renderer.id);
            const presentation = {
                rollId: request.rollId,
                rendered: true,
                rendererId: renderer.id,
                rendererLabel: renderer.label,
                fallback: false
            };
            Hooks.callAll("genesysVttAfterDicePresentation", request, presentation);
            return presentation;
        }
        catch (error) {
            console.warn(`genesys-vtt | Dice renderer '${renderer.id}' failed; trying fallback.`, error);
            Hooks.callAll("genesysVttDiceRendererFailed", request, rendererSnapshot(renderer), error);
        }
    }

    const presentation = {
        rollId: request.rollId,
        rendered: false,
        rendererId: null,
        rendererLabel: "System fallback",
        fallback: true
    };
    Hooks.callAll("genesysVttAfterDicePresentation", request, presentation);
    return presentation;
}

export async function rollNarrativeWithPresentation(pool, context = {}) {
    const result = rollNarrativePool(pool);
    const presentation = await presentResolvedNarrativeRoll(result, context);
    return { result, presentation };
}

export function diceRendererBridgeApi() {
    return Object.freeze({
        protocol: DICE_RENDERER_PROTOCOL,
        registerRenderer: registerDiceRenderer,
        unregisterRenderer: unregisterDiceRenderer,
        listRenderers: listDiceRenderers,
        buildRequest: buildDicePresentationRequest,
        presentResolved: presentResolvedNarrativeRoll,
        roll: rollNarrativeWithPresentation
    });
}

Hooks.once("ready", () => {
    const api = diceRendererBridgeApi();
    Object.defineProperty(game, "genesysDice", {
        configurable: true,
        value: api
    });
    Hooks.callAll("genesysVttDiceRendererApiReady", api);
    console.log(`genesys-vtt | Dice Renderer Bridge ready (${DICE_RENDERER_PROTOCOL})`);
});
