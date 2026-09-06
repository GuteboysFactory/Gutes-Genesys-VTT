import { evaluateActorVoluntaryStrainCost } from "./adversary-service.js";

const SYSTEM_ID = "genesys-vtt";
const VERSION = "0.0.1802";
const STANDARD_MAGIC_STRAIN_COST = 2;

function assertMagicStrainCost(actor, amount = STANDARD_MAGIC_STRAIN_COST) {
  const evaluation = evaluateActorVoluntaryStrainCost(actor, amount);
  if (!evaluation.allowed) throw new Error(evaluation.reason || "This Actor cannot pay the magic strain cost.");
  return evaluation;
}

function wrapMagicApi() {
  const base = game?.genesysMagic;
  if (!base?.prepare || base.__strainSafetyV1802) return;
  const wrapped = Object.freeze({
    ...base,
    version: VERSION,
    __strainSafetyV1802: true,
    checkCastingCost(actor, amount = STANDARD_MAGIC_STRAIN_COST) {
      return evaluateActorVoluntaryStrainCost(actor, amount);
    },
    prepare(actor, input = {}) {
      assertMagicStrainCost(actor, STANDARD_MAGIC_STRAIN_COST);
      return base.prepare(actor, input);
    },
    async roll(actor, input = {}) {
      assertMagicStrainCost(actor, STANDARD_MAGIC_STRAIN_COST);
      return base.roll(actor, input);
    }
  });
  Object.defineProperty(game, "genesysMagic", { configurable: true, value: wrapped });
}

function wrapMagicResolutionApi() {
  const base = game?.genesysMagicResolution;
  if (!base?.cast || base.__strainSafetyV1802) return;
  const wrapped = Object.freeze({
    ...base,
    version: VERSION,
    __strainSafetyV1802: true,
    async cast(caster, input = {}) {
      assertMagicStrainCost(caster, STANDARD_MAGIC_STRAIN_COST);
      return base.cast(caster, input);
    }
  });
  Object.defineProperty(game, "genesysMagicResolution", { configurable: true, value: wrapped });
}

Hooks.once("ready", () => {
  wrapMagicApi();
  wrapMagicResolutionApi();
  console.log(`${SYSTEM_ID} | ${VERSION} Magic voluntary-strain safety gate ready`);
});