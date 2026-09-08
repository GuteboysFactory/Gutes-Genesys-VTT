# Combined packages 2 and 3 — v0.0.1880

## Delivered

All eleven Terrinoth primary Heroic abilities install as native actionTemplate Items in Items/Actions on the next active-GM world start. They can be copied through the existing Action Library. Use requires the character’s matching selected primary ability and delegates to the existing Heroic request/GM approval service. These Items do not grant abilities, AP, upgrades or bypass costs/session limits.

Upgrade installation uses a separate world marker, preserves existing documents and does not restore deleted standard actions. Stable source keys permit retry without duplicates. Legacy actions retain their skill-check binding. New characters do not automatically gain Heroic abilities.

## Core / Terrinoth implementation review

Compared the supplied Core audit v1.0 and Terrinoth audit v1.1 with existing coverage and relevant runtime tests. This is a bounded implementation review, not certification of every rule in either book.

| Area | Evidence / status |
|---|---|
| Native talent/equipment libraries | Existing catalog installation and talent-world-library regressions pass; Talents folder behavior retained |
| Heroic primary and secondary workflows | Existing primary, upgrade, activation, turn, pulse, aura and Renewal tests pass; new native shortcut eligibility test passes |
| Initiative and authority | Existing authority, write queue, transport and recovery tests pass in simulation |
| Concentration and reactions | Identity isolation and invalid reaction-choice tests pass |
| Recovery | Existing encounter receipts and recovery tests pass; One with Nature path retained |
| Narrative adjudication | GM decisions remain deliberate manual steps |
| Signature Weapon and Unbowed | Manual exceptions remain as detailed in HEROIC_PRIMARY_COVERAGE.md; native Items do not complete those mechanics |
| Other rulebook subsystems | Not newly certified by this release; baseline audits remain requirements, not proof of implementation |

## Tome compatibility

Reviewed AdventurersTome v1.1.9, commit 6c6105390d7f2aa9792b2fa929b9921b25923380. Its actual genesys-vtt generic adapter accepts native Items and reads notes. The contract test executes that adapter for talent, weapon, armor, gear and actionTemplate. Quick import retains source UUID and source opening uses fromUuid. No Tome patch is needed for this document contract.

Run: `node scripts/qa/tome-contract.mjs /path/to/AdventurersTome`.

## Stability results and limits

62 of 63 test files passed. The remaining browser test (ui-coordinator-v1812.cjs) could not launch because the Chromium executable is unavailable. The separate actual Tome adapter contract passed. Tests cover simulated authorization, duplicate/retry behavior and existing initiative transport; they are not live multiplayer or reconnect tests.

Before live acceptance: open an upgraded world as active GM, verify eleven Heroic Items without duplicated existing Actions, copy a matching and mismatching Heroic shortcut, exercise player request/GM approval, import/open an Item through Tome, and run two clients through reconnect and GM handover. Observe a large encounter for responsiveness. Foundry v14 and real browser performance are unverified. No measured browser-performance claim is made.
