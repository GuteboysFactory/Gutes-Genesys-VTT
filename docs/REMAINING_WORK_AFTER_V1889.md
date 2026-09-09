# Remaining work after v0.0.1889

Report date: 2026-09-09. Baseline: published `qa` commit `45f7f8552b55ebea7feaee40ff8ab71ec43d7897`, system version **0.0.1889**. This report follows the GM's subsequent acceptance of core development and approval to include GitHub reporting in **1.0**. It does not claim that 1.0 is already built.

## 1. Release position and decisions

The gameplay foundation is accepted as complete within its documented scope. Work now moves to release closeout, bugfixes from actual play and selected improvements. Finished blocks must not be reopened merely because they retain deliberate GM decisions or because live tests were postponed.

The original roadmap block names are preserved. The remaining v189x hardening work and v1.0 delivery are one coherent next release, **v1.0.0**. The proposed separate v0.0.1890 reporting patch was superseded by the GM's decision to include it in 1.0.

The GM also explicitly accepted Library ↔ Items ↔ Tome and moved live verification and any resulting corrections after 1.0. This changes scheduling and acceptance, not the factual test record. All new rule/manual Journal content must remain English.

## 2. What is already delivered

| Area | Release status | Evidence and limits |
|---|---|---|
| GM Tools | 🟢 | Session/Story Points, XP, health, recovery and guided rule tools; v1888 reconciliation |
| Combat, reactions and magic | 🟢 | Supported checks, per-hit effects/reactions, critical lifecycle, bounded turns and concentration/retry workflows; manual narrative/external boundaries remain |
| Heroic | 🟢 | Eleven primaries, upgrades/secondary workflows and native shortcuts; accepted exceptions below |
| Forge foundation and workflows | 🟢 | Library, native NPC creation, image drop, visible placement and round tokens; existing Actors preserved |
| Setting/rules/content | 🟢 | Core/Terrinoth source reconciliation and implemented optional workflows, not blanket automation of every book entry |
| Library ↔ Items ↔ Tome | 🟢 | Native Item sources and accepted integration; actual Tome adapter contract previously passed |
| Journal feature | 🟢 | v1889 adds 9 Core overview pages, 7 Terrinoth overview pages and a 16-page English manual, plus configurable native PDF pages |
| Rules & Equipment button correction | 🟢 | v1889 adds missing navigation allowlist target; targeted handler regression passes; live confirmation not yet recorded |
| Animated artwork | 🟢 | Original WebP preserved; existing system/world background behavior retained |

These statuses mean delivered/accepted for release, not universal live certification. The user reported Forge/image-drop success in live use, but that does not certify unrelated newer functionality.

## 3. Required 1.0 feature: GitHub reporting

**Implementation status: 🔴 Not started.** The feature was agreed in conversation but is not in v1889. No reporting module or issue-template directory was found in the inspected checkout. This does not establish whether repository-level GitHub Issues settings are enabled; that must be checked during implementation.

Agreed behavior:

1. Provide **Report Bug / Request Feature** in Game Settings, usable by both GM and players.
2. Let the user choose a bug or a feature request, with English labels and instructions.
3. Prefill system version, Foundry version and browser information.
4. For bugs, collect steps taken, expected behavior and actual behavior. For features, collect the desired capability and its practical benefit.
5. Open a prefilled issue in the project GitHub repository. The user reviews and submits there, using their GitHub account, and can attach screenshots there.
6. Store no GitHub token in Foundry and do not automatically include chat, Actors or campaign data.
7. Add compatible GitHub templates/destinations, manual instructions and focused verification for report generation, field escaping, GM/player availability and opening the destination. Handle blocked popup or failed opening with a usable link rather than silently losing the report.

The reporting feature does not automatically send an issue without the user's final submission. It also does not provide automatic issue monitoring or automatic fixes. The agreed follow-up is: the GM asks for incoming issues to be reviewed; Codex reads them, investigates and groups appropriate changes into a patch. Continuous monitoring would be a separate explicit setup.

## 4. Remaining technical release closeout

**Status: 🟡 Partly covered by previous work; final release closeout remains.** These are the original hardening/final-delivery responsibilities, not another gameplay expansion.

| Responsibility | Remaining action | What must not be claimed |
|---|---|---|
| Installation and migration | Verify the declared v1889 → 1.0 upgrade path and preservation of existing Actors, Items, Journal text/ownership and installation identities; document any supported older baseline only with evidence | Universal migration support from every historical build |
| Package and manifest | Check final version, module/assets paths, download/manifest coherence and release contents | A published 1.0 before publication is verified |
| Automated regression | Run relevant final-candidate tests, including new reporting coverage and existing integration areas affected by changes; investigate concrete failures | Adding overlapping historic test totals or treating simulated tests as live play |
| Accessibility/localization | Review concrete issues in the release and new reporting UI; record remaining findings. Keep all new manual/rules content English | Completion of an unperformed full accessibility or translation audit |
| Performance | Check concrete regressions found during release work and document limits | Measured browser or large-encounter performance without measurement |
| Compatibility/API | State v13.351 target, v14 unverified, integration expectations and which APIs are supported versus internal | Broad external-module compatibility or a frozen public API without declaration |
| Release documentation | Add backup/restore and upgrade instructions, reporting usage, PDF setup, accepted manual limits, known issues and version-specific QA evidence | That the existing manual still needs to be created from scratch |
| Publication/sign-off | Publish the final manifest/package and notes and record technical acceptance with explicit deferred tests | That deferred multiplayer/browser/live checks passed |

