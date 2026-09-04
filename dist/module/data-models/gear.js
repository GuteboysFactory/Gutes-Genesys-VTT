import { equippedField, nonNegativeIntegerField, notesField, provenanceField } from "./item-fields.js";
export class GenesysGearData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            quantity: nonNegativeIntegerField(1),
            encumbrance: nonNegativeIntegerField(0),
            price: nonNegativeIntegerField(0),
            rarity: nonNegativeIntegerField(0, 10),
            equipped: equippedField(false),
            provenance: provenanceField(),
            notes: notesField()
        };
    }
}
//# sourceMappingURL=gear.js.map