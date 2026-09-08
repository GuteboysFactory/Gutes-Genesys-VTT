# Heroic primary coverage — consolidated QA v0.0.1863

Source: supplied Realms of Terrinoth, printed pp.74–79. All eleven primary effects now have a shared GM resolution panel and tier-specific guidance, available from Actions and GM Dock. This is a consolidated workflow build, **not a claim that all effects are fully automated**. Live Foundry QA remains pending.

| Primary | Implemented in this build | GM handling / remaining automation |
|---|---|---|
| All the Facts | One recorded fact per owner turn; related-check upgrade prompt in constructed skill, weapon and magic rolls; Supreme temporary-point ledger with spend and session reset | GM supplies information and resolves the chosen temporary SP benefit. Ledger spending does not itself upgrade a roll or pay another ability |
| Connected | Favor approval before payment; cancel costs no SP/use; Improved social difficulty downgrade in constructed skill checks; recorded relationship | Supreme redirect is agreed before attack resolution and the GM changes the target; no interception of an already resolving attack |
| Foretelling | Round-keyed question journal; one related reroll per activation in constructed skill/weapon/magic rolls; Supreme identical-pool copy, saved before result choice, retry without reroll | GM answers truthfully and enters the exact NPC pool. GM applies the chosen NPC result before resolving its consequences |
| Hard to Kill | +4 soak all tiers; Improved/Supreme incoming difficulty in standard weapon and targeted magic attacks; Supreme damage zero in those paths and explicitly damage-tagged direct application | Arbitrary macros, external modules and direct sheet edits bypass these services. Stored sheet soak is unchanged; do not add +4 manually to supported attacks |
| Influential | Single-check social Success bonus; guided social strain calculation and application, critical remark budget; Supreme target reduction in this social workflow | GM verifies the check, unspent Advantage and social context. Other sources of social strain and external spend UIs are not automatically synchronized |
| Miraculous Recovery | Transactional activation wound healing, rollback/recovery journal; start-of-owner-turn healing once per round; Supreme selected activation-time Critical Injury and its linked conditions removed together | GM selects the injury via Primary Resolve. Healing does not reverse permanent characteristic losses. Turn automation requires tracked initiative |
| Paragon | Validated chosen skill; post-roll Difficulty selection, Improved additional Setback, Supreme Challenge alternative; recalculated cancellation; constructed skill, standard weapon and resolved magic paths | Raw rolls/macros outside these entry points do not prompt. Existing dice presentation can show the original dice before the final adjusted result |
| Sixth Sense | Configured entity type and tier-specific communication/information workflow with activation journal | GM supplies encounter/session/campaign information; no invented automatic narrative answers |
| Signature Weapon | Bound owned weapon and owned temporary attachment; active temporary attachment qualities in standard weapon attack preparation; original Item stays unchanged | **Permanent profile, craftsmanship, Improved choice, Supreme +2 HP/free attachment, and non-quality attachment mechanics still need Item editing by GM.** Not fully automated |
| Unbowed | Base injury selection limited to activation-time injuries; selected/all-tier critical-count suppression; linked condition-rule suppression; Supreme Dead ignored by initiative eligibility only while active | **Other pre-existing Critical Injury effects, permanent characteristic changes and already applied consequences are not automatically reversed/suppressed.** Wound/strain thresholds still apply |
| Unleash | Base one maneuver per round on owner turn; Improved incidental; Supreme activation multi-target defeat; GM-confirmed Short range; per-target save journal; retry without another maneuver after a target-save failure | GM targets the eligible minions and confirms range. Interrupted maneuver-save reconciliation remains manual; error blocks automatic retry in ambiguous state |

## Secondary effects

- Actions and Dock expose only selected effects; custom descriptions remain available.
- Existing Empowered, aura selection, Drain, Rejuvenation, Rejuvenate Allies and Renewal workflows retained.
- Devastating also adds +2 to the resolved magic attack hit.
- Range/side confirmation for auras and pulses remains GM-driven. Renewal outside Side Slots remains manual.
- This build does not implement arbitrary custom-effect code execution.

## Remaining work before marking Heroic complete

1. Signature Weapon permanent upgrades and complete attachment rule execution.
2. Unbowed suppression across every Critical Injury consumer, including characteristic effects.
3. Shared result/spend integration for all raw/custom/external roll paths; social spending and temporary SP benefits currently require GM handling.
4. Live Foundry regression for the combined build. No live success is inferred from older user confirmations.

Session reset clears temporary points from the corresponding source character. Reset every source character at session end. All the Facts points may be spent after the ability expires, until that reset.
