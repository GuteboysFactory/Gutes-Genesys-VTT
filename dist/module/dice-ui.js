import { rollNarrativeWithPresentation } from "./dice-renderer-bridge.js";
const LABELS = {
    boost: "Boost",
    ability: "Ability",
    proficiency: "Proficiency",
    setback: "Setback",
    difficulty: "Difficulty",
    challenge: "Challenge"
};
export function parsePoolFromElement(root) {
    const result = {
        boost: 0,
        ability: 0,
        proficiency: 0,
        setback: 0,
        difficulty: 0,
        challenge: 0
    };
    for (const key of Object.keys(result)) {
        const input = root.querySelector(`[data-die-count="${key}"]`);
        const value = Number(input?.value ?? 0);
        result[key] = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
    }
    return result;
}
export function formatPool(pool) {
    return Object.entries(pool)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => `${count} ${LABELS[type]}`)
        .join(" · ") || "Empty pool";
}
function resultHeading(result) {
    return result.succeeded ? "SUCCESS" : "FAILURE";
}
export function resultToChatHtml(result) {
    const dice = result.dice.map((die) => {
        const symbols = Object.entries(die.symbols)
            .map(([name, count]) => `${name} ×${count}`)
            .join(", ") || "blank";
        return `<li><strong>${LABELS[die.type]}</strong> #${die.faceIndex + 1}: ${symbols}</li>`;
    }).join("");
    return `
    <section class="genesys-chat-roll">
      <h3>${resultHeading(result)}</h3>
      <p><strong>Pool:</strong> ${formatPool(result.pool)}</p>
      <div class="genesys-chat-result-grid">
        <span>Success <strong>${result.net.success}</strong></span>
        <span>Failure <strong>${result.net.failure}</strong></span>
        <span>Advantage <strong>${result.net.advantage}</strong></span>
        <span>Threat <strong>${result.net.threat}</strong></span>
        <span>Triumph <strong>${result.net.triumph}</strong></span>
        <span>Despair <strong>${result.net.despair}</strong></span>
      </div>
      <details>
        <summary>Rolled faces</summary>
        <ol>${dice}</ol>
      </details>
    </section>`;
}
export async function rollPoolToChat(pool, speakerAlias) {
    const { result } = await rollNarrativeWithPresentation(pool, {
        sourceType: "quick-dice-pool",
        sourceLabel: "Quick Dice Pool",
        speakerAlias,
        actorName: speakerAlias
    });
    const data = {
        content: resultToChatHtml(result)
    };
    if (speakerAlias)
        data.speaker = { alias: speakerAlias };
    await foundry.documents.ChatMessage.create(data);
    return result;
}
//# sourceMappingURL=dice-ui.js.map