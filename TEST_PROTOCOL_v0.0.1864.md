# Adversary Forge — QA v0.0.1864

Öppna GM Dock → Forge → Open Adversary Forge. Live Foundry-test återstår.

1. Skapa en Minion med 3 medlemmar och Wound Threshold 5 per medlem. Förhandsgranskningen visar totalt 15. Markera en gruppskill: den ska ge rank 2 när alla tre återstår, genom befintlig minionhantering.
2. Skapa en Rival med en skill på rank 3. Separat Strain Threshold och extra activation används inte.
3. Skapa en Nemesis med Strain Threshold 12 och extra activation 1. Kontrollera två tillåtna aktiveringar per runda i Encounter Tracker efter att token lagts till.
4. Välj ett world weapon Item. NPC:n ska ha en separat kopia; ändringar på kopian ändrar inte originalet.
5. Gå tillbaka från förhandsgranskningen. Värden och Item-val ska vara kvar. Stäng/avbryt: ingen NPC skapas.
6. Kontrollera ogiltiga värden: tomt namn, för hög characteristic, negativa värden. Felet visas och inmatningen behålls.
7. NPC:n ska synas i Actors, öppna sitt vanliga blad och sparas efter reload. Spelare får inte automatiskt åtkomst.
8. Dra NPC:n till scenen och lägg till den via befintliga encounter-kontroller. Wounds är inte en automatisk Dead-markering.

Gränser: statistik matas in av GM; ingen automatisk balansering. Soak/Defense inkluderar den rustning GM räknat in. Bara befintliga stödda world Items väljs här. Mallar, kloning, import/export och direkt encounter-placering kommer senare. Gamla Actors ändras inte.

Automatiskt: domäntester för roller, grupptröskel, skillrank och validering; arbetsflödestester för avbryt, skapande, Item-kopior, GM-rättighet och sparfel. Övrig regressionssvit körd separat.
