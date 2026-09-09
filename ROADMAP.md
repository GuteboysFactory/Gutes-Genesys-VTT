# Genesys VTT Roadmap

Updated 2026-09-09. Latest build: **v0.0.1888**. Live verification is deferred until after 1.0 by GM decision; this is not a claim that those checks passed.

Working roadmap from the accepted `v0.0.1825` QA baseline. Versions describe delivery slices, not fixed release dates.

## Current status — original roadmap, v1888

🟢 Delivered for release · 🟡 Remaining implementation/reconciliation · 🔴 Not started.

| Original block | Status | Remaining |
|---|---|---|
| v1830–1839 GM Tools | 🟢 | Recovery/rule reconciliation and GM workflows delivered; saved outcomes and retry tests |
| v1840–1847+ Heroic | 🟢 | Accepted manual exceptions; live follow-up after 1.0 |
| v185x Combat, reactions and magic | 🟢 | Combat/magic rule reconciliation, action economy, per-hit reactions and lifecycle delivered |
| v186x Forge foundation | 🟢 | Delivered foundation, not full book coverage |
| v187x Forge workflows | 🟢 | Delivered; live follow-up after 1.0 |
| v188x Setting/content | 🟢 | Source/FAQ reconciliation and optional rule workflows delivered; execution boundaries documented |
| Library ↔ Items ↔ Tome | 🟢 | Accepted by GM for release; live follow-up after 1.0 |
| v189x Release hardening | 🟡 | Migration, accessibility, localization and compatibility work |
| v1.0 final delivery | 🔴 | Final documentation, upgrade path and compatibility/API declaration |

v1888 completes the three selected release blocks together. Evidence and explicit automation boundaries: `docs/V1888_RULE_RECONCILIATION.md`, `docs/v1888-audit-requirements.json` and `TEST_PROTOCOL_v0.0.1888.md`. Green does not certify every published talent/NPC reference as automatic execution. Source references retain their true execution status. Older sections below are history; their open audit/live statements are superseded only by the evidence and GM decisions recorded above.

## v1888 — GM Tools, combat/magic and setting/content together

- Complete selected-block Core/Terrinoth reconciliation: source census, 817 statistics, 371 skill entries, 120 weapon profiles, 189 native qualities and 212 reference blocks; FAQ corrections and exact talent source pages.
- Consumables, session Story Points, social strain, repair and environmental harm; authoritative costs and saved recovery.
- Two-weapon/unarmed combat, per-hit reactions/qualities/criticals, Sunder/Reinforced, defense breakdown, encumbrance and critical lifecycle; preserved bounded extra activations and concentration.
- Crafting/alchemy, mounted state, exclusive craftsmanship/attachments and 17 runebound shard profiles, with explicit GM context/spend choices.
- 94 test files pass; one Chromium-dependent file blocked. Live/multiplayer/reconnect/GM change/performance and v14 are not certified. Live checks remain after 1.0 by GM decision.

## v1887 — Combined recovery and NPC magic follow-up

- Surgeon in the native Core Talent Library; First Aid and potions for individual PCs/Rivals/Nemeses outside tracked encounters, with recorded GM-labelled recovery episodes. Critical Recovery includes individual NPCs. Per-patient serialization preserves attempt/dose checks across scene commands.
- Winded blocks positive voluntary strain costs in casting and paid reaction paths; free effects and supported Unbowed suppression remain available.
- NPC casting uses ranked skills without a PC career requirement. Eleven checked Terrinoth occurrences now support Dark Insight, Aenlong, Vampiric Magic, Elemental Mastery, Chill of Nordros and Necromancy. Free-effect choices are explicit and implement discounts do not double-count the same occurrence.
- Source identities/full reference matches gate Forge enrichment. Existing Actors and edited source documents are preserved. Inventory labels prose/fragments separately and retains all recorded occurrences.
- 79 automated test files pass; one Chromium test blocked. Live checks remain after 1.0 by GM decision. Full rule/content certification is still open. See `docs/V1887_RULE_CONTENT_REVIEW.md` and `TEST_PROTOCOL_v0.0.1887.md`.

## Samlad Heroic-leverans — v0.0.1863

Alla elva primary-förmågor ingår nu i samma arbetsflöde på Actions och i GM Dock. Täckning och återstående mekanik anges i `docs/HEROIC_PRIMARY_COVERAGE.md`; gemensamt live-test finns i `TEST_PROTOCOL_v0.0.1863.md`.

