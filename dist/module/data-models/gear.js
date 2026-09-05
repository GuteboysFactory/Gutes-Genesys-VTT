import { equippedField, nonNegativeIntegerField, notesField, provenanceField } from "./item-fields.js";
const { BooleanField, StringField } = foundry.data.fields;
export class GenesysGearData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            quantity: nonNegativeIntegerField(1),
            encumbrance: nonNegativeIntegerField(0),
            price: nonNegativeIntegerField(0),
            rarity: nonNegativeIntegerField(0, 10),
            category: new StringField({ required: true, nullable: false, initial: "gear" }),
            consumable: new BooleanField({ required: true, nullable: false, initial: false }),
            activation: new StringField({ required: true, nullable: false, initial: "" }),
            equipped: equippedField(false),
            provenance: provenanceField(),
            notes: notesField()
        };
    }
}
//# sourceMappingURL=gear.js.map
