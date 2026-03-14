# Layout: Reflexion & Struktur-Optimierung

## 1. Aktuelles Layout (Reflexion)

### Page-Ebene (`game/page.tsx`)
```
Root (fixed/static)
├── CaptureFx
├── Header (fixed)
└── Content (max-w, pt header, flex-1 min-h-0)
    └── div (flex-1, items-center, pb dock)     ← Ebene A
        └── main (flex-1 min-h-0, pt gap)      ← Ebene B
            └── game-nav-header (Rahmen, flex-1 min-h-0)
                ├── Mobile-Billboard (lg:hidden)  Du | Runde | KI
                └── div (flex-1 min-h-0)         ← nur Wrapper für GameBoard
                    └── GameBoard
```

### GameBoard-Ebene
```
Fragment
├── div (flex-1 min-h-0 lg:flex-initial)        ← Äußerer Container
│   ├── [optional] Billboard (leftColumn/centerTop/rightColumn)
│   ├── div (flex-1 min-h-0, lg:overflow-hidden) ← Zwischen-Wrapper
│   │   └── div (flex row: lg)                  ← Zeile
│   │       ├── PieceDockAside (Du) → scoreSlot + dockSlots
│   │       ├── Mitte
│   │       │   ├── billboardSlot (Runde/Status)
│   │       │   └── div.bwrap
│   │       │       └── div.bscene (ref)
│   │       │           └── div.board3d
│   │       │               └── div.game-board-frame (3×3 Grid)
│   │       └── PieceDockAside (KI)
│   └── div (Mobile-Dock, fixed bottom)
└── createPortal(Drag-Ghost)
```

---

## 2. Probleme & Vermeidbare Verschachtelung

| Thema | Wo | Empfehlung |
|-------|-----|------------|
| **Doppelte Wrapper** | Page: `div` → `main` → `frame` → `div` → GameBoard | `div` und `main` zusammenführen: ein Container mit allen nötigen Klassen. |
| **Leerer Wrapper um GameBoard** | Frame enthält nur ein Kind: `div` mit GameBoard | GameBoard direkt als Kind des Frames rendern, Wrapper entfernen. |
| **Zwei Wrapper in GameBoard** | Äußerer div + innerer div vor der Zeile | Eine Ebene streichen: Zeile direkt im äußeren Container, oder äußeren mit `overflow-hidden` vereinigen. |
| **Brett: 4 Ebenen** | bwrap → bscene → board3d → game-board-frame | Prüfen: bscene + board3d evtl. zu einer Ebene (3D-Container) zusammenführen; bwrap nur wenn Grid/Center-Layout nötig. |
| **Doppelter Inhalt** | Mobile-Billboard (Page) und billboardSlot/leftScoreSlot/rightScoreSlot (Page → GameBoard) | Einmalige Quelle für Runde/Status und Score-Blöcke; Page rendert nur ein „GameShell“, GameBoard bekommt Daten, nicht fertigen JSX. Oder umgekehrt: GameBoard rendert alles, Page nur Rahmen. |
| **lg:flex-initial** | Äußerer GameBoard-Container | Entfernen, damit Container `flex-1` behält und Asides bis unten reichen. |
| **Viele ähnliche Klassen** | `flex-1 min-h-0` mehrfach | Wo sinnvoll gemeinsame Klasse (z. B. `layout-fill`) nutzen, um Lesbarkeit zu verbessern. |

---

## 3. Konkrete Optimierungen (Reihenfolge nach Impact)

### Hoch: Verschachtelung reduzieren
1. **Page:** Ein Wrapper weniger – `main` so erweitern, dass der jetzige `div` (flex-1, items-center, pb) darin aufgeht; dann nur noch `content → main → frame → GameBoard`.
2. **Page:** Wrapper-`div` um `<GameBoard />` entfernen – GameBoard direkt unter dem Frame.
3. **GameBoard:** Den inneren Wrapper (`w-full flex-1 min-h-0 flex flex-col lg:overflow-hidden`) entfernen und die Zeile (flex row) direkt im äußeren Container platzieren; `overflow-hidden` an der Zeile oder am äußeren Container.

### Mittel: Klarheit & Konsistenz
4. **GameBoard:** `lg:flex-initial` am äußeren Container entfernen (nur `flex-1 min-h-0`), damit die Zeile und Asides die volle Höhe nutzen.
5. **Brett:** Nur dann eine Ebene weniger (bwrap/bscene/board3d), wenn 3D/Transform nur in einem Element nötig sind; sonst Semantik (z. B. `board-wrap`, `board-scene`) beibehalten, aber klar kommentieren.

### Niedrig: Duplikate & Wartbarkeit
6. **Score/Runde:** Runde und Status nur einmal definieren (z. B. in der Page), als Props (Texte/Objekte) an GameBoard übergeben; GameBoard rendert nur das Layout (Slots). Sieg-Indikatoren (die 5 Punkte) einmal als Komponente (z. B. `WinIndicators`) auslagern und in Mobile-Billboard und Score-Slots wiederverwenden.
7. **CSS:** Wiederkehrende Kombinationen wie `flex-1 min-h-0` in eine Utility-Klasse (z. B. in Tailwind @layer) auslagern, um Duplikate zu reduzieren.

---

## 4. Zielstruktur (vereinfacht)

**Page:**
```
content (max-w, pt header, flex-1 min-h-0)
└── main (flex-1, items-center, pb dock, pt gap)
    └── game-nav-header
        ├── Mobile-Billboard (lg:hidden)
        └── GameBoard
```

**GameBoard:**
```
Fragment
├── div (flex-1 min-h-0, overflow-hidden)
│   ├── [optional] Billboard
│   ├── Zeile (flex row: Du | Mitte | KI)   ← eine Ebene weniger
│   │   ├── PieceDockAside (Du)
│   │   ├── Mitte (billboardSlot + Brett)
│   │   └── PieceDockAside (KI)
│   └── Mobile-Dock (fixed)
└── createPortal(Drag-Ghost)
```

**Brett (optional):**
- bwrap + bscene evtl. zu einem „board-container“ (grid + 3D) zusammenfassen, wenn kein separates Layout für bscene nötig ist.

---

## 5. Was man vermeiden sollte

- **Überflüssige Layout-`div`s:** Nur Wrapper, die echte Aufgaben haben (Scroll, Overflow, Flex-Bereich).
- **Doppelten semantischen Inhalt:** Runde/Status und Score nicht sowohl im Mobile-Billboard als auch in den Slots redundant aufbauen; eine Datenquelle, ein Rendering-Pfad.
- **Gleiche Klassen mehrfach ohne Abstraktion:** Wenn `flex-1 min-h-0` an vielen Stellen vorkommt, eine gemeinsame Klasse nutzen.
- **Order nur zur Korrektur der Reihenfolge:** Lieber DOM-Reihenfolge so wählen, dass keine `order` nötig sind (bereits angestrebt).
- **Props als fertigen JSX durchreichen, wo nur Daten nötig sind:** Besser Rohdaten (round, status, scores) übergeben und das Layout in einer Stelle (Page oder GameBoard) rendern.
