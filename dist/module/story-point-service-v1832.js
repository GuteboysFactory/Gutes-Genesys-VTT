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
  return { ...pools, ruleReceipts: clone(raw?.ruleReceipts??{}), revision: integer(raw?.revision), history: normalizeHistory(raw?.history), ...(raw?.checkPending?{checkPending:clone(raw.checkPending)}:{}), ...(raw?.heroicPending ? { heroicPending: clone(raw.heroicPending) } : {}) };
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
    ruleReceipts:current.ruleReceipts,
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

export function spendStoryPoint(side, amount = 1) {
  return enqueue(async () => {
    requireGm();
    const current = getStoryPointState();
    if (current.heroicPending || current.checkPending) throw new Error("An interrupted Heroic activation must be recovered first.");
    const normalizedSide = side === "gm" ? "gm" : "player";
    if (!Number.isSafeInteger(amount) || amount < 1) throw new Error("Story Point cost must be a positive whole number.");
    const spend = normalizedSide === "gm" ? { gm: amount } : { player: amount };
    const transaction = prepareStoryPointTransaction(current, spend);
    const label = normalizedSide === "gm" ? `GM spent ${amount} Story Point(s) · transferred to Players` : `Players spent ${amount} Story Point(s) · transferred to GM`;
    return commit("spend", normalizedSide, transaction.after, label);
  });
}

// Durable idempotency for an approved item/archetype action; shared with the existing pool queue.
export function spendRuleStoryPoint(transactionId,side='player') {
 return enqueue(async()=>{
  requireGm();if(typeof transactionId!=='string'||!transactionId||transactionId.length>200)throw Error('Invalid rule transaction.');
  const current=getStoryPointState();if(current.heroicPending||current.checkPending)throw Error('Recover the interrupted Heroic activation first.');
  if(current.ruleReceipts[transactionId])return current.ruleReceipts[transactionId];
  if(!['player','gm'].includes(side))throw Error('Invalid Story Point side.');
  const after=prepareStoryPointTransaction(current,{[side]:1}).after;
  const receipt={side,amount:1,timestamp:Date.now()};
  const entry=historyEntry('rule',side,current,after,'Rule activation: one Story Point transferred');
  const next={...current,...after,revision:current.revision+1,history:[entry,...current.history].slice(0,HISTORY_LIMIT),ruleReceipts:{...current.ruleReceipts,[transactionId]:receipt}};
  requireGm();await game.settings.set(SYSTEM_ID,SETTING_KEY,next);Hooks.callAll('genesysStoryPointsChanged',clone(next),clone(entry));return receipt;
 });
}

