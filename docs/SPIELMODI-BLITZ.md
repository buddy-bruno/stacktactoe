# Modus Blitz

## Spielidee

- Gleiche **Spielregeln wie Classic** (nur Setzen, kein Bewegen). Siehe [SPIELMODI-CLASSIC.md](SPIELMODI-CLASSIC.md).
- **Zeitlimit:** **5 Sekunden pro Zug**.
- **Zeit läuft für beide:** Beim Spieler sichtbarer Countdown; bei der **KI** läuft intern eine 5-Sekunden-Frist.
- Wenn die Zeit **abläuft**, bevor ein Zug ausgeführt wird, **verliert der Spieler die aktuelle Runde** (der andere gewinnt die Runde). Der **Runden-Gewinner** erhält dabei **4 Punkte** für diese Runde („grüne Punkte“).

## Ablauf

- Pro Runde: Classic-Logik.
- **Dein Zug:** 5-Sekunden-Timer sichtbar; Ablauf → du verlierst die Runde (Gegner/KI gewinnt die Runde).
- **KI-Zug:** 5 Sekunden Frist für die KI; zieht die KI nicht rechtzeitig → KI verliert die Runde (du gewinnst die Runde).
- Die **Dots** (Punkte/Runden) zeigen gewonnene Runden; 5 Siege = Match gewonnen.
- Nach Ablauf: Runde wird dem Gegner zugesprochen, danach nächste Runde (bis 10 Runden bzw. 5 Siege).

## Verfügbarkeit

- Blitz ist gegen **KI** spielbar (Schwierigkeit wählbar). **PvP-Blitz** (Multiplayer mit Zeitlimit) wird aktuell nicht angeboten; die Lobby unterstützt nur Classic und Schach.

## Technik

- Wie Classic + 5-Sekunden-Timer pro Zug (`BLITZ_SEC` in `BlitzTimer.tsx`).
- Human-Timeout → `triggerBlitzTimeout` (Gegner gewinnt Runde).
- KI-Timeout → `triggerBlitzAiTimeout` (Mensch gewinnt Runde).
- **Punkte:** Normale Züge wie in [SPIELMODI-PUNKTE.md](SPIELMODI-PUNKTE.md). Bei **Zeitablauf** erhält der Runden-Gewinner **4 Punkte** für diese Runde (Konstante `BLITZ_TIMEOUT_WIN_PTS` in `scoring.ts`).
