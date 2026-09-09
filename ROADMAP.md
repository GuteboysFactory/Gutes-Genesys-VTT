# Gutes Genesys VTT — Roadmap

Updated 2026-09-09. Published software: **v0.0.1889**, branch **qa**, commit `45f7f8552b55ebea7feaee40ff8ab71ec43d7897`.

The GM has accepted the core development as complete within the documented semiautomatic/manual boundaries. The next software delivery is **v1.0.0**, including **Report Bug / Request Feature**. There is no separate v0.0.1890 reporting patch. This roadmap update changes documentation only; 1.0 has not been implemented or published.

🟢 Delivered/accepted within scope · 🟡 Work started with remaining work · 🔴 Implementation not started. Deferred work is explicitly identified; green is not a claim of live testing or universal rule automation.

## Original roadmap blocks — current status

| Original block | Status | Current position |
|---|---|---|
| v1830–1839 GM Tools | 🟢 | Delivered and reconciled within documented rule boundaries |
| v1840–1847+ Heroic | 🟢 | Delivered with accepted manual exceptions |
| v185x Combat, reactions and magic | 🟢 | Delivered; tracked action economy, reactions and effect recovery |
| v186x Forge foundation | 🟢 | Delivered; template count does not imply complete book coverage |
| v187x Forge workflows | 🟢 | Delivered, including image drop and round tokens |
| v188x Setting, rules and content | 🟢 | Delivered source reconciliation and supported workflows; English Journals added in v1889 |
| Library ↔ Items ↔ Tome | 🟢 | Accepted by GM for release |
| v189x Release hardening | 🟡 | Remaining technical release checks are bundled into 1.0; live checks are deferred |
| v1.0 final delivery | 🟡 | Manual already delivered; reporting feature, upgrade/release documentation and technical sign-off remain |

The final-delivery block is now yellow because documentation work has begun and the manual exists. The new reporting feature itself remains red until implemented.

## Remaining in the single 1.0 delivery

| Work | Status | Completion criterion |
|---|---|---|
| Report Bug / Request Feature | 🔴 | Game Settings entry for GM and players; English report selection/form; prefilled GitHub issue with system/Foundry/browser information; user reviews and submits on GitHub |
| Reporting integration and documentation | 🔴 | GitHub report destinations/templates work; account requirement and screenshot attachment explained; no token stored in Foundry and no automatic campaign-content collection; focused tests and manual instructions included |
| Technical release checks | 🟡 | Check final manifest/module paths and packaging, upgrade/install preservation and relevant automated regression; fix concrete regressions; record any blocked checks explicitly |
| Upgrade and release documentation | 🟡 | Document supported upgrade baseline, backup/restore procedure, Journal/PDF setup, manual exceptions and known limitations; update English manual with reporting instructions |
| Public API and compatibility declaration | 🟡 | State supported integrations versus internal APIs, retain v13.351 target and identify v14 as unverified; do not certify untested behavior |
| Version and publication | 🔴 | Publish coherent v1.0.0 package/manifest and release notes after the above work; record technical release sign-off without calling deferred live checks passed |

This is the remainder of the original hardening/final-delivery blocks plus the explicitly approved reporting feature. It does not reopen finished gameplay blocks or require more NPCs, talents or automation for 1.0.

The old hardening headings also include accessibility, localization and performance. Their broad completion has not been established: review concrete release issues during technical closeout and record actual findings. English manuals/rules are the required language. A full translation expansion, interface redesign or measured browser-performance certification is not claimed complete or added as a new feature programme.

## World setup — not another code patch

🟡 The full Core and Realms of Terrinoth PDFs still need to be selected on the user's Foundry server, unless the GM has already done so. No confirmation has been received. v1889 supplies the native Journal PDF connection and 32 English overview/manual pages; it does not bundle the complete books. See the report for setup instructions.

## After 1.0 — maintenance and optional development

- Live follow-up and resulting bugfixes: Heroic requests/approval, Tome source opening, Journal/PDF rendering and ownership, multiplayer/reconnect/GM handover, larger encounters, extra activations with concentration and interrupted multi-target recovery. These checks are deferred by GM decision, not failed or certified as passed.
- Foundry v14 compatibility work and verification before declaring support.
- Review incoming GitHub reports when requested; analyze, prioritize and combine related fixes. Continuous monitoring is not configured.
- Possible Game Settings controls for less automation: **idea only, not yet specified or implemented**, and not part of 1.0.
- Small features, content and usability improvements driven by actual play. Earlier art/theme, assisted-content and Dice Forge ideas remain optional, with no new delivery commitment.

## Boundaries retained

- Defeated / Out of Fight / Dead remain GM decisions separate from wounds.
- Nemesis extras remain bounded per round; GM confirms the next round.
- Actions bind to current character values.
- Signature Weapon permanent/full attachment mechanics, full Unbowed reversal and narrative/external cases retain their accepted manual boundaries.
- Source text and source auditing do not mean every talent or NPC ability executes automatically.
- Preserve existing Forge, sheets, encounters and the original animated WebP.

## Evidence and history

- [Full remaining-work report](docs/REMAINING_WORK_AFTER_V1889.md)
- [v1889 Journals and targeted tests](docs/V1889_JOURNALS.md)
- [v1888 rule reconciliation and automation boundaries](docs/V1888_RULE_RECONCILIATION.md)
- [Historical roadmap through v1889](docs/ROADMAP_HISTORY_THROUGH_V1889.md)

Latest recorded verification: v1888 had **94 passing test files and one blocked Chromium-dependent file**; v1889 had **12 passing targeted files**, including a new Journal test. These counts overlap and must not be added. No new runtime tests were run for this documentation-only update.
