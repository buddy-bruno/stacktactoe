'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppFooter } from '@/components/layout/AppFooter';

interface PageShellProps {
  children: ReactNode;
  className?: string;
  /** Link „Zurück“ unter dem Inhalt anzeigen */
  backHref?: string;
  /** Optional: Header fixiert oben; Inhalt scrollt darunter */
  header?: ReactNode;
}

export function PageShell({ children, className = '', backHref, header }: PageShellProps) {
  const content = (
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
  );

  if (header) {
    return (
      <div className={`min-h-screen flex flex-col bg-game-bg text-game-text ${className}`}>
        {/* Einheitlicher Header wie Spielmodi: gleiche Breite, Abstände, Stil */}
        <div
          className="fixed top-0 left-0 right-0 z-50 flex justify-center"
          style={{
            marginTop: 'var(--game-header-margin)',
            marginBottom: 0,
            marginLeft: 0,
            marginRight: 0,
            background: 'var(--game-bg)',
          }}
        >
          <div className="w-full max-w-[var(--game-content-max-width)] mx-auto px-[var(--game-content-padding)]">
            {header}
          </div>
        </div>
        {/* Vignette hinter dem Inhalt */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{ background: 'var(--game-bg-vignette)' }}
          aria-hidden
        />
        <div
          className="relative z-10 flex-1 min-h-0 overflow-auto pt-[var(--game-header-height)] pb-[var(--game-footer-height)] page-shell-scroll"
          style={{ minHeight: 0 }}
        >
          {content}
        </div>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-game-bg text-game-text ${className}`}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--game-bg-vignette)' }}
        aria-hidden
      />
      <div className="relative z-10 flex-1 min-h-0 overflow-auto pb-[var(--game-footer-height)]">
        {content}
      </div>
      <AppFooter />
    </div>
  );
}
