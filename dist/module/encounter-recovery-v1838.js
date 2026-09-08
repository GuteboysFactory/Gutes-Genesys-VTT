import {encounterRecoveryBonus} from './recovery-talents-v1881.js';
import {collectActorTalents} from './talent-service-foundation.js';
const SYSTEM_ID = 'genesys-vtt';
const pending = new Set();
function requireGm() {
  if (!game.user?.isGM || game.users?.activeGM?.id !== game.user.id) throw new Error('The active GM must perform recovery.');
}
function context(scene) {
  const state = game.genesysVtt.initiative.sceneState(scene);
  const id = scene?.getFlag(SYSTEM_ID, 'recoveryEncounterId');
  if (state.status !== 'ended' || !id) throw new Error('End an encounter in this version before using recovery.');
  return { state, key: `${scene.id}:${id}` };
}
function natureRecovery(actor) { return collectActorTalents(actor).some(t=>t.enabled && t.id==='core-talent:one-with-nature'); }
function history(actor) { return actor.getFlag(SYSTEM_ID, 'encounterRecoveries') ?? []; }
export function recoveryRoster(scene = canvas.scene) {
  try {
    const { state, key } = context(scene);
    return { ready: true, rows: state.entries.filter(e => e.side === 'pc').map(entry => {
      const actor = game.genesysVtt.initiative.resolveActorRef(entry.actorRef);
      const record = actor ? history(actor).find(row => row.key === key) : null;
      return { actorRef: entry.actorRef, name: actor?.name ?? entry.label, natureRecovery: actor ? natureRecovery(actor) : false, autoBonus: actor ? encounterRecoveryBonus(actor).amount : 0, done: Boolean(record), blocked: !actor || entry.encounterStatus === 'dead', recovered: record?.recovered ?? 0 };
    }) };
  } catch (error) { return { ready: false, reason: error.message, rows: [] }; }
}
export async function recover(actorRef, skill, bonus = 0, scene = canvas.scene) {
  requireGm();
  if (!['cool', 'discipline', 'survival'].includes(skill)) throw new Error('Choose Cool or Discipline.');
  if (!Number.isSafeInteger(bonus) || bonus < 0 || bonus > 20) throw new Error('Talent bonus must be a whole number from 0 to 20.');
  const { state, key } = context(scene);
  const entry = state.entries.find(e => e.actorRef === actorRef && e.side === 'pc');
  const actor = game.genesysVtt.initiative.resolveActorRef(actorRef);
  if (!entry || !actor || entry.encounterStatus === 'dead' || actor.system?.role !== 'pc') throw new Error('Choose a living player participant.');
  if ((actor.system.criticalInjuries ?? []).some(c => c.active !== false && c.healed !== true && (Number(c.total) >= 151 || String(c.name).toLowerCase() === 'dead'))) throw new Error('Dead characters cannot recover strain.');
  if (pending.has(actorRef) || history(actor).some(row => row.key === key)) throw new Error('Recovery already performed or in progress for this encounter.');
  pending.add(actorRef);
  try {
    if (skill === 'survival') {
      if (!natureRecovery(actor)) throw new Error('One with Nature is required for Survival recovery.');
      if (!await foundry.applications.api.DialogV2.confirm({window:{title:'One with Nature'},content:'<p>Confirm that this character is in the wilderness. Use Survival for encounter recovery?</p>',rejectClose:false})) throw new Error('Recovery cancelled; no roll made.');
      requireGm();
      if (context(scene).key !== key || !natureRecovery(actor)) throw new Error('Recovery context changed.');
    }
    const before = Number(actor.system.strain.value);
    if (!Number.isSafeInteger(before) || before < 0) throw new Error('Invalid strain value.');
    const prepared = game.genesysVtt.checks.prepareActorSkill(actor, skill, { mode: 'standard', difficulty: 0 });
    const pool = prepared.check.construction.pool;
    const result = game.genesysVtt.dice.roll(pool);
    const successes = Math.max(0, Math.trunc(Number(result.net.success) || 0));
    const automatic = encounterRecoveryBonus(actor);
    const after = Math.max(0, before - successes - bonus - automatic.amount);
    const record = { key, skill, bonus, automaticBonus:automatic.amount, automaticSources:automatic.labels, successes, before, after, recovered: before - after, pool, result, timestamp: Date.now(), userId: game.user.id };
    requireGm();
    if (context(scene).key !== key) throw new Error('Encounter changed; recovery cancelled.');
    await actor.update({ 'system.strain.value': after, [`flags.${SYSTEM_ID}.encounterRecoveries`]: [...history(actor), record] });
    // Health and receipt are persisted together. A chat error must never permit another roll.
    try {
      await foundry.documents.ChatMessage.create({ speaker: { alias: actor.name }, content: `<section><strong>Encounter Recovery · ${skill === 'survival' ? 'Survival · One with Nature' : skill === 'cool' ? 'Cool' : 'Discipline'}</strong><p>Simple check · Success ${successes} · Automatic talent bonus ${automatic.amount} · Other GM bonus ${bonus}</p><p>Strain ${before} → ${after} · Recovered ${before - after}</p></section>` });
    } catch { ui.notifications.warn('Recovery saved, but the chat message could not be posted.'); }
    return record;
  } finally { pending.delete(actorRef); }
}
Hooks.once('ready', () => Object.defineProperty(game, 'genesysEncounterRecovery', { configurable: true, value: Object.freeze({ recoveryRoster, recover }) }));
