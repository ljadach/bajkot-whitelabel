# Spec: print-ready pipeline (oddanie bajki do drukarni)

> Amazon KDP 6x9 jest osobnym profilem tego endpointu; kontrakt i geometria:
> `docs/spec-amazon-kdp.md`.

> Status: **ZAUTOMATYZOWANE (2026-07-12)** — pipeline v0.2 (§8) żyje jako
> `POST /print-ready` w repo typst-render (`print/print_ready.py`), odpalany
> przyciskiem z admina (zakładka Orders → sekcja "Druk"; backend
> `convex/admin/printPdf.ts`). Od 2026-07-16 checkbox „Fast proof" =
> `upscale: 'none'` (v0.1 bez ESRGAN: minuty zamiast godzin, miękkie
> ilustracje; osobne klucze R2 `-fast`, plik nazwany `_FAST_PROOF`). Kanon i troubleshooting: typst-render
> `docs/print-ready-pipeline.md` + `docs/print-ready-service.md`. Ten dokument
> zostaje jako zapis decyzji i podejść (A/B/hybryda).
>
> Historia: powstał po ręcznym przygotowaniu pierwszego płatnego zamówienia
> do druku (`jn7c2wzaftzwyky8gjt8kbbpen88rpd4`, 2026-06-17). Opisuje DWA
> sprawdzone podejścia + docelowy fix u źródła.

## 1. Problem

PDF, który generuje system (typst-render, zob. `typst-render-service.md`),
jest **plikiem ekranowym, nie drukarskim**. Po diagnozie pliku produkcyjnego
(`pdfinfo`, `pdfimages -list`):

| Cecha        | Stan systemowy                                | Wymóg druku                                  |
| ------------ | --------------------------------------------- | -------------------------------------------- |
| Format       | A4 pion 210×297 mm, **bez spadu**             | trim + 2–3 mm spad, TrimBox/BleedBox         |
| Ilustracje   | **1024×1024 px** osadzone → **~88 ppi na A4** | ≥ 300 ppi                                    |
| Tekst        | wektor (Typst) — OK                           | wektor lub raster ≥ 300 ppi                  |
| Kolor        | RGB (sRGB, profil ICC)                        | zależnie od drukarni: RGB albo CMYK + profil |
| Okładka      | strona 1 tego samego PDF                      | często osobny plik na grubszy papier         |
| Numery stron | wrysowane przez Typst, „systemowe"            | bez znaczenia / do korekty                   |

**Sedno:** dwa twarde braki to **rozdzielczość ilustracji** (88 ppi) i
**brak spadu**. Reszta (kolor, okładka, imposition) zależy od konkretnej
drukarni — patrz §6 Decyzja.

Realny przykład: drukarnia przyjęła „normalną książkę jak z systemu, 2 mm
spad, my obrobimy" → wystarczył upscaling + spad + boxy, resztę (CMYK,
oprawę, wewnętrzne okładki) zrobiła drukarnia.

## 2. Docelowy fix u ŹRÓDŁA (najlepszy długoterminowo)

Post-processing (§4/§5) to **łatka**. Docelowo problem znika u źródła:

1. **Ilustracje w wyższej rozdzielczości.** `convex/lib/geminiImageGen.ts`
   generuje 1024 px. Gemini potrafi więcej; alternatywnie dołożyć krok
   upscalingu (§4 model) zaraz po generacji, zanim trafi do R2. Cel:
   źródłowy asset ≥ 2048 px (lepiej 4096) → A4 @ ≥ 300 ppi bez ratowania.
   To kasuje 80% problemu.
2. **Profil druku w typst-render.** Szablon (`~/P/typst-render/templates/`)
   umie `printFormat` (single/booklet). Dołożyć `printProfile: "print"`:
   - `#set page(margin/bleed)` ze spadem 2–3 mm + crop marks (`set page(margin: ...)` + `place` markery),
   - opcjonalnie pominięcie numerów stron na ilustracjach,
   - brief flaga w `convex/lib/buildRenderBrief.ts` → render zwraca od razu plik drukarski.
     Zob. follow-up #4 „Print path" w `typst-render-service.md`.

