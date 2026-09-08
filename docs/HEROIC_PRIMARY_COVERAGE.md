# Heroic primary-effect implementation coverage

Audit at v0.0.1862. Source: supplied Realms of Terrinoth, printed pp.74–78. Catalog: dist/module/content-packs/realms-of-terrinoth-heroic-motivations.js. Runtime searched for all eleven primary IDs. Activation payment, uses and duration are shared infrastructure, not implementation of the primary effect.

| Primary | Current mechanical coverage | Remaining |
|---|---|---|
| All the Facts | Catalog and shared activation | GM narrative resolution and improved checks |
| Connected | Catalog and shared activation | Contacts/narrative resolution |
| Foretelling | Catalog and shared activation | Prediction and result substitution workflow |
| Hard to Kill | Base/Improved +4 soak in actorCombatSnapshot | Improved attack difficulty; Supreme all-damage immunity; sheet effective-soak display |
| Influential | Catalog and shared activation | Social-result handling |
| Miraculous Recovery | Catalog and shared activation | Activation/turn healing and upgraded recovery |
| Paragon | Catalog and shared activation | Chosen skill and post-roll die selection |
| Sixth Sense | Catalog and shared activation | Defensive check handling |
| Signature Weapon | Catalog and shared activation | Bound weapon and upgrade mechanics |
| Unbowed | Catalog and shared activation | Threshold/effect handling |
| Unleash | Catalog and shared activation | Its attack-resolution workflow |

## First mechanical slice: Hard to Kill

Base and Improved grant +4 soak while active (p.76). The standard combat snapshot adds this dynamically and does not edit the actor's stored soak. Existing damage resolution consumes that effective value. Sheet soak still displays the stored value. Do not add a manual +4 for these standard attacks or it will be counted twice.

Improved difficulty increase is still manual. Supreme remains manual: its immunity must cover damage routes beyond standard attacks before it can be described as automated. No extra soak is applied automatically at Supreme in this slice.

Next: finish Hard to Kill's incoming-check and all-damage paths with tests for soak bypass, strain damage, critical injuries and effect expiry. Then Miraculous Recovery. Narrative abilities should receive supported GM workflows, not invented automatic outcomes.

Automated tests are not live Foundry QA. This audit does not mark any previously untested feature as user-approved.
