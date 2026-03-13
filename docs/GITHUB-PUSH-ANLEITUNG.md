# Projekt auf GitHub bringen (für Netlify)

Das Projekt liegt noch nur lokal. So kommt es auf GitHub:

---

## 1. Eingebettetes Git in `web/` entfernen

Im Projekt-Root (Ordner `stacktactoe`, in dem `web/` und `netlify.toml` liegen):

```bash
cd /Users/goalhunter/Downloads/stacktactoe
rm -rf web/.git
```

(Danach ist `web` nur noch ein normales Verzeichnis, kein eigenes Repo.)

---

## 2. Alles stagen und committen

```bash
git add .
git status
```

Prüfen: Es sollten alle Dateien inkl. Inhalt von `web/` stehen (kein Eintrag mehr wie "web" als Submodule).

```bash
git branch -m main
git commit -m "Initial commit: StackTacToe ready for deploy"
```

---

## 3. Repo auf GitHub anlegen

1. Gehe zu **[github.com/new](https://github.com/new)** (eingeloggt als der Account, den du in Netlify verbunden hast, z. B. buddy-bruno).
2. **Repository name:** z. B. `stacktactoe`.
3. **Public** wählen.
4. **Keine** README, .gitignore oder License hinzufügen (existiert schon lokal).
5. **Create repository** klicken.

---

## 4. Remote hinzufügen und pushen

GitHub zeigt dir Befehle an. Verwende (ersetz `DEIN-USER` durch deinen GitHub-Namen):

```bash
git remote add origin https://github.com/DEIN-USER/stacktactoe.git
git push -u origin main
```

Falls dein lokaler Branch noch `master` heißt:

```bash
git push -u origin main
```

oder zuerst umbenennen: `git branch -m main` (siehe Schritt 2).

---

## 5. In Netlify fortfahren

Sobald der Push durch ist: In Netlify **„Select repository“** aktualisieren (z. B. Seite neu laden) – dein Repo `stacktactoe` sollte erscheinen. Auswählen und mit den Build-Einstellungen weitermachen (Base: `web`, dann Env-Variablen setzen).
