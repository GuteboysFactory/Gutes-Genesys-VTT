import { equippedField, notesField, provenanceField } from "./item-fields.js";
const { ArrayField, NumberField, StringField } = foundry.data.fields;

function optionalNonNegativeInteger(initial = null, max = undefined) {
    return new NumberField({ required: true, nullable: true, integer: true, min: 0, ...(max === undefined ? {} : { max }), initial });
}

export class GenesysImplementData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            damage: optionalNonNegativeInteger(0),
            encumbrance: optionalNonNegativeInteger(0),
            price: optionalNonNegativeInteger(null),
            rarity: optionalNonNegativeInteger(null, 10),
            priceMode: new StringField({ required: true, nullable: false, initial: "priced" }),
            materialId: new StringField({ required: true, nullable: false, initial: "" }),
            tags: new ArrayField(new StringField({ required: true, nullable: false, initial: "" }), { required: true, nullable: false, initial: [] }),
            equipped: equippedField(false),
            provenance: provenanceField(),
            notes: notesField()
        };
    }
}
