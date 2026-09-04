function n(value) {
    const x = Number(value ?? 0);
    return Number.isFinite(x) ? Math.max(0, x) : 0;
}
export function narrativeHealthState(woundsValue, woundsThreshold) {
    const wounds = n(woundsValue);
    const threshold = n(woundsThreshold);
    if (threshold <= 0)
        return { id: wounds > 0 ? "hurt" : "fine", label: wounds > 0 ? "Looks Hurt" : "Looks Fine", ratio: 0 };
    const ratio = wounds / threshold;
    if (wounds > threshold)
        return { id: "incapacitated", label: "Incapacitated", ratio };
    if (ratio >= 0.76)
        return { id: "serious", label: "Looks Seriously Injured", ratio };
    if (ratio >= 0.51)
        return { id: "bloodied", label: "Looks Bloodied", ratio };
    if (ratio >= 0.26)
        return { id: "hurt", label: "Looks Hurt", ratio };
    return { id: "fine", label: "Looks Fine", ratio };
}
//# sourceMappingURL=health.js.map