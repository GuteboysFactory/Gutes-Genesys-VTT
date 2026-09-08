# Adversary Library – v0.0.1865

## Levererat för QA

101 mallar: 79 statblock från Realms of Terrinoth och 22 egna vardags-NPC:er. Källmallarna ligger i ett native Actor-compendium som skapas första gången GM öppnar biblioteket. Egna mallar sparas i ett separat native Actor-compendium. Biblioteket visar även världens NPC-Actors och reagerar på ändringar i Foundry.

Sökning på namn, kategori och svenska yrkesord för vardagsmallarna. Filter på roll, ursprung och kategori. Lokal PNG/JPEG/WebP kan släppas på GM Docks Forge-ruta eller direkt på en mall. Filväljare finns också. Forge visar bildförhandsvisning, låter GM ändra statistik/skills och välja vilka mall-Items som följer med, plus lägga till world Items. Slutsteget väljer befintlig Actor-mapp eller skapar ny mapp under vald förälder.

Varje skapelse är en separat Actor med friska resurser, egna embedded Items och olänkad token. Mallen ändras inte. Bilden laddas upp vid slutligt skapande. Högst 20 MB; faktisk bildavkodning krävs innan uppladdning.

## Automation och begränsningar

Native skills, Minion-grupper, Adversary-rank, vapen och stödda weapon qualities använder systemets befintliga mekanik. Bokmallarna har 120 native vapenprofiler. Parry använder befintlig reaktionsmekanik. Tryckta skadevärden används utan att Brawn läggs till igen; ändring av Brawn kräver därför manuell justering av dessa vapens skada.

Övriga talents, förmågor, särskild utrustning och spell-exempel ligger i tydligt märkta reference Items som GM läser och hanterar manuellt. Att en förmåga finns i biblioteket innebär inte att den är automatiserad. Soak/Defense är bokens totalsiffror och uppdateras inte automatiskt om GM väljer bort utrustning.

Fyra käll-/runtimeavvikelser är markerade på berörda mallar: Goblin Witcher saknar angiven Deception-rank; Onoit Shaman har ospecialiserad Melee; Orc Outriders kastspjut saknar range; Giants klubb har Short räckvidd som kräver GM-hantering.

Inga bokillustrationer ingår. Vid misslyckat Actor-sparande efter lyckad uppladdning/mappskapande kan bilden eller den tomma mappen finnas kvar. Befintliga mallar skrivs inte över eller återställs vid vanlig öppning.

## Verifiering

49 automatiska testfiler passerar, inklusive samtliga 101 mallars grundfält, källa/kopia-isolering, M/R-kolumnordning, tärningsetiketter, bildvalidering, mappflöde, native compendium-initiering och behörigheter. Live-QA i Foundry återstår. Webbläsartest kunde inte köras eftersom Chromium saknades och nedladdningen misslyckades.

## Mallar

