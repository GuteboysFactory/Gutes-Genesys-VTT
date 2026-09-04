import { equippedField, nonNegativeIntegerField, notesField, provenanceField, qualitiesField } from "./item-fields.js";
const { StringField } = foundry.data.fields;
export class GenesysAttachmentData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            hardPointCost: nonNegativeIntegerField(1),
            installed: equippedField(false),
            hostItemId: new StringField({ required: true, nullable: false, initial: "" }),
            compatibleTypes: new StringField({ required: true, nullable: false, initial: "weapon, armor" }),
            price: nonNegativeIntegerField(0),
            rarity: nonNegativeIntegerField(0, 10),
            qualities: qualitiesField(),
            provenance: provenanceField(),
            notes: notesField()
        };
    }
}
//# sourceMappingURL=attachment.js.map