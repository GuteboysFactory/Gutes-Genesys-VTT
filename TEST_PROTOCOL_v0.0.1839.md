# v0.0.1839 — GM authority / reconnect

Automated: all tests/*.mjs and syntax/diff checks. Simulated authority handoff and persisted reload are not real multi-client browser tests.

Actual Foundry gate (pending):
1. Connect GM A and player B. Spend Story Points in A; B's counter should match immediately and stay read-only.
2. Connect GM C. Dock header names the controlling active GM. Secondary GM has read-only shared actions, while actor/Tracker links still work.
3. Disconnect controlling GM. Check control transfers to the remaining active GM; counter and Dock re-enable appropriately.
4. Reconnect A or return focus after another client changes state. Check pools, session, actor and encounter overview refresh correctly.
5. Reload all clients: persistent pools, session state and recovery receipts remain intact.
6. Demote a test GM to player: launcher disappears, Dock closes and mutations are rejected. Restore GM and verify launcher returns.
7. Regression: XP, session, nightly rest, encounter recovery, Side Slots/Popcorn and extra activation.

Scope: Dock mutation gates + Story Points service. Other direct system APIs retain their existing GM permissions. Authority is per active GM account; concurrent tabs logged into the same GM account are not covered by this patch's local queues.
