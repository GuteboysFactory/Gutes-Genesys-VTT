import { GenesysTalentData } from "./data-models/talent.js";
import { SYSTEM_ID } from "./constants.js";
import { createCoreParryTalent, createTerrinothFinesseTalent, evaluateRuleElement, getApplicableRuleElements, normalizeRuleCost, normalizeRuleElement, normalizeRuleUsage, normalizeTalentDefinition, ruleElementToCheckModifier, ruleElementToReaction, rulePredicateMatches, usageScopeKey, validateRuleCost } from "../domain/rules/index.js";
import { actorHasTalent, actorRuleLifecycleContext, clearActorRuleUsage, collectActorRuleElements, collectActorTalents, getActorRuleUsage, getRuleSessionId, grantCoreParry, grantTerrinothFinesse, recordActorRuleUsage, registerRuleEngineSettings, startNewRuleSession, talentDebug } from "./talent-service-foundation.js";

Hooks.once("init", () => {
    registerRuleEngineSettings();
    CONFIG.Item.dataModels.talent = GenesysTalentData;
});

Hooks.once("ready", () => {
    Object.defineProperty(game, "genesysRules", {
        configurable: true,
        value: Object.freeze({
            rules: Object.freeze({
                predicateMatches: rulePredicateMatches,
                normalizeCost: normalizeRuleCost,
                validateCost: validateRuleCost,
                normalizeUsage: normalizeRuleUsage,
                usageScopeKey,
                normalizeElement: normalizeRuleElement,
                normalizeTalent: normalizeTalentDefinition,
                evaluateElement: evaluateRuleElement,
                applicable: getApplicableRuleElements,
                toCheckModifier: ruleElementToCheckModifier,
                toReaction: ruleElementToReaction
            }),
            talents: Object.freeze({
                coreParryDefinition: createCoreParryTalent,
                terrinothFinesseDefinition: createTerrinothFinesseTalent,
                collect: collectActorTalents,
                has: actorHasTalent,
                lifecycleContext: actorRuleLifecycleContext,
                ruleElements: collectActorRuleElements,
                usage: getActorRuleUsage,
                recordUsage: recordActorRuleUsage,
                clearUsage: clearActorRuleUsage,
                sessionId: getRuleSessionId,
                startNewSession: startNewRuleSession,
                grantCoreParry,
                grantTerrinothFinesse,
                debug: talentDebug
            })
        })
    });
    console.log(`${SYSTEM_ID} | 0.0.14A Rule Engine foundation ready`);
});
