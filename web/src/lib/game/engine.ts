/**
 * Engine-Fassade und Modus-Konfiguration.
 * Einzige Quelle für „welche Regeln gelten“ pro Modus (Classic vs Schach vs Pool).
 * KI und UI nutzen dieselbe Engine (STT); Blitz/Daily/PvP sind nur Orchestrierung.
 */

import { STT } from './stt';
import type { Move, Player } from './stt';

export type GameVariant = 'classic' | 'schach' | 'pool';

/** Engine-Optionen pro Variante. Regeln siehe docs/SPIELMODI-*.md. */
export interface EngineConfig {
  /** true = nur Setzen (Classic, Pool); false = Setzen oder Bewegen (Schach) */
  placementOnly: boolean;
  /** true = gemeinsamer Pool (6B, 6D, 2K), keine pro-Spieler-Vorräte */
  poolMode?: boolean;
}

const CONFIG: Record<GameVariant, EngineConfig> = {
  classic: { placementOnly: true },
  schach: { placementOnly: false },
  pool: { placementOnly: true, poolMode: true },
};

/** Liefert die Engine-Konfiguration für einen Spielmodus. Single Source of Truth für Classic vs Schach vs Pool. */
export function getEngineConfig(variant: GameVariant): EngineConfig {
  return CONFIG[variant];
}

/** Wendet einen Zug auf eine Kopie der Stellung an. Gibt die neue Stellung zurück oder null bei illegalem Zug. */
export function applyMove(state: STT, move: Move, player: Player): STT | null {
  const next = state.clone();
  const ok = move.type === 'place'
    ? next.place(player, move.size, move.index)
    : next.move(player, move.fromIndex, move.toIndex);
  return ok ? next : null;
}

/** Alle legalen Züge für einen Spieler (Setzen + ggf. Bewegen). Delegation an STT. */
export function getLegalMoves(state: STT, player: Player): Move[] {
  return state.moves(player);
}

/** Erzeugt eine neue Engine-Instanz für die gegebene Variante (z. B. neue Runde oder Lobby-Start). */
export function createState(variant: GameVariant): STT {
  const { placementOnly, poolMode } = getEngineConfig(variant);
  return new STT({ placementOnly, poolMode: poolMode ?? false });
}

/** Stellung von Classic-Engine auf Schach-Engine umstellen (Brettstand bleibt erhalten). Nötig, wenn die Partie mit placementOnly=true gestartet wurde, die URL aber variant=schach hat. */
export function migrateToSchach(stt: STT): STT {
  if (!stt.placementOnly) return stt;
  const next = new STT({ placementOnly: false });
  next.board = stt.board.map((s) => s.map((p) => ({ ...p })));
  next.res = { human: { ...stt.res.human }, ai: { ...stt.res.ai } };
  next.cur = stt.cur;
  next.phase = stt.phase;
  next.over = stt.over;
  next.winner = stt.winner;
  next.wl = stt.wl ? [...stt.wl] : null;
  next.positionCount = { ...stt.positionCount };
  next.lastPositionBefore = { ...stt.lastPositionBefore };
  return next;
}
