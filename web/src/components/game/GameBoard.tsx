'use client';

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { PieceSvg } from './PieceSvg';
import type { STT } from '@/lib/game/stt';
import type { Move, Player, PieceSize, PoolSide } from '@/lib/game/stt';

const SN: Record<PieceSize, string> = { small: 'Bauer', medium: 'Dame', large: 'König' };

/** Figurengrößen aus CSS-Variablen (responsiv: kleiner auf Mobile/Tablet) */
function pieceSizeStyle(size: PieceSize): { width: string; height: string } {
  return { width: `var(--piece-${size}-w)`, height: `var(--piece-${size}-h)` };
}

function PieceDockAside({
  variant,
  title,
  children,
  order,
  scoreSlot,
}: {
  variant: 'human' | 'opponent';
  title: string;
  children: React.ReactNode;
  order: 1 | 3;
  scoreSlot?: React.ReactNode;
}) {
  const borderClass = variant === 'human' ? 'border-r border-game-border' : 'border-l border-game-border';
  return (
    <aside className={`hidden md:flex flex-col w-52 xl:w-60 shrink-0 min-h-0 ${borderClass} ${order === 1 ? 'md:order-1' : 'md:order-3'}`} aria-label={title}>
      <div className="piece-dock flex flex-col gap-4 p-4 h-full min-h-0 overflow-auto">
        {scoreSlot != null ? (
          <div className="-mx-4 px-4 pb-5 border-b border-game-border">
            {scoreSlot}
          </div>
        ) : null}
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {children}
        </div>
      </div>
    </aside>
  );
}

type DragState =
  | { type: 'reserve'; size: PieceSize; fromPool: PoolSide; clientX: number; clientY: number; pointerId: number }
  | { type: 'board'; fromIndex: number; size: PieceSize; clientX: number; clientY: number; pointerId: number };

interface GameBoardProps {
  stt: STT;
  mySide: Player;
  myTurn: boolean;
  locked: boolean;
  onMove: (move: Move, toIndex: number) => boolean;
  /** Zelle, in die die KI/Gegner zuletzt gesetzt hat (für Einblend-Animation) */
  lastPlacedCell?: number | null;
  /** Größe der zuletzt vom Gegner/KI gelegten Figur (für Dock-Animation) */
  lastUsedPieceSize?: PieceSize | null;
  /** Desktop: links vom Board (Du + Figurenleiste) */
  leftColumn?: React.ReactNode;
  /** Desktop: rechts vom Board (Gegner-Score) */
  rightColumn?: React.ReactNode;
  /** Desktop: über dem Board (Runde + Status) */
  centerTop?: React.ReactNode;
  /** Label für Gegner-Figurenleiste (z. B. "Gegner" oder "KI") */
  opponentLabel?: string;
  /** Desktop: Score-Block oben in der linken Figurenleiste (Du) */
  leftScoreSlot?: React.ReactNode;
  /** Desktop: Score-Block oben in der rechten Figurenleiste (KI/Gegner) */
  rightScoreSlot?: React.ReactNode;
  /** Desktop: Runde/Status oben in der Mitte (Figurenleisten reichen dann bis oben) */
  billboardSlot?: React.ReactNode;
  /** Schach-Modus: true = Ziehen vom Brett erlauben (strikt getrennt von Classic). Fehlt/undefined = nur aus stt.placementOnly (z. B. PvP/Puzzle). */
  allowMovePieces?: boolean;
  /** Pool-Modus: gemeinsamer Vorrat links und rechts, neutrale Figurenfarben, Entnahme von beiden Seiten. */
  poolMode?: boolean;
}

/**
 * Erkennt zur Laufzeit, ob Pointer Events für die Eingabe genutzt werden sollen.
 * - Ältere Browser ohne PointerEvent → Touch/Mouse-Fallback.
 * - Touch-Geräte (z. B. Xiaomi Redmi, MIUI, Chrome Android): Pointer Events werden dort oft
 *   durch pointercancel/setPointerCapture-Probleme unterbrochen → bewusst Touch-Fallback
 *   nutzen, damit Ziehen mit dem Finger zuverlässig funktioniert.
 */
