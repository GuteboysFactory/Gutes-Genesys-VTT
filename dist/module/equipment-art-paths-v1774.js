const EQUIPMENT_SPRITE = "systems/genesys-vtt/assets/items/genesys-equipment-icons.svg";
const ACTOR_SPRITE = "systems/genesys-vtt/assets/actors/genesys-default-actors.svg";

const ITEM_VIEW_BY_ID = Object.freeze({
  axe: "axe", cestus: "blade", dagger: "dagger", flail: "flail", greataxe: "axe", greatsword: "blade", halberd: "spear", katar: "dagger", mace: "mace", "military-pick": "axe", pike: "spear",
  shield: "shield", "large-shield": "shield", "bulwark-shield": "shield", spear: "spear", "light-spear": "spear", staff: "staff", sword: "blade", "war-hammer": "hammer",
  bow: "bow", crossbow: "crossbow", "hand-crossbow": "crossbow", "heavy-crossbow": "crossbow", "repeating-crossbow": "crossbow", longbow: "bow", sling: "sling", "throwing-axe": "axe",
  brigandine: "armor", chainmail: "mail", "heavy-robes": "robe", "leather-armor": "armor", "padded-armor": "armor", "plate-armor": "plate", "scale-armor": "scale",
  "holy-icon": "focus", "magic-scepter": "staff", "magic-staff": "staff", "magic-tome": "tome", "magic-wand": "wand", "musical-instrument": "instrument", "lesser-rune": "rune-blue",
  "alchemists-kit": "tools", "alchemists-lab-supplies": "tools", "apothecarys-kit": "tools", backpack: "pack", bedroll: "bedroll", "climbing-gear": "tools", "extra-quiver": "tools", "fine-cloak": "robe", "flask-empty": "potion-blue", "flint-and-steel": "torch", "herb-of-healing": "herb", lantern: "lantern", pole: "staff", rope: "rope", "thieves-tools": "tools", torch: "torch", "trail-rations": "pack", wagon: "wagon", waterskin: "waterskin", "winter-clothing": "robe",
  "acid-flask": "potion-green", "bottled-courage": "potion-red", "healing-elixir": "potion-red", "immunity-elixir": "potion-green", "invisibility-potion": "potion-violet", poison: "potion-violet", "power-potion": "potion-blue", "protective-tonic": "potion-blue", "regeneration-elixir": "potion-green", "smokebomb-vial": "potion-violet", "speed-potion": "potion-blue", "stamina-elixir": "potion-blue",
  "balanced-hilt": "grip", "duelist-cross-guard": "grip", "explosive-missile": "spikes", "razor-edge": "blade", "recurve-limbs": "bow", "rune-of-blades": "rune-plate", "runic-flame": "rune-red", "runic-frost": "rune-blue", "runic-thunder": "rune-purple", "rune-of-severing": "rune-red", "serrated-edge": "blade", "superior-weapon-customization": "grip", "weighted-head": "grip", "ynfernael-corruption": "rune-black",
  "deflective-plating": "plating", gilded: "rune-gold", "intimidating-visage": "plating", "ironbound-rune": "rune-plate", "reinforced-plating": "plating", spikes: "spikes", "twilight-rune": "rune-purple",
  barding: "barding", saddlebags: "saddlebags",
  "arcane-bolt-rune": "rune-blue", "blasting-rune": "rune-red", "ice-storm-rune": "rune-blue", "immolation-rune": "rune-red", "lightning-strike-rune": "rune-blue", "rune-of-collection": "rune-green", "rune-of-fate": "rune-gold", "rune-of-misery": "rune-purple", "soulstone-rune": "rune-black", "stasis-rune": "rune-blue", "sunburst-rune": "rune-gold", "teleportation-rune": "rune-purple", "terror-rune": "rune-red", "vision-rune": "rune-blue", "wanderers-stone": "rune-green", "ynfernael-rune": "rune-black"
});

const TYPE_VIEW = Object.freeze({ weapon: "blade", armor: "armor", gear: "pack", attachment: "grip", implement: "focus" });

export const GENESYS_DEFAULT_ACTOR_ART = `${ACTOR_SPRITE}#generic`;
export const GENESYS_DEFAULT_PC_ART = `${ACTOR_SPRITE}#pc`;
export const GENESYS_DEFAULT_NPC_ART = `${ACTOR_SPRITE}#npc`;
export const GENESYS_DEFAULT_CREATURE_ART = `${ACTOR_SPRITE}#creature`;

export function equipmentArtFor(definition = {}) {
  const id = String(definition?.id ?? definition?.definitionId ?? definition?.flags?.["genesys-vtt"]?.contentId ?? "");
  const type = String(definition?.itemType ?? definition?.type ?? "gear");
  const view = ITEM_VIEW_BY_ID[id] ?? TYPE_VIEW[type] ?? "pack";
  return `${EQUIPMENT_SPRITE}#${view}`;
}

export function equipmentArtForType(type = "gear") {
  return `${EQUIPMENT_SPRITE}#${TYPE_VIEW[String(type)] ?? "pack"}`;
}

export function isFoundryDefaultArt(path = "") {
  const value = String(path ?? "");
  return !value || value === "icons/svg/item-bag.svg" || value === "icons/svg/mystery-man.svg" || value.endsWith("/mystery-man.svg");
}
