'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PieceSvg } from './PieceSvg';
import type { STT } from '@/lib/game/stt';
import type { Move, Player, PieceSize } from '@/lib/game/stt';

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
}: {
  variant: 'human' | 'opponent';
  title: string;
  children: React.ReactNode;
  order: 1 | 3;
}) {
  const titleColor = variant === 'human' ? 'text-game-primary' : 'text-game-secondary';
  const tintClass = variant === 'human' ? 'bg-game-primary/[0.03]' : 'bg-game-secondary/[0.03]';
  return (
    <aside className={`hidden lg:flex flex-col gap-4 w-52 xl:w-60 shrink-0 min-h-0 ${order === 1 ? 'lg:order-1' : 'lg:order-3'}`}>
      <div className="game-nav-header rounded-2xl p-[1px] h-full min-h-0 flex flex-col overflow-hidden shadow-lg shadow-black/5">
        <div className={`rounded-[15px] h-full min-h-0 flex flex-col overflow-hidden bg-[var(--game-glass-gradient)] ${tintClass}`}>
          <div className="piece-dock flex flex-col gap-4 p-4 rounded-[15px] h-full min-h-0 overflow-auto">
            <span className={`text-xs font-bold uppercase tracking-widest ${titleColor} text-center pb-2`}>{title}</span>
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              {children}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

type DragState = 
  | { type: 'reserve'; size: PieceSize; clientX: number; clientY: number }
  | { type: 'board'; fromIndex: number; size: PieceSize; clientX: number; clientY: number };

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
}

export function GameBoard({ stt, mySide, myTurn, onMove, lastPlacedCell = null, lastUsedPieceSize = null, leftColumn, rightColumn, centerTop, opponentLabel = 'Gegner' }: GameBoardProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverCell, setHoverCell] = useState<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const canPlace = useCallback((idx: number) => drag?.type === 'reserve' && stt.canPlace(mySide, drag.size, idx), [drag, stt, mySide]);
  const canMoveTo = useCallback((idx: number) => drag?.type === 'board' && drag.fromIndex !== idx && stt.canMove(mySide, drag.fromIndex, idx), [drag, stt, mySide]);

  const validDrop = hoverCell !== null && (
    (drag?.type === 'reserve' && canPlace(hoverCell)) ||
    (drag?.type === 'board' && canMoveTo(hoverCell))
  );

  const handlePointerUp = useCallback(() => {
    if (!drag) return;
    if (validDrop && hoverCell !== null) {
      if (drag.type === 'reserve') {
        onMove({ type: 'place', player: mySide, size: drag.size, index: hoverCell }, hoverCell);
      } else {
        onMove({ type: 'move', player: mySide, fromIndex: drag.fromIndex, toIndex: hoverCell, size: drag.size }, hoverCell);
      }
    }
    setDrag(null);
    setHoverCell(null);
  }, [drag, validDrop, hoverCell, onMove, mySide]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!drag) return;
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
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      document.body.style.touchAction = prevTouchAction;
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [drag, handlePointerMove, handlePointerUp]);

  const startDragReserve = (size: PieceSize, e: React.PointerEvent) => {
    if (!myTurn || stt.over || stt.phase !== 'placement' || stt.res[mySide][size] <= 0) return;
    e.preventDefault();
    setDrag({ type: 'reserve', size, clientX: e.clientX, clientY: e.clientY });
  };

  const startDragBoard = (fromIndex: number, size: PieceSize, e: React.PointerEvent) => {
    if (!myTurn || stt.over || stt.phase !== 'movement') return;
    e.preventDefault();
    setDrag({ type: 'board', fromIndex, size, clientX: e.clientX, clientY: e.clientY });
  };

  const oppSide: Player = mySide === 'human' ? 'ai' : 'human';

  const dockSlots = (
      <div className="grid grid-cols-3 lg:grid-cols-1 gap-1.5 sm:gap-2 lg:gap-3 w-full max-w-2xl lg:max-w-none">
        {(['small', 'medium', 'large'] as const).map((size) => {
          const cnt = stt.res[mySide][size];
          const canUse = cnt > 0 && stt.phase === 'placement' && myTurn && !stt.over;
          return (
            <div
              key={size}
              className={`dock-slot flex flex-col items-center justify-center text-center p-2 sm:p-3 lg:p-4 rounded-xl border transition-all min-w-0 ${canUse ? 'border-game-border cursor-grab active:cursor-grabbing hover:bg-game-primary/5' : 'border-transparent'} ${cnt <= 0 ? 'opacity-30' : ''}`}
              onPointerDown={canUse ? (e) => startDragReserve(size, e) : undefined}
            >
              <div className="relative w-16 h-24 flex items-end justify-center">
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${drag?.type === 'reserve' && drag.size === size ? 'opacity-10' : ''}`} style={pieceSizeStyle(size)}>
                  <PieceSvg player={mySide} size={size} className="w-full h-full" />
                </div>
              </div>
              <span className="text-sm font-semibold text-game-text mt-1.5">{SN[size]}</span>
              <span className="font-display text-sm font-bold text-game-accent">×{cnt}</span>
            </div>
          );
        })}
      </div>
    );

  const opponentDockSlots = (
      <div className="grid grid-cols-1 gap-2 sm:gap-3 w-full">
        {(['small', 'medium', 'large'] as const).map((size) => {
          const cnt = stt.res[oppSide][size];
          const justUsed = size === lastUsedPieceSize;
          return (
            <div
              key={`${size}-${cnt}`}
              className={`dock-slot flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-xl border transition-all min-w-0 ${cnt > 0 ? 'border-game-border/60' : 'border-transparent'} ${cnt <= 0 ? 'opacity-30' : ''}`}
            >
              <div className="relative w-16 h-24 flex items-end justify-center">
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${justUsed ? 'animate-piece-from-dock' : ''}`} style={pieceSizeStyle(size)}>
                  <PieceSvg player={oppSide} size={size} className="w-full h-full" />
                </div>
              </div>
              <span className="text-sm font-semibold text-game-text mt-1.5">{SN[size]}</span>
              <span className="font-display text-sm font-bold text-game-accent">×{cnt}</span>
            </div>
          );
        })}
      </div>
    );

    return (
    <>
      <div className="flex flex-col w-full flex-1 min-h-0 lg:flex-initial justify-center lg:justify-center items-center">
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

        {/* Desktop: Board in der Mitte, Figurenleisten links/rechts (ohne Wrapper-Farbe) */}
        <div className="w-full flex-1 min-h-0 flex flex-col lg:overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-stretch lg:justify-center lg:gap-4 w-full flex-1 min-h-0 justify-center items-center lg:items-stretch min-h-0">
        {/* Desktop: links — Figurenleiste */}
        <PieceDockAside variant="human" title="Deine Figuren" order={1}>
          {dockSlots}
        </PieceDockAside>

        {/* Center: Spielbrett — Höhe nur aus Flex (kein vh), Abstand oben/unten, immer quadratisch, nie Überlappung */}
        <div className="flex flex-col items-center justify-center flex-1 min-w-0 min-h-0 order-1 lg:order-2 w-full max-w-full lg:max-w-[min(92vw,var(--game-board-max-width))] mt-4 lg:mt-0 p-[var(--game-board-margin)] box-border overflow-hidden">
          <div className="bwrap w-full min-h-0 min-w-0 flex-1 h-full max-h-full grid place-items-center">
            <div
              ref={boardRef}
              className="bscene relative h-full max-w-full w-auto aspect-square min-w-0 min-h-0"
              aria-label="Spielbrett"
            >
              <div className="board3d w-full h-full flex items-center justify-center" style={{ perspective: '800px', transformStyle: 'preserve-3d' }}>
                <div
                  className="game-board-frame bsurf grid grid-cols-3 gap-1.5 sm:gap-2 p-3 sm:p-4 w-full h-full min-h-0 rounded-xl sm:rounded-[22px] transition-shadow duration-200"
                  style={{ transform: 'translateZ(12px)' }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                    const stack = stt.board[i] ?? [];
                    const vis = stack.slice(-3);
                    const isWin = stt.wl?.includes(i);
                    const hot = hoverCell === i;
                    const valid = drag && (canPlace(i) || canMoveTo(i));
                    const invalid = hot && drag && !valid;
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
                        `}
                      >
                        {vis.map((p, idx) => {
                          const isTop = idx === vis.length - 1;
                          const canDrag = isTop && p.player === mySide && stt.phase === 'movement' && myTurn && !stt.over;
                          const layer = isTop ? '' : ` opacity-30 scale-90`;
                          const xOff = isTop ? 0 : -5 + idx * 4;
                          const yOff = -idx * 20;
                          const isAiJustPlaced = isTop && lastPlacedCell === i && p.player === 'ai';
                          return (
                            <div
                              key={idx}
                              className={`absolute flex items-center justify-center left-1/2 top-1/2 pointer-events-none ${canDrag ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : ''} ${layer}`}
                              style={{
                                transform: `translate(calc(-50% + ${xOff}px), calc(-50% + ${yOff}px))`,
                                zIndex: 5 + idx,
                                ...pieceSizeStyle(p.size),
                                filter: 'var(--game-fig-drop-shadow)',
                              }}
                              onPointerDown={canDrag ? (e) => startDragBoard(i, p.size, e) : undefined}
                            >
                              <div className={`w-full h-full flex items-center justify-center ${isAiJustPlaced ? 'animate-piece-drop-in' : ''}`}>
                                <PieceSvg player={p.player} size={p.size} className="w-full h-full block" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: rechts — nur Figurenleiste (Score im Billboard) */}
        <PieceDockAside variant="opponent" title={`${opponentLabel} Figuren`} order={3}>
          {opponentDockSlots}
        </PieceDockAside>

          </div>
        </div>

        {/* Mobil: kompakte Figurenleiste, Figuren dürfen nach oben ragen */}
        <div
          className="lg:hidden fixed left-0 right-0 z-30 flex justify-center pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] order-2 overflow-visible"
          style={{ bottom: 'var(--game-dock-bottom-offset, 0)' }}
        >
          <div className="w-full max-w-[var(--game-content-max-width)] mx-auto px-[var(--game-content-padding)] overflow-visible">
            <div className="game-nav-header game-nav-header--dock rounded-xl p-[1px] shadow-lg shadow-black/5 overflow-visible bg-[var(--game-glass-gradient)]">
              <div className="mobile-dock rounded-xl backdrop-blur-2xl bg-game-surface/90 p-1.5 flex justify-center overflow-visible">
                {dockSlots}
              </div>
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
            <PieceSvg player={mySide} size={drag.size} className="w-full h-full" />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
