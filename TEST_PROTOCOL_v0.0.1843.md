# v0.0.1843 — Heroic advancement

Automated: upgrade purchases, costs, cancellation, insufficient AP, XP preservation, failed saves, stale preview, activation lock and GM authority; existing regression suite.

Foundry QA (not executed in a live world here):
1. Open Actions > Heroic Ability > Advancement. Verify available AP against earned XP and prior AP spending.
2. As active GM, select Duration and review the cost/change. Cancel: no change. Purchase: AP decreases, duration increases; XP stays unchanged.
3. Try Frequency, Power and Story with sufficient AP. Story cannot be purchased twice; insufficient AP must produce no changes.
4. Reload and verify the upgrade persists. Player can see AP but cannot purchase.
5. Try upgrading an active Heroic Ability: it must be blocked.
6. Activate an upgraded ability and verify duration, uses and Story cost in the existing flow.

Power effects still require GM resolution. Secondary Effect selection is pending. Purchase audit is saved in the actor's heroicUpgradeHistory flag; no history UI yet. Concurrent tabs logged into the same GM account are not a supported concurrency guarantee.
