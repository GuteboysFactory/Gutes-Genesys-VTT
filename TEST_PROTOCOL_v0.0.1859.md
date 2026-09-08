# v0.0.1859 — End Turn condition retry protection

1. Add a condition with a multi-turn duration. End a normal turn: decrease once.
2. In a disposable QA world, if actor save succeeds but scene save fails, reload and retry End Turn: the condition must not decrease again. Heroic must not consume an additional duration step either.
3. Test Force End Turn and Nemesis extra turns: each distinct turn decreases once.
4. Rewind to an already completed turn: conditions do not tick again. Start a new encounter: duration advancement resumes normally.

38 automated files pass. The condition-service test covers saved markers, duplicate retry, failed actor saves, rewind and a new encounter. Live disconnection/Foundry persistence remains untested.

A new GM can manually retry the still-active turn after reconnection. No queued requests are automatically replayed. The actor/scene sequence is not atomic; manual edits to turn identity during recovery and simultaneous sessions using the same GM account remain unsupported. Next: visible recovery status and explicit operator workflow.
