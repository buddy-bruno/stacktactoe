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

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_color: string | null;
  total_points: number;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
  win_streak: number;
  best_streak: number;
  pvp_points: number;
  pvp_wins: number;
  pvp_games: number;
  pvp_best_streak: number;
  ai_easy_points: number;
  ai_easy_wins: number;
  ai_easy_games: number;
  ai_mid_points: number;
  ai_mid_wins: number;
  ai_mid_games: number;
  ai_hard_points: number;
  ai_hard_wins: number;
  ai_hard_games: number;
  ranked_elo: number;
};

const AVATAR_COLORS = ['#38bdf8', '#fb923c', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#06b6d4', '#f97316'];

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAvatarColor, setEditAvatarColor] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/zugang?redirect=/profile');
        return;
      }
      setEmail(user.email ?? null);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_color, total_points, wins, losses, draws, games_played, win_streak, best_streak, pvp_points, pvp_wins, pvp_games, pvp_best_streak, ai_easy_points, ai_easy_wins, ai_easy_games, ai_mid_points, ai_mid_wins, ai_mid_games, ai_hard_points, ai_hard_wins, ai_hard_games, ranked_elo')
        .eq('id', user.id)
        .single();
      const p = (profileData as Profile) ?? null;
      setProfile(p);
      if (p) {
        setEditDisplayName(p.display_name ?? p.username ?? '');
        setEditAvatarColor(p.avatar_color ?? '#38bdf8');
      }
      setLoading(false);
    })().catch(() => {
      router.replace('/zugang?redirect=/profile');
      setLoading(false);
    });
  }, [router]);

  async function saveProfile() {
    if (!profile) return;
    setSaveLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: editDisplayName.trim() || null,
        avatar_color: editAvatarColor,
      })
      .eq('id', profile.id);
    setSaveLoading(false);
    if (error) {
      return;
    }
    setProfile((prev) => prev ? { ...prev, display_name: editDisplayName.trim() || null, avatar_color: editAvatarColor } : null);
    setEditing(false);
  }

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
      <PageShell backHref="/" header={<AppHeader title="Profil" showRanking showAuth />}>
        <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
          <p className="text-game-text-muted">Lade…</p>
        </main>
      </PageShell>
    );
  }

  const displayName = profile?.display_name?.trim() || profile?.username || 'Spieler';

  return (
    <PageShell backHref="/" header={<AppHeader title="Profil" showRanking showAuth />}>
      <main className="flex-1 flex flex-col items-center gap-8 py-12 pb-20">
        <h1 className="font-display text-2xl font-bold text-center text-game-text">
          Mein Profil
        </h1>
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-game-text">Profil</CardTitle>
              <CardDescription className="text-game-text-muted">
                Anzeigename und Farbe für Rangliste und Spiele
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-game-text-muted">Anzeigename</label>
                    <Input
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="Anzeigename"
                      className="bg-game-bg-subtle/40 border-game-border text-game-text"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-game-text-muted">Avatar-Farbe</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                          style={{
                            backgroundColor: c,
                            borderColor: editAvatarColor === c ? 'var(--game-primary)' : 'transparent',
                          }}
                          onClick={() => setEditAvatarColor(c)}
                          aria-label={`Farbe ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30"
                      onClick={() => void saveProfile()}
                      disabled={saveLoading}
                    >
                      {saveLoading ? 'Speichern…' : 'Speichern'}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-game-border text-game-text hover:bg-game-surface-hover"
                      onClick={() => {
                        setEditing(false);
                        setEditDisplayName(profile?.display_name ?? profile?.username ?? '');
                        setEditAvatarColor(profile?.avatar_color ?? '#38bdf8');
                      }}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: profile?.avatar_color ?? '#38bdf8' }}
                    />
                    <div>
                      <p className="font-display font-bold text-game-text">{displayName}</p>
                      <p className="text-xs text-game-text-muted mt-0.5">{email ?? '—'}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text"
                    onClick={() => setEditing(true)}
                  >
                    Profil bearbeiten
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-game-text">Statistik</CardTitle>
                <CardDescription className="text-game-text-muted">
                  Übersicht deiner Spiele und Punkte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="rounded-lg bg-game-bg-subtle/50 p-3">
                    <p className="text-2xl font-display font-bold text-game-text">{profile.games_played}</p>
                    <p className="text-xs text-game-text-muted">Spiele</p>
                  </div>
                  <div className="rounded-lg bg-game-bg-subtle/50 p-3">
                    <p className="text-2xl font-display font-bold text-game-success">{profile.wins}</p>
                    <p className="text-xs text-game-text-muted">Siege</p>
                  </div>
                  <div className="rounded-lg bg-game-bg-subtle/50 p-3">
                    <p className="text-2xl font-display font-bold text-game-danger">{profile.losses}</p>
                    <p className="text-xs text-game-text-muted">Niederlagen</p>
                  </div>
                  <div className="rounded-lg bg-game-bg-subtle/50 p-3">
                    <p className="text-2xl font-display font-bold text-game-accent">{profile.draws}</p>
                    <p className="text-xs text-game-text-muted">Unentschieden</p>
                  </div>
                </div>
                <div className="border-t border-game-border/50 pt-4 space-y-2">
                  <p className="text-sm font-medium text-game-text-muted">PvP</p>
                  <p className="text-game-text">{profile.pvp_points} Punkte · {profile.pvp_wins} Siege in {profile.pvp_games} Partien</p>
                </div>
                <div className="border-t border-game-border/50 pt-2 space-y-2">
                  <p className="text-sm font-medium text-game-text-muted">Gegen KI</p>
                  <p className="text-game-text text-sm">
                    Einfach: {profile.ai_easy_points} Punkte · Mittel: {profile.ai_mid_points} Punkte · Schwer: {profile.ai_hard_points} Punkte
                  </p>
                </div>
                <Link href="/ranking">
                  <Button
                    variant="outline"
                    className="w-full border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text"
                  >
                    Rangliste &amp; Meine Platzierung
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

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
