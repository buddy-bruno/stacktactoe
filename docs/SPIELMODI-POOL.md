# StackTacToe – Modus Pool (Figurenpool)

## 1. Grundidee

Im Pool-Modus haben die Spieler **keinen festen eigenen Vorrat** aus Bauern, Damen und König. Stattdessen gibt es einen **gemeinsamen offenen Pool**, aus dem beide Spieler im Verlauf der Partie Figuren nehmen.

Jeder Zug besteht darin:

1. **eine Figur aus dem gemeinsamen Pool auszuwählen**
2. **sie sofort auf das Brett zu setzen**

Sobald eine Figur gesetzt wurde, gehört sie **dauerhaft dem Spieler**, der sie gesetzt hat.

Der Kernunterschied zu Classic: In Classic verwaltest du deinen eigenen bekannten Satz; im Pool-Modus verwaltest du den **Zugriff auf gemeinsam knappe Ressourcen**.

---

## 2. Spielmaterial

- **Gemeinsamer Pool:**
  - 6 Bauern (klein)
  - 6 Damen (mittel)
  - 2 Könige (groß)  
  → **14 Figuren** im offenen Pool.

- Zusätzlich: ein **3×3-Brett** und zwei Spielerfarben (bzw. eindeutige Spielerzuordnung beim Setzen).

**Wichtig:** Die Figuren im Pool sind nicht vorab einem Spieler zugeordnet. Erst wenn ein Spieler eine Figur nimmt und setzt, gehört diese Figur ihm.

---

## 3. Ziel des Spiels

Wie in Classic gilt: Ein Spieler gewinnt sofort, wenn **nach seinem Zug 3 eigene sichtbare Figuren in einer Reihe** liegen:

- horizontal
- vertikal
- diagonal

**Nur die oberste sichtbare Figur** eines Feldes zählt.

---

## 4. Rangfolge

Unverändert: **König** > **Dame** > **Bauer**

- Dame darf Bauer überdecken.
- König darf Dame oder Bauer überdecken.
- Bauer darf niemanden überdecken.

---

## 5. Zugablauf

In deinem Zug musst du **genau eine Figur aus dem offenen Pool nehmen** und **sofort setzen**.

Ein Zug besteht also immer aus zwei untrennbaren Teilen:

1. Figur aus dem Pool wählen
2. diese Figur regelkonform auf dem Brett platzieren

Du darfst keine Figur „reservieren“, „zur Seite legen“ oder später einsetzen.

---

## 6. Was gesetzt werden darf

Eine gewählte Figur darf gesetzt werden auf:

- **Leeres Feld** → immer erlaubt.
- **Feld mit sichtbarer schwächerer Gegnerfigur** → erlaubt, wenn die gewählte Figur stärker ist als die oberste gegnerische Figur.
  - Beispiele: Dame auf gegnerischen Bauern; König auf gegnerische Dame oder Bauer.

---

## 7. Was nicht erlaubt ist

- Eigene sichtbare Figur überdecken.
- Gleich starke gegnerische Figur überdecken.
- Stärkere gegnerische Figur überdecken.
- **Eine Figur aus dem Pool nehmen, wenn es für diese Figur keinen legalen Setzzug gibt.**  
  Ein Spieler darf nur eine Figur wählen, die er in diesem Zug tatsächlich legal setzen kann.

---

## 8. Stapelregel

Wenn eine Figur eine gegnerische schwächere Figur überdeckt: Die untere Figur bleibt physisch auf dem Feld, sie bleibt Teil des Spielzustands, ist aber **verdeckt und inaktiv** und zählt nicht für Kontrolle oder Sieg.

Es gilt immer: **Nur die oberste sichtbare Figur** eines Feldes zählt.

---

## 9. Sichtbarkeit

Alle Figuren und Stapel sind offen sichtbar. Jeder Spieler darf jederzeit sehen, welche Figur oben liegt und welche darunter. Es gibt keine versteckten Informationen.

---

## 10. Spielende

- **Sieg:** Ein Spieler gewinnt sofort, wenn nach seinem Zug 3 eigene sichtbare Figuren in einer Reihe liegen.
- **Unentschieden:**
  - Keine Figuren mehr im Pool und niemand hat gewonnen.
  - Oder: Noch Figuren im Pool, aber **keine davon kann legal gesetzt werden**, und niemand hat eine Dreierreihe gebildet.

---

## 11. Kurzregel in einem Satz

Im Figurenpool-Modus nehmen die Spieler abwechselnd eine Figur aus einem gemeinsamen offenen Vorrat und setzen sie so auf das Brett, dass sie entweder ein leeres Feld besetzt oder eine schwächere gegnerische Figur überdeckt; wer zuerst 3 eigene sichtbare Figuren in einer Reihe bildet, gewinnt.

---

## 12. Empfohlene Swap-Regel

**Spieler A** macht den ersten Zug. Danach darf **Spieler B** einmalig entscheiden:

- **normal weiterspielen**, oder
- **die Rolle von Spieler A übernehmen** (Swap).

Warum? Der erste Zugriff auf den offenen Pool kann sehr stark sein. Die Swap-Regel macht den Modus ausgewogener.

---

## 13. UI

- **Brett** in der Mitte.
- **Pool links und rechts** (beide zeigen denselben gemeinsamen Vorrat).
- Figuren **im Pool neutral** dargestellt; Entnahme von **beiden Seiten** möglich.
- Gesetzte Figuren auf dem Brett in Spielerfarben.

---

## Technik

- Engine: Pool-Modus mit `pool: { small: 6, medium: 6, large: 2 }`, nur `place()` (placementOnly).
- Siehe [SPIELMODI-PUNKTE.md](SPIELMODI-PUNKTE.md) für Zugpunkte.
