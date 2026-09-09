# v0.0.1889 — Rules & Equipment and English Journals

## Delivered

The GM Dock button targeted `genesys-gm-rules`, but the handler rejected it because `rules` was absent from its section allowlist. The existing section now navigates using the same scroll behavior as other Dock sections.

Three native JournalEntries install on active-GM startup under **Genesys · Rules & Manual**:

- **Genesys · Core Rules**: 9 English overview pages.
- **Genesys · Realms of Terrinoth Rules**: 7 English overview pages.
- **Gutes Genesys VTT · User Manual**: 16 English workflow pages.

All new Journal content, titles, Dock shortcuts and PDF setting labels/help are English, as requested. The manual covers setup, PDF connection, character ownership, native libraries/Tome, image drop/Forge, encounters, checks, Story Points/XP, Heroic, magic/concentration, recovery, consumables, environment, crafting, repairs, modifications, mounts, runes, social encounters and troubleshooting. It distinguishes automatic, guided and manual handling.

## Full books: one-time world configuration required

The text pages are original overviews, **not the complete Core or Terrinoth books**. Full commercial PDFs are not distributed in this public repository.

As active GM, open **Game Settings → Configure Settings → Genesys VTT**. For **Core Rules · Journal PDF** and **Realms of Terrinoth · Journal PDF**, use the file picker to upload/select your respective book in Foundry File Storage and save. Each Journal then gains **Full Rulebook · PDF**, using Foundry's native PDF page. This cannot be configured on the user's remote Foundry server from this repository workspace. No claim is made that the actual world already has either PDF installed.

Changing a setting updates that book's managed PDF page. Clearing it removes the managed page, without deleting the server file or text overview. An invalid PDF setting reports an error without preventing the remaining books from installing. Journal permissions do not protect the underlying uploaded file URL.

## Installation and ownership

Only the active GM installs or synchronizes. Stable identity flags identify the folder, books and pages. Concurrent requests in the same client share one pending installation. Completed writes remain discoverable after interruption; retry creates only missing documents/pages. Existing text, names and ownership are preserved. Deleted standard pages may be restored on subsequent installation/opening. New books default to Observer access; the GM may change permissions. Player opening respects Journal ownership.

## Verification

12 targeted test files pass; individual results are in `v1889-test-results.json`. The new test executes installation with Foundry document doubles, injects a partial failure, verifies retry/concurrent idempotence and preservation, exercises PDF create/update/remove and invalid paths, checks writer/reader permission paths, and executes the actual navigation handler against DOM geometry doubles. It also rejects Swedish characters in the authored Journal data.

Existing selected regressions cover GM Dock navigation, shell, authority, encounter, XP/Story Points, recovery, launcher, Heroic controls, Forge drop, round tokens and world background. This is a targeted patch verification, not a rerun of all v1888 tests. Module syntax and manifest module paths are checked. The original animated WebP is unchanged.

No live Foundry session, browser PDF rendering or multi-client handover was performed. The previous Chromium blocker remains; no browser pass is claimed. Foundry v14 remains unverified.

## Live follow-up

1. Upgrade a backed-up v1888 world and log in as active GM. Click Rules & Equipment; verify scrolling and all three Journal shortcuts.
2. Verify the three books and 32 English text pages. Restart and check for duplicate entries.
3. Select the two uploaded PDFs in settings, save and read each PDF page. Change one path and ensure the other book is unaffected.
4. Open a shared Journal as a player, then test a restricted Journal. Check real file availability and PDF rendering separately.
5. Edit a text page and ownership; restart and verify preservation.

API reference: [Foundry v13 JournalEntryPage](https://foundryvtt.com/api/v13/classes/foundry.documents.JournalEntryPage.html). The native document contract is not a substitute for live rendering verification.
