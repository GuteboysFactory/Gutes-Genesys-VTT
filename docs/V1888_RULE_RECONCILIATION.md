# v0.0.1888 — closure of the three selected roadmap blocks

Baseline: QA v0.0.1887, commit `2e2ccfeaecee637d5c77355afa10beab3df27fec`. Original phases and numbering are retained.

| Original block | Release status | Delivered completion |
|---|---|---|
| v1830–1839 GM Tools | 🟢 | Recovery reconciliation, consumable inventory/counters, session Story Points, social pressure, equipment repair and environmental harm, with saved outcomes and active-GM controls |
| v185x Combat, reactions and magic | 🟢 | Maneuver payment/retry, action exchange, Grapple/Tumble, two-weapon and unarmed attacks, per-hit reactions/soak/criticals, equipment damage, critical lifecycle, mounted predicates and rune/magic integration |
| v188x Setting, rules and content | 🟢 | Core/Terrinoth audit dispositions, source census/statistics/skills/weapons/reference reconciliation, source/FAQ corrections, talent provenance, craftsmanship/attachments, crafting/alchemy and runebound shards |

Green means the selected release block has its implementation, source reconciliation, explicit automation boundaries and test evidence. It does **not** mean every individual published talent or NPC clause is executed automatically. Core audit §24.3 defines full audit as a software owner, data strategy, automation boundary and test path for each rule family; it expressly does not require copying every content row into the engine. The audit is requirements input, and the implementation/tests below are the evidence.

The GM accepted Library ↔ Items ↔ Tome and moved live verification after 1.0. No live check is reported as passed. v189x and v1.0 remain their existing separate roadmap blocks. Foundry v14 is not certified.

## GM Tools and recovery

The established medicine/critical recovery services retain Surgeon, Apothecary, Painkiller Specialization, Desperate Recovery, One with Nature, Durable and Second Wind integration. PC/Rival/Nemesis treatment, encounter and non-encounter recovery, patient serialization and recorded attempts remain covered by the existing recovery tests.

New consumable handling consumes owned Items and persists a patient job before effect application. Stamina elixir uses 5/4/3/2/1/0 daily recovery, including social use. Speed potion enables two free maneuvers, a maximum of three, for the next three turns; its expiry cost is applied once, including extra activations. Day reset is GM-controlled.

Session start asks the GM for player count, including disconnected players, and seeds Players = count / GM = 1 exactly once per session number. The guided Story Point check reserves at most one point per side and transfers after resolution. Impossible checks require permission and one player point without that point also upgrading the pool. A saved, unrolled check can be cancelled; a rolled check must be resolved.

Social checks use the opposition matrix, motivation choices, success/failure strain and critical remarks. Repairs save a Mechanics result and require confirmation of elapsed time and recorded payment. Environmental harm presents the source fall/fire/acid/suffocation/vacuum choices, saves resource changes with pending critical follow-up, and never changes participant status to Dead automatically.

## Combat, reactions and magic

- Paid maneuvers and action costs use durable Actor/Scene receipts. A failed Scene write can resume after payment. Normal maneuver cap remains two; Speed is the explicit exception. Exchanging an action for a maneuver is represented directly.
- Disengage clears all recorded engagements. Grapple requires two maneuvers; Tumble cannot bypass it. GM confirms the applicable spatial situation. Token movement/range geometry remains GM-controlled.
- Two weapons use the lower skill and characteristic, higher difficulty plus one, with independent damage profiles. The secondary hit costs two Advantage or one Triumph; its own qualities and critical rating become available after that hit. Linked is capped by rank. Each extra hit uses reaction windows and its own soak calculation.
- Stun bypasses soak; Stun Damage does not. Sunder works on a miss and records equipment damage stages. Major/destroyed weapons cannot attack until repaired. Reinforced protects against Sunder and Pierce/Breach as applicable.
- Critical effects include next-check penalties, next-turn maneuver restriction, last-allied-slot restriction, At the Brink action cost, per-activation Bleeding Out, temporary Horrific Injury reductions and GM notification at The End Is Nigh's round boundary. Injury and linked condition are saved together. Recovery includes synthetic token Actors.
- Brawn changes affect soak without recalculating stored wound threshold. Encumbrance considers carried quantities and worn armor. Defense uses the highest provider plus increases, capped at four, with an inspectable sheet breakdown; printed NPC totals are not counted twice.
- Concentration, Renewal, bounded Nemesis extras and GM round confirmation retain their existing authoritative lifecycle. Rune implements use current skill values and explicit effect selection; discounts cannot count the same effect occurrence twice.

## Terrinoth content and optional rule workflows

Crafting/alchemy/gathering use rarity-based difficulty, source material/time formulas, material consumption on an attempt, separate symbol budgets, repeat limits, GM approval and idempotent output Items. The complete example spend sets are represented. Contextual/future/narrative effects are saved with the result and output for GM resolution; they are not silently executed as universal enchantment rules.

Craftsmanship is exclusive and recomputed from a recorded original base. Hard-point overflow is blocked before an invalid attachment state can be saved. Numeric attachment effects and added qualities are applied; compatibility exceptions and conditional/narrative attachment effects are recorded for the GM. The editor is explicitly for creation/correction or a legitimate replacement exception, not free craftsmanship changes during play.

