import assert from "node:assert/strict";
import {
    applyNarrativeDiceTransfers,
    consumeNarrativeDiceForActor,
    normalizeNarrativeDiceInbox,
    normalizeNarrativeDieTransfer,
    summarizeNarrativeDiceInbox
} from "../dist/module/narrative-dice-transfer-v1818.js";

const boost = normalizeNarrativeDieTransfer({
    id: "boost-1",
    dieType: "boost",
    count: 2,
    sourceActorName: "Lillen",
    createdAt: 1
});
const setback = normalizeNarrativeDieTransfer({
    id: "setback-1",
    dieType: "setback",
    count: 1,
    sourceActorName: "The GM",
    createdAt: 2
});

assert.equal(boost.dieType, "boost");
assert.equal(boost.count, 2);
assert.equal(setback.dieType, "setback");
assert.equal(normalizeNarrativeDieTransfer({ dieType: "invalid", count: 99 }).count, 5);
assert.deepEqual(normalizeNarrativeDiceInbox(null), []);

const adjusted = applyNarrativeDiceTransfers({ ability: 3, boost: 1, difficulty: 2 }, [boost, setback]);
assert.deepEqual(adjusted.pool, {
    boost: 3,
    ability: 3,
    proficiency: 0,
    setback: 1,
    difficulty: 2,
    challenge: 0
});
assert.equal(adjusted.consumed.length, 2);
assert.deepEqual(summarizeNarrativeDiceInbox([boost, setback]), { boost: 2, setback: 1 });

globalThis.game = { user: { id: "user-1", isGM: false } };
let storedInbox = [boost];
const actor = {
    documentName: "Actor",
    id: "actor-1",
    name: "Lillen",
    isOwner: true,
    getFlag: () => storedInbox,
    setFlag: async (_scope, _key, value) => { storedInbox = value; }
};
const firstRoll = await consumeNarrativeDiceForActor(actor, { ability: 2 });
assert.equal(firstRoll.pool.boost, 2);
assert.equal(firstRoll.consumed.length, 1);
assert.deepEqual(storedInbox, []);
const secondRoll = await consumeNarrativeDiceForActor(actor, { ability: 2 });
assert.equal(secondRoll.pool.boost, 0);
assert.equal(secondRoll.consumed.length, 0);

console.log("0.0.1818 narrative dice transfer tests passed");
