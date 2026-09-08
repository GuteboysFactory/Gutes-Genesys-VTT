# Genesys VTT v0.0.1883 — Combined QA

Target Foundry v13.351. All live checks below are pending.

## Automated

70 test files PASS, one browser test BLOCKED by missing Chromium. Actual Tome adapter contract PASS. Detailed outputs: docs/v1883-test-results.json. Changed JavaScript syntax checked. Original v1882 animated asset unchanged.

## Fire feedback and fast Forge

- [ ] GM Dock overview starts collapsed and can be expanded; main controls remain usable.
- [ ] On token layer, drop a local PNG/JPEG/WebP: local preview and focused template search appear. Choose a template: one private native NPC Actor and visible unlinked token at drop point, original image retained.
- [ ] No Place NPC or Add to encounter confirmation. No automatic encounter participant added. Ordinary Forge still supports edit/review; Actors are available for normal Foundry dragging.
- [ ] Shift-drop and Tile-layer image drop retain Foundry behavior. Player/secondary GM cannot trigger quick Forge.
- [ ] Cancel search: no saved placeholder Actor/token. Double drop/click does not duplicate creation. Change scene/GM or fail upload/Actor/token save: clear error and no unrelated deletion.
- [ ] Try pan/zoom, portrait/landscape/animated WebP, map edges and first-use library installation. Measure time to create; 2–10 seconds is the target, not verified performance.
- [ ] Export/import a template package twice; second import preserves local edits and adds no repeated source identities. Existing unmarked legacy imports are not automatically consolidated.

## Fear and recovery

- [ ] Add supported Terrifying NPCs and PCs to a started encounter. GM Dock Fear shows correct source difficulty and Specter/Dwarf exception.
- [ ] Choose two applicable sources: roll Discipline against highest difficulty only. Confirm circumstances; check result and saved receipt.
- [ ] Repeat or simulate failed chat after save: no second roll. A failed initial Actor save is reported; no durable roll is claimed.
- [ ] Exempt Dwarves from Specter by resolving eligible groups separately. Apply narrative outcomes through GM judgment/health controls.
- [ ] Group Survival recovery: one wilderness confirmation, each PC needs enabled One with Nature; ineligible PC reported without rolling. Desperate Recovery still automatic when eligible.

## Content gate and regression

- [ ] Native equipment, talent, Action and Heroic source: create/edit via Foundry and Library; reload/delete/reimport; verify source identity, independent Actor copies and player/GM access.
- [ ] Revoke Action compendium visibility while opening/copying; source access is rejected.
- [ ] Tome import and source-document opening for supported native categories.
- [ ] Existing Forge, character sheets, Side Slots/Popcorn, bounded Nemesis extras and GM-confirmed next round.
- [ ] Heroic cost/usage/request/approval, Concentration with extra activations and interrupted multi-target saves, Renewal saved-roll recovery.
- [ ] Two clients, reconnect, GM handover and larger encounter performance. v14 is a later compatibility gate.

Scope and open roadmap items: docs/V1883_CONTENT_GATE.md. No full book or live acceptance claim.
