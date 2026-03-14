# StackTacToe – Modus Schach (Setzen + Bewegen, Freischaltung ab 3 Figuren)

## 1. Grundidee

- Zunächst setzen die Spieler Figuren wie gewohnt.
- **Sobald ein Spieler 3 eigene Figuren auf dem Brett hat**, darf er in seinen Zügen wählen: **setzen** oder **eine bereits gesetzte eigene Figur bewegen**.
- Der Modus bleibt ein Setzspiel mit einer zweiten Handlungsebene: frühes Commitment, später Umgruppierung; verdeckte Figuren können durch Wegziehen wieder freigelegt werden.

Alle Regeln von **Modus 1 (Classic)** gelten soweit nicht anders beschrieben. Siehe [SPIELMODI-CLASSIC.md](SPIELMODI-CLASSIC.md).

---

## 2. Spielmaterial & Ziel

- **Pro Spieler:** 3 Bauern, 3 Damen, 1 König. Rang: König > Dame > Bauer.
- **Ziel:** Wer nach seinem Zug **3 eigene sichtbare Figuren in einer Reihe** hat (horizontal, vertikal oder diagonal), gewinnt sofort.
- Nur die **oberste sichtbare Figur** eines Feldes zählt; verdeckte Figuren zählen nicht für Kontrolle oder Sieg.

---

## 3. Züge vor der Bewegungsfreischaltung

Solange ein Spieler **weniger als 3 eigene Figuren auf dem Brett** hat (alle eigenen Steine, sichtbar + verdeckt), darf er **nur setzen**:

- auf ein **leeres Feld**, oder
- auf ein Feld mit **sichtbarer schwächerer Gegnerfigur** (dann Überdecken).

Nicht erlaubt: eigene Figur überdecken, gleich starke oder stärkere gegnerische Figur überdecken.

**Wichtig:** Wurdest du in Zug 1 oder 2 überstapelt, zählen deine verdeckten Figuren trotzdem. Sobald du insgesamt 3 eigene Figuren auf dem Brett hast, ist Bewegen freigeschaltet (du ziehst dann eine sichtbare eigene Figur).

---

## 4. Freischaltung der Bewegung

- **Regel:** Sobald ein Spieler **3 eigene Figuren auf dem Brett** hat (sichtbar + verdeckt), ist für ihn die **Bewegungsaktion freigeschaltet**.
- **Strikt unabhängig vom Überstapeln:** Egal ob der Gegner in Zug 1 oder 2 deine Figuren überdeckt hat – es zählt nur die **Anzahl deiner Figuren auf dem Brett**. Hast du 3 (oder mehr) eigene Steine auf dem Brett (oben sichtbar oder darunter verdeckt), darfst du ab deinem nächsten Zug bewegen. Du musst dazu eine **sichtbare** eigene Figur ziehen; verdeckte dürfen nicht gezogen werden.
- Die Freischaltung ist **spielerbezogen**: Spieler A kann schon bewegen, während Spieler B noch nur setzen darf.

---

## 5. Zugablauf nach der Freischaltung

Pro Zug **genau eine** Aktion:

- **A) Setzen** – eine Figur aus dem Vorrat legal setzen, oder  
- **B) Bewegen** – eine bereits gesetzte **sichtbare eigene** Figur legal bewegen.

Man darf nicht im selben Zug setzen und bewegen.

---

## 6. Welche Figuren bewegt werden dürfen

- Nur eine Figur, die dem aktiven Spieler gehört und **aktuell oben** auf ihrem Feld liegt (sichtbar).
- Verdeckte Figuren dürfen nicht bewegt werden.

---

## 7. Wie sich Figuren bewegen

- **Standardbewegung:** Jede sichtbare eigene Figur darf sich **genau 1 Feld** auf ein **angrenzendes Feld** bewegen (oben, unten, links, rechts, diagonal – maximal 8 Nachbarn).
- Alle Figuren (Bauer, Dame, König) bewegen sich **gleich**; die Unterschiede liegen nur in der Rangstufe.

---

## 8. Wohin eine Figur ziehen darf

- **Leeres Feld:** erlaubt.
- **Sichtbare schwächere Gegnerfigur:** erlaubt → Überdecken (Stapel).
- **Nicht erlaubt:** eigene sichtbare Figur; gleich starke oder stärkere gegnerische Figur.

---

## 9. Schlagen (Überdecken = Figur weg)

- Beim **Überdecken** (Setzen oder Bewegen auf eine schwächere Gegnerfigur) wird die gegnerische Figur **geschlagen** und vom Brett entfernt – sie bleibt dauerhaft weg.
- Wird deine oder die gegnerische Figur später von dem Feld **weggezogen**, ist das Feld leer (die geschlagene Figur erscheint nicht wieder). Nur die oberste sichtbare Figur zählt für Kontrolle und Sieg.

---

## 10. Sieg & Unentschieden

- **Sieg:** 3 sichtbare eigene Figuren in einer Reihe nach dem Zug (wie Classic).
- **Dreifache Wiederholung:** Dieselbe vollständige Stellung (Brett, Vorrat, wer am Zug) zum **dritten Mal** → **Unentschieden**.
- **Zurückpendeln verboten:** Ein Zug, der die Stellung genau auf die Stellung **vor dem letzten eigenen Zug** zurücksetzt, ist nicht erlaubt.
- **Kein legaler Zug:** Kann ein Spieler weder setzen noch bewegen, endet die Partie unentschieden (wenn niemand gewonnen hat).

---

## 11. Technik (Engine)

- `placementOnly: false`; `place()` und `move()`; Bewegung nur wenn **mindestens 3 eigene Figuren auf dem Brett** (`countPiecesOnBoard(p) >= 3` → `canMovePieces(p)`). Zählung: alle eigenen Steine auf dem Brett, **unabhängig ob sichtbar oder verdeckt** (Überstapeln ändert die Anzahl nicht).
- `positionKey()` für Dreifach-Wiederholung; `lastPositionBefore` für Zurückpendel-Verbot.
- Siehe [SPIELMODI-PUNKTE.md](SPIELMODI-PUNKTE.md) für Zugpunkte.