- Implementerat: återhämtning med sparåterställning, val av slagna Paragon-tärningar, Connected före betalning, faktajournal/tillfälliga SP, Foretelling-omslag och NPC-kopia, social strain, Unleash och utökad Hard to Kill.
- Secondary: filtrerade kontroller och Devastating även för magiska attacker.
- Återstår före komplett Heroic: permanenta Signature Weapon-uppgraderingar/fullständiga attachment-regler; samtliga Unbowed/critical-konsumenter; gemensamma råslag/externa slag och spenderingsflöden; live-QA.
- Användaren accepterar dessa delar som manuella tills vidare och prioriterar nästa funktion; semiautomatik är fortsatt målet. Ingen förmåga markeras helautomatiserad bara för att dess regeltext eller en GM-knapp finns.

## Adversary Forge — v0.0.1864

- GM Dock → Forge skapar native Foundry Actors för Minions, Rivals och Nemeses.
- Statistik, gruppstorlek, skills, Adversary-rank och 0–1 extra Nemesis-aktivering per runda.
- Förhandsgranskning med möjlighet att gå tillbaka. Valda world Items kopieras som embedded Items; källorna ändras inte.
- Aktuell rules profile bevaras. NPC skapas privat med olänkad prototype token.
- Återstår: mallar, kloning, import/export och direkt överlämning till encounter. Befintliga Actors migreras inte av detta skapandeflöde.
- Heroic fortsätter med dokumenterade manuella undantag, enligt användarens beslut.

## Accepted baseline

- Character sheet and Actions layout
- Magic Actions and Concentration layout
- Responsive Biography initiative controls
- Core Side Slots and Popcorn Initiative
- Encounter Tracker overhaul
- Explicit completion of extra activations
- QA publication workflow and regression tests
- GM Dock through v0.0.1835: user reports current functions working (2026-09-08)

## Current — GM Tools foundation

### v0.0.1830 — GM Dock Shell

- GM-only application and Actor Directory entry point
- Responsive navigation and overview
- Read-only links into existing Encounter, Actor, Character Creator and XP services
- Reserved panels for Story Points, Party XP, Session tools and Adversary Forge
- No duplicated encounter state and no gameplay mutations

### v0.0.1831 — Floating GM Dock Launcher

- GM-only draggable canvas bar
- Position persistence per client
- Launcher removed from Actor Directory

### v0.0.1832 — Story Points Live

- Synchronized player and GM pools
- Atomic one-point transfers with serialized writes
- GM corrections, activity history and chat announcements
- Smooth requestAnimationFrame launcher dragging

### v0.0.1833 — Party XP & Story Point Counter

- Party XP awards to selected characters, award notes and authoritative XP ledgers
- Visible Player/GM Story Point counter beside chat for every user
- Smooth draggable counter with per-client position persistence

### v0.0.1834 — Session lifecycle foundation

- Explicit Spend buttons on shared Story Point counter (GM controls)
- Start/end session, persisted session number, status and history
- Active-GM write authority and duplicate-transition protection
- Manual reminders for Story Points, recovery and XP
- Automated coverage complete; Foundry visual/multi-client QA pending

### v0.0.1835 — GM Dock navigation hotfix

- Replace fragment hyperlinks with internal ApplicationV2 navigation buttons
- Scroll only Dock content, allowing for the sticky navigation bar
- Prevent native Foundry client from opening an external browser on section navigation

### v0.0.1836 — Live encounter overview

- Participant status, active turn/source, activation counters and End-of-Round reminder
- Token-aware actor sheet shortcuts and selected-token preparation via existing initiative service
- Live updates on scene, actor and token changes
- Automated regression and manual QA protocol; Foundry QA pending

### v0.0.1837 — Natural rest recovery

- Selected world-PC full-night rest: one wound, all strain (Core audit §11.3)
- Before/after preview, explicit rest confirmation, active-GM authority, stale-value and duplicate protection
- Actor-level last-rest record; report partial failures per actor
- Does not change criticals, conditions, Heroic state or encounter status
- Automated QA plus manual Foundry protocol; runtime QA pending

### v0.0.1838 — End-of-encounter strain recovery

- Simple Cool/Discipline via existing check and narrative dice engines
- Persistent per-encounter receipts, including zero-success rolls, on actor/token actor
- GM-approved talent bonus input; no automatic talent detection or alternate-skill talents yet
- Existing ended encounters need a new start/end cycle to establish a recovery ID
- Automated coverage complete; Foundry multi-client/reconnect QA remains pending

