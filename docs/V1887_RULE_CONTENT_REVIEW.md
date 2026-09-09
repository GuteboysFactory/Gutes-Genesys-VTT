# v1887 — Recovery, critical strain restrictions and NPC magic

Baseline: fetched QA v1886, 32333032ecf5177b4c7d7f5b5bdb06509b49c52a. Original roadmap phases retained. Foundry target remains 13.351; v14 not verified.

## GM Tools and recovery

Core pp.74 and 116 checked against supplied PDF. Surgeon is a ranked passive Core reference talent in the native Talent Library. The existing **Install catalog as Items** command creates it under Items → Talents, without replacing edited installed Items. It is not inserted into the setting's printed recommended-talent table. Owned enabled Surgeon adds its rank to wound healing from GM First Aid, including an unsuccessful Medicine check (the talent trigger does not require success). Advantage heals strain only on success; Surgeon does not heal Critical Injuries.

First Aid now supports individual PCs, Rivals and Nemeses. During an active encounter, the patient must still participate. Outside an active encounter the GM may select a world/token individual and enter a stable recovery-episode label; the same patient/label permits one attempt including failure. Leaving the label blank uses the last tracked encounter if available. Labels describe the same fictional episode and are GM-managed, not a way to repeatedly heal the same wounds.

Painkillers/healing potions and weekly Critical Recovery also support individual Rivals/Nemeses and world/token patients outside encounter participation. An open scene is still needed for the existing GM-authoritative command queue. Dead participants and active Dead injuries are rejected. Minion-group casualties remain GM-managed; healing never auto-revives or changes encounter status. Rivals do not receive a synthetic strain track or convert healing Advantage into extra wounds.

The three medical operations additionally serialize per patient within the controlling client, including commands from different scenes. Saved episode/week/dose receipts and revisions are rechecked after waiting. This does not serialize arbitrary external Actor edits or claim cross-client transactions. Initial failed saves have no durable result; failed chat does not replay healing. Existing natural rest and daily painkiller reductions are unchanged.

## Combat, reactions and magic

Core p.115 checked. Winded now blocks positive voluntary strain costs in the shared strain eligibility check used by casting. Paid reactions are excluded from offers; the choice and damage-commit boundaries recheck Winded. Zero-cost options and involuntary damage are not blocked. Supported Unbowed suppression and healed/inactive injury state are honored. External macros and unsupported cost entry points remain manual; no blanket automation of every critical consequence is claimed.

Actual Forge → magic preparation testing found and corrected a PC-career prerequisite being applied to NPC templates. Ranked Rival/Nemesis magic skills no longer require a PC career. PCs still obey setting career access, and Minions cannot use standard casting. No free skill ranks are granted.

The composer now shows Challenge dice as well as Difficulty dice. Innate discounts and rule notes appear in preview/chat. For Elemental Mastery the GM explicitly chooses which selected effect is the first added effect; only one occurrence is free. An implement cannot discount that same free occurrence twice. Existing positive dice effects, implement damage and critical penalties remain separate.

## Checked Terrinoth profiles and native behavior

| Rule | Profiles / printed pages | Supported behavior |
|---|---|---|
| Dark Insight | Goblin Witcher 152; Lord of Bilehall 165; Necromancer 166; Bloodsister/Nightseer 214; Witch/Warlock 217 | Current Knowledge (Forbidden) rank determines constructed spell effects |
| Creature of the Aenlong | True Fae 181; Dimora 191 | Arcana difficulty −1, minimum Easy; Attack spell base damage +3 |
| Vampiric Magic | Lord of Bilehall 165 | Magic-check difficulty −1 |
| Elemental Mastery | Storm Sorceress 180 | One GM-selected first added effect is free on Arcana spells |
| Chill of Nordros | Necromancer 166 | Ice is included without extra difficulty on Attack spells |
| Necromancy | Necromancer 166 | Summon Ally is included without extra difficulty on Conjure; GM must create undead summons |

Numeric Arcana/magic difficulty adjustments also apply to native skill-engine checks, with the floor applied before critical penalties. Conjuration creature creation, magical narrative outcomes and unsupported external roll entry points remain GM-managed. Existing spell examples are references, not precomputed pools to be executed again; they do not receive a second bonus.

Forge enrichment requires the known template/rules-source identity and an exact full reviewed reference. It creates independent, enabled native talent Items; duplicate source IDs are not added. Edited/unknown references are not inferred from a name. Existing Actors are not silently migrated. A new Forge creation/copy gets supported rules while keeping source-template provenance and Items independent.

## Inventory and remaining scope

Regenerated inventory: 265 historical clause occurrences, 49 native baseline, 17 guided, 14 runtime, 185 manual references. Eleven occurrences moved to supported runtime this patch. These are not unique abilities or missing-function counts. Each row now distinguishes rule references, spell prose and obvious extraction fragments; none is silently removed or certified implemented because of its name.

The full source-to-implementation audit remains open. Other NPC abilities, optional setting rules, critical consequences and recovery modifiers are not automatically accepted just because this patch implements related behavior. GM's release decision remains: Library ↔ Items ↔ Tome accepted; remaining live verification deferred to after 1.0, with corrective patches if needed. Accepted Heroic manual exceptions remain unchanged.

## Evidence

79 test files pass; one Chromium-dependent test is blocked. See docs/v1887-test-results.json and TEST_PROTOCOL_v0.0.1887.md. Actual Foundry gameplay has not been performed for this patch. The earlier inventory test used a fixed count of two runtime entries; it now verifies its original Ogre/Second Wind entries and the inventory's internal counts, so adding reviewed rules does not invalidate an unrelated regression.
