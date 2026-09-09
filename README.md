# Genesys VTT — QA v0.0.1888

Foundry target: v13.351. v14 remains unverified.

Combined delivery completes the three selected roadmap blocks: GM Tools; Combat, reactions and magic; Setting, rules and content. Includes source reconciliation, recovery/consumables, action economy and critical lifecycle, two-weapon combat, crafting/alchemy, mounted rules, equipment modifications and runebound shards.

- [Current roadmap](ROADMAP.md)
- [Implementation, source evidence and automation boundaries](docs/V1888_RULE_RECONCILIATION.md)
- [QA results and deferred live protocol](TEST_PROTOCOL_v0.0.1888.md)
- [Individual audit requirements](docs/v1888-audit-requirements.json)

94 automated test files pass; one Chromium test is blocked. Live verification is deferred after 1.0 by GM decision. Native references and GM-resolved special/narrative rules are documented; this is not a claim that every published ability is automatically executed.

The notes below describe the earlier rule-engine foundation.

# Genesys VTT 0.0.14 — Talents & Rule Elements

Foundry VTT v13.351+ development build for the Genesys rules engine.

## 0.0.14A — Rule Engine Foundation

This first 0.0.14 step establishes the data and domain contracts before wiring talents into live check/combat automation.

- Adds `talent` as a first-class Item type with tier, rank/ranked, activation, source metadata, tags, notes, and structured Rule Elements.
- Adds generic Rule Element predicates, data predicates, costs, timing windows, and usage scopes (`hit`, `check`, `turn`, `round`, `encounter`, `session`).
- Adds reusable check-modifier conversion primitives for dice add/remove, upgrade/downgrade, difficulty changes, and characteristic/skill overrides.
- Adds actor Talent collection plus usage/lifecycle state stored through generic actor flags and scene/session scope keys.
- Adds development fixtures for Core Parry and Terrinoth Finesse as actual Talent Items.
- Exposes the foundation through `game.genesysRules` for deterministic live QA without replacing the verified 0.0.13 combat/reaction flow yet.

Automatic Talent-driven reaction/check integration is deliberately deferred to the next 0.0.14 substep after this foundation loads cleanly in Foundry.

## Baseline

`main` remains the verified 0.0.13 Minion/Rival/Nemesis + Encounter baseline until 0.0.14 is live-tested and approved.
