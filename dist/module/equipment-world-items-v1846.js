const TYPES = new Set(["weapon", "armor", "gear", "attachment", "implement"]);
export function visibleWorldEquipment(items, user, settingId = "") {
    return Array.from(items).filter(item => {
        if (item.parent || !TYPES.has(item.type)) return false;
        if (!user?.isGM && !item.testUserPermission?.(user, "OBSERVER")) return false;
        const sourceSetting = String(item.system?.provenance?.settingId ?? "");
        return !sourceSetting || !settingId || sourceSetting === settingId;
    });
}
