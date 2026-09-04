# Genesys VTT Character Creation Content Pack v1

This document defines the data contract consumed by the Character Creation service and future guided Character Creator UI.

## Pack-level fields

- `id`, `label`, `version`, `settingId`, `sourceType`
- `currency`: wallet/denomination definition for the setting
- `creationRules`: XP costs, creation skill cap, free career skill grant rules, starting funds, heroic-ability flags
- `creationSteps`: optional setting-specific additions/reordering for the generic wizard
- catalogues: `archetypes`, `careers`, `skills`, `talents`, `equipment`, `actions`, `heroicAbilities`, `motivations`

## Archetype / species definition

Required mechanical shape:

- six `characteristics`
- `startingXp`
- `wounds: { base, characteristicId }`
- `strain: { base, characteristicId }`
- `startingSkills[]`: skill id, rank, optional creation cap and career flag
- `silhouette`
- `defense: { melee, ranged }`
- `abilities[]`: structured rule-bearing abilities
- `choices[]`: species/archetype choice groups
- provenance and tags

The creation draft stores an archetype snapshot so derived values remain deterministic when characteristics are purchased and when a draft is resumed later.

## Career definition

- exactly/typically eight `careerSkills[]` for standard Genesys profiles
- `freeSkillChoices` and `freeSkillRank`
- `startingGear[]`: deterministic item references and choice groups
- `variants[]`
- provenance and tags

## Creation transactions

The generic service currently supports:

- sequential characteristic XP purchases
- sequential career/non-career skill XP purchases
- character-creation skill rank cap validation
- talent XP purchases by effective tier
- free career skill grants
- available/spent XP ledger
- save/resume draft on an Actor
- final Actor update for characteristics, XP, skills, thresholds, soak, defense and silhouette

Future UI should call these transactions rather than implementing XP formulas in the wizard.

## Setting-specific systems

Profiles may add guided steps and content without forking the creation engine. Realms of Terrinoth, for example, can enable a Heroic Ability step and provide its own species, careers, skill registry, equipment, currency and magic content through a private/importable pack.
