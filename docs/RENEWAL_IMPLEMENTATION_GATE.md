# Renewal implementation gate

Status: v0.0.1855 adds GM Side Slots resolution, saved-roll retry and participant/round edge handling. Earlier blockers below are historical. Live Foundry QA and concurrent-client write hardening remain open.

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

## v0.0.1855 scope and limitations

GM uses the Actions button immediately after a new Heroic activation. Timing is GM-confirmed, not automatically prompted. Popcorn is rejected. Existing activations without encounter identity are handled manually.

The roll is saved on the actor before inserting the scene slot. Retrying a failed scene write reuses that saved result, including after reload. If the initial actor save itself fails, the roll has not been durably recorded; do not claim an atomic cross-document transaction. A local lock blocks duplicate clicks; simultaneous writes from separate GM browser sessions still need hardening. No chat announcement yet; result notification and Encounter Tracker slot provide feedback.

Automated tests cover saved retry, cancellation, GM/encounter guards, unchanged allowances, source removal, preserved active slot and round eligibility. Live Foundry QA remains pending.


## v0.0.1856 follow-up

A successful activation now prompts Renewal in active Side Slots. The manual button shares the same prompt and retry path. Slot success is posted to chat, with a warning if posting fails; chat failures do not undo gameplay. Concurrent browser writes remain open. Live prompt/chat QA pending.

## v0.0.1881 follow-up

Renewal execution now uses the authoritative scene command queue, including Actor roll persistence and slot insertion. Choice is collected before enqueue; the activation and active GM are revalidated. Simulations cover concurrent requests, saved-roll retry and a GM handover after the Actor save. Existing saved-result and no-extra-turn semantics remain. Same-account concurrent GM tabs and actual Foundry handover/reconnect remain unverified. See PACKAGE_4_QA.md.
