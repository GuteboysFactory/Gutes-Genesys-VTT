# v0.0.1854 — Renewal slot foundation

No Renewal button yet. Domain-only foundation; no automatic slot insertion in ordinary gameplay.

Automated tests: addRenewalSlot survives normalization/round reset; repeated activation id is ignored; active actor/slot/action state preserved; used PC cannot act again; unusable extra slot skipped; end encounter clears slots; Popcorn insertion rejected. Existing regressions also pass.

Foundry regression QA: ordinary Side Slots and Popcorn claim/end/next-round; Nemesis extra completion. Existing behavior should remain intact without Renewal slots.

Next: Cool/Vigilance choice and persisted roll integration; insertion/participant-removal and round-start eligibility edge cases before enabling gameplay. No full Renewal support claimed.