### v0.0.1839 — GM authority and reconnect hardening

- Active-GM writer gate for shared Dock actions and Story Points service
- Read-only controls for secondary GMs, named controlling GM, counter authority refresh
- Refresh on socket reconnect, window focus and visibility return
- Story Point chat failure no longer reports a persisted transfer as failed
- Simulated client tests added; actual Foundry multi-client and reconnect QA remains an open gate

### Remaining GM Dock backlog

- Recovery talent automation and alternate recovery skills remain tracked
- Special natural-healing modifiers (e.g. Apothecary) remain GM-managed
- Complete permission, multi-client and reconnect QA
- Heroic reset/status integration in v0.0.184x
- Conditions/Critical overview and broader actor management remain tracked

## Next — character and encounter depth

### v0.0.1840 — Heroic Live foundation

- Atomic multi-point Story Point transfers in existing service; one-point Spend UI preserved
- Setting-aware Heroic overview, costs, usage and available Ability Points in GM Dock
- Explicit per-actor reset of session uses and active duration; no automatic session reset
- This slice does not yet activate abilities or connect actor state to payment

### v0.0.1841 — Heroic activation and owner-turn duration

- GM Activate on sheet/Dock; owner Request Activation posts a GM-reviewed request
- Shared Story Point queue with persisted write-ahead journal, actor rollback and explicit interrupted-activation recovery
- Usage limit, active-state guard, cost and next-owner-turn expiry (current owner turn skipped)
- Normal End Turn and Force End Turn integration; repeated completion is idempotent
- Primary/secondary mechanical effects remain GM-resolved; no automatic effect claims
- Pending: live multiplayer/crash QA; identical GM-account tabs not a supported concurrency guarantee

### v0.0.1842 — User-requested Heroic placement

- Full Heroic panel at top of Actions, above Actions/Custom Action and Dice Tools
- Activation button beside ability name; remove portrait-top bar and Biography duplicate
- No activation, cost or duration rule changes

### v0.0.1843 — Heroic advancement purchases

- v0.0.1842 panel placement accepted by user
- Available Ability Points in Actions; GM purchases Duration, Frequency, Power and Story with preview and confirmation
- Purchase history persisted with the actor; XP unchanged
- Secondary Effect selection and mechanical effect automation remain pending
- Foundry visual/multiplayer QA pending

### v0.0.1844 — Secondary Effect selection

- Setting-filtered Secondary Effect purchases with AP validation, duplicate and capacity checks
- Purchased effects displayed on sheet and activation chat; mechanical resolution remains manual
- Live Foundry QA for v0.0.1843 and v0.0.1844 remains pending

### v0.0.1845 — Custom Secondary Effects

- GM creates character-specific name/description and purchases atomically with normal AP/capacity rules
- Sheet and activation chat show custom text; manual resolution
- Live QA pending

### v0.0.1846 — First Foundry backend integration slice

- World equipment appears in Equipment Library without a special flag; native Item opened for editing
- Permission and setting filters; open Library refreshes on world Item changes
- Existing Library Custom Item creation already creates a world Item
- Pulled forward from content management following user requirement. Built-in catalog materialization, talents/other categories, Compendiums and Tome verification remain in the required content gate below
- Live QA pending; no claim of complete two-way integration for all categories

### v0.0.1847 — Rejuvenation activation recovery

- Rule checked against supplied Realms of Terrinoth, printed p.79
- Heal 2 Strain on activation, floor zero; journal and rollback include Strain
- Owner-turn-start recovery still manual and explicitly reminded in chat; automation remains next
- Live Foundry QA pending

### v0.0.1848 — Rejuvenation owner turns

- Active GM applies 2 Strain recovery on owner turn via initiative writes/scene updates
- Actor-persisted turn keys prevent duplicate recovery; activation during own turn records that already-started turn
- Side Slots/Popcorn live multiplayer QA pending

### v0.0.1849 — Devastating weapon hit

- Rule checked: Terrinoth p.79, +2 damage to one hit per attack while active
- Automated on the standard Combat weapon attack resolved hit before soak; chat identifies bonus
- Magic attacks and additional-hit selection remain manual; live QA pending

### v0.0.1850 — Empowered skill-check modifier

- Terrinoth p.79 checked visually: one Boost while active
- Shared condition/check modifier pipeline includes Empowered for engine skill checks and Combat weapon checks
- Arbitrary raw dice pools are not modified; other roll entry points require coverage audit
- Live QA pending. Heroic work continues before broader combat hardening; version bands are estimates

