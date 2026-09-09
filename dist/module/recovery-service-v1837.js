import {apothecaryCare, talentRank} from './recovery-talents-v1881.js';
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
export function listApothecaries() {
  return Array.from(game.actors?.contents ?? game.actors?.values?.() ?? []).filter(a=>a.type==='character' && talentRank(a,'terrinoth-talent:apothecary')>0).map(a=>({id:a.id,name:String(a.name),bonus:apothecaryCare(a).bonus}));
}
export function carePreview(id) { const actor=game.actors.get(id); if(!actor)throw Error('Caregiver unavailable.'); return apothecaryCare(actor); }
export function nightRestPreview(actor, care = null) {
  if (actor?.type !== 'character' || !['pc','rival','nemesis'].includes(actor?.system?.role)) throw new Error('Select an individual PC, Rival or Nemesis for natural rest.');
  const dead = (actor.system.criticalInjuries ?? []).some(row => row.active !== false && row.healed !== true && (Number(row.total) >= 151 || String(row.name).toLowerCase() === 'dead'));
  if (dead) throw new Error('Natural rest cannot revive a dead character.');
  const before = { wounds: amount(actor.system.wounds?.value), strain: amount(actor.system.strain?.value) };
  return { id: actor.id, name: String(actor.name ?? 'Character'), before, after: { wounds: Math.max(0, before.wounds - 1 - (care?.bonus ?? 0)), strain: 0 } };
}
export async function applyNightRest(rows, confirmed, care = null) {
  requireGm();
  if (confirmed !== true) throw new Error('Confirm a full night of rest first.');
  if (pending) throw new Error('Recovery is already in progress.');
  if (!Array.isArray(rows) || !rows.length) throw new Error('Select at least one character.');
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Duplicate character selection.');
  const validateCare=()=>{
    if(!care)return null;
    const latest=carePreview(care.caregiverId);
    if(latest.rank!==care.rank || latest.bonus!==care.bonus)throw Error('Apothecary changed. Review care again.');
    return latest;
  };
  validateCare();
  pending = true;
  const applied = [], failed = [];
  try {
    // Validate every preview before applying any part of the batch.
    const prepared = rows.map(row => {
      const actor = game.actors.get(row.id);
      const preview = nightRestPreview(actor, validateCare());
      if (preview.before.wounds !== row.wounds || preview.before.strain !== row.strain) throw new Error(`${preview.name}: values changed. Review the refreshed preview.`);
      return { actor, preview };
    });
    for (const { actor, preview } of prepared) {
      try {
        requireGm();
        const latest = nightRestPreview(actor, validateCare());
        if (latest.before.wounds !== preview.before.wounds || latest.before.strain !== preview.before.strain) throw new Error('Values changed during recovery; review this character.');
        await actor.update({
          'system.wounds.value': preview.after.wounds,
          'system.strain.value': preview.after.strain,
          [`flags.${SYSTEM_ID}.lastNaturalRest`]: { ...preview, timestamp: Date.now(), userId: game.user.id, kind: 'full-night', care: validateCare() }
        });
        applied.push(preview);
      } catch (error) { failed.push({ id: actor.id, name: preview.name, reason: error.message }); }
    }
    return { applied, failed };
  } finally { pending = false; }
}
Hooks.once('ready', () => Object.defineProperty(game, 'genesysRecovery', { configurable: true, value: Object.freeze({ nightRestPreview, applyNightRest, listApothecaries, carePreview }) }));
