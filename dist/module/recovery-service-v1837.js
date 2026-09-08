const SYSTEM_ID = 'genesys-vtt';
let pending = false;
function amount(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Invalid wound or strain value. Review the character sheet.');
  return n;
}
function requireGm() {
  if (!game.user?.isGM) throw new Error('Only the GM may apply recovery.');
  if (game.users?.activeGM?.id !== game.user.id) throw new Error('Use the active GM account to apply recovery.');
}
export function nightRestPreview(actor) {
  if (actor?.type !== 'character' || actor?.system?.role !== 'pc') throw new Error('Select player characters for natural rest.');
  const dead = (actor.system.criticalInjuries ?? []).some(row => row.active !== false && row.healed !== true && (Number(row.total) >= 151 || String(row.name).toLowerCase() === 'dead'));
  if (dead) throw new Error('Natural rest cannot revive a dead character.');
  const before = { wounds: amount(actor.system.wounds?.value), strain: amount(actor.system.strain?.value) };
  return { id: actor.id, name: String(actor.name ?? 'Character'), before, after: { wounds: Math.max(0, before.wounds - 1), strain: 0 } };
}
export async function applyNightRest(rows, confirmed) {
  requireGm();
  if (confirmed !== true) throw new Error('Confirm a full night of rest first.');
  if (pending) throw new Error('Recovery is already in progress.');
  if (!Array.isArray(rows) || !rows.length) throw new Error('Select at least one character.');
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Duplicate character selection.');
  pending = true;
  const applied = [], failed = [];
  try {
    // Validate every preview before applying any part of the batch.
    const prepared = rows.map(row => {
      const actor = game.actors.get(row.id);
      const preview = nightRestPreview(actor);
      if (preview.before.wounds !== row.wounds || preview.before.strain !== row.strain) throw new Error(`${preview.name}: values changed. Review the refreshed preview.`);
      return { actor, preview };
    });
    for (const { actor, preview } of prepared) {
      try {
        requireGm();
        const latest = nightRestPreview(actor);
        if (latest.before.wounds !== preview.before.wounds || latest.before.strain !== preview.before.strain) throw new Error('Values changed during recovery; review this character.');
        await actor.update({
          'system.wounds.value': preview.after.wounds,
          'system.strain.value': preview.after.strain,
          [`flags.${SYSTEM_ID}.lastNaturalRest`]: { ...preview, timestamp: Date.now(), userId: game.user.id, kind: 'full-night' }
        });
        applied.push(preview);
      } catch (error) { failed.push({ id: actor.id, name: preview.name, reason: error.message }); }
    }
    return { applied, failed };
  } finally { pending = false; }
}
Hooks.once('ready', () => Object.defineProperty(game, 'genesysRecovery', { configurable: true, value: Object.freeze({ nightRestPreview, applyNightRest }) }));
