# v0.0.1852 — Activation pulses

Live QA pending:
1. Activate Heroic with Drain or Rejuvenate Allies, target enemies/allies within Short range and click the matching Apply Activation button. Confirm side/range.
2. Drain adds 2 Strain to PCs/Nemeses, routes damage to Wounds for Rivals/Minions. Rejuvenate Allies recovers 2 Strain, floor zero.
3. Repeat same pulse: already processed targets must not change again. Cancel changes nothing.
4. Reload and repeat: no duplicate. New Heroic activation may apply again.
5. Failed target save: earlier successes remain; retry skips those and applies remaining targets.

Manual GM confirmation is required. No group atomicity; updates/markers are atomic per target. Turn-start effects remain manual. Old activations without activationId require manual resolution. Confirm after activation promptly, before combat state changes; no automated timing-window enforcement yet.
