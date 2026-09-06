const ROOT = "systems/genesys-vtt/assets/items/v1775";
const MAP = Object.freeze({
  axe:"axe", cestus:"grip", dagger:"dagger", flail:"flail", greataxe:"axe", greatsword:"sword", halberd:"halberd", katar:"dagger", mace:"mace", "military-pick":"hammer", pike:"spear",
  shield:"shield-light", "large-shield":"shield-large", "bulwark-shield":"shield-bulwark", spear:"spear", "light-spear":"spear", staff:"staff", sword:"sword", "war-hammer":"hammer",
  bow:"bow", crossbow:"crossbow", "hand-crossbow":"crossbow", "heavy-crossbow":"crossbow", "repeating-crossbow":"crossbow", longbow:"bow", sling:"sling", "throwing-axe":"axe",
  brigandine:"brigandine", chainmail:"chainmail", "heavy-robes":"robes", "leather-armor":"leather", "padded-armor":"padded", "plate-armor":"plate", "scale-armor":"scale",
  "holy-icon":"focus", "magic-scepter":"staff", "magic-staff":"staff", "magic-tome":"tome", "magic-wand":"wand", "musical-instrument":"instrument", "lesser-rune":"rune-blue",
  "alchemists-kit":"tools", "alchemists-lab-supplies":"tools", "apothecarys-kit":"tools", backpack:"backpack", bedroll:"bedroll", "climbing-gear":"tools", "extra-quiver":"backpack", "fine-cloak":"robes", "flask-empty":"waterskin", "flint-and-steel":"torch", "herb-of-healing":"herb", lantern:"lantern", pole:"staff", rope:"rope", "thieves-tools":"tools", torch:"torch", "trail-rations":"backpack", wagon:"wagon", waterskin:"waterskin", "winter-clothing":"robes",
  "acid-flask":"potion-green", "bottled-courage":"potion-red", "healing-elixir":"potion-red", "immunity-elixir":"potion-green", "invisibility-potion":"potion-violet", poison:"potion-violet", "power-potion":"potion-blue", "protective-tonic":"potion-blue", "regeneration-elixir":"potion-green", "smokebomb-vial":"potion-violet", "speed-potion":"potion-blue", "stamina-elixir":"potion-blue",
  "balanced-hilt":"grip", "duelist-cross-guard":"grip", "explosive-missile":"spikes", "razor-edge":"dagger", "recurve-limbs":"bow", "rune-of-blades":"rune-red", "runic-flame":"rune-red", "runic-frost":"rune-blue", "runic-thunder":"rune-purple", "rune-of-severing":"rune-red", "serrated-edge":"dagger", "superior-weapon-customization":"grip", "weighted-head":"hammer", "ynfernael-corruption":"rune-black",
  "deflective-plating":"plating", gilded:"rune-gold", "intimidating-visage":"plating", "ironbound-rune":"plating", "reinforced-plating":"plating", spikes:"spikes", "twilight-rune":"rune-purple", barding:"barding", saddlebags:"saddlebags",
  "arcane-bolt-rune":"rune-blue", "blasting-rune":"rune-red", "ice-storm-rune":"rune-blue", "immolation-rune":"rune-red", "lightning-strike-rune":"rune-blue", "rune-of-collection":"rune-green", "rune-of-fate":"rune-gold", "rune-of-misery":"rune-purple", "soulstone-rune":"rune-black", "stasis-rune":"rune-blue", "sunburst-rune":"rune-gold", "teleportation-rune":"rune-purple", "terror-rune":"rune-red", "vision-rune":"rune-blue", "wanderers-stone":"rune-green", "ynfernael-rune":"rune-black"
});
const TYPE_DEFAULT = Object.freeze({ weapon:"sword", armor:"leather", gear:"backpack", attachment:"grip", implement:"focus" });
export const GENESYS_DEFAULT_ACTOR_ART = `${ROOT}/actor-npc.svg`;
export const GENESYS_DEFAULT_PC_ART = `${ROOT}/actor-human.svg`;
export const GENESYS_DEFAULT_NPC_ART = `${ROOT}/actor-npc.svg`;
export const GENESYS_DEFAULT_CREATURE_ART = `${ROOT}/actor-creature.svg`;
export function equipmentArtFor(definition={}) { const id=String(definition?.id??definition?.definitionId??definition?.flags?.["genesys-vtt"]?.contentId??""); const type=String(definition?.itemType??definition?.type??"gear"); return `${ROOT}/${MAP[id]??TYPE_DEFAULT[type]??"backpack"}.svg`; }
export function equipmentArtForType(type="gear") { return `${ROOT}/${TYPE_DEFAULT[String(type)]??"backpack"}.svg`; }
export function isFoundryDefaultArt(path="") { const value=String(path??""); return !value||value==="icons/svg/item-bag.svg"||value==="icons/svg/mystery-man.svg"||value.endsWith("/mystery-man.svg")||value.includes("genesys-equipment-icons.svg#")||value.includes("genesys-default-actors.svg#"); }
