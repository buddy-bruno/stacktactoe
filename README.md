# Stack Tac Toe

Taktisches Browser-Strategiespiel — Tic-Tac-Toe mit Stapel- und Schlagmechanik, 10 Runden pro Match.

## Projektstruktur

| Ordner/Datei | Beschreibung |
|--------------|---------------|
| `web/` | **Produktiv-App** — Next.js 16, React 19, Shadcn UI. PvP, Realtime, Lobby, alle Modi. |
| `stacktactoe-database.sql` | Supabase-Schema (Tabellen, RLS, RPCs: `finish_game`, `submit_daily_score`, Realtime). |
| `netlify.toml` | Netlify-Build (Base: `web`, Next.js-Plugin). |
| `docs/` | Anleitungen, Pre-Launch-Checkliste, Supabase/Netlify-Integration, Design-Abgleich, [Architektur & Stabilität](docs/ARCHITECTURE.md). |

## Schnellstart

```bash
cd web
npm install
npm run dev
```

Öffne http://localhost:3000

**Lokal:** `web/.env.example` nach `web/.env.local` kopieren und Supabase-URL + Anon-Key eintragen.  
**Supabase + Netlify komplett neu:** Vollständige Schritte von Null: **[docs/SETUP-SUPABASE-NETLIFY-NEU.md](docs/SETUP-SUPABASE-NETLIFY-NEU.md)**.  
**Online stellen (kurz):** **[docs/ONLINE-STELLEN-ANLEITUNG.md](docs/ONLINE-STELLEN-ANLEITUNG.md)**. Details: `docs/SUPABASE-NETLIFY-INTEGRATION.md`.

## Features

- **10 Runden** pro Match, Runden-Dots, Match-End-Modal
- **Volles Spielfeld:** Board, Drag & Drop, Figuren (Bauer/Dame/König), Partikel-FX bei Schlag
- **3 KI-Stufen:** Anfänger, Schwer, Profi (Minimax + Alpha-Beta)
- **PvP:** Lobby, Matchmaking (Casual/Ranked), Invite-Code, Realtime-Züge
- **Ranglisten:** Elo, PvP, Easy/Mid/Hard, Daily
- **Daily Challenge:** Ein Match pro Tag, Tages-Rangliste
- **Puzzle:** Zug in 1 — vorgegebene Stellung, Validierung via `isPuzzleSolution`
- **Blitz:** 10-Sekunden-Timer pro Zug
- **Auth:** `/auth` — Anmelden/Registrieren (Supabase), Redirect-Parameter
- **Responsive:** Desktop, Tablet, Mobile
