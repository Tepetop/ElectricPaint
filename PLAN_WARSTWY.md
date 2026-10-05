# Plan wdrożenia domyślnych warstw

## Cel

Nowy rzut ma pięć warstw w kolejności: **Gniazda**, **Oświetlenie**, **Łączniki**, **Przewody**, **Inne**. Warstwa **Inne** przechowuje symbole z grupy „Pozostałe”. Istniejące projekty zachowują zapisane warstwy i przypisania.

## Zmiany

1. Tworzyć pięć warstw dla nowych rzutów. Przypisać elementy rzutu przykładowego do odpowiednich warstw.
2. Przy wstawianiu kierować gniazda do **Gniazda**, symbole z grupy oświetlenie do **Oświetlenie**, łączniki do **Łączniki**, pozostałe symbole do **Inne**, a przewody do **Przewody**. Tekst pozostaje na aktywnej warstwie. Aktywna warstwa nie zmienia domyślnego przypisania symbolu ani przewodu.
3. Znajdować warstwę po dokładnej nazwie. Gdy jej brakuje po zmianie nazwy lub usunięciu, używać aktywnej warstwy. Przywrócenie nazwy przywraca automatyczne przypisanie. Nie wstawiać elementów na warstwę ukrytą ani zablokowaną.
4. Zachować ręczne przenoszenie elementów między warstwami. Nie zmieniać schematu pliku `.epaint` ani warstw wczytanych projektów.

## Weryfikacja

- Sprawdzić kolejność warstw i przypisania symboli oraz przewodów w nowych rzutach i rzucie przykładowym.
- Sprawdzić ręczny wybór innej aktywnej warstwy, zmianę nazwy, usunięcie, ukrycie i zablokowanie warstwy docelowej.
- Sprawdzić, że stare projekty wczytują się bez zmiany warstw i elementów.
- Uruchomić testy jednostkowe, kompilację i scenariusz interfejsu.
