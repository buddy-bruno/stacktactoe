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
        const top = stack.length ? stack[stack.length - 1]! : null;
        const isWin = stt.wl?.includes(i);
        const w = top ? (top.size === 'small' ? 22 : top.size === 'medium' ? 28 : 34) : 0;
        const h = top ? (top.size === 'small' ? 36 : top.size === 'medium' ? 44 : 56) : 0;
        return (
          <div
            key={i}
            className={`cell relative aspect-square rounded-md overflow-visible flex items-center justify-center
              ${isWin ? 'ring-2 ring-game-success/50' : ''}
              bg-gradient-to-br from-white/5 to-white/[0.02] border border-game-border
            `}
          >
            {top && (
              <div
                className="absolute left-1/2 top-1/2 pointer-events-none"
                style={{ transform: 'translate(-50%, -50%)', zIndex: 5, width: w, height: h }}
              >
                <PieceSvg player={top.player} size={top.size} className="w-full h-full block" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
