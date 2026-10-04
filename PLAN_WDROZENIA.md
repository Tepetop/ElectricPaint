# Plan wdrożenia zmian w ElectricPaint

## Uzgodniony zakres

- Każda zakładka reprezentuje osobny plik `.epaint`. Zakładki służą do wygodnego przełączania się między rzutami, na przykład piętrami budynku.
- Przycisk „Skaluj wszystkie” nadaje wszystkim już umieszczonym **symbolom** rozmiar z pola „Skaluj symbol”. Nie przelicza położenia elementów, geometrii przewodów ani tekstu. „Skala rzutu” nadal określa przelicznik długości na podstawie odcinka referencyjnego.
- Zmiany w danej zakładce dotyczą wyłącznie jej rzutu.

## Stan obecny

- `src/ui/SymbolPalette.tsx` udostępnia pole „Skaluj symbol”. Zmiana jego wartości ustawia domyślny rozmiar nowych symboli, a przy pojedynczym zaznaczeniu zmienia również ten symbol. Logika znajduje się w `src/domain/commands.ts`. Gdy zaznaczony jest jeden symbol, pole pokazuje jego `scale`, a nie `defaultSymbolScale`.
- Elementy mają `layerId`, lecz po umieszczeniu nie ma w interfejsie możliwości przypisania ich do innej warstwy.
- Każdą grupę sterowania można zwinąć osobno. Brakuje polecenia zbiorczego. Pole `collapsed` jest częścią projektu, więc zwinięcie oznacza plik jako zmieniony i trafia do historii.
- Odcinek referencyjny zapisanej skali jest stale wyświetlany przez `src/editor/StageCanvas.tsx` i dodawany do eksportu przez `src/editor/exportDoc.ts`. Drugi klik w `clickScalePoint` od razu zapisuje `scaleReference`, a `ScaleLengthField` commituje długość przy każdym znaku.
- Punkty odcinka skali korzystają z przyciągania co 10 px (`GRID_SIZE`), takiego samego jak pozostałe narzędzia i zależnego od przełącznika przyciągania.
- `src/state/editorStore.ts` przechowuje jeden aktywny projekt, jedną historię cofania i jedno tło. Plik `.epaint` oraz autosave również obsługują obecnie jeden rzut. `undo` przywraca projekt, ale nie `selectedIds`. `App.tsx` woła `fitView()` przy każdej zmianie `backgroundDataUrl`. Zapis projektu czyści cały autosave.

## Etap 1 — skalowanie wszystkich symboli

1. Dodać w `src/domain/commands.ts` operację, która ustawia `scale` każdego symbolu w aktywnym projekcie na podaną wartość i tę samą wartość zapisuje jako `defaultSymbolScale`. Nie modyfikować tras przewodów, tekstów ani współrzędnych symboli. Nie używać `Number(scale) || 1`: zero i `NaN` nie mogą zamieniać się na 1, a liczba ujemna nie może przejść.
2. Dodać w `src/state/editorStore.ts` polecenie zapisujące tę operację jako **jeden** krok historii. Niedodatnia albo nieliczbowa skala nie tworzy kroku historii i nie oznacza projektu jako zmienionego.
3. Dodać przy polu „Skaluj symbol” w `src/ui/SymbolPalette.tsx` przycisk „Skaluj wszystkie”. Przycisk bierze liczbę aktualnie widoczną w polu, także gdy zaznaczony jest jeden symbol o innej skali niż domyślna. Ta liczba staje się domyślną skalą nowych symboli.
4. Polecenie obejmuje wszystkie symbole aktywnego rzutu, również na warstwach ukrytych i zablokowanych.

**Kryterium odbioru:** symbole o różnych rozmiarach, także na warstwie ukrytej albo zablokowanej, przyjmują rozmiar wpisany w polu; nowo dodany symbol ma ten sam rozmiar; jedno „Cofnij” przywraca wcześniejsze rozmiary; niepoprawna wartość nic nie zmienia.

## Etap 2 — przypisywanie istniejących elementów do warstw

