# Strežniška izvajalna okolja in ogrodja — primerjava za Focus Lock

Produkcijski backend Focus Lock teče na **Node.js + Express** ([../backend](../backend)).
Ta paket pokaže, kako bi **isti API** izgledal in se obnašal v drugih okoljih, in
jih primerja ne le opisno, ampak z **delujočo kodo in realnimi meritvami**
(hitrost zagona + benchmark prepustnosti).

## Zasnova primerjave

| | Izvajalno okolje | Ogrodje | Jezik | Vstop |
|---|---|---|---|---|
| **A — izhodišče** | **Node.js** 24 | **Express** 4 | TS (prek `tsx`) | [`express/server.ts`](express/server.ts) |
| **B** | **Deno** 2.8 | **Hono** 4 | TS (vgrajeno) | [`hono/deno.ts`](hono/deno.ts) |
| **C** | **Bun** 1.3 | **Hono** 4 | TS (vgrajeno) | [`hono/bun.ts`](hono/bun.ts) |

Zavestna izbira: **B in C poganjata isto ogrodje (Hono) na dveh različnih
okoljih.** Tako se *spremenljivka okolja* (Deno vs Bun) izolira od ogrodja —
[`hono/app.ts`](hono/app.ts) je en sam, deljen app, vstopni datoteki
([`deno.ts`](hono/deno.ts), [`bun.ts`](hono/bun.ts)) pa se razlikujeta le v ~3
vrsticah zagona. Express/Node je izhodiščna primerjava z drugačnim ogrodjem.

Vse tri implementirajo **isto rezino API-ja** iz pravega backenda:

```
GET  /api/health              -> { status, runtime, framework }
POST /api/auth/register       -> 201 { user, access_token, ... }
POST /api/auth/login          -> 200 { user, access_token, ... }
GET  /api/auth/me  (Bearer)   -> { user }
404 + centralno lovljenje napak + CORS
```

Da meritev odraža **okolje/ogrodje** in ne baze, vse tri delijo **identično,
popolnoma prenosljivo** poslovno logiko v [`shared/`](shared/):
- [`shared/jwt.ts`](shared/jwt.ts) — HS256 JWT samo z **Web Crypto** (`crypto.subtle`),
- [`shared/store.ts`](shared/store.ts) — in-memory uporabniki + **PBKDF2** hash gesel.

Ta koda teče **nespremenjena** v Node 24, Deno in Bun. (Pravi backend namesto
tega uporablja Postgres + Node `scrypt`.)

---

## 1. Rezultati meritev (ta računalnik: Windows 11, Node 24.15, Deno 2.8.2, Bun 1.3.14)

### Hitrost zagona

| Stack | Hladni zagon (spawn → 1. odziv) | Init → `listen` |
|---|---|---|
| **Express / Node** — `node dist/server.mjs` (**prod**, build z esbuild) | **~290 ms** | ~2.6 ms |
| **Express / Node** — `npx tsx server.ts` (**dev**) | ~2 200 ms | ~1.6 ms |
| **Hono / Deno** — `deno run` | **~290 ms** | ~8.6 ms |
| **Hono / Bun** — `bun run` | **~280 ms** | ~4.0 ms |

> **Ključno (pošteno) spoznanje:** v **produkcijskem** načinu se vsa tri okolja
> zaženejo praktično **enako hitro (~280–300 ms)**. Tistih ~2 200 ms za Express je
> **izključno artefakt dev-orodja `tsx`**, ki TS transpilira ob *vsakem* zagonu —
> **ni** lastnost Node runtime-a. Po buildu (`tsc`/esbuild → `node dist/*.mjs`) je
> Node zagon enakovreden Deno in Bun.
>
> Razlika je torej v **delovnem toku, ne v hitrosti**: Express loči korak
> build → run (dev počasen, prod hiter), medtem ko Deno in Bun TS prevedeta
> **vgrajeno**, zato je njun dev zagon takoj enak produkcijskemu — brez ločenega
> build koraka. Vse tri zgornje številke so **izmerjene** na tem računalniku.

### Prepustnost (autocannon, 8 s, 50 povezav)

| Endpoint | Express / Node | Hono / Deno | Hono / Bun |
|---|---|---|---|
| **`GET /api/health`** (čista režija) | ~15 100 req/s · p99 7 ms | ~8 000–10 000 req/s · p99 11–22 ms | **~22 700 req/s · p99 4 ms** |
| **`POST /api/auth/login`** (PBKDF2 + JWT) | ~106 req/s | ~100–180 req/s | ~125 req/s |

**Razlaga rezultatov:**
1. **Lahki endpoint (`/health`) pokaže razlike v okolju.** **Bun je najhitrejši**
   (~1.5× Express, ~2–3× Deno). To se ujema z javnimi benchmarki — Bunov HTTP
   strežnik je močno optimiziran.
2. **Deno je tu presenetljivo padel pod Express** in precej niha (8–10k req/s).
   To je znana lastnost: **Deno HTTP strežnik na Windowsu zaostaja** za svojo
   Linux zmogljivostjo (in za Bun/Node). Na Linuxu bi bila razlika manjša.
3. **`/login` izenači vsa tri okolja (~100–180 req/s).** Pot obvladuje **PBKDF2
   (100 000 iteracij)** — CPU/crypto omejitev, ne ogrodje. **Najpomembnejši
   zaključek:** za realne avtentikacijske poti izbira okolja/ogrodja na
   prepustnost skoraj ne vpliva — dominira strošek hashanja gesla. Razlike se
   pokažejo le pri lahkih, režijsko-omejenih endpointih.