### v0.0.1851 — GM-confirmed aura targets

- Empower Allies/Diminish modifier from GM-selected Short-range targets on current scene
- Confirmation invalidated by position/size/elevation or source timing changes; ends with active state
- No automatic distance/side inference; live multiplayer QA pending

### v0.0.1852 — Drain / Rejuvenate Allies activation pulses

- GM confirms selected allies/enemies within Short range and applies activation pulse
- Target updates include per-activation marker; retries skip completed targets; partial failure is not a group rollback
- Drain reuses NPC damage routing; healing floors at zero
- Turn-start pulses remain manual; live QA pending

### v0.0.1853 — GM-confirmed turn-start pulses

- Drain/Rejuvenate Allies buttons apply current owner-turn event with per-target markers
- Reject wrong owner, used Action/Maneuver, mid-turn activation and changed turn during confirmation
- GM still selects targets and confirms range/side; no automatic target discovery
- Live QA pending

### v0.0.1854 — Renewal slot foundation

- Domain addRenewalSlot with encounter persistence, idempotency and unchanged activation entitlements
- Preserve active turn; rank additional slots among remaining slots now and all slots next round
- Skip slots without eligible base participants after completion; clear on encounter end
- No player-facing button yet; Cool/Vigilance resolution and participant-management edge cases remain next
- Popcorn addition explicitly blocked; existing Popcorn regression passes

### v0.0.1855 — Renewal GM resolution

- Actions → Heroic: Renewal activation/retry button with Cool/Vigilance choice
- GM resolves immediately after activation; Side Slots only, no extra participant turns
- Saved actor roll reused after a failed scene write; inserted slot keyed to activation
- New activations record encounter identity; pre-1855 active Heroics need manual resolution
- Renewal survives source removal and participant updates; next-round eligibility skips unusable slots
- 34 automated test files pass; live Foundry and multi-client QA pending
- Next: remaining Heroic integration, activation-time prompt/chat feedback and concurrent encounter-write hardening. Popcorn Renewal needs explicit semantics before implementation.

### v0.0.1856 — Renewal activation prompt and chat feedback

- Successful Heroic activation opens Cool/Vigilance choice when Renewal is selected in active Side Slots
- Cancel leaves the paid Heroic activation intact; Actions remains the recovery entry point
- Successfully inserted Renewal slot is announced in chat; failed chat does not roll back the slot or repeat the roll
- Existing 34 automated regressions pass; prompt/chat integration requires live Foundry QA
- Next: serialize encounter mutations through a shared authority, including player claims and GM actions. Separate GM browser sessions remain an unresolved concurrency limitation.

### v0.0.1857 — Local encounter command queue

- All initiative-service async commands use one queue per scene, including their read/side-effect/write sequence
- Revisions survive normalization; stale direct writes (including Renewal proposals) are rejected
- Failed saves do not advance fallback state; failed commands do not poison the queue
- 35 automated test files pass; live service integration QA pending
- This is client-local serialization, NOT cross-client atomicity. Next: authenticated authoritative command routing for player and GM clients, including reconnection and duplicate request handling.

### v0.0.1858 — Active GM encounter routing

- All initiative-service commands route to the active GM queue; other clients send private native ChatMessage requests
- Native create-event user identity, owner checks and GM-only command allowlist; exact argument counts and revision guards
- Duplicate document events ignored, response sender checked, 15-second timeout; no automatic reconnect replay
- Private request/completion receipts; a failed reply asks the user to inspect state before retrying
- 37 automated test files pass, including real service code with mocked Foundry dependencies
- Live two-client QA is mandatory. Same GM account in multiple browser sessions is NOT supported by this election; use one active GM session. Cross-document End Turn recovery and GM failover journaling remain next.

### v0.0.1859 — End Turn condition retry protection

- Condition duration changes and a completed-turn marker save in the same actor update
- Normal and Force End Turn pass encounter/turn identity; retry after scene-save failure skips completed condition work
- Markers survive reload and are scoped to the encounter; a revisited completed turn does not tick twice
- Existing Heroic last-turn marker remains in use
- 38 automated tests pass; live interrupted-save QA pending
- Next: GM-visible recovery status and failover guidance. No automatic reconnect replay, same-account multi-GM-session support or full actor/scene transaction is claimed.

### v0.0.1860 — GM interrupted-turn recovery panel

