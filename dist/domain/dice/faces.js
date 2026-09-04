const face = (symbols = {}) => Object.freeze({ symbols: Object.freeze({ ...symbols }) });
/**
 * Genesys Narrative Dice face definitions.
 * Triumph and Despair are represented as special symbols only here.
 * Their associated Success/Failure contribution is applied exactly once by the resolver.
 */
export const DIE_FACES = Object.freeze({
    boost: Object.freeze([
        face(),
        face(),
        face({ success: 1 }),
        face({ success: 1, advantage: 1 }),
        face({ advantage: 2 }),
        face({ advantage: 1 })
    ]),
    setback: Object.freeze([
        face(),
        face(),
        face({ failure: 1 }),
        face({ failure: 1 }),
        face({ threat: 1 }),
        face({ threat: 1 })
    ]),
    ability: Object.freeze([
        face(),
        face({ success: 1 }),
        face({ success: 1 }),
        face({ success: 2 }),
        face({ advantage: 1 }),
        face({ advantage: 1 }),
        face({ success: 1, advantage: 1 }),
        face({ advantage: 2 })
    ]),
    difficulty: Object.freeze([
        face(),
        face({ failure: 1 }),
        face({ failure: 2 }),
        face({ threat: 1 }),
        face({ threat: 1 }),
        face({ threat: 1 }),
        face({ threat: 2 }),
        face({ failure: 1, threat: 1 })
    ]),
    proficiency: Object.freeze([
        face(),
        face({ success: 1 }),
        face({ success: 1 }),
        face({ success: 2 }),
        face({ success: 2 }),
        face({ advantage: 1 }),
        face({ success: 1, advantage: 1 }),
        face({ success: 1, advantage: 1 }),
        face({ success: 1, advantage: 1 }),
        face({ advantage: 2 }),
        face({ advantage: 2 }),
        face({ triumph: 1 })
    ]),
    challenge: Object.freeze([
        face(),
        face({ failure: 1 }),
        face({ failure: 1 }),
        face({ failure: 2 }),
        face({ failure: 2 }),
        face({ threat: 1 }),
        face({ threat: 1 }),
        face({ failure: 1, threat: 1 }),
        face({ failure: 1, threat: 1 }),
        face({ threat: 2 }),
        face({ threat: 2 }),
        face({ despair: 1 })
    ])
});
//# sourceMappingURL=faces.js.map