'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

type Tournament = { id: string; name: string; status: string; max_participants: number; created_by: string | null };

export default function TournamentsPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/zugang?redirect=/tournaments');
        return;
      }
      setUserId(data.user.id);
    }).catch(() => router.replace('/zugang?redirect=/tournaments'));
  }, [router]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('tournaments').select('id, name, status, max_participants, created_by').in('status', ['registration', 'running']).order('created_at', { ascending: false }).limit(50);
      setTournaments((data as Tournament[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function createTournament() {
    const name = createName.trim();
    if (!name || !userId) return;
    setCreating(true);
    const { data, error } = await supabase.from('tournaments').insert({ name, created_by: userId, status: 'registration', max_participants: 8 }).select('id').single();
    setCreating(false);
    if (error) return;
    if (data) {
      setCreateName('');
      router.push('/tournament/' + data.id);
    }
  }

  if (!userId) {
    return (
      <PageShell backHref="/classic/lobby" header={<AppHeader title="Turniere" showRanking showAuth />}>
        <main className="flex-1 flex flex-col items-center justify-center py-12"><p className="text-game-text-muted">Lade…</p></main>
      </PageShell>
    );
  }

  return (
    <PageShell backHref="/classic/lobby" header={<AppHeader title="Turniere" showRanking showAuth />}>
      <main className="flex-1 flex flex-col gap-6 py-8 pb-20 max-w-2xl mx-auto w-full px-4">
        <h1 className="font-display text-2xl font-bold text-game-text">Turniere</h1>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Turnier erstellen</CardTitle>
            <CardDescription className="text-game-text-muted">K.-o.-Turnier. Nach dem Erstellen können sich Spieler anmelden; du startest das Turnier.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Turniername" value={createName} onChange={(e) => setCreateName(e.target.value)} className="bg-game-bg-subtle/40 border-game-border text-game-text" />
            <Button className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30" onClick={() => void createTournament()} disabled={creating}>
              {creating ? 'Erstelle…' : 'Turnier erstellen'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Offene Turniere</CardTitle>
            <CardDescription className="text-game-text-muted">Anmeldung oder läuft gerade.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-game-text-muted text-sm">Lade…</p>
            ) : tournaments.length === 0 ? (
              <p className="text-game-text-muted text-sm">Keine offenen Turniere.</p>
            ) : (
              <ul className="space-y-2">
                {tournaments.map((t) => (
                  <li key={t.id}>
                    <Link href={'/tournament/' + t.id}>
                      <Button variant="outline" className="w-full justify-between border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text">
                        <span>{t.name}</span>
                        <span className="text-game-text-muted text-xs capitalize">{t.status === 'registration' ? 'Anmeldung' : 'Läuft'}</span>
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}
