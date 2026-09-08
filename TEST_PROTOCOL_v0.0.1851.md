# v0.0.1851 — GM-confirmed Heroic auras

Live QA pending:
1. Activate Heroic with Empower Allies. Source must have exactly one token on current scene.
2. GM targets allies within Short range, opens Actions > Heroic > Empower Allies Set Targets, and confirms side/range.
3. Target makes engine skill check or Combat weapon attack: one Boost from this source. Source itself is excluded.
4. Repeat for Diminish targeting enemies: one Setback.
5. Move source or target: modifier stops until GM confirms again. Source timing changes also require reconfirmation.
6. End Heroic: bonus stops. Empty target selection clears that source/effect's targets. Cancel preserves previous selection.
7. Verify player check with separate GM client on the same scene.

Range/side are GM-confirmed, not automatically measured. Raw pools/other roll paths remain outside this integration. No cross-scene effect. Multiple linked copies of the receiving actor share actor-based checks; GM must avoid ambiguous linked token placements.
