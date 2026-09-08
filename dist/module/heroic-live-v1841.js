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
      const rejuvenation = before.secondaryEffectIds.includes('rot-heroic-secondary:rejuvenation');
      const strainBefore = Number(actor.system?.strain?.value);
      if (rejuvenation && (!Number.isFinite(strainBefore) || strainBefore < 0)) throw new Error('Invalid Strain value.');
      return { ...(rejuvenation ? { strainAfter: Math.max(0,strainBefore-2), strainRecovered:Math.min(2,strainBefore) } : {}), ability: prepared.nextAbility, pools: prepared.storyPointTransaction.after,
        timing: { activationId: foundry.utils.randomID(), skipTurn: state.status === 'active' && state.activeActorRef === actor.uuid ? turnKey(state,scene) : '', lastTurn: '', rejuvenationStarts: state.status === 'active' && state.activeActorRef === actor.uuid ? [turnKey(state,scene)] : [], sceneId: scene?.id ?? '' }, cost: before.storyPointCost };
    });
    const secondaryLabels = game.genesysHeroic.secondaryOptions?.(actor)?.filter(row => proposal.ability.secondaryEffectIds.includes(row.id)).map(row => row.description ? `${row.label}: ${row.description}` : row.label).join('; ') || proposal.ability.secondaryEffectIds.join(', ');
    try { await foundry.documents.ChatMessage.create({ speaker: { alias: actor.name }, content: `<p><strong>Heroic Ability Activated</strong> · ${esc(proposal.ability.name || proposal.ability.primaryEffectLabel)}</p><p>${proposal.cost} Story Points · Usage ${proposal.ability.usesThisSession} · Until the end of the next owner turn (${proposal.ability.activeTurnBudget} turn budget).</p>${secondaryLabels ? `<p>Secondary Effects: ${esc(secondaryLabels)}</p>` : ''}${proposal.strainAfter !== undefined ? `<p>Rejuvenation: recovered ${proposal.strainRecovered} Strain on activation. Owner-turn recovery is automatic while active.</p>` : ''}<p>Apply remaining narrative/mechanical effects with the GM.</p>` }); }
    catch { ui.notifications.warn('Heroic activation saved; chat announcement failed.'); }
    return proposal;
  } finally { locks.delete(actor.uuid); }
}
export async function purchaseUpgrade(actor, type, effectId = "") {
  if (!authority()) throw new Error('The active GM must purchase Heroic upgrades.');
  if (!actor?.uuid || actor.system?.role !== 'pc') throw new Error('Choose a player character.');
  if (!['duration', 'frequency', 'power', 'story', 'secondary-effect', 'custom-secondary'].includes(type)) throw new Error('Unsupported upgrade.');
  if (locks.has(actor.uuid)) throw new Error('Heroic action already in progress.');
  locks.add(actor.uuid);
  try {
    const api = game.genesysHeroic;
    const before = api.actorSnapshot(actor);
    const rules = api.actorRules(actor);
    const earned = Number(actor.system?.xp?.earned ?? 0);
    if (!before.selected || !before.primaryEffectId) throw new Error('No Heroic Ability selected.');
    if (before.active) throw new Error('End the active Heroic effect before upgrading.');
    if (game.genesysStoryPoints?.snapshot()?.heroicPending) throw new Error('Recover interrupted Heroic activation first.');
    let custom = null;
    const customBefore = actor.getFlag(SID,'heroicCustomEffects') ?? [];
    if (type === 'custom-secondary') {
      const input = await foundry.applications.api.DialogV2.wait({
        window:{title:'Custom Secondary Effect'},
        content:'<label>Name<input name="effectName" maxlength="80" required></label><label>Description<textarea name="effectDescription" maxlength="2000" required></textarea></label><p>Custom effect for this character. Resolved manually by the GM.</p>',
        buttons:[{action:'next',label:'Review Purchase',callback:(_e,_b,dialog)=>({name:dialog.element.querySelector('[name="effectName"]').value,description:dialog.element.querySelector('[name="effectDescription"]').value})},{action:'cancel',label:'Cancel',default:true,callback:()=>null}],rejectClose:false
      });
      if (!input) return false;
      const label = String(input.name ?? '').trim(), description = String(input.description ?? '').trim();
      if (!label || label.length > 80 || !description || description.length > 2000) throw new Error('Enter a name (1–80 characters) and description (1–2000 characters).');
      if (api.secondaryOptions(actor).some(row => row.label.toLowerCase() === label.toLowerCase())) throw new Error('An effect with this name already exists.');
      effectId = `custom-heroic:${foundry.utils.randomID()}`;
      custom = {id:effectId,label,description,kind:'secondary-effect',metadata:{printedSource:'Custom · GM resolved'}};
      type = 'secondary-effect';
    }
    const secondary = custom ?? (type === 'secondary-effect' ? api.secondaryOptions(actor).find(row => row.id === effectId) : null);
    if (type === 'secondary-effect' && !secondary) throw new Error('Choose a Secondary Effect from this character setting.');
    const next = api.purchaseUpgrade(before, { type, effectId }, earned, rules);
    const cost = next.abilityPointsSpent - before.abilityPointsSpent;
    const detail = secondary ? `Secondary Effect: ${secondary.label}. Resolve this effect with the GM when activating the ability.` : type === 'duration' ? `Duration: ${api.durationTurns(before,rules)} → ${api.durationTurns(next,rules)} turns`
      : type === 'frequency' ? `Uses per session: ${api.usesPerSession(before,rules)} → ${api.usesPerSession(next,rules)}`
      : type === 'power' ? `Power: ${before.powerLevel} → ${next.powerLevel}. Apply the improved effect with the GM.`
      : `Story Point cost: ${before.storyPointCost} → ${next.storyPointCost}`;
    const accepted = await foundry.applications.api.DialogV2.wait({
      window: { title: 'Purchase Heroic Upgrade' },
      content: `<p><strong>${esc(actor.name)}</strong> · ${esc(type)}</p><p>${esc(detail)}</p>${custom ? `<p>${esc(custom.description)}</p>` : ''}<p>Cost: ${cost} Ability Points. Remaining: ${api.availablePoints(next,earned,rules)}. XP is unchanged.</p>`,
      buttons: [{ action:'buy', label:'Purchase', callback:()=>true }, { action:'cancel', label:'Cancel', default:true, callback:()=>false }],
      rejectClose:false
    });
    if (accepted !== true) return false;
    if (JSON.stringify(actor.getFlag(SID,'heroicCustomEffects') ?? []) !== JSON.stringify(customBefore) || (!custom && secondary && !api.secondaryOptions(actor).some(row => row.id === effectId)) || !authority() || JSON.stringify(api.actorSnapshot(actor)) !== JSON.stringify(before)
      || Number(actor.system?.xp?.earned ?? 0) !== earned || JSON.stringify(api.actorRules(actor)) !== JSON.stringify(rules)
      || game.genesysStoryPoints?.snapshot()?.heroicPending) throw new Error('Heroic state changed. Review the upgrade again.');
    const history = actor.getFlag(SID,'heroicUpgradeHistory') ?? [];
    await actor.update({ 'system.heroicAbility': next, ...(custom ? {[`flags.${SID}.heroicCustomEffects`]:[...customBefore,custom]} : {}), [`flags.${SID}.heroicUpgradeHistory`]:
      [...history, { type, effectId:secondary?.id ?? "", cost, earnedXp:earned, spentAfter:next.abilityPointsSpent, userId:game.user.id, at:Date.now() }].slice(-100) });
    return true;
  } finally { locks.delete(actor.uuid); }
}
export async function beginTurn(actor, state, scene) {
  if (!authority() || !actor?.uuid || state.status !== 'active' || state.activeActorRef !== actor.uuid) return false;
  if (!actor.system?.heroicAbility?.active || !actor.system.heroicAbility.secondaryEffectIds?.includes('rot-heroic-secondary:rejuvenation')) return false;
  if (locks.has(actor.uuid)) return false;
  if (game.genesysStoryPoints?.snapshot()?.heroicPending) return false;
  locks.add(actor.uuid);
  try {
    const timing = actor.getFlag(SID,'heroicTiming') ?? {};
    const key = turnKey(state,scene);
    const starts = timing.rejuvenationStarts ?? [];
    if (starts.includes(key) || timing.skipTurn === key) return false;
    const before = Number(actor.system.strain?.value);
    if (!Number.isFinite(before) || before < 0) throw new Error('Invalid Strain value.');
    await actor.update({ 'system.strain.value':Math.max(0,before-2), [`flags.${SID}.heroicTiming`]:{...timing,rejuvenationStarts:[...starts,key]} });
    return true;
  } finally { locks.delete(actor.uuid); }
}
Hooks.on('updateScene', (scene, change) => {
  if (!authority() || !JSON.stringify(change).includes('initiative')) return;
  const state = game.genesysVtt?.initiative?.sceneState(scene);
  if (!state?.activeActorRef) return;
  Promise.resolve(fromUuid(state.activeActorRef)).then(actor => beginTurn(actor,state,scene)).catch(error => ui.notifications.warn(error.message));
});
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
Hooks.once('ready', () => Object.defineProperty(game,'genesysHeroicLive',{ configurable:true, value:Object.freeze({ activate, requestActivation, purchaseUpgrade, beginTurn, finishTurn, recover: recoverHeroicTransaction }) }));
