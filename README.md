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
