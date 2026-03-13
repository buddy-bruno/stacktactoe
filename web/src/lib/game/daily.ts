/**
 * Daily Challenge: ein Spiel pro Tag, Rangliste nach Punkten/Zeit
 */

import { supabase } from '@/lib/supabase';

export interface DailyScore {
  id: string;
  user_id: string;
  challenge_date: string;
  points: number;
  time_ms: number;
  rounds_won: number;
  created_at: string;
  profiles?: { display_name: string | null; username: string } | { display_name: string | null; username: string }[];
}

export async function getDailyLeaderboard(date?: string) {
  const d = date || new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('daily_scores')
    .select('id, user_id, challenge_date, points, time_ms, rounds_won, created_at, profiles(display_name, username)')
    .eq('challenge_date', d)
    .order('points', { ascending: false })
    .order('time_ms', { ascending: true })
    .limit(50);
  return (data as unknown as DailyScore[]) || [];
}

export async function getMyDailyScore(date?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const d = date || new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('daily_scores')
    .select('points, time_ms, rounds_won')
    .eq('user_id', user.id)
    .eq('challenge_date', d)
    .single();
  return data;
}

export async function submitDailyScore(points: number, timeMs: number, roundsWon: number) {
  const { error } = await supabase.rpc('submit_daily_score', {
    p_points: points,
    p_time_ms: timeMs,
    p_rounds_won: roundsWon,
  });
  return !error;
}
