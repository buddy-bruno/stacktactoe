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

type Room = { id: string; name: string; invite_code: string | null; created_by: string | null };
type Member = { user_id: string; profiles: { display_name: string | null; username: string } | null };
type WaitingGame = { id: string; invite_code: string | null; player1_id: string | null };

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [waitingGames, setWaitingGames] = useState<WaitingGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/zugang?redirect=/room/' + id);
        return;
      }
      setUserId(data.user.id);
    }).catch(() => router.replace('/zugang?redirect=/room/' + id));
  }, [id, router]);

  useEffect(() => {
    if (!id || !userId) return;
    (async () => {
      const { data: roomData, error: roomErr } = await supabase.from('rooms').select('id, name, invite_code, created_by').eq('id', id).single();
      if (roomErr || !roomData) {
        setRoom(null);
        setLoading(false);
        return;
      }
      setRoom(roomData as Room);
      const { data: memberData } = await supabase.from('room_members').select('user_id, profiles(display_name, username)').eq('room_id', id);
      const raw = (memberData ?? []) as { user_id: string; profiles: { display_name: string | null; username: string } | { display_name: string | null; username: string }[] | null }[];
      const normalized: Member[] = raw.map((m) => ({
        user_id: m.user_id,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles ?? null,
      }));
      setMembers(normalized);
      const { data: gamesData } = await supabase.from('games').select('id, invite_code, player1_id').eq('room_id', id).eq('status', 'waiting');
      setWaitingGames((gamesData as WaitingGame[]) ?? []);
      setLoading(false);
    })();
  }, [id, userId]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel('room-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: 'room_id=eq.' + id }, () => {
        supabase.from('room_members').select('user_id, profiles(display_name, username)').eq('room_id', id).then(({ data }) => {
        const raw = (data ?? []) as { user_id: string; profiles: { display_name: string | null; username: string } | { display_name: string | null; username: string }[] | null }[];
        const normalized: Member[] = raw.map((m) => ({
          user_id: m.user_id,
          profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles ?? null,
        }));
        setMembers(normalized);
      });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: 'room_id=eq.' + id }, () => {
        supabase.from('games').select('id, invite_code, player1_id').eq('room_id', id).eq('status', 'waiting').then(({ data }) => setWaitingGames((data as WaitingGame[]) ?? []));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  async function createGame() {
    setError('');
    if (!room || !userId) return;
    setCreating(true);
    const code = generateInviteCode();
    const stt = createState('classic');
    const sc = { human: { total: 0, wins: 0, moves: 0, rnd: 0 }, ai: { total: 0, wins: 0, moves: 0, rnd: 0 } };
    const stateJson = serializeMatchState(stt, 1, [], sc);
    const { data, error: err } = await supabase.from('games').insert({
      player1_id: userId,
      mode: 'pvp',
      status: 'waiting',
      state_json: stateJson,
      invite_code: code,
      room_id: room.id,
    }).select('id').single();
    setCreating(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data) router.push('/game/classic?mode=pvp&id=' + data.id);
  }

  async function joinGame(gameId: string) {
    setError('');
    if (!userId) return;
    setJoiningId(gameId);
    const { data: game } = await supabase.from('games').select('id, player1_id').eq('id', gameId).eq('status', 'waiting').single();
    if (!game || game.player1_id === userId) {
      setJoiningId(null);
      return;
    }
    const { error: updErr } = await supabase.from('games').update({ player2_id: userId, status: 'active' }).eq('id', gameId);
    setJoiningId(null);
    if (updErr) setError('Beitreten fehlgeschlagen.');
    else router.push('/game/classic?mode=pvp&id=' + gameId);
  }

  if (!userId) {
    return (
      <PageShell backHref="/rooms" header={<AppHeader title="Raum" showRanking showAuth />}>
        <main className="flex-1 flex flex-col items-center justify-center py-12"><p className="text-game-text-muted">Lade…</p></main>
      </PageShell>
    );
  }

  if (loading || !room) {
    return (
      <PageShell backHref="/rooms" header={<AppHeader title="Raum" showRanking showAuth />}>
        <main className="flex-1 flex flex-col items-center justify-center py-12">
          <p className="text-game-text-muted">{room === null && !loading ? 'Raum nicht gefunden.' : 'Lade…'}</p>
          {room === null && !loading && (
            <Link href="/rooms"><Button variant="outline" className="mt-4 border-game-border text-game-text">Zu den Räumen</Button></Link>
          )}
        </main>
      </PageShell>
    );
  }

  const inviteUrl = typeof window !== 'undefined' && room.invite_code ? `${window.location.origin}/rooms?join=${room.invite_code}` : '';

  return (
    <PageShell backHref="/rooms" header={<AppHeader title="Raum" showRanking showAuth />}>
      <main className="flex-1 flex flex-col gap-6 py-8 pb-20 max-w-2xl mx-auto w-full px-4">
        <h1 className="font-display text-2xl font-bold text-game-text">{room.name}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Raum-Code</CardTitle>
            <CardDescription className="text-game-text-muted">Teile diesen Code, damit andere dem Raum beitreten können.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {room.invite_code && (
              <>
                <p className="font-mono text-lg tracking-widest text-game-text">{room.invite_code}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-game-border text-game-text hover:bg-game-surface-hover"
                  onClick={() => {
                    void navigator.clipboard?.writeText(inviteUrl || room.invite_code || '').then(() => {
                      setCopyFeedback(true);
                      setTimeout(() => setCopyFeedback(false), 2000);
                    });
                  }}
                >
                  {copyFeedback ? '✓ Kopiert!' : 'Link kopieren'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Neue Partie starten</CardTitle>
            <CardDescription className="text-game-text-muted">Erstellt ein wartendes Spiel. Andere im Raum können beitreten.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30" onClick={() => void createGame()} disabled={creating}>
              {creating ? 'Erstelle…' : 'Partie starten'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Offene Partien</CardTitle>
            <CardDescription className="text-game-text-muted">Wartende Spiele in diesem Raum. Klicke auf Beitreten, um mitzuspielen.</CardDescription>
          </CardHeader>
          <CardContent>
            {waitingGames.length === 0 ? (
              <p className="text-game-text-muted text-sm">Keine offenen Partien. Starte eine neue.</p>
            ) : (
              <ul className="space-y-2">
                {waitingGames.map((g) => {
                  const isMine = g.player1_id === userId;
                  return (
                    <li key={g.id} className="flex items-center justify-between gap-2">
                      <span className="text-game-text-muted text-sm truncate">{g.invite_code ?? g.id.slice(0, 8)}</span>
                      {isMine ? (
                        <Link href={'/game/classic?mode=pvp&id=' + g.id}>
                          <Button variant="outline" size="sm" className="border-game-border text-game-text">Zum Spiel</Button>
                        </Link>
                      ) : (
                        <Button size="sm" className="bg-game-accent/20 text-game-accent border-game-accent/30 hover:bg-game-accent/30" onClick={() => void joinGame(g.id)} disabled={joiningId === g.id}>
                          {joiningId === g.id ? '…' : 'Beitreten'}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Mitglieder</CardTitle>
            <CardDescription className="text-game-text-muted">Wer ist im Raum.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.user_id} className="text-game-text">
                  {m.profiles?.display_name || m.profiles?.username || 'Spieler'}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-game-danger text-center">{error}</p>}
      </main>
    </PageShell>
  );
}
