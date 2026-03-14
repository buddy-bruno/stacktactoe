/**
 * Zug-Punkte und Match-State (10 Runden, PvP-Sync).
 * Punkte gelten einheitlich für Classic, Schach, Blitz – siehe docs/SPIELMODI.md.
 */
import { STT, serializeGameState, deserializeGameState } from './stt';
import type { Move, Player, PieceSize } from './stt';
import type { ScoreCount } from './match-state';
import { ROUNDS_TOTAL } from './match-state';

/** Punkte pro Zug – einheitlich für alle Modi (Classic, Schach, Blitz) */
export const PTS = {
  base: 5,
  fieldCenter: 8,
  fieldCorner: 4,
  fieldEdge: 2,
  piece: { small: 1, medium: 3, large: 6 } as Record<PieceSize, number>,
  capture: 12,
  openTwo: 15,
  win: 50,
} as const;

/** Blitz: Punkte für den Runden-Gewinner bei Zeitablauf (der andere hat die Zeit überschritten). */
export const BLITZ_TIMEOUT_WIN_PTS = 4;

const CENTER = 4;
const CORNERS = [0, 2, 6, 8];

export function calcPts(state: STT, mv: Move, player: Player): number {
  const g = state.clone();
  const ti = mv.type === 'place' ? mv.index : mv.toIndex;
  if (mv.type === 'place') g.place(player, mv.size, ti);
  else g.move(player, mv.fromIndex, mv.toIndex);
  let pts = PTS.base;
  if (ti === CENTER) pts += PTS.fieldCenter;
  else if (CORNERS.includes(ti)) pts += PTS.fieldCorner;
  else pts += PTS.fieldEdge;
  pts += PTS.piece[mv.size] ?? 0;
  const before = state.top(ti);
  if (before && before.player !== player) pts += PTS.capture;
  const v = g.vis();
  for (const [a, b, c] of g.WL) {
    const pc = v.filter((x, i) => [a, b, c].includes(i) && x && x.player === player).length;
    const em = v.filter((x, i) => [a, b, c].includes(i) && !x).length;
    if (pc === 2 && em === 1) pts += PTS.openTwo;
  }
  if (g.winner === player) pts += PTS.win;
  return pts;
}

export interface SerializedMatchState {
  round: number;
  roundResults: ('human' | 'ai' | null)[];
  sc: { human: ScoreCount; ai: ScoreCount };
  board: STT['board'];
  res: STT['res'];
  cur: Player;
  phase: STT['phase'];
  over: boolean;
  winner: Player | null;
  wl: number[] | null;
  placementOnly?: boolean;
  positionCount?: Record<string, number>;
  lastPositionBefore?: Record<Player, string | null>;
  poolLeft?: Record<PieceSize, number>;
  poolRight?: Record<PieceSize, number>;
  pool?: Record<PieceSize, number>;
  swapApplied?: boolean;
}

export function serializeMatchState(
  stt: STT,
  round: number,
  roundResults: ('human' | 'ai' | null)[],
  sc: { human: ScoreCount; ai: ScoreCount }
): SerializedMatchState {
  const base = serializeGameState(stt);
  return {
    ...base,
    round,
    roundResults: [...roundResults],
    sc: { human: { ...sc.human }, ai: { ...sc.ai } },
  };
}

export function deserializeMatchState(json: Partial<SerializedMatchState>): {
  stt: STT;
  round: number;
  roundResults: ('human' | 'ai' | null)[];
  sc: { human: ScoreCount; ai: ScoreCount };
} {
  const stt = deserializeGameState({
    board: json.board ?? [],
    res: json.res ?? { human: { small: 3, medium: 3, large: 1 }, ai: { small: 3, medium: 3, large: 1 } },
    cur: json.cur ?? 'human',
    phase: json.phase ?? 'placement',
    over: json.over ?? false,
    winner: json.winner ?? null,
    wl: json.wl ?? null,
    placementOnly: json.placementOnly,
    positionCount: json.positionCount,
    lastPositionBefore: json.lastPositionBefore,
    poolLeft: json.poolLeft,
    poolRight: json.poolRight,
    pool: json.pool,
    swapApplied: json.swapApplied,
  });
  const round = json.round ?? 1;
  const roundResults = Array.isArray(json.roundResults) ? [...json.roundResults] : [];
  const sc = json.sc
    ? {
        human: { total: json.sc.human?.total ?? 0, wins: json.sc.human?.wins ?? 0, moves: json.sc.human?.moves ?? 0, rnd: json.sc.human?.rnd ?? 0 },
        ai: { total: json.sc.ai?.total ?? 0, wins: json.sc.ai?.wins ?? 0, moves: json.sc.ai?.moves ?? 0, rnd: json.sc.ai?.rnd ?? 0 },
      }
    : { human: { total: 0, wins: 0, moves: 0, rnd: 0 }, ai: { total: 0, wins: 0, moves: 0, rnd: 0 } };
  return { stt, round, roundResults, sc };
}

export { ROUNDS_TOTAL };