1. Dodać operację domenową zmieniającą `layerId` dla wskazanych identyfikatorów elementów. Odrzucać nieistniejącą warstwę docelową i nie zmieniać innych pól elementu. Przeniesienie na warstwę zablokowaną jest dozwolone: element zostaje na rzucie i przestaje być edytowalny, dopóki warstwa jest zablokowana.
2. Udostępnić wybór warstwy w `src/ui/PropertiesPanel.tsx` dla jednego zaznaczonego elementu i dla zaznaczenia wielokrotnego. Pokazać nazwę bieżącej warstwy albo informację o różnych warstwach przy zaznaczeniu zbiorczym. Przy wielu elementach nie dodawać pozostałych pól właściwości.
3. Zintegrować przeniesienie z historią cofania. Po przeniesieniu na ukrytą warstwę usunąć niewidoczne elementy z zaznaczenia, aby na płótnie nie pozostała ramka edycji. Cofnięcie przywraca `layerId`, ale nie zaznaczenie — tak jak pozostałe operacje edytora.
4. Zachować identyfikatory, współrzędne, nazwy, oznaczenia i przynależność symboli do grup sterowania.

**Kryterium odbioru:** użytkownik może po utworzeniu warstwy przenieść na nią wcześniejsze symbole, przewody i teksty, także na warstwę zablokowaną; widoczność warstw działa od razu; cofnięcie przywraca poprzednie warstwy elementów.

## Etap 3 — grupy sterowania i dokładne ustawianie skali rzutu

1. Dodać w `src/ui/GroupsPanel.tsx` polecenia „Zwiń wszystkie” i „Rozwiń wszystkie”. Zmienić stan wszystkich grup jedną operacją historii; zachować możliwość późniejszego rozwijania pojedynczych grup. Zwinięcie zapisuje się w projekcie i oznacza plik jako zmieniony. Jeśli każda grupa ma już żądany stan, nie tworzyć pustego kroku historii.
2. Uporządkować przepływ ustawiania skali: wskazanie dwóch różnych punktów, wpisanie rzeczywistej długości w milimetrach i wyraźne zatwierdzenie. Do zatwierdzenia trzymać szkic. Drugi klik nie może zapisywać `scaleReference`, bo dziś podstawia poprzednią długość albo 1 m i od razu zmienia długości przewodów. Pole długości nie woła `commitScaleLength` przy każdym znaku; jeden krok historii powstaje dopiero po zatwierdzeniu. Odrzucać odcinek o długości 0 px (także po przyciągnięciu do tej samej komórki) i długość niedodatnią, bez kroku historii.
3. Podczas wskazywania punktów skali stosować przyciąganie co **1 px**, niezależnie od `GRID_SIZE` i od przełącznika przyciągania. Wyłączone przyciąganie nie przywraca swobodnego punktu dla tego narzędzia. Pozostawić dotychczasowy krok 10 px dla symboli, tekstu i przewodów oraz dotychczasowy wygląd siatki.
4. Po zatwierdzeniu nie rysować odcinka referencyjnego ani jego etykiety w `StageCanvas`. Nie dodawać pola widoczności do pliku: w `.epaint` zostają punkty i `lengthM`, więc stare projekty dalej liczą długości przewodów, a linia znika z widoku. Wejście w narzędzie „Skala rzutu” pokazuje zapisany odcinek do korekty.
5. Usunąć `addScaleOverlay` z eksportu PNG i PDF, także gdy narzędzie skali jest włączone. Eksport czyta projekt, nie szkic.

**Kryterium odbioru:** da się wskazać odcinek wymagający dokładności poniżej 10 px; długości przewodów nie zmieniają się przed zatwierdzeniem; po zatwierdzeniu oznaczenie znika z widoku i eksportu, a obliczone długości przewodów pozostają poprawne. Istniejące testy skali w `editorStore.test.ts` i `SymbolPalette.test.tsx` trzeba dostosować, bo drugi klik przestaje zapisywać odcinek.

## Etap 4 — wiele rzutów w zakładkach

