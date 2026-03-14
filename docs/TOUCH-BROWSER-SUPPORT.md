# Touch & Pointer – Browser- und Endgeräte-Kompatibilität

## Umgesetzt im Spielbrett (GameBoard)

### Moderne Browser (Pointer Events)

- **Pointer Events API**: Einheitlich für Finger, Stift und Maus. Genutzt in Chrome, Safari, Firefox, Edge, **iOS Safari 13+**, **Chrome Android**, **Samsung Internet**.
- **pointerId**: Beim Ziehen wird die Pointer-ID gespeichert; Move/Up nur für diesen Pointer → Multi-Touch-stabil.
- **setPointerCapture(pointerId)**: Ziehen bleibt erhalten, auch wenn der Finger über andere Elemente gleitet (try/catch für alte Browser).
- **touch-action: none** am `body` während des Zugs: verhindert Scroll/Zoom beim Ziehen.
- **pointercancel**: wie `pointerup` behandelt.

### Ältere Browser (Touch- und Mouse-Fallback)

- **Erkennung**: `useLayoutEffect` prüft `typeof window.PointerEvent === 'function'`. Wenn **nicht** unterstützt (z. B. **iOS Safari 9–12**, **ältere Android-WebViews**, **älterer Edge**), wird der Fallback aktiv.
- **Touch**: `touchstart` → Drag starten mit `touches[0].identifier` als pointerId; `touchmove` (passive: false, preventDefault) → Position aktualisieren; `touchend`/`touchcancel` → Zug abschließen.
- **Maus**: `mousedown` → Drag mit pointerId 0; `mousemove`/`mouseup` am Fenster.
- Dieselbe Drag-Logik (handlePointerMove, handlePointerUp) wird mit synthetischen Events { clientX, clientY, pointerId } gefüttert.

### CSS für alle Geräte

- **touch-action: manipulation**: Auf Brett und Dock → kein 300‑ms-Tap-Delay, kein Doppel-Tap-Zoom auf den Flächen.
- **-webkit-tap-highlight-color: transparent**: Kein grauer Tap-Fleck unter dem Finger (iOS/Safari, Android Chrome).
- **-webkit-touch-callout: none** und **user-select: none** auf Zellen/Dock: Kein Halten-Menü / Textauswahl beim Langdruck.

### Viewport & Meta (layout.tsx)

- **width: device-width**, **initialScale: 1**, **viewportFit: cover** → Darstellung und Safe Area (iOS/Android, Notch, Gestenleiste).
- **interactiveWidget: resizes-content** → Android (Xiaomi/Redmi, Chrome): Viewport passt sich bei Tastatur an, kein Springen.
- **applicationName** → „Zum Startbildschirm hinzufügen“ (Android/MIUI) zeigt den App-Namen.

## Unterstützung (Überblick)

| Umgebung              | Pointer Events | Fallback (Touch/Mouse) | Drag & Drop |
|-----------------------|----------------|-------------------------|-------------|
| iOS Safari 13+        | ✅             | –                       | ✅          |
| iOS Safari 9–12       | ❌             | ✅ Touch                | ✅          |
| Chrome Android (aktuell) | ✅         | –                       | ✅          |
| Ältere Android-WebView   | ggf. ❌     | ✅ Touch                | ✅          |
| Edge (Chromium)       | ✅             | –                       | ✅          |
| Edge (Legacy)         | ❌             | ✅ Mouse                | ✅          |
| Safari macOS          | ✅             | –                       | ✅          |
| Firefox, Chrome Desktop | ✅          | –                       | ✅          |
| **Xiaomi / Redmi** (MIUI, Chrome) | ✅   | – (Fallback bei alter WebView) | ✅   |
| **Redmi Note / Xiaomi 15** etc.    | ✅   | –                       | ✅          |

### Zusätzlich für Android / Xiaomi / Redmi

- **overscroll-behavior-y: contain** (html/body): Verhindert, dass vertikales Überstreichen den Browser-Pull-to-Refresh auslöst (wichtig beim Ziehen am oberen Rand).
- **-webkit-overflow-scrolling: touch**: Flüssigeres Scrollen in Scrollbereichen (iOS/Android).
- **mobile-dock** und alle Dock-Slots: **touch-action: manipulation**, **overscroll-behavior: none**, kein Tap-Highlight → Ziehen aus der unteren Leiste ohne versehentliches Scrollen oder Refresh.

Damit sind **neue und ältere** Endgeräte und Browser (iOS, Android, **Xiaomi/Redmi 15**, Edge, Safari, Chrome, Firefox) abgedeckt; Drag & Drop mit Finger und Maus funktioniert in beiden Modi.
