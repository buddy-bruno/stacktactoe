# Netlify: Supabase-Variablen eintragen

Die **Build-Konfiguration** (Base directory `web`, Next.js-Plugin) liegt im **Repo-Root**: `netlify.toml`. In Netlify musst du nur die Variablen setzen.

Ohne die zwei Variablen unten funktionieren **Login, PvP und Rangliste** auf der Live-Seite nicht.

---

## Wo eintragen?

1. **Netlify** öffnen und dein Projekt **heystacktactoe** auswählen.
2. **Linke Seitenleiste** → auf **„Site configuration“** oder **„Project configuration“** klicken.
3. Im Untermenü **„Environment variables“** anklicken.
4. Auf **„Add a variable“** / **„Add variable“** klicken.

Dort trägst du die zwei Variablen ein (einzeln hinzufügen).

---

## Was eintragen?

| Name (Key) | Wert (Value) |
|------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | deine Supabase-URL, z. B. `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dein Supabase anon Key, z. B. `eyJhbGci...` (langer Token) |

- **Scope:** „All“ oder „Production“ reicht.
- Beide als **„Secret“** speichern ist ok, die Werte sind nur für die App sichtbar.

---

## Woher die Werte?

1. **Supabase** öffnen: [app.supabase.com](https://app.supabase.com)
2. Dein **Projekt** auswählen.
3. Links **„Project Settings“** (Zahnrad) → **„API“**.
4. Dort stehen:
   - **Project URL** → das ist `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (unter Project API keys) → das ist `NEXT_PUBLIC_SUPABASE_ANON_KEY` („Reveal“ klicken und kopieren)

---

## Danach

- **„Save“** in Netlify klicken.
- Einmal **„Trigger deploy“** (unter Deploys) ausführen, damit der nächste Build die neuen Variablen nutzt.

Fertig.
