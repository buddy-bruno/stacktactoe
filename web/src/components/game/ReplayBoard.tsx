'use client';

import type { STT } from '@/lib/game/stt';
import type { Player } from '@/lib/game/stt';
import { PieceSvg } from './PieceSvg';

interface ReplayBoardProps {
  stt: STT;
  mySide: Player;
  className?: string;
}

/** Read-only 3×3 board for round replay in modal. Zellen quadratisch, Figuren runterskaliert. */
export function ReplayBoard({ stt, className = '' }: ReplayBoardProps) {
  return (
    <div
      className={`grid grid-cols-3 gap-1 p-2 w-full max-w-[200px] mx-auto rounded-xl aspect-square ${className}`}
      style={{
        background: 'var(--game-board-bg)',
        border: 'var(--game-board-border)',
        boxShadow: 'var(--game-board-shadow)',
      }}
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
        const stack = stt.board[i] ?? [];
        const vis = stack.slice(-3);
        const isWin = stt.wl?.includes(i);
        return (
          <div
            key={i}
            className={`cell relative aspect-square rounded-md overflow-visible flex items-center justify-center
              ${isWin ? 'ring-2 ring-game-success/50' : ''}
              bg-gradient-to-br from-white/5 to-white/[0.02] border border-game-border
            `}
          >
            {vis.map((p, idx) => {
              const isTop = idx === vis.length - 1;
              const layer = isTop ? '' : ' opacity-30 scale-90';
              const xOff = isTop ? 0 : -2 + idx * 2;
              const yOff = -idx * 8;
              const w = p.size === 'small' ? 22 : p.size === 'medium' ? 28 : 34;
              const h = p.size === 'small' ? 36 : p.size === 'medium' ? 44 : 56;
              return (
                <div
                  key={idx}
                  className={`absolute left-1/2 top-1/2 pointer-events-none ${layer}`}
                  style={{
                    transform: `translate(calc(-50% + ${xOff}px), calc(-50% + ${yOff}px))`,
                    zIndex: 5 + idx,
                    width: w,
                    height: h,
                  }}
                >
                  <PieceSvg player={p.player} size={p.size} className="w-full h-full block" />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
