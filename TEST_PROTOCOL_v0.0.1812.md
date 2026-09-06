# 0.0.1812 — UI observer stability QA

Baseline: qa e06651f (0.0.1811). No game data migration.

## Changes
- Remove the global MutationObserver guard from the manifest.
- Explicitly route all 18 manifest-loaded UI observers through one coordinator.
- Disconnect observation during two bounded enhancement passes; reconnect for later changes.
- Avoid unchanged Wounds/Strain threshold text writes (a concrete self-triggering loop).

This is a bounded compatibility fix, not a completed per-component render-hook rewrite.
Enhancers still scan open UI surfaces; future work can scope them to specific roots.

## Automated
- PASS: node tests/ui-coordinator-unit-v1812.cjs (mock observer scheduling, bounded self-writes, later mutations, disconnect, global preservation).
- PASS: manifest file existence, manifest-loaded JavaScript syntax, git diff whitespace check.
- BLOCKED: real Chromium test; browser executable is not installed in this environment.
- Run node tests/ui-coordinator-v1812.cjs with Playwright available in CODEX_PRIMARY_RUNTIME_NODE_MODULES.
- Check JavaScript syntax and manifest file existence.

## Required Foundry 13.351 live QA (not yet executed)
- Back up the world; restart/reload all clients after updating from 0.0.1811.
- Confirm game.system.version is 0.0.1812.
- Open, close and reopen a PC sheet; repeat with two sheets and an NPC.
- Verify no freezing on both GM and player clients.
- Switch tabs; verify active tab persists after Actor updates.
- Edit Wounds/Strain; verify persistence and thresholds; leave the sheet idle.
- Open Equipment and Talent libraries, buy/edit items and return to the sheet.
- Open Character Creator, select archetype and check Starting XP/Next.
- Open portrait/token controls.
- Cast magic, select/change targets, add/remove effects and sustain concentration.
- Check console for errors and confirm browser remains responsive while idle.

If the original symptom persists, capture the exact action and console error/stack.
Automated DOM tests do not establish that every Foundry workflow is fixed.
