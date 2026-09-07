# Genesys VTT 0.0.1817 Test Protocol

## Install and stability

1. Update through the existing `qa` manifest.
2. Confirm the character sheet footer reports `v0.0.1817`.
3. Open and close an existing character twice.

Expected: Foundry remains responsive and all verified 0.0.1816 behavior remains intact.

## Existing Actor portrait

1. Open an existing character with a portrait-oriented source image.
2. Open **Portrait & Token Forge**.
3. Confirm **Actor Portrait** now has a square preview.
4. Drag and zoom until the square portrait looks correct.
5. Leave the Prototype Token at a visibly different crop and click **Save & Apply**.

Expected: the sheet portrait matches the square Forge preview. The token keeps its own independent circular crop.

## New Character portrait

1. Open **Character Creator** and start a new character.
2. Open the Forge from the Identity step and choose a tall image.
3. Position and zoom the square Actor Portrait separately from the round token.
4. Click **Use in Wizard**, finish the character, and open its sheet.

Expected: the new character's portrait matches the Forge preview without unexpected scaling or a different crop. The Actor directory thumbnail uses the same saved portrait.

## Regression

- Reopen the Forge and adjust the portrait a second time.
- Confirm the new crop replaces the Actor portrait.
- Confirm Prototype Token and placed-token update behavior still work.
- Open Character Creator Talents and verify **View explanation** remains functional.

Expected: portrait changes remain repeatable and no new console errors appear.
