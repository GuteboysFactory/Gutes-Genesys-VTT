# v1886 — Combined review of the three original roadmap blocks

Baseline: QA v1885, 4eeba7c90f4600dc95ca461fbeebfc356b93a982, fetched before edits. Foundry target remains 13.351.

## Release decision supplied by GM

Library → Items → Tome is accepted for release. Remaining live verification is follow-up after 1.0, with corrective patches as required. This changes the release gate, not the historical test evidence. Heroic accepted manual exceptions remain. No v14 compatibility claim.

## 1. GM Tools / recovery

Existing night rest, Apothecary, encounter strain recovery, Desperate Recovery, One with Nature, Second Wind, first aid and diminishing painkillers are retained. Core printed p.116 checked for the new Critical Recovery flow. The GM chooses a world PC, active injury, Medicine or full-week Resilience, medic, equipment and a campaign-week label.

Medicine difficulty follows injury severity, plus two for self treatment and one without equipment. Attempts are recorded per medic/injury/week. Resilience allows one natural recovery attempt per patient/week; failure heals one wound. Both failures and successes consume the recorded attempt. The GM confirms actual elapsed time and keeps the same week label; this is not a calendar engine. Nightly healing is recorded separately. The weekly attempt does not grant a free week of nightly healing.

Successful recovery removes the injury and only its linked conditions in the same Actor update as the attempt record. Failed Actor saves change neither; failed chat does not permit repeat healing. Active-GM queue and command authorization apply. A failed initial save does not durably preserve the rolled result. Triumph, special modifiers, manually changed characteristics, permanent limb loss and participant status remain GM-managed. Natural-rest Triumph can heal another injury using existing manual injury controls. Dead results are rejected.

Recovery coverage is still bounded: NPC/non-encounter first aid and painkillers, all possible talent-specific recovery modifiers and arbitrary external rolls are not certified by this patch. Core Surgeon p.74 is a separate Medicine modifier and is not added to the Terrinoth recommended talent table merely to claim coverage.

## 2. Combat, reactions and magic

Core printed p.115 compared with the persistent check penalties. Head Ringer, Fearsome Wound and Agonizing Wound now increase difficulty for their actual resolved characteristic; Compromised increases all applicable checks; Blinded upgrades twice, or three times for Perception/Vigilance. Native skill-engine, weapon preparation and magic preparation paths use these modifiers. Magic retains existing positive pool effects and implement bonuses. Spell construction's effect-difficulty limit remains separate from injury penalties.

Inactive/healed injuries and supported Unbowed suppression do not contribute. Removing the injury removes these calculated penalties. No characteristic value is rewritten. GMs should not also add these newly supported penalties manually in the supported paths. Raw/external roll entry points remain outside this integration.

Manual injury removal previously saved injury and conditions separately. It now saves both in one update, avoiding an orphaned condition on second-write failure. Permanent characteristic reductions are not reversed.

Existing Parry/reaction validation, bounded activation allowance, explicit GM next-round confirmation and Concentration/Renewal journals are regression-tested. This patch does not assert all critical consequences, reaction talents or special spell effects are automated. Transient critical consequences, limb adjudication and raw/external spending still require their documented GM handling. Complete rule-by-rule combat/magic certification remains open.

## 3. Core/Terrinoth content

Terrinoth printed p.191 checked: Dimora has Durable 2. Forge now translates only the intact, identified reference into a native Durable talent. Existing runtime subtracts 20, minimum 1. Own template provenance is retained; edited references are not guessed; duplicate native talents are avoided. Existing world Actors are not silently migrated.

Inventory is regenerated from the existing 79 book templates: 265 recorded clause occurrences, 49 native baseline, 17 guided fear, 3 runtime entries, 196 manual references. This is not a count of unique abilities or missing functions. Spell prose and extraction fragments occur in the historical clause splitter. Original reference text remains preserved, rather than silently deleting or declaring those fragments implemented.

101 templates (79 book + 22 everyday) remains a library count, not full book coverage. A complete source-to-implementation reconciliation for the remaining references and setting optional rules remains open. Existing audit documents are requirements, not proof of implemented behavior.

## Evidence and next work

Automated results are in v1886-test-results.json; version checklist in TEST_PROTOCOL_v0.0.1886.md. No actual Foundry live execution this delivery. Deferred live checks do not block 1.0 by GM decision.

The three selected blocks were reviewed together and concrete corrections shipped together. They are not marked wholly green: the remaining rule/content work above is real implementation/reconciliation work, not merely deferred live QA. No new roadmap phases are introduced.
