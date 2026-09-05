import { equippedField, nonNegativeIntegerField, notesField, provenanceField, qualitiesField } from "./item-fields.js";
const { StringField } = foundry.data.fields;
export class GenesysArmorData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            soak: nonNegativeIntegerField(0),
            defense: nonNegativeIntegerField(0),
            encumbrance: nonNegativeIntegerField(0),
            hardPoints: nonNegativeIntegerField(0),
            price: nonNegativeIntegerField(0),
            rarity: nonNegativeIntegerField(0, 10),
            craftsmanshipId: new StringField({ required: true, nullable: false, initial: "" }),
            craftsmanshipSourceId: new StringField({ required: true, nullable: false, initial: "" }),
            equipped: equippedField(false),
            qualities: qualitiesField(),
            provenance: provenanceField(),
            notes: notesField()
        };
    }
}
//# sourceMappingURL=armor.js.map
