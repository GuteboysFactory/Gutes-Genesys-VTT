# v0.0.1838 — End-of-encounter strain recovery

Source: Core Rule Audit §11.3 (previously inspected): Simple Cool/Discipline, one strain per Success. Recovery talents require GM review; bonus input is explicit rather than automatically inferred.

Automated: all tests/*.mjs; syntax and diff checks. Tests include zero successes, persistent receipts, no Advantage auto-healing, permission checks, repeat requests and chat failure.

Foundry QA:
1. Update to 1838. Start and end a short Tracker encounter with a PC suffering strain. Old pre-patch ended encounters have no recovery ID.
2. Dock → Session → End-of-Encounter Strain Recovery. Choose Cool, then Roll & Recover. Check the chat result and strain reduction agree.
3. Repeat with Discipline on another PC. Verify a Simple check (zero base difficulty), with existing condition modifiers.
4. Verify a zero-success roll is still completed. Reload and confirm another roll for that participant is blocked.
5. Start/end a new encounter: recovery is available again. Test an unlinked PC token; its synthetic actor is updated.
6. Try a GM-approved talent bonus. Only strain changes; wounds, conditions, criticals and encounter status remain unchanged.
7. Secondary GM and player mutation attempts are rejected; active GM can use recovery. Verify second-client updates and reconnect in Foundry.
8. Regression: Story Points, full-night rest, Party XP, Side Slots, Popcorn and extra activation.

Limits: automatic talent detection/alternate recovery skills remain pending. The GM chooses lawful bonuses. Runtime multi-client QA is not claimed by unit tests.