- Encounter Tracker derives recovery status from saved Heroic/condition markers while the same turn is active
- GM-only Complete Interrupted Turn command validates the displayed turn identity and uses the authoritative queue
- Status survives reload; completed or different turns do not show the panel
- 39 automated files pass; live Foundry layout/disconnect QA pending
- Panel can briefly appear during a normal in-flight End Turn; it indicates saved actor work, not proof of an error
- Next: live recovery feedback and remaining Heroic integration before Adversary Forge. Automatic failover replay and multiple active-GM browser sessions remain unsupported.

### v0.0.1861 — Heroic effect controls in GM Dock

- Active selected Secondary Effects expose Renewal, aura targets and activation/turn-start pulse controls in GM Dock
- Reuses the same services, checks and saved retry markers as the character sheet
- Selected custom effect descriptions remain visible as GM-resolved guidance
- 40 automated files pass; live Dock layout/control QA pending
- Next: Heroic implementation coverage audit to identify remaining primary-effect mechanics before combat hardening and Adversary Forge; this release adds access, not new effect rules.

### v0.0.1862 — Primary coverage audit and Hard to Kill soak

- All eleven primary effects audited: docs/HEROIC_PRIMARY_COVERAGE.md
- Hard to Kill Base/Improved adds +4 effective soak to the standard combat snapshot while active
- Stored actor soak unchanged; sheet effective display, Improved difficulty and Supreme immunity remain pending
- Next: finish Hard to Kill incoming checks/all-damage paths, then Miraculous Recovery
- Live combat QA pending; no blanket primary-effect automation claim

### Remaining Heroic Abilities Live (before combat hardening)

- Activation, costs, upgrades and encounter lifecycle
- Sheet, chat and GM Dock integration
- Persistence and regression coverage

### v0.0.185x — Combat, reactions and magic hardening

- Reaction and out-of-turn flow
- Action economy and extra-activation edge cases
- Magic Composer, concentration and generated-action lifecycle
- Structured combat result and chat improvements

## GM content workflows

### v0.0.186x — Adversary Forge foundation

- Adversary data model, validation and migration
- Minion, Rival and Nemesis authoring
- Equipment, talents, abilities and action binding

### v0.0.187x — Adversary Forge workflows

- Templates, cloning, preview and import/export
- Encounter handoff and token preparation
- Content Registry integration

## Content and release hardening

### v0.0.188x — Setting and content layer

- Setting packs and feature flags
- Content audit completion and provenance checks
- Setting-specific sheets, actions and optional rules

#### Required gate — Library ↔ Foundry Items ↔ external modules

User-confirmed requirement; not implemented or verified yet. Must pass before content-layer completion and v1.0.

Locked architecture: Foundry Item documents are the authoritative backend; Library is a user-facing view/editor of those same documents. Creating an Item in Foundry automatically exposes it in the matching Library, and creating in Library creates the native Foundry Item. Edits from either UI update the same document/UUID and refresh both views, respecting ownership and category filters. No manual publish-to-library flag or separate mirrored database for supported Item types.

- Audit every Library category (equipment, talents, actions, Heroic and custom content) and explicitly define its Foundry document representation; do not claim actor data is already an Item.
- Make reusable Library definitions available as native Foundry Items/Compendium documents with stable UUID/source identity.
- Include supported world Items created in Foundry in the appropriate Library, respecting permissions and setting/type filters.
- Define source versus actor-copy behavior for edits, deletion and re-import. Preserve user edits; avoid duplicate entries or silent propagation into owned equipment.
- Verify Adventurer's Tome discovery, links and opening documents against its actual implementation. Compatibility must be demonstrated, not assumed from UUID availability.

Acceptance checks: Library → native Item → Tome; Foundry-created Item → Library; edit/reload/re-import without duplicates; actor copies remain distinct; player/GM visibility; custom content persistence. Record supported categories and any explicit exclusions.

### v0.0.189x — Release hardening

- Foundry v14 compatibility work
- Migration, accessibility, localization and performance passes
- Complete automated and manual regression matrix

### v1.0.0 — Stable release

- Supported upgrade path and release documentation
- Locked public API and compatibility statement
- Final QA sign-off

## After v1.0

- Art and theme expansion
- Optional assisted-content tools
- Advanced Dice Forge and additional GM automation

## Delivery rule

Future Heroic work is delivered as a consolidated package, as requested by the user. Every delivery must include a version bump, focused automated tests, a manual QA protocol, regression against accepted encounter modes, and publication to `qa` under the established user-authorized build/test/publish workflow.


