# Test Protocol — v0.0.1832 Story Points Live

## Launcher regression

1. Update the QA system and confirm `0.0.1832`.
2. Drag the GM Dock launcher quickly in circles and across the screen.
3. Confirm it follows the pointer without the previous trailing feeling.
4. Release it, reload Foundry, and confirm its position remains saved.

## Story Point pools

5. Open GM Dock and confirm the Story Points panel shows Player and GM pools.
6. Use + and − to set both opening pools; confirm neither pool can go below zero.
7. Spend one Player point and confirm Player decreases by one while GM increases by one.
8. Spend one GM point and confirm GM decreases by one while Player increases by one.
9. Confirm Spend is disabled for an empty pool.
10. Double-click Spend rapidly and confirm only valid available points are transferred without errors.

## Synchronization and history

11. Keep a second GM/client connected and confirm pool values update there after a change.
12. Confirm Spend operations appear in chat with before/after values.
13. Confirm Recent Activity records time, action and both pool transitions.
14. Reload the world and confirm pools and history persist.
15. Log in as a player and confirm the GM Dock launcher is hidden and console calls attempting to change pools are rejected.

## Regression

16. Open Encounter Tracker from GM Dock and run one activation.
17. Open an Actor and Character Creator from GM Dock.
18. Confirm no new console errors appear.
