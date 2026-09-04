import { DIE_FACES, DIE_TYPES, emptyDicePool, normalizeDicePool, resolveRolledDice, rollDie, rollNarrativePool } from "./domain/dice/index.js";
import { predicateMatches, prepareAssistedCheck, prepareCompetitiveCheck, prepareOpposedCheck, prepareStandardCheck, resolveCompetitiveResults } from "./domain/checks/index.js";
import { normalizeStoryPointState, prepareStoryPointTransaction } from "./domain/story-points/index.js";
import { CORE_QUALITY_DEFINITIONS, formatQualityText, getQualityDefinition, normalizeQualityStates, normalizeWeaponRuleData, parseQualityText, prepareWeaponAttack, qualityCheckModifiers } from "./domain/items/index.js";
import { applyPersonalDamage, applyReactionToPendingCombat, buildCombatCommitPlan, createPendingCombatResolution, finalizePendingCombatResolution, getAttackDifficulty, prepareCombatWeaponAttack, resolveAttackMode, resolveCombatAttack, resolveDamageCharacteristic, resolveEngagedProfile } from "./domain/combat/index.js";
import { addDice, applyPoolModifiers, buildSkillPool, buildStandardBasePool, constructStandardPool, downgradeNegative, downgradePositive, removeDice, upgradeNegative, upgradePositive } from "./domain/pool/index.js";
import { settingProfiles } from "./domain/profiles/index.js";
import { CORE_SKILL_DEFINITIONS, prepareSkillCheck, synchronizeSkillStates } from "./domain/skills/index.js";
import { GenesysCharacterData } from "./module/data-models/character.js";
import { GenesysWeaponData } from "./module/data-models/weapon.js";
import { GenesysArmorData } from "./module/data-models/armor.js";
import { GenesysGearData } from "./module/data-models/gear.js";
import { GenesysAttachmentData } from "./module/data-models/attachment.js";
import { rollPoolToChat } from "./module/dice-ui.js";
import { prepareActorSkillCheck, rollPreparedSkillCheckToChat } from "./module/skill-ui.js";
import { prepareActorSkillEngineCheck, rollPreparedActorCheckToChat } from "./module/check-ui.js";
import { GenesysCharacterSheet } from "./module/sheets/character-sheet.js";
import { GenesysItemSheet } from "./module/sheets/item-sheet.js";
import { SYSTEM_ID, SYSTEM_VERSION } from "./module/constants.js";
import { assertCompatibleRuntime, inspectRuntime } from "./module/compat.js";
import { getActiveProfileId, getActiveSkillDefinitions, registerRulesProfileSetting, synchronizeActorSkills, synchronizeWorldCharacterSkills, updateActorSkillState } from "./module/skills-service.js";
import { buildInventoryRows, prepareActorWeaponAttack, rollActorWeaponToChat, rollPreparedWeaponAttackToChat } from "./module/items-service.js";
import { actorCombatSnapshot, applyCombatResolutionToActor, buildCombatReactionContext, combatLiveStateDebug, commitPendingCombatResolutionToActor, listCombatTargets, resolveCombatTargetReference, prepareActorCombatAttack, resolveCombatReactionWindow, rollActorCombatAttackToChat } from "./module/combat-service.js";
import { collectActorReactions, getDevReactionState, registerBuiltInReactionProviders, registerReactionProvider, setDevReactionState } from "./module/reaction-service.js";
import { createCoreParryReaction, evaluateReaction, formatReactionCost, getEligibleReactions, normalizeReactionCost } from "./domain/reactions/index.js";
import { CORE_CRITICAL_INJURY_TABLE, activeCriticalCount, applyPermanentCharacteristicReduction, criticalCharacteristicFromD10, criticalRollBonus, lookupCriticalInjury, resolveCriticalInjury, resolveCriticalSecondary, rollCriticalInjury, rollCriticalSecondary } from "./domain/criticals/index.js";
import { CORE_CONDITIONS, advanceTurnConditionDurations, conditionRules, makeConditionState, summarizeConditions } from "./domain/conditions/index.js";
import { applyActorCriticalSecondary, buildCriticalSheetRows, getActorCriticalInjuries, getActorCriticalModifier, healCriticalInjury, inflictCriticalInjury, promptCriticalSecondaryResolution, resolveActorCriticalSecondary } from "./module/critical-service.js";
import { addActorCondition, advanceActorTurnConditions, getActorConditionCheckModifiers, getActorConditionRules, getActorConditionSummary, getActorConditions, removeActorCondition } from "./module/condition-service.js";
import { activationForActor, adjustInitiativeRound, availableActivationsForActor, baseActivationCount, buildActivationEntitlements, buildInitiativeSlots, canClaimCurrentSlot, claimCurrentInitiativeSlot, completeCurrentInitiativeSlot, currentInitiativeSlot, emptyInitiativeState, endInitiativeEncounter, forceClaimInitiativeActor, forceClaimInitiativeActivation, initiativeEntryForActor, initiativeEntryFromRoll, markInitiativeActorActed, markInitiativeActorUnacted, moveInitiativeSlot, normalizeInitiativeState, recordInitiativeEntry, removeInitiativeEntry, restoreInitiativeActivation, rewindInitiativeTurn, setInitiativeMode, setInitiativeSlotSide, sortInitiativeEntries, spendTurnAction, spendTurnManeuver, startInitiativeEncounter, startNextInitiativeRound, unresolvedExtraActivations, usedActivationCount, waiveInitiativeActivation, unclaimInitiativeTurn } from "./domain/initiative/index.js";
import { addSceneInitiativeParticipant, adjustSceneInitiativeRound, claimSceneInitiativeActivation, claimSceneInitiativeSlot, endSceneInitiativeEncounter, endSceneInitiativeTurn, forceClaimSceneInitiativeActor, forceClaimSceneInitiativeActivation, getActorActivationEligibility, getInitiativeSheetContext, initiativeDebug, markSceneActorActed, markSceneActorUnacted, moveSceneSlot, readSceneInitiativeState, removeSceneInitiativeParticipant, pendingSceneSpecialActivations, resetSceneInitiative, resolveInitiativeActorReference, restoreSceneInitiativeActivation, rewindSceneInitiativeTurn, rollActorInitiative, setSceneInitiativeMode, setSceneSlotSide, startNextSceneInitiativeRound, startSceneInitiative, unclaimSceneInitiative, useSceneTurnAction, useSceneTurnManeuver, waiveSceneInitiativeActivation, writeSceneInitiativeState } from "./module/initiative-service.js";
import { getEncounterTracker, openEncounterTracker } from "./module/apps/encounter-tracker.js";
import { narrativeHealthState } from "./domain/encounter/index.js";
import { activationEligibility, actorRoleLabel, applyMinionCritical, minionGroupSkillRank, minionGroupWoundThreshold, minionSkillRank, normalizeActorRole, normalizeAdversaryProfile, normalizeMinionGroup, resolveMinionAreaHit, routeDamageForActorRole, silhouetteDifficultyModifier, suffersAutomaticThresholdCritical, tracksStrainNormally } from "./domain/adversaries/index.js";
import { actorAdversaryContext, actorEffectiveSkillRank, applyActorRoleDamage, updateActorMinionGroupSkill } from "./module/adversary-service.js";
Hooks.once("init", () => {
    const runtime = assertCompatibleRuntime();
    registerRulesProfileSetting();
    registerBuiltInReactionProviders();
    CONFIG.Actor.dataModels.character = GenesysCharacterData;
    CONFIG.Item.dataModels.weapon = GenesysWeaponData;
    CONFIG.Item.dataModels.armor = GenesysArmorData;
    CONFIG.Item.dataModels.gear = GenesysGearData;
    CONFIG.Item.dataModels.attachment = GenesysAttachmentData;
    foundry.applications.apps.DocumentSheetConfig.registerSheet(foundry.documents.Actor, SYSTEM_ID, GenesysCharacterSheet, {
        types: ["character"],
        makeDefault: true,
        label: "GENESYS.Sheet.Character"
    });
    foundry.applications.apps.DocumentSheetConfig.registerSheet(foundry.documents.Item, SYSTEM_ID, GenesysItemSheet, {
        types: ["weapon", "armor", "gear", "attachment"],
        makeDefault: true,
        label: "GENESYS.Sheet.Item"
    });
    CONFIG.Actor.trackableAttributes = {
        character: {
            bar: ["wounds", "strain"],
            value: ["soak", "defense.melee", "defense.ranged"]
        }
    };
    console.log(`${SYSTEM_ID} | ${SYSTEM_VERSION} initialized on Foundry ${runtime.foundryVersion}`);
});
Hooks.on("createActor", async (actor) => {
    if (actor?.type !== "character" || !actor?.isOwner)
        return;
    await synchronizeActorSkills(actor);
});
Hooks.on("updateActor", () => {
    const tracker = getEncounterTracker();
    if (tracker?.rendered)
        void tracker.render({ force: true });
});
Hooks.on("updateToken", () => {
    const tracker = getEncounterTracker();
    if (tracker?.rendered)
        void tracker.render({ force: true });
});
Hooks.once("ready", async () => {
    const runtime = inspectRuntime();
    const migratedActors = await synchronizeWorldCharacterSkills();
    Object.defineProperty(game, "genesysVtt", {
        configurable: true,
        value: Object.freeze({
            version: SYSTEM_VERSION,
            runtime,
            diagnostics: () => inspectRuntime(),
            dice: Object.freeze({
                types: DIE_TYPES,
                faces: DIE_FACES,
                emptyPool: emptyDicePool,
                normalizePool: normalizeDicePool,
                rollDie,
                roll: rollNarrativePool,
                resolve: resolveRolledDice,
                rollToChat: rollPoolToChat
            }),
            pool: Object.freeze({
                buildSkillPool,
                buildStandardBasePool,
                addDice,
                upgradePositive,
                upgradeNegative,
                downgradePositive,
                downgradeNegative,
                removeDice,
                applyModifiers: applyPoolModifiers,
                constructStandard: constructStandardPool
            }),
            checks: Object.freeze({
                predicateMatches,
                prepareStandard: prepareStandardCheck,
                prepareOpposed: prepareOpposedCheck,
                prepareAssisted: prepareAssistedCheck,
                prepareCompetitive: prepareCompetitiveCheck,
                resolveCompetitive: resolveCompetitiveResults,
                prepareActorSkill: prepareActorSkillEngineCheck,
                rollPreparedActorSkillToChat: rollPreparedActorCheckToChat
            }),
            storyPoints: Object.freeze({
                normalizeState: normalizeStoryPointState,
                prepareTransaction: prepareStoryPointTransaction
            }),
            combat: Object.freeze({
                getAttackDifficulty,
                resolveAttackMode,
                resolveEngagedProfile,
                resolveDamageCharacteristic,
                prepareWeaponAttack: prepareCombatWeaponAttack,
                resolveAttack: resolveCombatAttack,
                createPendingResolution: createPendingCombatResolution,
                applyReaction: applyReactionToPendingCombat,
                finalizePendingResolution: finalizePendingCombatResolution,
                buildCommitPlan: buildCombatCommitPlan,
                applyPersonalDamage,
                actorSnapshot: actorCombatSnapshot,
                liveStateDebug: combatLiveStateDebug,
                listTargets: listCombatTargets,
                resolveTarget: resolveCombatTargetReference,
                prepareActorAttack: prepareActorCombatAttack,
                buildReactionContext: buildCombatReactionContext,
                resolveReactionWindow: resolveCombatReactionWindow,
                commitPendingToActor: commitPendingCombatResolutionToActor,
                applyResolutionToActor: applyCombatResolutionToActor,
                rollActorAttackToChat: rollActorCombatAttackToChat
            }),
            criticals: Object.freeze({
                table: CORE_CRITICAL_INJURY_TABLE,
                lookup: lookupCriticalInjury,
                bonus: criticalRollBonus,
                resolve: resolveCriticalInjury,
                roll: rollCriticalInjury,
                characteristicFromD10: criticalCharacteristicFromD10,
                resolveSecondary: resolveCriticalSecondary,
                rollSecondary: rollCriticalSecondary,
                applyPermanentReduction: applyPermanentCharacteristicReduction,
                activeCount: activeCriticalCount,
                actorList: getActorCriticalInjuries,
                actorModifier: getActorCriticalModifier,
                inflictActor: inflictCriticalInjury,
                resolveActorSecondary: resolveActorCriticalSecondary,
                applyActorSecondary: applyActorCriticalSecondary,
                promptActorSecondary: promptCriticalSecondaryResolution,
                healActor: healCriticalInjury,
                sheetRows: buildCriticalSheetRows
            }),
            conditions: Object.freeze({
                catalog: CORE_CONDITIONS,
                summarize: summarizeConditions,
                rules: conditionRules,
                makeState: makeConditionState,
                advanceTurnDurations: advanceTurnConditionDurations,
                actorList: getActorConditions,
                actorSummary: getActorConditionSummary,
                actorRules: getActorConditionRules,
                actorCheckModifiers: getActorConditionCheckModifiers,
                advanceActorTurn: advanceActorTurnConditions,
                addActor: addActorCondition,
                removeActor: removeActorCondition
            }),
            adversaries: Object.freeze({
                activationEligibility,
                normalizeRole: normalizeActorRole,
                roleLabel: actorRoleLabel,
                normalizeProfile: normalizeAdversaryProfile,
                silhouetteModifier: silhouetteDifficultyModifier,
                normalizeMinionGroup,
                minionGroupWoundThreshold,
                minionGroupSkillRank,
                minionSkillRank,
                applyMinionCritical,
                resolveMinionAreaHit,
                routeDamageForRole: routeDamageForActorRole,
                tracksStrainNormally,
                automaticThresholdCritical: suffersAutomaticThresholdCritical,
                actorContext: actorAdversaryContext,
                actorEffectiveSkillRank,
                updateActorMinionGroupSkill,
                applyActorRoleDamage
            }),
            initiative: Object.freeze({
                emptyState: emptyInitiativeState,
                normalizeState: normalizeInitiativeState,
                buildActivations: buildActivationEntitlements,
                activationForActor,
                availableActivationsForActor,
                unresolvedExtraActivations,
                usedActivationCount,
                baseActivationCount,
                setMode: setInitiativeMode,
                forceClaimActor: forceClaimInitiativeActor,
                forceClaimActivation: forceClaimInitiativeActivation,
                unclaimTurn: unclaimInitiativeTurn,
                markActed: markInitiativeActorActed,
                markUnacted: markInitiativeActorUnacted,
                moveSlot: moveInitiativeSlot,
                setSlotSide: setInitiativeSlotSide,
                rewindTurn: rewindInitiativeTurn,
                adjustRound: adjustInitiativeRound,
                entryFromRoll: initiativeEntryFromRoll,
                sortEntries: sortInitiativeEntries,
                buildSlots: buildInitiativeSlots,
                recordEntry: recordInitiativeEntry,
                removeEntry: removeInitiativeEntry,
                startEncounter: startInitiativeEncounter,
                startNextRound: startNextInitiativeRound,
                waiveActivation: waiveInitiativeActivation,
                restoreActivation: restoreInitiativeActivation,
                endEncounter: endInitiativeEncounter,
                currentSlot: currentInitiativeSlot,
                entryForActor: initiativeEntryForActor,
                canClaim: canClaimCurrentSlot,
                claimSlot: claimCurrentInitiativeSlot,
                useAction: spendTurnAction,
                useManeuver: spendTurnManeuver,
                completeSlot: completeCurrentInitiativeSlot,
                sceneState: readSceneInitiativeState,
                writeSceneState: writeSceneInitiativeState,
                setSceneMode: setSceneInitiativeMode,
                addSceneParticipant: addSceneInitiativeParticipant,
                removeSceneParticipant: removeSceneInitiativeParticipant,
                endScene: endSceneInitiativeEncounter,
                forceClaimSceneActor: forceClaimSceneInitiativeActor,
                forceClaimSceneActivation: forceClaimSceneInitiativeActivation,
                unclaimScene: unclaimSceneInitiative,
                markSceneActed: markSceneActorActed,
                markSceneUnacted: markSceneActorUnacted,
                moveSceneSlot,
                setSceneSlotSide,
                rewindSceneTurn: rewindSceneInitiativeTurn,
                adjustSceneRound: adjustSceneInitiativeRound,
                resolveActorRef: resolveInitiativeActorReference,
                rollActor: rollActorInitiative,
                startScene: startSceneInitiative,
                startNextSceneRound: startNextSceneInitiativeRound,
                waiveSceneActivation: waiveSceneInitiativeActivation,
                restoreSceneActivation: restoreSceneInitiativeActivation,
                resetScene: resetSceneInitiative,
                claimSceneSlot: claimSceneInitiativeSlot,
                claimSceneActivation: claimSceneInitiativeActivation,
                actorActivationEligibility: getActorActivationEligibility,
                pendingSceneSpecials: pendingSceneSpecialActivations,
                useSceneAction: useSceneTurnAction,
                useSceneManeuver: useSceneTurnManeuver,
                endSceneTurn: endSceneInitiativeTurn,
                actorContext: getInitiativeSheetContext,
                debug: initiativeDebug
            }),
            encounter: Object.freeze({
                open: openEncounterTracker,
                healthState: narrativeHealthState
            }),
            reactions: Object.freeze({
                normalizeCost: normalizeReactionCost,
                evaluate: evaluateReaction,
                eligible: getEligibleReactions,
                formatCost: formatReactionCost,
                coreParry: createCoreParryReaction,
                registerProvider: registerReactionProvider,
                collectForActor: collectActorReactions,
                getDevState: getDevReactionState,
                setDevState: setDevReactionState
            }),
            items: Object.freeze({
                qualityCatalog: CORE_QUALITY_DEFINITIONS,
                getQuality: getQualityDefinition,
                normalizeQualities: normalizeQualityStates,
                parseQualities: parseQualityText,
                formatQualities: formatQualityText,
                qualityCheckModifiers,
                normalizeWeapon: normalizeWeaponRuleData,
                prepareWeaponAttack,
                buildInventoryRows,
                prepareActorWeaponAttack,
                rollPreparedWeaponAttackToChat,
                rollActorWeaponToChat
            }),
            skills: Object.freeze({
                coreCatalog: CORE_SKILL_DEFINITIONS,
                active: getActiveSkillDefinitions,
                synchronizeStates: synchronizeSkillStates,
                prepareCheck: prepareSkillCheck,
                prepareActorCheck: prepareActorSkillCheck,
                updateActorState: updateActorSkillState,
                repairActor: synchronizeActorSkills,
                rollActorCheckToChat: async (actor, skillId, difficulty = 2) => {
                    const prepared = prepareActorSkillCheck(actor, skillId, difficulty);
                    return rollPreparedSkillCheckToChat(prepared, actor?.name ?? "Genesys Skill Check");
                }
            }),
            profiles: Object.freeze({
                activeId: getActiveProfileId,
                list: () => settingProfiles.list(),
                get: (id) => settingProfiles.get(id),
                resolveSkills: (id) => settingProfiles.resolveSkills(id)
            })
        })
    });
    if (game?.user?.isGM && readSceneInitiativeState().status === "active") {
        globalThis.setTimeout(() => openEncounterTracker(), 0);
    }
    console.log(`${SYSTEM_ID} | ready`, { ...runtime, activeProfile: getActiveProfileId(), migratedActors });
});
//# sourceMappingURL=genesys.js.map