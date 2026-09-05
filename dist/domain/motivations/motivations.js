export const MOTIVATION_FACETS = Object.freeze(["strength", "flaw", "desire", "fear"]);

function text(value) {
    return String(value ?? "").trim();
}

export function normalizeMotivation(input = {}) {
    return Object.freeze({
        strength: text(input.strength),
        flaw: text(input.flaw),
        desire: text(input.desire),
        fear: text(input.fear),
        notes: text(input.notes)
    });
}

export function motivationIsComplete(input = {}) {
    const motivation = normalizeMotivation(input);
    return MOTIVATION_FACETS.every((facet) => Boolean(motivation[facet]));
}

export function summarizeMotivation(input = {}) {
    const motivation = normalizeMotivation(input);
    return MOTIVATION_FACETS
        .filter((facet) => motivation[facet])
        .map((facet) => `${facet[0].toUpperCase()}${facet.slice(1)}: ${motivation[facet]}`)
        .join(" · ");
}
