# 0.0.1813 — Character Sheet and Portrait/Token Polish QA

Baseline: verified 0.0.1812 stability patch.

## Character Sheet
- Open an existing PC and an NPC without lockup.
- Confirm the six Characteristics form a compact centered row on desktop.
- Resize below 980 px and 620 px; confirm the row becomes 3 and 2 columns.
- Confirm labels read Wounds Taken and Strain Taken.
- Edit both current values and confirm they persist after rerender/reopen.

## Portrait & Token Forge
- Open Forge from an Actor and from Character Creator.
- Load a portrait-oriented and a landscape image.
- Drag the portrait; confirm the token does not move.
- Drag the token; confirm the portrait does not move.
- Ctrl-wheel each preview; confirm zoom is independent.
- Confirm Reset Portrait and Reset Token affect only their own preview.
- Confirm the portrait export preserves a useful source aspect ratio rather than forcing a square.
- Save & Apply; confirm Actor portrait and Prototype Token use their respective crops.
- If selected, confirm placed tokens update.

## Regression
- Character Creator opens and advances.
- Character sheet tabs and Actions still work.
- Magic action can be rolled.
- No console errors or client lockup.
