'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { ModeCard } from '@/components/layout/ModeCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

function PlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const [activePvpGame, setActivePvpGame] = useState<{ id: string; variant: string } | null>(null);

  useEffect(() => {
    if (!mode || (mode !== 'classic' && mode !== 'blitz' && mode !== 'schach' && mode !== 'pool')) {
      router.replace('/');
    }
  }, [mode, router]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: rows } = await supabase.rpc('get_my_active_pvp_game', { p_user_id: user.id });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) {
        setActivePvpGame(null);
        return;
      }
      let variant = 'classic';
      try {
        const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('stacktactoe_active_pvp') : null;
        const parsed = stored ? (JSON.parse(stored) as { gameId?: string; variant?: string }) : null;
        if (parsed?.gameId === row.id && parsed?.variant) variant = parsed.variant;
      } catch {
        // ignore
      }
      setActivePvpGame({ id: row.id, variant });
    })();
  }, []);

  const playTitle = mode === 'blitz' ? 'Blitz' : mode === 'schach' ? 'Schach' : mode === 'pool' ? 'Pool' : 'Classic';

  if (!mode || (mode !== 'classic' && mode !== 'blitz' && mode !== 'schach' && mode !== 'pool')) {
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
  const isPool = mode === 'pool';
  const gameHref = isBlitz ? '/game/classic?mode=ai&blitz=1' : isSchach ? '/game/schach?mode=ai' : isPool ? '/game/pool?mode=ai' : '/game/classic?mode=ai';
  const lobbyHref = isSchach ? '/lobby?variant=schach' : isPool ? '/lobby?variant=pool' : '/lobby';

  return (
    <PageShell backHref="/" header={<AppHeader title={playTitle} showRanking showAuth />}>
      <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
        <h1 className="font-display text-2xl font-bold text-center text-game-text">
          Wie möchtest du spielen?
        </h1>

        {activePvpGame && (
          <Card className="w-full max-w-2xl border-game-primary/30 bg-game-primary/5">
            <CardContent className="pt-6">
              <p className="text-game-text font-medium mb-3">Du hast ein laufendes Spiel.</p>
              <div className="flex gap-2">
                <Link href={`/game/${activePvpGame.variant}?mode=pvp&id=${activePvpGame.id}`} className="flex-1">
                  <Button className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30">
                    Weiterspielen
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="shrink-0 border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text"
                  onClick={async () => {
                    await supabase.from('games').update({ status: 'abandoned' }).eq('id', activePvpGame.id);
                    try {
                      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('stacktactoe_active_pvp');
                    } catch {}
                    setActivePvpGame(null);
                    router.push('/');
                  }}
                >
                  Spiel beenden
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
