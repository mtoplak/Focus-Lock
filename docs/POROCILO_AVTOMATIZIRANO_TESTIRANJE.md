# Poročilo o avtomatiziranem funkcionalnem testiranju – Focus Lock

## 1. Povzetek

| Postavka | Vrednost |
|---|---|
| Testirani sistem | Focus Lock (React 19 + Vite PWA, Express API, PostgreSQL, Windows namizni agent v Rustu) |
| Orodje | Playwright Test 1.56.1 (Chromium) |
| Avtomatizirani testni primeri | TC-FL-006 – TC-FL-010 (5 primerov) |
| Lokacija testov | `frontend/e2e/`, konfiguracija `frontend/playwright.config.ts` |
| Cevovod | GitHub Actions, `.github/workflows/e2e.yml`, posel `e2e` |
| Rezultat lokalne izvedbe | 5/5 uspešnih; 25/25 uspešnih v ponovljenih zagonih (3× in 2× celoten nabor), brez nestabilnih testov |
| Ugotovljene napake | 1 napaka v aplikaciji (obvestila), 1 neizvedljiv testni primer (TC-FL-008), več nenatančnih pričakovanih rezultatov |

## 2. Izbira orodja

### 2.1 Upoštevana orodja

| Orodje | Prednosti za Focus Lock | Slabosti za Focus Lock |
|---|---|---|
| **Playwright** | Teste pišemo v TypeScriptu kot preostali projekt; podpira service workerje, način brez povezave (`context.setOffline`), dovoljenja brskalnika (`permissions: ['notifications']`), prestrezanje omrežnih zahtev (`page.route`) za lažnega namiznega agenta; sam zažene backend in frontend (`webServer`); samodejno čakanje na elemente; vgrajena poročila JUnit in HTML | Ne more upravljati programov operacijskega sistema (pravega zapiranja procesov v TC-FL-008 ne vidi) |
| Cypress | Dobro razvojno okolje, TypeScript | Testi tečejo znotraj strani, zato sta testiranje service workerja in pravega načina brez povezave omejena; dovoljenja za obvestila in več zavihkov podpira slabo |
| Selenium WebDriver | Standard, podpira več jezikov | Več ročne kode za čakanje, brez vgrajenega prestrezanja zahtev in zaganjanja strežnikov, počasnejša nastavitev v CI |
| Vitest + Testing Library | Že v projektu, zelo hiter | Teče v jsdom, ne v pravem brskalniku: ni service workerja, ni pravega omrežja, ni obvestil – za funkcionalne teste od konca do konca ni primeren |

### 2.2 Utemeljitev

Izbrali smo **Playwright**, ker:

1. je narejen za spletne aplikacije v JavaScriptu/TypeScriptu, kar je naš frontend (Vite + React) in backend (Node + Express); testi so v istem jeziku in uporabljajo isti `npm`;
2. pokrije posebnosti naših testnih primerov, ki jih druga orodja ne pokrijejo ali jih pokrijejo slabo: PWA brez povezave (TC-FL-009), dovoljenje za obvestila (TC-FL-010), lažni lokalni agent na `127.0.0.1:7777` (TC-FL-008);
3. selektorje gradi po vlogah in dostopnih imenih (`getByRole`, `getByLabel`), ki jih naša aplikacija že ima zaradi dostopnosti, in samodejno čaka na elemente – to zmanjša nestabilnost testov;
4. se preprosto vključi v cevovod: ukaz `npx playwright test` vrne izhodno kodo ≠ 0 ob napaki, rezultate pa zapiše v **JUnit XML** (berljivo za CI) in **HTML** poročilo s posnetki zaslona, videi in sledmi (trace) neuspelih testov.

### 2.3 Namestitev

```bash
cd frontend
npm install -D @playwright/test@1.56.1
npx playwright install chromium         # v CI: npx playwright install --with-deps chromium
```

V `frontend/package.json` sta dodana ukaza:

```bash
npm run test:e2e          # zažene vse funkcionalne teste
npm run test:e2e:report   # odpre HTML poročilo zadnje izvedbe
```

Lokalni zagon potrebuje PostgreSQL (zaradi registracije v TC-FL-006). Naslov baze se poda s spremenljivko `E2E_DATABASE_URL` (privzeto `postgresql://focuslock:focuslock@localhost:5432/focuslock`, kar ustreza `docker compose up db`).

### 2.4 Konfiguracija (`frontend/playwright.config.ts`)

