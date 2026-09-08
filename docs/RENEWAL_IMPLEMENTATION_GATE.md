# Renewal implementation gate

Status: v0.0.1854 adds domain slot persistence/insertion and completion skipping. Gameplay UI, roll transaction, participant-management edge cases and Popcorn semantics remain pending. The blockers below describe the pre-v0.0.1854 baseline.

## Rule

Supplied Realms of Terrinoth, printed p.79: on activation, an optional Cool or Vigilance roll generates a new PC initiative slot. It is immediately available, persists for the encounter, and grants no extra PC turns.

## Confirmed blockers in current code

- normalizeStoredSlots requires stored slot count to equal buildInitiativeSlots(entries). Adding a slot directly is discarded on normalization.
- normalizeInitiativeState explicitly reconstructs state, dropping any unrecognized extra-slot field.
- Side Slots completion advances by slot index, not remaining legal actor eligibility. An additional PC slot can become unclaimable after PCs have used their base activations.
- Popcorn chooses participants rather than side slots; adding an entry would incorrectly create participation/activation semantics and must not be used as a shortcut.
- Inserting a sorted slot before the current index must not move the currently claimed turn or erase completed state.

## Required implementation

1. Model encounter-scoped additional slots separately from participant entries and activation entitlements. Store roll result, stable slot ID and activation source ID.
2. Normalize/persist these slots, preserve current claim by slot ID, and carry them through round resets. Clear them on encounter end/reset.
3. Define mid-round insertion: new result visible immediately without replaying completed turns or interrupting current claim; rank normally in following rounds.
4. Advance past slots without an eligible actor while retaining the explicit End-of-Round stop and existing extra-activation handling.
5. Add GM Cool/Vigilance choice during activation resolution. Persist roll and inserted-slot marker together in scene state; retry must not reroll or add another slot.
6. Specify Popcorn behavior explicitly before exposing the action in that mode. Do not invent extra turns.

## Required tests before publishing gameplay

- Slot survives normalize → save → reload and next-round reset.
- Activation entitlement count and used flags remain unchanged.
- PC who already acted cannot claim again because of Renewal.
- Insertion before/after active slot preserves current actor, action economy and completed slots.
- No deadlock when extra PC slot lacks an eligible participant.
- Repeated activation resolution is idempotent; failed scene save has a reviewable retry path.
- Encounter end/reset clears added slots; participant removal does not leave invalid references.
- Side Slots, Popcorn, Nemesis extras and explicit End of Round regression.

No new Renewal UI or gameplay is published by this audit. No live QA claim.
