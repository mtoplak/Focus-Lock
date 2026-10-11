# Focus Lock — Ključne funkcionalnosti

**Focus Lock** je produktivnostna aplikacija v slogu Pomodoro, ki pomaga ohraniti osredotočenost z združitvijo časovnika za fokus in **lokalnega blokiranja motenj**. Na voljo je kot namestljiva Progressive Web App (PWA), podprta z majhnim API-jem za avtentikacijo in potisna obvestila ter z nativnim Windows namiznim agentom, ki na uporabnikovem računalniku uveljavlja blokade spletnih mest in aplikacij.

---

## Jedrne funkcionalnosti

To so zmožnosti, ki določajo izdelek:

| Področje | Kaj počne |
|----------|-----------|
| **Pomodoro časovnik** | Cikli fokus / kratek odmor / dolg odmor z nastavljivimi trajanji, samodejnim zagonom, preskokom, ponastavitvijo in ponastavitvijo cikla |
| **Blokiranje motenj** | Blokira izbrana spletna mesta in namizne aplikacije **med tekočo fokus sejo** |
| **Načrtovano blokiranje** | Blokira isti seznam v ponavljajočih se časovnih oknih — brez zagona časovnika |
| **Namizni agent** | Lokalna Windows storitev, ki uveljavlja DNS/URL blokiranje in zapira blokirane aplikacije |
| **Statistika** | Današnji čas fokusa, zgodovina sej ter števci blokiranih mest/aplikacij |
| **PWA + obvestila** | Namestljiva aplikacija, lupina prijazna do offline načina, obvestila ob koncu intervala (lokalni SW + Web Push) |

---

## 1. Pomodoro časovnik

Časovnik je glavna interakcijska površina aplikacije.

- **Načini:** Fokus, Kratek odmor, Dolg odmor  
- **Kontrole:** Start, premor, ponastavitev (trenutni interval), preskok, ponastavitev cikla  
- **Nastavitve:** Trajanja sej, število sej do dolgega odmora, samodejni zagon odmorov/fokusa, zvok, obvestila, strogi način, glasovno upravljanje  
- **Trajnost:** Stanje se shrani v brskalniku (`localStorage`), tako da osvežitev obnovi sejo  
- **Strogi način:** Med tekočo fokus sejo so spremembe načina in nekatere kontrole lahko zaklenjene  

**Ponastavitev cikla** znova zažene napredek Pomodoro proti dolgemu odmoru (nazaj na Fokus 1 od N), pri čemer ohrani dnevni seštevek sej za statistiko. **Ponastavitev vseh statistik** počisti zgodovino, števce blokad in števec »sej danes« pod časovnikom.

---

## 2. Blokiranje motenj

Blokiranje poganja enoten **seznam blokad** (spletna mesta in aplikacije) v zavihku **Blocks**.

Uveljavljanje se vklopi, ko velja **katerikoli** od pogojev:

1. **Fokus** seja **teče**, ali  
2. Omogočeno **načrtovano** časovno okno je aktivno  

Seznam se pošlje lokalnemu namiznemu agentu (`POST http://127.0.0.1:7777/sync`) z zastavico `focusActive`. Agent nato:

- **URL-ji:** preusmeri poizvedbe prek lokalnega DNS razreševalnika (privzeto) ali nadomestno prek datoteke hosts  
- **Aplikacije:** periodično poišče ujemajoče se procese in jih prekine  

Ko se fokus konča (ali se konča načrtovano okno) in nič drugega ne zahteva blokiranja, agent preneha uveljavljati blokade in obnovi sistemski DNS.

> **Opomba:** Blokiranje URL-jev na Windows običajno zahteva zagon agenta **kot skrbnik** (vrata 53 in spremembe DNS na vmesniku).

---

## 3. Načrtovano blokiranje

Urniki so ponavljajoča se okna **dan + ura**, shranjena lokalno (`fl.schedules`).

- Isti seznam blokad kot pri Pomodoro fokusu — urniki odgovarjajo le na **kdaj**, ne na **kaj**  
- Podpirajo okna znotraj istega dne in čez polnoč  
- V brskalniku se periodično znova ovrednotijo (~15 s), da se blokiranje vklopi/izklopi na mejah  
- Neodvisni od časovnika (brez odštevanja, statistik ali obvestil iz samega urnika)  

Logika urnikov teče v PWA; agent prejme le »blokiranje vklopljeno/izklopljeno + sezname«.

---

