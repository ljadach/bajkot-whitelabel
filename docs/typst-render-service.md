# typst-render service integration

Bajkot deleguje generowanie PDF do **typst-render** serwisu (osobny VPS na DigitalOcean) zamiast używać `'use node'` kosztownej Convex action z pdfkit.

**Repo:** `~/P/typst-render`
**Status branch'a:** `feat/typst-render-service` (parallel do legacy pdfkit path)

## Routing decision

Per-request flag `bookOrders.useRenderService` decides path:

```
A8 visualReview / submitParentDedication
   ↓
A9 composePdf (V8) — GATE: dedicationDecided
   ↓
   if env USE_RENDER_SERVICE=true OR order.useRenderService=true:
      → bookComposerRender.generatePdfViaRender (V8) — POST /render 2x → R2 keys
   else:
      → bookComposer.generatePdf (Node, legacy pdfkit)
   ↓
A10 reviewFinal
```

CLI flag: `npm run cli -- order -n Test --render-service -w` ustawia `useRenderService=true` na orderze.

## Convex env vars (do ustawienia)

```bash
# dev
npx convex env set RENDER_SERVICE_URL https://typst-render-staging.example.com
npx convex env set RENDER_SHARED_SECRET <32-byte-random-hex>
npx convex env set R2_ACCOUNT_ID <cloudflare-account-id>
npx convex env set R2_ACCESS_KEY_ID <r2-key>
npx convex env set R2_SECRET_ACCESS_KEY <r2-secret>
npx convex env set R2_BUCKET bajkot-pdfs
npx convex env set R2_ENDPOINT https://<account>.r2.cloudflarestorage.com

# prod (ten sam set, deployment 'wonderful-egret-522')
npx convex env set --deployment-name wonderful-egret-522 RENDER_SERVICE_URL https://typst-render.example.com
# … etc

# print-ready (admin, convex/admin/printPdf.ts): sekret callbacku typst-render
# -> Convex HTTP action /print-ready/callback. TA SAMA wartość w .env serwisu
# na VPS (PRINT_CALLBACK_SECRET) i w Convex env. Osobny sekret, nie
# RENDER_SHARED_SECRET.
npx convex env set PRINT_CALLBACK_SECRET <32-byte-random-hex>
```

VPS-side env idzie do `~/P/typst-render/.env` na Droplecie (zob. `~/P/typst-render/README.md` dla DO setup).

## Schema additions

`bookOrders`:

- `r2FullKey?: string` — klucz w R2 dla pełnego PDF (np. `orders/abc123/full.pdf`)
- `r2PreviewKey?: string` — klucz dla 3-stronicowego preview
- `useRenderService?: boolean` — per-order opt-in

Legacy `pdfStorageId`/`previewPdfStorageId` zostają — `getDownloadUrl` zwraca odpowiedni URL zależnie od path (legacy → Convex storage, render → presigned R2).

## Testing flow (bez deploy VPS)

1. **Lokalny typst-render server:**

   ```bash
   cd ~/P/typst-render
   cp .env.example .env       # uzupełnij R2 + secret
   npm install
   npm run dev                # localhost:8080
   ```

2. **Convex env wskazuje na localhost:**

   ```bash
   cd ~/P/bajkot
   npx convex env set RENDER_SERVICE_URL http://host.docker.internal:8080
   # albo dla dev `npx convex dev` lokalnie:
   npx convex env set RENDER_SERVICE_URL http://localhost:8080
   ```

   ⚠ Convex cloud nie sięgnie localhost — to zadziała tylko jeśli używasz Convex local backend albo masz tunnel (ngrok).

3. **CLI test:**

   ```bash
   npm run cli -- order -n Zosia --render-service -w
   # po completed:
   npm run cli -- download <orderId> -o
   ```

4. **Smoke test typst-render w izolacji** (bez bajkota):
   ```bash
   cd ~/P/typst-render
   LOCAL_OUTPUT_DIR=./out npm run test:render
   open out/local-test-*.pdf
   ```

## Rollback

Jeśli render service ma problem:

- Per-order: nie używaj `--render-service` flag
- Per-deployment: `npx convex env set USE_RENDER_SERVICE false` (lub usuń env var)

Stary pdfkit path działa nadal jako default.

## Co zostało do zrobienia (follow-up)

1. **Frontend**: BookSuccessScreen, LandingBookSuccessScreen — gdy `getDownloadUrl().r2FullKey` set, wywołać `api.bookPipeline.resolveR2DownloadUrl` zamiast używać `url` z query.
2. **Preview download**: dodać public action dla preview download URL (analogiczne do `resolveR2DownloadUrl` ale dla `kind='preview'`).
3. **Email delivery**: `email.ts` `sendBookReady` używa `pdfStorageId` — zaktualizować żeby ogarnęło R2 path (presign URL przy wysyłce maila).
4. **Print path**: `pdf_print` format też używa `pdfStorageId`. Render service produkuje ten sam PDF, just need to wire shipping.
5. **Layout fidelity**: typst templates są MVP. Visual side-by-side z bajkot pdfkit version → tune Spacing/colors w `templates/common/layout.typ`.

## Korzyści

- Zero `'use node'` kosztu w composePdf path (kluczowe — bajkot ma 11 agentów, A9 jest 1 z 11)
- PDFy na R2 = zero egress fee przy pobieraniu (vs Convex storage egress)
- Typst dający lepszy typesetting (justify, hyphenation, math) niż pdfkit
- Stateless VPS = łatwa skalowalność (drugi Droplet za load balancerem)
- Idempotency: powtórne wywołanie /render z tym samym `outputKey` = zwraca cached metadata bez ponownej kompilacji
