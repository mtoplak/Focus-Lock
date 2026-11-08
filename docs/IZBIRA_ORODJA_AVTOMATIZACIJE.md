# Izbira orodja za avtomatizirano funkcionalno testiranje

## Izbrano orodje: Playwright Test (TypeScript)

Focus Lock je React PWA v TypeScriptu, zato testi ostanejo v istem jeziku in ekosistemu npm kot frontend. Testni primeri zahtevajo pravi brskalnik, več zavihkov in nadzor nad časom ter brskalniškim okoljem, kar Playwright podpira neposredno.

| Merilo | Playwright | Cypress | Selenium / WebdriverIO | Vitest + RTL (že v projektu) |
|---|---|---|---|---|
| Pravi brskalnik | Da | Da | Da | Ne (jsdom) |
| Več zavihkov | Da | Ne | Da | Ne |
| Način brez povezave in dovoljenja | Vgrajeno | Zaobhodi prek CDP | Dodatna nastavitev | Ne |
| Nadzor ure brez fiksnih pavz | `page.clock` | `cy.clock` | Ni vgrajeno | Lažni časovniki, brez brskalnika |
| Samodejno čakanje na elemente | Da | Da | Delno | Omejeno |
| Rezultati | HTML, JUnit XML, trace, posnetki | Prek dodatkov | Odvisno od ogrodja | JUnit, HTML |

Odločilne prednosti so podpora več zavihkom, vgrajeno čakanje na elemente, ki zmanjšuje nestabilnost testov, ter nadzor ure, s katerim TC-FL-002 ne potrebuje fiksnih pavz. Pri poskusnem zagonu je tok TC-FL-002 z `page.clock` uspel 10-krat od 10.

## Predvidena vključitev v cevovod

Repozitorij je na GitHubu in še nima cevovoda, zato bo dodan GitHub Actions workflow, ki se zažene ob vsakem pushu in pull requestu. Sestavljen bo iz dveh opravil:

| Opravilo | Okolje | Izvedba | Testni primeri |
|---|---|---|---|
| `e2e-web` | `ubuntu-latest` | Zagon aplikacije z Docker Compose in Playwright proti `http://localhost:8080` | TC-FL-001, 002, 004, 005 |
| `e2e-agent` | `windows-latest` | Gradnja Rust agenta, zagon agenta in frontenda, Playwright v Chromiumu | TC-FL-003 |

Ločeno Windows opravilo je potrebno, ker namizni agent deluje samo v Windowsu in za blokiranje spletnih mest potrebuje skrbniške pravice.

Rezultati bodo objavljeni kot JUnit XML in HTML poročilo, za neuspele teste pa še trace in posnetki zaslona, vse kot artefakti GitHub Actions. Neuspel test označi cevovod kot neuspešen.

Blokiranje prek DNS na Windows runnerju bo potrjeno ob prvem zagonu cevovoda. Če tam ne bo delovalo, bo TC-FL-003 uporabil način `FOCUSLOCK_URL_BLOCK_MODE=hosts`, kar bo navedeno kot omejitev.
