import { Suspense } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import RoomsContent from './RoomsContent';

export default function RoomsPage() {
  return (
    <Suspense
      fallback={
        <PageShell backHref="/classic/lobby" header={<AppHeader title="Räume" showRanking showAuth />}>
          <main className="flex-1 flex flex-col items-center justify-center py-12">
            <p className="text-game-text-muted">Lade…</p>
          </main>
        </PageShell>
      }
    >
      <RoomsContent />
    </Suspense>
  );
}