All 17 shard profiles distinguish untrained activation from trained Runes implement use. Stateful activations record targets, costs, duration, temporary weapon Items and once-per-encounter receipts. GM confirms timing, range, complete targets and narrative destinations/effects. Bone/Hazel/Yew use the official corrected ×1.5 material price data. Choosing a rune or a material never grants a talent or extra activation.

## Independent source evidence

Primary sources are the supplied Core Rulebook and Realms of Terrinoth PDFs and the supplied Core/Terrinoth implementation audits. Official FAQ/errata v1.1 overrides the printed book.

- `terrinoth-source-census-v1888.json`: all 79 source profiles, identity, role and page, independently enumerated from PDF headings.
- `terrinoth-stat-audit-v1888.json`: 817 characteristic/soak/threshold/defense values using positioned table words rather than the importer's numeric-block parser.
- `terrinoth-weapon-audit-v1888.json`: 371 skill entries, 120 weapon profiles and 189 native quality ratings; three conditional Minor Elemental qualities are validated separately. 212 reference blocks compared to source text. Dice-color glyphs are excluded from the prose comparison; this is not a dice-icon transcription certification. Gnome Minstrel uses the explicit official FAQ override.
- `v1888-audit-requirements.json`: 127 catalogue requirements with individual evidence and boundaries. 124 have executable contract evidence, one is a content/errata review and two vehicle cases are outside the selected personal-scale blocks under Core audit §23. Neither vehicle case is counted as a passing implemented feature.
- `npc-ability-coverage.json`: every recorded clause remains visible with its execution status. Reference text, spell prose, native rules and GM-guided rules remain distinct; a source-checked reference is not relabelled as automatic execution.
- `data/terrinoth-talent-pages.json`: 112 exact talent source-page entries. Native source metadata adds book, page, category and version without replacing user-edited rule content.

The source reconciliation found and fixed missing native Knockdown (baronial lance), Unwieldy 3 (Viper bow), Accurate 1/Limited Ammo 3 (assassin daggers) and Vicious 2 (Naga fangs). Minor Elemental asks for its source variant before applying the variant-only quality. Dwarf Ancestral Specter identity, Bloodsister source page and stray PDF drop-cap text were corrected. Import parsing now retains qualities separated by semicolons. Existing owned Actors are preserved; corrected templates apply when creating/copying through Forge.

## Rule-family ownership and boundaries

| Audit family | Implementation/data owner | Automation boundary |
|---|---|---|
| Dice, construction, opposed/competitive/assisted checks | `dist/domain/dice`, `pool`, `checks`; native check UI | Eligibility/context and narrative spends are chosen by player/GM |
| Story Points and sessions | Existing Story Point/session services + `story-check-v1888.js` | GM resolves the saved action before transfer |
| Characters, skills, XP, talents | Creation/skill registries, XP and talent RuleElements | Individual non-native talent effects remain visible content; no blanket talent automation claim |
| Equipment/qualities/defense/encumbrance | Equipment domain, modification/physical/quality services | GM supplies fictional compatibility and unusual circumstances |
| Initiative/actions/movement | Initiative authority queue, maneuver-payment and disengage | GM next round and participant status; no automatic death |
| Damage and critical consequences | Combat/critical domain and lifecycle | Limb/narrative consequences and accepted Heroic exceptions remain GM decisions |
| Medicine/rest/consumables | Recovery services and patient journal | Care, day boundaries, inventory selection and narrative eligibility are GM-confirmed |
| Social/motivation | Social domain and guided encounter service | Concessions, group context and motivations are narrative choices |
| Minions/Rivals/Nemeses | Adversary model, Forge and embedded Items | Source-specific conditional/narrative references are preserved alongside executable rules |
| Environment/fear | Environment domain/service and existing Fear panel | Exposure, protection, fear relevance, range and death decisions are GM-controlled |
| Magic/concentration/runes | Magic Composer/effect lifecycle and rune domain/service | Targets, summons, destinations, narrative/symbol consequences are explicit choices |
| Terrinoth crafting/alchemy/materials/mounts | Crafting/equipment/mount/rune data and services | No universal automatic magic-item recipe; future/narrative spends remain recorded GM instructions |
| Other Core genres, item-builder guidance, optional vehicle/hacking modules | Setting content boundary and Core audit §§23–24 | Not newly claimed playable vehicle/hacking modules or additional roadmap phases |

Accepted Heroic exceptions remain: permanent/full Signature Weapon upgrades/attachments, complete Unbowed reversal of every Critical Injury (especially previously changed characteristics), narrative judgments and some raw/external checks/spends. The animated system WebP and the accepted round-token/drop workflow are retained.

## Verification

See `v1888-test-results.json` and `TEST_PROTOCOL_v0.0.1888.md` for exact executable results and deferred live scenarios. Tests exercise domain rules and actual service modules with Foundry document/authority mocks; they do not constitute multiplayer gameplay, browser performance or Foundry v14 certification.
