# Harness ElectricPaint

Ten katalog ma dwa tryby: wykonanie dowolnego zadania w ElectricPaint oraz lokalną ocenę agenta na przygotowanych zadaniach.

## Dowolny prompt

Wymagane: Node.js 22.13+, `npm install` w katalogu repozytorium i `npm install` w katalogu `harness`, a także klucz `CURSOR_API_KEY` z Codex Dashboard → Integrations.

```bash
cd harness
export CURSOR_API_KEY=cursor_...
npm run prompt -- --prompt "Dodaj skrót klawiaturowy do zapisu projektu"
# lub dla dłuższego opisu:
npm run prompt -- --prompt-file ../zadanie.md
```

Skrypt uruchamia agenta lokalnie w głównym katalogu repozytorium. Po jego pracy wykonuje `npm test` i `npm run build`. Gdy weryfikacja zawiedzie, przekazuje błędy agentowi i ponawia pracę najwyżej dwa razy. `--model` wybiera model (domyślnie `composer-2.5`), a `--timeout-min` ogranicza czas jednej próby (domyślnie 20 minut). Prompt, transkrypty, logi i raport trafiają do ignorowanego przez Git katalogu `harness/runs/prompt-<czas>/`.

Agent zmienia pliki w bieżącym repozytorium. Przed uruchomieniem warto sprawdzić `git status`, a po zakończeniu przejrzeć `git diff`. Harness nie tworzy commita ani nie wysyła zmian na GitHub.

## Ocena na zadaniach z ukrytymi testami

Lokalna ocena agenta na trzech zadaniach z logiki rysunku. Agent nie widzi testów, które decydują o zaliczeniu.

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
