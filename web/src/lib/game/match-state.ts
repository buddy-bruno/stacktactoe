/**
 * 10-Runden Match State für PvP-Sync
 */

import type { GameState } from './stt';

export interface ScoreCount {
  total: number;
  wins: number;
  moves: number;
  rnd: number;
}

export interface MatchState extends GameState {
  round?: number;
  roundResults?: ('human' | 'ai' | null)[];
  sc?: { human: ScoreCount; ai: ScoreCount };
}

export const ROUNDS_TOTAL = 10;
/** Siege nötig zum Matchgewinn („First to 5“). */
export const WINS_TO_MATCH = 5;
