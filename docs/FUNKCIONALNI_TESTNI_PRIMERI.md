# Funkcionalni testni primeri za Focus Lock

Dokument vsebuje pet ročnih funkcionalnih testnih primerov za ključne uporabniške tokove aplikacije Focus Lock. Polji **Dejanski rezultat** in **Status** tester izpolni po izvedbi posameznega testa.

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
