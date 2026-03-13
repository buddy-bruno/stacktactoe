/**
 * Zug-Punkte und Match-State (10 Runden, PvP-Sync)
 */

import { STT, serializeGameState, deserializeGameState } from './stt';
import type { Move, Player } from './stt';
import type { ScoreCount } from './match-state';
import { ROUNDS_TOTAL } from './match-state';

export function calcPts(state: STT, mv: Move, player: Player): number {
  const g = state.clone();
  const ti = mv.type === 'place' ? mv.index : mv.toIndex;
  if (mv.type === 'place') g.place(player, mv.size, ti);
  else g.move(player, mv.fromIndex, mv.toIndex);
  let pts = 5;
  if (ti === 4) pts += 8;
  else if ([0, 2, 6, 8].includes(ti)) pts += 4;
  else pts += 2;
  pts += { small: 1, medium: 3, large: 6 }[mv.size] ?? 0;
  const before = state.top(ti);
  if (before && before.player !== player) pts += 12;
  const v = g.vis();
  for (const [a, b, c] of g.WL) {
    const pc = v.filter((x, i) => [a, b, c].includes(i) && x && x.player === player).length;
    const em = v.filter((x, i) => [a, b, c].includes(i) && !x).length;
    if (pc === 2 && em === 1) pts += 15;
  }
  if (g.winner === player) pts += 50;
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
    res: json.res ?? { human: { small: 3, medium: 3, large: 2 }, ai: { small: 3, medium: 3, large: 2 } },
    cur: json.cur ?? 'human',
    phase: json.phase ?? 'placement',
    over: json.over ?? false,
    winner: json.winner ?? null,
    wl: json.wl ?? null,
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