export function beginCheckStoryPoints(id,spend,{impossible=false,gmApproved=false}={}){
 return enqueue(async()=>{
  requireGm();const current=getStoryPointState();
  if(typeof id!=="string"||!id||current.ruleReceipts[id])throw Error("Invalid or already resolved check ID.");
  if(current.checkPending?.id===id)return current.checkPending;
  if(current.heroicPending||current.checkPending)throw Error('Resolve the pending Story Point action first.');
  if(impossible&&(!gmApproved||spend.player!==1))throw Error('Impossible checks require GM permission and exactly one player Story Point; it grants permission, not an upgrade.');
  const transaction=prepareStoryPointTransaction(current,spend,{maxPlayerSpend:1,maxGmSpend:1});
  const pending={id,...transaction,impossible};
  await game.settings.set(SYSTEM_ID,SETTING_KEY,{...current,checkPending:pending});return pending;
 });
}
export function finishCheckStoryPoints(id){
 return enqueue(async()=>{
  requireGm();const current=getStoryPointState();if(current.ruleReceipts[id])return current.ruleReceipts[id];
  if(current.checkPending?.id!==id)throw Error('Check Story Point reservation changed.');
  const {checkPending:pending,...rest}=current,receipt={check:true,spend:pending.spend};
  const entry=historyEntry('check','both',pending.before,pending.after,'Check resolved: reserved Story Points transferred');
  const next={...rest,...pending.after,revision:current.revision+1,ruleReceipts:{...current.ruleReceipts,[id]:receipt},history:[entry,...current.history].slice(0,HISTORY_LIMIT)};
  await game.settings.set(SYSTEM_ID,SETTING_KEY,next);Hooks.callAll('genesysStoryPointsChanged',clone(next),clone(entry));return receipt;
 });
}
export function cancelCheckStoryPoints(id){
 return enqueue(async()=>{
  requireGm();const current=getStoryPointState();
  if(current.ruleReceipts[id])throw Error('A resolved check cannot be cancelled.');
  if(!current.checkPending)return;
  if(current.checkPending.id!==id)throw Error('Another check owns the reservation.');
  const {checkPending,...rest}=current;
  await game.settings.set(SYSTEM_ID,SETTING_KEY,rest);
  Hooks.callAll('genesysStoryPointsChanged',clone(rest));
 });
}
export function seedSessionStoryPoints(number,playerCount){
 return enqueue(async()=>{
  requireGm();if(!Number.isSafeInteger(playerCount)||playerCount<0)throw Error('Invalid session player count.');
  const current=getStoryPointState(),id=`session:${number}`;
  if(current.ruleReceipts[id])return current;
  if(current.heroicPending||current.checkPending)throw Error('Finish the pending Story Point action before starting a session.');
  const entry=historyEntry('session','both',current,{player:playerCount,gm:1},'Session Story Point pools initialized');
  const next={...current,player:playerCount,gm:1,revision:current.revision+1,ruleReceipts:{...current.ruleReceipts,[id]:{playerCount}},history:[entry,...current.history].slice(0,HISTORY_LIMIT)};
  await game.settings.set(SYSTEM_ID,SETTING_KEY,next);Hooks.callAll('genesysStoryPointsChanged',clone(next),clone(entry));return next;
 });
}
export function adjustStoryPoints(side, delta) {
  return enqueue(async () => {
    requireGm();
    const current = getStoryPointState();
    if (current.heroicPending || current.checkPending) throw new Error("An interrupted Heroic activation must be recovered first.");
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

export function transactHeroic(actor, prepare) {
  return enqueue(async () => {
    requireGm();
    const current = getStoryPointState();
    if (current.heroicPending || current.checkPending) throw new Error("An interrupted Heroic activation must be recovered first.");
    const proposal = prepare(clone(current));
    const pending = { ...(proposal.woundsAfter !== undefined ? { beforeWounds: actor.system.wounds.value } : {}), ...(proposal.strainAfter !== undefined ? { beforeStrain: actor.system.strain.value } : {}), actorRef: actor.uuid, beforeAbility: clone(actor.system.heroicAbility), beforeTiming: clone(actor.getFlag(SYSTEM_ID, "heroicTiming") ?? {}), id: foundry.utils.randomID() };
    await game.settings.set(SYSTEM_ID, SETTING_KEY, { ...current, heroicPending: pending });
    try {
      await actor.update({ ...(proposal.woundsAfter !== undefined ? {"system.wounds.value": proposal.woundsAfter} : {}), ...(proposal.strainAfter !== undefined ? {"system.strain.value": proposal.strainAfter} : {}), "system.heroicAbility": proposal.ability, [`flags.${SYSTEM_ID}.heroicTiming`]: proposal.timing });
      const entry = historyEntry("heroic", "player", { player: current.player, gm: current.gm }, proposal.pools, "Heroic Ability activated");
      const next = { ...proposal.pools, ruleReceipts:current.ruleReceipts, revision: current.revision + 1, history: [entry, ...current.history].slice(0, HISTORY_LIMIT) };
      await game.settings.set(SYSTEM_ID, SETTING_KEY, next);
      Hooks.callAll("genesysStoryPointsChanged", clone(next), clone(entry));
      return proposal;
    } catch (error) {
      // Restore actor first. Keep the journal if restoration fails, blocking further pool writes.
      try {
        await actor.update({ ...(pending.beforeWounds !== undefined ? {"system.wounds.value": pending.beforeWounds} : {}), ...(pending.beforeStrain !== undefined ? {"system.strain.value": pending.beforeStrain} : {}), "system.heroicAbility": pending.beforeAbility, [`flags.${SYSTEM_ID}.heroicTiming`]: pending.beforeTiming });
        await game.settings.set(SYSTEM_ID, SETTING_KEY, current);
      } catch { throw new Error("Heroic save was interrupted. Use Recover Interrupted Activation in GM Dock before continuing."); }
      throw error;
    }
  });
}
export function recoverHeroicTransaction() {
  return enqueue(async () => {
    requireGm();
    const current = getStoryPointState();
    const pending = current.heroicPending;
    if (!pending) return false;
    const actor = await fromUuid(pending.actorRef);
    if (!actor) throw new Error("Interrupted Heroic actor is unavailable; restore that actor before recovery.");
    await actor.update({ ...(pending.beforeWounds !== undefined ? {"system.wounds.value": pending.beforeWounds} : {}), ...(pending.beforeStrain !== undefined ? {"system.strain.value": pending.beforeStrain} : {}), "system.heroicAbility": pending.beforeAbility, [`flags.${SYSTEM_ID}.heroicTiming`]: pending.beforeTiming });
    delete current.heroicPending;
    await game.settings.set(SYSTEM_ID, SETTING_KEY, current);
    Hooks.callAll("genesysStoryPointsChanged", clone(current), null);
    return true;
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
  const api = Object.freeze({ snapshot: getStoryPointState, spend: spendStoryPoint, spendRule:spendRuleStoryPoint, beginCheck:beginCheckStoryPoints,finishCheck:finishCheckStoryPoints,cancelCheck:cancelCheckStoryPoints,seedSession:seedSessionStoryPoints, adjust: adjustStoryPoints });
  Object.defineProperty(game, "genesysStoryPoints", { configurable: true, value: api });
  console.log(`${SYSTEM_ID} | Story Point live service ready`);
});
