import { GenesysImplementData } from "./data-models/implement.js";
import { GenesysItemSheet } from "./sheets/item-sheet.js";
import { SYSTEM_ID } from "./constants.js";

Hooks.once("init", () => {
    CONFIG.Item.dataModels.implement = GenesysImplementData;
    foundry.applications.apps.DocumentSheetConfig.registerSheet(foundry.documents.Item, SYSTEM_ID, GenesysItemSheet, {
        types: ["implement"],
        makeDefault: true,
        label: "GENESYS.Sheet.Item"
    });
});
