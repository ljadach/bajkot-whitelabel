# Amazon KDP - profil pliku drukarskiego

> Status: wdrożone. Panel Admin -> Orders -> Druk ma wariant
> `Amazon KDP 6x9" Premium Color`. Implementacja DTP żyje w repo
> `typst-render`; Bajkot buduje brief, śledzi callback i udostępnia dwa
> osobne pliki do pobrania.

## Dlaczego to nie jest wariant A4/A5

Dotychczasowy print-ready dla drukarni Empire składa jeden PDF A5 lub A4,
z 2 mm spadu, 350 DPI, folio +6 mm i kompensacją creep dla szycia zeszytowego.
KDP wymaga innej geometrii oraz osobnej okładki:

| Artefakt   | Parametry                                                       |
| ---------- | --------------------------------------------------------------- |
| Manuscript | pojedyncze strony 6.125x9.250 cala, 1838x2775 px, 300 DPI, CMYK |
| Cover      | wrap 12.311x9.250 cala dla 26 stron, 3693x2775 px, CMYK         |
| Spine      | 0.061 cala / 18 px, bez tekstu                                  |
| Barcode    | rezerwa 2.0x1.2 cala na tylnej okładce                          |

Manuscript i cover są zapisywane jako:

```text
print/<orderId>/kdp-manuscript.pdf
print/<orderId>/kdp-cover.pdf
print/<orderId>/kdp.log.txt
```

Pliki dziedziczą 30-dniowy lifecycle prefiksu `print/` i są dostępne tylko
dla administratora przez presigned URL.

## Sekwencja stron

KDP nie może dostać okładki jako pierwszej strony manuscript. Profil usuwa
systemową stronę `cover` i `mood_closing` z wnętrza, po czym używa ich jako
przodu i tyłu wrap cover. `parent_card` i `colophon` trafiają na recto, a
puste strony zachowują parzystą liczbę stron manuscript (26 w dostarczonej
specyfikacji; nieparzyste źródło dostaje pustą stronę), od której zależy
szerokość grzbietu.

## Kontrakt callbacku

`format` przyjmuje `kdp`. Gotowy callback KDP zawiera dodatkowo:

```json
{
  "coverOutputKey": "print/<orderId>/kdp-cover.pdf",
  "coverSizeBytes": 123456
}
```

Callback `ready` bez `coverOutputKey` jest odrzucany. UI pokazuje osobne
przyciski `Pobierz KDP manuscript` i `Pobierz okładkę KDP`.

## Preflight

Serwis weryfikuje liczbę i wymiary stron, 300 DPI, CMYK ICC, osobną
jednostronicową okładkę, limit 650 MB i brak szyfrowania, metadata, zakładek,
formularzy oraz adnotacji. Strony tekstowe są dopasowane do asymetrycznej
safe zone 0.375 cala; ilustracje pozostają full-bleed.
