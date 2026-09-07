# QA protocol — v0.0.1824 Encounter Tracker overhaul

## First impression

1. Update through the QA manifest and confirm `v0.0.1824`.
2. Open Encounter Tracker before starting an encounter.
3. Confirm the setup area, mode choice and participant rosters are clear at first glance.

## Core Side Slots

4. Add selected PC and NPC tokens and roll Cool/Vigilance from their sheets.
5. Start **Core Side Slots** and confirm the ordered slot track appears at the top.
6. Confirm the current slot is visually highlighted and completed slots fade back.
7. Claim a matching-side participant and confirm the focus panel changes from **Awaiting claim** to that Actor.
8. Use one Action and one or two Maneuvers, then end the turn.

## Participants and GM controls

9. Confirm PCs and hostile NPCs are separated into their own rosters.
10. Confirm player-facing health remains narrative while exact Wounds/Strain are inside **GM details & controls**.
11. Mark a participant Defeated, Out of Fight and Dead; confirm each state blocks normal activation and can be reactivated.
12. Confirm Open Sheet, GM Override, Mark Acted/Unacted and Remove still work.

## Nemesis and round end

13. Use a Nemesis with one Core Extra Activation and confirm its budget reads `0/2`, then `1/2`, then `2/2`.
14. Confirm **Use Extra** appears only when the extra activation is available.
15. Confirm the tracker pauses at End of Round and requires the GM to start the next round.

## Responsive regression

16. Resize the tracker narrower and confirm slots, focus controls, rosters and sidebar reflow without clipping.
17. Repeat a short Popcorn Initiative encounter and confirm the initiative winner starts before other eligible participants can claim.
