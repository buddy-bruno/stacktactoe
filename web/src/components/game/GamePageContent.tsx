'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import type { Difficulty } from '@/lib/game';
import type { Player } from '@/lib/game/stt';
import type { MyRole } from '@/hooks/useGameState';
import { useGameState } from '@/hooks/useGameState';
import { createState } from '@/lib/game/engine';
import { deserializeMatchState, serializeMatchState } from '@/lib/game/scoring';
import { GameBoard } from '@/components/game/GameBoard';
import { GameHelpSidebar } from '@/components/game/GameHelpSidebar';
import { GameRankingSidebar } from '@/components/game/GameRankingSidebar';
import { CaptureFx } from '@/components/game/CaptureFx';
import { BlitzTimer } from '@/components/game/BlitzTimer';
import { ReplayBoard } from '@/components/game/ReplayBoard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { submitDailyScore } from '@/lib/game/daily';
import { useToast } from '@/components/ToastProvider';

/** Gemeinsamer Spielinhalt – Variante kommt ausschließlich von der Route (Prop), keine Kollision mit anderen Modi. */
export function GamePageContent({ gameVariant }: { gameVariant: 'classic' | 'schach' | 'pool' }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = (searchParams.get('mode') || 'ai') as 'ai' | 'pvp' | 'daily';
  const gameId = searchParams.get('id');
  const blitz = searchParams.get('blitz') === '1';
  const [diff, setDiff] = useState<Difficulty>('easy');
  const [started, setStarted] = useState(!!(mode === 'pvp' && gameId));
  const [userId, setUserId] = useState<string | null>(null);
  const [pvpLoading, setPvpLoading] = useState(!!(mode === 'pvp' && gameId));
  const [pvpError, setPvpError] = useState<string | null>(null);
  const [pvpGameStatus, setPvpGameStatus] = useState<'waiting' | 'active' | 'finished' | 'abandoned' | null>(null);
  const [pvpData, setPvpData] = useState<{
    myRole: MyRole;
    initialMatchState: ReturnType<typeof deserializeMatchState>;
    player1Id: string | null;
    player2Id: string | null;
    inviteCode: string | null;
  } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [dailySubmitError, setDailySubmitError] = useState<string | null>(null);
  const [aiCreating, setAiCreating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)).catch(() => setUserId(null));
  }, []);

  useEffect(() => {
    if (mode !== 'pvp' || !gameId || pvpGameStatus !== 'waiting') return;
    const channel = supabase.channel('game-waiting-' + gameId).on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter: 'id=eq.' + gameId },
      (payload: { new: { status: string; player2_id?: string | null } }) => {
        if (payload?.new?.status === 'active') {
          setPvpGameStatus('active');
          if (payload.new.player2_id) {
            setPvpData((prev) => (prev ? { ...prev, player2Id: payload.new.player2_id ?? null } : prev));
            toast('Gegner ist Partie beigetreten');
          }
        }
      }
    ).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, gameId, pvpGameStatus, toast]);

  // PvP: Wenn Gegner Partie verlässt (status = abandoned), Toast + Redirect zur Startseite
  const abandonedHandledRef = useRef(false);
  useEffect(() => {
    if (mode !== 'pvp' || !gameId || (pvpGameStatus !== 'active' && pvpGameStatus !== 'waiting')) return;
    abandonedHandledRef.current = false;
    const handleAbandoned = () => {
      if (abandonedHandledRef.current) return;
      abandonedHandledRef.current = true;
      toast('Gegner hat Partie verlassen');
      try {
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('stacktactoe_active_pvp');
      } catch {}
      router.replace('/');
    };
    const channel = supabase.channel('game-abandoned-' + gameId).on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter: 'id=eq.' + gameId },
      (payload: { new: { status: string } }) => {
        if (payload?.new?.status === 'abandoned') handleAbandoned();
      }
    ).subscribe();
    const interval = setInterval(async () => {
      const { data } = await supabase.from('games').select('status').eq('id', gameId).single();
      if (data?.status === 'abandoned') handleAbandoned();
    }, 2500);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [mode, gameId, pvpGameStatus, toast, router]);

  useEffect(() => {
    if (mode !== 'pvp' || !gameId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id ?? null;
        if (!uid) {
          if (!cancelled) {
            setPvpLoading(false);
            const redirect = encodeURIComponent(`/game/${gameVariant}?mode=pvp&id=${gameId}`);
            router.replace(`/zugang?redirect=${redirect}`);
          }
          return;
        }
        const { data: game, error } = await supabase
          .from('games')
          .select('state_json, player1_id, player2_id, status, invite_code')
          .eq('id', gameId)
          .single();
        if (cancelled) return;
        if (error || !game) {
          setPvpError('Spiel nicht gefunden');
          setPvpLoading(false);
          return;
        }
        const status = (game.status as 'waiting' | 'active' | 'finished' | 'abandoned') ?? 'waiting';
        const myRole: MyRole = game.player1_id === uid ? 'player1' : (game.player2_id === uid ? 'player2' : 'player1');
        if (game.player1_id !== uid && game.player2_id !== uid) {
          setPvpError('Du bist nicht Teil dieses Spiels');
          setPvpLoading(false);
          return;
        }
        const initialMatchState = deserializeMatchState((game.state_json as object) ?? {});
        setPvpGameStatus(status);
        setPvpData({
          myRole,
          initialMatchState,
          player1Id: game.player1_id ?? null,
          player2Id: game.player2_id ?? null,
          inviteCode: (game as { invite_code?: string | null }).invite_code ?? null,
        });
        if (!cancelled) setPvpLoading(false);
      } catch {
        if (!cancelled) {
          setPvpError('Verbindungsfehler. Bitte Netz prüfen.');
          setPvpLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, gameId, router, gameVariant]);

  const handleMatchEnd = useCallback(
    async (masterSide: Player | null, p1Points: number, p2Points: number, p1Wins: number, _p2Wins: number) => {
      void _p2Wins;
      setDailySubmitError(null);
      if (mode === 'daily') {
        const timeMs = Date.now() - (typeof window !== 'undefined' ? (window as unknown as { __matchStartTime?: number }).__matchStartTime ?? Date.now() : Date.now());
        try {
          await submitDailyScore(p1Points, timeMs, p1Wins);
        } catch {
          setDailySubmitError('Ergebnis konnte nicht gespeichert werden. Bitte melde dich an.');
        }
      }
      if (gameId && userId) {
        let winnerId: string | null = null;
        if (masterSide === 'human') {
          const { data } = await supabase.from('games').select('player1_id').eq('id', gameId).single();
          winnerId = data?.player1_id ?? null;
        } else if (masterSide === 'ai') {
          const { data } = await supabase.from('games').select('player2_id').eq('id', gameId).single();
          winnerId = data?.player2_id ?? null;
        }
        try {
          await supabase.rpc('finish_game', { p_game_id: gameId, p_winner_id: winnerId, p_points_p1: p1Points, p_points_p2: p2Points });
        } catch (err) {
          if (typeof console !== 'undefined' && console.error) console.error('finish_game failed', err);
        }
      }
    },
    [mode, gameId, userId]
  );

  const game = useGameState(mode, {
    gameId: gameId ?? null,
    difficulty: diff,
    blitz,
    myRole: mode === 'pvp' && pvpData ? pvpData.myRole : 'player1',
    userId: mode === 'pvp' ? userId : undefined,
    initialMatchState: mode === 'pvp' && pvpData ? pvpData.initialMatchState : undefined,
    gameVariant,
    onMatchEnd: handleMatchEnd,
  });

  const roundReplayStates = game.roundReplayStates ?? [];
  const replayStates = roundReplayStates.length > 0 ? roundReplayStates : [game.stt];
  const [replayStep, setReplayStep] = useState(0);
  const safeReplayStep = Math.max(0, Math.min(replayStep, replayStates.length - 1));
  const replayState = replayStates[safeReplayStep] ?? game.stt;
  useEffect(() => {
    if (game.modal === 'round' && replayStates.length > 0) {
      queueMicrotask(() => setReplayStep(replayStates.length - 1));
    }
  }, [game.modal, roundReplayStates.length, replayStates.length]);

  useEffect(() => {
    if (started) (window as unknown as { __matchStartTime?: number }).__matchStartTime = Date.now();
  }, [started]);

  const isMainGameView = started && !(mode === 'pvp' && gameId && (pvpLoading || !pvpData || pvpError || pvpGameStatus === 'waiting'));

  // Rejoin: Aktives PvP-Spiel in sessionStorage speichern (für Banner „Weiterspielen“ auf Lobby/Play).
  useEffect(() => {
    if (mode === 'pvp' && gameId && pvpGameStatus === 'active' && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(
          'stacktactoe_active_pvp',
          JSON.stringify({ gameId, variant: gameVariant, updatedAt: Date.now() })
        );
      } catch {
        // ignore
      }
    }
  }, [mode, gameId, gameVariant, pvpGameStatus]);

  useEffect(() => {
    if (!isMainGameView) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isMainGameView]);

  const gameHeaderTitle = blitz ? 'Blitz' : mode === 'daily' ? 'Daily' : gameVariant === 'pool' ? 'Pool' : gameVariant === 'schach' ? 'Schach' : 'Classic';

  if (!started) {
    const playBackHref = blitz ? '/play?mode=blitz' : gameVariant === 'pool' ? '/play?mode=pool' : gameVariant === 'schach' ? '/play?mode=schach' : '/play?mode=classic';
    const difficultyModal = (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="font-display text-game-text">KI-Schwierigkeit wählen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={diff} onValueChange={(v) => setDiff(v as Difficulty)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="easy">Anfänger</TabsTrigger>
                <TabsTrigger value="mid">Schwer</TabsTrigger>
                <TabsTrigger value="hard">Profi</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-game-primary/20 text-game-primary border-game-primary/30 hover:bg-game-primary/30"
                disabled={aiCreating}
                onClick={async () => {
                  if (mode !== 'ai') {
                    setStarted(true);
                    return;
                  }
                  if (!userId) {
                    setStarted(true);
                    return;
                  }
                  setAiCreating(true);
                  try {
                    const stt = createState(gameVariant);
                    const sc = { human: { total: 0, wins: 0, moves: 0, rnd: 0 }, ai: { total: 0, wins: 0, moves: 0, rnd: 0 } };
                    const stateJson = serializeMatchState(stt, 1, [], sc);
                    const { data, error } = await supabase
                      .from('games')
                      .insert({
                        player1_id: userId,
                        player2_id: null,
                        mode: 'ai',
                        difficulty: diff,
                        status: 'active',
                        state_json: stateJson,
                      })
                      .select('id')
                      .single();
                    if (error) throw error;
                    if (data?.id) {
                      const params = new URLSearchParams({ mode: 'ai', id: data.id });
                      if (blitz) params.set('blitz', '1');
                      router.replace(`/game/${gameVariant}?${params.toString()}`);
                    }
                    setStarted(true);
                  } catch {
                    setStarted(true);
                  } finally {
                    setAiCreating(false);
                  }
                }}
              >
                {aiCreating ? 'Erstelle…' : 'Spiel starten'}
              </Button>
              <Link href={playBackHref}>
                <Button variant="outline" className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text">Abbrechen</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
    return (
      <>
        <PageShell backHref={playBackHref} header={<AppHeader title={gameHeaderTitle} showRanking showAuth />}>
          <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
            <h1 className="font-display text-2xl font-bold text-center text-game-text">Wie möchtest du spielen?</h1>
          </main>
        </PageShell>
        {mounted && typeof document !== 'undefined' && createPortal(difficultyModal, document.body)}
      </>
    );
  }

  if (mode === 'pvp' && gameId && (pvpLoading || !pvpData)) {
    return (
      <div className="min-h-screen bg-game-bg text-game-text flex items-center justify-center p-4">
        <p className="text-game-text-muted">Lade Spiel…</p>
      </div>
    );
  }
  if (mode === 'pvp' && gameId && pvpError) {
    return (
      <div className="min-h-screen bg-game-bg text-game-text flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-game-danger text-center">{pvpError}</p>
        <Link href="/lobby">
          <Button variant="outline" className="border-game-border text-game-text">Zurück zur Lobby</Button>
        </Link>
      </div>
    );
  }

  if (mode === 'pvp' && gameId && !pvpLoading && pvpData && pvpGameStatus === 'waiting') {
    const inviteCode = pvpData.inviteCode ?? '';
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/lobby?join=${inviteCode}` : '';
    return (
      <PageShell backHref="/lobby" header={<AppHeader title="Lobby" showRanking showAuth />}>
        <main className="flex-1 flex flex-col items-center justify-center gap-6 py-12 pb-20 px-4">
          <h1 className="font-display text-2xl font-bold text-center text-game-text">Warte auf Gegner</h1>
          <Card className="w-full max-w-md border-game-accent/20">
            <CardHeader>
              <CardTitle className="font-display text-game-text">Partie erstellt</CardTitle>
              <CardDescription className="text-game-text-muted">
                Teile den Einladungslink oder Code mit deinem Gegner. Sobald jemand beitritt, geht es los.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inviteCode && (
                <div className="rounded-lg bg-game-bg-subtle/50 p-3 text-center">
                  <p className="text-xs text-game-text-muted mb-1">Code</p>
                  <p className="font-mono text-lg tracking-widest text-game-text">{inviteCode}</p>
                  <Button variant="outline" size="sm" className="mt-2 border-game-border text-game-text hover:bg-game-surface-hover" onClick={() => void navigator.clipboard?.writeText(shareUrl)}>
                    Link kopieren
                  </Button>
                </div>
              )}
              <p className="text-game-text-muted text-sm text-center animate-pulse">Gegner beitreten… Du kannst die Seite offen lassen.</p>
              <div className="flex justify-center">
                <div className="h-2 w-32 rounded-full bg-game-bg-subtle overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-game-primary animate-[pulse_1.5s_ease-in-out_infinite]" />
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/lobby" className="flex-1">
                  <Button variant="outline" className="w-full border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text">
                    Zurück zur Lobby
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="shrink-0 border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text"
                  onClick={async () => {
                    if (!gameId) return;
                    await supabase.from('games').update({ status: 'abandoned' }).eq('id', gameId);
                    try {
                      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('stacktactoe_active_pvp');
                    } catch {}
                    router.replace('/');
                  }}
                >
                  Spiel beenden
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </PageShell>
    );
  }

  const myPts = game.sc[game.mySide].total;
  const oppPts = game.sc[game.oppSide].total;
  const myWins = game.sc[game.mySide].wins;
  const oppWins = game.sc[game.oppSide].wins;
  let masterSide: Player | null = null;
  if (myWins > oppWins) masterSide = game.mySide;
  else if (oppWins > myWins) masterSide = game.oppSide;
  else if (myPts > oppPts) masterSide = game.mySide;
  else if (oppPts > myPts) masterSide = game.oppSide;
  const iAmMaster = masterSide === game.mySide;

  /** Farben für Du/Gegner passend zu mySide: Player1 = blau (primary), Player2 = orange (secondary). */
  const myLabelColor = game.mySide === 'human' ? 'text-game-primary' : 'text-game-secondary';
  const oppLabelColor = game.mySide === 'human' ? 'text-game-secondary' : 'text-game-primary';

  const backHref = mode === 'daily' ? '/daily' : mode === 'pvp' ? '/lobby' : blitz ? '/play?mode=blitz' : gameVariant === 'pool' ? '/play?mode=pool' : gameVariant === 'schach' ? '/play?mode=schach' : '/play?mode=classic';

  return (
    <div className="fixed inset-0 w-full h-full max-md:min-h-dvh max-md:max-h-dvh max-md:flex md:static md:inset-auto md:w-auto md:h-auto md:min-h-screen md:max-h-dvh bg-game-bg text-game-text flex flex-col overflow-hidden">
      <CaptureFx />
      <div
        className="fixed top-0 left-0 right-0 z-50 flex justify-center"
        style={{ marginTop: 'var(--game-header-margin)', marginBottom: 0, marginLeft: 0, marginRight: 0, background: 'var(--game-bg)' }}
      >
        <div className="w-full max-w-[var(--game-content-max-width)] mx-auto px-[var(--game-content-padding)]">
          <AppHeader
            title={gameHeaderTitle}
            showRanking
            showAuth
            rightSlot={mode === 'pvp' && gameId ? (
              <Button
                variant="outline"
                size="sm"
                className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text text-xs font-medium"
                onClick={async () => {
                  await supabase.from('games').update({ status: 'abandoned' }).eq('id', gameId).then(() => {});
                  try {
                    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('stacktactoe_active_pvp');
                  } catch {}
                  router.replace('/');
                }}
              >
                Spiel beenden
              </Button>
            ) : undefined}
          />
        </div>
      </div>
      <div className="w-full max-w-[var(--game-content-max-width)] mx-auto px-[var(--game-content-padding)] pt-[var(--game-header-height)] pb-4 md:pb-6 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full md:pb-0">
          <main className="w-full flex flex-col items-center flex-1 min-h-0 pt-[var(--game-board-zone-gap)] md:pt-0 max-md:min-h-0 max-md:overflow-hidden" aria-label="Spielbereich">
            <div className="w-full flex flex-col flex-1 min-h-0 max-md:min-h-[200px] mt-4 md:mt-6 max-md:mt-4 max-md:mb-0 mb-4 md:mb-6 game-nav-header rounded-xl p-[1px] shadow-lg shadow-black/5 overflow-hidden max-md:pb-0 pb-[var(--game-dock-reserve-height)] md:pb-0 md:flex-initial md:min-h-0 md:mt-6">
              <div className="min-h-0 flex flex-col flex-1 w-full rounded-[11px] backdrop-blur-2xl bg-game-surface/90">
                <div className="flex flex-wrap items-stretch justify-between gap-3 md:gap-4 px-4 pb-4 pt-4 max-md:px-5 max-md:pt-0 max-md:pb-0 min-h-[var(--game-billboard-min-h)] shrink-0 md:hidden w-full max-md:border-b max-md:border-game-border max-md:grid max-md:grid-cols-[auto_1fr_auto] max-md:gap-4 max-md:items-stretch max-md:justify-between">
                  <div className="flex flex-col gap-2 min-w-0 max-md:min-w-0 md:hidden max-md:justify-self-start max-md:min-h-full max-md:border-r max-md:border-game-border max-md:pr-6 max-md:py-2">
                    <div className="flex flex-col gap-2 max-md:gap-1.5 w-full min-w-0 max-md:min-h-[58px] max-md:justify-center">
                      <div className="flex items-center justify-between gap-4 max-md:gap-5 w-full max-md:flex-col max-md:items-start max-md:gap-0">
                        <span className={`font-display font-bold shrink-0 text-sm ${myLabelColor}`}>Du</span>
                        <span className="font-display font-bold text-lg max-md:text-base text-game-accent text-right shrink-0 tabular-nums max-md:text-left">{myPts} <span className="text-xs font-semibold text-game-text-muted">Pkt.</span></span>
                      </div>
                      <div className="flex gap-1.5 max-md:gap-1 max-md:justify-start justify-center flex-wrap min-h-[10px] mt-2 md:mt-0 max-md:mt-1 max-md:mb-2 flex-shrink-0">
                        {[0, 1, 2, 3, 4].map((i) => {
                          const filled = game.sc[game.mySide].wins > i;
                          return (
                            <div key={i} aria-hidden className={`w-2.5 h-2.5 max-md:w-2 max-md:h-2 rounded-full shrink-0 transition-all ${filled ? 'bg-game-success ring-2 ring-game-success/70 shadow-[0_0_8px_var(--game-success)]' : 'bg-game-border'}`} title={filled ? `Gewonnen ${i + 1}/5` : `Sieg ${i + 1}/5`} />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1 max-md:gap-2 min-w-0 max-md:min-w-[17ch] flex-1 basis-0 shrink-0 md:flex-initial md:basis-auto px-2 max-w-[400px] pt-1 md:pt-0 max-md:pt-0 max-md:justify-self-center">
                    <div className="w-full py-1 pt-2 md:pt-1 max-md:py-0 max-md:pt-0 flex flex-col items-center justify-center text-center max-md:gap-2">
                      <div className="font-display font-bold text-lg max-md:text-xl md:text-xl"><span className="text-game-text">Runde </span><span className="text-game-accent tabular-nums">{game.round}/{game.ROUNDS_TOTAL}</span></div>
                      <p className={`text-xs md:text-sm text-game-text-muted font-medium mt-1 max-md:mt-0 max-md:text-sm ${game.stt.over ? 'text-game-accent' : ''}`}>
                        {game.stt.over ? (game.stt.winner === null ? 'Unentschieden' : game.stt.winner === game.mySide ? 'Gewonnen' : 'Verloren') : game.locked ? (mode === 'pvp' ? 'Gegner denkt…' : 'KI denkt…') : game.myTurn ? 'Du bist am Zug' : mode === 'pvp' ? 'Gegner am Zug' : 'KI am Zug'}
                      </p>
                      {game.blitz && <div className="mt-1.5"><BlitzTimer active={game.myTurn && !game.stt.over} onTimeout={game.triggerBlitzTimeout} /></div>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-0 items-end md:hidden max-md:justify-self-end max-md:min-h-full max-md:border-l max-md:border-game-border max-md:pl-6 max-md:py-2">
                    <div className="flex flex-col gap-2 max-md:gap-1.5 w-full min-w-0 max-md:min-h-[58px] max-md:justify-center">
                      <div className="flex items-center justify-between gap-4 max-md:gap-5 w-full max-md:flex-col max-md:items-start max-md:gap-0">
                        <span className={`font-display font-bold shrink-0 text-sm ${oppLabelColor}`}>{mode === 'pvp' ? 'Gegner' : 'KI'}</span>
                        <span className="font-display font-bold text-lg max-md:text-base text-game-accent text-right shrink-0 tabular-nums max-md:text-left">{oppPts} <span className="text-xs font-semibold text-game-text-muted">Pkt.</span></span>
                      </div>
                      <div className="flex gap-1.5 max-md:gap-1 max-md:justify-start justify-center flex-wrap min-h-[10px] mt-2 md:mt-0 max-md:mt-1 max-md:mb-2 flex-shrink-0">
                        {[0, 1, 2, 3, 4].map((i) => {
                          const filled = game.sc[game.oppSide].wins > i;
                          return (
                            <div key={i} aria-hidden className={`w-2.5 h-2.5 max-md:w-2 max-md:h-2 rounded-full shrink-0 transition-all ${filled ? 'bg-game-success ring-2 ring-game-success/70 shadow-[0_0_8px_var(--game-success)]' : 'bg-game-border'}`} title={filled ? `Gegner gewonnen ${i + 1}/5` : `Sieg ${i + 1}/5`} />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <GameBoard
                  stt={game.stt}
                  mySide={game.mySide}
                  myTurn={game.myTurn}
                  locked={game.locked}
                  onMove={game.humanMove}
                  lastPlacedCell={game.lastPlacedCell}
                  lastUsedPieceSize={game.lastUsedPieceSize}
                  opponentLabel={mode === 'pvp' ? 'Gegner' : 'KI'}
                  allowMovePieces={gameVariant === 'schach'}
                  poolMode={gameVariant === 'pool'}
                  billboardSlot={
                    <div className="flex flex-col items-center justify-center gap-1 px-2 py-3 pb-4">
                      <div className="font-display font-bold text-lg md:text-xl"><span className="text-game-text">Runde </span><span className="text-game-accent tabular-nums">{game.round}/{game.ROUNDS_TOTAL}</span></div>
                      <p className={`text-xs md:text-sm text-game-text-muted font-medium mt-1 ${game.stt.over ? 'text-game-accent' : ''}`}>
                        {game.stt.over ? (game.stt.winner === null ? 'Unentschieden' : game.stt.winner === game.mySide ? 'Gewonnen' : 'Verloren') : game.locked ? (mode === 'pvp' ? 'Gegner denkt…' : 'KI denkt…') : game.myTurn ? 'Du bist am Zug' : mode === 'pvp' ? 'Gegner am Zug' : 'KI am Zug'}
                      </p>
                      {game.blitz && <div className="mt-1.5"><BlitzTimer active={game.myTurn && !game.stt.over} onTimeout={game.triggerBlitzTimeout} /></div>}
                    </div>
                  }
                  leftScoreSlot={
                    <div className="flex flex-col gap-3 w-full shrink-0">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className={`font-display font-bold shrink-0 text-sm ${myLabelColor}`}>Du</span>
                        <span className="font-display font-bold text-base text-game-accent text-right shrink-0">{myPts} <span className="text-xs font-semibold text-game-text-muted">Punkte</span></span>
                      </div>
                      <div className="flex gap-1.5 justify-start flex-wrap min-h-[10px] flex-shrink-0">
                        {[0, 1, 2, 3, 4].map((i) => {
                          const filled = game.sc[game.mySide].wins > i;
                          return (
                            <div key={i} aria-hidden className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${filled ? 'bg-game-success ring-2 ring-game-success/70 shadow-[0_0_8px_var(--game-success)]' : 'bg-game-border'}`} title={filled ? `Gewonnen ${i + 1}/5` : `Sieg ${i + 1}/5`} />
                          );
                        })}
                      </div>
                    </div>
                  }
                  rightScoreSlot={
                    <div className="flex flex-col gap-3 w-full shrink-0">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className={`font-display font-bold shrink-0 text-sm ${oppLabelColor}`}>{mode === 'pvp' ? 'Gegner' : 'KI'}</span>
                        <span className="font-display font-bold text-base text-game-accent text-right shrink-0">{oppPts} <span className="text-xs font-semibold text-game-text-muted">Punkte</span></span>
                      </div>
                      <div className="flex gap-1.5 justify-start flex-wrap min-h-[10px] flex-shrink-0">
                        {[0, 1, 2, 3, 4].map((i) => {
                          const filled = game.sc[game.oppSide].wins > i;
                          return (
                            <div key={i} aria-hidden className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${filled ? 'bg-game-success ring-2 ring-game-success/70 shadow-[0_0_8px_var(--game-success)]' : 'bg-game-border'}`} title={filled ? `Gegner gewonnen ${i + 1}/5` : `Sieg ${i + 1}/5`} />
                          );
                        })}
                      </div>
                    </div>
                  }
                />
              </div>
            </div>
          </main>
        </div>
      </div>

      <GameHelpSidebar open={helpOpen} onClose={() => setHelpOpen(false)} gameVariant={gameVariant} />
      <GameRankingSidebar open={rankingOpen} onClose={() => setRankingOpen(false)} gameMode={mode} />

      <Dialog open={game.modal !== null} onOpenChange={() => {}}>
        <DialogContent className={`bg-game-bg-subtle border-game-border text-game-text ${game.modal === 'round' ? 'sm:max-w-xl max-w-[calc(100%-2rem)] p-5 sm:p-6 gap-5' : ''}`} showCloseButton={false}>
          {game.modal === 'round' && (
            <div className="flex flex-col gap-4 min-h-0">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl text-center">
                  <span className={game.lastRoundWinner === null ? 'text-game-accent' : game.lastRoundWinner === game.mySide ? 'text-game-success' : 'text-game-danger'}>
                    {game.lastRoundWinner === null ? 'Unentschieden' : game.lastRoundWinner === game.mySide ? 'Gewonnen' : 'Verloren'}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <p className="text-game-text-muted text-sm text-center">Runde {game.round} — Punkte diese Runde: {game.sc[game.mySide].rnd}</p>
              {replayStates.length > 1 ? (
                <>
                  <div className="flex items-center justify-center gap-3 sm:gap-4 py-3">
                    <Button type="button" variant="outline" size="icon" className="shrink-0 border-game-border h-9 w-9 sm:h-10 sm:w-10" onClick={() => setReplayStep((s) => Math.max(0, s - 1))} disabled={replayStep <= 0} aria-label="Vorheriger Zug">
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <ReplayBoard stt={replayState} mySide={game.mySide} className="flex-shrink-0" />
                    <Button type="button" variant="outline" size="icon" className="shrink-0 border-game-border h-9 w-9 sm:h-10 sm:w-10" onClick={() => setReplayStep((s) => Math.min(replayStates.length - 1, s + 1))} disabled={replayStep >= replayStates.length - 1} aria-label="Nächster Zug">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-game-text-muted text-xs sm:text-sm text-center">Zug {replayStep + 1} von {replayStates.length} — Züge durchblättern zum Nachvollziehen</p>
                </>
              ) : (
                <div className="flex justify-center py-2">
                  <ReplayBoard stt={replayState} mySide={game.mySide} />
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <Button className="flex-1 py-3 text-base bg-game-primary/20 text-game-primary border-game-primary/30 hover:bg-game-primary/30" onClick={game.nextRound} autoFocus>Nächste Runde</Button>
                <Button variant="outline" className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text py-3 text-base shrink-0" onClick={() => { game.endMatchAndLeave(); router.push('/'); }}>Spiel beenden</Button>
              </div>
            </div>
          )}
          {game.modal === 'match' && (
            <>
              <DialogHeader>
                <DialogTitle className={masterSide === null ? 'text-game-accent' : iAmMaster ? 'text-game-success' : 'text-game-danger'}>
                  {masterSide === null ? 'Unentschieden' : iAmMaster ? 'Gewonnen' : 'Verloren'}
                </DialogTitle>
              </DialogHeader>
              <p className="text-game-text-muted text-sm">{masterSide === null ? 'Das Match endet unentschieden.' : iAmMaster ? 'Du hast das Match gewonnen!' : 'Du hast das Match verloren.'}</p>
              {mode === 'daily' && dailySubmitError && <p className="text-game-danger text-sm">{dailySubmitError}</p>}
              <div className="flex gap-2">
                <Button className="flex-1 bg-game-primary/20 text-game-primary" onClick={() => { game.resetMatch(); game.setModal(null); }} autoFocus>Neues Match</Button>
                {mode === 'pvp' && searchParams.get('roulette') === '1' ? (
                  <Button variant="outline" className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text" onClick={() => { const result = masterSide === null ? 'draw' : iAmMaster ? 'win' : 'loss'; if (typeof window !== 'undefined') window.sessionStorage.setItem('stacktactoe_roulette_last_result', result); router.push('/lobby?roulette=1'); }}>Zurück</Button>
                ) : (
                  <Link href={backHref}><Button variant="outline" className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text">Zurück</Button></Link>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
