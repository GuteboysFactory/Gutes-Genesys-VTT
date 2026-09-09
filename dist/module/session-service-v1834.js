const SYSTEM_ID = "genesys-vtt";
const KEY = "sessionState";
let queue = Promise.resolve();
export function snapshot() {
  const raw = game.settings.get(SYSTEM_ID, KEY) ?? {};
  return { number: Math.max(0, Math.trunc(Number(raw.number) || 0)), active: raw.active === true,
    startedAt: Number(raw.startedAt) || 0, endedAt: Number(raw.endedAt) || 0,
    history: Array.isArray(raw.history) ? raw.history.slice(0, 20).map(entry => ({ ...entry })) : [] };
}
export function transition(action, options={}) {
  const operation = async () => {
    if (!game.user?.isGM) throw new Error("Only the GM may manage sessions.");
    const activeGm = game.users?.activeGM;
    if (!activeGm || activeGm.id !== game.user.id) throw new Error("Use the active GM account to manage sessions.");
    if (!["start", "end"].includes(action)) throw new Error("Unknown session action.");
    const current = snapshot();
    if ((action === "start") === current.active) return current;
    const now = Date.now();
    const next = { ...current, active: action === "start" };
    if (next.active) { next.number += 1; next.startedAt = now; next.endedAt = 0; }
    else next.endedAt = now;
    next.history = [{ number: next.number, action, timestamp: now, userName: String(game.user.name ?? "GM") }, ...current.history].slice(0, 20);
    if(next.active&&game.genesysStoryPoints?.seedSession)await game.genesysStoryPoints.seedSession(next.number,options.playerCount??Array.from(game.users?.contents??[]).filter(u=>u.active&&!u.isGM).length);
    await game.settings.set(SYSTEM_ID, KEY, next);
    Hooks.callAll("genesysSessionChanged", snapshot());
    return snapshot();
  };
  const result = queue.then(operation, operation);
  queue = result.catch(() => undefined);
  return result;
}
Hooks.once("init", () => game.settings.register(SYSTEM_ID, KEY, {
  name: "Session state", scope: "world", config: false, type: Object,
  default: { number: 0, active: false, startedAt: 0, endedAt: 0, history: [] }
}));
Hooks.on("updateSetting", setting => {
  if (setting?.key === `${SYSTEM_ID}.${KEY}`) Hooks.callAll("genesysSessionChanged", snapshot());
});
Hooks.once("ready", () => Object.defineProperty(game, "genesysSession", {
  configurable: true, value: Object.freeze({ snapshot, transition })
}));
