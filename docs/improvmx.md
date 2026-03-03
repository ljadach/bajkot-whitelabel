# ImprovMX — Email forwarding for aitutoro.com

## Przeznaczenie

ImprovMX obsługuje **odbieranie maili** na domenie `aitutoro.com`. Projekt nie ma własnego serwera pocztowego — ImprovMX forwarduje przychodzące wiadomości na skrzynki Gmail.

Główne zastosowania:
1. **Clerk auth emails** — `notifications@aitutoro.com` jako adres nadawcy w mailach weryfikacyjnych i magic links. ImprovMX zapewnia, że domena ma realny mailbox za adresem "from", co poprawia deliverability (Gmail, Outlook sprawdzają czy za nadawcą stoi skrzynka).
2. **Strona kontaktowa** — adresy `sales@`, `cs@`, `press@`, `info@` wyświetlane na `/about/contact` jako kanały bezpośrednie.
3. **Catch-all** — `*@aitutoro.com` łapie maile na dowolny nieistniejący alias (np. literówki, stare adresy).

## Konfiguracja (stan: 2026-02-15)

**Platforma:** [improvmx.com](https://improvmx.com) (free tier)
**Domena:** `aitutoro.com`
**Panel:** Logowanie na improvmx.com → dashboard

### Aliasy

| Alias | Forward to | Cel |
|-------|-----------|-----|
| `*` (catch-all) | `Altutoro.com@gmail.com` | Safety net — łapie wszystko bez explicit aliasu |
| `notifications` | `Altutoro.com@gmail.com` | Clerk auth emails (SendGrid) |
| `sales` | `Altutoro.com@gmail.com` | Enterprise sales, pricing inquiries |
| `cs` | `aitutoro.com@gmail.com` | Customer support |
| `press` | `aitutoro.com@gmail.com` | Media, PR |
| `info` | `aitutoro.com@gmail.com` | Ogólne zapytania |

### Uwaga: dwa forward targets

Część aliasów kieruje na `Altutoro.com@gmail.com`, część na `aitutoro.com@gmail.com`. Gmail ignoruje wielkość liter, ale to mogą być dwie różne skrzynki (`altutoro` vs `aitutoro`). Do zweryfikowania i ewentualnego zunifikowania.

## DNS (wymagane rekordy)

ImprovMX wymaga rekordów MX w DNS domeny:

```
MX  @  10 mx1.improvmx.com
MX  @  20 mx2.improvmx.com
```

Te rekordy są zarządzane przez Vercel (nameservery). Dodane 2026-02-06, udokumentowane w `docs/devlog/2026-02-06.md`.

Pełny stack mailowy DNS:

```
SPF:   v=spf1 include:_spf.clerk.services include:sendgrid.net include:spf.improvmx.com ~all
DMARC: v=DMARC1; p=quarantine; pct=100; rua=mailto:cezdmo@gmail.com;
DKIM:  Clerk/SendGrid (clk._domainkey, clk2._domainkey)
MX:    10 mx1.improvmx.com / 20 mx2.improvmx.com
```

## Ograniczenia free tier

- Brak SMTP (nie można **wysyłać** maili jako @aitutoro.com z Gmaila)
- Max 1 domena
- Brak priority support
- Dostępność: best-effort (brak SLA)

Premium ($9/mies) dodaje SMTP, więcej domen i 99% uptime SLA. Warto rozważyć jeśli potrzebujemy wysyłać maile z adresów @aitutoro.com (np. odpowiadać na contact form submissions).

## Gdzie adresy są używane w kodzie

| Adres | Plik | Kontekst |
|-------|------|----------|
| `sales@aitutoro.com` | `src/pages/ContactPage.tsx` | Direct channels sidebar |
| `cs@aitutoro.com` | `src/pages/ContactPage.tsx` | Direct channels sidebar |
| `press@aitutoro.com` | `src/pages/ContactPage.tsx` | Direct channels sidebar |
| `info@aitutoro.com` | `src/pages/ContactPage.tsx` | Direct channels sidebar |
| `notifications@aitutoro.com` | Clerk dashboard | Auth email sender |
| `support@aitutor.example.com` | `src/components/steps/CompleteStep.tsx` | ⚠️ Stary placeholder — do zamiany |

## Dodawanie nowego aliasu

1. Zaloguj się na [improvmx.com](https://improvmx.com)
2. Wybierz domenę `aitutoro.com`
3. Wpisz alias w polu "new-alias", ustaw forward target
4. Kliknij "ADD"

Alias działa natychmiast — brak propagacji DNS (MX records już wskazują na ImprovMX).