- **Strežnika:** Playwright pred testi zažene backend (`tsx src/index.ts`, vrata 3101, migracije ob zagonu) in **produkcijsko gradnjo** frontenda (`vite build` + `vite preview`, vrata 4173). Produkcijska gradnja je nujna, da service worker deluje kot v pravi namestitvi.
- **Brskalnik:** Chromium (`channel: 'chromium'`, novi način brez glave), ker privzeta lupina brez glave ne podpira dovoljenja za obvestila.
- **Poročila:** `list` (konzola), `html` (`playwright-report/`), `junit` (`test-results/junit.xml`).
- **Ob napaki:** posnetek zaslona, video in trace (`retain-on-failure`).
- **V CI:** 1 ponovitev ob neuspehu (označi nestabilne teste kot »flaky«), `forbidOnly`.

## 3. Vključitev v cevovod

Datoteka `.github/workflows/e2e.yml` (potek »Functional tests«) se sproži ob vsakem `push` na `main`, ob vsakem pull requestu in ročno (`workflow_dispatch`).

Potek posla `e2e`:

1. GitHub Actions zažene storitev **PostgreSQL 16** (enak obraz kot v `docker-compose.yml`) in počaka, da je pripravljena.
2. Namesti odvisnosti backenda in frontenda (`npm ci`) ter Chromium (`npx playwright install --with-deps chromium`).
3. Zažene `npx playwright test`; Playwright sam zažene backend in frontend.
4. **Rezultati:**
   - JUnit XML se z akcijo `dorny/test-reporter` objavi kot **check** »Playwright results« na commitu/PR-ju (seznam testov z uspehom ali napako);
   - HTML poročilo se shrani kot artefakt `playwright-report` (14 dni);
   - ob neuspehu se shranijo še posnetki zaslona, videi in trace (artefakt `playwright-test-results`);
   - neuspel test povzroči neuspel posel, kar blokira združitev PR-ja, če je to v nastavitvah repozitorija zahtevano.

## 4. Avtomatizirani testni primeri

| TC | Skripta | Kaj je avtomatizirano | Česa skripta ne preveri |
|---|---|---|---|
| TC-FL-006 | `e2e/tc-fl-006-registracija.spec.ts` | Celoten tok skozi pravi backend in bazo | – |
| TC-FL-007 | `e2e/tc-fl-007-strogi-nacin.spec.ts` | Celoten tok, vključno z bližnjicami na tipkovnici | – |
| TC-FL-008 | `e2e/tc-fl-008-blokiranje-aplikacije.spec.ts` | Tok v PWA: izbira aplikacije, vnos na seznamu, ukaz agentu ob začetku fokusa, prikaz zaprtja | Pravega zapiranja procesa v Windows (agent je nadomeščen z lažnim agentom) – preveri se ročno |
| TC-FL-009 | `e2e/tc-fl-009-brez-povezave.spec.ts` | Celoten tok na produkcijski gradnji s service workerjem | – |
| TC-FL-010 | `e2e/tc-fl-010-obvestilo.spec.ts` | Celoten tok z dejanskim enominutnim intervalom | Ali operacijski sistem obvestilo res pokaže na zaslonu (skripta preveri klic `showNotification`/`Notification` z naslovom in besedilom) |

Skripte so razdeljene na korake `test.step(...)` z enakimi številkami in imeni kot v testnem primeru, zato se v poročilu HTML vidi, kateri korak testnega primera je padel.

## 5. Pregled skript

Za vsako skripto smo preverili tri merila iz navodil.

### 5.1 Ali so zajeti vsi koraki, predpogoji in testni podatki

| TC | Predpogoji | Koraki | Testni podatki |
|---|---|---|---|
| 006 | Neprijavljen uporabnik = nov kontekst brskalnika; neregistriran e-naslov = enoličen naslov ob vsakem zagonu; backend in baza zažene Playwright | 1–6 | Ime `Testni Uporabnik`, e-naslov `test.focuslock+006-…@example.com`, geslo `Testiranje123!` |
| 007 | Vstop kot gost; preveri, da je časovnik ustavljen, izbran **Focus** in da je `youtube.com` na seznamu | 1–6 | Strict mode, Focus, `youtube.com` |
| 008 | Lažni agent: povezan, Beležnica zagnana; preveri, da fokus ne teče in `notepad.exe` ni na seznamu | 1–6 | `notepad.exe` |
| 009 | Produkcijska gradnja; počaka, da service worker nadzoruje stran; gost; časovnik ustavljen | 1–6 | Focus, gost, brez povezave v korakih 1–5 |
| 010 | Dovoljenje za obvestila podeljeno kontekstu; preveri, da ni `denied`; časovnik ustavljen | 1–7 | 1 minuta, obvestila vključena, dovoljenje dovoljeno |

### 5.2 Ali skripta preverja pričakovani rezultat

Vsak korak ima trditve (`expect`) za pričakovani rezultat iz testnega primera, ne le za nalaganje strani. Primeri:

