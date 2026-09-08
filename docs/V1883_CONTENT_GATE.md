# v1883 — Original roadmap and content gate evidence

Baseline QA: 34a7e555e1595bf186a73540e3ab1de8e347ef08, v1882. Target v13.351. This is a bounded implementation review, not full book certification.

| Original area | Evidence/current behavior | Remaining gate |
|---|---|---|
| GM Tools backlog | Health/critical overview already exists; One with Nature now offered in batch recovery with common wilderness confirmation and per-Actor eligibility. Desperate Recovery/Apothecary/Second Wind retained. | Other healing triggers need separate rule review; live batch behavior. |
| v185x combat/magic | Existing action economy, bounded extras, Concentration journal and Renewal authority unchanged; regression suite passes. Fear dispatch joins existing GM-authoritative Scene queue. | Live interrupted writes, multi-client/reconnect/GM handover; same-account concurrent GM tabs unsupported. |
| v186x/v187x Forge | Existing templates/authoring/export/clone/placement retained. Fast image drop reuses source copy and stat validation. Import now preserves previously imported identities. | Live drag/drop, upload errors, permissions and token layout. Assets referenced by JSON packages must already exist. |
| v188x content | 17 intact Terrifying profiles use guided checks. Inventory: 265 occurrences, 49 native baseline, 2 v1881 runtime entries, 17 GM-guided, 197 manual references. | Full book/provenance review and remaining setting-specific optional rules; counts are not unique abilities or book coverage. |
| Equipment | Native equipment installation, world Item listing/editor and separate Actor copies already implemented; existing tests pass. | Live create/edit/reimport/delete/permissions through both UIs and Tome. |
| Talents | Native Items/Talents, world/visible Compendium sources, stable source identity and independent copies; existing tests pass. | Same live acceptance matrix. |
| Actions | Native actionTemplate Items, current-value Actor binding and source permission validation. v1883 rechecks compendium access after awaited lookup. | Same live matrix; Actor action copies are actor-owned action data, not shared source Items. |
| Heroic | Native actionTemplate shortcuts delegate to actor-selected ability; no free abilities/upgrades. | Live matching/mismatching source, player request and GM approval. Heroic actor state is not a standalone Item. |
| Custom content | Native supported Item types retain edits. Custom Heroic secondary effects remain actor-owned narrative data. | Custom arbitrary types are not certified; no universal two-way integration claim. |
| Tome | Actual v1.1.9 adapter, commit 6c6105390d7f2aa9792b2fa929b9921b25923380, contract passes for native notes and supported types. No Tome patch. | Actual Foundry import, source links and opening documents. |

## Source evidence and bounds

Terrifying definitions use existing identified Terrinoth templates and intact reference text. Referenced printed pages: 152, 163, 164, 165, 167, 181, 191, 195, 196, 214, 216, 226, 228, 229, 231, 238. Supplied PDF text was checked at the profile pages/continuations. Core pp.243–244 supplies Discipline fear checks and GM consequence guidance. Specter exempts Dwarves. The panel requires GM confirmation that selected sources apply to every selected PC; resolve exempt groups separately. No inferred immunity from an Actor name.

Fear receipts cover one encounter-start Terrifying check per Actor/encounter, not arbitrary later changes in circumstances. Later narrative fear and unsupported/custom sources remain manual. Initial failed Actor save has no durable result and retry may reroll. Successful save plus failed chat cannot reroll. A batch is sequential partial progress, not cross-Actor rollback.

Drop follows [Foundry v13 Canvas coordinate conversion](https://foundryvtt.com/api/v13/classes/foundry.canvas.Canvas.html#canvasCoordinatesFromClient). Preview is local DOM, not a new PIXI layer or persistent placeholder Actor. Source Actor and original image bytes are preserved. Upload may leave an unused image if later Actor/token creation fails; no arbitrary file deletion. Lost GM authority may leave the newly created Actor for the new GM to review. No 2–10 second performance guarantee without live measurement. Local PNG/JPEG/WebP file drop is supported; remote browser-image URLs are not fetched.

Import identity uses declared source ID, or content hash for legacy unidentified templates. Reimport skips previously imported sources rather than overwriting local edits; deliberate Save Actor as template still creates an independent template. Older imports without identity markers cannot be safely deduplicated retrospectively.

Accepted manual Heroic exceptions remain Signature Weapon permanent/full attachments, comprehensive Unbowed reversal, and narrative/raw/external spending. v189x and v1.0 are not closed.
