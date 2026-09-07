const SYSTEM_ID = "genesys-vtt";
const INBOX_FLAG = "narrativeDiceInbox";
const SOCKET_CHANNEL = `system.${SYSTEM_ID}`;
const SOCKET_PROTOCOL = "genesys-narrative-dice-transfer-v1";
const REQUEST_TIMEOUT_MS = 7000;
const pendingRequests = new Map();

function text(value, fallback = "") {
    const normalized = String(value ?? fallback).trim();
    return normalized || fallback;
}

function integer(value, fallback = 0, min = 0, max = 20) {
    const number = Math.trunc(Number(value));
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function transferId() {
    return `transfer:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
}

function requestId() {
    return `request:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeNarrativeDieTransfer(raw = {}) {
    const dieType = raw.dieType === "setback" ? "setback" : "boost";
    return {
        id: text(raw.id, transferId()),
        dieType,
        count: integer(raw.count, 1, 1, 5),
        sourceActorId: text(raw.sourceActorId),
        sourceActorUuid: text(raw.sourceActorUuid),
        sourceActorName: text(raw.sourceActorName, "Unknown sender"),
        sourceUserId: text(raw.sourceUserId),
        createdAt: integer(raw.createdAt, Date.now(), 0, Number.MAX_SAFE_INTEGER)
    };
}

export function normalizeNarrativeDiceInbox(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.map(normalizeNarrativeDieTransfer);
}

export function applyNarrativeDiceTransfers(pool = {}, inbox = []) {
    const normalizedInbox = normalizeNarrativeDiceInbox(inbox);
    const adjustedPool = {
        boost: integer(pool.boost),
        ability: integer(pool.ability),
        proficiency: integer(pool.proficiency),
        setback: integer(pool.setback),
        difficulty: integer(pool.difficulty),
        challenge: integer(pool.challenge)
    };
    for (const transfer of normalizedInbox)
        adjustedPool[transfer.dieType] += transfer.count;
    return { pool: adjustedPool, consumed: normalizedInbox };
}

export function summarizeNarrativeDiceInbox(inbox = []) {
    return normalizeNarrativeDiceInbox(inbox).reduce((summary, transfer) => {
        summary[transfer.dieType] += transfer.count;
        return summary;
    }, { boost: 0, setback: 0 });
}

export function readNarrativeDiceInbox(actor) {
    return normalizeNarrativeDiceInbox(actor?.getFlag?.(SYSTEM_ID, INBOX_FLAG));
}

async function resolveActor(reference) {
    if (!reference)
        return null;
    if (typeof reference === "object" && reference.documentName === "Actor")
        return reference;
    const value = text(reference);
    const direct = globalThis.game?.actors?.get?.(value);
    if (direct)
        return direct;
    if (typeof globalThis.fromUuid === "function") {
        const document = await globalThis.fromUuid(value);
        if (document?.documentName === "Actor")
            return document;
    }
    return null;
}

function activePrimaryGm() {
    return Array.from(globalThis.game?.users?.contents ?? globalThis.game?.users ?? [])
        .filter((user) => user?.active && user?.isGM)
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0] ?? null;
}

async function appendTransfer(targetActor, transfer) {
    if (!targetActor?.setFlag)
        throw new Error("The receiving Actor could not be updated.");
    const inbox = readNarrativeDiceInbox(targetActor);
    inbox.push(normalizeNarrativeDieTransfer(transfer));
    await targetActor.setFlag(SYSTEM_ID, INBOX_FLAG, inbox);
    return inbox;
}

function makeTransfer(sourceActor, dieType, count) {
    return normalizeNarrativeDieTransfer({
        id: transferId(),
        dieType,
        count,
        sourceActorId: sourceActor?.id,
        sourceActorUuid: sourceActor?.uuid,
        sourceActorName: sourceActor?.name,
        sourceUserId: globalThis.game?.user?.id,
        createdAt: Date.now()
    });
}

async function relayTransfer(sourceActor, targetActor, transfer) {
    const gm = activePrimaryGm();
    if (!gm)
        throw new Error("A GM must be online to send dice to an Actor you do not own.");
    const id = requestId();
    const response = new Promise((resolve, reject) => {
        const timer = globalThis.setTimeout(() => {
            pendingRequests.delete(id);
            reject(new Error("The GM relay did not answer. Please try again."));
        }, REQUEST_TIMEOUT_MS);
        pendingRequests.set(id, { resolve, reject, timer });
    });
    globalThis.game.socket.emit(SOCKET_CHANNEL, {
        protocol: SOCKET_PROTOCOL,
        type: "transfer-request",
        requestId: id,
        requesterUserId: globalThis.game.user.id,
        sourceActorUuid: sourceActor.uuid ?? sourceActor.id,
        targetActorUuid: targetActor.uuid ?? targetActor.id,
        transfer
    });
    await response;
}

export async function sendNarrativeDice(sourceActorReference, targetActorReference, dieType, count = 1) {
    const sourceActor = await resolveActor(sourceActorReference);
    const targetActor = await resolveActor(targetActorReference);
    if (!sourceActor)
        throw new Error("The sending Actor could not be resolved.");
    if (!targetActor)
        throw new Error("The receiving Actor could not be resolved.");
    if (!globalThis.game?.user?.isGM && !sourceActor.isOwner)
        throw new Error("You must own the sending Actor.");
    const transfer = makeTransfer(sourceActor, dieType, count);
    if (globalThis.game?.user?.isGM || targetActor.isOwner)
        await appendTransfer(targetActor, transfer);
    else
        await relayTransfer(sourceActor, targetActor, transfer);
    globalThis.Hooks?.callAll?.("genesysVttNarrativeDiceTransferred", sourceActor, targetActor, transfer);
    return transfer;
}

export async function consumeNarrativeDiceForActor(actor, pool = {}) {
    const inbox = readNarrativeDiceInbox(actor);
    if (!inbox.length)
        return { pool: applyNarrativeDiceTransfers(pool, []).pool, consumed: [] };
    if (!globalThis.game?.user?.isGM && !actor?.isOwner)
        return { pool: applyNarrativeDiceTransfers(pool, []).pool, consumed: [] };
    const adjusted = applyNarrativeDiceTransfers(pool, inbox);
    await actor.setFlag(SYSTEM_ID, INBOX_FLAG, []);
    globalThis.Hooks?.callAll?.("genesysVttNarrativeDiceConsumed", actor, adjusted.consumed);
    return adjusted;
}

function actorForContext(context = {}) {
    const actorId = text(context.actorId);
    if (actorId) {
        const direct = globalThis.game?.actors?.get?.(actorId);
        if (direct)
            return direct;
    }
    const actorName = text(context.actorName ?? context.speakerAlias);
    if (!actorName)
        return null;
    const worldActors = Array.from(globalThis.game?.actors ?? []).filter((actor) => actor?.name === actorName);
    const owned = worldActors.find((actor) => actor?.isOwner);
    if (owned)
        return owned;
    const tokenActor = Array.from(globalThis.canvas?.tokens?.placeables ?? [])
        .map((token) => token?.actor)
        .find((actor) => actor?.name === actorName && actor?.isOwner);
    return tokenActor ?? worldActors[0] ?? null;
}

export async function consumeNarrativeDiceForContext(context = {}, pool = {}) {
    const actor = actorForContext(context);
    if (!actor)
        return { pool: applyNarrativeDiceTransfers(pool, []).pool, consumed: [] };
    return consumeNarrativeDiceForActor(actor, pool);
}

export function listNarrativeDiceRecipients() {
    const recipients = new Map();
    for (const actor of Array.from(globalThis.game?.actors ?? [])) {
        if (actor?.type === "character")
            recipients.set(actor.uuid ?? actor.id, actor);
    }
    for (const token of Array.from(globalThis.canvas?.tokens?.placeables ?? [])) {
        const actor = token?.actor;
        if (actor?.type === "character" && !recipients.has(actor.uuid ?? actor.id))
            recipients.set(actor.uuid ?? actor.id, actor);
    }
    return Array.from(recipients.values())
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
        .map((actor) => ({ id: actor.id, uuid: actor.uuid ?? actor.id, name: actor.name, isOwner: Boolean(actor.isOwner) }));
}

async function handleSocketMessage(message) {
    if (message?.protocol !== SOCKET_PROTOCOL)
        return;
    if (message.type === "transfer-result" && message.requesterUserId === globalThis.game?.user?.id) {
        const pending = pendingRequests.get(message.requestId);
        if (!pending)
            return;
        globalThis.clearTimeout(pending.timer);
        pendingRequests.delete(message.requestId);
        if (message.ok)
            pending.resolve(message.transfer);
        else
            pending.reject(new Error(text(message.error, "The GM relay rejected the transfer.")));
        return;
    }
    if (message.type !== "transfer-request" || !globalThis.game?.user?.isGM || activePrimaryGm()?.id !== globalThis.game.user.id)
        return;
    let response;
    try {
        const requestingUser = globalThis.game.users?.get?.(message.requesterUserId);
        const sourceActor = await resolveActor(message.sourceActorUuid);
        const targetActor = await resolveActor(message.targetActorUuid);
        if (!requestingUser || !sourceActor || !targetActor)
            throw new Error("The relay could not resolve the user or Actors.");
        if (!requestingUser.isGM && !sourceActor.testUserPermission?.(requestingUser, "OWNER"))
            throw new Error("The sender does not own the source Actor.");
        const transfer = normalizeNarrativeDieTransfer({
            id: message.transfer?.id,
            dieType: message.transfer?.dieType,
            count: message.transfer?.count,
            sourceActorId: sourceActor.id,
            sourceActorUuid: sourceActor.uuid,
            sourceActorName: sourceActor.name,
            sourceUserId: requestingUser.id,
            createdAt: message.transfer?.createdAt
        });
        await appendTransfer(targetActor, transfer);
        response = { ok: true, transfer };
    }
    catch (error) {
        response = { ok: false, error: text(error?.message, "The transfer failed.") };
    }
    globalThis.game.socket.emit(SOCKET_CHANNEL, {
        protocol: SOCKET_PROTOCOL,
        type: "transfer-result",
        requestId: message.requestId,
        requesterUserId: message.requesterUserId,
        ...response
    });
}

function api() {
    return Object.freeze({
        protocol: SOCKET_PROTOCOL,
        readInbox: readNarrativeDiceInbox,
        summarizeInbox: summarizeNarrativeDiceInbox,
        listRecipients: listNarrativeDiceRecipients,
        send: sendNarrativeDice,
        consumeForActor: consumeNarrativeDiceForActor
    });
}

globalThis.Hooks?.once?.("ready", () => {
    globalThis.game.socket.on(SOCKET_CHANNEL, (message) => void handleSocketMessage(message));
    Object.defineProperty(globalThis.game, "genesysNarrativeDice", { configurable: true, value: api() });
    console.log(`genesys-vtt | Narrative Dice Transfer ready (${SOCKET_PROTOCOL})`);
});
