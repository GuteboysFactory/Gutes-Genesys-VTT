# v0.0.1837 — Natural rest recovery

Rule source: Genesys_Core_Rule_Audit_Foundry_Implementation_Baseline_v1.0.docx, §11.3: full night heals one wound and removes all strain. Critical recovery uses a separate weekly check. Talent-specific bonuses remain GM-managed.

Automated: all tests/*.mjs, syntax and diff checks. Service tests exercise preview and mutation boundaries, selected actors, permissions, duplicates, stale values and partial failures.

Foundry QA:
1. GM Dock → Session → Full Night’s Rest. Verify PC names and before/after values match sheets.
2. Select a subset and confirm a full night of rest. Apply. Only those PCs lose one wound (minimum zero) and all strain.
3. Leave confirmation unchecked: no changes. Repeat with no selected PCs: no changes.
4. Verify criticals, conditions, Heroic state and encounter Active/Out/Dead status remain unchanged.
5. Rapid duplicate clicks must not heal twice. On a second GM account, recovery directs to active GM.
6. Reload: values persist. Change a character’s health while a preview is open: refresh/verify before applying.
7. Check End Session does not invoke rest, and Story Points/XP/Encounter shortcuts still work.
8. Review narrow Dock layout and multi-client updates in Foundry; these runtime checks remain pending.

Scope: world player characters, base full-night natural recovery. Synthetic token recovery, end-of-encounter strain checks and recovery talent modifiers are not automated in this patch.
