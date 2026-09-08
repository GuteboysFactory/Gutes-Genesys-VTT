# Genesys VTT Roadmap

Working roadmap from the accepted `v0.0.1825` QA baseline. Versions describe delivery slices, not fixed release dates.

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

### v0.0.1846 onward — Remaining Heroic Abilities Live

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

Every slice must include a version bump, focused automated tests, a manual QA protocol, regression against accepted encounter modes, and publication to `qa` under the established user-authorized build/test/publish workflow.
