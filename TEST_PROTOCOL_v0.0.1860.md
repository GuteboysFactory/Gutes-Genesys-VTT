# v0.0.1860 — GM interrupted-turn recovery panel

1. Complete ordinary turns. The recovery panel must disappear once the turn saves. It may briefly appear while End Turn is in flight.
2. In a disposable QA world, an End Turn interrupted after Heroic or conditions save should show End Turn awaiting completion in Encounter Tracker. Reload: status should remain.
3. GM clicks Complete Interrupted Turn: finish the same turn without duplicate effect countdowns. Panel disappears.
4. A stale button from a different turn must reject. Players must not see or invoke the GM recovery command.

39 automated test files pass, including partial markers, different turns/encounters and existing retry/authority regression tests. Live layout and interrupted connection QA pending. No automatic reconnect replay; one session for the active GM account. If failure occurred before any actor marker saved, retry the ordinary End Turn button.

Next: live recovery feedback and remaining Heroic integration.