## Terrinoth Adversary Library – v0.0.1865

- 101 native Actor-mallar: 79 Terrinoth + 22 egna vardags-NPC:er.
- Sökning, roll-/kategori-/källfilter, egna mallar och world Actors i samma bibliotek.
- Lokal bilddrop och filväljare, bildförhandsvisning, kopiering till ny Actor och Actor-mapp/ny undermapp.
- Native vapen/skills/Minion-grupper och Parry; övriga särskilda effekter dokumenterade för manuell GM-hantering.
- 49 testfiler passerar. Live-QA återstår. Detaljer och källavvikelser: `docs/TERRINOTH_FORGE_PLAN.md`.

## Portrait upload hotfix – v0.0.1866

The Adversary Library upload now includes the current Foundry user ID in the upload body. Missing user identity stops before upload. Server permissions remain authoritative. Addresses the reported `User []` upload rejection; live confirmation pending. Focused image and Forge workflow tests pass.

## Forge transfer and placement — v0.0.1867

- User confirmed v1866 image upload and NPC creation in live Foundry.
- Export filtered Library entries as versioned JSON; import 1–500 templates into the custom compendium after confirmation. Re-import creates copies, never overwrites. Images are referenced, not embedded.
- After Forge creation or from selected world NPC: optional hidden token at scene centre, then optional NPC encounter handoff using the synthetic token Actor and existing authority service. Initiative starts at zero; roll through normal controls.
- Cancel preserves saved Actors/tokens. Live QA pending; see TEST_PROTOCOL_v0.0.1867.md.

## Native world Talents — v0.0.1868

- User reports Forge v1867 working in live play.
- Talent Library includes observable native world Talents, keyed by document identity. GM can create a world Talent; Open source uses the native sheet. Shared entries start private; GM sets ownership explicitly.
- Open libraries refresh for world Talent create/update/delete. Existing actor copies are independent.
- Compendium talents, catalog materialization, remaining categories and Tome verification are still pending.

## Compendium Talents — v0.0.1869

- Explicit Load / refresh Compendiums in Talent Library reads visible Item packs and lists native Talents with pack identity. Open source opens the native document.
- Permission changes filter cached entries; native pack changes invalidate cached entries. Refresh after editing Compendiums.
- Catalog materialization, remaining categories and Tome verification remain pending. Live QA pending.

## Native Talent catalog — v0.0.1870

- Active GM can explicitly install missing catalog Talents as player-observable world Items. Original source IDs preserved for existing purchases.
- Existing native sources suppress catalog fallback and remain authoritative. Repeated install preserves edits and skips existing entries; explicit reinstall restores deleted entries.
- Other catalogs/categories and Tome integration remain pending. Live QA pending.

## Talents folder — v0.0.1871

Catalog install creates/reuses the root Item folder Talents. New catalog Items go there; existing catalog Items in root move there on explicit reinstall. Items already organized in other folders remain there. Focused tests pass; live QA pending.

## Equipment catalog — v0.0.1872

Explicit active-GM installation of current setting equipment into Items / Equipment. Existing installed sources preserved; Library uses native sources in place of catalog fallback. Player Observer default disclosed at confirmation. Other categories, equipment Compendiums and Tome verification remain pending. Live QA pending.

## Equipment Compendiums — v0.0.1873

User confirms v1872 equipment installation working. Equipment Library explicitly loads visible Item Compendiums, filters equipment types/settings and preserves native source UUIDs when copying to actors. Refresh after native pack edits. Focused tests pass; live QA pending. Actions/Heroic document representation and Tome verification remain pending.

## Native Action Templates — v0.0.1874

User confirms equipment Compendiums working. New native actionTemplate Item with activation, skill ID, difficulty and notes. Actions → Action Library lists observable world templates; GM creates in Actions folder. Add copies into existing actor customActions runtime. Sources and actor copies are independent. Compendium Actions, built-in action materialization, Heroic representation and Tome verification remain pending. Live QA pending.

## Compendium Actions — v0.0.1875

User confirms v1874. Action Library reads visible Item Compendiums on opening and re-resolves source before use. Existing actor-copy workflow preserved. Built-in Assist/Maneuver/Custom Check are informational cards, not executable templates: rule-backed materialization remains pending. Live QA pending.

## General Action controls — v0.0.1876

