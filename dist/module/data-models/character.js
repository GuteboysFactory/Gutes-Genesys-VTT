const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;
function characteristicField(initial = 2) {
    return new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 1,
        max: 6,
        initial
    });
}
function resourceField(threshold) {
    return new SchemaField({
        value: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
        threshold: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: threshold })
    });
}
function skillStateField() {
    return new SchemaField({
        id: new StringField({ required: true, nullable: false, blank: false, initial: "unknown" }),
        rank: new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 5, initial: 0 }),
        career: new BooleanField({ required: true, nullable: false, initial: false }),
        characteristicOverride: new StringField({ required: true, nullable: false, initial: "" }),
        sourceId: new StringField({ required: true, nullable: false, blank: false, initial: "custom" })
    });
}
function criticalInjuryField() {
    return new SchemaField({
        id: new StringField({ required: true, nullable: false, blank: false, initial: "critical" }),
        rawRoll: new NumberField({ required: true, nullable: false, integer: true, min: 1, max: 100, initial: 1 }),
        total: new NumberField({ required: true, nullable: false, integer: true, min: 1, initial: 1 }),
        name: new StringField({ required: true, nullable: false, initial: "Critical Injury" }),
        effect: new StringField({ required: true, nullable: false, initial: "" }),
        severity: new StringField({ required: true, nullable: false, initial: "easy" }),
        difficulty: new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 4, initial: 1 }),
        sourceId: new StringField({ required: true, nullable: false, initial: "core:critical-injury" }),
        active: new BooleanField({ required: true, nullable: false, initial: true }),
        createdAt: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
        secondaryStatus: new StringField({ required: true, nullable: false, initial: "none" }),
        secondaryKind: new StringField({ required: true, nullable: false, initial: "" }),
        secondaryMode: new StringField({ required: true, nullable: false, initial: "" }),
        secondaryRawRoll: new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 10, initial: 0 }),
        secondaryRolledCharacteristic: new StringField({ required: true, nullable: false, initial: "" }),
        affectedCharacteristic: new StringField({ required: true, nullable: false, initial: "" }),
        secondaryAmount: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
        secondaryMinimum: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
        secondaryBefore: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
        secondaryAfter: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
        secondaryOverridden: new BooleanField({ required: true, nullable: false, initial: false })
    });
}
function conditionStateField() {
    return new SchemaField({
        id: new StringField({ required: true, nullable: false, blank: false, initial: "condition" }),
        conditionId: new StringField({ required: true, nullable: false, blank: false, initial: "disoriented" }),
        sourceId: new StringField({ required: true, nullable: false, initial: "core-condition:disoriented" }),
        durationType: new StringField({ required: true, nullable: false, initial: "manual" }),
        remaining: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
        active: new BooleanField({ required: true, nullable: false, initial: true }),
        createdAt: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 })
    });
}
function minionGroupField() {
    return new SchemaField({
        members: new NumberField({ required: true, nullable: false, integer: true, min: 1, max: 50, initial: 1 }),
        memberWoundThreshold: new NumberField({ required: true, nullable: false, integer: true, min: 1, max: 100, initial: 5 }),
        casualties: new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 50, initial: 0 }),
        groupSkillIds: new ArrayField(new StringField({ required: true, nullable: false, blank: false, initial: "athletics" }), { required: true, nullable: false, initial: [] })
    });
}
function profileField() {
    return new SchemaField({
        archetype: new StringField({ required: true, nullable: false, initial: "" }),
        career: new StringField({ required: true, nullable: false, initial: "" }),
        motivation: new StringField({ required: true, nullable: false, initial: "" }),
        background: new StringField({ required: true, nullable: false, initial: "" }),
        notes: new StringField({ required: true, nullable: false, initial: "" })
    });
}
export class GenesysCharacterData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            role: new StringField({ required: true, nullable: false, initial: "pc" }),
            silhouette: new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 10, initial: 1 }),
            adversaryRank: new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 10, initial: 0 }),
            extraActivations: new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 10, initial: 0 }),
            minionGroup: minionGroupField(),
            profile: profileField(),
            characteristics: new SchemaField({
                brawn: characteristicField(),
                agility: characteristicField(),
                intellect: characteristicField(),
                cunning: characteristicField(),
                willpower: characteristicField(),
                presence: characteristicField()
            }),
            wounds: resourceField(10),
            strain: resourceField(10),
            soak: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 2 }),
            defense: new SchemaField({
                melee: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
                ranged: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 })
            }),
            skills: new ArrayField(skillStateField(), { required: true, nullable: false, initial: [] }),
            criticalInjuries: new ArrayField(criticalInjuryField(), { required: true, nullable: false, initial: [] }),
            conditions: new ArrayField(conditionStateField(), { required: true, nullable: false, initial: [] })
        };
    }
}
//# sourceMappingURL=character.js.map