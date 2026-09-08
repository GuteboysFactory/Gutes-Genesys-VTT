# Test Protocol — v0.0.1830 GM Dock Shell

## Install and permission gate

1. Update through the `qa` manifest and confirm the system reports `0.0.1830`.
2. Log in as GM and open the Actors Directory.
3. Confirm a **GM Dock** button appears beside the existing Character Creator control.
4. Log in as a player and confirm the GM Dock button is absent.
5. As a player, run `game.genesysGmDock?.open()` in the console and confirm the Dock does not open.

## Shell and navigation

6. Open GM Dock and confirm the header shows the current World, Scene, system version and connected-user count.
7. Confirm the navigation contains Session, Story Points, XP, Encounter, Actors and Forge.
8. Click each navigation entry and confirm the window scrolls to the matching section.
9. Confirm Story Point, Party XP, Session and Adversary Forge controls are visibly marked as upcoming and do not change game state.

## Existing-service integration

10. Confirm the overview reports PC, NPC and total Actor counts correctly.
11. Confirm XP Control lists PCs and their current available/earned XP.
12. Click a listed character and confirm its Actor Sheet opens.
13. Click **Actors Directory** and confirm Foundry's Actors Directory opens.
14. Click **Character Creator** and confirm the existing Character Creator opens.
15. Confirm Encounter reports the current status, mode, round and participant count.
16. Click **Open Encounter Tracker** and confirm the existing v0.0.1825 tracker opens without creating a second encounter state.

## Live refresh and responsive layout

17. Create, update or delete an Actor while GM Dock is open and confirm its overview refreshes.
18. Start or update an Encounter and use **Refresh**; confirm the summary matches the tracker.
19. Narrow GM Dock below approximately 720 px and confirm panels stack into one column.
20. Narrow it further and confirm navigation, Actor cards and buttons remain usable without horizontal clipping.

## Regression

21. Run a short Core Side Slots encounter through End of Round.
22. Run a short Popcorn Initiative encounter.
23. Use and complete a Nemesis Extra Activation.
24. Open Character Creator and resume or create a draft.
25. Purchase or inspect a Skill/Talent and open XP Ledger.

Expected: v0.0.1825 gameplay remains unchanged, GM Dock performs no Story Point/XP/session mutations, and the console shows no new errors.