Gdy oba zrobione: post-processing potrzebny tylko do **retrofitu starych
zamówień**. Do tego czasu — wybierz jedno z dwóch podejść niżej.

## ⚠️ Pułapka #1: numer strony wpada na linię cięcia

**Złapane na pierwszym zamówieniu (2026-06-17) — dotyczyło OBU naszych plików.**

Typst stawia numer strony na `dy: -10pt` = **3,5 mm od krawędzi strony**. Dla
pliku bez spadu to jest 3,5 mm od cięcia — granicznie, ale OK. Problem pojawia
się przy dokładaniu spadu **przez skalowanie treści**:

- **A4 + spad „na pokrycie"** (skalowanie treści ~+1,9% + dosunięcie do spadu),
- **cover-scale A4 → A5 + spad** (metoda raster/CMYK),

obie **powiększają treść na zewnątrz**, a 2 mm wcięcia TrimBox „zjada" margines
numeru. Zmierzone (dolna krawędź cyfry, od linii cięcia):

| Plik                     | Od krawędzi media | **Nad linią cięcia** |
| ------------------------ | ----------------- | -------------------- |
| System (A4, bez spadu)   | 3,5 mm            | ~3,5 mm (granicznie) |
| A4 + 2 mm spad (podej.A) | 2,83 mm           | **0,83 mm** ⚠️       |
| A5 + 2 mm spad (podej.B) | 2,2 mm            | **0,2 mm** ⚠️        |

Przy tolerancji krajarki ±1 mm numer zostaje przycięty albo wisi na krawędzi.

**Zasada (twarda):** po nałożeniu spadu **ZAWSZE zmierz odległość folio/stopki
od `TrimBox`** (nie od media!). Cel ≥ 5 mm; cokolwiek < 3 mm od trim = czerwona
strefa, do poprawy.

**Fix u źródła (preferowany):**

1. Zwiększyć `dy` numeru w szablonie Typst (`templates/common/layout.typ`,
   `page-number-badge`): `-10pt` → ok. `-28pt` (≈ 10 mm od krawędzi).
2. Spad robić przez **rozszerzenie kanwy + dosunięcie samego TŁA** do krawędzi,
   **nie** przez skalowanie całej treści — wtedy folio zostaje wysoko niezależnie
   od spadu.

**Fix post-hoc (retrofit istniejącego pliku):** podnieść numery o N mm. Na pliku
wektorowym = przesunięcie treści/redraw; na **zrasteryzowanym** (podej. B) =
chirurgia na pikselach (detekcja folio w oknie bottom-center → wytnij/wklej
N mm wyżej + inpaint starego miejsca, **w CMYK bez round-tripu do RGB**, filtr
FlateDecode zachowany). Skrypt: `print-prep/raise_folio.py`.

## 3. Wspólne wejście/wyjście (kontrakt automatyzacji)

```
INPUT:  full.pdf z R2 (r2FullKey)  +  parametry (format, spad, kolor, okładka)
OUTPUT: <order>_DRUK.pdf  (+ opcjonalnie osobna okładka)  →  R2 print key / e-mail do drukarni
TRIGGER: złożenie zamówienia druku (upsell „Kup drukowaną wersję", format `pdf_print`)
```

Parametry konfiguracyjne (jedno miejsce, np. `adminConfig` albo brief):

