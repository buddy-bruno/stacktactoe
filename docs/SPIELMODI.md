# StackTacToe – Spielmodi (Übersicht)

## Modi

| Modus | Kurz | Züge | Besonderheit |
|-------|------|------|--------------|
| **Classic** | Modus 1 | Nur Setzen | 3 in einer Reihe gewinnt |
| **Schach** | Modus 2 | Setzen + Bewegen (1 Feld) | Dreifach-Wiederholung = Remis |
| **Blitz** | Zeitdruck | Wie Classic (nur Setzen) | 5 Sekunden pro Zug, Zeit abgelaufen = Runde verloren |
| **Pool** | Figurenpool | Nur Setzen | Gemeinsamer Vorrat (6B, 6D, 2K), Swap-Regel |

Gemeinsame Grundlage: 3×3-Brett, Stärke König > Dame > Bauer. Classic/Schach/Blitz: 3 Bauern + 3 Damen + 1 König pro Spieler. Pool: gemeinsamer Vorrat. Ein Match hat **10 Runden**; gewonnen hat, wer zuerst 5 Runden gewinnt, sonst gewinnt der mit mehr Gesamtpunkten.

## Detaillierte Regeln (pro Modus)

- [SPIELMODI-CLASSIC.md](SPIELMODI-CLASSIC.md) – Modus 1: Platzieren und Überdecken
- [SPIELMODI-SCHACH.md](SPIELMODI-SCHACH.md) – Modus 2: Setzen + Bewegen, Dreifach-Wiederholung
- [SPIELMODI-BLITZ.md](SPIELMODI-BLITZ.md) – 5 Sekunden pro Zug, Zeit für beide (Spieler + KI)
- [SPIELMODI-POOL.md](SPIELMODI-POOL.md) – Gemeinsamer Pool, Swap-Regel nach erstem Zug
- [SPIELMODI-PUNKTE.md](SPIELMODI-PUNKTE.md) – Punkte pro Zug (einheitlich für alle Modi)
