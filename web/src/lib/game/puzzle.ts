/**
 * Puzzle Mode: vorgegebene Stellung, ein Zug zum Sieg
 */

import type { GameState, Move } from './stt';
import { supabase } from '@/lib/supabase';

export interface Puzzle {
  id: string;
  initial_state: GameState;
  solution_type: 'place' | 'move';
  solution_data: Record<string, unknown>;
  difficulty: string;
}

export async function getPuzzles(difficulty?: string) {
  let q = supabase.from('puzzles').select('id, initial_state, solution_type, solution_data, difficulty');
  if (difficulty) q = q.eq('difficulty', difficulty);
  const { data } = await q.order('created_at', { ascending: true }).limit(50);
  return (data as Puzzle[]) || [];
}

export async function getPuzzle(id: string) {
  const { data } = await supabase.from('puzzles').select('*').eq('id', id).single();
  return data as Puzzle | null;
}

/** Prüft, ob der gegebene Zug die Puzzle-Lösung ist (führt zum Sieg). */
export function isPuzzleSolution(
  solutionType: string,
  solutionData: Record<string, unknown>,
  move: Move
): boolean {
  if (move.type === 'place' && solutionType === 'place') {
    return (
      move.index === (solutionData.index as number) &&
      move.size === (solutionData.size as 'small' | 'medium' | 'large')
    );
  }
  if (move.type === 'move' && solutionType === 'move') {
    return (
      move.fromIndex === (solutionData.fromIndex as number) &&
      move.toIndex === (solutionData.toIndex as number)
    );
  }
  return false;
}
