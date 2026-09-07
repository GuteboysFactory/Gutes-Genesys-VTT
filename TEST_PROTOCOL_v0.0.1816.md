# Genesys VTT 0.0.1816 Test Protocol

## Install and stability

1. Update from the existing `qa` manifest.
2. Confirm the character sheet footer reports `v0.0.1816`.
3. Open and close an existing character twice.

Expected: Foundry remains responsive and the verified 0.0.1815 behavior remains intact.

## Talent explanations in Character Creator

1. Open **Actors → Character Creator → New Character**.
2. Select an Archetype and Career, then continue to **Talents**.
3. Expand **View explanation** on several Talents from different tiers.
4. Compare their descriptions with the same Talents in **Talent Library** on an existing character.

Expected: both interfaces show the same explanation. The wizard also shows Activation, Source, Requirements, and Automation without purchasing the Talent.

## Purchase behavior

1. Expand and collapse several explanations.
2. Confirm this does not spend XP or add a Talent.
3. Use **Add** on a legal Talent.
4. Expand a blocked Talent and inspect its reason.
5. Remove the selected Talent again.

Expected: only **Add** purchases a Talent. Tier, XP cost, Talent Pyramid validation, ranked progression, removal, and available XP behave as before.

## Regression

- Complete a character with a bundled Archetype/Career.
- Save and resume a draft using a Custom Archetype/Career.
- Open Actions and expand Dice Tools on the resulting sheet.

Expected: creation, draft persistence, sheet opening, and the contained Dice Tools layout remain unchanged, with no new console errors.
