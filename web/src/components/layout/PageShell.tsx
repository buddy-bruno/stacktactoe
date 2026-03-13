'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageShellProps {
  children: ReactNode;
  className?: string;
  /** Link „Zurück“ unter dem Inhalt anzeigen */
  backHref?: string;
}

export function PageShell({ children, className = '', backHref }: PageShellProps) {
  return (
    <div className={`min-h-screen bg-game-bg text-game-text ${className}`}>
      {/* Vignette: außen etwas dunkler, zur Mitte transparent */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--game-bg-vignette)' }}
        aria-hidden
      />
      <div className="relative z-10 max-w-[var(--game-content-max-width)] mx-auto px-[var(--game-content-padding)] pt-6 pb-16 sm:pb-20 flex flex-col gap-6">
        {children}
        {backHref && (
          <div className="flex justify-center pt-2">
            <Link href={backHref} aria-label="Zurück">
              <Button variant="ghost" size="default" className="text-game-text hover:bg-game-surface-hover hover:text-game-text gap-2">
                <ArrowLeft className="size-4" strokeWidth={2.25} />
                Zurück
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