| Mall | Roll | Källa |
|---|---|---|
| Beast Of Burden | minion | Realms of Terrinoth p. 104 |
| Flying Mount | rival | Realms of Terrinoth p. 104 |
| Riding Beast | minion | Realms of Terrinoth p. 104 |
| War Mount | rival | Realms of Terrinoth p. 105 |
| Baronial Knight | rival | Realms of Terrinoth p. 150 |
| Dragon Hybrid | rival | Realms of Terrinoth p. 151 |
| Feral Dragon | nemesis | Realms of Terrinoth p. 152 |
| Goblin | minion | Realms of Terrinoth p. 152 |
| Goblin Witcher | rival | Realms of Terrinoth p. 152 |
| Greyhaven Wizard | nemesis | Realms of Terrinoth p. 153 |
| Ironbound | rival | Realms of Terrinoth p. 153 |
| Priest Of Kellos | rival | Realms of Terrinoth p. 154 |
| Rune Golem | nemesis | Realms of Terrinoth p. 154 |
| Splig, King Of All Goblins | nemesis | Realms of Terrinoth p. 154 |
| Tamalir Guildmaster | rival | Realms of Terrinoth p. 155 |
| Barghest | rival | Realms of Terrinoth p. 163 |
| Death Knight | nemesis | Realms of Terrinoth p. 164 |
| Ferrox | rival | Realms of Terrinoth p. 165 |
| Lord Of Bilehall | nemesis | Realms of Terrinoth p. 165 |
| Necromancer | nemesis | Realms of Terrinoth p. 166 |
| Reanimate | minion | Realms of Terrinoth p. 166 |
| Wraith | rival | Realms of Terrinoth p. 167 |
| Aymhelin Scion | rival | Realms of Terrinoth p. 178 |
| Deepwood Archer | minion | Realms of Terrinoth p. 179 |
| Forest Guardian | nemesis | Realms of Terrinoth p. 179 |
| Leonx Rider | rival | Realms of Terrinoth p. 179 |
| Leonx | rival | Realms of Terrinoth p. 180 |
| Storm Sorceress | nemesis | Realms of Terrinoth p. 180 |
| True Fae | nemesis | Realms of Terrinoth p. 181 |
| Deep Elf | rival | Realms of Terrinoth p. 190 |
| Dimora | nemesis | Realms of Terrinoth p. 191 |
| Dwarf Guilder | rival | Realms of Terrinoth p. 191 |
| Dwarven Dragon Hunter | nemesis | Realms of Terrinoth p. 191 |
| Kennsir Dwarf | rival | Realms of Terrinoth p. 192 |
| Kobold | minion | Realms of Terrinoth p. 192 |
| Ancient Dragon | nemesis | Realms of Terrinoth p. 195 |
| Specter | rival | Realms of Terrinoth p. 195 |
| Lava Elemental | rival | Realms of Terrinoth p. 196 |
| Salamander | rival | Realms of Terrinoth p. 196 |
| Young Dragon | rival | Realms of Terrinoth p. 196 |
| Beastman | minion | Realms of Terrinoth p. 201 |
| Gurak Tol | rival | Realms of Terrinoth p. 202 |
| Ogre | nemesis | Realms of Terrinoth p. 202 |
| Orc Spiritspeaker | nemesis | Realms of Terrinoth p. 202 |
| Orc Outrider | rival | Realms of Terrinoth p. 203 |
| Berserker | minion | Realms of Terrinoth p. 213 |
| Bloodsister And Nightseer | nemesis | Realms of Terrinoth p. 213 |
| Flesh Ripper | minion | Realms of Terrinoth p. 214 |
| Grotesque | rival | Realms of Terrinoth p. 215 |
| Spined Thresher | nemesis | Realms of Terrinoth p. 216 |
| Viper Legion Archer | rival | Realms of Terrinoth p. 217 |
| Witch And Warlock | rival | Realms of Terrinoth p. 217 |
| Giant | nemesis | Realms of Terrinoth p. 226 |
| Gnome Minstrel | nemesis | Realms of Terrinoth p. 226 |
| Lorimor Marine | minion | Realms of Terrinoth p. 227 |
| Lost Knight | rival | Realms of Terrinoth p. 227 |
| Manticore | nemesis | Realms of Terrinoth p. 227 |
| Merriod | nemesis | Realms of Terrinoth p. 228 |
| Pirate | minion | Realms of Terrinoth p. 229 |
| Shade | minion | Realms of Terrinoth p. 229 |
| Siren | rival | Realms of Terrinoth p. 230 |
| Sword Poet | nemesis | Realms of Terrinoth p. 230 |
| Wyrm Of The Deep | nemesis | Realms of Terrinoth p. 231 |
| Ice Wyrm | nemesis | Realms of Terrinoth p. 237 |
| Ice-Blood Warrior | minion | Realms of Terrinoth p. 237 |
| Wendigo | rival | Realms of Terrinoth p. 238 |
| Onoit Shaman | rival | Realms of Terrinoth p. 239 |
| Weik Warrior | minion | Realms of Terrinoth p. 239 |
| Assassin | nemesis | Realms of Terrinoth p. 247 |
| Djinn | nemesis | Realms of Terrinoth p. 248 |
| Minor Elemental | rival | Realms of Terrinoth p. 248 |
| Scorpion Swarm | rival | Realms of Terrinoth p. 249 |
| Thieves’ Guild Cutpurse | rival | Realms of Terrinoth p. 249 |
| Carnivorous Flora | rival | Realms of Terrinoth p. 258 |
| Giant Snake | rival | Realms of Terrinoth p. 258 |
| Makhim | minion | Realms of Terrinoth p. 258 |
| Naga Priestess | rival | Realms of Terrinoth p. 258 |
| Singhara Hunter | minion | Realms of Terrinoth p. 259 |
| Singhara Pridelord | nemesis | Realms of Terrinoth p. 259 |
| Farmer | minion | Custom Genesys |
| Villager | minion | Custom Genesys |
| Laborer | minion | Custom Genesys |
| Merchant | rival | Custom Genesys |
| Innkeeper | rival | Custom Genesys |
| Blacksmith | rival | Custom Genesys |
| Artisan | rival | Custom Genesys |
| Healer | rival | Custom Genesys |
| Scholar | rival | Custom Genesys |
| Noble | rival | Custom Genesys |
| Town Guard | minion | Custom Genesys |
| Militia | minion | Custom Genesys |
| Soldier | minion | Custom Genesys |
| Archer | minion | Custom Genesys |
| Scout | rival | Custom Genesys |
| Veteran | rival | Custom Genesys |
| Guard Captain | nemesis | Custom Genesys |
| Bandit | minion | Custom Genesys |
| Thief | rival | Custom Genesys |
| Smuggler | rival | Custom Genesys |
| Bandit Leader | nemesis | Custom Genesys |
| Court Mage | nemesis | Custom Genesys |

## v0.0.1881 — reviewed ability support

Forge draft enrichment adds selectable native Ogre Regeneration and Orc Spiritspeaker Second Wind 5 when the source identity and reviewed reference text match. Source compendiums and existing world Actors are preserved. Regeneration uses tracked activation-start healing with a saved receipt; Second Wind uses the existing active Talent workflow with atomic healing/usage. Other reference effects remain manual. Per-clause inventory and limits: `npc-ability-coverage.json`, `PACKAGE_4_QA.md`. Current automated results are recorded there; live QA remains open.
