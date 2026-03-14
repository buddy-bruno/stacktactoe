'use client';

import { useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { ModeCard } from '@/components/layout/ModeCard';
import { GameHelpSidebar } from '@/components/game/GameHelpSidebar';

export default function HomePage() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpVariant, setHelpVariant] = useState<'classic' | 'schach' | 'blitz'>('classic');

  return (
    <>
      <PageShell header={<AppHeader title="Lobby" showRanking showAuth />}>
        <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
          <h1 className="font-display text-2xl font-bold text-center text-game-text">
            Wähle einen Spielmodus
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            <ModeCard
              mode="classic"
              title="Classic"
              description="Nur setzen. Stärkere überdeckt schwächere — 3 in einer Reihe gewinnt."
              href="/play?mode=classic"
              onAnleitungClick={() => {
                setHelpVariant('classic');
                setHelpOpen(true);
              }}
            />
            <ModeCard
              mode="schach"
              title="Schach"
              description="Setzen und Bewegen. Ab 3 Figuren 1 Feld ziehen. Schlagen = Figur weg."
              href="/play?mode=schach"
              onAnleitungClick={() => {
                setHelpVariant('schach');
                setHelpOpen(true);
              }}
            />
            <ModeCard
              mode="blitz"
              title="Blitz"
              description="5 Sekunden pro Zug. Gleiche Regeln wie Classic, nur mit Zeitlimit."
              href="/play?mode=blitz"
              onAnleitungClick={() => {
                setHelpVariant('blitz');
                setHelpOpen(true);
              }}
            />
          </div>
        </main>
      </PageShell>
      <GameHelpSidebar open={helpOpen} onClose={() => setHelpOpen(false)} gameVariant={helpVariant} />
    </>
  );
}
