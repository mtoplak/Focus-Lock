# Matrika sledljivosti funkcionalnosti in testnih primerov

Matrika povezuje funkcionalnosti, opisane v dokumentu [FUNKCIONALNOSTI.md](./FUNKCIONALNOSTI.md), s funkcionalnimi testnimi primeri iz dokumenta [FUNKCIONALNI_TESTNI_PRIMERI.md](./FUNKCIONALNI_TESTNI_PRIMERI.md).

## Matrika pokritosti

| ID funkcionalnosti | Funkcionalnost | Preverjana zahteva oziroma vedenje | Povezani testni primer | Pokritost |
|---|---|---|---|---|
| FUN-01 | Avtentikacija – gostujoči način | Uporabnik lahko brez računa vstopi v gostujoči način in uporablja lokalne funkcije aplikacije. | **TC-FL-001** – Vstop v aplikacijo kot gost | Pokrito |
| FUN-02 | Pomodoro časovnik | Uporabnik lahko zažene, začasno ustavi in ponastavi fokusni časovnik. | **TC-FL-002** – Zagon, premor in ponastavitev fokusnega časovnika | Pokrito |
| FUN-03 | Seznam blokad | Uporabnik lahko doda spletno mesto na seznam blokad. | **TC-FL-003** – Blokiranje spletnega mesta med fokusno sejo | Pokrito |
| FUN-04 | Blokiranje motenj | Med tekočo fokusno sejo namizni agent blokira spletna mesta s seznama blokad in po koncu seje blokado odstrani. | **TC-FL-003** – Blokiranje spletnega mesta med fokusno sejo | Pokrito |
| FUN-05 | Namizni agent | PWA pošlje stanje blokiranja lokalnemu Windows agentu, ki uveljavi blokado spletnega mesta. | **TC-FL-003** – Blokiranje spletnega mesta med fokusno sejo | Delno pokrito |
| FUN-06 | Načrtovano blokiranje | Uporabnik lahko ustvari ponavljajoče se časovno okno z izbranim dnevom ter začetnim in končnim časom. | **TC-FL-004** – Dodajanje in ohranitev urnika blokiranja | Pokrito |
| FUN-07 | Lokalno shranjevanje urnikov | Dodani urnik se shrani lokalno in ostane prisoten po osvežitvi strani. | **TC-FL-004** – Dodajanje in ohranitev urnika blokiranja | Pokrito |
| FUN-08 | Statistika | Uporabnik lahko ponastavi zgodovino sej, števce blokad in števec današnjih sej. | **TC-FL-005** – Ponastavitev vseh statistik | Pokrito |
| FUN-09 | Trajnost statistike | Ponastavljeno stanje statistike se ohrani po osvežitvi strani, ne da bi se izbrisale nastavitve ali seznam blokad. | **TC-FL-005** – Ponastavitev vseh statistik | Pokrito |

## Pregled testnih primerov

| ID testnega primera | Primarno področje | Povezane funkcionalnosti |
|---|---|---|
| **TC-FL-001** | Avtentikacija | FUN-01 |
| **TC-FL-002** | Pomodoro časovnik | FUN-02 |
| **TC-FL-003** | Blokiranje motenj in namizni agent | FUN-03, FUN-04, FUN-05 |
| **TC-FL-004** | Načrtovano blokiranje | FUN-06, FUN-07 |
| **TC-FL-005** | Statistika | FUN-08, FUN-09 |

## Legenda pokritosti

- **Pokrito** – testni primer neposredno preverja navedeno funkcionalnost oziroma pričakovano vedenje.
- **Delno pokrito** – testni primer preverja funkcionalnost kot del širšega uporabniškega toka, ne preveri pa vseh njenih podrobnosti ali vmesnikov.

## Funkcionalnosti zunaj trenutnega nabora testov

Ker nabor vsebuje pet osnovnih testnih primerov, ne preverja vseh zmožnosti iz dokumenta `FUNKCIONALNOSTI.md`. Med nepokritimi oziroma le posredno pokritimi področji so:

- prijava z e-pošto in geslom ter Google OAuth;
- kratki in dolgi odmori, samodejni prehodi ter strogi način;
- blokiranje namiznih aplikacij;
- dejanska aktivacija blokiranja na meji urnika in urniki čez polnoč;
- PWA namestitev, delovanje brez povezave in obvestila;
- prikaz ter izračun zgodovine, nizov in osebnih rekordov statistike.
