# v0.0.1834 — Spend buttons and Session lifecycle

Automated: run all tests/*.mjs, syntax checks and git diff --check.

Foundry QA:
1. Check version 0.0.1834. Counter shows a distinct Spend button below each pool; drag still works and position survives reload.
2. As GM spend from either pool. Verify one point moves to the opposite pool; empty pools and pending actions disable spending.
3. As player verify visible pool values and disabled Spend controls. Check live sync from a second client.
4. GM Dock → Session: Start Session increments number once. Rapid repeat clicks must not increment again.
5. Reload: status and number persist. End Session records end; starting again increments number.
6. Verify history shows the last transitions and actor XP, wounds, Story Points and Heroic state remain unchanged by session start/end.
7. A secondary GM receives an active-GM notification; the active GM controls session transitions. Check reconnect/authority handoff.
8. Review narrow Dock layout, existing Party XP and Encounter shortcuts.

Scope: session tracking and manual reminders. Automated recovery and Heroic resets remain future work.
