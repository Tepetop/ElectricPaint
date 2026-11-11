---
name: Nowe symbole elektryczne
overview: 29 rysunków PNG przerysowanych do SVG w katalogu symboli. 9 zastępuje obecne symbole przy tym samym `kind`, 20 jest nowych. Obrót, skala, eksport i stare projekty działają bez zmian.
todos:
  - id: preview
    content: Strona porównawcza PNG vs SVG (.tmp-symbol-trace) i dobór wspólnej grubości linii
    status: completed
  - id: glyphs
    content: Litery (Z, S, L, P, 1, 3, ROL) jako ścieżki z bundlowanego LiberationSans-Regular.ttf
    status: completed
  - id: catalog
    content: 29 wpisów w SYMBOL_CATALOG, nowe SymbolKind, kategoria Wypusty, prefiksy W i R
    status: completed
  - id: tests
    content: Aktualizacja testów i e2e pod nowe nazwy; npm test i npm run e2e
    status: completed
  - id: manual
    content: Ręczna kontrola w aplikacji (obrót, skala, Skaluj wszystkie, eksport PNG/PDF, stary .epaint)
    status: completed
isProject: false
---

# Nowe symbole elektryczne

## Technika

Symbol na rzucie to `KonvaImage` 48×48 (`SYMBOL_SIZE`) z `rotation`, `scaleX/scaleY`, a obrazek pochodzi z `symbolDataUrl(def)` ([`src/catalog/symbols.ts`](src/catalog/symbols.ts), [`src/editor/images.ts`](src/editor/images.ts)). Edytor, eksport ([`src/editor/exportDoc.ts`](src/editor/exportDoc.ts)) i paleta biorą obrazek z tego samego miejsca. Zmiana dotyczy więc tylko pola `svg` w katalogu, a obrót, skala, etykiety, zaznaczanie i eksport zostają nietknięte.

PNG nie wchodzą do aplikacji bezpośrednio. Linie mają 8 px na 1000 px, czyli ok. 0,4 px przy 48 px. Każdy rysunek przepisuję ręcznie na SVG:

- `viewBox="0 0 1000 1000"` i współrzędne odczytane z PNG. Rozmiar i położenie względem kwadratu zostają takie jak na rysunku. Kółko łącznika zajmuje ok. 26% szerokości, obecne symbole 25%, więc nowe i stare symbole mają podobną wielkość.
- Nowy pomocnik obok `svg()` z tym `viewBox` i jedną stałą grubością linii. Punkt wyjścia to 32 jednostki (ok. 1,5 px przy skali 1). Ostateczną wartość ustalę na stronie porównawczej. Ograniczeniem są podwójne haczyki: osie są 58 jednostek od siebie, więc linia nie może być za gruba.
- Wnętrza kółek i półkoli są przezroczyste (`fill="none"`), tak jak w PNG.
- Kolory rozdzielnicy (`#23b14d`) i łącznika roletowego (brąz `#b16060`, czerwona i zielona strzałka, czarny obrys) są jak w PNG.
- Litery to ścieżki SVG wygenerowane jednorazowo skryptem z [`src/assets/fonts/LiberationSans-Regular.ttf`](src/assets/fonts/LiberationSans-Regular.ttf). Element `<text>` odpada, bo SVG wczytany jako obrazek nie widzi czcionek aplikacji, a na Windows i Linux wyglądałby inaczej. Skrypt nie trafia do repo.

Brak migracji: `kind` zastąpionych symboli się nie zmienia, `SCHEMA_VERSION` zostaje 2. Otwarty stary `.epaint` pokazuje nowe rysunki.

## Lista symboli

Kategoria `switches` (prefiks L, łącznik roletowy R):

| # | kind | nazwa | status |
|---|------|-------|--------|
| 1 | `switch-single` | Łącznik jednobiegunowy IP20 | zastępuje |
| 2 | `switch-double` | Łącznik jednobiegunowy podwójny IP20 | zastępuje „Łącznik szeregowy” |
| 3 | `switch-double-pole` | Łącznik dwubiegunowy IP20 | nowy |
| 4 | `switch-stair` | Łącznik schodowy IP20 | zastępuje |
| 5 | `switch-stair-double` | Łącznik schodowy podwójny IP20 | zastępuje |
| 6 | `switch-cross` | Łącznik krzyżowy IP20 | zastępuje |
| 7 | `switch-cross-double` | Łącznik krzyżowy podwójny IP20 | nowy |
| 8 | `switch-push` | Przycisk zwierny IP20 | zastępuje |
| 9 | `switch-roller` | Łącznik roletowy | nowy, prefiks R |
| 10 | `switch-single-ip44` | Łącznik jednobiegunowy IP44 | nowy |
| 11 | `switch-double-ip44` | Łącznik jednobiegunowy podwójny IP44 | nowy |
| 12 | `switch-double-pole-ip44` | Łącznik dwubiegunowy IP44 | nowy |
| 13 | `switch-stair-ip44` | Łącznik schodowy IP44 | nowy |
| 14 | `switch-stair-double-ip44` | Łącznik schodowy podwójny IP44 | nowy |
| 15 | `switch-cross-ip44` | Łącznik krzyżowy IP44 | nowy |
| 16 | `switch-cross-double-ip44` | Łącznik krzyżowy podwójny IP44 | nowy |
| 17 | `switch-push-ip44` | Przycisk zwierny IP44 | nowy |

Kategoria `sockets` (prefiks G):

