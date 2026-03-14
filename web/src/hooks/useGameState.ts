'use client';

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { STT } from '@/lib/game/stt';
import { getEngineConfig, createState, migrateToSchach } from '@/lib/game/engine';
import { AI } from '@/lib/game/ai';
import type { Move, Player, PieceSize } from '@/lib/game/stt';
import type { Difficulty } from '@/lib/game/ai';
import type { ScoreCount } from '@/lib/game/match-state';
import { ROUNDS_TOTAL, WINS_TO_MATCH } from '@/lib/game/match-state';
import { calcPts, serializeMatchState, deserializeMatchState, BLITZ_TIMEOUT_WIN_PTS } from '@/lib/game/scoring';
import { BLITZ_SEC } from '@/components/game/BlitzTimer';
import { supabase } from '@/lib/supabase';

const BLITZ_MS = BLITZ_SEC * 1000;

const emptyScore = (): ScoreCount => ({ total: 0, wins: 0, moves: 0, rnd: 0 });

function getGamePieceColors(): { primary: string; secondary: string } {
  /* Fallbacks = --game-primary / --game-secondary aus globals.css (Single Source of Truth) */
  if (typeof document === 'undefined') return { primary: '#38bdf8', secondary: '#fb923c' };
  const s = getComputedStyle(document.documentElement);
  return {
    primary: s.getPropertyValue('--game-primary').trim() || '#38bdf8',
    secondary: s.getPropertyValue('--game-secondary').trim() || '#fb923c',
  };
}

export type GameMode = 'ai' | 'pvp' | 'daily';
export type MyRole = 'player1' | 'player2';

export type InitialMatchState = {
  stt: STT;
  sc: { human: ScoreCount; ai: ScoreCount };
  round: number;
  roundResults: ('human' | 'ai' | null)[];
};

export type GameVariant = import('@/lib/game/engine').GameVariant;

