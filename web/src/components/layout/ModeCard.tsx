'use client';

import Link from 'next/link';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type GameModeKey = 'ai' | 'pvp' | 'daily' | 'puzzle' | 'blitz' | 'classic' | 'schach' | 'pool';

const MODE_CONFIG: Record<GameModeKey, { icon: React.ReactNode; iconBox: string }> = {
  classic: {
    icon: <span className="text-2xl leading-none" aria-hidden>🎮</span>,
    iconBox: 'bg-game-mode-ai/10 border-game-mode-ai/20 text-game-mode-ai',
  },
  pool: {
    icon: <span className="text-2xl leading-none" aria-hidden>🃏</span>,
    iconBox: 'bg-game-mode-pool/10 border-game-mode-pool/20 text-game-mode-pool',
  },
  ai: {
    icon: <span className="text-2xl leading-none" aria-hidden>🤖</span>,
    iconBox: 'bg-game-mode-ai/10 border-game-mode-ai/20 text-game-mode-ai',
  },
  pvp: {
    icon: <span className="text-2xl leading-none" aria-hidden>👥</span>,
    iconBox: 'bg-game-mode-pvp/10 border-game-mode-pvp/20 text-game-mode-pvp',
  },
  daily: {
    icon: <span className="text-2xl leading-none" aria-hidden>📅</span>,
    iconBox: 'bg-game-mode-daily/10 border-game-mode-daily/20 text-game-mode-daily',
  },
  puzzle: {
    icon: <span className="text-2xl leading-none" aria-hidden>🧩</span>,
    iconBox: 'bg-game-mode-puzzle/10 border-game-mode-puzzle/20 text-game-mode-puzzle',
  },
  blitz: {
    icon: <span className="text-2xl leading-none" aria-hidden>⚡</span>,
    iconBox: 'bg-game-mode-blitz/10 border-game-mode-blitz/20 text-game-mode-blitz',
  },
  schach: {
    icon: <span className="text-2xl leading-none" aria-hidden>🎯</span>,
    iconBox: 'bg-game-mode-schach/10 border-game-mode-schach/20 text-game-mode-schach',
  },
};

interface ModeCardProps {
  mode: GameModeKey;
  title: string;
  description: string;
  href: string;
  fullWidth?: boolean;
  /** Karte nicht klickbar (z. B. Coming soon) */
  comingSoon?: boolean;
  /** Icon-Box ausblenden */
  hideIcon?: boolean;
  /** Klick auf Badge „Anleitung“ oben rechts → öffnet Sidebar für diesen Spielmodus */
  onAnleitungClick?: () => void;
}

export function ModeCard({ mode, title, description, href, fullWidth, comingSoon, hideIcon, onAnleitungClick }: ModeCardProps) {
  const config = MODE_CONFIG[mode];
  const wrapperClass = fullWidth ? 'sm:col-span-2' : '';
  const card = (
    <Card
      className={cn(
        'bg-game-surface/80 backdrop-blur-2xl',
        !comingSoon && 'hover:-translate-y-1 hover:bg-game-surface/90 transition-all cursor-pointer',
        comingSoon && 'cursor-default opacity-70 saturate-[0.85]'
      )}
    >
      <CardHeader>
        {!hideIcon && (
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-2', config.iconBox)}>
            {config.icon}
          </div>
        )}
        <CardTitle className="font-display text-game-text">{title}</CardTitle>
        <CardDescription className="text-game-text-muted text-base">{description}</CardDescription>
        {onAnleitungClick && (
          <CardAction>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAnleitungClick();
              }}
              className="rounded-lg border border-game-border bg-game-surface/80 px-2.5 py-1 text-xs font-medium text-game-text-muted hover:bg-game-surface hover:text-game-text transition-colors"
            >
              Anleitung
            </button>
          </CardAction>
        )}
      </CardHeader>
    </Card>
  );

  if (comingSoon) {
    return <div className={wrapperClass} aria-disabled="true">{card}</div>;
  }
  return (
    <Link href={href} className={wrapperClass}>
      {card}
    </Link>
  );
}
