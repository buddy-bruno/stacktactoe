'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, LogIn, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { navLinkClass, navIconButtonClass, navGapClass, headerInnerClass } from './navStyles';

interface AppHeaderProps {
  showRanking?: boolean;
  showAuth?: boolean;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function AppHeader({
  showRanking = false,
  showAuth = false,
  rightSlot,
  className,
}: AppHeaderProps) {
  /** undefined = noch nicht geladen (kein falsches "Anmelden" anzeigen), null = ausgeloggt, User = eingeloggt */
  const [user, setUser] = useState<SupabaseUser | null | undefined>(undefined);

  useEffect(() => {
    // getSession() zuerst (Cache/Storage, schnell), danach Listener für Anmeldung/Abmeldung
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header
      className={cn(
        'rounded-xl p-[1px] shadow-lg shadow-black/5 overflow-hidden',
        'bg-[var(--game-glass-gradient)]',
        className
      )}
    >
      <div className="w-full max-w-[var(--game-content-max-width)] mx-auto">
        <div className={cn('flex items-center justify-between p-4', headerInnerClass)}>
        <Link href="/" className="font-display font-black text-game-text text-lg tracking-wide shrink-0">
          Stack<em className="text-game-primary not-italic" style={{ textShadow: 'var(--game-logo-glow)' }}>Tac</em>Toe
        </Link>
        <div className="flex-1 min-w-4" aria-hidden />
        <nav className={cn('flex items-center min-w-0 justify-end', navGapClass)} aria-label="Navigation">
          {rightSlot}
          {showRanking && (
            <>
              <Link href="/ranking" className={cn('hidden sm:inline-flex', navLinkClass)}>
                Rangliste
              </Link>
              <Link href="/ranking" aria-label="Rangliste" className={cn('sm:hidden', navIconButtonClass)}>
                <Trophy className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </>
          )}
          {showAuth && (
            user === undefined ? (
              /* Auth noch nicht geladen: Platzhalter, kein falsches "Anmelden" beim Refresh */
              <>
                <span className={cn('hidden sm:inline-flex', navLinkClass, 'opacity-0 select-none')} aria-hidden>
                  Mein Profil
                </span>
                <span className={cn('sm:hidden', navIconButtonClass, 'opacity-0 pointer-events-none')} aria-hidden>
                  <User className="h-4 w-4 shrink-0" />
                </span>
              </>
            ) : user ? (
              <>
                <Link href="/profile" className={cn('hidden sm:inline-flex', navLinkClass)}>
                  Mein Profil
                </Link>
                <Link href="/profile" aria-label="Mein Profil" className={cn('sm:hidden', navIconButtonClass)}>
                  <User className="h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth?redirect=/lobby" className={cn('hidden sm:inline-flex', navLinkClass)}>
                  Anmelden
                </Link>
                <Link href="/auth?redirect=/lobby" aria-label="Anmelden" className={cn('sm:hidden', navIconButtonClass)}>
                  <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </>
            )
          )}
        </nav>
        </div>
      </div>
    </header>
  );
}