- TC-006: status odgovora `201` na `/api/auth/register`, odsotnost sporočila o napaki (`role="alert"`), URL `/`, ime in e-naslov v meniju ter odsotnost besedila gostujočega načina.
- TC-007: gumbi so `disabled`, po pritisku Space/R/S časovnik še teče v načinu Focus in čas pada, stikalo vnosa ostane `aria-checked="true"`, trajanje ostane `25`.
- TC-009: točno besedilo opozorila; po osvežitvi časovnik teče, preostali čas je ≤ času pred osvežitvijo in ni ponastavljen; po vklopu povezave opozorilo izgine.
- TC-010: obvestili »Focus session started« in »Focus session complete« s točnim besedilom; časovnik preklopi v **Short break**.

**Preverjanje z namerno pokvarjeno aplikacijo:** da skripte res zaznajo napako, smo aplikacijo začasno pokvarili in test pognali znova:

| TC | Namerna napaka v aplikaciji | Rezultat testa | Korak, v katerem test pade |
|---|---|---|---|
| 006 | Uporabniški meni namesto e-naslova vedno kaže »Local only — not synced« (`UserMenu.tsx`) | Pade | 6. Odpri uporabniški meni |
| 007 | Strogi način nikoli ne zaklene kontrol (`isStrictLocked = false`, `HomePage.tsx`) | Pade | 2. (ni opozorila **Strict mode locked**) |
| 008 | Začetek fokusa agentu ne sporoči `focusActive: true` (`useAgentSync`, `HomePage.tsx`) | Pade | 5. Agent zapre odprto Beležnico |
| 009 | Stanje časovnika se ob nalaganju ne prebere iz `localStorage` (`useTimer.ts`) | Pade | 5. Stanje tekoče seje se obnovi |
| 009 | Service worker ne predpomni datotek (`sw.ts`) | Pade | 4. Osvežitev (`net::ERR_INTERNET_DISCONNECTED`) |
| 010 | Ob koncu intervala se ne pokliče `notifyTimer('end')` (`useTimer.ts`) | Pade | 7. Preveri obvestilo o koncu intervala |

Vse namerne napake so bile zaznane v koraku, ki ustreza pokvarjeni funkcionalnosti. Spremembe aplikacije so bile po vsakem preizkusu povrnjene.

### 5.3 Robustnost

- **Izbira elementov:** samo po vlogi in dostopnem imenu (`getByRole('button', { name: 'Start' })`, `getByRole('switch', { name: 'Strict mode' })`, `getByLabel('Email')`). Ni CSS razredov ali XPath, zato zamenjava sloga (Tailwind) testov ne zlomi. Preostali čas se bere iz dostopnega imena časovnika (`role="timer"`), ki vsebuje točne sekunde.
- **Čakanje:** nobene fiksne pavze (`waitForTimeout`). Uporabljene so samodejno čakajoče trditve (`toBeVisible`, `toHaveAttribute`) in `expect.poll` za pogoje, npr. »preteklo je vsaj 5 sekund« (TC-009) ali »agent je vsaj dvakrat pregledal procese« (TC-008).
- **Neodvisnost:** vsak test dobi nov kontekst brskalnika (prazen `localStorage`), vstopi prek prave prijavne strani in si ustvari lastne podatke (enoličen e-naslov). Testi tečejo vzporedno in v poljubnem vrstnem redu.
- **Zunanje odvisnosti:** javni preizkus internetne povezave (`connectivitycheck.gstatic.com`) in namizni agent sta v vseh testih nadomeščena (`e2e/fixtures.ts`), da rezultat ni odvisen od omrežja ali računalnika.
- **Stabilnost:** celoten nabor smo zagnali s `--repeat-each=3` in `--repeat-each=2` brez ponovitev ob napaki (25 izvedb), vse so bile uspešne.

## 6. Popravki testnih primerov

Pri avtomatizaciji in pregledu kode smo v `docs/FUNKCIONALNI_TESTNI_PRIMERI.md` popravili:

