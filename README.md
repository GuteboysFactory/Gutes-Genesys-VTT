# Genesys VTT — QA v0.0.1883

Foundry target: v13.351. v14 remains unverified.

Current delivery: image-drop quick Forge, GM Dock feedback, guided Terrifying checks, Survival group recovery, import identity preservation and Action source permission hardening.

- [v1883 scope and QA](TEST_PROTOCOL_v0.0.1883.md)
- [Roadmap/content gate evidence](docs/V1883_CONTENT_GATE.md)
- [Current roadmap](ROADMAP.md)
- [Package 4 scope and test report](docs/PACKAGE_4_QA.md)
- [Combined live QA protocol](TEST_PROTOCOL_v0.0.1881.md)

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
