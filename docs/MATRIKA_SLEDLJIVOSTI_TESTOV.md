# Matrika sledljivosti funkcionalnosti in testnih primerov

Matrika povezuje funkcionalnosti, opisane v dokumentu [FUNKCIONALNOSTI.md](./FUNKCIONALNOSTI.md), s funkcionalnimi testnimi primeri iz dokumenta [FUNKCIONALNI_TESTNI_PRIMERI.md](./FUNKCIONALNI_TESTNI_PRIMERI.md).

## Matrika pokritosti

| ID funkcionalnosti | Funkcionalnost | Preverjana zahteva oziroma vedenje | Povezani testni primer | Pokritost |
|---|---|---|---|---|
| FUN-01 | Avtentikacija – gostujoči način | Uporabnik lahko brez računa vstopi v gostujoči način in uporablja lokalne funkcije aplikacije. | **TC-FL-001** – Vstop v aplikacijo kot gost | Pokrito |
| FUN-02 | Pomodoro časovnik | Uporabnik lahko zažene, začasno ustavi in ponastavi fokusni časovnik. | **TC-FL-002** – Zagon, premor in ponastavitev fokusnega časovnika | Pokrito |
| FUN-03 | Seznam blokad | Uporabnik lahko doda spletno mesto na seznam blokad. | **TC-FL-003** – Blokiranje spletnega mesta med fokusno sejo | Pokrito |
| FUN-04 | Blokiranje motenj | Med tekočo fokusno sejo namizni agent blokira spletna mesta s seznama blokad in po koncu seje blokado odstrani. | **TC-FL-003** – Blokiranje spletnega mesta med fokusno sejo | Pokrito |
| FUN-05 | Namizni agent | PWA pošlje stanje blokiranja lokalnemu Windows agentu, ki uveljavi blokado spletnega mesta ali namizne aplikacije. | **TC-FL-003** – Blokiranje spletnega mesta med fokusno sejo;<br>**TC-FL-008** – Blokiranje namizne aplikacije med fokusno sejo | Pokrito |
| FUN-06 | Načrtovano blokiranje | Uporabnik lahko ustvari ponavljajoče se časovno okno z izbranim dnevom ter začetnim in končnim časom. | **TC-FL-004** – Dodajanje in ohranitev urnika blokiranja | Pokrito |
| FUN-07 | Lokalno shranjevanje urnikov | Dodani urnik se shrani lokalno in ostane prisoten po osvežitvi strani. | **TC-FL-004** – Dodajanje in ohranitev urnika blokiranja | Pokrito |
| FUN-08 | Statistika | Uporabnik lahko ponastavi zgodovino sej, števce blokad in števec današnjih sej. | **TC-FL-005** – Ponastavitev vseh statistik | Pokrito |
| FUN-09 | Trajnost statistike | Ponastavljeno stanje statistike se ohrani po osvežitvi strani, ne da bi se izbrisale nastavitve ali seznam blokad. | **TC-FL-005** – Ponastavitev vseh statistik | Pokrito |
| FUN-10 | Avtentikacija – registracija | Nov uporabnik lahko ustvari račun z e-poštnim naslovom in geslom ter se po registraciji prijavi v aplikacijo. | **TC-FL-006** – Registracija z e-poštnim naslovom in geslom | Pokrito |
| FUN-11 | Strogi način | Med tekočo fokusno sejo so zaklenjeni premor, ponastavitev, preskok, menjava načina, urejanje blokad in spreminjanje nastavitev. | **TC-FL-007** – Zaklep kontrol v strogem načinu | Pokrito |
| FUN-12 | Blokiranje namiznih aplikacij | Agent med fokusno sejo zazna in prekine proces aplikacije, ki je na omogočenem seznamu blokad. | **TC-FL-008** – Blokiranje namizne aplikacije med fokusno sejo | Pokrito |
| FUN-13 | PWA in uporaba brez povezave | Že naložena aplikacija ostane uporabna brez interneta in uporabnika opozori na omejeno povezljivost. | **TC-FL-009** – Uporaba časovnika brez internetne povezave | Pokrito |
| FUN-14 | Trajnost stanja časovnika | Stanje tekoče seje je shranjeno lokalno in se po osvežitvi strani obnovi. | **TC-FL-009** – Uporaba časovnika brez internetne povezave | Pokrito |
| FUN-15 | Lokalna obvestila | Ko so obvestila omogočena, aplikacija uporabnika obvesti o koncu intervala. | **TC-FL-010** – Obvestilo ob koncu fokusnega intervala | Pokrito |

## Pregled testnih primerov

| ID testnega primera | Primarno področje | Povezane funkcionalnosti |
|---|---|---|
| **TC-FL-001** | Avtentikacija | FUN-01 |
| **TC-FL-002** | Pomodoro časovnik | FUN-02 |
| **TC-FL-003** | Blokiranje motenj in namizni agent | FUN-03, FUN-04, FUN-05 |
| **TC-FL-004** | Načrtovano blokiranje | FUN-06, FUN-07 |
| **TC-FL-005** | Statistika | FUN-08, FUN-09 |
| **TC-FL-006** | Avtentikacija | FUN-10 |
| **TC-FL-007** | Pomodoro časovnik in strogi način | FUN-02, FUN-11 |
| **TC-FL-008** | Blokiranje namiznih aplikacij in namizni agent | FUN-05, FUN-12 |
| **TC-FL-009** | PWA, offline uporaba in trajnost časovnika | FUN-13, FUN-14 |
| **TC-FL-010** | Obvestila | FUN-15 |

## Legenda pokritosti

- **Pokrito** – testni primer neposredno preverja navedeno funkcionalnost oziroma pričakovano vedenje.
- **Delno pokrito** – testni primer preverja funkcionalnost kot del širšega uporabniškega toka, ne preveri pa vseh njenih podrobnosti ali vmesnikov.

## Funkcionalnosti zunaj trenutnega nabora testov

Ker nabor vsebuje deset osnovnih testnih primerov, še vedno ne preverja vseh zmožnosti iz dokumenta `FUNKCIONALNOSTI.md`. Med nepokritimi oziroma le posredno pokritimi področji so:

- prijava z Google OAuth in ponovna prijava v že obstoječi račun;
- kratki in dolgi odmori ter samodejni prehodi med intervali;
- dejanska aktivacija blokiranja na meji urnika in urniki čez polnoč;
- namestitev PWA in strežniška Web Push obvestila pri zaprti aplikaciji;
- glasovno upravljanje;
- prikaz ter izračun zgodovine, nizov in osebnih rekordov statistike.
