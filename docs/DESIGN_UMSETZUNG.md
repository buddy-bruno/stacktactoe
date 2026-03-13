# Design-Umsetzung — Web

Referenz für das visuelle Design der StackTacToe-Web-App.

## Single Source of Truth

| Was | Wo |
|-----|-----|
| **Farben & Tokens** | [web/src/app/globals.css](../web/src/app/globals.css) — CSS Custom Properties (`--game-*`). |
| **Dokumentation** | [web/DESIGN.md](../web/DESIGN.md) — Token-Übersicht, Komponenten-Checkliste. |

**Prinzip:** Keine Hex-/rgba-Werte in Komponenten; nur Token-Klassen oder `var(--game-*)` / `getComputedStyle`.

## Web: Design-System

- **Tokens:** Hintergrund, Flächen, Text, Spieler (Primary/Secondary), Brett, Figuren, Radii, Schatten, Logo-Glow, Bg-Glow, Shadow-Drop, Piece-Line.
- **Komponenten:** Siehe „Wo die Tokens verwendet werden“ in [web/DESIGN.md](../web/DESIGN.md).
- **Änderungen:** Neue Werte nur in `globals.css` anlegen; Komponenten referenzieren weiterhin Tokens.