export function useGameState(
  mode: GameMode,
  options: {
    gameId?: string | null;
    difficulty?: Difficulty;
    blitz?: boolean;
    myRole?: MyRole;
    userId?: string | null;
    initialMatchState?: InitialMatchState | null;
    /** Classic oder Schach – Engine-Konfiguration kommt aus @/lib/game/engine */
    gameVariant?: GameVariant;
    onRoundEnd?: (round: number, winner: Player | null) => void;
    onMatchEnd?: (masterSide: Player | null, p1Points: number, p2Points: number, p1Wins: number, p2Wins: number) => void;
  }
) {
  const { gameId, difficulty = 'easy', blitz, myRole = 'player1', userId, initialMatchState, gameVariant = 'classic', onRoundEnd, onMatchEnd } = options;
  const { placementOnly } = getEngineConfig(gameVariant);

  const [stt, setStt] = useState<STT>(() => {
    if (initialMatchState?.stt) return initialMatchState.stt;
    return createState(gameVariant);
  });
  const [sc, setSc] = useState<{ human: ScoreCount; ai: ScoreCount }>(() => initialMatchState?.sc ?? { human: emptyScore(), ai: emptyScore() });
  const [round, setRound] = useState(() => initialMatchState?.round ?? 1);
  const [roundResults, setRoundResults] = useState<('human' | 'ai' | null)[]>(() => initialMatchState?.roundResults ?? []);
  const [locked, setLocked] = useState(false);
  const [modal, setModal] = useState<'round' | 'match' | null>(null);
  const [lastRoundWinner, setLastRoundWinner] = useState<Player | null>(null);
  /** Zelle, in die die KI/Gegner zuletzt gesetzt hat (für Einblend-Animation). Nach kurzer Zeit zurückgesetzt. */
  const [lastPlacedCell, setLastPlacedCell] = useState<number | null>(null);
  /** Größe der zuletzt vom Gegner/KI vom Dock gelegten Figur (für Dock-Animation). */
  const [lastUsedPieceSize, setLastUsedPieceSize] = useState<PieceSize | null>(null);
  /** Zustände pro Zug für Replay im Runden-Popup (Start + nach jedem Zug). */
  const [roundReplayStates, setRoundReplayStates] = useState<STT[]>([]);

  const mySide: Player = myRole === 'player1' ? 'human' : 'ai';
  const oppSide: Player = mySide === 'human' ? 'ai' : 'human';
  const aiRef = useRef(new AI(difficulty));
  const sttRef = useRef(stt);
  const runAiTurnRef = useRef<() => void>(() => {});
  const pvpSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const blitzTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blitzAiDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blitzAiTimeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchStartTimeRef = useRef<number>(0);
  /** Blitz: Runde, für die wir Human-Timeout bereits ausgewertet haben (zwei Timer-Instanzen → nur einmal zählen). */
  const blitzTimeoutHandledRoundRef = useRef<number | null>(null);
  useEffect(() => {
    matchStartTimeRef.current = Date.now();
  }, []);

  // Apply initial PvP state when loaded from server
  useEffect(() => {
    if (mode !== 'pvp' || !initialMatchState) return;
    // Defer to avoid synchronous setState in effect
    const t = setTimeout(() => {
      setStt(initialMatchState.stt);
      setSc(initialMatchState.sc);
      setRound(initialMatchState.round);
      setRoundResults(initialMatchState.roundResults);
    }, 0);
    return () => clearTimeout(t);
  }, [mode, initialMatchState]);

  // Schach: Falls geladener PvP-State noch placementOnly hat, auf Schach umstellen (Route ist Schach).
  useLayoutEffect(() => {
    if (gameVariant !== 'schach') return;
    const current = sttRef.current;
    if (!current.placementOnly) return;
    setStt((prev) => migrateToSchach(prev));
  }, [gameVariant, initialMatchState]);

  useEffect(() => {
    sttRef.current = stt;
  }, [stt]);

  useEffect(() => {
    aiRef.current = new AI(difficulty);
  }, [difficulty]);

  // Cleanup: Blitz-Timer beim Unmount stoppen, um setState nach Unmount und Memory Leaks zu vermeiden
  useEffect(() => {
    return () => {
      if (blitzTimerRef.current) clearTimeout(blitzTimerRef.current);
      blitzTimerRef.current = null;
      if (blitzAiDelayTimerRef.current) clearTimeout(blitzAiDelayTimerRef.current);
      blitzAiDelayTimerRef.current = null;
      if (blitzAiTimeoutTimerRef.current) clearTimeout(blitzAiTimeoutTimerRef.current);
      blitzAiTimeoutTimerRef.current = null;
    };
  }, []);

  const myTurn = stt.cur === mySide && !stt.over && !locked;

  const triggerCapture = useCallback((cellRect: DOMRect, attackerColor: string, defenderColor: string) => {
    const triggerFn = (window as unknown as { triggerCaptureFx?: (x: number, y: number, a: string, d: string) => void }).triggerCaptureFx;
    if (triggerFn) triggerFn(cellRect.left + cellRect.width / 2, cellRect.top + cellRect.height / 2, attackerColor, defenderColor);
  }, []);

  /** @param winnerOverride Wenn gesetzt (z. B. aus runAiTurn), wird dieser Wert genutzt; sonst stt.winner.
   *  @param roundOverride Runde (1-based) für setRoundResults; vermeidet Stale-Closure bei setTimeout. */
  const finishRound = useCallback((winnerOverride?: Player | null, roundOverride?: number) => {
    const winner = winnerOverride !== undefined ? winnerOverride : stt.winner;
    const r = roundOverride ?? round;
    setLastRoundWinner(winner);
    setRoundResults((prev) => {
      const next = [...prev];
      if (r >= 1 && r <= next.length) next[r - 1] = winner;
      return next;
    });
    if (winner === 'human') setSc((s) => ({ ...s, human: { ...s.human, wins: s.human.wins + 1 } }));
    else if (winner === 'ai') setSc((s) => ({ ...s, ai: { ...s.ai, wins: s.ai.wins + 1 } }));
    onRoundEnd?.(r, winner);
    setModal('round');
  }, [stt.winner, round, onRoundEnd]);

  /** Blitz: KI hat 5s überschritten → Mensch gewinnt die Runde (roundNum = 1-based). */
  const triggerBlitzAiTimeout = useCallback((roundNum: number) => {
    if (!blitz) return;
    const state = sttRef.current;
    if (state.over) return;
    const nextStt = state.clone();
    nextStt.over = true;
    nextStt.winner = mySide;
    setStt(nextStt);
    setRoundReplayStates((prev) => [...prev, nextStt.clone()]);
    setLastRoundWinner(mySide);
    setRoundResults((prev) => {
      const next = [...prev];
      next[roundNum - 1] = mySide;
      return next;
    });
    setSc((s) => {
      const winner = mySide;
      return {
        ...s,
        [winner]: {
          ...s[winner],
          wins: s[winner].wins + 1,
          rnd: s[winner].rnd + BLITZ_TIMEOUT_WIN_PTS,
          total: s[winner].total + BLITZ_TIMEOUT_WIN_PTS,
        },
      };
    });
    setLocked(false);
    setTimeout(() => setModal('round'), 400);
  }, [blitz, mySide]);

  const commitHumanMove = useCallback(
    (move: Move, toIndex: number) => {
      const nextStt = stt.clone();
      const ok = move.type === 'place' ? nextStt.place(mySide, move.size, move.index) : nextStt.move(mySide, move.fromIndex, move.toIndex);
      if (!ok) return false;
      const pts = calcPts(stt, move, mySide);
      const before = stt.top(toIndex);
      const wasCapture = !!(before && before.player !== mySide);
      const newSc = {
        ...sc,
        [mySide]: { ...sc[mySide], moves: sc[mySide].moves + 1, rnd: sc[mySide].rnd + pts, total: sc[mySide].total + pts },
      };
      const roundResultsAfterMove = nextStt.over ? [...roundResults.slice(0, round - 1), nextStt.winner] : roundResults;
      setStt(nextStt);
      setLastPlacedCell(null);
      setLastUsedPieceSize(null);
      setRoundReplayStates((prev) => (prev.length === 0 ? [stt.clone(), nextStt.clone()] : [...prev, nextStt.clone()]));
      setSc(newSc);
      if (wasCapture && typeof document !== 'undefined') {
        const el = document.querySelector(`[data-cell-index="${toIndex}"]`);
        const { primary, secondary } = getGamePieceColors();
        if (el) triggerCapture(el.getBoundingClientRect(), mySide === 'human' ? primary : secondary, before!.player === 'human' ? primary : secondary);
      }
      if (nextStt.over) setTimeout(() => finishRound(nextStt.winner, round), 600);
      else if (mode === 'ai' && nextStt.cur === 'ai') {
        sttRef.current = nextStt;
        setTimeout(() => runAiTurnRef.current(), 80);
      }
      // PvP: persist state and move to DB
      if (mode === 'pvp' && gameId && userId) {
        const stateToPersist = serializeMatchState(nextStt, round, roundResultsAfterMove, newSc);
        supabase.from('games').update({ state_json: stateToPersist }).eq('id', gameId).then(() => {});
        supabase.from('moves').insert({
          game_id: gameId,
          player_id: userId,
          role: myRole,
          move_data: move,
          points: pts,
          move_num: newSc[mySide].moves,
        }).then(() => {});
      }
      return true;
    },
    [stt, sc, round, roundResults, mySide, finishRound, triggerCapture, mode, gameId, userId, myRole]
  );

  const runAiTurn = useCallback(() => {
    const state = sttRef.current;
    if (state.over || state.cur !== 'ai' || mode !== 'ai') return;
    setLocked(true);
    const delay = { easy: 1100, mid: 1600, hard: 2200 }[difficulty];
    const currentRound = round;

    if (blitz) {
      blitzAiTimeoutTimerRef.current = setTimeout(() => {
        blitzAiTimeoutTimerRef.current = null;
        if (blitzAiDelayTimerRef.current) {
          clearTimeout(blitzAiDelayTimerRef.current);
          blitzAiDelayTimerRef.current = null;
        }
        triggerBlitzAiTimeout(currentRound);
      }, BLITZ_MS);
    }

    blitzAiDelayTimerRef.current = setTimeout(() => {
      if (blitz && blitzAiTimeoutTimerRef.current) {
        clearTimeout(blitzAiTimeoutTimerRef.current);
        blitzAiTimeoutTimerRef.current = null;
      }
      blitzAiDelayTimerRef.current = null;

      const stateNow = sttRef.current;
      if (stateNow.over) return;

      const mv = aiRef.current.choose(stateNow);
      if (!mv) {
        setStt((g) => {
          const next = g.clone();
          next.over = true;
          next.winner = null;
          return next;
        });
        setRoundResults((prev) => {
          const next = [...prev];
          next[currentRound - 1] = null;
          return next;
        });
        setLastRoundWinner(null);
        setLastPlacedCell(null);
        setLastUsedPieceSize(null);
        setLocked(false);
        onRoundEnd?.(currentRound, null);
        setModal('round');
        return;
      }
      const toIndex = mv.type === 'place' ? mv.index : mv.toIndex;
      const before = stateNow.top(toIndex);
      const wasCapture = !!(before && before.player !== 'ai');
      const pts = calcPts(stateNow, mv, 'ai');
      const nextStt = stateNow.clone();
      if (mv.type === 'place') {
        nextStt.place('ai', mv.size, mv.index);
        setLastUsedPieceSize(mv.size);
      } else {
        nextStt.move('ai', mv.fromIndex, mv.toIndex);
        setLastUsedPieceSize(null);
      }
      setStt(nextStt);
      setLastPlacedCell(toIndex);
      setRoundReplayStates((prev) => [...prev, nextStt.clone()]);
      setSc((s) => ({ ...s, ai: { ...s.ai, moves: s.ai.moves + 1, rnd: s.ai.rnd + pts, total: s.ai.total + pts } }));
      setLocked(false);
      if (wasCapture && typeof document !== 'undefined') {
        const el = document.querySelector(`[data-cell-index="${toIndex}"]`);
        const { primary, secondary } = getGamePieceColors();
        if (el) triggerCapture(el.getBoundingClientRect(), secondary, before!.player === 'human' ? primary : secondary);
      }
      if (nextStt.over) setTimeout(() => finishRound(nextStt.winner), 500);
      else sttRef.current = nextStt;
    }, delay);
  }, [mode, difficulty, blitz, finishRound, triggerCapture, round, onRoundEnd, triggerBlitzAiTimeout]);

  useEffect(() => {
    runAiTurnRef.current = runAiTurn;
  }, [runAiTurn]);

  // PvP: Realtime subscription to receive opponent moves
  useEffect(() => {
    if (mode !== 'pvp' || !gameId) return;
    const channel = supabase.channel('pvp-moves-' + gameId).on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter: 'id=eq.' + gameId },
      (payload: { new: { state_json?: unknown } }) => {
        const row = payload?.new;
        if (!row?.state_json) return;
        try {
          const parsed = deserializeMatchState(row.state_json as Parameters<typeof deserializeMatchState>[0]);
          const prev = sttRef.current;
          let cell: number | null = null;
          let pieceSize: PieceSize | null = null;
          if (prev.cur === oppSide && (parsed.stt.cur === mySide || parsed.stt.over)) {
            for (let i = 0; i < 9; i++) {
              const newStack = parsed.stt.board[i] ?? [];
              const newTop = newStack[newStack.length - 1];
              if (newTop?.player === oppSide) {
                const oldStack = prev.board[i] ?? [];
                const oldTop = oldStack[oldStack.length - 1];
                if (!oldTop || oldTop.player !== oppSide || oldTop.size !== newTop.size) {
                  cell = i;
                  pieceSize = newTop.size;
                  break;
                }
              }
            }
          }
          setStt(parsed.stt);
          setSc(parsed.sc);
          setRound(parsed.round);
          setRoundResults(parsed.roundResults);
          setLocked(parsed.stt.cur !== mySide && !parsed.stt.over);
          if (cell !== null) {
            setLastPlacedCell(cell);
            setLastUsedPieceSize(pieceSize);
          }
          if (parsed.stt.over) {
            setLastRoundWinner(parsed.stt.winner);
            setTimeout(() => setModal('round'), 500);
          }
        } catch {
          // ignore invalid payloads
        }
      }
    ).subscribe();
    pvpSubRef.current = { unsubscribe: () => { supabase.removeChannel(channel); pvpSubRef.current = null; } };
    return () => {
      pvpSubRef.current?.unsubscribe();
    };
  }, [mode, gameId, mySide, oppSide]);

  const nextRound = useCallback(() => {
    setModal(null);
    const p1Wins = sc.human.wins;
    const p2Wins = sc.ai.wins;
    if (round >= ROUNDS_TOTAL || p1Wins >= WINS_TO_MATCH || p2Wins >= WINS_TO_MATCH) {
      const p1Points = sc.human.total;
      const p2Points = sc.ai.total;
      let master: Player | null = null;
      if (p1Wins > p2Wins) master = 'human';
      else if (p2Wins > p1Wins) master = 'ai';
      else if (p1Points > p2Points) master = 'human';
      else if (p2Points > p1Points) master = 'ai';
      onMatchEnd?.(master, p1Points, p2Points, p1Wins, p2Wins);
      setModal('match');
      return;
    }
    const nextRoundNum = round + 1;
    const nextStt = createState(stt.placementOnly ? 'classic' : 'schach');
    const nextSc = { human: { ...sc.human, moves: 0, rnd: 0 }, ai: { ...sc.ai, moves: 0, rnd: 0 } };
    setRound(nextRoundNum);
    setStt(nextStt);
    setLastRoundWinner(null);
    setLastPlacedCell(null);
    setLastUsedPieceSize(null);
    setRoundReplayStates([nextStt.clone()]);
    setSc(nextSc);
    if (mode === 'pvp' && gameId) {
      const stateToPersist = serializeMatchState(nextStt, nextRoundNum, roundResults, nextSc);
      supabase.from('games').update({ state_json: stateToPersist }).eq('id', gameId).then(() => {});
    }
  }, [round, sc, roundResults, mode, gameId, onMatchEnd, stt.placementOnly]);

  /** Match sofort beenden: aktuellen Stand auswerten, onMatchEnd aufrufen, Match-Dialog anzeigen. */
  const endMatchNow = useCallback(() => {
    const p1Points = sc.human.total;
    const p2Points = sc.ai.total;
    const p1Wins = sc.human.wins;
    const p2Wins = sc.ai.wins;
    let master: Player | null = null;
    if (p1Wins > p2Wins) master = 'human';
    else if (p2Wins > p1Wins) master = 'ai';
    else if (p1Points > p2Points) master = 'human';
    else if (p2Points > p1Points) master = 'ai';
    onMatchEnd?.(master, p1Points, p2Points, p1Wins, p2Wins);
    setModal('match');
  }, [sc, onMatchEnd]);

  /** Match beenden und nur onMatchEnd melden (z. B. für „Spiel beenden“ → Root); kein Match-Dialog. */
  const endMatchAndLeave = useCallback(() => {
    const p1Points = sc.human.total;
    const p2Points = sc.ai.total;
    const p1Wins = sc.human.wins;
    const p2Wins = sc.ai.wins;
    let master: Player | null = null;
    if (p1Wins > p2Wins) master = 'human';
    else if (p2Wins > p1Wins) master = 'ai';
    else if (p1Points > p2Points) master = 'human';
    else if (p2Points > p1Points) master = 'ai';
    onMatchEnd?.(master, p1Points, p2Points, p1Wins, p2Wins);
    setModal(null);
  }, [sc, onMatchEnd]);

  const resetMatch = useCallback(() => {
    setModal(null);
    setRound(1);
    blitzTimeoutHandledRoundRef.current = null;
    setRoundResults([]);
    setLastRoundWinner(null);
    setLastPlacedCell(null);
    setLastUsedPieceSize(null);
    setRoundReplayStates([]);
    const nextStt = createState(stt.placementOnly ? 'classic' : 'schach');
    const nextSc = { human: emptyScore(), ai: emptyScore() };
    setStt(nextStt);
    setSc(nextSc);
    matchStartTimeRef.current = Date.now();
    if (mode === 'pvp' && gameId) {
      const stateToPersist = serializeMatchState(nextStt, 1, [], nextSc);
      supabase.from('games').update({ state_json: stateToPersist }).eq('id', gameId).then(() => {});
    }
  }, [mode, gameId, stt.placementOnly]);

  const triggerBlitzTimeout = useCallback(() => {
    if (!blitz || stt.over || stt.cur !== mySide) return;
    if (blitzTimeoutHandledRoundRef.current === round) return;
    blitzTimeoutHandledRoundRef.current = round;
    const nextStt = stt.clone();
    nextStt.over = true;
    nextStt.winner = oppSide;
    setStt(nextStt);
    setRoundReplayStates((prev) => [...prev, nextStt.clone()]);
    setLastRoundWinner(oppSide);
    setRoundResults((prev) => {
      const next = [...prev];
      next[round - 1] = oppSide;
      return next;
    });
    setSc((s) => {
      const winner = oppSide;
      return {
        ...s,
        [winner]: {
          ...s[winner],
          wins: s[winner].wins + 1,
          rnd: s[winner].rnd + BLITZ_TIMEOUT_WIN_PTS,
          total: s[winner].total + BLITZ_TIMEOUT_WIN_PTS,
        },
      };
    });
    setLocked(false);
    setTimeout(() => setModal('round'), 400);
  }, [blitz, stt, mySide, oppSide, round]);

  useEffect(() => {
    if (lastPlacedCell === null && lastUsedPieceSize === null) return;
    const t = setTimeout(() => {
      setLastPlacedCell(null);
      setLastUsedPieceSize(null);
    }, 600);
    return () => clearTimeout(t);
  }, [lastPlacedCell, lastUsedPieceSize]);

  return {
    stt,
    sc,
    round,
    roundResults,
    roundReplayStates,
    locked,
    modal,
    lastRoundWinner,
    lastPlacedCell,
    lastUsedPieceSize,
    mySide,
    oppSide,
    myTurn,
    ROUNDS_TOTAL,
    humanMove: commitHumanMove,
    finishRound,
    nextRound,
    endMatchNow,
    endMatchAndLeave,
    resetMatch,
    runAiTurn,
    setStt,
    setSc,
    setRound,
    setRoundResults,
    setModal,
    gameId,
    mode,
    myRole,
    blitz,
    triggerBlitzTimeout,
    pvpSubRef,
    blitzTimerRef,
  };
}
