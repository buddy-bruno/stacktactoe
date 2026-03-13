# Design System — Stack Tac Toe

Einheitliches, token-basiertes Design für die App. Alle UI-Farben, Typografie und Abstände kommen aus zentralen Design Tokens (CSS Custom Properties). **Neue UI nur mit Token-Klassen umsetzen; keine neuen Hex-Werte in Komponenten.**

## Tokens (CSS Custom Properties)

Definiert in `src/app/globals.css` unter `:root`.

### Hintergrund & Flächen

| Variable | Verwendung |
|----------|------------|
| `--game-bg` | Seiten-Hintergrund |
| `--game-bg-subtle` | Tabs, Modals, dunklere Flächen |
| `--game-surface` | Karten, Header, Dock |
| `--game-surface-hover` | Hover-Zustand von Flächen |
| `--game-border` | Rahmen (Karten, Zellen, Buttons) |
| `--game-border-accent` | Hervorgehobener Rahmen (z. B. Primary) |

### Typografie

| Variable | Verwendung |
|----------|------------|
| `--game-text` | Haupttext |
| `--game-text-muted` | Beschreibungen, Sekundärtext |
| `--game-text-inverse` | Text auf Primary (z. B. Buttons) |

### Semantik / Spieler

| Variable | Verwendung |
|----------|------------|
| `--game-primary` | Spieler 1 / „Du“, Hauptaktionen (Sky) |
| `--game-secondary` | Spieler 2 / KI / Gegner (Orange) |
| `--game-accent` | Highlight, Daily, Punkte (Gelb) |
| `--game-success` | Erfolg, gültiger Zug (Grün) |
| `--game-danger` | Fehler, Blitz-Warnung (Rot) |
| `--game-warning` | Warnung (Gelb) |

### Moden (Startseiten-Karten)

| Variable | Verwendung |
|----------|------------|
| `--game-mode-ai` | Karte „Gegen KI“ |
| `--game-mode-pvp` | Karte „PvP“ |
| `--game-mode-daily` | Karte „Daily Challenge“ |
| `--game-mode-puzzle` | Karte „Puzzle“ |
| `--game-mode-blitz` | Karte „Blitz“ |

### Spielbrett

| Variable | Verwendung |
|----------|------------|
| `--game-board-bg` | Verlauf des 3D-Bretts |
| `--game-board-border` | Brett-Rand |
| `--game-board-shadow` | Schatten des Bretts |

### Figuren (SVG)

| Variable | Verwendung |
|----------|------------|
| `--game-piece-human-*` | hi, mid, lo, dk, acc, gem, sh (Spieler 1) |
| `--game-piece-ai-*` | hi, mid, lo, dk, acc, gem, sh (Spieler 2/KI) |

### Radii & Schatten

| Variable | Verwendung |
|----------|------------|
| `--game-radius-card` | Ecken Karten |
| `--game-radius-button` | Ecken Buttons |
| `--game-shadow-card` | Schatten Karten |
| `--game-shadow-board` | Schatten Brett |
| `--game-shadow-drop` | Drop-Shadow beim Drag (Brett) |
| `--game-logo-glow` | Text-Shadow für „Tac“ im Logo |
| `--game-bg-glow-primary` / `--game-bg-glow-secondary` | Hintergrund-Gradienten (Startseite) |
| `--game-piece-line` | Striche in Figuren-SVG (z. B. König-Klinge) |

## Tailwind-Klassen

Die Tokens sind ins Theme eingebunden. Nutzung z. B.:

- **Hintergrund:** `bg-game-bg`, `bg-game-surface`, `bg-game-primary/20`
- **Text:** `text-game-text`, `text-game-text-muted`, `text-game-primary`
- **Rahmen:** `border-game-border`, `border-game-primary/30`
- **Schrift:** `font-display` (Orbitron), `font-body` (Rajdhani)

## Komponenten

- **PageShell** — Wrapper für alle App-Seiten (Hintergrund, Container).
- **AppHeader** — Logo „StackTacToe“, Zurück-Link, optionale Aktionen (Rangliste, Anmelden).
- **ModeCard** — Startseiten-Karte pro Modus (Icon + Farben aus Tokens).

## Layout-Konsistenz (Header, Main, Karten)

- **Abstände:** PageShell nutzt `gap-6` zwischen Header und Main. Inhalts-Wrapper: `max-w-2xl mx-auto w-full flex flex-col gap-6`.
- **Header:** Jede Seite zeigt AppHeader (Startseite ohne Zurück, alle anderen mit `backHref`). Auth-Seite ebenfalls mit Header und Zurück.
- **Karten:** Einheitlich `bg-game-surface border-game-border`; wo sinnvoll `backdrop-blur-xl`. Hervorgehobene Karten (z. B. Lobby/Daily) optional `border-game-accent/20`. Klickbare Karten: `hover:border-game-* transition-all cursor-pointer`.
- **Kein globaler Footer:** Es gibt keine App-weite Footer-Komponente; Platzierung unten über PageShell `pb-16 sm:pb-20`.

## Prinzipien

- **Single Source of Truth:** Farben und zentrale Werte nur in `globals.css` anpassen.
- **Konsistenz:** Gleiche Bedeutung = gleicher Token (z. B. Spieler 1 immer `--game-primary`).
- **Keine Hardcodes:** Keine neuen Hex- oder rgba-Werte in TSX/JSX; nur Token-Klassen oder `var(--game-*)` bzw. `getComputedStyle`/`getGlobalToken` wo nötig (z. B. SVG/Canvas).

## Wo die Tokens verwendet werden

| Komponente | Tokens |
|------------|--------|
| PageShell | `--game-bg`, `--game-text`, `--game-bg-glow-primary`, `--game-bg-glow-secondary` |
| AppHeader | `--game-surface`, `--game-border`, `--game-text`, `--game-primary`, `--game-logo-glow` |
| ModeCard | `--game-surface`, `--game-border`, `--game-mode-*` (ai/pvp/puzzle/blitz/classic) |
| GameBoard | `--game-board-*`, `--game-shadow-drop`, `--game-success` |
| PieceSvg | `--game-piece-human-*`, `--game-piece-ai-*`, `--game-piece-line` (über getPieceColors / getGlobalToken) |
| Cards / Buttons | `--game-surface`, `--game-border`, `--game-primary`, `--game-text`, etc. |

Optional: Hellmodus über `.light` oder `prefers-color-scheme: light` mit denselben Variablennamen und anderen Werten.
