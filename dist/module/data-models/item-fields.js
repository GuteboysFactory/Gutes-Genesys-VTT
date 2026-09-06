const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;
export function nonNegativeIntegerField(initial = 0, max) {
    return new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        ...(max === undefined ? {} : { max }),
        initial
    });
}
export function provenanceField() {
    return new SchemaField({
        sourceId: new StringField({ required: true, nullable: false, initial: "custom" }),
        sourceType: new StringField({ required: true, nullable: false, initial: "custom" }),
        sourceUuid: new StringField({ required: true, nullable: false, initial: "" }),
        sourceVersion: new StringField({ required: true, nullable: false, initial: "" }),
        settingId: new StringField({ required: true, nullable: false, initial: "" })
    });
}
export function qualityStateField() {
    return new SchemaField({
        id: new StringField({ required: true, nullable: false, blank: false, initial: "accurate" }),
        rank: nonNegativeIntegerField(1)
    });
}
export function qualitiesField() {
    return new ArrayField(qualityStateField(), { required: true, nullable: false, initial: [] });
}
export function equippedField(initial = false) {
    return new BooleanField({ required: true, nullable: false, initial });
}
export function notesField() {
    return new StringField({ required: true, nullable: false, initial: "" });
}
//# sourceMappingURL=item-fields.js.map
