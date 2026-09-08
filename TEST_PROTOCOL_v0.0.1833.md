# TEST PROTOCOL — v0.0.1833

## Automated

- Run the complete `tests/*.mjs` suite.
- Confirm manifest version and module registration.
- Confirm Party XP uses the authoritative Advancement service and ledger metadata.
- Confirm the counter is fixed, draggable through requestAnimationFrame and client-positioned.

## Foundry QA

1. Sign in as GM. Confirm the Story Point counter starts near the lower-right chat area and shows separate Player and GM pools.
2. Drag it rapidly and confirm it follows smoothly, remains inside the viewport and restores its position after reload.
3. Spend from each non-empty pool and confirm the counter, GM Dock and chat update.
4. Sign in as a player. Confirm both pools remain visible, but spending is read-only.
5. Open GM Dock → XP Control. Award XP to a selected subset with a note.
6. Confirm only selected characters receive XP, their sheets update, the note appears in each XP Ledger, and one summary appears in chat.
7. Repeat after reconnect and with a narrow GM Dock window.
