import { rollNarrativePool } from "../domain/dice/index.js";
import { constructStandardPool } from "../domain/pool/index.js";
import { formatPool, resultToChatHtml } from "./dice-ui.js";
function readInteger(root, selector, fallback = 0) {
    const input = root.querySelector(selector);
    const value = Number(input?.value ?? fallback);
    return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : fallback;
}
function readDieMap(root, attribute) {
    const result = {};
    for (const input of Array.from(root.querySelectorAll(`[${attribute}]`))) {
        const type = input.getAttribute(attribute);
        if (!type)
            continue;
        const value = Number(input.value ?? 0);
        result[type] = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
    }
    return result;
}
export function parseStandardPoolInput(root) {
    return {
        characteristic: readInteger(root, "[data-check-characteristic]"),
        skillRank: readInteger(root, "[data-check-skill-rank]"),
        difficulty: readInteger(root, "[data-check-difficulty]"),
        modifiers: {
            add: readDieMap(root, "data-add-die"),
            upgradePositive: readInteger(root, "[data-upgrade-positive]"),
            upgradeNegative: readInteger(root, "[data-upgrade-negative]"),
            downgradePositive: readInteger(root, "[data-downgrade-positive]"),
            downgradeNegative: readInteger(root, "[data-downgrade-negative]"),
            remove: readDieMap(root, "data-remove-die")
        }
    };
}
export function poolTraceToHtml(construction) {
    const { trace } = construction;
    return `
    <details class="genesys-pool-trace">
      <summary>Pool construction trace</summary>
      <ol>
        <li><strong>Base:</strong> ${formatPool(trace.base)}</li>
        <li><strong>After additions:</strong> ${formatPool(trace.afterAdditions)}</li>
        <li><strong>After upgrades:</strong> ${formatPool(trace.afterUpgrades)}</li>
        <li><strong>After downgrades:</strong> ${formatPool(trace.afterDowngrades)}</li>
        <li><strong>After removals:</strong> ${formatPool(trace.afterRemovals)}</li>
      </ol>
    </details>`;
}
export async function constructAndRollToChat(input, speakerAlias) {
    const construction = constructStandardPool(input);
    const result = rollNarrativePool(construction.pool);
    const content = `
    <section class="genesys-constructed-check">
      <p><strong>Characteristic ${input.characteristic} + Skill ${input.skillRank}</strong> · Difficulty ${input.difficulty ?? 0}</p>
      ${poolTraceToHtml(construction)}
      ${resultToChatHtml(result)}
    </section>`;
    const data = { content };
    if (speakerAlias)
        data.speaker = { alias: speakerAlias };
    await foundry.documents.ChatMessage.create(data);
    return { construction, result };
}
//# sourceMappingURL=pool-ui.js.map