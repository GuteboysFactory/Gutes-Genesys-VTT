# Genesys VTT 0.0.1814 Test Protocol

## Install

Update the system from the existing `qa` manifest and confirm that the character sheet footer reports `v0.0.1814`.

## Character sheet stability

1. Open an existing character from the Actors directory.
2. Confirm that the sheet opens normally and Foundry remains responsive.
3. Close and reopen the same character twice.

Expected: no lockup, repeated render loop, or console error.

## Portrait

1. Inspect the portrait in the character-sheet header.
2. Open Portrait & Token Forge and apply a portrait crop.
3. Reopen the sheet.

Expected: the sheet portrait and its frame are square. The prototype token remains round, and the portrait crop remains independent from the token crop.

## Actions and Dice Tools

1. Open the Actions tab at the normal sheet width.
2. Confirm that Combat Actions, Custom Actions, Talent Actions, and General Actions occupy the main area.
3. Confirm that Dice Tools is a collapsed panel in the right-hand column.
4. Expand and collapse Dice Tools several times.
5. While expanded, add dice, clear the pool, make a roll, and open Advanced Check Setup.

Expected: Dice Tools expands inside its own column and never overlays or hides the Actions content. All controls remain usable.

## Responsive layout

1. Narrow the character-sheet window below approximately 860 px.
2. Expand and collapse Dice Tools.
3. Widen the sheet again.

Expected: Dice Tools and Actions stack vertically at narrow width, return to side-by-side layout when widened, and never overlap.

## Regression

- Create, edit, and delete a Custom Action.
- Roll a weapon action.
- Open each character-sheet tab.
- If the actor has magic, compose and roll a magic action.

Expected: existing 0.0.1813 behavior remains unchanged and the browser console shows no new errors.
