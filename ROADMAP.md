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

### Remaining GM Dock backlog

- Recovery helpers: explicit rule audit and selected-character workflow still required
- Complete permission, multi-client and reconnect QA
- Heroic reset/status integration in v0.0.184x
- Conditions/Critical overview and broader actor management remain tracked

## Next — character and encounter depth

### v0.0.184x — Heroic Abilities Live

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