Assist and Maneuver cards confirm and use the existing authoritative maneuver service. Assist eligibility/bonus remains GM-resolved, per Core audit §5.6. Custom Check opens existing Dice Tools. These are live controls, not installed native default templates; native default catalog and automatic assistance remain pending. Live QA pending.

## Actions library delivery — v0.0.1877

- v0.0.1876 live test confirmed by user.
- First active GM world start installs Assist, Maneuver and Custom Check as native Items in Actions; a per-world marker prevents repeated automatic restoration. Action Library can explicitly install missing defaults later.
- Stable source keys prevent duplicates. Existing renamed/edited/moved defaults are preserved; interrupted installation can be retried.
- World and Compendium templates copy behavior and provenance into independent character actions. Use dispatches Assist/Maneuver through existing encounter controls, opens Dice Tools, or rolls a current actor skill check.
- Character action editor preserves behavior/provenance. Legacy actions default to skill-check; no stored dice pools. Custom skill-check activation costs and narrative effects remain manual.
- Template authoring, source viewing, character copying/editing/deleting/use and default installation now form one workflow. Heroic native document representation and Tome compatibility remain separate roadmap work.
- Automated regression checks passed; v0.0.1877 live Foundry QA pending.

## GM health and recovery workflow — v0.0.1878

- User reviewed v1877 without visible issues; detailed playtest deferred.
- GM Dock Health & Recovery: scene/world roster including unlinked token actors, wounds/strain, active conditions and critical injuries; selected sheets open directly for detailed injury handling.
- Active GM can apply/remove manual GM-health conditions to multiple selected actors after confirmation. Stable source prevents repeat additions; removal preserves critical/talent/other conditions.
- Encounter recovery offers batch Cool/Discipline using existing per-encounter receipts and living-PC checks. Individual talent bonuses remain in the existing Dock controls; batch applies zero bonus explicitly.
- Linked actors deduplicated, synthetic actors remain independent. Permission rechecks, busy guard, per-actor partial failure report and scene-change cancellation.
- This closes the GM overview/batch workflow. Reaction edge cases, concentration, recovery talent automation and detailed playtest remain open; no changes to defeat/activation rules.

## Ordered delivery plan and combat hardening — v0.0.1879

User authorized order: (1) combat/magic/semiautomation, (2) libraries/rule audit, (3) stability. These are not all complete.

Implemented: concentration caster UUID isolation (legacy ID only for world actors), scene-specific synthetic targets, active-GM lifecycle writes, re-entry guard and target-write preflight before maneuver cost. Reaction dialog ignores IDs outside eligible choices. One with Nature enables Survival recovery on eligible actors after GM wilderness confirmation, using existing per-encounter receipts (Core p74).

Remaining package 1: inventory and rule verification of additional NPC abilities/recovery talents; live extra-activation/concentration interaction tests and interrupted multi-target write recovery. Package 2 and real multiplayer/Tome/v14 verification remain pending. Existing accepted manual exceptions remain.

## Combined packages 2 and 3 — v0.0.1880

Eleven native Heroic shortcut Items, upgrade-safe installation, matching-ability validation and existing GM approval integration delivered together. Actual Tome v1.1.9 adapter contract passes. Core/Terrinoth implementation review and stability results are in docs/PACKAGES_2_3_QA.md. 62 test files pass; one browser test is blocked by missing Chromium. Live multiplayer/reconnect/performance and v14 verification remain open; accepted manual Heroic exceptions remain. Neither package is described as fully live-certified.

## Combined package 4 — v0.0.1881

- Concentration uses the authoritative scene queue. Maneuver and target-work receipt are saved together; partial target writes resume without another maneuver. Expiry completes before the turn/encounter advances. Reload uses durable state, not a local cache.
- Renewal rolls and slot insertion execute inside the existing scene queue, retaining saved-roll retry and active-GM checks. No additional activation rights are granted.
- Desperate Recovery applies to individual and batch encounter recovery. Apothecary natural-rest care is GM-confirmed with rank validation. One with Nature remains available individually.
- Forge adds selectable native Ogre Regeneration and Orc Spiritspeaker Second Wind when intact reviewed source references qualify. Existing source compendiums/Actors are not rewritten. Second Wind now saves healing and usage together through the authority queue.
- NPC inventory: 266 recorded talent/ability/spell clauses across 79 source templates, with explicit status in docs/npc-ability-coverage.json. This is not full-book certification.
- See docs/PACKAGE_4_QA.md and TEST_PROTOCOL_v0.0.1881.md for scope, tests and remaining live gates. Same-account concurrent GM tabs, arbitrary external state writes and all-or-nothing multi-Actor rollback are not claimed.

