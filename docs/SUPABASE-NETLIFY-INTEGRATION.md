# StackTacToe: Supabase + Netlify — Integration

So bringst du das Spiel mit deiner **Supabase**-Datenbank und **Netlify**-Seite zusammen. Danach funktionieren: Anmelden, Rangliste, **Einladen per Code**, **Beitreten**, **Live-PvP** (Züge sofort beim Gegner).

---

## Übersicht (kurz)

| Wo | Was du machst |
|----|----------------|
| **Supabase** | 1) SQL-Schema ausführen. 2) Realtime für `games` aktivieren. 3) Auth-URLs für Netlify eintragen. |
| **Netlify** | Env-Variablen setzen (Supabase URL + Anon-Key), neu deployen. |

**Wichtig:** Nur den **anon public**-Key verwenden (im Browser). Den **service_role**-Key nie im Frontend eintragen.

---

## Schritt 1: Supabase — Datenbank einrichten

1. Öffne **Supabase Dashboard** → dein Projekt **stacktactoe**.
2. Gehe zu **SQL Editor** → **New query**.
3. Öffne im Projekt die Datei **`stacktactoe-database.sql`** (im Root des Repos).
4. **Gesamten Inhalt** der Datei kopieren und im SQL Editor einfügen.
5. **Run** ausführen.

Damit werden angelegt bzw. angepasst:

- Tabellen: **profiles**, **games**, **moves**, **matchmaking_queue**, **daily_scores**, **puzzles**
- RLS (Row Level Security) und Policies (inkl. **games_join_as_player2**, damit „Beitreten per Code“ funktioniert)
- Funktionen: **finish_game**, **join_matchmaking_queue**, **leave_matchmaking_queue**, **submit_daily_score**
- Trigger: neuer User → Profil wird automatisch erstellt

**Falls beim ersten Lauf Fehler auftreten** (z. B. „relation already exists“): Einige Befehle sind mit `if not exists` abgesichert. Einzelne Fehlerzeilen kannst du ignorieren oder die betroffene Zeile auskommentieren und erneut ausführen.

**Realtime:** Am Ende der SQL-Datei stehen Zeilen wie:

```sql
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.moves;
```

Falls du hier eine Meldung wie „already member of publication“ bekommst, ist alles in Ordnung. Sonst in Supabase: **Database → Replication** prüfen, ob **games** (und ggf. **moves**) für **Supabase Realtime** aktiviert sind.

---

## Schritt 2: Supabase — Auth-URLs für Netlify

Damit Anmelden und Redirect nach dem Login auf deiner Netlify-Seite funktionieren:

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL** setzen auf:  
   `https://stacktactoe.netlify.app`
3. Unter **Redirect URLs** eintragen (eine Zeile pro URL):
   - `https://stacktactoe.netlify.app/**`
   - `http://localhost:3000/**` (zum lokalen Testen)

Speichern. Ohne diese Einträge landen Nutzer nach dem Login ggf. auf einer Supabase-Domain statt auf deiner App.

---

## Schritt 3: Netlify — Umgebungsvariablen

Die App braucht im Browser nur die **öffentlichen** Supabase-Werte (URL + anon key).

1. Netlify → Projekt **stacktactoe** → **Build & deploy** → **Environment variables** (oder **Site configuration** → **Environment variables**).
2. **Add a variable** (oder **Add single variable** / **Add from .env**).

Diese beiden Variablen anlegen:

| Name | Wert | Scopes |
|------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Deine Supabase-URL, z. B. `https://ihhxipwzazrcwqynhlmq.supabase.co` | Alle (Build + Deploy + Post-processing) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Der **anon public**-Key aus Supabase (Settings → API Keys) | Alle |

- **Key** aus Supabase: **Settings** → **API** → unter „Project API keys“ den **anon**-Key kopieren („Reveal“ falls nötig). Nicht den **service_role** verwenden.
- Nach dem Speichern: **Trigger deploy** (oder einen neuen Deploy auslösen), damit die neue Umgebung aktiv wird.

---

## Schritt 4: (Optional) E-Mail-Bestätigung ausschalten

Zum schnellen Testen ohne E-Mail-Verifizierung:

1. Supabase → **Authentication** → **Providers** → **Email**.
2. **Confirm email** ausschalten (Disable).
3. Speichern.

In Produktion kannst du es wieder aktivieren und z. B. eigene E-Mail-Templates einrichten.

---

## Was danach funktioniert

- **Anmelden / Registrieren**  
  Nutzer können sich auf `https://stacktactoe.netlify.app/auth` anmelden und werden nach dem Login auf deine App (oder den gewünschten Redirect) geleitet.

- **Rangliste & Profil**  
  Punkte (KI, Multiplayer, Daily) und Rangliste kommen aus Supabase; Profil-Seite nutzt Auth.

