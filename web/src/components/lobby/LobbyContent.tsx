'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { createState } from '@/lib/game/engine';
import { serializeMatchState } from '@/lib/game/scoring';

const ROULETTE_SESSION_KEY = 'stacktactoe_roulette_session';
const ROULETTE_LAST_RESULT_KEY = 'stacktactoe_roulette_last_result';
const ROULETTE_ROUNDS = 3;

type RouletteSession = { rounds: number; current: number; wins: number };

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const VARIANT_TITLES: Record<string, string> = { classic: 'Classic', schach: 'Schach', pool: 'Pool' };

export type LobbyVariant = 'classic' | 'schach' | 'pool';

export function LobbyContent({ variant }: { variant: LobbyVariant }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinFromUrl = searchParams.get('join')?.trim().toUpperCase() ?? '';
  const gamePath = variant === 'schach' ? '/game/schach' : variant === 'pool' ? '/game/pool' : '/game/classic';
  const lobbyPath = `/${variant}/lobby`;
  const [inviteCode, setInviteCode] = useState('');
  const [matchmaking, setMatchmaking] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [createdGame, setCreatedGame] = useState<{ gameId: string; code: string } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [rouletteSession, setRouletteSession] = useState<RouletteSession | null>(null);
  const [rouletteEnded, setRouletteEnded] = useState<{ wins: number; rounds: number } | null>(null);

  const [authReady, setAuthReady] = useState(false);
  const [searchingUserId, setSearchingUserId] = useState<string | null>(null);
  const [activePvpGame, setActivePvpGame] = useState<{ id: string; variant: string } | null>(null);
  const matchmakingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const rouletteSessionRef = useRef<RouletteSession | null>(null);

  useEffect(() => {
    rouletteSessionRef.current = rouletteSession;
  }, [rouletteSession]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace(`/zugang?redirect=${encodeURIComponent(lobbyPath)}`);
        return;
      }
      setAuthReady(true);
    }).catch(() => router.replace(`/zugang?redirect=${encodeURIComponent(lobbyPath)}`));
  }, [router, lobbyPath]);

  const fetchActivePvpGame = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: rows } = await supabase.rpc('get_my_active_pvp_game', { p_user_id: user.id });
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.id) {
      setActivePvpGame(null);
      try {
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('stacktactoe_active_pvp');
      } catch {}
      return;
    }
    let v = 'classic';
    try {
      const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('stacktactoe_active_pvp') : null;
      const parsed = stored ? (JSON.parse(stored) as { gameId?: string; variant?: string }) : null;
      if (parsed?.gameId === row.id && parsed?.variant) v = parsed.variant;
    } catch {
      // ignore
    }
    setActivePvpGame({ id: row.id, variant: v });
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const t = setTimeout(() => { void fetchActivePvpGame(); }, 0);
    return () => clearTimeout(t);
  }, [authReady, fetchActivePvpGame]);

  useEffect(() => {
    if (!authReady) return;
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') void fetchActivePvpGame();
    };
    const onFocus = () => { void fetchActivePvpGame(); };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void fetchActivePvpGame();
    };
    document.addEventListener('visibilitychange', onVisible);
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      window.addEventListener('pageshow', onPageShow);
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('pageshow', onPageShow);
      }
    };
  }, [authReady, fetchActivePvpGame]);

  useEffect(() => {
    if (!activePvpGame?.id) return;
    const channel = supabase.channel('lobby-active-game-' + activePvpGame.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: 'id=eq.' + activePvpGame.id }, (payload: { new: { status?: string } }) => {
        if (payload?.new?.status === 'abandoned') {
          setActivePvpGame(null);
          try {
            if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('stacktactoe_active_pvp');
          } catch {}
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activePvpGame?.id]);

  const leaveQueue = useCallback(async () => {
    await supabase.rpc('leave_matchmaking_queue');
    if (matchmakingChannelRef.current) {
      supabase.removeChannel(matchmakingChannelRef.current);
      matchmakingChannelRef.current = null;
    }
    setMatchmaking('idle');
    setSearchingUserId(null);
    if (rouletteSessionRef.current) {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(ROULETTE_SESSION_KEY);
      rouletteSessionRef.current = null;
      setRouletteSession(null);
      setRouletteEnded(null);
    }
  }, []);

  const findMatch = useCallback(async (ranked: boolean) => {
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Bitte zuerst anmelden.');
      return;
    }
    setMatchmaking('searching');
    setSearchingUserId(user.id);
    const { data: gameId, error: err } = await supabase.rpc('join_matchmaking_queue', {
      p_queue_type: ranked ? 'ranked' : 'casual',
    });
    if (err) {
      setError(err.message);
      setMatchmaking('idle');
      setSearchingUserId(null);
      return;
    }
    if (gameId) {
      setMatchmaking('matched');
      setSearchingUserId(null);
      const q = rouletteSessionRef.current ? '&roulette=1' : '';
      router.push(`${gamePath}?mode=pvp&id=${gameId}${q}`);
    }
  }, [router, gamePath]);

  useEffect(() => {
    if (matchmaking !== 'searching' || !searchingUserId) return;
    const uid = searchingUserId;
    const channel = supabase.channel('lobby-matchmaking-' + uid)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'games', filter: 'player1_id=eq.' + uid },
        (payload: { new: { id: string; status: string } }) => {
          if (payload?.new?.status === 'active') {
            leaveQueue();
            const q = rouletteSessionRef.current ? '&roulette=1' : '';
            router.push(gamePath + '?mode=pvp&id=' + payload.new.id + q);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'games', filter: 'player2_id=eq.' + uid },
        (payload: { new: { id: string; status: string } }) => {
          if (payload?.new?.status === 'active') {
            leaveQueue();
            const q = rouletteSessionRef.current ? '&roulette=1' : '';
            router.push(gamePath + '?mode=pvp&id=' + payload.new.id + q);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: 'player1_id=eq.' + uid },
        (payload: { new: { id: string; status: string } }) => {
          if (payload?.new?.status === 'active') {
            leaveQueue();
            const q = rouletteSessionRef.current ? '&roulette=1' : '';
            router.push(gamePath + '?mode=pvp&id=' + payload.new.id + q);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: 'player2_id=eq.' + uid },
        (payload: { new: { id: string; status: string } }) => {
          if (payload?.new?.status === 'active') {
            leaveQueue();
            const q = rouletteSessionRef.current ? '&roulette=1' : '';
            router.push(gamePath + '?mode=pvp&id=' + payload.new.id + q);
          }
        }
      )
      .subscribe();
    matchmakingChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      matchmakingChannelRef.current = null;
    };
  }, [matchmaking, searchingUserId, router, leaveQueue, gamePath]);

  useEffect(() => {
    return () => {
      void leaveQueue();
    };
  }, [leaveQueue]);

  const rouletteFromUrl = searchParams.get('roulette') === '1';
  useEffect(() => {
    if (!rouletteFromUrl || !authReady || typeof window === 'undefined') return;
    const raw = sessionStorage.getItem(ROULETTE_SESSION_KEY);
    const lastResult = sessionStorage.getItem(ROULETTE_LAST_RESULT_KEY);
    sessionStorage.removeItem(ROULETTE_LAST_RESULT_KEY);
    let session: RouletteSession | null = null;
    try {
      if (raw) session = JSON.parse(raw) as RouletteSession;
    } catch {
      sessionStorage.removeItem(ROULETTE_SESSION_KEY);
    }
    if (lastResult && session) {
      session.current += 1;
      if (lastResult === 'win') session.wins += 1;
      sessionStorage.setItem(ROULETTE_SESSION_KEY, JSON.stringify(session));
    }
    if (session && session.current > session.rounds) {
      queueMicrotask(() => {
        setRouletteEnded({ wins: session!.wins, rounds: session!.rounds });
        setRouletteSession(null);
      });
      sessionStorage.removeItem(ROULETTE_SESSION_KEY);
      return;
    }
    if (session) {
      rouletteSessionRef.current = session;
      queueMicrotask(() => {
        setRouletteSession(session);
        setRouletteEnded(null);
      });
      if (lastResult && session.current <= session.rounds) {
        queueMicrotask(() => void findMatch(false));
      }
    }
  }, [rouletteFromUrl, authReady, findMatch]);

  async function createGame() {
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Bitte zuerst anmelden.');
      return;
    }
    setCreating(true);
    const code = generateInviteCode();
    const stt = createState(variant);
    const sc = { human: { total: 0, wins: 0, moves: 0, rnd: 0 }, ai: { total: 0, wins: 0, moves: 0, rnd: 0 } };
    const stateJson = serializeMatchState(stt, 1, [], sc);
    const { data, error: err } = await supabase
      .from('games')
      .insert({
        player1_id: user.id,
        mode: 'pvp',
        status: 'waiting',
        state_json: stateJson,
        invite_code: code,
      })
      .select('id')
      .single();
    setCreating(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data) setCreatedGame({ gameId: data.id, code });
  }

  async function joinByCode() {
    setError('');
    const code = (inviteCode || joinFromUrl).trim().toUpperCase();
    if (!code || code.length < 4) {
      setError('Bitte einen gültigen 6-stelligen Code eingeben.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Bitte zuerst anmelden, um beizutreten.');
      return;
    }
    setJoining(true);
    const { data: game, error: fetchErr } = await supabase
      .from('games')
      .select('id, player1_id')
      .eq('invite_code', code)
      .eq('status', 'waiting')
      .single();
    if (fetchErr || !game) {
      setJoining(false);
      const err = fetchErr as { code?: string; message?: string } | null;
      setError(!game || err?.code === 'PGRST116' ? 'Code nicht gefunden. Ist das Spiel noch offen?' : (err?.message ?? 'Fehler'));
      return;
    }
    if (game.player1_id === user.id) {
      setJoining(false);
      setError('Das ist dein eigenes Spiel — warte auf einen Mitspieler oder teile den Link.');
      return;
    }
    const { error: updErr } = await supabase
      .from('games')
      .update({ player2_id: user.id, status: 'active' })
      .eq('id', game.id);
    setJoining(false);
    if (updErr) {
      setError('Beitreten fehlgeschlagen: ' + updErr.message);
      return;
    }
    router.push(`${gamePath}?mode=pvp&id=${game.id}`);
  }

  function startRoulette() {
    const session: RouletteSession = { rounds: ROULETTE_ROUNDS, current: 1, wins: 0 };
    if (typeof window !== 'undefined') sessionStorage.setItem(ROULETTE_SESSION_KEY, JSON.stringify(session));
    setRouletteSession(session);
    setRouletteEnded(null);
    void findMatch(false);
  }

  function cancelRoulette() {
    if (typeof window !== 'undefined') sessionStorage.removeItem(ROULETTE_SESSION_KEY);
    setRouletteSession(null);
    setRouletteEnded(null);
    void leaveQueue();
  }

  const title = VARIANT_TITLES[variant] ?? 'Lobby';

  if (!authReady) {
    return (
      <PageShell backHref="/" header={<AppHeader title={title + ' Lobby'} showRanking showAuth />}>
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
          <p className="text-game-text-muted text-center py-8">Lade…</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell backHref="/" header={<AppHeader title={title + ' Lobby'} showRanking showAuth />}>
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
        {activePvpGame && (
          <Card className="border-game-primary/30 bg-game-primary/5">
            <CardContent className="pt-6">
              <p className="text-game-text font-medium mb-3">Du hast ein laufendes Spiel.</p>
              <div className="flex gap-2">
                <Link href={`/game/${activePvpGame.variant}?mode=pvp&id=${activePvpGame.id}`} className="flex-1">
                  <Button className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30">
                    Weiterspielen
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="shrink-0 border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text"
                  onClick={async () => {
                    const { error: err } = await supabase.from('games').update({ status: 'abandoned' }).eq('id', activePvpGame.id);
                    if (err) return;
                    try {
                      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('stacktactoe_active_pvp');
                    } catch {}
                    setActivePvpGame(null);
                    router.refresh();
                    router.push('/');
                  }}
                >
                  Spiel beenden
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="border-game-accent/20">
          <CardHeader>
            <CardTitle className="font-display text-game-text">Schnell-Suche</CardTitle>
            <CardDescription className="text-game-text-muted">
              Finde automatisch einen Gegner für eine Partie.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchmaking === 'searching' ? (
              <>
                <p className="text-game-text text-center animate-pulse">
                  Suche läuft… Warte auf einen Gegner. Du kannst die Seite offen lassen.
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 h-2 rounded-full bg-game-bg-subtle overflow-hidden">
                    <div className="h-full w-1/3 rounded-full bg-game-primary animate-[pulse_1.5s_ease-in-out_infinite]" />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text"
                  onClick={() => void leaveQueue()}
                >
                  Suche abbrechen
                </Button>
              </>
            ) : (
              <Button
                className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30"
                onClick={() => void findMatch(false)}
              >
                Schnellsuche starten
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-game-secondary/20">
          <CardHeader>
            <CardTitle className="font-display text-game-text">Roulette</CardTitle>
            <CardDescription className="text-game-text-muted">
              Nacheinander gegen {ROULETTE_ROUNDS} wechselnde Gegner spielen. Eine Partie pro Gegner.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rouletteEnded !== null ? (
              <>
                <p className="text-game-text text-center font-medium">
                  Roulette beendet. Siege: {rouletteEnded.wins}/{rouletteEnded.rounds}
                </p>
                <Button
                  variant="outline"
                  className="w-full border-game-border text-game-text hover:bg-game-surface-hover"
                  onClick={() => setRouletteEnded(null)}
                >
                  Schließen
                </Button>
              </>
            ) : rouletteSession && matchmaking === 'searching' ? (
              <>
                <p className="text-game-text text-center animate-pulse">
                  Roulette: Suche Gegner {rouletteSession.current}/{rouletteSession.rounds} …
                </p>
                <div className="flex justify-center">
                  <div className="h-2 w-32 rounded-full bg-game-bg-subtle overflow-hidden">
                    <div className="h-full w-1/3 rounded-full bg-game-secondary animate-[pulse_1.5s_ease-in-out_infinite]" />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text"
                  onClick={cancelRoulette}
                >
                  Roulette abbrechen
                </Button>
              </>
            ) : !rouletteSession ? (
              <Button
                className="w-full bg-game-secondary/20 border-game-secondary/30 text-game-secondary hover:bg-game-secondary/30"
                onClick={startRoulette}
                disabled={matchmaking === 'searching'}
              >
                Roulette starten ({ROULETTE_ROUNDS} Partien)
              </Button>
            ) : (
              <p className="text-game-text-muted text-sm text-center">
                Partie {rouletteSession.current}/{rouletteSession.rounds} — Siege: {rouletteSession.wins}. Nach dem Match geht es automatisch weiter.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-game-primary/20">
          <CardHeader>
            <CardTitle className="font-display text-game-text">Räume</CardTitle>
            <CardDescription className="text-game-text-muted">
              Erstelle einen Raum oder trete per Code bei. Im Raum könnt ihr Partien starten und gegeneinander spielen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/rooms?tab=${variant}`}>
              <Button variant="outline" className="w-full border-game-primary/30 text-game-primary hover:bg-game-primary/10 hover:text-game-primary">
                Räume öffnen
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-game-accent/20">
          <CardHeader>
            <CardTitle className="font-display text-game-text">Turniere</CardTitle>
            <CardDescription className="text-game-text-muted">
              K.-o.-Turniere erstellen, anmelden und Bracket spielen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/tournaments">
              <Button variant="outline" className="w-full border-game-accent/30 text-game-accent hover:bg-game-accent/10 hover:text-game-accent">
                Turniere öffnen
              </Button>
            </Link>
          </CardContent>
        </Card>

        {error && <p className="text-xs text-game-danger text-center">{error}</p>}

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-game-text">Neue Partie erstellen</CardTitle>
              <CardDescription className="text-game-text-muted">
                {variant === 'schach' ? 'Modus Schach (Platzieren + Bewegen). ' : variant === 'pool' ? 'Modus Pool (gemeinsamer Vorrat). ' : ''}
                Erstelle ein Spiel und teile den Einladungscode mit deinem Gegner.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {createdGame ? (
                <>
                  <p className="text-sm text-game-text font-mono tracking-widest">{createdGame.code}</p>
                  <p className="text-xs text-game-text-muted">Teile den Code oder den Link. Warte auf deinen Gegner.</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30"
                        onClick={() => {
                          const url = typeof window !== 'undefined' ? `${window.location.origin}${lobbyPath}?join=${createdGame.code}` : '';
                          void (typeof navigator !== 'undefined' && navigator.clipboard?.writeText(url).then(() => {
                            setCopyFeedback(true);
                            setTimeout(() => setCopyFeedback(false), 2000);
                          }));
                        }}
                      >
                        {copyFeedback ? '✓ Kopiert!' : 'Link kopieren'}
                      </Button>
                      <Link href={`${gamePath}?mode=pvp&id=${createdGame.gameId}`}>
                        <Button variant="outline" className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text">
                          Zum Spiel
                        </Button>
                      </Link>
                    </div>
                    <Button
                      variant="ghost"
                      className="text-game-text-muted hover:text-game-danger text-xs"
                      onClick={async () => {
                        await supabase.from('games').update({ status: 'abandoned' }).eq('id', createdGame.gameId);
                        setCreatedGame(null);
                      }}
                    >
                      Spiel abbrechen
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button
                    className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30"
                    onClick={() => void createGame()}
                    disabled={creating}
                  >
                    {creating ? 'Erstelle…' : 'Spiel erstellen'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-game-text">Partie beitreten</CardTitle>
              <CardDescription className="text-game-text-muted">
                Gib den 6-stelligen Code deines Freundes ein.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="ABC123"
                className="bg-game-bg-subtle/40 border-game-border font-mono text-lg tracking-widest uppercase text-game-text"
                maxLength={6}
                value={inviteCode || joinFromUrl}
                onChange={(e) => setInviteCode(e.target.value.trim().toUpperCase())}
              />
              <Button
                className="w-full bg-game-accent/20 border-game-accent/30 text-game-accent hover:bg-game-accent/30"
                onClick={() => void joinByCode()}
                disabled={joining}
              >
                {joining ? 'Beitreten…' : 'Beitreten'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
