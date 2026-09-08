import { normalizeStoryPointState, prepareStoryPointTransaction } from "../domain/story-points/index.js";

const SYSTEM_ID = "genesys-vtt";
const SETTING_KEY = "storyPointState";
const HISTORY_LIMIT = 30;
let transactionQueue = Promise.resolve();

function integer(value, fallback = 0) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : fallback;
}

function clone(value) {
  return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function normalizeHistory(history) {
  return Array.from(history ?? []).slice(0, HISTORY_LIMIT).map((entry) => ({
    id: String(entry?.id ?? ""),
    timestamp: integer(entry?.timestamp),
    userId: String(entry?.userId ?? ""),
    userName: String(entry?.userName ?? "GM"),
    type: String(entry?.type ?? "adjust"),
    side: String(entry?.side ?? "player"),
    label: String(entry?.label ?? "Story Points updated"),
    before: normalizeStoryPointState(entry?.before),
    after: normalizeStoryPointState(entry?.after)
  }));
}

export function normalizeLiveStoryPointState(raw) {
  const pools = normalizeStoryPointState(raw);
  return { ...pools, revision: integer(raw?.revision), history: normalizeHistory(raw?.history) };
}

export function getStoryPointState() {
  try {
    return normalizeLiveStoryPointState(game.settings.get(SYSTEM_ID, SETTING_KEY));
  } catch {
    return normalizeLiveStoryPointState({ player: 0, gm: 0 });
  }
}

function requireGm() {
  if (!game?.user?.isGM) throw new Error("Only the GM may change Story Points.");
  if (game.users?.activeGM?.id !== game.user.id) throw new Error("The active GM controls Story Points.");
}

function historyEntry(type, side, before, after, label) {
  return {
    id: foundry?.utils?.randomID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    userId: String(game?.user?.id ?? ""),
    userName: String(game?.user?.name ?? "GM"),
    type,
    side,
    label,
    before,
    after
  };
}

async function announce(entry) {
  const before = entry.before;
  const after = entry.after;
  const content = `<section class="genesys-story-point-chat-v1832"><strong><i class="fa-solid fa-star"></i> Story Points</strong><p>${entry.label}</p><small>Players ${before.player} → ${after.player} · GM ${before.gm} → ${after.gm}</small></section>`;
  await foundry.documents.ChatMessage.create({ content, speaker: { alias: entry.userName } });
}

function enqueue(operation) {
  const run = transactionQueue.then(operation, operation);
  transactionQueue = run.catch(() => undefined);
  return run;
}

async function commit(type, side, afterPools, label, { postToChat = true } = {}) {
  requireGm();
  const current = getStoryPointState();
  const after = normalizeStoryPointState(afterPools);
  const entry = historyEntry(type, side, { player: current.player, gm: current.gm }, after, label);
  const next = {
    ...after,
    revision: current.revision + 1,
    history: [entry, ...current.history].slice(0, HISTORY_LIMIT)
  };
  await game.settings.set(SYSTEM_ID, SETTING_KEY, next);
  if (postToChat) {
    try { await announce(entry); }
    catch { ui.notifications.warn("Story Point transfer saved, but chat announcement failed."); }
  }
  Hooks.callAll("genesysStoryPointsChanged", clone(next), clone(entry));
  return clone(next);
}

export function spendStoryPoint(side) {
  return enqueue(async () => {
    requireGm();
    const current = getStoryPointState();
    const normalizedSide = side === "gm" ? "gm" : "player";
    const spend = normalizedSide === "gm" ? { gm: 1 } : { player: 1 };
    const transaction = prepareStoryPointTransaction(current, spend, { maxPlayerSpend: 1, maxGmSpend: 1 });
    const label = normalizedSide === "gm" ? "GM spent 1 Story Point · transferred to Players" : "Players spent 1 Story Point · transferred to GM";
    return commit("spend", normalizedSide, transaction.after, label);
  });
}

export function adjustStoryPoints(side, delta) {
  return enqueue(async () => {
    requireGm();
    const current = getStoryPointState();
    const normalizedSide = side === "gm" ? "gm" : "player";
    const amount = Math.max(-1, Math.min(1, Math.trunc(Number(delta) || 0)));
    if (!amount) return clone(current);
    const after = { player: current.player, gm: current.gm };
    after[normalizedSide] = Math.max(0, after[normalizedSide] + amount);
    if (after[normalizedSide] === current[normalizedSide]) return clone(current);
    const label = `${normalizedSide === "gm" ? "GM" : "Player"} pool corrected ${amount > 0 ? "+1" : "−1"}`;
    return commit("adjust", normalizedSide, after, label, { postToChat: false });
  });
}

Hooks.once("init", () => {
  game.settings.register(SYSTEM_ID, SETTING_KEY, {
    name: "Genesys Story Point State",
    scope: "world",
    config: false,
    type: Object,
    default: { player: 0, gm: 0, revision: 0, history: [] }
  });
});

Hooks.on("updateSetting", (setting) => {
  if (setting?.key !== `${SYSTEM_ID}.${SETTING_KEY}`) return;
  Hooks.callAll("genesysStoryPointsChanged", getStoryPointState(), null);
});

Hooks.once("ready", () => {
  const api = Object.freeze({ snapshot: getStoryPointState, spend: spendStoryPoint, adjust: adjustStoryPoints });
  Object.defineProperty(game, "genesysStoryPoints", { configurable: true, value: api });
  console.log(`${SYSTEM_ID} | Story Point live service ready`);
});
