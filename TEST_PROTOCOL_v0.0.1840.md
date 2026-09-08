# v0.0.1840 — Heroic Live foundation

Source: Terrinoth Rule Audit v1.1 §7, including requirement for a two-point cost as one transaction. Existing setting rules determine costs and usage limits.

Automated: all tests/*.mjs. Two-point spend commits once; insufficient funds commits nothing. Reset preserves upgrades and Ability Points, clears uses and active duration, and rejects unconfirmed/non-authority calls.

Foundry QA:
1. GM Dock → Session → Heroic Abilities. Use a world character created with a Heroic Ability.
2. Check ability name, cost, used/total uses and available Ability Points against its character sheet/profile.
3. Leave reset checkbox unchecked and click reset: no change.
4. Confirm reset and apply: uses become 0 and active duration ends; upgrades and points remain unchanged. No Story Points are spent or refunded.
5. Secondary GM is read-only. Reload and confirm state persists.
6. Existing Story Point Spend buttons still transfer exactly one point.

Scope: overview/reset and multi-point payment foundation only. Activate button, coordinated actor/payment commit, player ownership routing, automatic duration and upgrade UI remain next steps. v1839 actual multi-client QA remains open.
