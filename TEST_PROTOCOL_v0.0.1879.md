# Combat/magic QA v0.0.1879

- Two unlinked copies of the same NPC: concentration lists only each caster's own spells.
- Player lacking ownership of a spell target: Concentrate stops before spending a maneuver; GM can handle it.
- Multiple clients: only active GM processes concentration expiration. Test normal/extra activation endings and changing scenes.
- One with Nature PC in GM Dock recovery: Survival option, GM wilderness confirmation. Cancel permits retry, successful recovery prevents a second roll. Disabled/absent talent rejected.
- Reaction selections remain limited to eligible IDs. Normal Parry/skip still work.

Automated checks passed; live Foundry testing pending. This build does not close the entire three-package plan.
