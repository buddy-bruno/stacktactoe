'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavSidebar } from './NavSidebar';
import { headerInnerClass } from './navStyles';

interface AppHeaderProps {
  showRanking?: boolean;
  showAuth?: boolean;
  /** Links im Header, z. B. "Classic", "Schach", "Lobby" */
  title?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function AppHeader({
  title,
  rightSlot,
  className,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          'game-nav-header rounded-xl p-[1px] shadow-lg shadow-black/5 overflow-hidden',
          'bg-[var(--game-glass-gradient)]',
          className
        )}
      >
        <div className={cn('grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4 max-lg:py-2.5 max-lg:px-3', headerInnerClass)}>
          <div className="min-w-0 flex items-center justify-start">
            {title != null ? (
              <span className="text-sm sm:text-base font-semibold text-game-text truncate" aria-hidden>
                {title}
              </span>
            ) : (
              <span className="w-0 overflow-hidden" aria-hidden />
            )}
          </div>
          <Link href="/" className="shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-game-primary rounded-lg" aria-label="StackTacToe Startseite">
            <Image src="/stacktactoe-logo.png" alt="StackTacToe" width={220} height={40} className="h-8 w-auto" priority />
          </Link>
          <div className="min-w-0 flex items-center justify-end gap-2">
            {rightSlot}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                'inline-flex items-center justify-center gap-2 h-10 min-h-[40px] px-4 rounded-lg',
                'text-game-text hover:text-game-primary hover:bg-game-surface-hover transition-colors',
                'font-medium text-sm'
              )}
              aria-label="Menü öffnen"
            >
              <Menu className="h-5 w-5 shrink-0" aria-hidden />
              <span>MENÜ</span>
            </button>
          </div>
        </div>
      </header>
      <NavSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
