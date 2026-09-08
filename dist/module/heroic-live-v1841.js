import { transactHeroic, recoverHeroicTransaction } from './story-point-service-v1832.js';
const SID = 'genesys-vtt';
const locks = new Set();
function authority() { return game.user?.isGM && game.users?.activeGM?.id === game.user.id; }
function esc(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
export function turnKey(state, scene) {
  return `${scene?.id ?? ''}:${scene?.getFlag?.(SID,'ruleEncounterId') ?? ''}:${state.round}:${state.turnNumber}:${state.activeActivationId ?? ''}`;
}
export async function activate(actor) {
  if (!authority()) throw new Error('The active GM must approve Heroic activation.');
  if (!actor?.uuid || actor.system?.role !== 'pc') throw new Error('Choose a player character.');
  if (locks.has(actor.uuid)) throw new Error('Heroic action already in progress.');
  locks.add(actor.uuid);
  try {
    const proposal = await transactHeroic(actor, pools => {
      const before = game.genesysHeroic.actorSnapshot(actor);
      if (before.active) throw new Error('Heroic Ability is already active.');
      const rules = game.genesysHeroic.actorRules(actor);
      const prepared = game.genesysHeroic.prepareActivation(before, pools, rules);
      const scene = canvas.scene;
      const state = game.genesysVtt.initiative.sceneState(scene);
      return { ability: prepared.nextAbility, pools: prepared.storyPointTransaction.after,
        timing: { skipTurn: state.status === 'active' && state.activeActorRef === actor.uuid ? turnKey(state,scene) : '', lastTurn: '', sceneId: scene?.id ?? '' }, cost: before.storyPointCost };
    });
    try { await foundry.documents.ChatMessage.create({ speaker: { alias: actor.name }, content: `<p><strong>Heroic Ability Activated</strong> · ${esc(proposal.ability.name || proposal.ability.primaryEffectLabel)}</p><p>${proposal.cost} Story Points · Usage ${proposal.ability.usesThisSession} · Until the end of the next owner turn (${proposal.ability.activeTurnBudget} turn budget).</p><p>Apply the ability's narrative/mechanical effect with the GM.</p>` }); }
    catch { ui.notifications.warn('Heroic activation saved; chat announcement failed.'); }
    return proposal;
  } finally { locks.delete(actor.uuid); }
}
export async function finishTurn(actor, state, scene) {
  if (!actor?.system?.heroicAbility?.active || state.activeActorRef !== actor.uuid) return;
  if (game.genesysStoryPoints?.snapshot()?.heroicPending?.actorRef === actor.uuid) throw new Error("Recover interrupted Heroic activation before ending this turn.");
  if (!game.user?.isGM && !actor.isOwner) throw new Error('Actor ownership required.');
  const key = turnKey(state, scene);
  const timing = actor.getFlag(SID,'heroicTiming') ?? {};
  if (timing.lastTurn === key) return;
  const skip = timing.skipTurn === key;
  const next = skip ? game.genesysHeroic.actorSnapshot(actor) : game.genesysHeroic.advanceOwnerTurn(actor.system.heroicAbility, game.genesysHeroic.actorRules(actor));
  await actor.update({ 'system.heroicAbility': next, [`flags.${SID}.heroicTiming`]: { ...timing, lastTurn: key, skipTurn: skip ? '' : timing.skipTurn } });
}
export async function requestActivation(actor) {
  if (authority()) return activate(actor);
  if (!actor?.isOwner) throw new Error('You must own this character.');
  const recipients = foundry.documents.ChatMessage.getWhisperRecipients('GM');
  if (!game.users.activeGM) throw new Error('An active GM is required.');
  await foundry.documents.ChatMessage.create({ whisper: recipients.map(u => u.id), speaker: { alias: actor.name },
    content: `<p>Heroic activation requested for ${esc(actor.name)}. GM: review ownership, timing and effect before approving.</p><button type="button" data-heroic-approve="${esc(actor.uuid)}">Approve Heroic Activation</button>` });
  ui.notifications.info('Heroic activation request sent to GM.');
}
Hooks.on('renderChatMessageHTML', (_message, html) => {
  for (const button of html.querySelectorAll('[data-heroic-approve]')) {
    button.disabled = !authority();
    button.addEventListener('click', async () => {
      if (!authority()) return;
      button.disabled = true;
      try { await activate(await fromUuid(button.dataset.heroicApprove)); }
      catch (error) { ui.notifications.warn(error.message); button.disabled = false; }
    });
  }
});
Hooks.once('ready', () => Object.defineProperty(game,'genesysHeroicLive',{ configurable:true, value:Object.freeze({ activate, requestActivation, finishTurn, recover: recoverHeroicTransaction }) }));
