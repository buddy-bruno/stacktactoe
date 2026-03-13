# StackTacToe: Supabase + Netlify komplett neu einrichten

Anleitung in der richtigen Reihenfolge. Jeden Schritt abhaken, dann den nächsten.

---

## Teil A: Supabase von Null

### Schritt 1: Supabase-Projekt anlegen

1. Gehe zu **[app.supabase.com](https://app.supabase.com)** und melde dich an (oder registriere dich).
2. **New project** klicken.
3. **Organization** wählen (oder eine neue anlegen).
4. **Name:** z. B. `stacktactoe`.
5. **Database Password:** sicheres Passwort setzen und **unbedingt notieren** (für DB-Zugang).
6. **Region:** z. B. Frankfurt oder die dir am nächsten.
7. **Create new project** klicken.
8. Warten, bis das Projekt bereit ist (Status „Active“, grüner Haken).

---

### Schritt 2: Datenbank-Schema ausführen

1. Im Supabase-Dashboard links **SQL Editor** öffnen.
2. **New query** klicken.
3. Im Projekt die Datei **`stacktactoe-database.sql`** (im Repo-Root) öffnen.
4. **Gesamten Inhalt** kopieren und in den SQL Editor einfügen.
5. **Run** (oder Strg+Enter) klicken.
6. Unten sollte **Success** erscheinen.
   - Meldungen wie „relation already exists“ oder „already member of publication“ sind oft unkritisch (Script ist idempotent).
   - Bei echten Fehlern: Fehlermeldung lesen und die betroffene Zeile ggf. auskommentieren oder anpassen.

Damit sind angelegt: Tabellen (`profiles`, `games`, `moves`, `matchmaking_queue`, `daily_scores`, `puzzles`), RLS, Policies, Funktionen (`finish_game`, `join_matchmaking_queue`, `submit_daily_score` usw.) und Trigger (Profil bei neuem User).

---

### Schritt 3: Realtime prüfen

1. Links **Database** → **Replication** (bzw. **Publications**).
2. Prüfen, ob **`games`** (und ggf. **`moves`**) in der Publication **`supabase_realtime`** enthalten sind.
3. Falls nicht: Am Ende von `stacktactoe-database.sql` steht ein Block für Realtime — diesen im SQL Editor ausführen, oder in der Replication-UI die Tabellen manuell zur Publication hinzufügen.

Ohne Realtime funktionieren Live-PvP-Züge nicht.

---

### Schritt 4: API-Keys und URL notieren

1. Links **Project Settings** (Zahnrad) → **API**.
2. Notieren:
   - **Project URL** (z. B. `https://xxxxxxxx.supabase.co`) → das ist **Supabase-URL**.
   - Unter **Project API keys**: **anon** **public** → **Reveal** klicken und den Key kopieren (beginnt mit `eyJ...`) → das ist **Anon-Key**.
3. **(Optional)** Für „Profil löschen“: **service_role** **secret** → **Reveal** und kopieren → **Service-Role-Key**.  
   ⚠️ Diesen Key **niemals** im Frontend oder in öffentlichem Code verwenden — nur in Netlify als Umgebungsvariable.

---

### Schritt 5: Auth — E-Mail-Provider (optional)

1. Links **Authentication** → **Providers** → **Email**.
2. Zum schnellen Testen ohne E-Mail-Verifizierung: **Confirm email** deaktivieren.
3. In Produktion wieder aktivieren und ggf. E-Mail-Templates anpassen.

---

### Schritt 6: Auth-URLs **noch nicht** eintragen

Die **Site URL** und **Redirect URLs** trägst du erst ein, wenn deine Netlify-URL feststeht (siehe Teil C, Schritt 4). Bis dahin reicht Supabase so.

---

## Teil B: Netlify von Null

### Schritt 1: Code auf GitHub (oder GitLab) haben

1. Projekt muss in einem Git-Repo sein.
2. Repo auf GitHub/GitLab pushen:
   ```bash
   git add .
   git commit -m "Ready for deploy"
   git push origin main
   ```
3. Falls noch kein Remote: Auf GitHub „New repository“ anlegen, dann:
   ```bash
   git remote add origin https://github.com/DEIN-USER/DEIN-REPO.git
   git push -u origin main
   ```

---

### Schritt 2: Netlify-Site anlegen

1. Gehe zu **[app.netlify.com](https://app.netlify.com)** und melde dich an.
2. **Add new site** → **Import an existing project**.
3. **GitHub** (oder GitLab) verbinden und Berechtigung erteilen.
4. Dein **StackTacToe-Repo** auswählen.
5. **Build settings** prüfen (werden aus `netlify.toml` gelesen):
   - **Base directory:** `web` (steht in `netlify.toml`).
   - **Build command:** `npm run build`.
   - **Publish directory:** wird von Netlify für Next.js automatisch gesetzt.
6. **Deploy site** noch **nicht** klicken — zuerst Umgebungsvariablen setzen (nächster Schritt).

---

### Schritt 3: Umgebungsvariablen in Netlify setzen

1. Nach dem Import: **Site configuration** (oder **Site settings**) → **Environment variables** → **Add a variable** / **Add variable**.
2. Folgende Variablen anlegen (jeweils **Add variable**):

| Key | Value | Scopes |
|-----|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Deine **Supabase Project URL** aus Teil A, Schritt 4 | All (oder Production) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dein **Supabase anon public** Key aus Teil A, Schritt 4 | All (oder Production) |
| `SUPABASE_SERVICE_ROLE_KEY` | (Optional) Dein **service_role** Key — nur wenn „Profil löschen“ funktionieren soll | All (oder Production) |

3. **Save** / **Create variable**.
4. Bei Änderungen an Env-Variablen später: **Trigger deploy** ausführen, damit der Build die neuen Werte nutzt.

---

### Schritt 4: Ersten Deploy auslösen

1. **Deploys** → **Trigger deploy** → **Deploy site** (oder **Clear cache and deploy site**).
2. Warten, bis der Build durch ist (ca. 1–2 Minuten). Status: **Published**.
3. **Live-URL** notieren (z. B. `https://irgendwas.netlify.app`). Diese URL brauchst du für Supabase Auth.

---

## Teil C: Supabase und Netlify verbinden

### Schritt 1: Supabase — Auth-URLs eintragen

1. Supabase-Dashboard → **Project Settings** → **Authentication** → **URL Configuration**.
2. **Site URL:** deine Netlify-URL, z. B. `https://dein-projekt.netlify.app`.
3. Unter **Redirect URLs** hinzufügen (eine pro Zeile):
   - `https://dein-projekt.netlify.app/**`
   - `http://localhost:3000/**`
4. **Save** klicken.

Ohne diese Einträge funktioniert der Redirect nach Login/Registrierung nicht richtig.

---

### Schritt 2: Kurz testen

1. Live-URL im Browser öffnen.
2. **Startseite:** Modus-Karten (Classic, Daily, Puzzle, Blitz) sichtbar.
3. **Anmelden:** „Anmelden“ → Auth-Seite → Registrieren oder Login → nach Erfolg Zurückleitung.
4. **Spiel:** Classic → Gegen KI → Schwierigkeit wählen → Spiel starten, Züge machen, Runde/Match-Ende prüfen.
5. **Lobby:** Multiplayer → Schnellsuche oder Partie erstellen/beitreten testen.
6. **Rangliste:** Rangliste-Seite lädt.
7. **Profil:** „Mein Profil“ und ggf. „Profil löschen“ (nur wenn `SUPABASE_SERVICE_ROLE_KEY` gesetzt ist).

---

## Checkliste — Reihenfolge

| # | Schritt |
|---|--------|
| A1 | Supabase-Projekt anlegen |
| A2 | `stacktactoe-database.sql` im SQL Editor ausführen |
| A3 | Realtime für `games` (und ggf. `moves`) prüfen |
| A4 | Project URL + anon Key (+ optional service_role) notieren |
| A5 | (Optional) E-Mail-Bestätigung für Tests deaktivieren |
| B1 | Code auf GitHub/GitLab pushen |
| B2 | Netlify-Site aus Repo importieren (Base: `web`) |
| B3 | Env-Variablen setzen (Supabase URL, Anon-Key, optional Service-Role) |
| B4 | Deploy auslösen, Live-URL notieren |
| C1 | In Supabase: Site URL + Redirect URLs auf die Netlify-URL setzen |
| C2 | Im Browser testen (Startseite, Login, Spiel, Lobby, Rangliste, Profil) |

---

## Bei Problemen

- **Build schlägt fehl:** Netlify Build-Log prüfen; lokal `cd web && npm run build` ausführen.
- **Login/Redirect funktioniert nicht:** Supabase Auth → URL Configuration prüfen (Site URL + Redirect URLs mit `/**`).
- **Realtime/PvP-Züge kommen nicht an:** Supabase Database → Replication → `games` in `supabase_realtime`.
- **„Profil löschen“ gibt Fehler:** `SUPABASE_SERVICE_ROLE_KEY` in Netlify gesetzt? Nur server-seitig verwenden.

Weitere Details: **SUPABASE-NETLIFY-INTEGRATION.md**, **PRE-LAUNCH-CHECKLIST.md**.
