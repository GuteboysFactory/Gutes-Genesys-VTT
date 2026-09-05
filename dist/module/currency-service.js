const SYSTEM_ID = "genesys-vtt";
export const CURRENCY_SOURCE_SETTING = "currencySource";
export const CURRENCY_NAME_SETTING = "currencyName";
export const CURRENCY_SHORT_SETTING = "currencyShort";

function text(value, fallback = "") {
    const out = String(value ?? fallback).trim();
    return out || fallback;
}

function settingValue(key, fallback = "") {
    try {
        return game.settings.get(SYSTEM_ID, key) ?? fallback;
    }
    catch {
        return fallback;
    }
}

export function registerCurrencySettings() {
    game.settings.register(SYSTEM_ID, CURRENCY_SOURCE_SETTING, {
        name: "Currency Source",
        hint: "Use the active setting's default currency or override it for this world.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "setting-default": "Setting Default",
            custom: "Custom"
        },
        default: "setting-default"
    });
    game.settings.register(SYSTEM_ID, CURRENCY_NAME_SETTING, {
        name: "Custom Currency Name",
        hint: "Used when Currency Source is Custom, for example Gold Crowns or Credits.",
        scope: "world",
        config: true,
        type: String,
        default: "Funds"
    });
    game.settings.register(SYSTEM_ID, CURRENCY_SHORT_SETTING, {
        name: "Custom Currency Short",
        hint: "Optional short label or symbol, for example GC, cr, or sp.",
        scope: "world",
        config: true,
        type: String,
        default: ""
    });
}

export function resolveCurrencyDisplay(settingId = "") {
    const source = text(settingValue(CURRENCY_SOURCE_SETTING, "setting-default"), "setting-default");
    if (source === "custom") {
        return Object.freeze({
            source,
            label: text(settingValue(CURRENCY_NAME_SETTING, "Funds"), "Funds"),
            short: text(settingValue(CURRENCY_SHORT_SETTING, ""), "")
        });
    }
    const currency = game?.genesysContent?.getCurrency?.(settingId) ?? {};
    const primary = Array.isArray(currency.denominations) ? currency.denominations[0] : null;
    return Object.freeze({
        source: "setting-default",
        label: text(currency.label ?? primary?.label, "Funds"),
        short: text(primary?.abbreviation, "")
    });
}

Hooks.once("init", () => registerCurrencySettings());
Hooks.once("ready", () => {
    Object.defineProperty(game, "genesysCurrency", {
        configurable: true,
        value: Object.freeze({
            resolve: resolveCurrencyDisplay,
            settings: Object.freeze({
                source: CURRENCY_SOURCE_SETTING,
                name: CURRENCY_NAME_SETTING,
                short: CURRENCY_SHORT_SETTING
            })
        })
    });
});
