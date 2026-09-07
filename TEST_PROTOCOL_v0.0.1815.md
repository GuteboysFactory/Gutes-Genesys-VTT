# Genesys VTT 0.0.1815 Test Protocol

## Install and stability

1. Update from the existing `qa` manifest.
2. Confirm the character sheet footer reports `v0.0.1815`.
3. Open and close an existing character twice.

Expected: Foundry remains responsive and all verified 0.0.1814 sheet behavior remains intact.

## Custom Archetype / Species

1. Open **Actors → Character Creator → New Character**.
2. Enter a name and continue to **Archetype / Species**.
3. Expand **Create Custom Archetype / Species**.
4. Enter a custom name and change several Characteristics, Starting XP, Wound Base, Strain Base, Silhouette, and Defense values.
5. Select one or more Starting Skill Grants and optionally enter a Special Ability.
6. Click **Use Custom Archetype** and continue.

Expected: the Starting XP header updates, Characteristics begin at the selected values, derived Wounds/Strain/Defense/Silhouette are correct, and granted skills appear without an XP charge.

## Custom Career

1. Expand **Create Custom Career**.
2. Enter a custom Career name.
3. Select exactly eight Career Skills.
4. Attempt to select a ninth skill.
5. Click **Use Custom Career** and continue to Skills.

Expected: the ninth selection is rejected. The eight selected skills are marked Career, and the wizard requires exactly four free Career Skill ranks before paid skill purchases.

## Save, resume, and finalize

1. Save the draft after selecting the custom Archetype and Career.
2. Close the wizard and resume the saved draft.
3. Confirm all custom fields and selected skills remain.
4. Complete the wizard and create the character.
5. Open the resulting character sheet.

Expected: the custom Archetype and Career names appear on the sheet; Starting XP, Characteristics, thresholds, Defense, Silhouette, Career Skills, free ranks, and purchased ranks match the wizard.

## Regression

- Create another character using a bundled Archetype and Career.
- Confirm standard Characteristic, Skill, Talent, Heroic Ability, Story, and Equipment steps still work.
- Open Actions and expand Dice Tools.

Expected: standard creation remains unchanged, Dice Tools does not overlap Actions, and no new console errors appear.