## v0.0.1882 — System information artwork and reviewed corrections

- Original animated WebP copied without re-encoding; native system description and Setup media configured.
- Enabled native Durable rank reduces incoming Critical Injury results by 10/rank, minimum 01, with chat breakdown.
- Official Flying Mount errata removes the obsolete Dodge 2 source reference from the shipped template and unedited legacy Forge drafts. Existing Actors and custom talents are not migrated.
- 68 test files passed; one Chromium-dependent test blocked. Live Foundry QA remains pending. See TEST_PROTOCOL_v0.0.1882.md.
- Next functional block: source-checked Terrifying/Fear semiautomation (17 recorded NPC references), continued NPC and recovery-talent audit. Full rule coverage is not claimed.
- Live gates remain: Heroic request/GM approval, Tome import/source opening, multiplayer/reconnect/GM handover, large encounters and interrupted multi-target recovery. Foundry v14 unverified.

## v0.0.1883 — Combined remaining Forge/content work

Original roadmap phases remain unchanged. This delivery advances v187x/v188x and related GM Tools backlog; it does not close the content gate, v189x or v1.0.

- Fire GM feedback: campaign overview collapsed; no Place NPC/Add to encounter confirmation chain.
- Image drop on token layer: focused template search, template-to-private-Actor creation and visible token at drop coordinates. Shift bypasses interception. No automatic encounter entry.
- 17 supported Terrifying source profiles: GM selects applicable sources/PCs, highest difficulty Discipline roll, persisted receipt; narrative consequences and exemptions remain GM decisions.
- Group Survival recovery with One with Nature: one wilderness confirmation, individual talent validation.
- Adversary re-import skips already imported source identities and preserves edits. Native Action source visibility is rechecked after asynchronous lookup.
- Automated checks and actual Tome adapter contract pass; live drag/drop/rendering, multiplayer/reconnect/GM handover, performance and v14 remain unverified.
- Full Core/Terrinoth book audit, remaining manual NPC clauses and unsupported optional rules are still open. See docs/V1883_CONTENT_GATE.md and TEST_PROTOCOL_v0.0.1883.md.

## v0.0.1884 — Token art and medical care

- User live feedback: v1883 image → Forge → token works well. Square token appearance corrected using existing round gold-frame renderer; original portrait remains separate. No automatic migration of existing tokens.
- Animated join background uses existing unchanged WebP through Foundry native Edit World → Background Image. GM Dock includes a path-copy button under Campaign overview. Administrator must apply that world configuration once; this patch cannot remotely configure the user's server and does not force theme/description changes.
- Original v188x rule/content backlog: guided Medicine first aid for PC encounter participants, health-based difficulty, self/equipment penalties and atomic result/health/attempt receipt. GM handles action economy and exceptional effects.
- Source: supplied Core p.116. Failed checks consume that patient's attempt. Critical Injury treatment, painkillers and broader medical talent automation remain open.
- 72 test files pass; Chromium-dependent coordinator test blocked. New work not live approved. Full-book/content gate, multiplayer/reconnect, performance and v14 remain open.

## v0.0.1885 — Combined Forge, recovery and content follow-up

Original phases v186x–188x retained; no new roadmap phase.

- User-requested fixed system WebP in the in-world native Edit World background field. Render/submit binding supplies the unchanged asset and makes that field read-only. Native Update World persists it; description/theme/title remain untouched. Replaces v1884 manual path-copy control.
- Painkiller/healing-potion GM recording, patient use counter across encounters, decreasing recovery and provider Painkiller Specialization; sixth onward zero. Shared authoritative Scene queue, atomic wounds/count and stale-request protection. GM controls item consumption, maneuver/range/free hand and new-day reset.
- Custom Forge templates preserve separate rules provenance through save/copy/create. Intact source references remain required for reviewed abilities. Existing templates with already-lost provenance are not guessed/migrated by name.
- Native talent catalog now explicitly marks runtime-supported Durable, Desperate Recovery, One with Nature, Apothecary and Painkiller Specialization with scope; pre-existing edited Items are not overwritten.
- 74 test files PASS; Chromium-dependent test BLOCKED. This is not live acceptance or full Core/Terrinoth rule coverage. Remaining 197 manual NPC reference occurrences, full content audit/grind and v189x live/release gates remain tracked.