| # | kind | nazwa | status |
|---|------|-------|--------|
| 18 | `socket-single` | Gniazdo wtykowe IP20 | zastępuje |
| 19 | `socket-single-ip44` | Gniazdo wtykowe IP44 | nowy |
| 20 | `socket-double` | Gniazdo wtykowe podwójne IP20 | zastępuje |
| 21 | `socket-double-ip44` | Gniazdo wtykowe podwójne IP44 | nowy |
| 22 | `socket-400v` | Gniazdo 400V | nowy |
| 23 | `socket-fridge` | Gniazdo wtykowe IP20 – lodówka | nowy |
| 24 | `socket-washer` | Gniazdo wtykowe IP20 – pralka | nowy |
| 25 | `socket-dryer` | Gniazdo wtykowe IP20 – suszarka | nowy |
| 26 | `socket-dishwasher` | Gniazdo wtykowe IP20 – zmywarka | nowy |

Nowa kategoria `outlets` „Wypusty” (prefiks W):

| # | kind | nazwa | status |
|---|------|-------|--------|
| 27 | `outlet-single-phase` | Wypust zasilania jednofazowy | nowy |
| 28 | `outlet-three-phase` | Wypust zasilania trójfazowy | nowy |

Kategoria `other`:

| # | kind | nazwa | status |
|---|------|-------|--------|
| 29 | `distribution-board` | Rozdzielnica | zastępuje (prefiks Rg bez zmian) |

Bez zmian zostają: Gniazdo wtyczkowe antenowe, Żarówka, Wypust oświetleniowy, Uziemienie, Dzwonek, Licznik energii.

## Zmiany w kodzie

- [`src/domain/types.ts`](src/domain/types.ts): nowe wartości w `SymbolKind`.
- [`src/domain/numbering.ts`](src/domain/numbering.ts): wpisy w `PREFIX` (`Record<SymbolKind, string>`, więc TypeScript wymusi komplet), czyli `switch-roller: "R"` i `outlet-*: "W"`. Prefiksy `R` i `Rg` się nie gryzą, bo `usedOrdinals` wymaga cyfr zaraz po prefiksie.
  `symbolRole` działa po przedrostku `kind`. `switch-roller` jest więc łącznikiem: trafia na warstwę Łączniki i da się go dodać do grupy sterowania. Nowa rola: `kind.startsWith("outlet")` daje `"outlet"`.
- [`src/domain/types.ts`](src/domain/types.ts): `SymbolRole` dostaje `"outlet"`.
- [`src/domain/project.ts`](src/domain/project.ts):
  - `DEFAULT_LAYER_NAMES` to teraz Gniazda, Wypusty, Oświetlenie, Łączniki, Przewody, Inne.
  - `defaultSymbolLayerId` kieruje rolę `outlet` na warstwę „Wypusty”.
  - Starsze projekty nie mają tej warstwy, więc wypust trafia tam, gdzie każdy symbol bez pasującej warstwy, czyli na warstwę aktywną (obecne zachowanie `layerIdByName`). Warstwa nie jest dokładana automatycznie.
- [`README.md`](README.md): lista domyślnych warstw w sekcji „Warstwy”.
- [`src/catalog/symbols.ts`](src/catalog/symbols.ts):
  - `SymbolCategory` dostaje `"outlets"`, a `CATEGORY_LABELS` wpis `outlets: "Wypusty"`.
  - Pomocnik SVG 1000×1000.
  - 9 wpisów dostaje nowe `svg` i `name`, 20 wpisów dochodzi.
- [`src/ui/SymbolPalette.tsx`](src/ui/SymbolPalette.tsx): `"outlets"` na liście `categories`, po `"sockets"`.

## Weryfikacja

1. Strona `.tmp-symbol-trace/preview.html` pokazuje obok siebie PNG i SVG każdego symbolu w 48 px i 192 px. Sprawdzam zgodność kształtu i dobieram grubość linii.
2. Testy pod nowe nazwy:
   - [`src/ui/SymbolPalette.test.tsx`](src/ui/SymbolPalette.test.tsx) (m.in. „Łącznik schodowy” → „Łącznik schodowy IP20”, filtr „Gniazdo wtyczkowe”),
   - [`src/ui/PropertiesPanel.test.tsx`](src/ui/PropertiesPanel.test.tsx), [`src/domain/symbolList.test.ts`](src/domain/symbolList.test.ts),
   - [`e2e/editor.spec.ts`](e2e/editor.spec.ts) (także lista domyślnych warstw),
   - [`src/state/editorStore.test.ts`](src/state/editorStore.test.ts) i [`src/domain/project.test.ts`](src/domain/project.test.ts) (domyślne warstwy, z 5 na 6, plus `symbolRole("outlet-single-phase")` → `"outlet"`).

   Plus nowe testy:
   - w palecie: kategoria „Wypusty” i oznaczenie W1 albo R1 po wstawieniu,
   - w domenie: wypust trafia na warstwę Wypusty. `npm test` i `npm run e2e` mają przejść.
3. Ręcznie w `npm run dev`:
   - wstawienie, obrót i skala symbolu, „Skaluj wszystkie”,
   - położenie etykiety po obrocie,
   - eksport PNG i PDF (lista symboli z nowymi nazwami),
   - otwarcie zapisanego wcześniej `.epaint` z łącznikami i gniazdami.

## Uwagi

- `src/assets/symbols/*.svg` nie jest nigdzie importowane (martwe pliki). Zostawiam je bez zmian.
- `switch-triple` jest w `SymbolKind`, ale nie w katalogu. Zostaje bez zmian.