| TC | Težava | Popravek |
|---|---|---|
| TC-FL-008 | **Neizvedljiv.** Izbirnik aplikacij skrije programe v `C:\Windows\` (`desktop-agent/src/discovery.rs`). V Windows 10 je Beležnica v `C:\Windows\System32`, zato je v izbirniku ni. V Windows 11 je Beležnica aplikacija iz trgovine brez bližnjice v meniju Start, zato je v izbirniku le, ko je zagnana – korak »izberi« pa je bil pred korakom »zaženi«. | Predpogoj Windows 11 in zagnana Beležnica; dodani natančni gumbi (**Pick from your installed apps**, **Add**) in pričakovano stanje agenta; opomba za Windows 10 (ročni vnos **Don't see your app? Type it manually**). |
| TC-FL-010 | **Napačen korak.** Možnost **Notifications** je privzeto že vključena, zato jo korak 3 »vključi« v resnici izklopi (to je odkril avtomatiziran test). Manjkalo je obvestilo ob začetku in točno besedilo. | Korak 3: izklopi in ponovno vključi; dodani obvestili »Focus session started« in »Focus session complete« z besedilom ter preklop v **Short break**. |
| TC-FL-009 | Izklop interneta ne prekine dostopa do `localhost`, zato bi osvežitev uspela tudi brez service workerja; na razvojnem strežniku Vite osvežitev brez povezave ne deluje. Pričakovani rezultati 5 in 6 so bili ohlapni. | Predpogoj produkcijska gradnja; izklop prek DevTools; točno besedilo opozorila; natančen rezultat za obnovljen čas in izginotje opozorila. |
| TC-FL-007 | Vnos na seznamu blokad je bil le med testnimi podatki; gumb za odstranitev je v strogem načinu skrit, ne onemogočen. | Vnos dodan v predpogoje; natančni pričakovani rezultati (opozorilo **Strict mode locked**, skrit gumb, sporočilo v nastavitvah). |
| TC-FL-006 | Manjkali so natančni nazivi polj in besedilo gumba med pošiljanjem; e-naslov mora biti ob vsaki ponovitvi nov. | Dopolnjeni pričakovani rezultati in testni podatki. |

## 7. Ugotovljene napake v aplikaciji

| ID | Opis | Resnost | Kako se pokaže |
|---|---|---|---|
| BUG-01 | Nastavitev **Notifications** je privzeto vključena (`DEFAULT_SETTINGS.notificationsEnabled = true`), čeprav brskalnik dovoljenja še ni dal (stanje `default`). Stikalo kaže »vključeno«, `notifyTimer` pa obvestilo tiho preskoči, ker dovoljenje ni `granted`. Nov uporabnik zato obvestil ne dobi, čeprav so v nastavitvah prikazana kot vključena. | Srednja | Nov profil brskalnika → Settings: Notifications je vključen → zaženi interval → ob koncu ni obvestila. Uporabnik mora stikalo izklopiti in ponovno vključiti. |

Predlog popravka: privzeto `notificationsEnabled: false` ali prikaz stikala kot vključenega le, ko je `Notification.permission === 'granted'`.

## 8. Rezultati izvedbe

Lokalna izvedba (macOS, Node 24, Chromium 141.0.7390.37, PostgreSQL 17), 8. 11. 2026:

| TC | Ime testa | Status | Trajanje |
|---|---|---|---|
| TC-FL-006 | Registracija z e-poštnim naslovom in geslom | Pass | 0,9 s |
| TC-FL-007 | Zaklep kontrol v strogem načinu | Pass | 4,2 s |
| TC-FL-008 | Blokiranje namizne aplikacije med fokusno sejo (lažni agent) | Pass | 16,6 s |
| TC-FL-009 | Uporaba časovnika brez internetne povezave | Pass | 7,1 s |
| TC-FL-010 | Obvestilo ob koncu fokusnega intervala | Pass | 60 s |

Celoten nabor teče vzporedno in traja približno 1,3 minute (vključno z zagonom strežnikov) (najdaljši je TC-FL-010 z enominutnim intervalom).

Izvedba v cevovodu: rezultat je viden v zavihku **Actions** repozitorija (potek »Functional tests«) in kot check »Playwright results« na commitu. *(Dopolni s povezavo na prvi uspešen zagon.)*

Opomba: obstoječi enotski testi (Vitest) imajo 2 neuspela testa, ki nista povezana s to nalogo: `notify.test.ts` in `timerNotificationContent.test.ts` pričakujeta pomišljaj »—«, aplikacija pa uporablja »–«. Zato enotski testi v cevovod niso vključeni, dokler se to ne uskladi.

## 9. Omejitve

- **TC-FL-008:** pravo zapiranje procesa v Windows preveri samo ročni test, ker zahteva Windows, agenta s skrbniškimi pravicami in pravo aplikacijo. Avtomatiziran test preveri vse, kar naredi PWA, in obnašanje agenta posnema po kodi `desktop-agent/src/blocker.rs`.
- **TC-FL-010:** Playwright ne vidi sistemskih obvestil operacijskega sistema; preveri klic API-ja za obvestila z naslovom in besedilom.
- Testi tečejo le v Chromiumu, ker je aplikacija namenjena Windows namizju (Chrome/Edge); Firefox in WebKit drugače podpirata obvestila in service workerje.
