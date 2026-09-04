import { equippedField, nonNegativeIntegerField, notesField, provenanceField, qualitiesField } from "./item-fields.js";
const { StringField } = foundry.data.fields;
export class GenesysWeaponData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            skillId: new StringField({ required: true, nullable: false, blank: false, initial: "melee" }),
            attackMode: new StringField({ required: true, nullable: false, blank: false, initial: "auto" }),
            engagedProfile: new StringField({ required: true, nullable: false, blank: false, initial: "auto" }),
            damageCharacteristic: new StringField({ required: true, nullable: false, blank: false, initial: "auto" }),
            damage: nonNegativeIntegerField(0),
            critical: nonNegativeIntegerField(0),
            range: new StringField({ required: true, nullable: false, blank: false, initial: "engaged" }),
            encumbrance: nonNegativeIntegerField(0),
            hardPoints: nonNegativeIntegerField(0),
            price: nonNegativeIntegerField(0),
            rarity: nonNegativeIntegerField(0, 10),
            equipped: equippedField(true),
            qualities: qualitiesField(),
            provenance: provenanceField(),
            notes: notesField()
        };
    }
}
//# sourceMappingURL=weapon.js.map