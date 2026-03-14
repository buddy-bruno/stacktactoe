'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { createState } from '@/lib/game/engine';
import { serializeMatchState } from '@/lib/game/scoring';

type Tournament = { id: string; name: string; status: string; max_participants: number; created_by: string | null };
type Participant = { user_id: string; profiles: { display_name: string | null; username: string } | null };
type Match = {
  id: string;
  round: number;
  match_index_in_round: number;
  game_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  status: string;
  p1?: { display_name: string | null; username: string } | null;
  p2?: { display_name: string | null; username: string } | null;
};

const ROUND_NAMES: Record<number, string> = { 1: 'Runde 1', 2: 'Halbfinale', 3: 'Finale', 4: 'Finale' };

function normalizeParticipants(
  data: { user_id: string; profiles: { display_name: string | null; username: string } | { display_name: string | null; username: string }[] | null }[] | null
): Participant[] {
  const raw = data ?? [];
  return raw.map((p) => ({
    user_id: p.user_id,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] ?? null : p.profiles ?? null,
  }));
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startingMatchId, setStartingMatchId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/zugang?redirect=/tournament/' + id);
        return;
      }
      setUserId(data.user.id);
    }).catch(() => router.replace('/zugang?redirect=/tournament/' + id));
  }, [id, router]);

  useEffect(() => {
    if (!id || !userId) return;
    (async () => {
      const { data: tData, error: tErr } = await supabase.from('tournaments').select('id, name, status, max_participants, created_by').eq('id', id).single();
      if (tErr || !tData) {
        setTournament(null);
        setLoading(false);
        return;
      }
      setTournament(tData as Tournament);
      const { data: pData } = await supabase.from('tournament_participants').select('user_id, profiles(display_name, username)').eq('tournament_id', id);
      setParticipants(normalizeParticipants(pData as Parameters<typeof normalizeParticipants>[0]));
      const { data: mData } = await supabase.from('tournament_matches').select('id, round, match_index_in_round, game_id, player1_id, player2_id, winner_id, status').eq('tournament_id', id).order('round').order('match_index_in_round');
      const matchesList = (mData as Match[]) ?? [];
      if (matchesList.length > 0) {
        const p1Ids = [...new Set(matchesList.map((m) => m.player1_id).filter(Boolean))] as string[];
        const p2Ids = [...new Set(matchesList.map((m) => m.player2_id).filter(Boolean))] as string[];
        const allIds = [...new Set([...p1Ids, ...p2Ids])];
        const { data: profs } = await supabase.from('profiles').select('id, display_name, username').in('id', allIds);
        const profMap = new Map((profs ?? []).map((p: { id: string; display_name: string | null; username: string }) => [p.id, p]));
        matchesList.forEach((m) => {
          (m as Match & { p1?: unknown }).p1 = m.player1_id ? profMap.get(m.player1_id) : null;
          (m as Match & { p2?: unknown }).p2 = m.player2_id ? profMap.get(m.player2_id) : null;
        });
      }
      setMatches(matchesList);
      setLoading(false);
    })();
  }, [id, userId]);

  const isCreator = tournament?.created_by === userId;
  const isRegistered = participants.some((p) => p.user_id === userId);
  const canRegister = tournament?.status === 'registration' && participants.length < (tournament?.max_participants ?? 8);

  async function register() {
    if (!id || !userId) return;
    const { error: err } = await supabase.from('tournament_participants').insert({ tournament_id: id, user_id: userId });
    if (!err) {
      const { data } = await supabase.from('tournament_participants').select('user_id, profiles(display_name, username)').eq('tournament_id', id);
      setParticipants(normalizeParticipants(data as Parameters<typeof normalizeParticipants>[0]));
    }
  }

  async function unregister() {
    if (!id || !userId) return;
    await supabase.from('tournament_participants').delete().eq('tournament_id', id).eq('user_id', userId);
    setParticipants((p) => p.filter((x) => x.user_id !== userId));
  }

  async function startTournament() {
    if (!id || !isCreator) return;
    setStarting(true);
    const { error: err } = await supabase.rpc('start_tournament', { p_tournament_id: id });
    setStarting(false);
    if (!err) {
      const { data: mData } = await supabase.from('tournament_matches').select('id, round, match_index_in_round, game_id, player1_id, player2_id, winner_id, status').eq('tournament_id', id).order('round').order('match_index_in_round');
      setMatches((mData as Match[]) ?? []);
      setTournament((t) => (t ? { ...t, status: 'running' } : null));
    } else setError('Starten fehlgeschlagen.');
  }

  async function startMatch(matchId: string, player1Id: string | null, player2Id: string | null) {
    if (!userId || !player1Id || !player2Id) return;
    setStartingMatchId(matchId);
    const stt = createState('classic');
    const sc = { human: { total: 0, wins: 0, moves: 0, rnd: 0 }, ai: { total: 0, wins: 0, moves: 0, rnd: 0 } };
    const stateJson = serializeMatchState(stt, 1, [], sc);
    const { data: game, error: insertErr } = await supabase.from('games').insert({
      player1_id: player1Id,
      player2_id: player2Id,
      mode: 'pvp',
      status: 'active',
      state_json: stateJson,
      invite_code: generateInviteCode(),
    }).select('id').single();
    if (insertErr || !game) {
      setStartingMatchId(null);
      setError('Spiel konnte nicht erstellt werden.');
      return;
    }
    await supabase.from('tournament_matches').update({ game_id: game.id, status: 'active' }).eq('id', matchId);
    setStartingMatchId(null);
    router.push('/game/classic?mode=pvp&id=' + game.id);
  }

  if (!userId) {
    return (
      <PageShell backHref="/tournaments" header={<AppHeader title="Turnier" showRanking showAuth />}>
        <main className="flex-1 flex flex-col items-center justify-center py-12"><p className="text-game-text-muted">Lade…</p></main>
      </PageShell>
    );
  }

  if (loading || !tournament) {
    return (
      <PageShell backHref="/tournaments" header={<AppHeader title="Turnier" showRanking showAuth />}>
        <main className="flex-1 flex flex-col items-center justify-center py-12">
          <p className="text-game-text-muted">{tournament === null && !loading ? 'Turnier nicht gefunden.' : 'Lade…'}</p>
          {tournament === null && !loading && <Link href="/tournaments"><Button variant="outline" className="mt-4 border-game-border text-game-text">Zu den Turnieren</Button></Link>}
        </main>
      </PageShell>
    );
  }

  const matchesByRound = matches.reduce<Record<number, Match[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = [];
    acc[m.round].push(m);
    return acc;
  }, {});

  return (
    <PageShell backHref="/tournaments" header={<AppHeader title="Turnier" showRanking showAuth />}>
      <main className="flex-1 flex flex-col gap-6 py-8 pb-20 max-w-2xl mx-auto w-full px-4">
        <h1 className="font-display text-2xl font-bold text-game-text">{tournament.name}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Status</CardTitle>
            <CardDescription className="text-game-text-muted">
              {tournament.status === 'draft' ? 'Entwurf' : tournament.status === 'registration' ? 'Anmeldung offen' : tournament.status === 'running' ? 'Läuft' : 'Beendet'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tournament.status === 'registration' && isCreator && (
              <Button className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30" onClick={() => void startTournament()} disabled={starting || participants.length < 2}>
                {starting ? 'Starte…' : 'Turnier starten'}
              </Button>
            )}
            {tournament.status === 'registration' && canRegister && !isRegistered && (
              <Button className="w-full bg-game-accent/20 border-game-accent/30 text-game-accent hover:bg-game-accent/30" onClick={() => void register()}>Anmelden</Button>
            )}
            {tournament.status === 'registration' && isRegistered && (
              <Button variant="outline" className="w-full border-game-border text-game-text hover:bg-game-surface-hover" onClick={() => void unregister()}>Abmelden</Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Teilnehmer</CardTitle>
            <CardDescription className="text-game-text-muted">{participants.length} / {tournament.max_participants}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {participants.map((p) => (
                <li key={p.user_id} className="text-game-text">{p.profiles?.display_name || p.profiles?.username || 'Spieler'}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {Object.keys(matchesByRound).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-game-text">Bracket</CardTitle>
              <CardDescription className="text-game-text-muted">Spiele und Ergebnisse</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(matchesByRound).sort(([a], [b]) => Number(a) - Number(b)).map(([round, roundMatches]) => (
                <div key={round}>
                  <p className="text-sm font-medium text-game-text-muted mb-2">{ROUND_NAMES[Number(round)] ?? 'Runde ' + round}</p>
                  <ul className="space-y-2">
                    {roundMatches.map((m) => {
                      const p1Name = (m as Match & { p1?: { display_name: string | null; username: string } }).p1?.display_name || (m as Match & { p1?: { username: string } }).p1?.username || 'TBD';
                      const p2Name = (m as Match & { p2?: { display_name: string | null; username: string } }).p2?.display_name || (m as Match & { p2?: { username: string } }).p2?.username || 'TBD';
                      const hasWinner = m.status === 'finished' && m.winner_id;
                      const canStart = tournament.status === 'running' && m.status === 'pending' && m.player1_id && m.player2_id && (isCreator || m.player1_id === userId || m.player2_id === userId);
                      return (
                        <li key={m.id} className="rounded-lg border border-game-border p-2 text-sm">
                          <div className="flex justify-between items-center gap-2 flex-wrap">
                            <span className="text-game-text">{p1Name} vs {p2Name}</span>
                            <div className="flex gap-1">
                              {hasWinner && <span className="text-game-success">Sieger</span>}
                              {m.game_id && !hasWinner && <Link href={'/game/classic?mode=pvp&id=' + m.game_id}><Button variant="outline" size="sm" className="border-game-border text-game-text">Zum Spiel</Button></Link>}
                              {canStart && (
                                <Button size="sm" className="bg-game-primary/20 text-game-primary border-game-primary/30" onClick={() => void startMatch(m.id, m.player1_id ?? null, m.player2_id ?? null)} disabled={startingMatchId === m.id}>
                                  {startingMatchId === m.id ? '…' : 'Spiel starten'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {error && <p className="text-sm text-game-danger text-center">{error}</p>}
      </main>
    </PageShell>
  );
}