## 4. Namizni agent (Windows)

Proces v Rustu, ki teče na uporabnikovem računalniku in posluša na `127.0.0.1:7777`.

| Odgovornost | Mehanizem |
|-------------|-----------|
| Sinhronizacija s PWA | HTTP API (`/sync`, `/status`, nameščene aplikacije, ikone) |
| Blokiranje spletnih mest | Lokalni DNS na `127.0.0.1:53` + začasna preusmeritev sistemskega DNS |
| Blokiranje aplikacij | Pregled procesov + prekinitev |
| Signali za statistiko | Števci prekinitev in DNS poizvedb za zavihek Stats |

Če se agent nepravilno ustavi med aktivno preusmeritvijo DNS, lahko Wi‑Fi pokaže »Ni interneta«, dokler DNS ni obnovljen (čiščenje ob zagonu agenta ali nastavitev DNS vmesnika nazaj na DHCP). Glej [desktop-agent/docs/DNS_BLOCKING.md](../desktop-agent/docs/DNS_BLOCKING.md).

---

## 5. Statistika

Statistika na napravi (`localStorage`), po želji obogatena z deltami agenta:

- Minute fokusa in dokončane seje po dnevih  
- Najbolj blokirana spletna mesta (števci DNS poizvedb)  
- Najbolj blokirane aplikacije (števci prekinitev)  
- Nizi / osebni rekordi iz zgodovine  

**Ponastavitev vseh statistik** počisti prikazano zgodovino in števce blokad ter ponastavi števec »sej danes« na časovniku, ne da bi izbrisala nastavitve, seznam blokad ali prijavo.

---

## 6. PWA, offline uporaba in obvestila

### Progressive Web App

- Namestljiva (**standalone** prikaz, ikone, bližnjice) prek Web App Manifest  
- Lasten service worker (`injectManifest` / Workbox): predpomnjenje lupine, offline navigacija na `index.html`, strategije predpomnjenja pisav  
- Samodejna posodobitev service workerja  

### Offline / okrnjena povezljivost

Lokalno deluje brez interneta za časovnik, bloke, urnike in sinhronizacijo z agentom na localhost. Prijava, osvežitev žetonov in Web Push potrebujejo backend. Pasica offline opozori na težave z brskalnikom/API-jem/internetom.

### Obvestila

| Pot | Kdaj pomaga |
|-----|-------------|
| Lokalna budilka v strani / SW | Aplikacija ali SW je še živ, ko se interval konča |
| **Web Push** (backend + VAPID) | Aplikacija zaprta; prijavljen uporabnik; obvestila omogočena |

Web Push zahteva VAPID ključe na backendu in registrirano potisno naročnino. Gostujoči način ne uporablja strežniškega pusha.

---

## 7. Avtentikacija

- Google OAuth in e-pošta/geslo prek Express backenda  
- Gostujoči način: celoten lokalni UX časovnika/blokiranja brez računov ali Web Push  
- JWT access + refresh žetoni; profil predpomnjen za kratko offline nadaljevanje  

---

## Arhitektura (pregled)

```
┌─────────────────────┐     sync      ┌──────────────────────┐
│  Focus Lock PWA     │ ────────────► │  Namizni agent       │
│  (React / Vite)     │  127.0.0.1    │  (Rust / Windows)    │
│  Timer · Blocks ·   │               │  DNS · app kill      │
│  Schedule · Stats   │               └──────────────────────┘
└─────────┬───────────┘
          │ HTTPS (auth, push)
          ▼
┌─────────────────────┐
│  Backend (Express)  │
│  Auth · Web Push    │
│  PostgreSQL         │
└─────────────────────┘
```

---

## Tehnološki sklad

| Sloj | Sklad |
|------|--------|
| Frontend | Vite 6, React 19, Tailwind CSS 4, `vite-plugin-pwa`, Vitest |
| Backend | Node, Express, TypeScript, PostgreSQL |
| Namizni agent | Rust, Axum, sysinfo (Windows) |
| Dostava | Docker Compose (razvoj + produkcijsko podobno) |

---

## Povezana dokumentacija

- [Korenski README](../README.md) — namestitev in Docker  
- [Frontend README](../frontend/README.md)  
- [Backend README](../backend/README.md)  
- [Namizni agent README](../desktop-agent/README.md)  
- [Opombe o DNS blokiranju](../desktop-agent/docs/DNS_BLOCKING.md)  
- [Angleška različica](./FEATURES.md)  
