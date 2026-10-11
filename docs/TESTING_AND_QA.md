# Stanje testiranja in zagotavljanja kakovosti

Ta dokument opisuje aktivnosti testiranja in zagotavljanja kakovosti, ki so v rešitvi Focus Lock **že prisotne**. Za vsako aktivnost so navedeni: vrsta aktivnosti, stanje, pokriti del rešitve, uporabljena orodja in ogrodja ter uporaba umetne inteligence (če je bila uporabljena — orodje in način preverjanja rezultata).

---

## Povzetek

| Aktivnost | Stanje |
|-----------|--------|
| Avtomatizirani testi frontenda (Vitest) | Prisotno |
| Enotski testi namiznega agenta (`cargo test`) | Prisotno |
| Statično preverjanje tipov TypeScript (`tsc`) | Prisotno |
| Ročni postopki QA (dokumentacija) | Delno |
| Docker Compose healthcheck (baza) | Delno |
| Avtomatizirani testi backenda | Ni prisotno |
| Končni (E2E) testi | Ni prisotno |
| CI cevovod (GitHub Actions ipd.) | Ni prisotno |
| Poročila o pokritosti kode | Ni prisotno |
| Namenjena orodja za lint/format (ESLint, Prettier, Clippy) | Ni prisotno |

---

## 1. Avtomatizirani testi frontenda

| Polje | Podrobnosti |
|-------|-------------|
| **Vrsta aktivnosti** | Avtomatizirani enotski testi in komponentni («feature») testi |
| **Stanje** | Prisotno — zagon lokalno prek npm skript; ni povezano v CI |
| **Pokriti del rešitve** | Hook časovnika (prehodi, reset cikla, statistika sej, sinhronizacija s service workerjem), sinhronizacija / ponovni poskusi z agentom, pomožne funkcije in shranjevanje statistik, združevanje blokiranih števcev in delta sinhronizacija z agentom, obvestila ter budilka/sinhronizacija časovnika v service workerju, shranjevanje avtentikacije in obravnava omrežnih napak API-ja, uporabniški tokovi Timer in Stats |
| **Orodja / ogrodja** | Vitest 3, jsdom, React Testing Library, `@testing-library/user-event`, `@testing-library/jest-dom` |
| **Zagon** | `cd frontend && npm test` (ali `npm run test:watch`) |
| **Obseg** | ~14 testnih datotek, ~65 testnih primerov v `frontend/src/**` |
| **Uporaba UI** | Da — **Cursor** (AI programski pomočnik). Testi in povezana produkcijska koda so bili med razvojem pripravljeni ali razširjeni s pomočjo UI. |
| **Kako je bil rezultat UI preverjen** | Zagon `npm test` / `vitest run`; popravki neuspešnih trditev (npr. besedilo obvestil); pregled obnašanja v aplikaciji (časovnik, reset statistik, sinhronizacija z agentom). |

---

## 2. Avtomatizirani testi namiznega agenta

| Polje | Podrobnosti |
|-------|-------------|
| **Vrsta aktivnosti** | Avtomatizirani enotski testi (Rust) |
| **Stanje** | Prisotno — zagon lokalno s Cargo; ni povezano v CI |
| **Pokriti del rešitve** | Normalizacija domen in ujemanje poddomen (`domains.rs`); razčlenjevanje DNS paketov / blokirani odgovori (`dns.rs`); stanje agenta, štetje ubitih procesov in URL števci (`state.rs`) |
| **Orodja / ogrodja** | Vgrajeni testni okvir Rusta (`cargo test`) |
| **Zagon** | `cd desktop-agent && cargo test` |
| **Obseg** | 15 enotskih testov v 3 modulih |
| **Uporaba UI** | Da — **Cursor**. Testni moduli agenta so bili razširjeni s pomočjo UI. |
| **Kako je bil rezultat UI preverjen** | Zagon `cargo test` in potrditev, da navedeni testi uspejo; naključno preverjanje logike glede na dokumentacijo DNS blokiranja / ročno obnašanje agenta. |