function usePointerEventsSupported(): boolean {
  const [supported, setSupported] = useState(true);
  useLayoutEffect(() => {
    const hasPointerEvent = typeof window !== 'undefined' && typeof window.PointerEvent === 'function';
    const isPrimaryTouch =
      typeof window !== 'undefined' &&
      'ontouchstart' in window &&
      window.matchMedia('(pointer: coarse)').matches;
    const value = hasPointerEvent && !isPrimaryTouch;
    const id = requestAnimationFrame(() => setSupported(value));
    return () => cancelAnimationFrame(id);
  }, []);
  return supported;
}

export function GameBoard({ stt, mySide, myTurn, locked, onMove, lastPlacedCell = null, lastUsedPieceSize = null, leftColumn, rightColumn, centerTop, opponentLabel = 'Gegner', leftScoreSlot, rightScoreSlot, billboardSlot, allowMovePieces, poolMode }: GameBoardProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverCell, setHoverCell] = useState<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const usePointerEvents = usePointerEventsSupported();
  /** Ziehen vom Brett: wenn Eltern „Schach“ meldet ODER Engine erlaubt Bewegen (placementOnly=false und canMovePieces), dann erlauben – damit Bewegen auch nach Migration/URL-Fehler funktioniert. */
  const allowBoardDrag =
    allowMovePieces === true ||
    (allowMovePieces === undefined && !stt.placementOnly) ||
    (!stt.placementOnly && stt.canMovePieces(mySide));

  const canPlace = useCallback((idx: number) => drag?.type === 'reserve' && stt.canPlace(mySide, drag.size, idx), [drag, stt, mySide]);
  const canMoveTo = useCallback((idx: number) => drag?.type === 'board' && drag.fromIndex !== idx && stt.canMove(mySide, drag.fromIndex, idx), [drag, stt, mySide]);

  const validDrop = hoverCell !== null && (
    (drag?.type === 'reserve' && canPlace(hoverCell)) ||
    (drag?.type === 'board' && canMoveTo(hoverCell))
  );

  /** E: PointerEvent oder synthetisches { pointerId } für Touch/Mouse-Fallback. */
  const handlePointerUp = useCallback((e: { pointerId: number }) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (validDrop && hoverCell !== null) {
      if (drag.type === 'reserve') {
        onMove({ type: 'place', player: mySide, size: drag.size, index: hoverCell, fromPool: drag.fromPool }, hoverCell);
      } else {
        onMove({ type: 'move', player: mySide, fromIndex: drag.fromIndex, toIndex: hoverCell, size: drag.size }, hoverCell);
      }
    }
    setDrag(null);
    setHoverCell(null);
  }, [drag, validDrop, hoverCell, onMove, mySide]);

  /** E: PointerEvent oder synthetisches { clientX, clientY, pointerId } für Touch/Mouse-Fallback. */
  const handlePointerMove = useCallback((e: { clientX: number; clientY: number; pointerId: number }) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    setDrag((d) => d ? { ...d, clientX: e.clientX, clientY: e.clientY } : null);
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest('[data-cell-index]');
    const idx = cell ? parseInt((cell as HTMLElement).dataset.cellIndex ?? '', 10) : null;
    setHoverCell(typeof idx === 'number' && !isNaN(idx) ? idx : null);
  }, [drag]);

  useEffect(() => {
    if (!drag) return;
    const prevTouchAction = document.body.style.touchAction;
    const prevOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.touchAction = 'none';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const pid = drag.pointerId;

    if (usePointerEvents) {
      window.addEventListener('pointermove', handlePointerMove as (e: PointerEvent) => void, { passive: true });
      const onUp = (e: PointerEvent) => handlePointerUp(e);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      return () => {
        document.body.style.touchAction = prevTouchAction;
        document.body.style.overflow = prevOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
        window.removeEventListener('pointermove', handlePointerMove as (e: PointerEvent) => void);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
    }

    const onTouchMove = (e: TouchEvent) => {
      const t = Array.from(e.touches).find((x) => x.identifier === pid);
      if (t) {
        e.preventDefault();
        handlePointerMove({ clientX: t.clientX, clientY: t.clientY, pointerId: pid });
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = Array.from(e.changedTouches).find((x) => x.identifier === pid);
      if (t) handlePointerUp({ pointerId: pid });
    };
    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove({ clientX: e.clientX, clientY: e.clientY, pointerId: pid });
    };
    const onMouseUp = () => handlePointerUp({ pointerId: pid });

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      document.body.style.touchAction = prevTouchAction;
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [drag, handlePointerMove, handlePointerUp, usePointerEvents]);

  const poolModeWithSides = poolMode && (stt.poolLeft != null && stt.poolRight != null);
  const pool = poolMode && !poolModeWithSides && stt.pool ? stt.pool : null;
  const reserveCount = (size: PieceSize, side?: PoolSide) =>
    poolModeWithSides && side != null ? stt.poolCount(side, size) : pool ? (pool[size] ?? 0) : stt.res[mySide][size];
  const canDragFromReserve = (size: PieceSize, side: PoolSide) =>
    (poolModeWithSides ? reserveCount(size, side) : reserveCount(size)) > 0 && (stt.placementOnly ? stt.phase === 'placement' : true) && myTurn && !stt.over;

  const startDragReserve = (size: PieceSize, fromPool: PoolSide, e: React.PointerEvent) => {
    const cnt = poolModeWithSides ? reserveCount(size, fromPool) : reserveCount(size);
    if (!myTurn || locked || stt.over || (poolMode ? stt.phase !== 'placement' : false) || cnt <= 0) return;
    if (!poolMode && stt.phase !== 'placement') return;
    e.preventDefault();
    setDrag({ type: 'reserve', size, fromPool, clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId });
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* ältere Browser ignorieren */ }
  };

  const startDragReserveFromTouch = (size: PieceSize, fromPool: PoolSide, clientX: number, clientY: number, pointerId: number) => {
    const cnt = poolModeWithSides ? reserveCount(size, fromPool) : reserveCount(size);
    if (!myTurn || locked || stt.over || (poolMode ? stt.phase !== 'placement' : false) || cnt <= 0) return;
    if (!poolMode && stt.phase !== 'placement') return;
    setDrag({ type: 'reserve', size, fromPool, clientX, clientY, pointerId });
  };

  const startDragBoard = (fromIndex: number, size: PieceSize, e: React.PointerEvent) => {
    if (!myTurn || locked || stt.over || !allowBoardDrag || (stt.placementOnly || !stt.canMovePieces(mySide))) return;
    e.preventDefault();
    setDrag({ type: 'board', fromIndex, size, clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId });
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* ältere Browser ignorieren */ }
  };

  const startDragBoardFromTouch = (fromIndex: number, size: PieceSize, clientX: number, clientY: number, pointerId: number) => {
    if (!myTurn || locked || stt.over || !allowBoardDrag || (stt.placementOnly || !stt.canMovePieces(mySide))) return;
    setDrag({ type: 'board', fromIndex, size, clientX, clientY, pointerId });
  };

  const oppSide: Player = mySide === 'human' ? 'ai' : 'human';

  const poolSlot = (size: PieceSize, side: PoolSide) => {
    const cnt = poolModeWithSides ? reserveCount(size, side) : reserveCount(size);
    const canUse = poolModeWithSides ? canDragFromReserve(size, side) : canDragFromReserve(size, side);
    const justUsed = !poolModeWithSides && !pool && side === 'right' && size === lastUsedPieceSize;
    return (
      <div
        key={side === 'left' ? size : `${size}-R`}
        className={`dock-slot flex flex-col items-center justify-center text-center p-2 sm:p-3 md:p-4 rounded-xl transition-all min-w-0 ${canUse ? 'cursor-grab active:cursor-grabbing hover:bg-game-primary/5' : ''} ${cnt <= 0 ? 'opacity-30' : ''}`}
        onPointerDown={usePointerEvents && canUse ? (e) => startDragReserve(size, side, e) : undefined}
        onTouchStart={!usePointerEvents && canUse ? (e) => { e.preventDefault(); const t = e.touches[0]; if (t) startDragReserveFromTouch(size, side, t.clientX, t.clientY, t.identifier); } : undefined}
        onMouseDown={!usePointerEvents && canUse ? (e) => { e.preventDefault(); startDragReserveFromTouch(size, side, e.clientX, e.clientY, 0); } : undefined}
      >
        <div className="relative w-16 h-24 flex items-center justify-center dock-slot-figure">
          <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${drag?.type === 'reserve' && drag.size === size && (!poolModeWithSides || drag.fromPool === side) ? 'opacity-10' : ''} ${justUsed ? 'animate-piece-from-dock' : ''}`} style={pieceSizeStyle(size)}>
            {(pool || poolModeWithSides) ? <PieceSvg player={mySide} size={size} variant="neutral" className="w-full h-full" /> : <PieceSvg player={side === 'left' ? mySide : oppSide} size={size} className="w-full h-full" />}
          </div>
        </div>
        <div className="dock-slot-labels flex flex-col max-md:flex-row max-md:items-center max-md:justify-between max-md:gap-2 max-md:w-full max-md:min-w-0">
          <span className="text-sm font-semibold text-game-text mt-2 max-md:mt-1">{SN[size]}</span>
          <span className="font-display text-sm font-bold text-game-accent max-md:mt-0">×{cnt}</span>
        </div>
      </div>
    );
  };

  /** Mobile: eine Leiste unten mit Gesamtmenge (Pool links + rechts). Beim Ziehen fromPool = links wenn vorhanden, sonst rechts. */
  const mobilePoolSlot = (size: PieceSize) => {
    if (!poolModeWithSides) return poolSlot(size, 'left');
    const total = (stt.poolLeft![size] ?? 0) + (stt.poolRight![size] ?? 0);
    const fromPool: PoolSide = (stt.poolLeft![size] ?? 0) > 0 ? 'left' : 'right';
    const canUse = total > 0 && (stt.placementOnly ? stt.phase === 'placement' : true) && myTurn && !stt.over;
    const justUsed = size === lastUsedPieceSize;
    return (
      <div
        key={size}
        className={`dock-slot flex flex-col items-center justify-center text-center p-2 sm:p-3 rounded-xl transition-all min-w-0 ${canUse ? 'cursor-grab active:cursor-grabbing hover:bg-game-primary/5' : ''} ${total <= 0 ? 'opacity-30' : ''}`}
        onPointerDown={usePointerEvents && canUse ? (e) => startDragReserve(size, fromPool, e) : undefined}
        onTouchStart={!usePointerEvents && canUse ? (e) => { e.preventDefault(); const t = e.touches[0]; if (t) startDragReserveFromTouch(size, fromPool, t.clientX, t.clientY, t.identifier); } : undefined}
        onMouseDown={!usePointerEvents && canUse ? (e) => { e.preventDefault(); startDragReserveFromTouch(size, fromPool, e.clientX, e.clientY, 0); } : undefined}
      >
        <div className="relative w-16 h-24 flex items-center justify-center dock-slot-figure">
          <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${drag?.type === 'reserve' && drag.size === size ? 'opacity-10' : ''} ${justUsed ? 'animate-piece-from-dock' : ''}`} style={pieceSizeStyle(size)}>
            <PieceSvg player={mySide} size={size} variant="neutral" className="w-full h-full" />
          </div>
        </div>
        <div className="dock-slot-labels flex flex-col max-md:flex-row max-md:items-center max-md:justify-between max-md:gap-2 max-md:w-full max-md:min-w-0">
          <span className="text-sm font-semibold text-game-text mt-2 max-md:mt-1">{SN[size]}</span>
          <span className="font-display text-sm font-bold text-game-accent max-md:mt-0">×{total}</span>
        </div>
      </div>
    );
  };

  const dockSlots = (
      <div className="grid grid-cols-3 md:grid-cols-1 gap-3 sm:gap-4 md:gap-5 w-full max-md:max-w-none max-w-2xl md:max-w-none">
        {(['small', 'medium', 'large'] as const).map((size) => poolSlot(size, 'left'))}
      </div>
    );

  /** Mobile unten: bei Pool mit Seiten = Gesamtmenge in einer Leiste; sonst = linke Leiste (dockSlots). */
  const mobileDockContent = poolModeWithSides ? (
    <div className="grid grid-cols-3 gap-3 w-full">
      {(['small', 'medium', 'large'] as const).map((size) => mobilePoolSlot(size))}
    </div>
  ) : dockSlots;

  const opponentDockSlots = poolMode ? (
      <div className="grid grid-cols-3 md:grid-cols-1 gap-3 sm:gap-4 md:gap-5 w-full max-md:max-w-none max-w-2xl md:max-w-none">
        {(['small', 'medium', 'large'] as const).map((size) => poolSlot(size, 'right'))}
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:gap-5 w-full">
        {(['small', 'medium', 'large'] as const).map((size) => {
          const cnt = stt.res[oppSide][size];
          const justUsed = size === lastUsedPieceSize;
          return (
            <div
              key={`${size}-${cnt}`}
              className={`dock-slot flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-xl transition-all min-w-0 ${cnt <= 0 ? 'opacity-30' : ''}`}
            >
              <div className="relative w-16 h-24 flex items-center justify-center">
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${justUsed ? 'animate-piece-from-dock' : ''}`} style={pieceSizeStyle(size)}>
                  <PieceSvg player={oppSide} size={size} className="w-full h-full" />
                </div>
              </div>
              <span className="text-sm font-semibold text-game-text mt-2">{SN[size]}</span>
              <span className="font-display text-sm font-bold text-game-accent">×{cnt}</span>
            </div>
          );
        })}
      </div>
    );

    return (
    <>
      <div className="flex flex-col w-full flex-1 min-h-0 md:flex-initial justify-center md:justify-center items-center">
        {/* Billboard — Du | Runde | KI in einem Rahmen (Desktop + Mobil) */}
        {(leftColumn != null || centerTop != null || rightColumn != null) && (
          <div className="w-full mb-4 mt-2 md:mt-0 shrink-0">
            <div className="rounded-2xl p-[1px] w-full shadow-lg shadow-black/5 overflow-hidden bg-[var(--game-glass-gradient)]">
              <div className="flex flex-wrap items-stretch justify-between gap-3 md:gap-4 p-3 md:p-4 rounded-[15px] bg-game-surface/90 backdrop-blur-2xl min-h-[var(--game-billboard-min-h)] md:min-h-[var(--game-billboard-min-h-md)]">
                <div className="flex flex-col gap-2 min-w-0 flex-1 basis-0 max-w-[240px]">
                  {leftColumn}
                </div>
                <div className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0 basis-0 shrink-0 px-2 max-w-[400px]">
                  {centerTop}
                </div>
                <div className="flex flex-col gap-2 min-w-0 flex-1 basis-0 max-w-[240px] items-end">
                  {rightColumn}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Board-Bereich: Mobile flex-1 + min-h-0 damit Brett sichtbar, Desktop unverändert */}
        <div className="w-full flex-1 min-h-0 flex flex-col overflow-auto md:overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-stretch md:justify-between md:gap-4 w-full flex-1 min-h-0 justify-center items-center md:items-stretch min-h-0">
        {/* Desktop: links — Figurenleiste oder Pool */}
        <PieceDockAside variant="human" title={poolMode ? 'Pool' : 'Deine Figuren'} order={1} scoreSlot={leftScoreSlot}>
          {dockSlots}
        </PieceDockAside>

        {/* Center: optional Billboard (Runde/Status) + Spielbrett — auf lg volle Höhe, Leisten daneben */}
        <div className={`flex flex-col items-center justify-center flex-1 min-w-0 min-h-0 order-1 md:order-2 w-full max-w-full md:max-w-[min(92vw,var(--game-board-max-width))] mt-4 md:mt-0 pt-[var(--game-board-margin)] px-[var(--game-board-margin)] pb-6 md:pb-10 box-border overflow-hidden ${billboardSlot ? 'md:justify-start' : ''}`}>
          {billboardSlot && <div className="hidden md:block w-full shrink-0 mb-4 md:mb-6">{billboardSlot}</div>}
          <div className="bwrap w-full min-h-0 min-w-0 flex-1 h-full max-h-full grid place-items-center [container-type:size]">
            <div
              ref={boardRef}
              className="bscene relative w-[min(100cqw,100cqh)] h-[min(100cqw,100cqh)] min-w-0 min-h-0"
              aria-label="Spielbrett"
            >
              <div className="board3d w-full h-full flex items-center justify-center" style={{ perspective: '800px', transformStyle: 'preserve-3d' }}>
                <div
                  className="game-board-frame bsurf grid grid-cols-3 gap-1.5 sm:gap-2 p-3 sm:p-4 w-full h-full min-h-0 min-w-0 rounded-xl sm:rounded-[22px] transition-shadow duration-200"
                  style={{ transform: 'translateZ(12px)' }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                    const stack = stt.board[i] ?? [];
                    const top = stack.length ? stack[stack.length - 1]! : null;
                    const isWin = stt.wl?.includes(i);
                    const hot = hoverCell === i;
                    const valid = drag && (canPlace(i) || canMoveTo(i));
                    const invalid = hot && drag && !valid;
                    const cellCanDrag = top && top.player === mySide && allowBoardDrag && (stt.placementOnly || stt.canMovePieces(mySide)) && myTurn && !locked && !stt.over;
                    return (
                      <div
                        key={i}
                        data-cell-index={i}
                        className={`cell relative min-w-0 w-full aspect-square rounded-[10px] sm:rounded-[13px] transition-colors duration-150 overflow-visible
                          ${isWin ? 'animate-pulse ring-2 ring-game-success/50' : ''}
                          ${hot ? ' border-game-border' : ''}
                          ${valid ? ' border-game-success/50 ring-1 ring-game-success/20' : ''}
                          ${invalid ? ' border-game-danger/30' : ''}
                          border border-game-border-soft-subtle shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]
                          bg-[var(--game-board-cell-bg)]
                          ${cellCanDrag ? 'cursor-grab active:cursor-grabbing' : ''}
                        `}
                        onPointerDown={usePointerEvents && cellCanDrag ? (e) => startDragBoard(i, top!.size, e) : undefined}
                        onTouchStart={!usePointerEvents && cellCanDrag && top ? (e) => { e.preventDefault(); const t = e.touches[0]; if (t) startDragBoardFromTouch(i, top!.size, t.clientX, t.clientY, t.identifier); } : undefined}
                        onMouseDown={!usePointerEvents && cellCanDrag && top ? (e) => { e.preventDefault(); startDragBoardFromTouch(i, top!.size, e.clientX, e.clientY, 0); } : undefined}
                      >
                        {top && (() => {
                          const canDrag = top.player === mySide && allowBoardDrag && (stt.placementOnly || stt.canMovePieces(mySide)) && myTurn && !locked && !stt.over;
                          const isAiJustPlaced = lastPlacedCell === i && top.player === 'ai';
                          const isDraggingFromHere = drag?.type === 'board' && drag.fromIndex === i;
                          return (
                            <div
                              className={`absolute flex items-center justify-center left-1/2 top-1/2 pointer-events-none ${canDrag ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : ''} ${isDraggingFromHere ? 'opacity-10' : ''}`}
                              style={{
                                transform: 'translate(-50%, -50%)',
                                zIndex: 5,
                                ...pieceSizeStyle(top.size),
                                filter: 'var(--game-fig-drop-shadow)',
                              }}
                              onPointerDown={usePointerEvents && canDrag ? (e) => startDragBoard(i, top.size, e) : undefined}
                              onTouchStart={!usePointerEvents && canDrag ? (e) => { e.preventDefault(); const t = e.touches[0]; if (t) startDragBoardFromTouch(i, top.size, t.clientX, t.clientY, t.identifier); } : undefined}
                              onMouseDown={!usePointerEvents && canDrag ? (e) => { e.preventDefault(); startDragBoardFromTouch(i, top.size, e.clientX, e.clientY, 0); } : undefined}
                            >
                              <div className={`w-full h-full flex items-center justify-center ${isAiJustPlaced ? 'animate-piece-drop-in' : ''}`}>
                                <PieceSvg player={top.player} size={top.size} className="w-full h-full block" />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: rechts — Figurenleiste oder Pool */}
        <PieceDockAside variant="opponent" title={poolMode ? 'Pool' : `${opponentLabel} Figuren`} order={3} scoreSlot={rightScoreSlot}>
          {opponentDockSlots}
        </PieceDockAside>

          </div>
        </div>

        {/* Mobil: Figurenleiste unten — bei Pool die ganze Menge (links+rechts) in einer Leiste */}
        <div className="md:hidden w-full flex justify-center pt-1 order-2 overflow-visible shrink-0 border-t border-game-border">
          <div className="w-full px-[var(--game-content-padding)] overflow-visible py-1.5" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}>
            <div className="mobile-dock w-full rounded-xl backdrop-blur-2xl bg-game-surface/90 p-1.5 flex justify-center overflow-visible">
              {mobileDockContent}
            </div>
          </div>
        </div>
      </div>

      {/* Drag-Ghost: gerade, Schatten */}
      {drag && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed pointer-events-none z-[9999] transition-none"
          style={{
            left: drag.clientX,
            top: drag.clientY,
            transform: `translate(-50%, -60%) scale(1.1) ${validDrop ? 'scale(1.14)' : ''}`,
          }}
        >
          <div
            style={{
              ...pieceSizeStyle(drag.size),
              filter: validDrop ? 'none' : 'var(--game-fig-drop-shadow)',
            }}
          >
            <PieceSvg player={mySide} size={drag.size} variant={poolMode ? 'neutral' : undefined} className="w-full h-full" />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