1. Wprowadzić stan sesji dla każdej zakładki: identyfikator, projekt, tło, nazwę lub ścieżkę pliku, stan zapisania, zaznaczenie, aktywną warstwę, narzędzie, `pendingSymbolKind`, szkic przewodu, szkic skali, kolor, grubość i styl przewodu, `showGrid`, `snap`, powiększenie, przesunięcie widoku oraz własną historię cofania i ponawiania. `viewport` zostaje wspólny, bo jest rozmiarem okna. Informacja o dostępnym autosave dotyczy sesji, nie jednego rzutu.
2. Zachować istniejące operacje edytora jako operacje na **aktywnej** zakładce. Przełączenie zakładki nie może przenosić zaznaczenia, szkicu przewodu, szkicu skali ani historii zmian między rzutami.
3. Dodać pasek zakładek w `src/app/App.tsx`: nazwę każdego rzutu, wskaźnik niezapisanych zmian, wybór zakładki, zamknięcie zakładki oraz utworzenie nowej. „Otwórz”, „Nowy”, „Przykład” i skrót Ctrl+N dodają zakładkę, a nie zastępują aktywnego rzutu. „Zapisz”, „Zapisz jako” i eksport dotyczą aktywnej zakładki. Zamknięcie ostatniej zakładki zostawia pusty rzut. Otwarcie pliku już obecnego w innej zakładce wymaga ostrzeżenia, bo drugi zapis nadpisze ten sam plik.
4. Zachować format **jednego rzutu na plik `.epaint`**. Nie trzeba zmieniać struktury istniejących plików projektów. Import tła działa w aktywnej zakładce; nowy rzut można utworzyć w nowej zakładce i dopiero tam zaimportować tło.
5. Rozszerzyć autosave o wszystkie otwarte zakładki oraz odczyt dotychczasowego, pojedynczego autosave. Zapis jednej zakładki usuwa tylko jej wpis; `clearAutosave()` nie może skasować pozostałych. `beforeunload` i zamknięcie okna Tauri sprawdzają każdą zmienioną zakładkę. Przy zamykaniu niezapisanej zakładki lub aplikacji uwzględnić zmiany we wszystkich zakładkach. Kilka dużych teł PDF albo DXF powiększa IndexedDB — autosave ma to unieść, ale nie zapisywać kopii zakładki, która nie jest zmieniona.
6. Operacje asynchroniczne zapisu i wczytywania tła powiązać z identyfikatorem zakładki. Jeśli użytkownik przełączy rzut podczas zapisu lub ładowania obrazu, wynik nie może trafić do innej zakładki. To samo dotyczy dialogu strony PDF (`pdfPrompt`): wybór strony wraca do zakładki, która zaczęła import. Zachować stan `dirty`, jeśli po rozpoczęciu zapisu zaszły kolejne zmiany.
7. Zachować powiększenie i przesunięcie widoku każdej zakładki po przełączeniu. Automatyczne dopasowanie wykonać przy pierwszym wczytaniu tła danego rzutu. Efekt w `App.tsx`, który woła `fitView()` przy każdej zmianie `backgroundDataUrl`, trzeba ograniczyć do tego pierwszego wczytania — inaczej powrót do zakładki nadpisze zapamiętany widok.

**Kryterium odbioru:** można otworzyć dwa pliki `.epaint`, przełączać rzuty bez utraty widoku, szkiców i zmian, cofać działania niezależnie w każdej zakładce, zapisać każdy plik osobno bez kasowania autosave pozostałych oraz odzyskać niezapisane zakładki po ponownym uruchomieniu.

## Weryfikacja i kolejność prac

Etapy 1–3 można wdrażać kolejno w obecnym modelu pojedynczego projektu. Etap 4 należy wykonać po nich, ponieważ zmienia organizację stanu aplikacji i zapisu. Po każdym etapie uruchomić testy jednostkowe (`npm test`) i kompilację (`npm run build`), a po etapie 4 także scenariusz interfejsu (`npm run e2e`).

Testy powinny obejmować szczególnie: zbiorcze skalowanie i cofanie, odrzucenie niepoprawnej skali, przenoszenie wielu rodzajów elementów między warstwami (w tym na warstwę zablokowaną), zachowanie grup po przeniesieniu, szkic skali bez zmiany długości przewodów przed zatwierdzeniem, dokładność punktów skali co 1 px, brak oznaczenia odcinka w eksporcie, izolację dwóch zakładek, zapis podczas przełączania zakładek, import PDF wracający do właściwej zakładki oraz odtworzenie autosave wielu rzutów.
