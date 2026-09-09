# QA v0.0.1888

Combined approved delivery: original GM Tools, Combat/reactions/magic, and Setting/rules/content blocks. Base commit: `2e2ccfeaecee637d5c77355afa10beab3df27fec` on `qa`.

## Executed checks

- **94 test files PASS**; **1 file BLOCKED**, `tests/ui-coordinator-v1812.cjs`, because the configured Chromium executable is absent. Attempted browser download returned HTTP 502/timeouts. The blocked test is not counted as passed.
- New tests cover crafting consumption/output retry, consumable inventory/day/turn state, paid maneuver recovery, mounts/attachments, encumbrance/defense, social/archetype rules, Story Point reservation/finalization/cancellation, secondary-hit quality budgets/Parry/threshold-critical recovery, Critical Injury lifecycle, rune activation/expiry and source/FAQ contracts.
- Existing concentration/Renewal/initiative-authority, medical/recovery, Heroic, Forge/drop/round-token, native library and background-field tests remain in the regression set.
- Three source scripts pass against the supplied Terrinoth PDF: census, positioned statistics, skills/weapons/quality/reference reconciliation. Reports are committed under `docs/terrinoth-*-v1888.json`.
- Result records: `docs/v1888-test-results.json`. Source/audit dispositions: `docs/V1888_RULE_RECONCILIATION.md` and `docs/v1888-audit-requirements.json`.

These are automated domain/service tests, including actual service code with document and authority mocks. They are not live Foundry playtesting.

## Deferred live checks — after 1.0 by GM decision

1. Update a backed-up v13.351 world; open GM Dock → Rules & Equipment and the character sheet. Confirm existing Forge image drop, round framed tokens, encounters and original animated WebP.
2. Start a session with disconnected players included in the confirmed count. Resolve player/GM Story Point checks and an Impossible check; reopen a saved check before/after resolution.
3. Exercise two-weapon attacks, Parry per hit, a secondary Critical Injury, Sunder and repair. Confirm NPC/source corrections on a new Forge copy; existing owned Actors must remain unchanged.
4. Use stamina and Speed potions with an extra-activation Nemesis; confirm caps, costs, three-turn expiry and GM day reset. Exercise a mounted pair and an incapacitated mount.
5. Craft/brew/gather with success/failure and both positive/negative spends. Retry interrupted material/output and multiple-target rune/critical workflows without paying or applying a saved step twice.
6. Heroic player request/GM approval, source import/opening in Tome, multiplayer/reconnect/GM handover, large encounters and browser performance.
7. Foundry v14 compatibility remains unverified and belongs to existing release-hardening work; it is not inferred from v13 tests.

## Preserved decisions

- Wounds and participant Defeated / Out of Fight / Dead remain separate; GM decides status.
- Nemesis extras remain a bounded per-round allowance, normally two total activations; GM confirms the next round.
- Templates and activated rune weapons use current actor values, not frozen pools.
- Existing user-edited Items/Actors are not replaced with corrected source catalog entries automatically.
- Accepted Heroic manual exceptions and explicit GM narrative/special-rule boundaries remain documented.

Original artwork checksum, unchanged: `cc13dbe09750b37e578e0dc368eb329404f5ce668a0f45ee2e300b4a4be920a9`.
