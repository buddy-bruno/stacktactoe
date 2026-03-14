# Modus 1 – Classic (Platzieren und Überdecken)

## Spielidee

Zwei Spieler versuchen, **3 eigene sichtbare Figuren in eine Reihe** zu bringen. Eine stärkere Figur kann eine schwächere gegnerische Figur auf demselben Feld **überdecken** (Stapel). Es gibt **kein Bewegen** bereits gesetzter Figuren.

## Material

- **3 Bauern** (klein)
- **3 Damen** (mittel)
- **1 König** (groß)  
→ 7 Figuren pro Spieler.

## Stärke (Rangfolge)

- **König** > **Dame** > **Bauer**

## Spielfeld

- 9 Felder in einem **3×3-Raster**.
- Gewinn: 3 eigene **sichtbare** Figuren in einer Reihe (horizontal, vertikal oder diagonal).

## Erlaubte Züge (pro Zug genau eine Aktion)

1. **Auf leeres Feld setzen:** Beliebig eigene Figur aus dem Vorrat setzen.
2. **Gegnerische Figur überdecken:** Nur erlaubt, wenn **deine Figur stärker** ist als die **oberste** gegnerische Figur auf dem Feld.
   - Dame darf Bauern überdecken.
   - König darf Bauer oder Dame überdecken.
   - Bauer darf **niemanden** überdecken.

## Nicht erlaubt

- Eigene Figur überdecken.
- Gleich starke gegnerische Figur überdecken.
- Stärkere gegnerische Figur überdecken.

## Stapel & Sichtbarkeit

- Überdeckte Figuren **bleiben** im Stapel (werden nicht entfernt).
- Es zählt **nur die oberste sichtbare Figur** pro Feld (für Reihen und Kontrolle).
- Stapel sind offen sichtbar (keine versteckten Informationen).

## Ende der Runde

- **Sieg:** Du gewinnst sofort, wenn nach deinem Zug 3 deiner sichtbaren Figuren in einer Reihe liegen.
- **Unentschieden:** Beide haben keinen legalen Zug mehr und niemand hat eine Dreierreihe.

## Technik

- Engine: `placementOnly: true`, nur `place()`.
- Siehe [SPIELMODI-PUNKTE.md](SPIELMODI-PUNKTE.md) für Zugpunkte.