| Param         | Domyślnie  | Uwaga                                                               |
| ------------- | ---------- | ------------------------------------------------------------------- |
| `trimW/trimH` | 210×297 mm | albo A5 148×210 (mniejszy format = mniej widać niską rozdzielczość) |
| `bleedMm`     | 2          | drukarnia podaje (2 lub 3)                                          |
| `colorSpace`  | `rgb`      | `cmyk` tylko gdy drukarnia poda profil                              |
| `iccProfile`  | —          | np. Coated FOGRA39 (offset, powlekany, EU)                          |
| `coverMode`   | `inline`   | `inline` (okładka = str.1) albo `separate`                          |
| `targetPpi`   | 350        | nagłówek dla rasteryzacji / sanity-check                            |
| `folioMinMm`  | 5          | min. odległość numeru strony od TrimBox — sanity-check (Pułapka #1) |

Środowisko (oba podejścia heavy — NIE w Convex, brak node-heavy/GPU):
worker na VPS (np. ten sam Droplet co typst-render) albo lokalny skrypt
on-demand. Python 3.12, `uv` do venv.

---

## 4. PODEJŚCIE A — wektor + AI upscaling (zachowuje jakość)

**Idea:** podmień TYLKO bitmapy ilustracji na wersje upscalowane modelem AI;
tekst zostaje wektorem; spad przez transformację treści (wektory nietknięte).
Wyjście **RGB** (CMYK na końcu opcjonalnie, gdy drukarnia poda profil).

**Plusy:** najostrzejsze ilustracje (model rekonstruuje detal, nie
interpoluje), tekst wektorowy ostry do nieskończoności, mały plik (~20 MB).
**Minusy:** brak natywnego CMYK, większa złożoność (torch), nie „spłaszczone"
(teoretyczne ryzyko fontów/transparencji na RIP — w praktyce Typst PDF jest czysty).

### Zależności

```bash
uv venv --python 3.12 venv
uv pip install --python venv/bin/python torch spandrel pillow numpy pikepdf
# model: RealESRGAN_x4plus.pth (67 MB) z release xinntao/Real-ESRGAN v0.1.0
#   https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth
# (alternatywy do przetestowania dla akwareli: realesr-general-x4v3, x4plus-anime)
# narzędzia CLI: qpdf, poppler (pdfimages/pdftoppm/pdfinfo)
```

### Kroki

1. **Ekstrakcja** ilustracji: `pdfimages -png full.pdf imgs/img` → wszystkie
   bitmapy 1024×1024 (cover + sceny + mood_closing).
2. **Upscaling 4×** (1024→4096) modelem Real-ESRGAN na MPS/CUDA/CPU, kafelkowo.
3. **Re-embed** upscalowanych obrazów w PDF przez pikepdf — podmiana strumienia
   XObject zachowuje CTM, więc placement i layout Typst zostają 1:1.
4. **Spad** przez owinięcie treści każdej strony macierzą `q f 0 0 f tx ty cm … Q`
   i ustawienie MediaBox/Trim/Bleed boxów (wektory zostają wektorami).
5. (Opcjonalnie) `coverMode=separate`: `qpdf full.pdf --pages full.pdf 1 -- cover.pdf`
   i środek z pustymi wyklejkami (zob. wariant „rozdzielona okładka" niżej).

### Skrypty (zwalidowane 2026-06-17)

`upscale.py` — Real-ESRGAN x4 przez spandrel, kafelkowo:

```python
import sys, os, time, torch, numpy as np
from PIL import Image
from spandrel import ModelLoader
MODEL = "RealESRGAN_x4plus.pth"
def device(): return torch.device("mps") if torch.backends.mps.is_available() else torch.device("cpu")
def load(dev): m = ModelLoader().load_from_file(MODEL); m.to(dev).eval(); return m
def upscale(model, dev, pil, scale=4, tile=256, ov=16):
    img = np.asarray(pil.convert("RGB"), np.float32)/255.0; h,w,_ = img.shape
    out = np.zeros((h*scale,w*scale,3),np.float32); wt = np.zeros((h*scale,w*scale,1),np.float32)
    for y in range(0,h,tile):
        for x in range(0,w,tile):
            y0,x0 = max(0,y-ov),max(0,x-ov); y1,x1 = min(h,y+tile+ov),min(w,x+tile+ov)
            t = torch.from_numpy(img[y0:y1,x0:x1]).permute(2,0,1).unsqueeze(0).to(dev)
            with torch.no_grad(): o = model(t)
            o = o.clamp(0,1).squeeze(0).permute(1,2,0).cpu().numpy()
            oy,ox = y0*scale,x0*scale
            out[oy:oy+o.shape[0],ox:ox+o.shape[1]] += o; wt[oy:oy+o.shape[0],ox:ox+o.shape[1]] += 1
    return Image.fromarray(((out/np.maximum(wt,1e-6))*255+0.5).astype(np.uint8),"RGB")
dev = device(); model = load(dev)
for p in sys.argv[1:]:
    r = upscale(model, dev, Image.open(p)); r.save(os.path.join("up", os.path.basename(p)))
```

`reembed.py` — podmiana XObrazów (mapa strona→plik z `pdfimages -list`):

```python
import io, pikepdf
from PIL import Image
MAPPING = {1:"img-000",4:"img-001",7:"img-002",9:"img-003",12:"img-004",
           14:"img-005",16:"img-006",18:"img-007",20:"img-008",22:"img-009",24:"img-010"}
pdf = pikepdf.open("full.pdf")
for pno, page in enumerate(pdf.pages, 1):
    if pno not in MAPPING: continue
    for name, xobj in page.Resources.XObject.items():
        if xobj.get("/Subtype")==pikepdf.Name("/Image") and int(xobj.Width)==1024:
            up = Image.open(f"up/{MAPPING[pno]}.png").convert("RGB")
            buf = io.BytesIO(); up.save(buf, "JPEG", quality=92, subsampling=0)
            xobj.write(buf.getvalue(), filter=pikepdf.Name("/DCTDecode"))
            xobj.Width, xobj.Height, xobj.BitsPerComponent = up.width, up.height, 8
            for k in ("/DecodeParms","/Decode","/SMask"):
                if k in xobj: del xobj[k]
pdf.save("HIRES.pdf")
```

`addbleed.py` — spad przez CTM (wektory nietknięte):

```python
import pikepdf
MM = 72/25.4; BLEED = 2*MM
pdf = pikepdf.open("HIRES.pdf")
for page in pdf.pages:
    llx,lly,urx,ury = [float(v) for v in page.MediaBox]
    ow,oh = urx-llx, ury-lly; mw,mh = ow+2*BLEED, oh+2*BLEED
    f = max(mw/ow, mh/oh)
    tx,ty = (mw-f*ow)/2 - f*llx, (mh-f*oh)/2 - f*lly
    page.contents_add(pikepdf.Stream(pdf, f"q {f:.6f} 0 0 {f:.6f} {tx:.4f} {ty:.4f} cm\n".encode()), prepend=True)
    page.contents_add(pikepdf.Stream(pdf, b"\nQ\n"))
    page.MediaBox = page.CropBox = page.BleedBox = [0,0,mw,mh]
    page.TrimBox = [BLEED, BLEED, BLEED+ow, BLEED+oh]
pdf.save("DRUK.pdf")
```

### Weryfikacja

`pdfinfo -box DRUK.pdf` → MediaBox 214×301 mm, TrimBox 210×297 mm.
`pdfimages -list DRUK.pdf` → ilustracje 4096 px, ppi ~344 (>300).
Render `pdftoppm` + ramka kontrolna → grafika dochodzi do krawędzi spadu (brak białego paska).

---

## 5. PODEJŚCIE B — rasteryzacja 350 dpi + CMYK (kompletne dla offsetu)

**Idea:** zrasteryzuj CAŁĄ książkę do 350 dpi PNG, skonwertuj do CMYK z
profilem, złóż z powrotem w PDF. Wszystko spłaszczone.

**Plusy:** natywny CMYK z profilem (poprawny kolor pod offset), „spłaszczone"
= zero niespodzianek z fontami/transparencją na RIP, prosty stack (bez torch).
**Minusy:** „upscaling" to **interpolacja** (`pdftoppm`) — liczba dpi wysoka,
ale realny detal ilustracji dalej ~1024 px (to ta sama jakość co naiwny
Lanczos, NIE jak model AI z §4); tekst spada do 350 dpi (miększy niż wektor);
duży plik (62–152 MB).

### Zależności

```bash
uv pip install --python venv/bin/python pillow img2pdf pypdf
# poppler (pdftoppm), profil ICC: CoatedFOGRA39.icc (Adobe ICC profiles / littleCMS)
# Pillow ma wbudowany littleCMS (PIL.ImageCms)
```

### Kroki

1. **Geometria** A4 → format + spad (pypdf): przeskaluj treść każdej strony
   „na pokrycie" (cover) do `trim + 2*bleed`, ustaw TrimBox/BleedBox/MediaBox.
2. **Rasteryzacja** `pdftoppm -r 350 -png in.pdf page` (2095×2949 px dla A5+spad).
   ⚠ 26 dużych stron przekracza limit czasu jednego polecenia → **partie**;
   po renderze **sprawdź integralność każdego PNG** (`identify`/`Image.verify()`),
   bo strony zapisane przy timeoutcie bywają uszkodzone.
3. **RGB→CMYK** z profilem FOGRA39 + black point compensation, profil osadzony:
   ```python
   from PIL import Image, ImageCms
   srgb = ImageCms.createProfile("sRGB")
   cmyk = ImageCms.getOpenProfile("CoatedFOGRA39.icc")
   tr = ImageCms.buildTransform(srgb, cmyk, "RGB", "CMYK",
            renderingIntent=ImageCms.Intent.RELATIVE_COLORIMETRIC,
            flags=ImageCms.Flags.BLACKPOINTCOMPENSATION)
   out = ImageCms.applyTransform(Image.open(p).convert("RGB"), tr)
   out.save(p_cmyk, icc_profile=open("CoatedFOGRA39.icc","rb").read())
   ```
4. **Złożenie** `img2pdf` + pypdf: scal strony CMYK, wymuś dokładny rozmiar
   `trim+spad`, ponownie ustaw boxy.
5. **Dwie wersje:** bezstratny (duży, ~152 MB) + JPEG q92 (~62 MB, wizualnie
   bez strat — norma w druku). Najpierw przetestuj na 1 stronie, że
   **CMYK-owy JPEG nie odwraca kolorów**.

### Weryfikacja

Per strona: 4 składowe (CMYK), 350 dpi, MediaBox/TrimBox zgodne, podgląd że
okładka na pełny spad i kolory się nie odwróciły.

---

## 6. Decyzja: które podejście

| Oś                     | A (wektor + ESRGAN)  | B (raster + CMYK)         |
| ---------------------- | -------------------- | ------------------------- |
| Ostrość ilustracji     | **AI, realny detal** | interpolacja (≈ na chama) |
| Tekst                  | **wektor (∞ dpi)**   | raster 350 dpi            |
| Kolor                  | RGB (+ICC)           | **CMYK + FOGRA39**        |
| RIP-safe / płaszczenie | nie                  | **tak**                   |
| Rozmiar                | **~20 MB**           | 62–152 MB                 |
| Stack                  | torch (cięższy)      | **lekki (Pillow)**        |

**Reguła wyboru wg drukarni:**

- Drukarnia mówi „dawajcie jak z systemu, my obrobimy / RGB / spad" → **A**
  (oni robią CMYK pod swoją maszynę; pre-CMYK FOGRA39 byłby strzałem w stopę
  przy innym papierze/profilu → ryzyko podwójnej konwersji).
- Drukarnia żąda gotowego **CMYK z konkretnym profilem** + spłaszczenia → **B**,
  ale **podmień krok upscalingu na model z §4** zamiast `pdftoppm`-interpolacji.
- Fotoksiążka / POD (Saal, Amazon KDP — zob. `amazon-print-guide.md`) → **A**,
  RGB, te usługi same zarządzają kolorem.

**Hybryda (docelowy plik premium) = najlepsze z obu:**
ESRGAN na ilustracjach (§4) + tekst wektorowy + spad CTM (§4) →
**i dopiero gdy drukarnia poda profil** → konwersja do CMYK na końcu
(per-strona ImageCms tylko na bitmapach, tekst zostaje). To łączy ostrość A
z color managementem B.

## 7. Wariant „rozdzielona okładka" (gdy drukarnia chce osobne pliki)

Zamiast okładki jako str.1: `cover.pdf` osobno + środek z pustymi wyklejkami
i parzystością ułożoną tak, by ilustracja↔tekst trafiały na wspólne
rozkładówki. Montaż przez qpdf:

```bash
qpdf full.pdf --pages full.pdf 1 -- cover.pdf          # okładka osobno
qpdf full.pdf --pages full.pdf 2-26 full.pdf 2 -- srodek.pdf  # +pusta na koniec (parzysto)
```

Uwaga na parzystość: wstawienie pustej karty **odwraca wszystkie rozkładówki**
— układaj tak, by ewentualna rozkładówka tekst|tekst wypadła na otwarciu, nie
w środku. Szczegóły w sesji 2026-06-17.

## 8. PIPELINE v0.2 — ZWALIDOWANY (Empire Starachowice, 2 zamówienia)

> Zaakceptowany przez drukarnię (Michał Dańko, Empire): plik Natalii
> `..._A5_CMYK_350dpi_spady2mm_..._28str_NUMERY+6mm.pdf` — „Jest dobrze".
> Powtórzony 1:1 dla Olusia (2026-07-06) z lepszym upscalingiem.
> **Implementacja referencyjna: `print-prep/make_print.py`** (jeden skrypt,
> wszystkie kroki). To jest kanon pod automatyzację.

### Wymogi drukarni Empire (z wątku mailowego Łukasza, 2026-06-17/18)

1. **A5 + 2 mm spadu** (152×214 mm media, TrimBox 148×210), CMYK, 350 dpi.
2. **Numeracja min. 6 mm od linii cięcia** — plik z folio 0,2 mm odrzucony
   („numeracja stron jest w miejscach cięcia, powinny być przesunięte 6mm
   do góry"). Zob. Pułapka #1.
3. **Każdy format = osobny plik.** NIE skalować A5→A4 („spady się powiększają
   dwukrotnie") — dla A4 złożyć osobno od źródła z 2 mm spadem.
4. **Liczba stron podzielna przez 4** (druk składany/szyty na arkuszach:
   A5 na arkuszu A4, A4 na A3; 4 strony książki / arkusz).
5. **Creep/wypychanie** (feedback PO druku Natalii — zaimplementowane w v0.2):
   w książce szytej zeszytowo arkusze wsuwają się w siebie; wewnętrzne wystają
   na przedniej krawędzi i trym je równa → treść wewnętrznych stron ląduje
   bliżej krawędzi zewnętrznej. Kompensacja (`add_creep` w make_print.py):
   treść strony przesuwana **ku grzbietowi** o `(arkusz-1) × kaliper` papieru.
   28 stron = 7 arkuszy; arkusz k trzyma strony `2k-1, 2k, 29-2k, 30-2k`;
   recto (nieparzyste) w lewo, verso (parzyste) w prawo; odsłonięty pas przy
   spadzie wypełniany replikacją krawędzi. Parametr `CALIPER_MM = 0.1`
   (kreda ~115–130 g) → max 0,6 mm na środkowym arkuszu. **Kaliper potwierdzać
   u drukarni per papier.**
6. (Feedback po druku, otwarte) **„Składać do większego formatu (A4)"** —
   sugestia, że A4 (na arkuszu A3) wychodzi lepiej niż A5. Generujemy oba
   pliki osobno (wymóg #3). Decyzja formatu = biznesowa per zamówienie.
7. **Strona „Dla Rodzica" — margines poziomy jak na stronach tekstowych**
   (feedback drukarza przy Olusiu): layout Typst daje tej stronie szerszy
   blok (zmierzone na A5: 6 mm od cięcia vs ~10 mm na stronach narracji).
   Fix post-hoc w rastrze (`fix_parent_page`): jednorodne pomniejszenie całej
   strony wokół środka do szerokości bloku referencyjnego (skala ~0,94),
   marginesy mierzone automatycznie z bbox treści stron 5/13. Fix u źródła:
   wyrównać margines `parent_card` w szablonie Typst do stron beatów.
8. (Feedback po druku, fix u źródła) **„Margines większy"** — systemowe 32 pt
   (~11 mm) na A4 po zeskalowaniu do A5 daje ~8 mm; norma książkowa to
   12–20 mm. Typst ma gotową flagę `experimental.widerMargins` (60 pt ≈ 21 mm
   na A4 → ~15 mm po skali do A5) — wymaga re-renderu briefem przez
   typst-render (`admin/bookBatch.ts` umie recompose z flagami). W rastrze
   post-hoc tego nie naprawiamy (skalowanie bloku tekstu = zmiana wyglądu).

### Krok po kroku (v0.2 = „metoda Andrzeja" + ESRGAN zamiast interpolacji)

```
WEJŚCIE: systemowy PDF (Typst, 26 str A4, ilustracje 1024 px na stronach
         1,4,7,9,12,14,16,18,20,22,24 — stały layout pipeline'u)

1. EKSTRAKCJA    pdfimages -png full.pdf imgs/img          (11 obrazów)
2. UPSCALE 4×    Real-ESRGAN x4plus 1024→4096 px           (upscale.py)
                 ← to jest różnica vs v0.1 Andrzeja: bez blura interpolacji
3. RE-EMBED      podmiana XObject w PDF, layout Typst 1:1  (reembed)
4. REORDER       26 → 28 stron (recepta Łukasza, patrz niżej)
5. RASTERYZACJA  pdftoppm -scale-to-x 2095 → crop centr. do 2095×2949
                 = A5+2mm spadu @ 350 dpi, cover bez dystorsji, partiami po 4
                 + integrity-check każdego PNG (Image.load())
6. CMYK          sRGB → FOGRA39L Coated (ICC wyciągnięty z zaakceptowanego
                 pliku: print-prep/fogra39_from_natalia.icc), relative
                 colorimetric + black point compensation, profil osadzony
7. ZŁOŻENIE      pikepdf, FlateDecode (bezstratnie), MediaBox 152×214 mm,
                 TrimBox 148×210 mm, BleedBox = MediaBox
8. FOLIO +6mm    chirurgia na rastrze CMYK (okno y 2872-2932, środek ±115 px,
                 detekcja vs median-bg, przesunięcie +83 px) — strony 4-23
8b. CREEP        add_creep: shift ku grzbietowi (arkusz-1)×CALIPER_MM,
                 recto↔verso przeciwne kierunki (wymóg #5)
9. WERYFIKACJA   28 str · 152×214 · TrimBox · 4 kanały · 350 dpi ·
                 folio ≥6 mm od trim · spady pełne (render + ramka)

Wariant A4 (osobny plik, wymóg #3): te same kroki od rasteryzacji, parametry
OUT 2949×4148 px (214×301 mm), PAGE 214×301 mm pt, okno folio przeskalowane
liniowo ×(2949/2095); FOLIO_SHIFT i creep bez zmian (mm są fizyczne).
```

### Recepta „Łukasza" na 28 stron (reverse-engineered z FINAL_28str)

Fingerprint-match stron 28str↔26str dał jednoznaczną mapę:

```
qpdf src.pdf --pages src.pdf 1-23  src.pdf 2  src.pdf 25 \
             src.pdf 2  src.pdf 26  src.pdf 24  -- out28.pdf
```

| Strony (nowe) | Źródło    | Po co                                         |
| ------------- | --------- | --------------------------------------------- |
| 1–23          | 1–23      | bez zmian (okładka + blok bajki, numery 4-23) |
| 24            | 2 (pusta) | pusta lewa przed „Dla Rodzica"                |
| 25            | 25        | Dla Rodzica — na prawej stronie               |
| 26            | 2 (pusta) | pusta lewa przed „Koniec"                     |
| 27            | 26        | Koniec/colophon — na prawej stronie           |
| 28            | 24        | **pejzaż mood_closing → tylna okładka**       |

Efekt: 28 = 7×4 (szycie ✓), pejzaż zamyka książkę, sekcje końcowe na
prawych stronach. UWAGA: kolejność ma znaczenie — reorder PRZED rasteryzacją
(wtedy folio 4-23 zostaje spójne, przenoszone strony nie mają numerów).

### Wyjście

`<Imie>_i_..._DRUK_A5_CMYK_350dpi_spady2mm_28str_NUMERY+6mm.pdf` — jeden
plik, gotowy do wysyłki do Empire (A5 drukowany na arkuszu A4). Dla kopii A4:
osobny run z geometrią A4+2mm (parametry OUT_W/H, PAGE_W/H_PT w make_print.py).

## 9. Otwarte pytania (do domknięcia przy implementacji)

- Gdzie żyje worker: endpoint `/print-prep` na VPS typst-render czy osobny job?
- Czy robimy fix u źródła (§2) i wtedy A/B tylko do retrofitu starych orderów?
- Kaliper papieru do creepu: przyjęte 0,1 mm — potwierdzić u Empire per papier.
- Marginesy: włączyć `widerMargins` w briefie print-profile (wymóg #8)?
- Format docelowy zamówień: A5, A4 czy oba (feedback #6 „lepiej A4")?
- Spad: Empire przyjęło 2 mm bez paserów; inni drukarze mogą chcieć 3 mm + marki.