The prior Chromium-dependent coordinator test could not start because its required browser binary was unavailable; downloads failed. If it remains blocked at release verification, report it as blocked. The GM's decision to defer live verification does not turn that browser test into a pass.

## 5. Full rulebooks: server setup remains unconfirmed

**Status: 🟡 Configuration supported; setup on the user's world is unconfirmed.** No new importer is required for the agreed v1889 PDF approach.

The public package contains original rule overviews and a user manual. It does **not** contain complete Core or Realms of Terrinoth PDF books or a full text transcription of either book.

As active GM, upload/select each book through **Configure Settings → Genesys VTT → Core Rules · Journal PDF / Realms of Terrinoth · Journal PDF**, then save. Each corresponding Journal gains **Full Rulebook · PDF**. Once the GM has done this, the configuration item can be marked complete. No confirmation of this remote server action has been received.

Actual PDF rendering, file availability and player ownership are live follow-up items. Journal ownership does not itself protect the underlying file URL. Existing text and permissions are preserved on repeated installation; missing standard pages can be recreated. See [v1889 implementation report](V1889_JOURNALS.md).

## 6. Accepted manual scope — not unfinished 1.0 requirements

- Signature Weapon permanent upgrades and full attachment mechanics retain the accepted manual handling, even though general equipment modification tools exist.
- Unbowed does not promise to undo every previous Critical Injury consequence or already edited characteristic automatically.
- Narrative information, adjudication, unusual targeting/range circumstances and certain raw/external rolls/spend flows remain GM responsibilities.
- Numerous NPC special abilities and individual talents remain references or guided rules rather than automatic execution. Source-checked text is not execution coverage.
- Certain crafting, material, attachment and rune consequences are recorded for future/manual resolution rather than universally applied to later checks.
- Vehicles/hacking and a complete implementation of every published rule or content entry are outside the selected personal-scale release scope.

There is no requirement to automate these before 1.0. Additional automation or content coverage should follow a specific later request. Conversely, accepting this boundary must not be used to conceal a reproducible defect in a workflow that is claimed to execute.

## 7. Deferred verification and maintenance after 1.0

The following checks remain unverified or only partially evidenced by simulated tests. They are deferred by GM decision and are not release-blocking live gates:

- New/repeated world installation in actual Foundry; Heroic shortcuts, player requests and GM approval.
- Tome import/source opening in the actual installed environment.
- Journal navigation, English page rendering, both full PDFs and player access.
- Multiplayer behavior, reconnect and GM handover, including interrupted or pending work.
- Larger encounters and actual browser responsiveness/performance.
- Concentration with extra activations and interruption/resume across multiple targets in real play.
- Foundry v14 compatibility before v14 support is declared or adopted.

Existing automated retry/authority tests remain evidence for the tested contracts only. Multi-Actor all-or-nothing rollback, arbitrary external writes and every concurrent multi-tab scenario are not universally guaranteed.

Post-release defects should be collected through the new reporting route, reproduced where possible, prioritized and bundled into coherent patches. No open-issue count is claimed here: this report is a source/documentation and session-decision reconciliation, not a GitHub issue-triage pass.

## 8. Optional future improvements

**Automation controls in Game Settings:** an idea raised by the GM, not a specified or implemented feature. There is no agreed list of switches, presets or default changes. It is not in the 1.0 commitment. Any later design must preserve authority, avoid double application and make manual responsibility clear.

**Small features and content:** driven by real play and explicit requests. No fixed quantities of new templates, talents or rules are promised. Earlier art/theme expansion, assisted-content tools and advanced Dice Forge ideas remain optional history, not mandatory pre-1.0 work. Music/audio experiments remain deferred; the current animated WebP stays unchanged.

## 9. Test evidence and report limitations

- v1888: **94 passing files, 1 blocked Chromium file**, recorded in `v1888-test-results.json`.
- v1889: **12 passing targeted files**, recorded in `v1889-test-results.json`. This overlaps the earlier suite and includes the new Journal test; the totals must not be added.
- Earlier actual Tome adapter contract passed against the reviewed adapter; this is distinct from current live module verification.
- This report update makes no runtime changes and adds no new gameplay test result. It checks the current QA version, relevant source files, roadmap and release reports.

Evidence: [v1888 reconciliation](V1888_RULE_RECONCILIATION.md), [audit requirement matrix](v1888-audit-requirements.json), [NPC execution inventory](npc-ability-coverage.json), [v1889 Journal delivery](V1889_JOURNALS.md), [current roadmap](../ROADMAP.md), [archived roadmap](ROADMAP_HISTORY_THROUGH_V1889.md).

The next implementation task is the agreed combined **1.0 release: GitHub reporting plus the remaining technical/documentation closeout**. This report does not itself implement that task.
