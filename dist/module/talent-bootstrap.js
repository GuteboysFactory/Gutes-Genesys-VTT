import { GenesysTalentData } from "./data-models/talent.js";
import { GenesysItemSheet } from "./sheets/item-sheet.js";
import { SYSTEM_ID } from "./constants.js";
import { createCoreParryTalent, createCoreSecondWindTalent, createTerrinothFinesseTalent, evaluateRuleElement, getApplicableRuleElements, normalizeRuleCost, normalizeRuleElement, normalizeRuleUsage, normalizeTalentDefinition, ruleElementToActiveAction, ruleElementToCheckModifier, ruleElementToReaction, rulePredicateMatches, usageScopeKey, validateRuleCost } from "../domain/rules/index.js";
import { actorHasTalent, actorRuleLifecycleContext, clearActorRuleUsage, collectActorRuleElements, collectActorTalents, endRuleEncounter, getActorRuleUsage, getRuleEncounterId, getRuleSessionId, grantCoreParry, grantCoreSecondWind, grantTerrinothFinesse, recordActorRuleUsage, registerRuleEngineSettings, startNewRuleEncounter, startNewRuleSession, talentDebug } from "./talent-service-foundation.js";
import { executeActorActiveTalent, listActorActiveTalentActions } from "./talent-action-service.js";

Hooks.once("init", () => {
    registerRuleEngineSettings();
    CONFIG.Item.dataModels.talent = GenesysTalentData;
    foundry.applications.apps.DocumentSheetConfig.registerSheet(foundry.documents.Item, SYSTEM_ID, GenesysItemSheet, {
        types: ["talent"],
        makeDefault: true,
        label: "GENESYS.Sheet.Item"
    });
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
                toReaction: ruleElementToReaction,
                toActiveAction: ruleElementToActiveAction
            }),
            talents: Object.freeze({
                coreParryDefinition: createCoreParryTalent,
                coreSecondWindDefinition: createCoreSecondWindTalent,
                terrinothFinesseDefinition: createTerrinothFinesseTalent,
                collect: collectActorTalents,
                has: actorHasTalent,
                lifecycleContext: actorRuleLifecycleContext,
                ruleElements: collectActorRuleElements,
                activeActions: listActorActiveTalentActions,
                executeActive: executeActorActiveTalent,
                usage: getActorRuleUsage,
                recordUsage: recordActorRuleUsage,
                clearUsage: clearActorRuleUsage,
                encounterId: getRuleEncounterId,
                startNewEncounter: startNewRuleEncounter,
                endEncounter: endRuleEncounter,
                sessionId: getRuleSessionId,
                startNewSession: startNewRuleSession,
                grantCoreParry,
                grantCoreSecondWind,
                grantTerrinothFinesse,
                debug: talentDebug
            })
        })
    });
    console.log(`${SYSTEM_ID} | 0.0.14D Rule Engine + active Talents ready`);
});