- **Einladen per Code**  
  1. Spieler A: Lobby → **Spiel erstellen** → erhält einen 6-stelligen Code (und Link).  
  2. Spieler B: Lobby → **Partie beitreten** → Code eingeben (oder Link öffnen mit `?join=CODE`).  
  3. Spieler B wird in **games** als **player2_id** eingetragen, **status** wird auf **active** gesetzt, Redirect zu `/game?mode=pvp&id=...`.

- **Live-Spielfluss (PvP)**  
  - Jeder Zug wird in **games** (Spalte **state_json**) und in **moves** gespeichert.  
  - Die App abonniert **Realtime** auf **games** (Filter `id = gameId`).  
  - Bei **UPDATE** von **games** erhält der Gegner den neuen Zustand und das Brett wird aktualisiert.  
  - Rundenende / Match-Ende: **finish_game** wird aufgerufen, Punkte und Elo (bei Ranked) werden in **profiles** geschrieben.

- **Schnell-Suche (Matchmaking)**  
  **Casual** / **Ranked** rufen `join_matchmaking_queue` auf. Wenn ein Gegner in der Queue ist, wird ein neues **games**-Spiel erstellt und beide werden zu `/game?mode=pvp&id=...` weitergeleitet.

---

## Checkliste vor dem Go-Live

- [ ] **stacktactoe-database.sql** im Supabase SQL Editor einmal vollständig ausgeführt.
- [ ] Realtime für **games** (und ggf. **moves**) aktiv (Database → Replication oder per SQL).
- [ ] **Site URL** und **Redirect URLs** in Supabase Auth auf `https://stacktactoe.netlify.app` gesetzt.
- [ ] In Netlify **NEXT_PUBLIC_SUPABASE_URL** und **NEXT_PUBLIC_SUPABASE_ANON_KEY** gesetzt und ein Deploy danach ausgelöst.
- [ ] Kein **service_role**-Key im Frontend oder in Netlify-Env-Variablen für die App verwendet.

---

## Konkreter Test-Ablauf (Einladen + Live-PvP)

So prüfst du mit zwei Browsern (oder einem normalen + einem Inkognito-Fenster), ob Einladen und Live-Spiel laufen.

### Voraussetzung

- Beide Nutzer sind angemeldet (z. B. zwei Accounts oder ein Account in normalem Fenster, ein anderer in Inkognito).
- App läuft auf Netlify (`https://stacktactoe.netlify.app`) oder lokal (`http://localhost:3000`).

### 1. Spiel erstellen (Spieler A)

1. **Spieler A** öffnet die App → **Multiplayer** (oder direkt `/lobby`).
2. Unter **Neue Partie erstellen** auf **Spiel erstellen** klicken.
3. Es erscheinen ein **6-stelliger Code** (z. B. `XY7K2M`) und der Hinweis, den Link zu teilen.
4. **Link kopieren** wählen (Link sieht z. B. so aus: `https://stacktactoe.netlify.app/lobby?join=XY7K2M`).
5. Optional: **Zum Spiel** klicken – Spieler A ist schon im Spiel und wartet auf den Gegner.

### 2. Beitreten (Spieler B)

1. **Spieler B** öffnet den kopierten Link (oder geht auf `/lobby` und gibt den Code unter **Partie beitreten** ein).
2. Wenn der Link mit `?join=CODE` geöffnet wurde, ist das Code-Feld schon ausgefüllt.
3. Auf **Beitreten** klicken.
4. Spieler B wird zu **Spiel** weitergeleitet (`/game?mode=pvp&id=...`). Wenn Spieler A schon auf der Spielseite war, siehst du jetzt beide am gleichen Match.

### 3. Live-Züge prüfen

1. **Spieler A** setzt eine Figur (z. B. Bauer auf ein Feld).
2. **Spieler B** sollte **ohne Reload** sehen, dass das Brett sich ändert (neue Figur sichtbar, Zug wechselt zu „Du bist am Zug“ oder „Gegner ist am Zug“).
3. **Spieler B** macht einen Zug.
4. **Spieler A** sieht die Änderung ebenfalls sofort.

Wenn die Züge sofort beim anderen ankommen, funktioniert **Realtime** und der Live-Spielfluss.

### 4. Typische Fehler

| Problem | Mögliche Ursache | Lösung |
|--------|-------------------|--------|
| „Code nicht gefunden“ | Spiel nicht `waiting` oder Code falsch | Code exakt eingeben; Spieler A hat das Spiel nicht abgebrochen. |
| „Beitreten fehlgeschlagen“ | RLS blockiert (alte DB) | SQL mit Policy **games_join_as_player2** erneut ausführen (siehe `stacktactoe-database.sql`). |
| Gegner sieht Züge nicht | Realtime nicht aktiv | Supabase → Database → Replication: **games** für Realtime aktivieren. |
| Redirect nach Login falsch | Auth-URLs falsch | Supabase Auth → URL Configuration: Site URL + Redirect URLs auf deine Netlify-URL setzen. |

Wenn beim Test eine Fehlermeldung im Browser oder in der Supabase-Log (z. B. unter Logs oder Realtime) erscheint, die Meldung notieren – dann können wir gezielt danach suchen.
