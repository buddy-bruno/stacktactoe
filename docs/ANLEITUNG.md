# Was ist erledigt — was musst du tun?

Alles, was im Code und in der Konfiguration umsetzbar war, **ist umgesetzt**. Unten steht nur noch, was du selbst tun musst (Browser, Supabase-Keys).

---

## Bereits umgesetzt

- **Web-App:** Flow (Root → Classic/Puzzle/Blitz → Gegen KI oder PvP → Spiel/Lobby), Ranglisten (Elo, PvP, KI-Stats), Design-Tokens, Lobby, Realtime.
- **Design:** globals.css als Single Source of Truth, DESIGN.md mit Token- und Komponenten-Übersicht, DESIGN_UMSETZUNG.md.
- **Doku:** README, ANLEITUNG, PRE-LAUNCH-CHECKLIST, SUPABASE-NETLIFY-INTEGRATION, .env.example.
- **Build:** Netlify-Konfiguration im Repo-Root; `npm run build` in `web/` läuft.

---

## Nur du kannst (Browser, Keys)

| Schritt | Wo | Was genau |
|--------|-----|-----------|
| **Web im Browser öffnen** | Lokal | Im Terminal `cd web` → `npm run dev`. Im Browser **http://localhost:3000** aufrufen. |
| **Supabase-Keys eintragen** | `web/.env.local` | Datei anlegen (Kopie von `web/.env.example`), `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` mit den Werten aus dem Supabase-Projekt ersetzen. |
| **Supabase-Datenbank anlegen** | Supabase Dashboard | Im SQL Editor den Inhalt von **stacktactoe-database.sql** einfügen und ausführen (einmalig pro Projekt). |
| **Netlify (Live-Deploy)** | Netlify Dashboard | Repo verbinden, Env-Variablen setzen (siehe `web/NETLIFY.md`), ggf. Trigger deploy. |

---

## Wenn du später etwas änderst

- **Farben:** Nur in **web/src/app/globals.css** unter `:root` die `--game-*`-Werte anpassen.
- **Neue Seiten/Flows:** Unter **web/src/app/** neue `page.tsx` anlegen und verlinken.
