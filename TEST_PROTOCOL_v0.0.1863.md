# Samlat Heroic-test — v0.0.1863

Status: automatiska tester genomförs för denna leverans; live-test i Foundry återstår. Läs docs/HEROIC_PRIMARY_COVERAGE.md för exakta gränser. Alla elva har gemensamt arbetsflöde; alla mekaniska specialfall är inte helautomatiserade.

## Gemensamt

1. Uppdatera QA-systemet till 0.0.1863 och ladda om världen.
2. Öppna Actions och GM Dock. Endast valda secondary-effekter ska visas. Primary Configure finns när förmågan är inaktiv.
3. Kontrollera betalning, användningar, duration och slutet av nästa ägartur i både Side Slots och Popcorn. En misslyckad aktivering får inte behålla läkning eller betalning.
4. Kontrollera ägd token-karaktär separat från världens originalkaraktär. Ett omslag får inte påverka fel Actor.

## Alla primary-förmågor i samma testomgång

| Förmåga | Test |
|---|---|
| All the Facts | Registrera en uppgift på ägarturen; försök igen samma tur. Nästa ägartur tillåter ny uppgift. Improved: välj relaterat slag. Supreme: en tillfällig SP per uppgift; använd efter att förmågan gått ut; GM-poolen ska inte öka. Nollställ vid sessionsslut |
| Connected | Avbryt relation/favor före betalning: inga SP/användningar ska förbrukas. Improved: social check med Challenge ska nedgraderas en gång. Supreme: GM byter angriparens mål före slaget |
| Foretelling | En fråga per runda; bara ett relaterat omslag per aktivering. Supreme: mata in NPC-pool, stäng resultatvalet, öppna igen: samma sparade kopia. Välj original/kopia och lös NPC-slaget med det resultatet |
| Hard to Kill | Base: +4 effektiv soak; Improved: +1 negativ grundsvårighet; Supreme: noll skada även vid soak-bypass och strain-vapenskada. Testa standardvapen och magisk attack. Frivillig strain ska fortfarande kosta. Avsluta och kontrollera normal skada |
| Influential | Socialt engångsslag får linked characteristic som extra Success. Längre social konflikt: välj mål, befintligt meddelande-ID, grundstrain och Advantage. Improved: två Advantage per critical remark. Supreme-mål: reducera med högsta Presence/Cool. Samma meddelande får inte appliceras två gånger på samma mål |
| Miraculous Recovery | Base 3 wounds på aktivering, Improved/Supreme alla wounds; ägartur läker 3. Extra tur samma runda ska inte ge ytterligare rundläkning. Supreme: välj en skada från aktiveringstillfället; dess länkade condition tas bort tillsammans med skadan |
| Paragon | Välj giltig skill. Base: välj en faktiskt slagen Difficulty; Improved: även en Setback; Supreme: Challenge i stället för Difficulty. Kontrollera Failure/Despair och slutresultat efter borttagning. Orelaterad skill ska inte påverkas |
| Sixth Sense | Konfigurera entity; registrera information enligt Base/Improved/Supreme. Upprepad registrering samma aktivering ska stoppas |
| Signature Weapon | Bind ett eget weapon Item och oinstallerat attachment Item. Kontrollera tilläggets kvaliteter på standardattack under aktivering och bortfall efteråt. Redigera permanenta profil/HP/craftsmanship-val på Item manuellt; de är inte automatiserade här |
| Unbowed | Base: välj skada från aktiveringstillfället; dess +10 och länkade condition-regler ignoreras. Improved gäller alla utom Dead. Supreme Dead ska åter gälla vid utgång. Testa övriga skador manuellt enligt täckningslistan |
| Unleash | Base: en manöver och en miniongrupp på egen tur; dubbel användning samma runda stoppas. Improved kostar ingen manöver. Supreme-aktivering: markera samtliga minions inom Short och bekräfta. Kontrollera en sparretry med samma mål |

## Secondary-regression

Testa Devastating med vapen och magisk attack; Empowered; Empower Allies och Diminish efter förflyttning; Drain/Rejuvenate Allies på aktivering och turstart; Rejuvenation; Renewal i Side Slots; custom-beskrivning. Lägg inte på samma effekt manuellt när den redan räknas av systemet.

## Kända kvarvarande delar

Signature Weapon permanenta uppgraderingar/fullständiga attachments; full Unbowed-täckning; gemensam integration för externa/raw/custom slag och symbolspendering. Dessa är öppna roadmap-punkter, inte godkända tester.
