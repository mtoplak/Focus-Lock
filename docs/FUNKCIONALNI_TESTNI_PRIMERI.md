# Funkcionalni testni primeri za Focus Lock

Dokument vsebuje deset ročnih funkcionalnih testnih primerov za ključne uporabniške tokove aplikacije Focus Lock. Polji **Dejanski rezultat** in **Status** tester izpolni po izvedbi posameznega testa.

## TC-FL-001: Vstop v aplikacijo kot gost

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-001 |
| **Opis testa** | Preverjanje, ali lahko uporabnik brez računa vstopi v aplikacijo v gostujočem načinu. |
| **Predpogoji** | Frontend in backend aplikacije sta zagnana; uporabnik ni prijavljen; prikazana je prijavna stran. |
| **Testni koraki** | 1. Odpri Focus Lock v brskalniku.<br>2. Na prijavni strani klikni gumb **Continue as guest**.<br>3. Počakaj, da se naloži glavna stran.<br>4. Odpri uporabniški meni. |
| **Testni podatki** | Uporabniški račun ni potreben. |
| **Pričakovani rezultat** | Prikaže se glavna stran s časovnikom. V uporabniškem meniju je navedeno, da se uporablja lokalni oziroma gostujoči način (**Local only — not synced**). |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-002: Zagon, premor in ponastavitev fokusnega časovnika

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-002 |
| **Opis testa** | Preverjanje osnovnih kontrol fokusnega časovnika. |
| **Predpogoji** | Uporabnik je v aplikaciji; izbran je način **Focus**; strogi način je izklopljen; časovnik ne teče. |
| **Testni koraki** | 1. Zabeleži začetni prikazani čas.<br>2. Klikni **Start**.<br>3. Počakaj najmanj 3 sekunde.<br>4. Klikni **Pause**.<br>5. Preveri, da se odštevanje ustavi.<br>6. Klikni **Reset**. |
| **Testni podatki** | Trajanje fokusa: 25 minut; začetna vrednost: `25:00`. |
| **Pričakovani rezultat** | Po kliku **Start** začne čas upadati. Po kliku **Pause** se prikazani čas ne spreminja. Po kliku **Reset** se čas vrne na `25:00`, časovnik pa ostane ustavljen. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-003: Blokiranje spletnega mesta med fokusno sejo

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-003 |
| **Opis testa** | Preverjanje, ali namizni agent med aktivno fokusno sejo blokira spletno mesto s seznama blokad. |
| **Predpogoji** | Aplikacija je odprta; Windows namizni agent je zagnan kot skrbnik in prikazan kot povezan; fokusna seja ne teče; `example.com` je pred testom dosegljiv. |
| **Testni koraki** | 1. Odpri zavihek **Blocks**.<br>2. Vnesi `example.com` in klikni **Add**.<br>3. Vrni se na časovnik in klikni **Start**.<br>4. V novem zavihku brskalnika odpri `https://example.com`.<br>5. Ustavi oziroma ponastavi fokusno sejo.<br>6. Ponovno odpri `https://example.com`. |
| **Testni podatki** | Spletno mesto: `example.com`. |
| **Pričakovani rezultat** | Vnos `example.com` se prikaže na seznamu blokad. Med aktivno fokusno sejo spletno mesto ni dosegljivo. Ko fokusna seja ni več aktivna in ni aktivnega urnika, je spletno mesto ponovno dosegljivo. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-004: Dodajanje in ohranitev urnika blokiranja

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-004 |
| **Opis testa** | Preverjanje, ali uporabnik lahko doda ponavljajoči se urnik in ali ta ostane shranjen po osvežitvi strani. |
| **Predpogoji** | Uporabnik je v aplikaciji; trenutno ni ustvarjenega enakega urnika; strogi način ne zaklepa sprememb. |
| **Testni koraki** | 1. Odpri zavihek **Schedule**.<br>2. Izberi ponedeljek.<br>3. Nastavi začetni čas na `09:00` in končni čas na `10:00`.<br>4. Klikni **Add schedule**.<br>5. Preveri prikaz novega urnika.<br>6. Osveži stran brskalnika.<br>7. Ponovno odpri zavihek **Schedule**. |
| **Testni podatki** | Dan: ponedeljek; začetek: `09:00`; konec: `10:00`. |
| **Pričakovani rezultat** | Urnik za ponedeljek od `09:00` do `10:00` se prikaže na seznamu. Po osvežitvi strani je isti urnik še vedno prikazan z nespremenjenimi podatki. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-005: Ponastavitev vseh statistik

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-005 |
| **Opis testa** | Preverjanje potrditvenega postopka in rezultata ponastavitve statistik. |
| **Predpogoji** | Uporabnik je v aplikaciji; statistika vsebuje najmanj eno dokončano fokusno sejo ali zabeležen dogodek blokiranja. |
| **Testni koraki** | 1. Odpri zavihek **Stats**.<br>2. Zabeleži prikazane statistične vrednosti.<br>3. Klikni **Reset all stats**.<br>4. V potrditvenem pogovornem oknu klikni **Reset stats**.<br>5. Preveri statistiko in števec današnjih sej pri časovniku.<br>6. Osveži stran in znova preveri zavihek **Stats**. |
| **Testni podatki** | Obstoječa zgodovina: najmanj 1 zaključena fokusna seja ali najmanj 1 blokiran dogodek. |
| **Pričakovani rezultat** | Zgodovina sej, števci blokiranih mest/aplikacij in števec današnjih sej se ponastavijo na nič oziroma prazno stanje. Ponastavljeno stanje se ohrani po osvežitvi strani, nastavitve in seznam blokad pa ostanejo nespremenjeni. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-006: Registracija z e-poštnim naslovom in geslom

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-006 |
| **Opis testa** | Preverjanje, ali lahko nov uporabnik ustvari račun z veljavnim e-poštnim naslovom in geslom. |
| **Predpogoji** | Frontend, backend in podatkovna baza so zagnani; uporabnik ni prijavljen; e-poštni naslov še ni registriran. |
| **Testni koraki** | 1. Odpri prijavno stran Focus Lock.<br>2. Izberi zavihek **Sign up**.<br>3. Vnesi ime, e-poštni naslov in geslo.<br>4. Klikni **Create account**.<br>5. Počakaj na zaključek registracije.<br>6. Odpri uporabniški meni. |
| **Testni podatki** | Ime: `Testni Uporabnik`;<br>e-pošta: nov enoličen naslov, na primer `test.focuslock+006@example.com`;<br>geslo: `Testiranje123!`. |
| **Pričakovani rezultat** | Račun se uspešno ustvari, uporabnik je preusmerjen na glavno stran s časovnikom, v uporabniškem meniju pa je prikazan registrirani e-poštni naslov. Sporočilo o napaki se ne prikaže. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-007: Zaklep kontrol v strogem načinu

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-007 |
| **Opis testa** | Preverjanje, ali strogi način med aktivno fokusno sejo prepreči prekinjanje seje in spreminjanje nastavitev oziroma seznama blokad. |
| **Predpogoji** | Uporabnik je v aplikaciji; časovnik ne teče; izbran je način **Focus**. |
| **Testni koraki** | 1. Odpri **Settings** in vključi **Strict mode**.<br>2. Vrni se na časovnik in klikni **Start**.<br>3. Poskusi uporabiti kontrole **Pause**, **Reset** in **Skip**.<br>4. Poskusi spremeniti način časovnika.<br>5. Odpri **Blocks** in poskusi dodati, odstraniti ali izklopiti vnos.<br>6. Odpri **Settings** in poskusi spremeniti trajanje seje. |
| **Testni podatki** | Strogi način: vključen; način: **Focus**; poljuben obstoječi vnos na seznamu blokad. |
| **Pričakovani rezultat** | Med tekočo fokusno sejo ni mogoče začasno ustaviti, ponastaviti ali preskočiti intervala, zamenjati načina, urejati seznama blokad ali spreminjati nastavitev. Časovnik še naprej odšteva. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-008: Blokiranje namizne aplikacije med fokusno sejo

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-008 |
| **Opis testa** | Preverjanje, ali Windows namizni agent med fokusno sejo zapre aplikacijo, ki je dodana na seznam blokad. |
| **Predpogoji** | Test se izvaja v sistemu Windows; namizni agent je zagnan in prikazan kot povezan; fokusna seja ne teče; Beležnica (`notepad.exe`) je nameščena in ni na seznamu blokad. |
| **Testni koraki** | 1. Odpri zavihek **Blocks** in izberi vrsto **App**.<br>2. Odpri izbirnik nameščenih aplikacij, izberi `notepad.exe` in ga dodaj na seznam.<br>3. Zaženi Beležnico in preveri, da ostane odprta.<br>4. Vrni se na časovnik in klikni **Start**.<br>5. Počakaj najmanj 3 sekunde.<br>6. Med še vedno aktivno fokusno sejo ponovno poskusi zagnati Beležnico. |
| **Testni podatki** | Izvedljiva datoteka aplikacije: `notepad.exe`. |
| **Pričakovani rezultat** | `notepad.exe` se prikaže kot omogočen vnos na seznamu blokad. Pred začetkom fokusa Beležnica deluje. Med aktivno fokusno sejo agent odprto Beležnico zapre, ob ponovnem zagonu pa jo v nekaj sekundah ponovno zapre. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-009: Uporaba časovnika brez internetne povezave

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-009 |
| **Opis testa** | Preverjanje, ali že naložena PWA omogoča lokalno uporabo časovnika in ohrani njegovo stanje, ko internetna povezava ni na voljo. |
| **Predpogoji** | Focus Lock PWA je že nameščena ali vsaj enkrat uspešno naložena v podprtem brskalniku; uporabnik je v gostujočem načinu; začetna stran je odprta. |
| **Testni koraki** | 1. V brskalniku oziroma operacijskem sistemu onemogoči internetno povezavo.<br>2. Preveri prikaz opozorila o nedosegljivi povezavi oziroma strežniku.<br>3. Zaženi fokusni časovnik.<br>4. Počakaj najmanj 5 sekund in osveži stran.<br>5. Preveri obnovljeno stanje časovnika.<br>6. Ponovno omogoči internetno povezavo. |
| **Testni podatki** | Način: **Focus**; gostujoči način; internetna povezava: izklopljena med koraki 1–5. |
| **Pričakovani rezultat** | Aplikacija opozori na težavo s povezavo, vendar ostane uporabna. Časovnik se brez interneta zažene in odšteva. Po osvežitvi se PWA ponovno odpre, stanje tekoče seje pa se obnovi iz lokalne shrambe. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-010: Obvestilo ob koncu fokusnega intervala

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-010 |
| **Opis testa** | Preverjanje, ali aplikacija po dovoljenju uporabnika prikaže lokalno obvestilo ob koncu fokusnega intervala. |
| **Predpogoji** | Brskalnik podpira obvestila; dovoljenje za obvestila ni blokirano; Focus Lock je odprt; časovnik ne teče. |
| **Testni koraki** | 1. Odpri **Settings**.<br>2. Nastavi trajanje **Focus** na 1 minuto.<br>3. Vključi možnost **Notifications**.<br>4. Če brskalnik zahteva dovoljenje, izberi **Allow**.<br>5. Vrni se na časovnik in klikni **Start**.<br>6. Počakaj, da se interval konča.<br>7. Preveri sistemska obvestila. |
| **Testni podatki** | Trajanje fokusa: 1 minuta; obvestila: vključena; dovoljenje brskalnika: dovoljeno. |
| **Pričakovani rezultat** | Nastavitev obvestil ostane vključena. Ob zaključku enominutnega fokusnega intervala se prikaže sistemsko obvestilo aplikacije Focus Lock, ki uporabnika obvesti o koncu intervala. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |
