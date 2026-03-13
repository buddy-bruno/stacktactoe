'use client';

import Link from 'next/link';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type GameModeKey = 'ai' | 'pvp' | 'daily' | 'puzzle' | 'blitz' | 'classic';

const MODE_CONFIG: Record<GameModeKey, { icon: React.ReactNode; iconBox: string }> = {
  classic: {
    icon: <span className="text-2xl leading-none" aria-hidden>🎮</span>,
    iconBox: 'bg-game-mode-ai/10 border-game-mode-ai/20 text-game-mode-ai',
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
};

interface ModeCardProps {
  mode: GameModeKey;
  title: string;
  description: string;
  href: string;
  fullWidth?: boolean;
  /** Badge oben rechts, z. B. "Coming soon" */
  badge?: string;
  /** Karte nicht klickbar (z. B. Coming soon) */
  comingSoon?: boolean;
  /** Icon-Box ausblenden (z. B. Play-Seite: Gegen KI ohne Icon) */
  hideIcon?: boolean;
}

export function ModeCard({ mode, title, description, href, fullWidth, badge, comingSoon, hideIcon }: ModeCardProps) {
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
        {badge && (
          <CardAction>
            <span className="rounded-md bg-game-text-muted/20 px-2 py-0.5 text-xs font-medium text-game-text-muted">
              {badge}
            </span>
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
