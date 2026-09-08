# v0.0.1853 — Turn-start pulses

Live QA pending:
1. Activate Heroic before source's turn. Claim source turn, target allies/enemies within Short range, use Apply Turn Start and confirm.
2. Repeat click/reload: same targets must not change twice for that turn. Next source turn may affect them again while Heroic remains active.
3. Wrong actor's turn or Action/Maneuver already used: blocked. Activating during own turn permits activation pulse, not a retroactive turn-start pulse.
4. Change turn while confirmation is open: reject stale event.
5. Repeat in Side Slots and Popcorn, including linked/unlinked tokens.

GM explicitly selects targets and confirms range/side at each event. Turn start is checked against initiative owner and recorded action economy; unrecorded narrative actions cannot be detected. Existing activation handling unchanged. Full automatic prompts/target discovery remain pending.
