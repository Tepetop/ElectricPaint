# ElectricPaint

Lokalna, desktopowa aplikacja do nanoszenia symboli i tras instalacji elektrycznej na rzut budynku. Działa całkowicie offline na Windows i Linux.

## Funkcje

### Zakładki

Każda zakładka to osobny rzut i osobny plik `.epaint` — na przykład kolejne piętra. **Nowy**, **Otwórz**, **Przykład** i Ctrl+N dodają zakładkę, a nie zastępują otwartego rzutu. **Zapisz**, **Zapisz jako** i eksport dotyczą aktywnej zakładki.

Przełączenie zakładki zostawia przy niej zaznaczenie, szkic przewodu, szkic skali, powiększenie, przesunięcie widoku oraz własną historię cofania. Zamknięcie ostatniej zakładki zostawia pusty rzut. Otwarcie pliku, który jest już w innej zakładce, pokazuje ostrzeżenie, bo drugi zapis nadpisze ten sam plik.

Niezapisane zakładki trafiają do autosave co 20 sekund. Po ponownym uruchomieniu baner **Przywróć** odtwarza je wszystkie. Zapis jednej zakładki nie kasuje autosave pozostałych.

### Symbole i skala

Paleta zawiera łączniki, gniazda, oświetlenie i pozostałe symbole. Pole **Skaluj symbol** ustawia rozmiar nowych symboli, a przy jednym zaznaczeniu — także ten symbol.

**Skaluj wszystkie** nadaje wszystkim już umieszczonym symbolom aktywnego rzutu rozmiar z tego pola, także na warstwach ukrytych i zablokowanych. Nie zmienia położenia, tras przewodów ani tekstu. Ta sama wartość staje się domyślną skalą nowych symboli. Jedno **Cofnij** przywraca wcześniejsze rozmiary.

### Warstwy

Nowy rzut ma warstwy Gniazda, Oświetlenie, Przewody i Inne. Warstwę można dodać, nazwać, pokazać, ukryć, zablokować i zmienić kolejność. Nowe symbole trafiają na warstwę zgodną z rodzajem (gniazda, oświetlenie albo pozostałe), przewody na warstwę Przewody.

W panelu właściwości zaznaczony element — albo całe zaznaczenie — da się przenieść na inną warstwę, także zablokowaną. Element na zablokowanej warstwie zostaje na rzucie i nie jest edytowalny, dopóki warstwa jest zablokowana. Po przeniesieniu na ukrytą warstwę znika ramka zaznaczenia.

### Grupy sterowania

Grupa łączy łączniki z oprawami i po **Zatwierdź** wpisuje wspólne oznaczenie na schemacie. **Zwiń wszystkie** i **Rozwiń wszystkie** zmieniają stan wszystkich grup jednym krokiem historii. Pojedynczą grupę nadal można zwinąć osobno. Zwinięcie zapisuje się w pliku.

### Skala rzutu

Narzędzie **Skala rzutu**: dwa różne punkty na rzucie, rzeczywista długość w milimetrach, potem **Zatwierdź skalę**. Długości przewodów zmieniają się dopiero po zatwierdzeniu. Punkty skali przyciągają się co 1 px, niezależnie od siatki i przełącznika przyciągania. Symbole, tekst i przewody nadal używają kroku 10 px.

Po zatwierdzeniu odcinek referencyjny znika z widoku i z eksportu. Punkty i długość zostają w pliku, więc długości przewodów nadal się liczą. Ponowne wejście w narzędzie pokazuje zapisany odcinek do korekty.

### Przewody, tekst i eksport

Przewód rysuje się ciągiem odcinków (przytrzymaj LPM, PPM kończy trasę). Kolor, grubość i styl (ciągła albo przerywana) ustawia się przed rysowaniem i później we właściwościach. Legenda pokazuje długość każdej widocznej trasy i sumę, gdy skala jest ustawiona.

Eksport PNG i PDF zawiera tylko widoczne warstwy.

### Skróty

- Ctrl+N — nowa zakładka
- Ctrl+O — otwórz
- Ctrl+S — zapisz, Ctrl+Shift+S — zapisz jako
- Delete albo Backspace — usuń zaznaczenie
- Spacja (przytrzymana) albo środkowy przycisk — przesuwanie widoku

## Uruchomienie (tryb przeglądarki)

Wymagane Node.js 20+.

```bash
npm install
npm run dev
```

Aplikacja otworzy się na `http://localhost:1420`. Przycisk **Przykład** wczytuje demonstracyjny rzut z symbolami i trasą.

## Aplikacja desktopowa

Wymagany Rust (`rustup`) oraz zależności Tauri.

```bash
npm run tauri dev
```

Linux (przed pierwszym buildem):

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

Szczegóły: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## Zatrzymanie

**Ctrl+C** działa tylko w terminalu, w którym program nadal pisze logi (nie ma jeszcze promptu `$`).

Jeśli po **Ctrl+C** pojawia się samo `^C`, ten terminal już nic nie uruchamia. Zostawiony w tle Vite (błąd `Port 1420 is already in use`) zatrzymasz z innego terminala:

```bash
fuser -k 1420/tcp
```

## Testy

```bash
npm test
npx playwright install chromium
npm run e2e
```

## Instalatory

```bash
npm run tauri build
```

- Linux: `.deb` i `.AppImage` w `src-tauri/target/release/bundle/`
- Windows: instalator NSIS po zbudowaniu na Windows

Workflow GitHub Actions (`.github/workflows/build.yml`) buduje obie paczki po tagu `v*` albo ręcznym uruchomieniu.

## Plik projektu

Rozszerzenie `.epaint` to ZIP z `project.json` i kopią tła. Jeden plik to jeden rzut; kilka rzutów otwiera się jako osobne zakładki.

Tło rzutu: PNG, JPEG, WebP, PDF (z wyborem strony) albo DXF. Import trafia do aktywnej zakładki.
