# Genesys VTT v0.0.1884 — Combined QA

Baseline QA 96da9bed44ee2f4e61857705e721609550da4406 (v1883). Target Foundry v13.351; v14 unverified.

## Delivered

Quick Forge now renders a separate 512×512 PNG token through the existing Portrait & Token Forge renderer: circular crop, gold frame, transparent outer area, centered image. Actor portrait keeps the original uploaded image; a supplied animated portrait remains original, but the generated token is a single rendered frame. No extra dialog, unchanged drop coordinates and template selection. Existing Actors/tokens are not mass-migrated; use their existing Portrait & Token Forge when desired. Failed token-art generation stops Actor creation rather than silently producing square tokens.

The existing system-info animated WebP is ready to use as the native world login background, without conversion or duplicate asset. In Setup → Edit World → Background Image enter:

`systems/genesys-vtt/assets/system/forge-the-story.webp`

Save the world and reopen its join page. GM Dock → Campaign overview has a button to copy this path. This is an administrator configuration step, not an automatically installed background: join pages cannot be assumed to load system styles/scripts. No ineffective CSS override, world-description seeding, theme switching, video or audio is included.

Medical Care / First Aid is a new GM Dock workflow for PC participants in a tracked active or ended encounter. Choose a medic and patient, confirm equipment and GM timing/action-cost/special-rule handling, then roll Medicine using current medic values. Core p.116 difficulty: wounds ≤ half threshold Easy, > half through threshold Average, above threshold Hard; self-care +2 and missing medical equipment +1. Successful net successes heal wounds, net advantages on success heal strain. Failed checks also consume the once-per-patient-per-encounter attempt. Result and both health values persist in one Actor update under the existing authoritative Scene queue. Saved result blocks retry after chat failure. Initial failed save has no durable result.

GM still handles action spending, Triumph/Threat/Despair, special healing talents and exceptional eligibility. No automatic Critical Injury treatment or status change. Painkillers and NPC-patient healing are outside this slice. This is a bounded Core recovery addition within the original content roadmap, not full medical-rule completion.

## Automated evidence

72 test files PASS, one BLOCKED (`ui-coordinator-v1812.cjs`, browser launch unavailable). See docs/v1884-test-results.json. New tests cover medical difficulty boundaries, self/equipment modifiers, successful/failed healing, receipt protection, GM authority and shared circular token renderer/upload. Quick Forge regression verifies separate portrait and token paths. Token rendering calls are simulated; actual pixel appearance and Foundry behavior require live QA.

Original animated asset SHA256: cc13dbe09750b37e578e0dc368eb329404f5ce668a0f45ee2e300b4a4be920a9; 192 frames, 1024×576; unchanged from v1882.

## Live checklist — pending

- [ ] Install v1884 and start as active GM. Drop image on token layer, select template: round gold token, original portrait, no extra dialogs.
- [ ] Portrait/landscape crops, scene pan/zoom, PNG/JPEG/WebP and animated portrait. Open ordinary Token Forge and compare appearance.
- [ ] Token-generation/upload failure creates no new Actor; existing sources unchanged.
- [ ] Set the native background path above; reload join page, verify animation and readable login controls. World Description and theme remain as configured.
- [ ] First Aid at exactly half, above half and above threshold; test self-care and missing equipment.
- [ ] Failed roll consumes attempt; failed chat after saving does not permit another roll. GM resolves action cost and special outcomes.
- [ ] Repeat patient treatment in same encounter blocked; new encounter allows treatment.
- [ ] Existing Forge/encounter/Heroic/Fear/recovery regression, reconnect/GM handover and larger encounters.

Prior live approval applies only to reported v1883 quick Forge behavior. No new live approval or v14 compatibility is claimed.
