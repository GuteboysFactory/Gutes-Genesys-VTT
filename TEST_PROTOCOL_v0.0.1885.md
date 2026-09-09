# Genesys VTT v0.0.1885 — Combined Forge, rules and content QA

Baseline QA 81efafc7b592b541a6e21a5c6fc109f4e1a7ddc5 (v1884). Foundry target v13.351; v14 not verified.

## Implemented

**Fixed system image in Edit World.** While logged in as GM in Genesys, opening native WorldConfig sets Background Image to `systems/genesys-vtt/assets/system/forge-the-story.webp` and makes it read-only. The native Update World action persists the path. The binding checks app/system/GM, handles legacy jQuery and native elements, and repeats enforcement at submit. The world title, description, theme and other fields are not modified. Setup before loading the system does not load this hook; configure once through the in-world Edit World shown in the user's screenshot, then save. No server-side editing outside Foundry's native form and permissions. The original 192-frame WebP bytes remain unchanged. No audio/video.

**Painkillers / Healing Potions.** New GM Dock control records an already administered dose on a PC encounter participant. Core pp.116–117: 5/4/3/2/1 wounds, sixth and later zero; maneuver and engaged range/free hand are GM-confirmed. Core p.79 Painkiller Specialization: enabled native `core-talent:painkiller-specialization` on the PROVIDER adds rank to the first five doses; never makes dose six effective. Wounds capped at zero. No strain, critical or participant-status changes. Counter remains on patient across encounters; GM explicitly confirms a new rules day to reset. Inventory consumption, maneuver cost, calendar and exceptional eligibility remain manual. This is a recording workflow, not an automated consumable inventory engine.

Wounds and use counter save in one Actor update inside the authoritative Scene command queue. Revision rejects duplicate/stale submissions including old requests after reset. Chat failure does not revert the saved dose. Failed initial save does not claim recovery. Linked/unlinked Actors keep their existing identities. NPC patients and non-encounter treatment remain manual.

**Forge provenance.** New copied/saved custom templates preserve `adversaryRulesSource` separately from custom template identity. Fear and supported Forge abilities consult this provenance AND intact reference text. Renamed/customized copies retain eligible mechanics; removing the reference removes qualification. Existing sources/custom Items are not overwritten and lost legacy provenance is not inferred from names. Existing world sources and template copies retain their own identity.

**Content metadata.** Talent catalog distinguishes bounded runtime-supported recovery talents from catalog-only entries. This metadata is descriptive, not a grant of talents. Existing edited world Items are preserved; their earlier installed metadata is not silently replaced.

## Automated

74 test files PASS; one coordinator/browser test BLOCKED. Detailed outputs: docs/v1885-test-results.json. Tests cover fixed field and submit enforcement, unrelated-system isolation, diminishing healing, provider talent/disabled state, sixth dose, stale revisions/reset, save/chat failure, GM authority and custom-template rules provenance. Runtime/UI tests use simulation; live checks below remain pending.

## Live checklist

- [ ] Start updated Genesys world as GM. Open Edit World: fixed WebP path displayed, Background Image read-only. Press Update World, reopen and confirm stored path.
- [ ] Log out/reload join page: original animation runs. World title/description/theme preserved.
- [ ] Quick Forge still places round gold-framed tokens with separate portraits, no extra dialog.
- [ ] Save supported Terrifying NPC as custom template, rename, create a new NPC and check Fear recognition. Remove source reference and verify support is no longer inferred.
- [ ] Record dose one through six: 5/4/3/2/1/0; with provider rank 2: 7/6/5/4/3/0. Patient's own rank does not apply when another provider administers it.
- [ ] Counter persists across encounter changes; confirmed new-day reset affects only selected patient. Repeated/stale requests cannot apply twice.
- [ ] Confirm manually managed item, maneuver/range/free-hand and calendar handling is clear to GM.
- [ ] Existing First Aid, natural/encounter recovery, Fear, Heroic, Side Slots/Popcorn, Concentration/Renewal and native Library/Items/Tome regression.
- [ ] Multiplayer/reconnect/GM handover and larger encounters.

## Remaining original-roadmap gates

This combined delivery advances v186x–188x; it does not certify every rule. 197 recorded NPC reference occurrences remain manual, full Core/Terrinoth book/provenance comparison is open, and the Library ↔ native Items ↔ Tome live acceptance chain is not closed. Accepted manual Heroic exceptions remain. No v14 or v1.0 sign-off.
