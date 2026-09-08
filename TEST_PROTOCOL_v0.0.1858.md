# v0.0.1858 — Active GM encounter routing

Use one GM session and separate player accounts. Requests use native ChatMessage document events (https://foundryvtt.com/api/v13/modules/hookEvents.html), with the event userId as requester identity rather than a claimed payload identity.

1. GM starts Side Slots. A player claims their owned PC: a private request completes and both clients see the active turn.
2. Two players claim at the same time: one succeeds, the stale request is rejected. No overwritten claim.
3. Player uses Action/Maneuver and End Turn. Check counters and Heroic/conditions. Player must not reset, force-claim or control another player's actor.
4. GM changes turn while a player request waits: stale request is rejected. Check Popcorn, Nemesis extras, reset and Renewal too.
5. With no active GM, encounter commands give a clear error. Reload/reconnect must not replay old requests.

37 automated files pass. Service integration uses mocked Foundry dependencies; live transport, permissions and private chat updates are not yet verified in Foundry.

Limitations: one browser session for the active GM account; no automatic recovery/replay after GM disconnect; timeout may mean a command saved but its reply failed, so inspect state before retrying. Actor/scene updates during End Turn are not atomic. General combat effects outside initiative-service are outside this routing scope.

Next: live multi-client feedback, then recoverable End Turn/failover journaling.
