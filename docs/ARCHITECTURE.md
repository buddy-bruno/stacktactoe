# Architektur & Stabilität — StackTacToe

Kurzer Überblick für langfristige Wartung und Erweiterung.

---

## 1. Architektur-Überblick

- **Frontend:** Eine Next.js-App (`web/`). App Router, React 19, Client Components wo nötig (Spielzustand, Realtime).
- **Backend:** Supabase (Auth, Postgres, Realtime). Kein eigener Server; RPCs und RLS regeln Logik und Zugriff.
- **Deploy:** Netlify (Build aus `web/`, Konfiguration in Root-`netlify.toml`).

**Gewollte Eigenschaften:** Einfacher Stack, keine doppelte Backend-Logik, klare Trennung Spiel-Engine ↔ UI ↔ Datenbank.

---

## 2. Stabilität & Grenzfälle

| Bereich | Stand | Empfehlung |
|--------|--------|-------------|
| **Spiel-Engine** | `web/src/lib/game/stt.ts` — zustandslos, klonbar, rein. KI in `ai.ts`, Scoring in `scoring.ts`. | Spiellogik nicht in DB duplizieren; neue Modi als Erweiterung von STT/Scoring. |
| **Realtime** | Supabase Realtime auf `games` (state_json). Subscription in `useGameState`. | Bei Verbindungsabbrüchen: Reconnect + ggf. state_json einmalig nachziehen. |
| **Auth** | Supabase Auth; Profil per Trigger bei Signup. | RLS nutzen; nur anon Key im Frontend. |
| **DB-Schema** | `stacktactoe-database.sql` idempotent (Typ, Spalten, Publication). | Änderungen als additive Migrationen (neue Spalten/Funktionen mit IF NOT EXISTS / DO-Blöcken). |

---

## 3. Game Design — zentrale Konstanten

- **Runden:** 10 Runden pro Match (`ROUNDS_TOTAL` in `match-state.ts`).
- **Brett:** 3×3; drei Figurengrößen (Bauer/Dame/König); Placement- dann Movement-Phase.
- **Ranglisten:** getrennt pro Modus (PvP, Easy/Mid/Hard, Daily, Ranked Elo); Werte in `profiles` und über RPCs aktualisiert.

Änderungen an Rundenanzahl oder Brettgröße: Spiel-Engine + DB (Runden-Logik, ggf. `finish_game`) gemeinsam anpassen.

---

## 4. Langfristige Wartung

- **Design:** Farben und Tokens nur in `web/src/app/globals.css`; Komponenten nutzen `var(--game-*)`. Siehe `web/DESIGN.md` und `docs/DESIGN_UMSETZUNG.md`.
- **Env:** Keine Secrets im Repo. Supabase-URL und Anon-Key über `.env.local` (lokal) und Netlify Env (Produktion).
- **Dependencies:** Regelmäßig `npm outdated` in `web/`; Next.js und Supabase-Client mit Changelog aktualisieren.

---

## 5. Was entfernt wurde (Stand Cleanup)

- **Legacy:** `index.html` (Vanilla-MVP), `BLUEPRINT.md`, `StackTacToe_GameDesign_Roadmap.pdf` — nicht mehr referenziert.
- **Unity:** Ordner `unity/` und `docs/UNITY_MIGRATION.md` — Fokus liegt auf der Web-App.

Produktiv ist nur die Next.js-App unter `web/`; DB-Schema und Deploy-Docs im Repo-Root bzw. unter `docs/`.
