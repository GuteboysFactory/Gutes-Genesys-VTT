# QA v0.0.1886 — Combined recovery, combat/magic and content corrections

Target: Foundry 13.351. Baseline v1885. Original animated WebP unchanged.

Automated: 76 test files pass; ui-coordinator-v1812.cjs is blocked because its Chromium executable is unavailable. Detailed output: docs/v1886-test-results.json. Simulation is not live Foundry verification.

## New behavior and checks

- GM Dock → Critical Recovery: severity-based Medicine, self/equipment difficulty; full-week Resilience; GM-confirmed campaign-week label.
- Repeated weekly attempts rejected, including failed checks. Natural failure heals one wound. Injury, linked conditions and receipt save together. Failed save/chat and GM authority covered.
- Head Ringer, Fearsome Wound, Agonizing Wound, Compromised, Blinded affect supported skill/weapon/magic pools; resolved characteristic, suppression, healed/inactive gating tested. Magic regression preserves positive pool modifiers.
- Manual injury removal is a single injury/condition update; unrelated conditions remain.
- Intact Dimora source creates Durable 2; edited reference and duplicates preserve existing behavior.

## Deferred live follow-up after 1.0, per GM decision

- Open the new dialog, cancel it, try both methods, self treatment and unavailable equipment. Keep the same campaign-week label and verify repeat attempts are blocked after reload.
- Confirm healing removes only the selected injury's conditions; permanent characteristics and defeated/dead status stay GM-managed.
- Check actual pools for the five persistent injuries, then heal/suppress and recheck. Do not double-enter those penalties manually.
- Create a Dimora from Forge and from an intact copied template; inspect Durable and resolve a Critical Injury. Preserve the approved image-drop and round token flow.
- Existing multiplayer, reconnect, GM handover, interrupted multi-target updates, Heroic and Tome checks remain post-1.0 follow-up, not claimed passed.

Full rulebook coverage is not certified. See docs/V1886_COMBINED_RULE_REVIEW.md for remaining implementation limits.
