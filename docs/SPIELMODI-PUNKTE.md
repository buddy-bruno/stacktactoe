# Punkte pro Zug (alle Modi)

Die **Zugpunkte** werden für jeden ausgeführten Zug berechnet und zum Runden- und Gesamtpunktestand addiert. Sie gelten **einheitlich** für Classic, Schach und Blitz (gleiche Logik, gleiche Werte).

Implementierung: `web/src/lib/game/scoring.ts` – Konstanten `PTS.*` und Funktion `calcPts`.

## Grundwert

| Komponente | Punkte |
|------------|--------|
| Basis pro Zug | 5 |

## Feldbonus (Zielfeld)

| Feld | Punkte |
|------|--------|
| Mitte (Feld 4) | +8 |
| Ecken (0, 2, 6, 8) | +4 |
| Kanten (1, 3, 5, 7) | +2 |

## Figurenwert (gesetzte/gezogene Figur)

| Figur | Punkte |
|-------|--------|
| Bauer (klein) | +1 |
| Dame (mittel) | +3 |
| König (groß) | +6 |

## Sonderbonus

| Aktion | Punkte |
|--------|--------|
| Überdecken (gegnerische Figur geschlagen/überdeckt) | +12 |
| Offene Zwei (2 eigene in einer Linie, 1 Lücke) | +15 pro solche Linie |
| **Sieg (3 in einer Reihe)** | **+50** |

## Beispielrechnung (ein Zug)

- Setzen eines **Königs** in die **Mitte**, dabei **Dame** überdeckt und **Sieg**:
  - Basis 5 + Mitte 8 + König 6 + Überdecken 12 + offene Zwei 15 + Sieg 50 = **96** Punkte (plus ggf. weitere offene Zweier).

## Verwendung der Punkte

- **Runde:** Sieger bekommt die Runde (1 Sieg); beide sammeln Zugpunkte für die Runde. **Blitz:** Bei Zeitablauf gewinnt der andere die Runde und erhält **4 Punkte** für diese Runde (kein Zug ausgeführt).
- **Match:** Wer zuerst **5 Runden** gewinnt, gewinnt das Match. Bei Gleichstand (z. B. 5:5 nach 10 Runden) gewinnt der mit **höherem Gesamtpunktestand** (Summe aller Zugpunkte).

## Punkte-Check (alle Modi)

- **Classic, Schach, Blitz:** Eine Punkteformel (`calcPts`), Konstanten `PTS` in `scoring.ts`.
- **PvP:** Gleiche Zugpunkte; Matchpunkte (p_points_p1, p_points_p2) = Summe der Zugpunkte des jeweiligen Spielers.
- **Daily:** Gleiche Zugpunkte; gespeichert wird das Gesamtpunkte-Ergebnis des Tagesmatches.
- **Rangliste/Profil:** Anzeige nutzt dieselben Gesamtpunkte (z. B. ai_easy_points, pvp_points).

Bei Anpassungen: Werte in `PTS` in `scoring.ts` ändern und die Tabellen in dieser Datei anpassen.
