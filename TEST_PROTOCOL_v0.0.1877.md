# v0.0.1877 — Actions library end-to-end QA

1. Start world as active GM. Items → Actions contains Assist, Maneuver, Custom Check. Reload: no duplicates.
2. Rename/edit a default and move it to another folder. Action Library → Install missing defaults preserves it. Delete one default and explicitly reinstall: only the missing default returns.
3. Action Library → choose world Assist → Add to character. Use → cancel: no maneuver spent. Confirm in an eligible encounter turn: exactly one maneuver spent. GM resolves assistance bonus manually.
4. Add Maneuver and Custom Check. Maneuver uses normal turn limits; Custom Check opens Dice Tools without spending an action.
5. Create a skill-check template with valid Skill ID and difficulty. Add to character; Use rolls current actor values. Change actor rank and repeat: new values apply. Activation costs remain manual.
6. Edit copied action name/notes, reload and Use: behavior retained. Source remains unchanged. Delete copy: source remains.
7. Repeat copy/use from a visible Item Compendium. Private sources stay inaccessible. Verify as player with actor ownership; no install/create-source controls for player.
8. Older custom actions still edit; Use requests a Skill ID if blank. No console errors.

Automated checks cover schema, source permissions, installer idempotence/preservation/retry, legacy normalization and live runtime routing. Foundry UI/encounter behavior requires live QA.
