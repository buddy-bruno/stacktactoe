'use client';

import type { Player, PieceSize } from '@/lib/game/stt';

const PIECE_IMAGE_BY_SIZE: Record<PieceSize, string> = {
  small: '/pieces/pawn.png',
  medium: '/pieces/queen.png',
  large: '/pieces/king.png',
};

/** An Theme angepasst: Spieler/Gegner/Pool – harmonisch zum dunklen Hintergrund, keine grellen Farben. */
const PIECE_FILL: Record<'human' | 'ai' | 'neutral', string> = {
  human: 'var(--game-piece-human-mid)',   // Blau aus Theme
  ai: 'var(--game-piece-ai-mid)',          // Orange aus Theme
  neutral: 'var(--game-piece-neutral)',   // Dezent grau (Pool)
};

/** Neue Spielfiguren (Grau-PNG): per Mask eingefärbt, kein schwarzer Hintergrund. */
function PieceImage({ size, variant, className }: { size: PieceSize; variant: 'human' | 'ai' | 'neutral'; className: string }) {
  const src = PIECE_IMAGE_BY_SIZE[size];
  const fill = PIECE_FILL[variant];
  return (
    <div
      className={`piece-fig piece-fig--${variant} ${className}`}
      style={{
        backgroundColor: fill,
        maskImage: `url(${src})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskImage: `url(${src})`,
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
      }}
      aria-hidden
    />
  );
}

export function PieceSvg({ player, size, className = '', variant }: { player: Player; size: PieceSize; className?: string; variant?: 'human' | 'ai' | 'neutral' }) {
  const tone: 'human' | 'ai' | 'neutral' = variant ?? (player === 'human' ? 'human' : 'ai');
  return <PieceImage size={size} variant={tone} className={className} />;
}
