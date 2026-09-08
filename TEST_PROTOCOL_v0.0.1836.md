# v0.0.1836 — GM Dock live encounter overview

Automated: all tests/*.mjs plus syntax and diff checks.

Foundry QA:
1. Open Dock → Encounter in a scene with no participants. Select two tokens and Add Selected Tokens. Verify 0/0 manual initiative entries in Tracker. Repeat: no duplicates.
2. Start Core Side Slots. Confirm Dock round, current actor and activation source match Tracker.
3. Open Active Character and roster entries, including unlinked tokens: correct token actor sheet opens.
4. Complete turns, use a Nemesis extra activation and reach End of Round. Verify counters exclude participants marked out, retain extra allowances, and show the round-end reminder.
5. Mark Defeated, Out of Fight and Dead in Tracker. Verify labels and counts in Dock. Wound totals must not be used to infer death.
6. Repeat overview checks in Popcorn mode. Add Selected Tokens during active/ended encounter should direct GM to Tracker.
7. Switch viewed scenes and reload: Dock reflects the current scene. Check second GM receives live state changes.
8. Check narrow layout, scrolling, existing Story Points, Session controls and Party XP.

This patch does not change initiative rules or add automatic recovery. Full multi-client QA remains open.
