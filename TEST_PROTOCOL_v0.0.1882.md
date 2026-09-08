# Genesys VTT v0.0.1882 — QA

Target: Foundry v13.351. v14 unverified. Based on QA commit 05d644d92a0655b615ffdba8c8db637f035dec7e (v1881).

## Implemented

- Supplied Forge the Story WebP: 1024 × 576, 192 frames, 11,668,742 bytes. Extracted from user ZIP without decoding/re-encoding. SHA-256: `cc13dbe09750b37e578e0dc368eb329404f5ce668a0f45ee2e300b4a4be920a9`. Local system description image; native Setup media points to the same original in QA. World Description is not seeded.
- Durable: active native `core-talent:durable` rank reduces the final incoming Critical Injury result by 10 per rank, minimum 01. Existing Criticals, Vicious, additional Critical activations and flat modifiers still combine. Chat shows Durable reduction. Uses current target rank; supplied modifier cannot override it. Disabled talents ignored; duplicate source items use the highest rank. Does not retrospectively modify existing injuries or automatically change encounter participation. Manual/raw/external rolls remain manual. Source: supplied Genesys Core Rulebook p.73, Durable.
- Flying Mount: removes exact obsolete Dodge 2 reference from shipped data and copied legacy Forge drafts. Generator corrected. Edited references and explicitly added native talents preserved; existing world Actors untouched. Source: [official Genesys FAQ/Errata v1.1](https://images-cdn.fantasyflightgames.com/filer_public/36/48/364883c8-3f06-4821-9126-f50e4bec36c9/genesys_faq_and_errata_v11.pdf), Terrinoth entry for Flying Mount (errata labels p.108; supplied book profile p.104).
- Media schema checked against [Foundry v13 PackageMediaData](https://foundryvtt.com/api/v13/interfaces/foundry.packages.types.PackageMediaData.html). Rendering/animation in Foundry has not been live verified.

## Automated checks

68 test files PASS; 1 BLOCKED (`ui-coordinator-v1812.cjs`: Chromium executable unavailable). Machine-readable results: docs/v1882-test-results.json. New tests cover Durable rank, combined penalties, minimum result, disabled/duplicate talents, target rank authority, and exact legacy errata correction without source mutation. Original asset verified byte-for-byte against ZIP. Separate contract test against actual AdventurersTome v1.1.9 adapter also PASS.

## Live checklist — all pending

- [ ] Update QA, confirm v0.0.1882; system information artwork animates and fits its panel. Check Setup artwork after refreshing metadata.
- [ ] Native Durable rank 2 reduces incoming Critical Injury result by 20 and chat shows deduction. Disable it and repeat.
- [ ] Create Flying Mount through Forge: no Dodge 2 reference; original portraits/stats and character sheet work.
- [ ] Recheck v1881 Concentration on base/extra activations, interrupted Renewal recovery and encounter recovery talents.
- [ ] Heroic installation, player request and GM approval; Tome import and source-document opening.
- [ ] Multiplayer, reconnect, GM handover and larger encounters.

## Still open

Terrifying/Fear workflow is not implemented by this patch (17 recorded NPC references). The updated inventory has 265 recorded clauses: 49 native baseline, 2 runtime additions from v1881 and 214 manual references; these are occurrences, not unique/full-book rules. Continue broader NPC/recovery-talent and Core/Terrinoth rule review. Accepted manual Heroic exceptions remain as previously documented. No live approval is claimed.
