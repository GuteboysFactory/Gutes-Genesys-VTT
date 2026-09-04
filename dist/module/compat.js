import { MIN_FOUNDRY_VERSION, SYSTEM_ID, SYSTEM_VERSION, TARGET_FOUNDRY_GENERATIONS } from "./constants.js";
export function getFoundryVersion() {
    return String(game?.version ?? game?.release?.version ?? "unknown");
}
export function getFoundryGeneration(version = getFoundryVersion()) {
    const match = String(version).match(/^(\d+)/);
    return match ? Number(match[1]) : null;
}
export function inspectRuntime() {
    const foundryVersion = getFoundryVersion();
    const foundryGeneration = getFoundryGeneration(foundryVersion);
    const requiredApis = {
        typeDataModel: Boolean(foundry?.abstract?.TypeDataModel),
        dataFields: Boolean(foundry?.data?.fields),
        arrayField: Boolean(foundry?.data?.fields?.ArrayField),
        stringField: Boolean(foundry?.data?.fields?.StringField),
        booleanField: Boolean(foundry?.data?.fields?.BooleanField),
        applicationV2: Boolean(foundry?.applications?.api?.ApplicationV2),
        handlebarsMixin: Boolean(foundry?.applications?.api?.HandlebarsApplicationMixin),
        actorSheetV2: Boolean(foundry?.applications?.sheets?.ActorSheetV2),
        itemSheetV2: Boolean(foundry?.applications?.sheets?.ItemSheetV2),
        sheetRegistry: Boolean(foundry?.applications?.apps?.DocumentSheetConfig?.registerSheet),
        actorDocument: Boolean(foundry?.documents?.Actor),
        itemDocument: Boolean(foundry?.documents?.Item),
        chatMessageDocument: Boolean(foundry?.documents?.ChatMessage)
    };
    return {
        systemId: SYSTEM_ID,
        systemVersion: SYSTEM_VERSION,
        foundryVersion,
        foundryGeneration,
        supportedGeneration: foundryGeneration !== null && TARGET_FOUNDRY_GENERATIONS.includes(foundryGeneration),
        requiredApis
    };
}
export function assertCompatibleRuntime() {
    const info = inspectRuntime();
    const missing = Object.entries(info.requiredApis).filter(([, ok]) => !ok).map(([key]) => key);
    if (!info.supportedGeneration) {
        console.warn(`${SYSTEM_ID} | Foundry ${info.foundryVersion} is outside the intended v13/v14 compatibility window.`);
    }
    if (missing.length) {
        throw new Error(`${SYSTEM_ID} ${SYSTEM_VERSION} cannot start: missing Foundry APIs: ${missing.join(", ")}`);
    }
    if (info.foundryGeneration === 13 && foundry.utils?.isNewerVersion && foundry.utils.isNewerVersion(MIN_FOUNDRY_VERSION, info.foundryVersion)) {
        throw new Error(`${SYSTEM_ID} ${SYSTEM_VERSION} requires Foundry ${MIN_FOUNDRY_VERSION} or newer.`);
    }
    return info;
}
//# sourceMappingURL=compat.js.map