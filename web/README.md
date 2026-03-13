# StackTacToe — Next.js Frontend

Phase-2-Migration: React/Next.js mit Shadcn UI.

## Setup

```bash
cd web
npm install
cp .env.example .env.local  # optional: Supabase-Keys
npm run dev
```

## Struktur

- `src/lib/game/` — STT (Spielengine), AI, Match-State
- `src/lib/supabase.ts` — Supabase Client
- `src/app/` — Pages: Home, Game, Lobby, Ranking, Daily, Puzzle, Auth
- `src/components/ui/` — Shadcn UI Komponenten
- `src/components/layout/` — PageShell, AppHeader, ModeCard
- `src/components/game/` — GameBoard, PieceSvg, CaptureFx, BlitzTimer

**Matchmaking:** Die Lobby nutzt die Supabase-RPC `join_matchmaking_queue` direkt. Die Edge Function `supabase/functions/matchmaking` ist ein optionaler Proxy (z. B. für externe Aufrufe).

Siehe **DESIGN.md** für das token-basierte Design-System (Farben, Typo, Komponenten).

## Build & Deploy

```bash
npm run build
```

Für Netlify: Build-Kommando `npm run build`, Publish-Verzeichnis `web/out` (bei `next export`) oder `web/.next` mit Next.js Adapter.
