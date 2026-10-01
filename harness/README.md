# Harness ElectricPaint

Lokalna ocena agenta Cursora na trzech zadaniach z logiki rysunku. Agent nie widzi testów, które decydują o zaliczeniu.

## Co jest zaliczeniem

Zadanie zalicza się, gdy naraz:

1. agent skończył pracę (`finished`),
2. ukryty test tego zadania przechodzi,
3. dotychczasowe `vitest` projektu nadal przechodzą.

Układ zadań:

| id | o co chodzi |
| --- | --- |
| `snap-nearest` | zepsute przyciąganie do siatki, ma zaokrąglać jak `Math.round` |
| `bounds-touch` | krawędź prostokąta ma należeć do obszaru |
| `route-bounds` | dodać `routeBounds` — prostokąt opisany trasy |

Dwa pierwsze dostają w kopii roboczej jednolinijkowy błąd (`seed.patch`). Trzecie startuje ze zwykłego kodu, bo funkcji jeszcze nie ma. Istniejące testy projektu na tej kopii nadal przechodzą, więc agent nie dostaje odpowiedzi z `npm test`.

## Uruchomienie

Node.js 22.13+ (tego wymaga SDK; sama aplikacja zostaje przy 20+). W katalogu repozytorium: `npm install`. Potem:

```bash
cd harness
npm install
npm run self-check
export CURSOR_API_KEY=cursor_...
npm run eval -- --task snap-nearest
npm run eval -- --model grok-4.7
```

Klucz: Cursor Dashboard → Integrations. Jedno zadanie trwa do 8 minut. Wynik ląduje w `harness/runs/<czas>/report.json`, a kopia kodu agenta zostaje obok raportu.

`npm run self-check` nie woła agenta. Sprawdza, że czysty kod i wszyty błąd dają oczekiwany wynik ukrytego testu.

## Czego agent nie widzi

Kopia robocza to archiwum repozytorium bez katalogu `harness`, z jednym nowym commitem. Dzięki temu `git show` nie odsłania `grade.test.ts`. Test dopisywany jest dopiero po zakończeniu agenta.

Agent startuje lokalnie, bez reguł projektu i bez reguł użytkownika (`settingSources: []`). Wynik dotyczy modelu na gołym kodzie.
