# v0.0.1855 — Renewal GM resolution

Published scope: GM button on Actions → Heroic, Cool/Vigilance choice, encounter PC slot and saved-roll retry. Side Slots only. No extra activation is granted. Resolve immediately after activating Heroic. Use a new activation after updating; older active Heroics lack encounter identity.

## Manual Foundry QA

1. Start Side Slots with at least two PCs and one NPC; configure Renewal and activate Heroic as active GM.
2. On Actions, click Renewal · Resolve Activation / Retry; choose Cool. Verify one Renewal PC slot in Encounter Tracker and unchanged activation allowances.
3. Click again: no second slot or roll. Check Vigilance with a separate activation; Cancel must make no change.
4. Finish all turns, including Nemesis extras if configured. Confirm End of Round is reachable and the slot remains next round. Reload and check persistence.
5. Edit/remove Renewal's source participant: slot remains until encounter end. End encounter: slot disappears.
6. Popcorn must reject this button; ordinary Popcorn turns still work.

Automated: 34 test files pass, including mocked scene-write failure followed by retry with one roll. Live QA is pending. Initial actor-save failures and simultaneous GM-browser writes are not an atomic transaction. Next: remaining Heroic integration and concurrent-write hardening.
