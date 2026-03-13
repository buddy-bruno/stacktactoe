'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { ModeCard } from '@/components/layout/ModeCard';

function PlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  useEffect(() => {
    if (!mode || (mode !== 'classic' && mode !== 'blitz')) {
      router.replace('/');
    }
  }, [mode, router]);

  if (!mode || (mode !== 'classic' && mode !== 'blitz')) {
    return (
      <PageShell backHref="/">
        <AppHeader showRanking showAuth />
        <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
          <p className="text-game-text-muted text-center">Lade…</p>
        </main>
      </PageShell>
    );
  }

  const isBlitz = mode === 'blitz';
  const gameHref = isBlitz ? '/game?mode=ai&blitz=1' : '/game?mode=ai';

  return (
    <PageShell backHref="/">
      <AppHeader showRanking showAuth />

      <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
        <h1 className="font-display text-2xl font-bold text-center text-game-text">
          Wie möchtest du spielen?
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          <ModeCard
            mode="ai"
            title="Gegen KI"
            description={isBlitz ? '10 Sekunden pro Zug' : 'Spiele gegen unsere KI und fordere sie heraus — Anfänger, Schwer oder Profi.'}
            href={gameHref}
            hideIcon
          />
          <ModeCard
            mode="pvp"
            title="Multiplayer"
            description="Schnell-Suche oder Raum erstellen und teilen"
            href="/lobby"
            hideIcon
          />
        </div>
      </main>
    </PageShell>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <PageShell backHref="/">
          <AppHeader showRanking showAuth />
          <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
            <p className="text-game-text-muted text-center">Lade…</p>
          </main>
        </PageShell>
      }
    >
      <PlayContent />
    </Suspense>
  );
}
