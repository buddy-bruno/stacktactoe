'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function GameRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const variant = searchParams.get('variant');
    const base = variant === 'schach' ? '/game/schach' : variant === 'pool' ? '/game/pool' : '/game/classic';
    const query = searchParams.toString();
    const target = query ? `${base}?${query}` : base;
    router.replace(target);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-game-bg flex items-center justify-center text-game-text-muted">
      Lade…
    </div>
  );
}

/** Leitet /game auf /game/classic oder /game/schach um – Spiele sind strikt getrennt, keine Kollision. */
export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-game-bg flex items-center justify-center text-game-text-muted">Lade…</div>}>
      <GameRedirect />
    </Suspense>
  );
}
