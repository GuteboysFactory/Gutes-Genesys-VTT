# v0.0.1841 — Heroic activation, coordinated payment and duration

Rule source: Terrinoth audit §7: multi-point cost, once/session allowance and end-of-next-owner-turn timing. Uses, costs and duration upgrades come from existing actor/profile state.

Automated: full tests/*.mjs. Includes insufficient points, actor-write failure, pool-write failure with rollback, persisted-journal recovery, use exhaustion, repeated completion and current-turn skip.

Foundry QA (pending):
1. With a world PC Heroic Ability and at least 2 Player Story Points, activate from sheet or Dock. Verify one cost transfer, one usage and active duration. Double clicks must not reactivate.
2. Set Player pool to 1 for a cost-2 ability: activation fails without changing pool or ability.
3. As owner/player choose Request Activation. Active GM reviews the whispered request and approves. A player cannot approve or directly activate.
4. Activate during the PC's own turn. End that turn: still active. End their next turn: expires (base duration). Repeat with activation outside their turn and with duration upgrades.
5. Test both Side Slots and Popcorn, plus Force End Turn. The skipped/current turn is keyed to encounter/round/activation/turn, not wall-clock time.
6. Reload: uses, pools, timing persist. After duration ends, exhausted session use still blocks activation. Confirmed GM reset restores uses without refunding points.
7. If an activation is interrupted between writes, Dock shows Recover Interrupted Activation. Recover restores pre-activation actor/timing; other pool mutations remain blocked while journal exists. Test fault handling only in a disposable QA world.
8. Regression: nightly rest, encounter recovery, XP and standard one-point Spend.

Scope and limits:
- Activation automates cost, usage and duration metadata. Apply primary/secondary effects with GM; effect automation and upgrade purchase UI remain future work.
- Separate Actor and Setting documents cannot share a native database transaction. A persisted journal + compensating rollback makes interrupted writes recoverable; do not call this a cross-document database-atomic transaction.
- Narrative play without tracked turns uses GM's existing reset to clear active duration; automatic timing requires the Encounter Tracker.
- Concurrent tabs using the same GM account and GM failover mid-write remain unverified. Native multi-client/crash tests are not implied by unit tests.
