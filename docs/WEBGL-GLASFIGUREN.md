# WebGL-Glasfiguren — Machbarkeit

## Kurzantwort

**Ja.** Mit WebGL (z. B. Three.js) lassen sich die Spielfiguren als realistische Glasfiguren darstellen (Transmission, Brechung, Umgebungsreflexion). Das ist technisch gut machbar, bringt aber mehr Aufwand und etwas mehr Last (Bundle, GPU) mit sich.

## Aktueller Stand

- **Figuren:** Reine **SVG**-Darstellung (`PieceSvg.tsx`): Bauer, Dame, König mit Verläufen und Glow.
- **Kein WebGL/Three.js** im Projekt; nur 2D-Canvas in `CaptureFx.tsx` für Partikeleffekte.

## Option A: WebGL mit Three.js („echte“ Glasfiguren)

### Was nötig ist

1. **Three.js** (und ggf. `@react-three/fiber` + `@react-three/drei`)
   - `MeshPhysicalMaterial` mit `transmission: 1`, `thickness`, `roughness`, `envMap` für Glaseffekt.
2. **3D-Geometrie** pro Figur
   - Entweder einfache Primitives (Zylinder + Kugel für Bauer, etc.) oder echte 3D-Modelle (GLTF).
3. **Integration ins UI**
   - Pro Figur ein kleines Canvas mit eigenem Renderer, **oder**
   - Eine gemeinsame Three.js-Szene, in der alle Figuren liegen und die nur die Figuren rendert (z. B. als Layer hinter dem Brett).

### Vorteile

- Echte Lichtbrechung, Transparenz, Reflexion.
- Sehr überzeugender „Glas“-Look, wenn Material und Umgebung (z. B. envMap) stimmen.

### Nachteile

- Größerer Bundle (Three.js ~150–200 kB gzipped).
- Mehr Code und Wartung (Resize, Disposal, Integration in React).
- Auf schwachen Geräten viele Figuren + Glas-Shader können die FPS belasten.

---

## Option B: „Glas“-Look mit SVG/CSS (ohne WebGL)

- Stärkere Highlights, weichere Verläufe, leichte „Frosted“-Effekte (z. B. `feGaussianBlur` + Maske).
- Kein neues Framework, geringes Risiko, gut auf allen Geräten.
- Wirkt eher wie „gläsern angedeutet“ als wie physikalisch echtes Glas.

---

## Empfehlung

- **Schnell und stabil:** Option B (SVG/CSS) für einen glasartigen Look ohne WebGL.
- **Maximaler Look:** Option A (Three.js) für echte Glasfiguren; sinnvoll als optionales Feature (z. B. „High-Quality-Pieces“-Toggle) oder für eine spätere Version.

Eine minimale **Proof-of-Concept-Komponente** mit Three.js und einem Glas-Material liegt unter `web/src/components/game/PieceGlassPoc.tsx` und kann bei Bedarf in die bestehende Figuren-Darstellung integriert oder erweitert werden.
