# Genesys VTT 0.0.13

Foundry VTT v13.351+ development build for the Genesys rules engine.

## Milestone: Minion / Rival / Nemesis Rules

0.0.13 builds the audited adversary-role behavior on top of the token-aware combat and Encounter foundations.

- **Minion groups** have Group Size, per-member Wound Threshold, derived combined Wound Threshold, persistent defeated-member/casualty state, and remaining members.
- **Minion group skills** are selected as `Group Skill`; their rank is derived from remaining members (`members - 1`). Non-listed skills are untrained.
- **Minions and Rivals** do not track strain as a separate damage resource; incoming strain is converted to wounds.
- **Nemeses** track strain normally and retain PC-like Critical behavior.
- **Minion Criticals** remove one minion by adding one member WT + 1 wounds to the shared group track rather than creating a persistent Critical Injury row.
- **Minion area/multi-target foundation** applies soak separately per affected member before adding residual wounds to the shared group track.
- Encounter Tracker exposes Minion members remaining to the GM.

The current sheets remain mechanics-first development surfaces. Final adversary sheet layout, health bars, compendium NPC content, Actions, Talents, and result-spending polish are later work.