> Številke za `/login` med ponovitvami nihajo (50 sočasnih crypto operacij se
> poteguje za jedra CPU) — vse pa ostanejo v istem razredu, kar potrjuje točko 3.

---

## 2. Struktura kode — iste operacije, dva sloga

### Express (imperativno, ročna validacija, napake prek `next`)
```ts
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body ?? {}
    if (typeof email !== 'string' || typeof password !== 'string')
      throw new HttpError('invalid_request', 'email and password are required')
    ...
    res.status(201).json({ user, access_token: token, ... })
  } catch (e) { next(e) }              // napake ročno potiskaš v next()
})
```

### Hono (spletni standardi `Request`/`Response`, `HTTPException`)
```ts
app.post('/api/auth/register', async (c) => {
  const { email, password, name } = await c.req.json().catch(() => ({}))
  if (typeof email !== 'string' || typeof password !== 'string')
    throw new HTTPException(400, { message: 'email and password are required' })
  ...
  return c.json({ user, access_token: token, ... }, 201)   // vrneš Response
})
```

**Razlike, ki jih je vredno omeniti:**
- **Express** dela z lastnim `res.json()`/`res.status()` (Node API) in napake
  ročno prenaša prek `next(err)` do centralnega `errorHandler`. Eksplicitno, a
  več ročnega dela.
- **Hono** vrača prave `Response` objekte in uporablja `throw HTTPException`, ki
  ga ujame `app.onError`. Ker temelji na spletnih standardih, **ista koda teče na
  Deno, Bun, Node in Cloudflare Workers** — kar je tudi razlog, da je v tej
  primerjavi en sam `app.ts` lahko zagnan na obeh okoljih.
- Vmesni sloj (auth): Express ima `requireAuth(req, res, next)`; v Hono je to
  navadna `async` funkcija, ki bere `c.req.header(...)`.

---

## 3. Razvojna izkušnja, zahtevnost, testiranje

| Vidik | Express / Node | Hono / Deno | Hono / Bun |
|---|---|---|---|
| **TypeScript** | ni vgrajen (`tsx`/`tsc`) | vgrajen | vgrajen |
| **Paketi** | `npm` + `node_modules` | `npm:`/`jsr:`/URL ali `node_modules` | `bun install` (zelo hiter) |
| **Validacija vnosa** | ročno (`typeof`) | ročno ali `@hono/zod-validator` | ročno ali `@hono/zod-validator` |
| **Test runner** | zunanji (Vitest/Jest/`node:test`) | **vgrajen** `deno test` | **vgrajen** `bun test` |
| **HTTP testi** | `supertest` (dvigne strežnik) | `app.request(new Request(...))` brez mreže | `app.request(...)` brez mreže |
| **Zorenje ekosistema** | **največje** | veliko, večinoma npm-združljivo | mlajše, hitro raste |

Hono gradi na `Request`/`Response`, zato handler testiraš brez dejanske mreže:

```ts
const res = await app.request('/api/health')   // Hono — brez listen()
expect(res.status).toBe(200)
```
```ts
import request from 'supertest'                 // Express — dvigne strežnik
await request(app).get('/api/health').expect(200)
```

> **Bonus ugotovitev (med izdelavo):** Node 24 zna pognati `.ts` le v
> **strip-only** načinu — TS *parameter properties* (`constructor(public x)`) ali
> `enum` **niso podprti** in zahtevajo `tsx`/`tsc`. Deno in Bun imata polno TS
> transpilacijo brez teh omejitev.

---

## 4. Kako pognati in izmeriti

Vsak strežnik posluša na `:3001` (ali `PORT`). Poženi **enega** naenkrat.

```bash
# A) Express / Node
cd express && npm install
npx tsx server.ts                 # dev (transpile ob zagonu)
npm run build && npm run start:prod   # prod (build → node dist/server.mjs)

# B) Hono / Deno
cd hono && deno run --allow-net --allow-env --allow-read --node-modules-dir=auto deno.ts

# C) Hono / Bun
cd hono && bun install && bun run bun.ts
```

Benchmark (ločen terminal, ko strežnik teče):

```bash
cd bench && npm install
# bash:
BASE=http://localhost:3001 DURATION=8 CONNECTIONS=50 node bench.mjs
# PowerShell:
$env:BASE="http://localhost:3001"; node bench.mjs
```

Skripta registrira testnega uporabnika, nato izmeri `GET /api/health` (režija) in
`POST /api/auth/login` (realna pot). Poženi za vsak strežnik posebej in primerjaj.

---

## 5. Zaključek — kaj je smiselno za Focus Lock

| Če je prioriteta… | Izberi |
|---|---|
| Zrelost, največ knjižnic in primerov, ekipa pozna Node | **Express / Node** (trenutna izbira) |
| Najvišja prepustnost (lahki endpointi) + spletni standardi | **Hono / Bun** |
| Prenosljivost na edge/Workers, varne privzete vrednosti | **Hono** (Deno ali Bun) |

Za Focus Lock je trenutni **Express/Node povsem upravičen**: avtentikacijske poti
so **crypto-omejene** (scrypt/PBKDF2), zato višja prepustnost Bun tu ne bi
prinesla opazne razlike (meritev `/login` to potrjuje), zrel ekosistem (`pg`,
`jose`, `google-auth-library`) pa zmanjša tveganje. **Hono/Bun** bi se splačal pri
veliko lahkih, ne-crypto endpointih ali če bi backend kdaj selili na edge.
Meritve so na **Windowsu**; na Linux strežniku (kjer backend dejansko teče) bi
Deno in Bun nastopila bolje, kar velja preveriti v ciljnem okolju.
