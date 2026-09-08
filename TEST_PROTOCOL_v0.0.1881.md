# Samlad speltest — v0.0.1881

Foundry v13.351. Teststatus vid leverans: automatiska tester separat redovisade; inget av nedanstående är live-godkänt ännu. Ett gemensamt pass täcker både kvarvarande v1880-kontroller och paket 4.

## 1. Uppgradering och befintliga flöden

- [ ] Kontrollera v0.0.1881 och ladda om GM/spelarklienter.
- [ ] Items → Talents ligger kvar. Items → Actions innehåller de elva Heroic-genvägarna plus tidigare Actions utan dubbletter eller överskrivna egna ändringar.
- [ ] Kopiera korrekt Heroic-genväg till karaktär: spelarens begäran går till GM; godkännande använder ordinarie kostnad och sessionsgräns.
- [ ] Fel primary ability nekas. Genvägen ger inga förmågor/upgrades gratis.
- [ ] Importera ett native Item i Tome v1.1.9 och öppna källdokumentet.
- [ ] Forge, porträtt, blad, egna Actions och vanliga attacker fungerar som före uppdateringen.

## 2. Concentration och turer

- [ ] Använd en caster med koncentrationseffekter på både world/linked Actor och en olänkad token Actor. Spelaren äger caster men inte alla mål.
- [ ] Concentrate på spelarens tur går genom GM och förbrukar en manöver. Alla avsedda mål förlängs; en annan token med samma bakomliggande Actor-ID påverkas inte.
- [ ] Klicka/återförsök igen samma tur: ingen andra manöver eller duplicerad effekt.
- [ ] Ny cast består efter casting-turen. På nästa caster-tur: utebliven Concentrate tar bort effekten vid turavslut; använd Concentrate bevarar den.
- [ ] Ge Nemesis en extraaktivering. Kontrollera samma beteende på extraaktiveringen och därefter nästa runda. Totalt två aktiveringar, och GM bekräftar nästa runda.
- [ ] End Encounter/Reset rensar managed-effekter från den scenen utan att ändra andra scener.

### Avbrott — separat testvärld, om möjligt

- [ ] Om ett mål inte kan sparas: manöverbetalning och återställningsstatus finns kvar. Redan uppdaterade mål kan vara uppdaterade; systemet utlovar inte rollback av alla mål.
- [ ] Återställ skrivmöjligheten och ladda om. Retry Concentrate avslutar återstående mål utan ny manöver.
- [ ] Fel vid effektstädning stoppar End Turn. Retry/Complete Interrupted Turn slutför och avancerar exakt en gång.
- [ ] Om effekten redigerats under avbrottet: meddelandet identifierar mål/effekt, stoppar överskrivning och kräver GM-granskning. Borttagna effekter ska aldrig återskapas av retry.
- [ ] Detta kan lämnas som ej live-verifierat om skrivfel inte kan framkallas säkert. Automatiska felinjektionstester redovisas separat.

## 3. Renewal

- [ ] Side Slots: aktivera Heroic med Renewal, välj Cool/Vigilance, en PC-slot tillkommer och inga nya deltagarturer ges.
- [ ] Dubbel begäran ger högst en slot. Retry efter lagrat slag gör inget nytt slag.
- [ ] Slot består nästa runda; redan aktiverad PC får inte claima igen. Slut på runda kräver fortfarande GM.
- [ ] Byt aktiv GM efter ett avbrott. Den nya GM:n kan granska och återförsöka sparad resolution. Ingen automatisk replay förväntas.
- [ ] Popcorn ger inte gratis aktivering eller dold slotmekanik.

## 4. Recovery talents

- [ ] Desperate Recovery, Strain 6/10: +2 utöver Success och ev. annan GM-bonus. Vid 5/10: ingen automatisk +2.
- [ ] Disabled talent: ingen bonus. Noll Success kan fortfarande ge den berättigade +2-bonusen.
- [ ] Kontrollera både individuell recovery och GM Health → Recover selected PCs. Samma beräkning; inget dubbelslag vid retry.
- [ ] One with Nature: Survival finns individuellt med wilderness-bekräftelse. Avbryt utan slag/förbrukning.
- [ ] Full Night’s Rest: välj Apothecary rank 2 och bekräfta vård. Valda patienter läker högst 5 wounds samt all strain. Utan vald vårdgivare gäller 1 wound.
- [ ] Ändrad/disabled caregiver före sparande kräver ny granskning. Criticals, conditions och deltagarstatus ändras inte av vilan.

## 5. NPC-förmågor

- [ ] Skapa ny Ogre från bokmallen i Forge: Regeneration finns bland valbara Template Items. Befintlig källa och befintliga NPC:er ändras inte.
- [ ] Lägg den nya Ogren i encounter, ge skada och claima dess tur: 3 wounds läks. UI-uppdatering/omladdning/samma-tur-kommandon läker inte ytterligare.
- [ ] Extraaktivering läker 3 till. Disabled Regeneration eller deltagarstatus Dead/Out of Fight ger inte automatisk återaktivering.
- [ ] Skapa Orc Spiritspeaker: Second Wind 5 finns som native Talent/Action. På egen tur läker den upp till 5 strain, en gång per encounter även med extraaktivering.
- [ ] Ny encounter återställer användbarheten. Källans övriga specialregler/reference Items är fortfarande manuella.

## 6. Två klienter och större encounter

- [ ] GM + spelare: egna kommandon tillåts; främmande Actor och GM-only Renewal-resolution nekas.
- [ ] Koppla från/återanslut spelaren: inga gratis turer, dubblettkostnader eller automatisk återspelning av gamla begäranden.
- [ ] Byt aktiv GM mellan två olika GM-konton och repetera Concentrate/Renewal/Second Wind. Samtidiga flikar med samma GM-konto är inte verifierat/stött som särskilt samtidighetsfall.
- [ ] Testa cirka 20–30 deltagare och flera effektmål. Notera faktisk respons och konsolfel; inga prestandasiffror är uppmätta i leveransen.
- [ ] Defeated/Out of Fight/Dead förblir separerat från Wounds. Round confirmation och bounded Nemesis allowance fungerar.

## Rapport

Notera PASS/FEL/EJ TESTAT per del samt Foundry-version, antal klienter och reproduktionssteg. Konsolfel och avbrottsscenarier prioriteras. v14 kan testas separat men är inte verifierad målversion för denna leverans.
