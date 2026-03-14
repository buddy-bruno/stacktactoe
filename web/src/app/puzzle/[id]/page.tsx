'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { getPuzzle, isPuzzleSolution, type Puzzle } from '@/lib/game/puzzle';
import { deserializeGameState } from '@/lib/game/stt';
import type { Move } from '@/lib/game/stt';
import { STT } from '@/lib/game/stt';
import { GameBoard } from '@/components/game/GameBoard';

export default function PuzzlePlayPage() {
  const params = useParams();
  const id = params.id as string;
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [stt, setStt] = useState<STT | null>(null);
  const [loading, setLoading] = useState(true);
  const [solved, setSolved] = useState<boolean | null>(null);

  useEffect(() => {
    getPuzzle(id).then((p) => {
      setPuzzle(p);
      if (p?.initial_state) {
        const g = deserializeGameState(p.initial_state as Parameters<typeof deserializeGameState>[0]);
        setStt(g);
      }
      setLoading(false);
    });
  }, [id]);

  const onMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature matches GameBoard callback
    (move: Move, _toIndex: number) => {
      if (!puzzle || !stt || solved !== null) return false;
      const correct = isPuzzleSolution(puzzle.solution_type, puzzle.solution_data as Record<string, unknown>, move);
      const next = stt.clone();
      const ok = move.type === 'place' ? next.place('human', move.size, move.index) : next.move('human', move.fromIndex, move.toIndex);
      if (!ok) return false;
      setStt(next);
      if (correct) setSolved(true);
      else setSolved(false);
      return true;
    },
    [puzzle, stt, solved]
  );

  if (loading || !puzzle) {
    return (
      <PageShell backHref="/puzzle" header={<AppHeader showRanking showAuth />}>
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
          <p className="text-game-text-muted text-center py-8">Lade Puzzle…</p>
        </div>
      </PageShell>
    );
  }

  if (!stt) {
    return (
      <PageShell backHref="/puzzle" header={<AppHeader showRanking showAuth />}>
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-game-text-muted">Ungültige Puzzle-Daten.</p>
            <Link href="/puzzle"><Button variant="outline" className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text">Zurück</Button></Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell backHref="/puzzle" header={<AppHeader showRanking showAuth />}>
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Finde den gewinnenden Zug</CardTitle>
            <CardDescription className="text-game-text-muted">
              Du bist am Zug. Ein Zug zum Sieg — {puzzle.solution_type === 'place' ? 'Platziere' : 'Ziehe'} die richtige Figur.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {solved === true && <p className="text-game-success font-medium">✓ Richtiger Zug!</p>}
            {solved === false && <p className="text-game-danger font-medium">✗ Noch nicht der gewinnende Zug. Versuche es erneut.</p>}
            {solved === null && (
              <GameBoard stt={stt} mySide="human" myTurn={true} locked={false} onMove={onMove} />
            )}
            <Link href="/puzzle"><Button variant="outline" className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text">Zurück zur Liste</Button></Link>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
