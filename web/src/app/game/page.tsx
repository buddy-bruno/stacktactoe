'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, Suspense, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import type { Difficulty } from '@/lib/game';
import type { Player } from '@/lib/game/stt';
import type { MyRole } from '@/hooks/useGameState';
import { useGameState } from '@/hooks/useGameState';
import { deserializeMatchState } from '@/lib/game/scoring';
import { GameBoard } from '@/components/game/GameBoard';
import { GameHelpSidebar } from '@/components/game/GameHelpSidebar';
import { GameRankingSidebar } from '@/components/game/GameRankingSidebar';
import { navLinkClass, navIconButtonClass, navGapClass, headerInnerClass } from '@/components/layout/navStyles';
import { CaptureFx } from '@/components/game/CaptureFx';
import { BlitzTimer } from '@/components/game/BlitzTimer';
import { ReplayBoard } from '@/components/game/ReplayBoard';
import { Trophy, RotateCcw, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { submitDailyScore } from '@/lib/game/daily';
import { cn } from '@/lib/utils';

function GameContent() {
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') || 'ai') as 'ai' | 'pvp' | 'daily';
  const gameId = searchParams.get('id');
  const blitz = searchParams.get('blitz') === '1';
  const [diff, setDiff] = useState<Difficulty>('easy');
  const [started, setStarted] = useState(!!(mode === 'pvp' && gameId));
  const [userId, setUserId] = useState<string | null>(null);
  const [pvpLoading, setPvpLoading] = useState(!!(mode === 'pvp' && gameId));
  const [pvpError, setPvpError] = useState<string | null>(null);
  const [pvpData, setPvpData] = useState<{
    myRole: MyRole;
    initialMatchState: ReturnType<typeof deserializeMatchState>;
    player1Id: string | null;
    player2Id: string | null;
  } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [dailySubmitError, setDailySubmitError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const router = useRouter();
  useEffect(() => {
    if (mode !== 'pvp' || !gameId) return;
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      if (!uid) {
        if (!cancelled) {
          setPvpLoading(false);
          const redirect = encodeURIComponent(`/game?mode=pvp&id=${gameId}`);
          router.replace(`/auth?redirect=${redirect}`);
        }
        return;
      }
      const { data: game, error } = await supabase
        .from('games')
        .select('state_json, player1_id, player2_id, status')
        .eq('id', gameId)
        .single();
      if (cancelled) return;
      if (error || !game) {
        setPvpError('Spiel nicht gefunden');
        setPvpLoading(false);
        return;
      }
      const myRole: MyRole = game.player1_id === uid ? 'player1' : (game.player2_id === uid ? 'player2' : 'player1');
      if (game.player1_id !== uid && game.player2_id !== uid) {
        setPvpError('Du bist nicht Teil dieses Spiels');
        setPvpLoading(false);
        return;
      }
      const initialMatchState = deserializeMatchState((game.state_json as object) ?? {});
      setPvpData({
        myRole,
        initialMatchState,
        player1Id: game.player1_id ?? null,
        player2Id: game.player2_id ?? null,
      });
      setPvpLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mode, gameId, router]);

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
        } catch {}
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
    onMatchEnd: handleMatchEnd,
  });

  const roundReplayStates = game.roundReplayStates ?? [];
  const replayStates = roundReplayStates.length > 0 ? roundReplayStates : [game.stt];
  const [replayStep, setReplayStep] = useState(0);
  useEffect(() => {
    if (game.modal === 'round' && replayStates.length > 0) {
      queueMicrotask(() => setReplayStep(replayStates.length - 1));
    }
  }, [game.modal, roundReplayStates.length, replayStates.length]);

  useEffect(() => {
    if (started) (window as unknown as { __matchStartTime?: number }).__matchStartTime = Date.now();
  }, [started]);

  if (!started) {
    const playBackHref = blitz ? '/play?mode=blitz' : '/play?mode=classic';
    return (
      <PageShell backHref={playBackHref}>
        <AppHeader showRanking showAuth />
        <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
          <h1 className="font-display text-2xl font-bold text-center text-game-text">
            Wie möchtest du spielen?
          </h1>
        </main>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
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
                <Button className="flex-1 bg-game-primary/20 text-game-primary border-game-primary/30 hover:bg-game-primary/30" onClick={() => setStarted(true)}>Spiel starten</Button>
                <Link href={playBackHref}><Button variant="outline" className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text">Abbrechen</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageShell>
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
        <Link href="/lobby"><Button variant="outline" className="border-game-border text-game-text">Zurück zur Lobby</Button></Link>
      </div>
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

  return (
    <div className="min-h-screen max-h-dvh md:max-h-none bg-game-bg text-game-text flex flex-col overflow-hidden md:overflow-visible">
      <CaptureFx />
      <div className="w-full max-w-[var(--game-content-max-width)] mx-auto px-[var(--game-content-padding)] pt-6 shrink-0 flex flex-col flex-1 min-h-0 overflow-y-auto md:overflow-visible overscroll-behavior-contain">
        <header className="rounded-xl p-[1px] shrink-0 shadow-lg shadow-black/5 bg-[var(--game-glass-gradient)] mb-2 overflow-hidden">
          <div className={cn('overflow-hidden', headerInnerClass)}>
            {/* Zeile 1: Logo + Nav (gleicher Stil wie AppHeader) */}
            <div className="flex items-center justify-between p-4 shrink-0">
              <Link href="/" className="font-display font-black text-game-text text-lg tracking-wide shrink-0">
                Stack<em className="text-game-primary not-italic" style={{ textShadow: 'var(--game-logo-glow)' }}>Tac</em>Toe
              </Link>
              <div className="flex-1 min-w-4" aria-hidden />
              <div className={cn('flex items-center min-w-0 justify-end', navGapClass)}>
                <nav className={cn('hidden md:flex items-center min-w-0', navGapClass)} aria-label="Spiel-Aktionen">
                  <button type="button" onClick={() => setRankingOpen(true)} className={navLinkClass}>Rangliste</button>
                  <button type="button" onClick={() => game.resetMatch()} className={navLinkClass}>Neustart</button>
                  <button type="button" onClick={() => setHelpOpen(true)} className={navLinkClass}>Spielregeln</button>
                </nav>
                <div className="flex md:hidden items-center gap-1">
                  <button type="button" className={navIconButtonClass} title="Rangliste" onClick={() => setRankingOpen(true)} aria-label="Rangliste">
                    <Trophy className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                  <button type="button" className={navIconButtonClass} title="Neustart (gleicher Modus)" onClick={() => game.resetMatch()} aria-label="Neustart">
                    <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                  <button type="button" className={navIconButtonClass} title="Spielregeln" onClick={() => setHelpOpen(true)} aria-label="Spielregeln">
                    <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
            {/* Zeile 2: Billboard (Du | Runde | KI) als Erweiterung des Headers */}
            <div className="flex flex-wrap items-stretch justify-between gap-3 md:gap-4 px-4 pb-4 pt-4 border-t border-game-border/50 min-h-[var(--game-billboard-min-h)] md:min-h-[var(--game-billboard-min-h-md)]">
              <div className="flex flex-col gap-2 min-w-0 flex-1 basis-0 max-w-[240px]">
                <div className="flex flex-col gap-2 w-full">
                  <div className="rounded-xl p-[1px] overflow-hidden shadow-sm" style={{ background: 'var(--game-border-gradient)' }}>
                    <div className="flex items-center justify-between gap-2 md:gap-3 w-full px-2.5 py-2.5 md:px-3 md:py-3 rounded-[11px] bg-[var(--game-surface-score-soft)] backdrop-blur-sm border border-game-border-soft-subtle shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                      <span className="font-display font-bold text-game-primary shrink-0 text-sm md:text-base">Du</span>
                      <span className="font-display font-bold text-lg md:text-2xl text-game-accent text-right shrink-0">{myPts} <span className="text-xs md:text-base font-semibold text-game-text-muted"><span className="md:hidden">Pkt.</span><span className="hidden md:inline">Punkte</span></span></span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 justify-center flex-wrap min-h-[10px] mt-2 md:mt-0 flex-shrink-0">
                    {[0, 1, 2, 3, 4].map((i) => {
                      const filled = game.sc[game.mySide].wins > i;
                      return (
                        <div key={i} aria-hidden className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${filled ? 'bg-game-primary ring-2 ring-game-primary/70 shadow-[0_0_8px_var(--game-primary)]' : 'bg-game-border'}`} title={filled ? `Gewonnen ${i + 1}/5` : `Sieg ${i + 1}/5`} />
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0 basis-0 shrink-0 px-2 max-w-[400px] pt-1 md:pt-0">
                <div className="w-full py-1 pt-2 md:pt-1 flex flex-col items-center justify-center text-center">
                  <div className="font-display font-bold text-game-text text-lg md:text-xl">Runde {game.round}/{game.ROUNDS_TOTAL}</div>
                  <p className={`text-xs md:text-sm text-game-text-muted font-medium mt-1 ${game.stt.over ? 'text-game-accent' : ''}`}>
                    {game.stt.over ? (game.stt.winner === null ? 'Unentschieden' : game.stt.winner === game.mySide ? 'Gewonnen' : 'Verloren') : game.locked ? (mode === 'pvp' ? 'Gegner denkt…' : 'KI denkt…') : game.myTurn ? 'Du bist am Zug' : (mode === 'pvp' ? 'Gegner am Zug' : 'KI am Zug')}
                  </p>
                  {game.blitz && <div className="mt-1.5"><BlitzTimer active={game.myTurn && !game.stt.over} onTimeout={game.triggerBlitzTimeout} /></div>}
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-0 flex-1 basis-0 max-w-[240px] items-end">
                <div className="flex flex-col gap-2 w-full">
                  <div className="rounded-xl p-[1px] overflow-hidden shadow-sm" style={{ background: 'var(--game-border-gradient)' }}>
                    <div className={`flex items-center justify-between gap-2 md:gap-3 w-full px-2.5 py-2.5 md:px-3 md:py-3 rounded-[11px] backdrop-blur-sm border border-game-border-soft-subtle shadow-[0_1px_2px_rgba(0,0,0,0.12)] ${!game.myTurn && !game.stt.over ? 'bg-game-secondary/10' : 'bg-[var(--game-surface-score-soft)]'}`}>
                      <span className="font-display font-bold text-game-secondary shrink-0 text-sm md:text-base">{mode === 'pvp' ? 'Gegner' : 'KI'}</span>
                      <span className="font-display font-bold text-lg md:text-2xl text-game-accent text-right shrink-0">{oppPts} <span className="text-xs md:text-base font-semibold text-game-text-muted"><span className="md:hidden">Pkt.</span><span className="hidden md:inline">Punkte</span></span></span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 justify-center flex-wrap min-h-[10px] mt-2 md:mt-0 flex-shrink-0">
                    {[0, 1, 2, 3, 4].map((i) => {
                      const filled = game.sc[game.oppSide].wins > i;
                      return (
                        <div key={i} aria-hidden className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${filled ? 'bg-game-success ring-2 ring-game-success/70 shadow-[0_0_8px_var(--game-success)]' : 'bg-game-border'}`} title={filled ? `Gegner gewonnen ${i + 1}/5` : `Sieg ${i + 1}/5`} />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full pb-[var(--game-dock-reserve-height)] lg:pb-0">
          <main className="w-full flex items-center justify-center flex-1 min-h-0 pt-4 md:pt-0">
          <GameBoard
            stt={game.stt}
            mySide={game.mySide}
            myTurn={game.myTurn}
            locked={game.locked}
            onMove={game.humanMove}
            lastPlacedCell={game.lastPlacedCell}
            lastUsedPieceSize={game.lastUsedPieceSize}
            opponentLabel={mode === 'pvp' ? 'Gegner' : 'KI'}
          />
          </main>
        </div>
      </div>

      <GameHelpSidebar open={helpOpen} onClose={() => setHelpOpen(false)} />
      <GameRankingSidebar open={rankingOpen} onClose={() => setRankingOpen(false)} gameMode={mode} />

      <Dialog open={game.modal !== null} onOpenChange={() => {}}>
        <DialogContent
          className={`bg-game-bg-subtle border-game-border text-game-text ${game.modal === 'round' ? 'sm:max-w-xl max-w-[calc(100%-2rem)] p-5 sm:p-6 gap-5' : ''}`}
          showCloseButton={false}
        >
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 border-game-border h-9 w-9 sm:h-10 sm:w-10"
                      onClick={() => setReplayStep((s) => Math.max(0, s - 1))}
                      disabled={replayStep <= 0}
                      aria-label="Vorheriger Zug"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <ReplayBoard stt={replayStates[replayStep]} mySide={game.mySide} className="flex-shrink-0" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 border-game-border h-9 w-9 sm:h-10 sm:w-10"
                      onClick={() => setReplayStep((s) => Math.min(replayStates.length - 1, s + 1))}
                      disabled={replayStep >= replayStates.length - 1}
                      aria-label="Nächster Zug"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-game-text-muted text-xs sm:text-sm text-center">Zug {replayStep + 1} von {replayStates.length} — Züge durchblättern zum Nachvollziehen</p>
                </>
              ) : (
                <div className="flex justify-center py-2">
                  <ReplayBoard stt={replayStates[0]} mySide={game.mySide} />
                </div>
              )}
              <Button className="w-full mt-2 py-3 text-base bg-game-primary/20 text-game-primary border-game-primary/30 hover:bg-game-primary/30" onClick={game.nextRound} autoFocus>Nächste Runde</Button>
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
              {mode === 'daily' && dailySubmitError && (
                <p className="text-game-danger text-sm">{dailySubmitError}</p>
              )}
              <div className="flex gap-2">
                <Button className="flex-1 bg-game-primary/20 text-game-primary" onClick={() => { game.resetMatch(); game.setModal(null); }} autoFocus>Neues Match</Button>
                <Link href={mode === 'daily' ? '/daily' : mode === 'pvp' ? '/lobby' : blitz ? '/play?mode=blitz' : '/play?mode=classic'}><Button variant="outline" className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text">Zurück</Button></Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-game-bg flex items-center justify-center text-game-text-muted">Lade…</div>}>
      <GameContent />
    </Suspense>
  );
}
