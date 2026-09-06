import { WEAPONS_ART } from "./equipment-art-weapons.js";
import { ARMOR_ART } from "./equipment-art-armor.js";
import { ATTACHMENTS_ART } from "./equipment-art-attachments.js";
import { GEAR_ART } from "./equipment-art-gear.js";
import { MAGIC_ART } from "./equipment-art-magic.js";
import { SPECIAL_ART } from "./equipment-art-special.js";

export const GENESYS_EQUIPMENT_ART=Object.freeze({...WEAPONS_ART,...ARMOR_ART,...ATTACHMENTS_ART,...GEAR_ART,...MAGIC_ART,...SPECIAL_ART});
export const GENESYS_EQUIPMENT_ART_KEY_BY_ID=Object.freeze({"axe":"weapon6","cestus":"weapon11","dagger":"weapon10","flail":"weapon12","greataxe":"weapon6","greatsword":"weapon5","halberd":"weapon9","katar":"weapon10","mace":"weapon11","military-pick":"weapon7","pike":"weapon8","shield":"armor8","large-shield":"armor9","bulwark-shield":"armor9","spear":"weapon8","light-spear":"weapon8","staff":"weapon14","sword":"weapon3","war-hammer":"weapon7","bow":"weapon1","crossbow":"weapon2","hand-crossbow":"weapon2","heavy-crossbow":"weapon2","repeating-crossbow":"weapon2","longbow":"weapon0","sling":"sling","throwing-axe":"weapon6","brigandine":"armor5","chainmail":"armor3","heavy-robes":"armor7","leather-armor":"armor1","padded-armor":"armor0","plate-armor":"armor6","scale-armor":"armor4","holy-icon":"magic11","magic-scepter":"weapon14","magic-staff":"weapon14","magic-tome":"gear13","magic-wand":"weapon14","musical-instrument":"gear13","lesser-rune":"magic4","alchemists-kit":"alchemist","alchemists-lab-supplies":"alchemist","apothecarys-kit":"gear11","backpack":"gear0","bedroll":"gear7","climbing-gear":"gear10","extra-quiver":"weapon0","fine-cloak":"armor16","flask-empty":"gear6","flint-and-steel":"gear3","herb-of-healing":"gear11","lantern":"gear4","pole":"weapon14","rope":"gear2","thieves-tools":"lockpicks","torch":"gear3","trail-rations":"gear5","wagon":"vehicle","waterskin":"gear6","winter-clothing":"armor16","acid-flask":"potion-acid","bottled-courage":"potion-courage","healing-elixir":"potion-healing","immunity-elixir":"potion-immunity","invisibility-potion":"potion-invisibility","poison":"potion-poison","power-potion":"potion-power","protective-tonic":"potion-protective","regeneration-elixir":"potion-regeneration","smokebomb-vial":"potion-smoke","speed-potion":"potion-speed","stamina-elixir":"potion-stamina","balanced-hilt":"attach12","duelist-cross-guard":"attach13","explosive-missile":"attach15","razor-edge":"attach14","recurve-limbs":"weapon1","rune-of-blades":"attach11","runic-flame":"attach7","runic-frost":"attach8","runic-thunder":"attach9","rune-of-severing":"attach11","serrated-edge":"weapon10","superior-weapon-customization":"attach13","weighted-head":"attach14","ynfernael-corruption":"magic16","deflective-plating":"attach0","gilded":"attach1","intimidating-visage":"attach2","ironbound-rune":"attach3","reinforced-plating":"attach4","spikes":"attach5","twilight-rune":"attach6","barding":"armor17","saddlebags":"gear1","arcane-bolt-rune":"magic0","blasting-rune":"magic1","ice-storm-rune":"magic2","immolation-rune":"magic3","lightning-strike-rune":"magic5","rune-of-collection":"magic6","rune-of-fate":"magic7","rune-of-misery":"magic8","soulstone-rune":"magic9","stasis-rune":"magic10","sunburst-rune":"magic11","teleportation-rune":"magic12","terror-rune":"magic13","vision-rune":"magic14","wanderers-stone":"magic15","ynfernael-rune":"magic16"});
const FALLBACK=Object.freeze({"weapon":"weapon3","armor":"armor1","gear":"gear0","attachment":"attach0","implement":"magic4"});
const SAFE_LAST_RESORT="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20rx%3D%2212%22%20fill%3D%22%23071015%22%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2232%22%20fill%3D%22none%22%20stroke%3D%22%23d7ad52%22%20stroke-width%3D%224%22%2F%3E%3Cpath%20d%3D%22M50%2024L57%2043L77%2050L57%2057L50%2076L43%2057L23%2050L43%2043Z%22%20fill%3D%22%23d7ad52%22%2F%3E%3C%2Fsvg%3E";
const WEBP_PREFIX="data:image/webp;base64,";

function normalizeBundledArt(value=""){
  const raw=String(value??"").trim();
  if(!raw.startsWith(WEBP_PREFIX)) return raw.startsWith("data:image/")||raw.startsWith("icons/")||raw.startsWith("systems/")?raw:"";
  const payload=raw.slice(WEBP_PREFIX.length).replace(/\s+/g,"");
  if(!payload||payload.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) return "";
  try{
    const bytes=globalThis.atob?.(payload);
    if(!bytes||bytes.length<12||bytes.slice(0,4)!=="RIFF"||bytes.slice(8,12)!=="WEBP") return "";
  }catch{return "";}
  return `${WEBP_PREFIX}${payload}`;
}

function validArtByKey(key=""){
  return normalizeBundledArt(GENESYS_EQUIPMENT_ART[String(key??"")]??"");
}

function fallbackArt(type="gear"){
  const preferred=validArtByKey(FALLBACK[String(type??"")]??"gear0");
  if(preferred) return preferred;
  const backpack=validArtByKey("gear0");
  return backpack||SAFE_LAST_RESORT;
}

export const GENESYS_DEFAULT_ACTOR_ART=validArtByKey("actor-default")||fallbackArt("gear");
export const GENESYS_DEFAULT_PC_ART=validArtByKey("actor-pc")||GENESYS_DEFAULT_ACTOR_ART;
export const GENESYS_DEFAULT_NPC_ART=validArtByKey("actor-npc")||GENESYS_DEFAULT_ACTOR_ART;
export const GENESYS_DEFAULT_CREATURE_ART=validArtByKey("actor-creature")||GENESYS_DEFAULT_ACTOR_ART;
export function equipmentArtFor(definition={}){const id=String(definition?.id??definition?.definitionId??definition?.flags?.["genesys-vtt"]?.contentId??"");const type=String(definition?.itemType??definition?.type??"");const key=GENESYS_EQUIPMENT_ART_KEY_BY_ID[id]??FALLBACK[type]??"gear0";return validArtByKey(key)||fallbackArt(type);}
export function equipmentArtForType(type="gear"){return fallbackArt(String(type??"gear"));}
export function isFoundryDefaultArt(path=""){const value=String(path??"");return !value||value==="icons/svg/item-bag.svg"||value==="icons/svg/mystery-man.svg"||value.endsWith("/mystery-man.svg");}
