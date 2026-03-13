'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPuzzles, type Puzzle } from '@/lib/game/puzzle';

export default function PuzzlePage() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [difficulty, setDifficulty] = useState<string>('easy');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPuzzles().then((list) => {
      setPuzzles(list);
      setLoading(false);
    });
  }, []);

  const filtered = difficulty ? puzzles.filter((p) => p.difficulty === difficulty) : puzzles;
  const label = (d: string) => (d === 'easy' ? 'Einfach' : d === 'mid' ? 'Mittel' : d === 'hard' ? 'Schwer' : d);

  return (
    <PageShell backHref="/">
      <AppHeader showRanking showAuth />
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Zug in 1</CardTitle>
            <CardDescription className="text-game-text-muted">
              Finde den gewinnenden Zug. Vorgegebene Stellung — ein Zug zum Sieg.
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs value={difficulty} onValueChange={setDifficulty}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="easy">Einfach</TabsTrigger>
            <TabsTrigger value="mid">Mittel</TabsTrigger>
            <TabsTrigger value="hard">Schwer</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-2">
            {loading ? (
              <p className="text-game-text-muted py-8 text-center">Laden…</p>
            ) : filtered.length === 0 ? (
              <p className="text-game-text-muted py-8 text-center">
                Keine Puzzles in „{label(difficulty)}“. Füge in der DB welche hinzu.
              </p>
            ) : (
              filtered.map((p) => (
                <Link key={p.id} href={`/puzzle/${p.id}`}>
                  <Card className="transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <span className="font-medium truncate text-game-text">Puzzle — {label(p.difficulty)}</span>
                      <span className="text-sm text-game-text-muted">
                        {p.solution_type === 'place' ? 'Platzieren' : 'Ziehen'}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </Tabs>
      </div>
    </PageShell>
  );
}
