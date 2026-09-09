# QA v0.0.1887

Baseline QA v1886. Target Foundry 13.351; no v14 claim. Scope: GM recovery expansion, Winded, native NPC magic rules and inventory evidence.

## Automated

79 test files PASS, one BLOCKED (ui-coordinator-v1812.cjs: Chromium executable missing). Outputs: docs/v1887-test-results.json.

New tests use the actual Forge conversion, native magic preparation, skill engine and medical functions. They cover all 11 reviewed profile occurrences, source edits and duplicates, innate difficulty floors/damage, live Knowledge (Forbidden) rank, PC/NPC/Minion access boundaries, free-effect choice and implement overlap. Recovery tests cover Rival wounds without strain creation, Surgeon on failed checks and disabled rank, named episodes outside encounters, per-patient concurrent calls, stale painkiller revisions, dead/minion rejection and critical/condition removal. Winded tests cover voluntary costs, paid/free reactions and Unbowed/healed state.

## Deferred live follow-up — after 1.0 by GM decision

- Talent Library → Install catalog as Items: Surgeon appears in Items/Talents, existing edited talents are preserved. Copy Surgeon to a medic, check failed and successful First Aid.
- GM First Aid: PC/Rival/Nemesis during encounter and outside it; reuse the same recovery-episode label, verify duplicate attempt rejection. Rival strain stays unchanged.
- Healing potions and Critical Recovery: select a world/token individual outside encounter; confirm existing daily/week receipts persist on reload. Minion casualty handling and participant status stay GM-controlled.
- Create/copy the listed NPC profiles through Forge. Test Arcana casting, Dark Insight rank, Aenlong/Vampiric floors, Necromancer's free effects and Storm Sorceress's first-effect dropdown. Inspect Challenge dice in preview.
- With Winded active, try a paid reaction and standard casting; then heal or suppress the injury. Zero-cost options remain legal.
- Regression: approved image-drop Forge flow, round tokens, character sheets, bounded Nemesis activations, explicit next-round confirmation, Concentration/Renewal, Heroic and Tome. Animated WebP remains byte-identical.

No live check above is claimed passed. Full rule coverage remains open; see docs/V1887_RULE_CONTENT_REVIEW.md.
