# Genesys VTT 0.0.14A — Foundry 13.351 QA

This is a foundation smoke test. Existing 0.0.13 combat, reactions and Encounter behavior should remain unchanged.

## Load test

1. Start a Genesys world and verify there are no red `genesys-vtt` console errors.
2. `game.genesysVtt.version` should report `0.0.14`.
3. `game.genesysRules` should exist with `rules` and `talents` APIs.
4. Existing Actors, weapons, initiative, Minion/Rival/Nemesis behavior and the current dev Parry flow should still work exactly as in verified 0.0.13.

## Talent Item foundation

Choose an Actor in the console, for example:

`const actor = game.actors.getName("YOUR ACTOR NAME")`

Grant Core Parry rank 2:

`await game.genesysRules.talents.grantCoreParry(actor, 2)`

Expected: an embedded Item named **Parry** with type `talent`, rank 2, tier 1, structured rule data and a 3 Strain cost. Inspect with:

`game.genesysRules.talents.collect(actor)`

Grant the Terrinoth Finesse fixture:

`await game.genesysRules.talents.grantTerrinothFinesse(actor)`

Expected: an embedded **Finesse** Talent whose Rule Element is optional, applies before check construction, matches Brawl/Melee (Light), and specifies Agility as the check characteristic override.

## Domain checks

Inspect lifecycle/rule evaluation:

`game.genesysRules.talents.debug(actor, { timing: "pre-soak", tags: ["combat", "attack:melee", "hit", "target:wielding-melee-weapon"] })`

Inspect current usage records:

`game.genesysRules.talents.usage(actor)`

Start a new rules-session scope:

`await game.genesysRules.talents.startNewSession()`

The next 0.0.14 substep will connect these Rule Elements to live check construction and combat reaction prompts. Do not expect Parry/Finesse Talent Items to replace the old live automation in 0.0.14A yet.
