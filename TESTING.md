# Genesys VTT 0.0.13 — Foundry 13.351 Live Test

## Regression
1. Existing PC combat, token-aware targets, reactions, Criticals and Encounter Tracker still work.
2. Console contains no red `genesys-vtt` errors.

## Minion group
1. Create an Actor and set Role = **Minion**.
2. Set Group Size = 4 and Member Wound Threshold = 5.
3. Verify Combined WT = 20, Members Remaining = 4, Casualties = 0.
4. Mark **Melee** as a Group Skill. It should show Rank 3. A non-listed skill should show Rank 0.
5. Roll Melee and verify the pool uses Rank 3.
6. Set Wounds to 6. Verify one casualty, 3 remaining, and Melee group rank falls to 2.
7. Apply strain/Stun Damage to the group; it must increase Wounds, not Strain.
8. Inflict/activate a Critical against the group; it should remove one minion through group wounds and should not add a normal Critical Injury row.

## Rival
1. Set Role = **Rival**.
2. Apply Stun Damage / strain. It must increase Wounds; the separate Strain track is not used for damage.
3. Rival Critical Injuries remain normal. Crossing WT defeats the Rival but does not create the PC/Nemesis automatic threshold Critical.

## Nemesis
1. Set Role = **Nemesis**.
2. Stun Damage must increase Strain, not Wounds.
3. Wounds/Strain threshold behavior and Criticals should remain PC-like.
4. Existing bounded Nemesis Extra Activation behavior from 0.0.12-4 must still work.

## Console helpers
```js
game.genesysVtt.adversaries.normalizeMinionGroup({
  members: 4, memberWoundThreshold: 5, wounds: 6, groupSkillIds: ["melee"]
})
```
Expected: combined WT 20, casualties 1, remaining 3.

```js
game.genesysVtt.adversaries.minionSkillRank({
  members: 4, memberWoundThreshold: 5, wounds: 6, groupSkillIds: ["melee"]
}, "melee")
```
Expected: `2`.
