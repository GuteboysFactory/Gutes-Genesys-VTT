# v0.0.1847 — Rejuvenation activation

Source: supplied Realms of Terrinoth, printed p.79. Rejuvenation heals 2 strain on activation AND at each owner turn start while active. This patch automates activation only.

Live Foundry QA pending:
1. PC with Rejuvenation, 5 strain and enough Story Points: activate Heroic. Strain becomes 3, normal Story cost/usage applies, chat states actual recovery.
2. With only 1 strain, activation reduces it to 0 (never negative).
3. Without Rejuvenation, activation does not change strain.
4. Failed/insufficient-point activation must not heal. Reload verifies saved values.
5. Recover 2 strain manually at each owner turn start while active until the next lifecycle patch.

Automated activation regression covers Strain restoration on final pool-save failure and recovery floor; existing tests cover activation failure and journal recovery. Other effects remain manual.
