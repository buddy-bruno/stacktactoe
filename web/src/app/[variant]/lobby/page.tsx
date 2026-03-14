import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { LobbyContent } from '@/components/lobby/LobbyContent';

const VALID_VARIANTS = ['classic', 'schach', 'pool'] as const;
type Variant = (typeof VALID_VARIANTS)[number];

function isValidVariant(v: string): v is Variant {
  return VALID_VARIANTS.includes(v as Variant);
}

export default async function VariantLobbyPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;
  if (!isValidVariant(variant)) {
    redirect('/classic/lobby');
  }
  return (
    <Suspense
      fallback={
        <PageShell backHref="/" header={<AppHeader title="Lobby" showRanking showAuth />}>
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
            <p className="text-game-text-muted text-center py-8">Lade…</p>
          </div>
        </PageShell>
      }
    >
      <LobbyContent variant={variant} />
    </Suspense>
  );
}
