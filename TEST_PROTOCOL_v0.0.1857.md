# v0.0.1857 — Local encounter command queue

## Live Foundry checks

1. In one client, rapidly claim the same turn twice: only the first should succeed. End Turn twice: conditions/Heroic should not advance twice for the same turn.
2. Run ordinary Side Slots and Popcorn rounds, including Nemesis extras and explicit End of Round.
3. Resolve Renewal while another local command is pending. Either the slot saves or a clear Encounter changed message appears. Retry must reuse the saved roll.
4. Reset and restart encounter, reload, and check that commands still save.

35 automated files pass. Dedicated tests cover sequencing, independent scenes, recovery after rejection, stale revisions and reset persistence. These do not replace live service/Foundry testing.

Scope: per-client, per-scene queue only. Separate browser/player/GM clients can still race before receiving each other's updates. Shared authoritative routing is the next release target. Cross-document failures during End Turn remain a recovery concern; the queue does not make actor and scene updates atomic.
