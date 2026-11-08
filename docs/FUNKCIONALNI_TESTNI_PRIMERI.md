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
| **Pričakovani rezultat** | 1. Prikaže se prijavna stran z gumbom **Continue as guest**.<br>2. Aplikacija sprejme izbiro in uporabnika brez prijave spusti naprej.<br>3. Prikaže se glavna stran s časovnikom.<br>4. V uporabniškem meniju je navedeno, da se uporablja lokalni oziroma gostujoči način (**Local only — not synced**). |
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
| **Pričakovani rezultat** | 1. Prikazan je začetni čas `25:00`, časovnik ne teče.<br>2. Časovnik se zažene in prikazani čas začne upadati.<br>3. Prikazani čas je nižji od `25:00`.<br>4. Časovnik se ustavi.<br>5. Prikazani čas se ne spreminja.<br>6. Čas se vrne na `25:00`, časovnik pa ostane ustavljen. |
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
| **Pričakovani rezultat** | 1. Prikaže se zavihek **Blocks** s seznamom blokad.<br>2. Vnos `example.com` se prikaže na seznamu blokad.<br>3. Prikaže se časovnik, fokusna seja se začne in čas odšteva.<br>4. Spletno mesto med aktivno fokusno sejo ni dosegljivo.<br>5. Fokusna seja ni več aktivna.<br>6. Ker fokusna seja ni več aktivna in ni aktivnega urnika, je spletno mesto ponovno dosegljivo. |
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
| **Pričakovani rezultat** | 1. Prikaže se zavihek **Schedule**.<br>2. Ponedeljek je izbran.<br>3. Začetni čas je nastavljen na `09:00`, končni čas pa na `10:00`.<br>4. Urnik se doda.<br>5. Urnik za ponedeljek od `09:00` do `10:00` se prikaže na seznamu.<br>6. Stran se ponovno naloži.<br>7. Isti urnik je še vedno prikazan z nespremenjenimi podatki. |
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
| **Pričakovani rezultat** | 1. Prikaže se zavihek **Stats**.<br>2. Prikazane vrednosti vsebujejo najmanj eno zaključeno fokusno sejo ali blokiran dogodek.<br>3. Odpre se potrditveno pogovorno okno.<br>4. Pogovorno okno se zapre in ponastavitev se izvede.<br>5. Zgodovina sej, števci blokiranih mest/aplikacij in števec današnjih sej so ponastavljeni na nič oziroma prazno stanje.<br>6. Ponastavljeno stanje se po osvežitvi strani ohrani, nastavitve in seznam blokad pa ostanejo nespremenjeni. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-006: Registracija z e-poštnim naslovom in geslom

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-006 |
| **Opis testa** | Preverjanje, ali lahko nov uporabnik ustvari račun z veljavnim e-poštnim naslovom in geslom. |
| **Predpogoji** | Frontend, backend in podatkovna baza so zagnani; uporabnik ni prijavljen; e-poštni naslov še ni registriran. |
| **Testni koraki** | 1. Odpri prijavno stran Focus Lock.<br>2. Izberi zavihek **Sign up**.<br>3. Vnesi ime, e-poštni naslov in geslo.<br>4. Klikni **Create account**.<br>5. Počakaj na zaključek registracije.<br>6. Odpri uporabniški meni. |
| **Testni podatki** | Ime: `Testni Uporabnik`;<br>e-pošta: nov enoličen naslov, na primer `test.focuslock+006@example.com` (pri vsaki ponovitvi testa drug naslov, npr. z dodano oznako `+006-<datum>`);<br>geslo: `Testiranje123!` (najmanj 8 znakov). |
| **Pričakovani rezultat** | 1. Prikaže se prijavna stran z zavihkoma **Sign in** in **Sign up**.<br>2. Prikaže se obrazec za registracijo s polji **Name (optional)**, **Email** in **Password (min 8 characters)** ter gumbom **Create account**.<br>3. Polja vsebujejo vnesene podatke.<br>4. Gumb med pošiljanjem prikaže **Creating account…**; sporočilo o napaki se ne prikaže.<br>5. Račun se uspešno ustvari, uporabnik je preusmerjen na glavno stran s časovnikom.<br>6. V uporabniškem meniju sta prikazana ime `Testni Uporabnik` in registrirani e-poštni naslov (ne **Local only — not synced**); na voljo je možnost **Sign out**. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-007: Zaklep kontrol v strogem načinu

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-007 |
| **Opis testa** | Preverjanje, ali strogi način med aktivno fokusno sejo prepreči prekinjanje seje in spreminjanje nastavitev oziroma seznama blokad. |
| **Predpogoji** | Uporabnik je v aplikaciji; časovnik ne teče; izbran je način **Focus**; **Strict mode** je izklopljen; na seznamu blokad je vsaj en omogočen vnos (privzeti seznam vsebuje `youtube.com`). |
| **Testni koraki** | 1. Odpri **Settings** in vključi **Strict mode**.<br>2. Vrni se na časovnik in klikni **Start**.<br>3. Poskusi uporabiti kontrole **Pause**, **Reset** in **Skip** (z gumbi in z bližnjicami na tipkovnici Space, R, S).<br>4. Poskusi spremeniti način časovnika (gumba **Short break** in **Long break**, bližnjica 2).<br>5. Odpri **Blocks** in poskusi dodati, odstraniti ali izklopiti vnos.<br>6. Odpri **Settings** in poskusi spremeniti trajanje seje. |
| **Testni podatki** | Strogi način: vključen; način: **Focus**; obstoječi vnos na seznamu blokad: `youtube.com`. |
| **Pričakovani rezultat** | 1. **Strict mode** je vključen.<br>2. Prikaže se časovnik, fokusna seja se začne in čas odšteva; prikaže se opozorilo **Strict mode locked**.<br>3. Gumbi **Pause**, **Reset** in **Skip** so onemogočeni, bližnjice nimajo učinka; intervala ni mogoče začasno ustaviti, ponastaviti ali preskočiti, časovnik še naprej odšteva.<br>4. Gumba za menjavo načina sta onemogočena; izbran ostane način **Focus**.<br>5. Vnosno polje in gumb **Add** sta onemogočena, stikalo vnosa je onemogočeno, gumb za odstranitev vnosa ni prikazan; vnos `youtube.com` ostane na seznamu in omogočen.<br>6. Nastavitve so onemogočene in prikazano je sporočilo **Locked while a strict-mode focus session is running.**; trajanje seje ostane nespremenjeno, časovnik pa še naprej odšteva. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-008: Blokiranje namizne aplikacije med fokusno sejo

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-008 |
| **Opis testa** | Preverjanje, ali Windows namizni agent med fokusno sejo zapre aplikacijo, ki je dodana na seznam blokad. |
| **Predpogoji** | Test se izvaja v sistemu Windows 11; namizni agent je zagnan kot skrbnik; fokusna seja ne teče in ni aktivnega urnika; Beležnica (Windows 11 različica iz Microsoft Store, `notepad.exe`) je nameščena, **zagnana** in ni na seznamu blokad. |
| **Testni koraki** | 1. Odpri zavihek **Blocks** in izberi vrsto **App**.<br>2. Klikni **Pick from your installed apps**, v seznamu izberi **Notepad** (`notepad.exe`, oznaka **running**) in klikni **Add**.<br>3. Počakaj najmanj 5 sekund in preveri, da Beležnica ostane odprta.<br>4. Vrni se na časovnik in klikni **Start**.<br>5. Počakaj najmanj 3 sekunde.<br>6. Med še vedno aktivno fokusno sejo ponovno zaženi Beležnico. |
| **Testni podatki** | Aplikacija: Beležnica, izvedljiva datoteka `notepad.exe`. |
| **Opomba** | Izbirnik prikaže aplikacije iz menija Start in trenutno zagnane procese, programe v mapi `C:\Windows\` pa skrije kot sistemske. Beležnica v sistemu Windows 11 nima bližnjice v meniju Start, zato se v izbirniku prikaže le, ko je zagnana (zato je to predpogoj). V sistemu Windows 10 je Beležnica v `C:\Windows\System32` in se v izbirniku ne prikaže; tam v koraku 2 uporabi **Don't see your app? Type it manually** in vpiši `notepad.exe`. |
| **Pričakovani rezultat** | 1. Prikaže se zavihek **Blocks**, izbrana je vrsta **App**; gumb **Pick from your installed apps** je omogočen (agent je povezan).<br>2. Odpre se okno **Pick apps to block**, v katerem je Notepad označen kot **running**; po kliku **Add** se `notepad.exe` prikaže kot omogočen vnos na seznamu blokad, prikazano je stanje **Desktop agent connected**.<br>3. Beležnica pred začetkom fokusa ostane odprta.<br>4. Prikaže se časovnik, fokusna seja se začne in čas odšteva.<br>5. Agent odprto Beležnico zapre; na zavihku **Blocks** je prikazano **Desktop agent connected — last block: Notepad.exe**.<br>6. Agent ponovno zagnano Beležnico v nekaj sekundah (agent preverja procese vsaki 2 s) zapre. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-009: Uporaba časovnika brez internetne povezave

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-009 |
| **Opis testa** | Preverjanje, ali že naložena PWA omogoča lokalno uporabo časovnika in ohrani njegovo stanje, ko internetna povezava ni na voljo. |
| **Predpogoji** | Uporablja se produkcijska gradnja aplikacije (npr. `docker compose up` ali `vite build` + `vite preview`), ne razvojni strežnik Vite; Focus Lock PWA je v podprtem brskalniku vsaj enkrat uspešno naložena in service worker je aktiven; uporabnik je v gostujočem načinu; začetna stran je odprta; časovnik ne teče. |
| **Testni koraki** | 1. Onemogoči povezavo: v DevTools (zavihek **Network** → **Offline**) ali v operacijskem sistemu. Če aplikacija teče lokalno (`localhost`), uporabi DevTools, ker izklop interneta ne prekine dostopa do `localhost`.<br>2. Preveri prikaz opozorila o nedosegljivi povezavi.<br>3. Zaženi fokusni časovnik.<br>4. Počakaj najmanj 5 sekund in osveži stran.<br>5. Preveri obnovljeno stanje časovnika.<br>6. Ponovno omogoči povezavo. |
| **Testni podatki** | Način: **Focus**; gostujoči način; povezava: izklopljena med koraki 1–5. |
| **Pričakovani rezultat** | 1. Povezava je onemogočena, aplikacija ostane odprta.<br>2. Prikaže se opozorilo **You're offline. Timer and blocking still work. Sign-in and push notifications need a connection.**; aplikacija ostane uporabna (gumb **Start** je omogočen).<br>3. Časovnik se brez povezave zažene in odšteva.<br>4. PWA se po osvežitvi ponovno odpre (postreže jo service worker), opozorilo je še vedno prikazano.<br>5. Stanje tekoče seje se obnovi iz lokalne shrambe: časovnik še vedno teče v načinu **Focus**, preostali čas ni ponastavljen na začetek in je manjši za čas, ki je pretekel med osvežitvijo.<br>6. Opozorilo v nekaj sekundah izgine; seja še vedno teče, aplikacija ostane uporabna. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |

## TC-FL-010: Obvestilo ob koncu fokusnega intervala

| Element | Vsebina |
|---|---|
| **ID testnega primera** | TC-FL-010 |
| **Opis testa** | Preverjanje, ali aplikacija po dovoljenju uporabnika prikaže lokalno obvestilo ob koncu fokusnega intervala. |
| **Predpogoji** | Brskalnik podpira obvestila; dovoljenje za obvestila za to stran ni blokirano (privzeto stanje **Ask**); Focus Lock je odprt; časovnik ne teče; obvestila operacijskega sistema niso utišana (npr. način »Ne moti«). |
| **Testni koraki** | 1. Odpri **Settings**.<br>2. Nastavi trajanje **Focus** na 1 minuto (vrednost `1` vpiši v polje).<br>3. Možnost **Notifications** je privzeto vključena: izklopi jo in ponovno vključi, da aplikacija zahteva dovoljenje brskalnika.<br>4. Ko brskalnik zahteva dovoljenje, izberi **Allow**.<br>5. Vrni se na časovnik in klikni **Start**.<br>6. Počakaj, da se interval konča.<br>7. Preveri sistemska obvestila. |
| **Testni podatki** | Trajanje fokusa: 1 minuta; obvestila: vključena; dovoljenje brskalnika: dovoljeno. |
| **Pričakovani rezultat** | 1. Prikaže se zavihek **Settings**.<br>2. Trajanje **Focus** je nastavljeno na 1 minuto.<br>3. Možnost **Notifications** se izklopi in ob ponovnem vklopu brskalnik zahteva dovoljenje.<br>4. Dovoljenje je odobreno, nastavitev obvestil ostane vključena.<br>5. Prikaže se časovnik s prikazom `01:00`, fokusni interval se začne in čas odšteva; prikaže se obvestilo **Focus session started** (»Time to focus – eyes on the task.«).<br>6. Enominutni fokusni interval se zaključi, časovnik preklopi v način **Short break**.<br>7. Prikaže se sistemsko obvestilo **Focus session complete** z besedilom »Nice work – time for a break.«. |
| **Dejanski rezultat** | Ni še izvedeno. |
| **Status** | Ni izvedeno (Pass/Fail po izvedbi). |
