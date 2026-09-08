# Package 4 — v0.0.1881

Baseline: remote qa v0.0.1880, f89237c7b07e533f33de6e1be829f1b381665edf. Target Foundry v13.351; v14 unverified. The user approved this combined block after the current QA/code review. No live approval of v1880 or this build is inferred.

## Implemented

### Concentration and interruption recovery

Concentrate requests now execute on the active GM through the existing authenticated native-message transport and scene command queue. The caster must be owned by the requester and have the active turn. Players no longer need write access to every target. Normal maneuver eligibility and bounded activation allowances still apply.

The maneuver and a target-work journal are persisted in one Scene.update. Target changes follow, then the journal is marked complete. Retrying Concentrate in that turn reuses the saved payment and completes outstanding target work. A lost response/reload does not require another maneuver. Missing/deleted targets or effects are not recreated. If a target effect has been independently edited, the operation stops and identifies that effect for GM review rather than replacing the edit.

Effect expiry runs inside the encounter queue before saving turn advancement or encounter end/reset. A target write failure blocks that transition until retried. The GM's existing interrupted-turn panel identifies pending Concentration work; retry Concentrate to keep the turn open, or Complete Interrupted Turn/End Turn to finish and advance. No local updateScene cache is required for this path.

A cast survives the casting activation. Concentrate on a later owner activation extends it; an unsustained effect expires at the end of that activation, including a Nemesis extra activation. Round confirmation and the existing two-activation allowance are unchanged. World and synthetic Actor identities remain distinct; work is bound to the requested scene and encounter.

This is resumable multi-document work, not all-or-nothing rollback. Successfully updated targets remain updated while an interrupted operation awaits retry. It handles writes made by this version's encounter APIs; raw external scene/Actor mutations are not intercepted. Same-account simultaneous GM browser sessions remain unsupported. Requests are not automatically replayed after reconnect; review saved state and retry explicitly.

### Renewal

The GM chooses Cool/Vigilance before entering the scene queue. Roll generation, saved-roll reuse and slot insertion then run under the same authoritative command path as other encounter commands. The activation identity is checked again. Concurrent requests serialize; stale revisions are rejected. GM authority is checked after awaited steps. A saved Actor roll remains reusable after a failed scene save or a GM handover.

Renewal still grants an extra PC slot, never extra participant activation rights. Side Slots only; Popcorn/outside-encounter resolution remains manual. A failure before the initial roll is saved has no durable roll to reuse. Simulations are not evidence of live reconnect or simultaneous same-account GM support.

### Recovery talents

- Desperate Recovery: enabled native talent, strictly more than half the current strain threshold before recovery, adds 2 strain recovery even if the check produces zero successes. Both individual and batch calls use the same calculation. The optional GM bonus now means *other* bonus, avoiding manual double counting.
- One with Nature: existing individual Survival option and GM wilderness confirmation retained. Batch remains Cool/Discipline; it does not silently substitute Survival.
- Apothecary: GM selects a native world-Actor caregiver and confirms care for selected patients. Natural rest heals 1 + twice enabled talent rank, capped at current wounds, and clears strain. Rank/enabled state and patient health are rechecked before writes. A source/rank receipt is included in the natural-rest record. No automatic assumption about who received care.
- Second Wind: the existing active Talent UI and rule evaluation remain; authoritative execution now saves strain healing and usage in the same Actor update. An extra activation cannot grant another once-per-encounter use. Chat failure does not undo recovery or usage.

Other Medicine/potion/Surgeon/Painkiller Specialization modifiers are separate triggers and are not added to natural or end-of-encounter healing. No unverified "Rapid Recovery" rule is imported from another game. Rest remains explicit per selected set; no in-game day/calendar tracker is added.

### NPC abilities and Forge

The 101-template library is preserved. Opening Forge from an intact reviewed Ogre or Orc Spiritspeaker source adds a selectable native Talent to the draft:

- Ogre Regeneration: heals 3 wounds at each tracked activation start, with health and per-activation receipt in one Actor update. Works on a synthetic token Actor, ignores disabled Talent, and does not change participation/death status. A failed start write can be retried on the next encounter command without healing twice.
- Orc Spiritspeaker Second Wind 5: native active Talent, uses the existing Actions talent controls and the authoritative once-per-encounter recovery path.

Existing source compendiums and existing world NPC Actors are not automatically modified. Create a new NPC through Forge to obtain the reviewed support, or deliberately copy the supported native Talent. Renaming an arbitrary Actor does not grant an ability; intact source identity and matching reference text are required for draft enrichment. Existing embedded talents, including edits/disabled state, are preserved. Unchecking the added Talent leaves that mechanic manual.

`npc-ability-coverage.json` inventories 266 recorded talent/ability/spell clauses across the existing 79 Terrinoth source templates: 49 native-baseline clauses, 2 newly supported clauses, 215 manual references. These are clause occurrences, not unique abilities or a claim of full book coverage. Existing native-baseline entries identify Adversary, Parry and Silhouette. Only newly automated clauses were rechecked against the PDF in this package. Printed totals must not receive duplicate passive bonuses.

## Rule evidence

Supplied Sources were used, not third-party summaries:

- Genesys Core Rule Audit, Foundry Implementation Baseline v1.0: requirements and authority boundaries.
- Realms of Terrinoth Rule Audit, Foundry Integration Baseline v1.1: setting integration requirements.
- Supplied Core Rulebook: printed p.73 Desperate Recovery; p.74 One with Nature/Second Wind; p.218 Concentrate. Concentrate text explicitly uses the next *turn*, not next round.
- Supplied Realms of Terrinoth: printed p.84 Apothecary; p.202 Ogre Regeneration and Orc Spiritspeaker Second Wind 5. PDF pages are one higher than printed page numbers. Relevant pages were extracted and visually checked.

Audits remain requirements, not implementation certificates. This package performs a focused rule check, not the outstanding full Core/Terrinoth audit.

## Verification

See the final automated result summary below and the version-specific live protocol. New behavioral coverage includes partial target save/reload retry, actual scene payment boundary, extra activations, saved-roll handover, strict recovery thresholds, caregiver edits, source isolation and atomic Second Wind/regeneration usage. Existing Forge, encounter, library and Heroic regressions are rerun.

The actual Tome v1.1.9 adapter contract also passes. No Tome change is included. Real Foundry import/open remains a live gate.

Chromium installation was attempted but failed with timeouts/HTTP 502. The real-browser coordinator test remains blocked; no performance or browser-layout claim is made.

## Remaining live gates and accepted manual scope

Run TEST_PROTOCOL_v0.0.1881.md in Foundry v13.351: upgrade installation, Heroic requests/approval, Tome import/open, concentration with linked/unlinked targets and extra turns, recovery talents, NPC abilities, two clients, reconnect, GM handover, and a larger encounter. v14 remains unverified.

Signature Weapon permanent upgrades/full attachments, comprehensive Unbowed Critical Injury reversal and narrative/raw/external spend paths remain the user's accepted manual scope. The 215 inventory clauses marked manual are not described as automated. Independent full-book verification remains future work.

## Final automated result summary

- 67 of 68 test files passed. The remaining `ui-coordinator-v1812.cjs` is blocked before execution by missing Chromium.
- Five new behavioral test files cover package 4. The existing Forge fixture includes the real ability-enrichment dependency; the legacy Concentration identity test now expects authenticated GM dispatch rather than direct player target writes.
- Separate actual Tome v1.1.9 adapter contract passed.
- All 25 changed/new JavaScript files passed Node syntax validation.
- The optional Handlebars compilation check could not run because that dependency is unavailable. Template layout is included in live QA, not certified here.
- Machine-readable results: `docs/package-4-test-results.json`.
- Live Foundry, multiplayer/reconnect, real performance and v14: not run/unverified.
