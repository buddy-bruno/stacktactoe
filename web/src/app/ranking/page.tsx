'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_color: string | null;
  pvp_points: number;
  pvp_wins: number;
  pvp_games: number;
  ai_easy_points: number;
  ai_easy_wins: number;
  ai_easy_games: number;
  ai_mid_points: number;
  ai_mid_wins: number;
  ai_mid_games: number;
  ai_hard_points: number;
  ai_hard_wins: number;
  ai_hard_games: number;
};

function aiTotal(p: Profile): number {
  return (p.ai_easy_points ?? 0) + (p.ai_mid_points ?? 0) + (p.ai_hard_points ?? 0);
}

export default function RankingPage() {
  const [mode, setMode] = useState<'pvp' | 'ai'>('pvp');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRanking = useCallback(async () => {
    setLoading(true);
    if (mode === 'ai') {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_color, pvp_points, pvp_wins, pvp_games, ai_easy_points, ai_easy_wins, ai_easy_games, ai_mid_points, ai_mid_wins, ai_mid_games, ai_hard_points, ai_hard_wins, ai_hard_games')
        .limit(300);
      const list = (data as Profile[]) || [];
      list.sort((a, b) => aiTotal(b) - aiTotal(a));
      setProfiles(list.slice(0, 50));
    } else {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_color, pvp_points, pvp_wins, pvp_games, ai_easy_points, ai_easy_wins, ai_easy_games, ai_mid_points, ai_mid_wins, ai_mid_games, ai_hard_points, ai_hard_wins, ai_hard_games')
        .order('pvp_points', { ascending: false })
        .limit(50);
      setProfiles((data as Profile[]) || []);
    }
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load data when mode changes
    loadRanking();
  }, [loadRanking]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMyProfile(null);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_color, pvp_points, pvp_wins, pvp_games, ai_easy_points, ai_easy_wins, ai_easy_games, ai_mid_points, ai_mid_wins, ai_mid_games, ai_hard_points, ai_hard_wins, ai_hard_games')
        .eq('id', user.id)
        .single();
      setMyProfile((data as Profile) ?? null);
    })();
  }, []);

  function Table() {
    const isPvp = mode === 'pvp';
    const isAi = mode === 'ai';
    const title = isPvp ? 'Multiplayer' : 'Gegen KI';
    const valueKey = isPvp ? 'pvp_points' : null;
    const winsKey = isPvp ? 'pvp_wins' : null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-game-text">{title}</CardTitle>
          <CardDescription className="text-game-text-muted">
            {isPvp && 'Spiele gegen echte Spieler — Punkte aus gewonnenen Runden'}
            {isAi && 'Punkte aus allen KI-Partien (Anfänger, Schwer, Profi zusammengezählt)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-game-text-muted py-8 text-center">Laden…</p>
          ) : (
            <div className="space-y-2">
              {profiles.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-game-bg-subtle/30 border border-game-border"
                >
                  <span className="w-8 font-display font-bold text-game-primary">#{i + 1}</span>
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.avatar_color || 'var(--game-primary)' }}
                  />
                  <span className="flex-1 font-medium truncate text-game-text">
                    {p.display_name || p.username}
                  </span>
                  <span className="font-display font-bold text-game-accent">
                    {valueKey ? (p as unknown as Record<string, number>)[valueKey] ?? 0 : aiTotal(p)}
                  </span>
                  {winsKey && (
                    <span className="text-sm text-game-text-muted">
                      {(p as unknown as Record<string, number>)[winsKey]} Siege
                    </span>
                  )}
                  {isAi && (
                    <span className="text-sm text-game-text-muted">
                      {(p.ai_easy_games ?? 0) + (p.ai_mid_games ?? 0) + (p.ai_hard_games ?? 0)} Spiele
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <PageShell backHref="/" header={<AppHeader showRanking showAuth />}>
      <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
        <h1 className="font-display text-2xl font-bold text-center text-game-text">
          Rangliste
        </h1>

        <div className="w-full max-w-2xl flex flex-col gap-6">
          {myProfile && (
            <Card className="border-game-primary/20">
              <CardHeader>
                <CardTitle className="font-display text-game-text text-base">Deine Stats vs KI</CardTitle>
                <CardDescription className="text-game-text-muted">
                  Aufteilung nach Schwierigkeit
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-game-bg-subtle/30 border border-game-border">
                  <p className="text-xs font-medium text-game-text-muted uppercase tracking-wider">Anfänger</p>
                  <p className="font-display font-bold text-game-accent">{myProfile.ai_easy_points ?? 0} Punkte</p>
                  <p className="text-sm text-game-text-muted">{(myProfile.ai_easy_wins ?? 0)} Siege · {(myProfile.ai_easy_games ?? 0)} Spiele</p>
                </div>
                <div className="p-3 rounded-lg bg-game-bg-subtle/30 border border-game-border">
                  <p className="text-xs font-medium text-game-text-muted uppercase tracking-wider">Schwer</p>
                  <p className="font-display font-bold text-game-accent">{myProfile.ai_mid_points ?? 0} Punkte</p>
                  <p className="text-sm text-game-text-muted">{(myProfile.ai_mid_wins ?? 0)} Siege · {(myProfile.ai_mid_games ?? 0)} Spiele</p>
                </div>
                <div className="p-3 rounded-lg bg-game-bg-subtle/30 border border-game-border">
                  <p className="text-xs font-medium text-game-text-muted uppercase tracking-wider">Profi</p>
                  <p className="font-display font-bold text-game-accent">{myProfile.ai_hard_points ?? 0} Punkte</p>
                  <p className="text-sm text-game-text-muted">{(myProfile.ai_hard_wins ?? 0)} Siege · {(myProfile.ai_hard_games ?? 0)} Spiele</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs value={mode} onValueChange={(v) => setMode(v as 'pvp' | 'ai')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pvp">Multiplayer</TabsTrigger>
              <TabsTrigger value="ai">Gegen KI</TabsTrigger>
            </TabsList>

            {(['pvp', 'ai'] as const).map((m) => (
              <TabsContent key={m} value={m} className="mt-4">
                <Table />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </PageShell>
  );
}
