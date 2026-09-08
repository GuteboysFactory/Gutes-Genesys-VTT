# Adversary Library QA – v0.0.1865

1. GM Dock → Forge → Open Adversary Forge Library: första öppningen skapar compendium med 101 mallar. Öppna igen: inga dubbletter.
2. Sök `bonde`, välj Farmer. Kontrollera Minion, Wounds 5. Ändra antal till 3: Wounds 15 i review.
3. Välj Feral Dragon: Wounds 41, Strain 20, Adversary 2 och två native vapen. Vapen ska inte lägga till Brawn igen.
4. Kontrollera Goblins defense: melee 1, ranged 0.
5. Dra PNG/JPEG/WebP från datorn till Forge-rutan; välj mall. Dra sedan en annan bild direkt till ett mallkort. Bildförhandsvisningen ska synas; skapad Actor och token ska använda uppladdad bild efter reload.
6. Avbryt på edit/review: ingen Actor eller bild ska skapas. Ogiltig fil eller bild över 20 MB ska ge begripligt fel.
7. Välj Actor-mapp, skriv nytt undermappsnamn, skapa NPC. Kontrollera placering och att mallen är oförändrad.
8. Välj bort ett mall-Item och lägg till ett world Item. Kontrollera kopior och justera Soak/Defense manuellt när utrustning ändras.
9. Skapa en NPC i vanliga Actors. Den ska visas under World Actors. Spara den som egen mall; skapa en kopia därifrån.
10. Ändra en mall via dess native compendium-blad. Biblioteket ska läsa ändringen; en redan skapad NPC ska vara oförändrad.
11. Spelare och annan än active GM ska inte kunna starta skapandeflödet. Upprepade klick ska inte skapa dubbletter.
12. Läs reference Items för manuella förmågor/spells; kontrollera Parry i normalt reaktionsflöde.

Automatiska tester passerar; ovanstående är live-QA och ännu inte avprickad.
