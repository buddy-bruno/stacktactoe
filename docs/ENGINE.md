# StackTacToe – Engine und Modus-Trennung

## Übersicht

Die Spielregeln und Züge leben in einer **einzigen Engine** (`STT` in `web/src/lib/game/stt.ts`). Alle Modi (Classic, Schach, Blitz, Daily, PvP) nutzen dieselbe Engine; nur die **Konfiguration** (Classic vs Schach) und die **Orchestrierung** (Zeit, Runden, Netzwerk) unterscheiden sich.

```
┌─────────────────────────────────────────────────────────────────┐
│  App / Hooks (useGameState, Lobby, Game Page)                    │
│  – Modus: ai | pvp | daily                                       │
│  – Variante: classic | schach  →  getEngineConfig / createState  │
│  – Blitz: Timer, Timeout                                         │
│  – PvP: Sync state_json, Realtime                                 │
│  – Daily: Ein Spiel, Leaderboard, submitDailyScore               │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  Engine-Fassade (web/src/lib/game/engine.ts)                     │
│  – getEngineConfig(variant)  →  { placementOnly }               │
│  – createState(variant)       →  neue STT-Instanz               │
│  – getLegalMoves(state, player)                                  │
│  – applyMove(state, move, player)  →  neue Stellung oder null    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  Kern-Engine (STT in stt.ts)                                     │
│  – Brett, Vorrat, cur, over, winner                              │
│  – place() / move() / canPlace() / canMove() / moves()            │
│  – placementOnly: true = nur Setzen, false = Setzen + Bewegen    │
│  – Schach: canMovePieces(), countPiecesOnBoard(), Zurückpendeln   │
└─────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  KI (ai.ts)                                                      │
│  – Kennt nur STT: state.moves(), state.clone(), place(), move()  │
│  – Keine Modus-Logik (kein Blitz, kein Daily)                    │
│  – Schwierigkeit: easy | mid | hard                             │
└─────────────────────────────────────────────────────────────────┘
```

## Wo was lebt

| Thema | Ort | Hinweis |
|-------|-----|--------|
| **Regeln (Züge, Sieg, Remis)** | `stt.ts` | Einzige Quelle für legalen Zug und Spielende |
| **Modus-Konfiguration (Classic vs Schach)** | `engine.ts` → `getEngineConfig()` | Eine Änderung gilt überall (AI, PvP, Lobby) |
| **Neue Stellung erzeugen** | `engine.ts` → `createState(variant)` | Rundenstart, Lobby-Create, Room/Tournament |
| **KI-Zugwahl** | `ai.ts` | Nutzt nur `state.moves()` und `state.clone()` + place/move |
| **Blitz (5-Sekunden-Zug)** | `useGameState.ts` + `BlitzTimer.tsx` | Timer; bei Timeout wird Zug dem Gegner zugesprochen, Engine unverändert |
| **Daily** | `daily.ts` (API) + `useGameState` | Ein Match, gleiche Engine; nur Submit und Leaderboard extra |
| **PvP** | `useGameState` + Supabase | state_json = serializeMatchState(stt, …); Engine wie AI |

## Modi im Detail

- **Classic:** `placementOnly: true` → nur `place()`, keine `move()`.
- **Schach:** `placementOnly: false` → `place()` und `move()`; Bewegung erst ab 3 eigenen Figuren (`canMovePieces`), Zurückpendeln verboten, Dreifach-Wiederholung = Remis (alles in `stt.ts`).
- **Blitz:** Wie Classic oder Schach (variant), plus Zeitlimit pro Zug im Hook.
- **Daily:** Wie Classic (oder künftig Schach), plus fester Tag und Rangliste.
- **PvP:** Wie Classic oder Schach (Lobby wählt Variante); state wird in DB gespeichert und synchron gehalten.

## Änderungen an den Regeln

- **Classic vs Schach:** Nur `engine.ts` (`CONFIG`) und ggf. `stt.ts` (neue Regeln) anpassen.
- **Neue Variante (z. B. „Rapid“):** In `engine.ts` `GameVariant` und `CONFIG` erweitern, dann überall, wo `createState`/`getEngineConfig` genutzt wird, die neue Variante unterstützen (URL, Lobby, Game Page).

## KI und Engine

Die KI ruft ausschließlich die öffentliche API der Engine auf:

- `state.moves(player)` – alle legalen Züge (bereits variantenabhängig über `placementOnly` und Schach-Regeln),
- `state.clone()` und dann `g.place(...)` / `g.move(...)`.

Es gibt keine if/else für „Classic“ oder „Schach“ in der KI; die Engine entscheidet über die erlaubten Züge.
