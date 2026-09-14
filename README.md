# ElectricPaint

Lokalna, desktopowa aplikacja do nanoszenia symboli i tras instalacji elektrycznej na rzut budynku. Działa całkowicie offline na Windows i Linux.

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

Rozszerzenie `.epaint` to ZIP z `project.json` i kopią tła. Eksport PNG/PDF zawiera tylko widoczne warstwy.