---

## 3. Statično preverjanje tipov TypeScript

| Polje | Podrobnosti |
|-------|-------------|
| **Vrsta aktivnosti** | Statična analiza / preverjanje ob prevajanju |
| **Stanje** | Prisotno v skriptah za gradnjo / typecheck; ni vsiljeno prek CI |
| **Pokriti del rešitve** | Frontend TypeScript (`tsc -b` kot del `npm run build`); backend TypeScript (`tsc` / `npm run typecheck`) |
| **Orodja / ogrodja** | Prevajalnik TypeScript (`tsc`) |
| **Uporaba UI** | Posredno — koda, urejena z UI, gre skozi ista preverjanja `tsc` ob gradnji. |
| **Kako je bil rezultat UI preverjen** | Uspešen `npm run build` / `npm run typecheck` po spremembah. |

---

## 4. Ročni postopki testiranja

| Polje | Podrobnosti |
|-------|-------------|
| **Vrsta aktivnosti** | Ročno / raziskovalno QA, dokumentirano za uporabo |
| **Stanje** | Delno — zapisani postopki za kritične poti namiznega agenta; ni formalnega testnega načrta za celoten izdelek |
| **Pokriti del rešitve** | DNS blokiranje URL-jev (agent kot admin, fokus seja, `nslookup`, `/status`, zavihek Stats); po želji način z datoteko hosts za testiranje brez admin pravic |
| **Orodja / ogrodja** | Dokumentirani koraki v `desktop-agent/docs/DNS_BLOCKING.md` in povezane opombe v `desktop-agent/README.md`; ročno preverjanje v brskalniku / OS |
| **Uporaba UI** | Dokumentacija in koraki za odpravljanje težav so bili izboljšani s **Cursor**; preverjanje je bilo ročno (npr. obnovitev Wi‑Fi / DNS, Google prijava, potisna obvestila). |
| **Kako je bil rezultat UI preverjen** | Ročna reprodukcija na Windows (agent kot admin, fokus seja v PWA, scenariji prekinitve povezave, uskladitev OAuth callback URL). |

---

## 5. Docker Compose healthcheck (infrastruktura)

| Polje | Podrobnosti |
|-------|-------------|
| **Vrsta aktivnosti** | Preverjanje zdravja / pripravljenosti v času izvajanja |
| **Stanje** | Delno — Compose `healthcheck` ima le PostgreSQL |
| **Pokriti del rešitve** | Pripravljenost baze pred zagonom odvisnih storitev (`pg_isready` v `docker-compose.yml`) |
| **Orodja / ogrodja** | Docker Compose healthcheck; PostgreSQL `pg_isready` |
| **Uporaba UI** | Ni posebne uporabe UI za to preverjanje (standardna nastavitev Compose). |
| **Kako je bil rezultat UI preverjen** | Ni relevantno |

Backend poleg tega izpostavlja `GET /api/health` za preverjanja v času izvajanja; to je aplikacijska končna točka, ne celoten avtomatiziran nabor QA.

---

## Aktivnosti, ki še niso prisotne

V repozitoriju trenutno **niso** implementirane naslednje aktivnosti (relevantno za načrtovanje nadaljnjega dela pri predmetu):

- Enotski / integracijski testi backenda (ni testne skripte ali testnih datotek v `backend/`)
- Končni testi v brskalniku (ni Playwright / Cypress)
- Neprekinjena integracija (ni `.github/workflows` ali podobnega)
- Poročila o pokritosti kode (ni cevovoda za coverage pri Vitest/Cargo)
- Projektne pregrade za lint/format (ni nastavitev ESLint / Prettier / Clippy v repozitoriju)

---

## Povezana dokumentacija

- [FEATURES.md](./FEATURES.md) — funkcionalnosti izdelka  
- [Frontend README](../frontend/README.md)  
- [Namizni agent — DNS blokiranje](../desktop-agent/docs/DNS_BLOCKING.md)  
