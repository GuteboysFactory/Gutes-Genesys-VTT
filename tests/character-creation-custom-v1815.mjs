import assert from "node:assert/strict";

globalThis.foundry = { utils: { deepClone: structuredClone } };
globalThis.Hooks = { once() {}, callAll() {} };

const service = await import("../dist/module/character-creation-service.js");

const customArchetype = {
  id: "custom:archetype",
  label: "QA Folk",
  characteristics: { brawn: 3, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 1 },
  startingXp: 105,
  wounds: { base: 11, characteristicId: "brawn" },
  strain: { base: 9, characteristicId: "willpower" },
  silhouette: 1,
  defense: { melee: 1, ranged: 0 },
  startingSkills: [{ skillId: "athletics", rank: 1, creationCap: 2, career: false }]
};

const customCareer = {
  id: "custom:career",
  label: "QA Adventurer",
  careerSkills: ["athletics", "brawl", "cool", "discipline", "leadership", "medicine", "survival", "vigilance"],
  freeSkillChoices: 4,
  freeSkillRank: 1
};

let draft = service.createCharacterDraft({ settingId: "realms-of-terrinoth" });
draft = service.selectDraftArchetype(draft, customArchetype);
assert.equal(draft.startingXp, 105);
assert.equal(draft.derived.wounds, 14);
assert.equal(draft.derived.strain, 11);
assert.equal(draft.derived.meleeDefense, 1);
assert.equal(draft.skills.athletics.rank, 1);

draft = service.selectDraftCareer(draft, customCareer);
assert.equal(Object.values(draft.skills).filter((entry) => entry.career).length, 8);

draft = service.chooseFreeCareerSkills(draft, customCareer, ["athletics", "cool", "discipline", "survival"]);
assert.equal(draft.freeCareerSkills.length, 4);
assert.equal(draft.skills.cool.rank, 1);

draft = service.purchaseDraftCharacteristic(draft, "agility", 3);
assert.equal(draft.xpSpent, 30);
assert.equal(service.draftAvailableXp(draft), 75);

draft = service.purchaseDraftSkill(draft, "cool", 2);
assert.equal(draft.xpSpent, 40);
assert.equal(service.validateCharacterDraft(draft, { career: customCareer }).valid, true);

assert.throws(
  () => service.chooseFreeCareerSkills(draft, customCareer, ["athletics", "cool", "discipline"]),
  /Choose exactly 4 career skills/
);

console.log("PASS: custom archetype/career normalization, grants, derived values, XP, and validation");
