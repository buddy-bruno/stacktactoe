# StackTacToe online stellen — Schritt für Schritt

Eine Anleitung in der richtigen Reihenfolge. Jeden Schritt abhaken, dann den nächsten machen.

---

## Schritt 1: Lokal prüfen

Im Projektordner (dort, wo `web/` und `stacktactoe-database.sql` liegen):

```bash
cd web
npm install
npm run build
npm run lint
```

- **Build** und **Lint** müssen ohne Fehler durchlaufen.
- Wenn etwas rot ist: Fehlermeldung lesen und beheben, dann hier nochmal starten.

---

## Schritt 2: Supabase-Projekt anlegen (falls noch nicht geschehen)

1. Gehe zu **[app.supabase.com](https://app.supabase.com)** und melde dich an.
2. **New project** → Organisation/Projekt wählen, Name z. B. „stacktactoe“, Region wählen, Passwort setzen → **Create**.
3. Warten, bis das Projekt fertig ist (grüner Haken).

---

## Schritt 3: Datenbank-Schema in Supabase ausführen

**Hinweis:** Das aktuelle Schema (`stacktactoe-database.sql`) reicht für alle Features (Classic, Schach, Blitz, PvP, Daily, Puzzle, Räume, Turniere). Spielmodus (classic/schach/blitz) wird über URL und in `state_json` abgebildet — **keine zusätzlichen Spalten nötig**.

1. Im Supabase-Dashboard links **SQL Editor** öffnen.
2. **New query** klicken.
3. Die Datei **`stacktactoe-database.sql`** (im Root deines Projekts) in einem Editor öffnen und **kompletten Inhalt** kopieren.
4. In den SQL Editor einfügen und **Run** (oder Strg+Enter) klicken.
5. Unten sollte „Success“ stehen. Wenn einzelne Zeilen Fehler machen (z. B. „already exists“), ist das oft okay — das Script ist idempotent. Bei echten Fehlern: Meldung lesen und ggf. die eine Zeile anpassen oder auskommentieren.

---

## Schritt 4: Supabase — Realtime prüfen

1. Im Supabase-Dashboard links **Database** → **Replication** (oder **Publications**).
2. Prüfen, ob die Tabelle **`games`** (und ggf. **`moves`**) in der Publication **`supabase_realtime`** enthalten ist.
3. Falls nicht: In der SQL-Datei steht am Ende ein Block, der die Tabellen hinzufügt — diesen erneut ausführen oder in der Replication-UI manuell aktivieren.

---

## Schritt 5: Supabase — URL und Anon-Key notieren

1. Im Supabase-Dashboard links **Project Settings** (Zahnrad) → **API**.
2. Notieren:
   - **Project URL** (z. B. `https://xxxxxxxx.supabase.co`) → das ist dein **Supabase-URL**.
   - Unter **Project API keys**: **anon** **public** → **Reveal** klicken und den langen Key (beginnt mit `eyJ...`) kopieren → das ist dein **Anon-Key**.

Du brauchst beide Werte gleich für Netlify.

---

## Schritt 6: Code auf GitHub (oder GitLab) pushen

1. Dein Projekt muss in einem Git-Repo sein und auf GitHub/GitLab liegen.
2. Alle Änderungen committen und pushen:
   ```bash
   git add .
   git commit -m "Ready for deploy"
   git push origin main
   ```
3. Wenn du noch kein Remote-Repo hast: Auf GitHub „New repository“ anlegen, dann `git remote add origin https://github.com/DEIN-USER/DEIN-REPO.git` und pushen.

---

## Schritt 7: Netlify mit dem Repo verbinden

1. Gehe zu **[app.netlify.com](https://app.netlify.com)** und melde dich an.
2. **Add new site** → **Import an existing project**.
3. **GitHub** (oder GitLab) verbinden und Berechtigung geben.
4. Dein **StackTacToe-Repo** auswählen.
5. **Build settings** prüfen:
   - **Base directory:** leer lassen (die `netlify.toml` im Repo setzt bereits `base = "web"`).
   - **Build command:** wird aus der `netlify.toml` gelesen (`npm run build`).
   - **Publish directory:** wird von Netlify für Next.js automatisch gesetzt.
6. **Deploy site** noch nicht klicken — zuerst die Umgebungsvariablen setzen (Schritt 8).

---

## Schritt 8: Netlify — Umgebungsvariablen setzen

1. Nach dem Import: **Site configuration** (oder **Project configuration**) → **Environment variables**.
2. **Add a variable** / **Add variable** → **Import from .env** oder einzeln:
   - **Key:** `NEXT_PUBLIC_SUPABASE_URL`  
     **Value:** deine Supabase **Project URL** aus Schritt 5.
   - **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
     **Value:** dein Supabase **anon public** Key aus Schritt 5.
3. Scope: **All** oder **Production**.
4. Speichern (**Save** / **Create variable**).

---

## Schritt 9: Ersten Deploy starten

1. In Netlify: **Deploys** → **Trigger deploy** → **Deploy site** (oder **Clear cache and deploy site**).
2. Warten, bis der Build durch ist (meist 1–2 Minuten). Status sollte **Published** sein.
3. Deine Live-URL siehst du oben (z. B. `https://dein-projekt.netlify.app`). Diese URL brauchst du für Schritt 10.

---

## Schritt 10: Supabase — Auth-URLs für die Live-Seite eintragen

1. Zurück zu **Supabase** → **Project Settings** → **Authentication** → **URL Configuration**.
2. **Site URL** auf deine Netlify-URL setzen, z. B. `https://dein-projekt.netlify.app`.
3. Unter **Redirect URLs** hinzufügen:
   - `https://dein-projekt.netlify.app/**`
   - `http://localhost:3000/**`
4. **Save** klicken.

Ohne diesen Schritt funktioniert der Login nach der Anmeldung oft nicht (Redirect-Fehler).

---

## Schritt 11: Kurz testen

1. Live-URL im Browser öffnen.
2. **Startseite:** Sollte laden, Modus-Karten (Classic, Daily, Puzzle, Blitz) sichtbar.
3. **Anmelden:** Über „Anmelden“ zur Auth-Seite → Registrieren oder Login → nach Erfolg Zurückleitung zur App.
4. **Spiel:** Classic wählen → Gegen KI → Schwierigkeit wählen → Spiel starten, ein paar Züge machen, Runde/Match-Ende prüfen.
5. **Rangliste:** Link „Rangliste“ sollte die Ranglisten-Seite laden.

Wenn das klappt, ist die Basis live. PvP, Daily und Puzzle kannst du danach genauso durchklicken.

---

## Übersicht — Reihenfolge

| Schritt | Was |
|--------|-----|
| 1 | Lokal: `npm run build` + `npm run lint` |
| 2 | Supabase-Projekt anlegen |
| 3 | `stacktactoe-database.sql` im Supabase SQL Editor ausführen |
| 4 | Realtime für `games` prüfen |
| 5 | Supabase Project URL + anon Key notieren |
| 6 | Code auf GitHub/GitLab pushen |
| 7 | Netlify: Repo verbinden, Build-Einstellungen prüfen |
| 8 | Netlify: `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` setzen |
| 9 | Netlify: Deploy auslösen, Live-URL notieren |
| 10 | Supabase: Auth Site URL + Redirect URLs auf die Live-URL setzen |
| 11 | Im Browser testen (Startseite, Login, Spiel, Rangliste) |

Bei Problemen: **docs/SUPABASE-NETLIFY-INTEGRATION.md** und **docs/PRE-LAUNCH-CHECKLIST.md** für Details und Troubleshooting.
