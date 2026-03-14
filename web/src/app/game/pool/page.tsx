'use client';

import { Suspense } from 'react';
import { GamePageContent } from '@/components/game/GamePageContent';

export default function GamePoolPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-game-bg flex items-center justify-center text-game-text-muted">Lade…</div>}>
      <GamePageContent gameVariant="pool" />
    </Suspense>
  );
}
