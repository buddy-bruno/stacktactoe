'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getDailyLeaderboard,
  getMyDailyScore,
  type DailyScore,
} from '@/lib/game/daily';
import { ROUNDS_TOTAL } from '@/lib/game';
import { supabase } from '@/lib/supabase';

export default function DailyPage() {
  const [scores, setScores] = useState<DailyScore[]>([]);
  const [myScore, setMyScore] = useState<{ points: number; time_ms: number; rounds_won: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user)).catch(() => setIsLoggedIn(false));
  }, []);

  useEffect(() => {
    (async () => {
      const [list, my] = await Promise.all([
        getDailyLeaderboard(today),
        getMyDailyScore(today),
      ]);
      setScores(list);
      setMyScore(my);
      setLoading(false);
    })();
  }, [today]);

  return (
    <PageShell backHref="/" header={<AppHeader title="Daily" showRanking showAuth />}>
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
        {isLoggedIn === false && (
          <Card className="border-game-primary/30 bg-game-primary/5">
            <CardContent className="pt-6">
              <p className="text-game-text text-sm mb-3">
                Melde dich an, um dein Ergebnis zu speichern und in der Rangliste zu erscheinen.
              </p>
              <Link href="/zugang?redirect=/daily">
                <Button className="bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30">
                  Anmelden
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card className="border-game-accent/20">
          <CardHeader>
            <CardTitle className="font-display text-game-text">Heutige Herausforderung</CardTitle>
            <CardDescription className="text-game-text-muted">
              Ein Match pro Tag — {ROUNDS_TOTAL} Runden. Dein bestes Ergebnis zählt für die Rangliste.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {myScore !== null && (
              <div className="space-y-1">
                <p className="text-sm text-game-primary font-medium">
                  Dein Ergebnis heute: <strong>{myScore.points}</strong> Punkte
                  {myScore.time_ms > 0 && ` · ${(myScore.time_ms / 1000).toFixed(1)}s`}
                  {' · '}{myScore.rounds_won} Runden gewonnen
                </p>
                <p className="text-xs text-game-text-muted">
                    Du kannst erneut spielen; nur dein bestes Ergebnis zählt für die Rangliste.
                  </p>
              </div>
            )}
            <Link href={`/game/classic?mode=daily${myScore ? '&played=1' : ''}`}>
              <Button className="w-full bg-game-accent/20 border-game-accent/30 text-game-accent hover:bg-game-accent/30">
                {myScore ? 'Nochmal spielen (ersetzt bei besserem Ergebnis)' : 'Jetzt spielen'}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Rangliste — {today}</CardTitle>
            <CardDescription className="text-game-text-muted">
              Sortiert nach Punkten, bei Gleichstand nach Zeit
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-game-text-muted py-6 text-center">Laden…</p>
            ) : scores.length === 0 ? (
              <p className="text-game-text-muted py-6 text-center">Noch keine Einträge heute.</p>
            ) : (
              <div className="space-y-2">
                {scores.map((s, i) => {
                  const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
                  const name = p?.display_name ?? p?.username ?? 'Spieler';
                  return (
                  <div
                    key={s.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-game-bg-subtle/30 border border-game-border"
                  >
                    <span className="w-8 font-display font-bold text-game-primary">#{i + 1}</span>
                    <span className="flex-1 truncate text-game-text">{name}</span>
                    <span className="font-display font-bold text-game-accent">{s.points}</span>
                    <span className="text-sm text-game-text-muted">
                      {s.time_ms > 0 ? `${(s.time_ms / 1000).toFixed(1)}s` : '—'}
                    </span>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
