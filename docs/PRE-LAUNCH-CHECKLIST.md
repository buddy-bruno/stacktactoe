# Pre-Launch-Checkliste — StackTacToe online

Kurz vor dem Go-Live alles prüfen.

---

## 1. Build & Lint (lokal)

```bash
cd web
npm ci
npm run build
npm run lint
```

- **Build** muss ohne Fehler durchlaufen.
- **Lint** darf keine Errors haben (Warnings sind ok).

---

## 2. Supabase

- [ ] **SQL ausgeführt:** `stacktactoe-database.sql` im Supabase SQL Editor einmal komplett ausgeführt (Tabellen, RLS, Funktionen, Realtime).
- [ ] **Realtime:** Database → Replication → Tabelle **games** (und ggf. **moves**) für Realtime aktiviert.
- [ ] **Auth-URLs:** Authentication → URL Configuration  
  - Site URL: deine Netlify-Site-URL (z. B. `https://[dein-projekt].netlify.app`)  
  - Redirect URLs: `https://[dein-projekt].netlify.app/**` und `http://localhost:3000/**`
- [ ] **Nur anon Key:** Im Frontend/Netlify wird nur der **anon public** Key verwendet, nie der **service_role**.

---

## 3. Netlify

- [ ] **Base directory:** Wenn das Repo-Root das Projekt-Root ist, in Netlify unter Build settings **Base directory** = `web` setzen (oder in `netlify.toml` steht `base = "web"`).
- [ ] **Env-Variablen** (Build & deploy → Environment variables):
  - `NEXT_PUBLIC_SUPABASE_URL` = deine Supabase-URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon Key aus Supabase (Settings → API)
- [ ] **Deploy:** Nach dem Setzen der Env-Variablen einen neuen Deploy auslösen.

---

## 4. Funktionstests (nach Deploy)

- [ ] **Startseite** lädt, Modus-Karten (Classic, Daily Challenge, Puzzle, Blitz) sichtbar.
- [ ] **Anmelden:** Auth-Seite, Login/Registrieren, Redirect zurück zur App.
- [ ] **Gegen KI:** Modus wählen, Schwierigkeit wählen, Spiel startet, Züge möglich, Runde/Match-Ende.
- [ ] **Multiplayer – Einladen:** Lobby → Spiel erstellen → Code/Link erscheint.
- [ ] **Multiplayer – Beitreten:** Zweiter Browser/Inkognito → Link mit `?join=CODE` oder Code eingeben → Beitreten → Redirect zum Spiel.
- [ ] **Live-PvP:** Beide Spieler am gleichen Spiel, Zug von A erscheint bei B ohne Reload.
- [ ] **Rangliste:** Rangliste-Seite und Ranglisten-Sidebar im Spiel (Rangliste / Multiplayer-Tabs) laden.
- [ ] **Neustart:** Im Spiel „Neustart“ klicken → neues Match, gleicher Modus, keine Navigation weg.

---

## 5. Sicherheit & Hinweise

- Keine API-Keys oder Passwörter im Frontend-Code (nur `NEXT_PUBLIC_*` für Supabase URL/Anon).
- RLS in Supabase ist aktiv; Policies erlauben nur die gewünschten Zugriffe (u. a. **games_join_as_player2** für Beitreten per Code).
- Ausführliche Schritte und Troubleshooting: **docs/SUPABASE-NETLIFY-INTEGRATION.md**.

Wenn alle Punkte erledigt sind, kannst du die App als „live“ betrachten und bei Problemen die Integration-Doc oder die typischen Fehler in der Tabelle dort prüfen.
