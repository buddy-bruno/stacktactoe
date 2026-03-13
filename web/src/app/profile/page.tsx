'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/auth?redirect=/profile');
        return;
      }
      setEmail(user.email ?? null);
      setLoading(false);
    });
  }, [router]);

  async function handleDeleteAccount() {
    const ok = typeof window !== 'undefined' && window.confirm(
      'Möchtest du dein Konto unwiderruflich löschen? Alle Spielstände und Daten werden gelöscht.'
    );
    if (!ok) return;
    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !session?.refresh_token) {
        setDeleteLoading(false);
        return;
      }
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(json.error ?? 'Löschung fehlgeschlagen.');
        setDeleteLoading(false);
        return;
      }
      await supabase.auth.signOut();
      router.replace('/');
    } catch {
      alert('Fehler bei der Anfrage.');
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <PageShell backHref="/">
        <AppHeader showRanking showAuth />
        <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
          <p className="text-game-text-muted">Lade…</p>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell backHref="/">
      <AppHeader showRanking showAuth />
      <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
        <h1 className="font-display text-2xl font-bold text-center text-game-text">
          Mein Profil
        </h1>
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-game-text">Konto</CardTitle>
              <CardDescription className="text-game-text-muted">
                Angemeldet mit dieser E-Mail
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-game-text font-medium">{email}</p>
              <Button
                variant="outline"
                className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.replace('/');
                }}
              >
                Abmelden
              </Button>
            </CardContent>
          </Card>

          <Card className="border-game-danger/30">
            <CardHeader>
              <CardTitle className="font-display text-game-text">Profil löschen</CardTitle>
              <CardDescription className="text-game-text-muted">
                Dein Konto und alle zugehörigen Daten (Spielstände, Rangliste) werden dauerhaft gelöscht. Diese Aktion ist nicht rückgängig zu machen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="border-game-danger/50 text-game-danger hover:bg-game-danger/10 hover:text-game-danger"
                onClick={() => void handleDeleteAccount()}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Wird gelöscht…' : 'Profil löschen'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </PageShell>
  );
}
