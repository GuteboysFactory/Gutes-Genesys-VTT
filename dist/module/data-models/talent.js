const { ArrayField, BooleanField, NumberField, ObjectField, StringField } = foundry.data.fields;
export class GenesysTalentData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            sourceId: new StringField({ required: true, nullable: false, blank: false, initial: "custom-talent" }),
            sourceType: new StringField({ required: true, nullable: false, initial: "custom" }),
            tier: new NumberField({ required: true, nullable: false, integer: true, min: 1, max: 5, initial: 1 }),
            ranked: new BooleanField({ required: true, nullable: false, initial: false }),
            rank: new NumberField({ required: true, nullable: false, integer: true, min: 1, max: 99, initial: 1 }),
            activation: new StringField({ required: true, nullable: false, initial: "passive" }),
            enabled: new BooleanField({ required: true, nullable: false, initial: true }),
            tags: new ArrayField(new StringField({ required: true, nullable: false, initial: "" }), { required: true, nullable: false, initial: [] }),
            rules: new ArrayField(new ObjectField({ required: true, nullable: false, initial: {} }), { required: true, nullable: false, initial: [] }),
            notes: new StringField({ required: true, nullable: false, initial: "" })
        };
    }
}
