# v0.0.1835 — GM Dock navigation hotfix

Reported: clicking Dock section links in the Foundry desktop client opens the world join page in an external browser.
Cause: fragment hyperlinks were used for application-local navigation.
Fix: type=button ApplicationV2 actions scroll only the Dock content, offset by sticky nav height.

Automated: six navigation actions, default prevention, target allowlist, GM gate, sticky-bar offset; full tests/*.mjs regression suite.

Manual QA in Foundry desktop:
1. Open GM Dock and click Session, Story Points, XP, Encounter, Actors and Forge.
2. Confirm each scrolls within GM Dock and no browser/tab or join page opens.
3. Repeat after resizing and moving the Dock, including clicks on icons/text and keyboard activation.
4. Check Spend, Party XP and Session Start/End still work.
