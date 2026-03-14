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
    if (!mode || (mode !== 'classic' && mode !== 'blitz' && mode !== 'schach')) {
      router.replace('/');
    }
  }, [mode, router]);

  const playTitle = mode === 'blitz' ? 'Blitz' : mode === 'schach' ? 'Schach' : 'Classic';

  if (!mode || (mode !== 'classic' && mode !== 'blitz' && mode !== 'schach')) {
    return (
      <PageShell backHref="/" header={<AppHeader title="Lobby" showRanking showAuth />}>
        <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
          <p className="text-game-text-muted text-center">Lade…</p>
        </main>
      </PageShell>
    );
  }

  const isBlitz = mode === 'blitz';
  const isSchach = mode === 'schach';
  const gameHref = isBlitz ? '/game/classic?mode=ai&blitz=1' : isSchach ? '/game/schach?mode=ai' : '/game/classic?mode=ai';
  const lobbyHref = isSchach ? '/lobby?variant=schach' : '/lobby';

  return (
    <PageShell backHref="/" header={<AppHeader title={playTitle} showRanking showAuth />}>
      <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
        <h1 className="font-display text-2xl font-bold text-center text-game-text">
          Wie möchtest du spielen?
        </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            <ModeCard
              mode="ai"
              title="Gegen KI"
              description="Gegen KI spielen. Schwierigkeit wählbar."
              href={gameHref}
            />
            <ModeCard
              mode="pvp"
              title="Multiplayer"
              description="Schnell-Suche oder Raum erstellen."
              href={lobbyHref}
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
        <PageShell backHref="/" header={<AppHeader title="Lobby" showRanking showAuth />}>
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
