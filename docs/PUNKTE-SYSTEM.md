# Punkte-System — Spezifikation (verbindlich)

Diese Datei definiert, **wo** Punkte gespeichert werden, **wann** sie aktualisiert werden und welche **Regeln** das System einhält. Code und Doku orientieren sich daran.

---

## 1. Speicherorte

### 1.1 Tabelle `profiles`

| Bereich | Spalten | Bedeutung |
|--------|---------|-----------|
| **Gesamt/Legacy** | `total_points`, `wins`, `losses`, `draws`, `games_played`, `win_streak`, `best_streak` | Aggregiert über alle Partien (KI + PvP). |
| **Gegner (PvP)** | `pvp_points`, `pvp_wins`, `pvp_games`, `pvp_best_streak` | **Nur** Partien gegen menschliche Gegner. |
| **KI** | `ai_easy_points`, `ai_easy_wins`, `ai_easy_games`, `ai_mid_*`, `ai_hard_*` | **Nur** Partien gegen KI, getrennt nach Schwierigkeit (einfach / mittel / schwer). |

- **Regel:** KI-Punkte und Gegner-Punkte sind strikt getrennt. Eine Partie fließt **entweder** in `pvp_*` **oder** in `ai_*` (nach Schwierigkeit), nie in beide.

### 1.2 Tabelle `daily_scores`

- Daily-Challenge: ein Eintrag pro Nutzer und Tag (`challenge_date`).
- Enthält: `points`, `time_ms`, `rounds_won`.
- **Getrennt** vom Profil: Daily-Punkte werden **nicht** in `profiles.total_points` oder `profiles.ai_*` geschrieben.

### 1.3 Tabelle `games`

- Pro Partie eine Zeile; `points_p1`, `points_p2` = Matchpunkte (Summe der Zugpunkte).
- `mode`: `'ai'` oder `'pvp'` (entscheidet, ob in `ai_*` oder `pvp_*` geschrieben wird).
- `difficulty`: nur bei `mode = 'ai'` relevant (`easy` / `mid` / `hard`).

---

## 2. Wann werden welche Spalten aktualisiert?

### 2.1 Gegner (PvP)

- **Einzige Stelle:** RPC `finish_game(p_game_id, p_winner_id, p_points_p1, p_points_p2)`.
- Wird aufgerufen, wenn eine **PvP-Partie** beendet wird und eine `games`-Zeile mit `mode = 'pvp'` existiert.
- In `finish_game`: Es werden nur `pvp_points`, `pvp_wins`, `pvp_games`, `pvp_best_streak` (sowie die gemeinsamen Felder `total_points`, `wins`, …) für beide Spieler aktualisiert. **Keine** `ai_*`-Spalten.

### 2.2 KI

- **Einzige Stelle:** dieselbe RPC `finish_game`.
- Wird aufgerufen, wenn eine **KI-Partie** beendet wird und eine `games`-Zeile mit `mode = 'ai'` und `difficulty` existiert.
- In `finish_game`: Es werden nur die passenden `ai_<difficulty>_points`, `_wins`, `_games` (sowie die gemeinsamen Felder) für den Spieler (player1) aktualisiert. **Keine** `pvp_*`-Spalten.

Damit KI-Punkte ankommen, muss für jede KI-Partie eine `games`-Zeile angelegt werden (beim Start des Spiels). **Implementierung (Option A):** Beim Klick auf „Spiel starten“ im KI-Schwierigkeit-Modal wird eine Zeile in `games` angelegt (`player1_id`, `mode = 'ai'`, `difficulty`, `status = 'active'`, initiales `state_json`), dann zur Spiel-URL mit `id` gewechselt. Am Match-Ende ruft das Frontend wie bei PvP `finish_game` auf → KI-Punkte werden in den passenden `ai_*`-Spalten gespeichert.

### 2.3 Daily

- **Einzige Stelle:** RPC `submit_daily_score(p_points, p_time_ms, p_rounds_won)` → schreibt in `daily_scores`.
- **Keine** Änderung an `profiles.ai_*` oder `profiles.pvp_*` für Daily.

### 2.4 Frontend

- Punkte werden **nur** persistiert über:
  - `finish_game` (PvP und KI, sobald eine `games`-Zeile existiert),
  - `submit_daily_score` (Daily).
- Es gibt **keine** weiteren direkten Updates auf `profiles` (total_points, pvp_*, ai_*) aus dem Frontend. Anzeige (Profil, Rangliste) liest nur aus diesen Spalten.

---

## 3. Zugpunkte (pro Zug)

- **Berechnung:** Einheitlich für alle Modi (Classic, Schach, Blitz, Pool) in `web/src/lib/game/scoring.ts`: Konstanten `PTS`, Funktion `calcPts`.
- **Dokumentation:** [SPIELMODI-PUNKTE.md](SPIELMODI-PUNKTE.md).
- **Matchpunkte:** Summe der Zugpunkte pro Spieler über das gesamte Match. Diese Werte werden an `finish_game` als `p_points_p1` bzw. `p_points_p2` übergeben.

---

## 4. Kurzfassung

| Quelle | Persistenz | Spalten / Tabelle |
|--------|------------|-------------------|
| PvP-Partie beendet | `finish_game` | `profiles.pvp_*` (+ gemeinsame Felder) |
| KI-Partie beendet | `finish_game` (mit `games.mode = 'ai'`) | `profiles.ai_<difficulty>_*` (+ gemeinsame Felder) |
| Daily beendet | `submit_daily_score` | `daily_scores` |

KI und Gegner sind strikt getrennt; eine Partie landet nie gleichzeitig in `pvp_*` und `ai_*`. Die Logik in der RPC `finish_game` (Fallunterscheidung nach `games.mode` und `games.difficulty`) ist die einzige Stelle, die Profil-Punkte nach Spielende schreibt.
