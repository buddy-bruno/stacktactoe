'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { STT } from '@/lib/game/stt';
import { serializeMatchState } from '@/lib/game/scoring';

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinFromUrl = searchParams.get('join')?.trim().toUpperCase() ?? '';
  const [inviteCode, setInviteCode] = useState('');
  const [matchmaking, setMatchmaking] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [createdGame, setCreatedGame] = useState<{ gameId: string; code: string } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/auth?redirect=/lobby');
        return;
      }
      setAuthReady(true);
    });
  }, [router]);

  async function createGame() {
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Bitte zuerst anmelden.');
      return;
    }
    setCreating(true);
    const code = generateInviteCode();
    const stt = new STT();
    const sc = { human: { total: 0, wins: 0, moves: 0, rnd: 0 }, ai: { total: 0, wins: 0, moves: 0, rnd: 0 } };
    const stateJson = serializeMatchState(stt, 1, [], sc);
    const { data, error: err } = await supabase
      .from('games')
      .insert({
        player1_id: user.id,
        mode: 'pvp',
        status: 'waiting',
        state_json: stateJson,
        invite_code: code,
      })
      .select('id')
      .single();
    setCreating(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data) setCreatedGame({ gameId: data.id, code });
  }

  async function joinByCode() {
    setError('');
    const code = (inviteCode || joinFromUrl).trim().toUpperCase();
    if (!code || code.length < 4) {
      setError('Bitte einen gültigen 6-stelligen Code eingeben.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Bitte zuerst anmelden, um beizutreten.');
      return;
    }
    setJoining(true);
    const { data: game, error: fetchErr } = await supabase
      .from('games')
      .select('id, player1_id')
      .eq('invite_code', code)
      .eq('status', 'waiting')
      .single();
    if (fetchErr || !game) {
      setJoining(false);
      const err = fetchErr as { code?: string; message?: string } | null;
      setError(!game || err?.code === 'PGRST116' ? 'Code nicht gefunden. Ist das Spiel noch offen?' : (err?.message ?? 'Fehler'));
      return;
    }
    if (game.player1_id === user.id) {
      setJoining(false);
      setError('Das ist dein eigenes Spiel — warte auf einen Mitspieler oder teile den Link.');
      return;
    }
    const { error: updErr } = await supabase
      .from('games')
      .update({ player2_id: user.id, status: 'active' })
      .eq('id', game.id);
    setJoining(false);
    if (updErr) {
      setError('Beitreten fehlgeschlagen: ' + updErr.message);
      return;
    }
    router.push(`/game?mode=pvp&id=${game.id}`);
  }

  async function findMatch(ranked: boolean) {
    setError('');
    setMatchmaking('searching');
    const { data: gameId, error: err } = await supabase.rpc('join_matchmaking_queue', {
      p_queue_type: ranked ? 'ranked' : 'casual',
    });
    if (err) {
      setError(err.message);
      setMatchmaking('idle');
      return;
    }
    if (gameId) {
      setMatchmaking('matched');
      router.push(`/game?mode=pvp&id=${gameId}`);
    } else {
      setMatchmaking('idle');
      setError('Kein Gegner gefunden. Versuche es erneut.');
    }
  }

  if (!authReady) {
    return (
      <PageShell backHref="/">
        <AppHeader showRanking showAuth />
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
          <p className="text-game-text-muted text-center py-8">Lade…</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell backHref="/">
      <AppHeader showRanking showAuth />
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
        <Card className="border-game-accent/20">
          <CardHeader>
            <CardTitle className="font-display text-game-text">Schnell-Suche</CardTitle>
            <CardDescription className="text-game-text-muted">
              Finde automatisch einen Gegner für eine Partie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30"
              onClick={() => findMatch(false)}
              disabled={matchmaking === 'searching'}
            >
              {matchmaking === 'searching' ? 'Suche…' : 'Schnellsuche starten'}
            </Button>
          </CardContent>
        </Card>

        {error && <p className="text-xs text-game-danger text-center">{error}</p>}

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-game-text">Neue Partie erstellen</CardTitle>
              <CardDescription className="text-game-text-muted">
                Erstelle ein Spiel und teile den Einladungscode mit deinem Gegner.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {createdGame ? (
                <>
                  <p className="text-sm text-game-text font-mono tracking-widest">{createdGame.code}</p>
                  <p className="text-xs text-game-text-muted">Teile den Code oder den Link. Warte auf deinen Gegner.</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30"
                        onClick={() => {
                          const url = typeof window !== 'undefined' ? `${window.location.origin}/lobby?join=${createdGame.code}` : '';
                          void (typeof navigator !== 'undefined' && navigator.clipboard?.writeText(url).then(() => {
                            setCopyFeedback(true);
                            setTimeout(() => setCopyFeedback(false), 2000);
                          }));
                        }}
                      >
                        {copyFeedback ? '✓ Kopiert!' : 'Link kopieren'}
                      </Button>
                      <Link href={`/game?mode=pvp&id=${createdGame.gameId}`}>
                        <Button variant="outline" className="border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text">
                          Zum Spiel
                        </Button>
                      </Link>
                    </div>
                    <Button
                      variant="ghost"
                      className="text-game-text-muted hover:text-game-danger text-xs"
                      onClick={async () => {
                        await supabase.from('games').update({ status: 'abandoned' }).eq('id', createdGame.gameId);
                        setCreatedGame(null);
                      }}
                    >
                      Spiel abbrechen
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button
                    className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30"
                    onClick={() => void createGame()}
                    disabled={creating}
                  >
                    {creating ? 'Erstelle…' : 'Spiel erstellen'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-game-text">Partie beitreten</CardTitle>
              <CardDescription className="text-game-text-muted">
                Gib den 6-stelligen Code deines Freundes ein.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="ABC123"
                className="bg-game-bg-subtle/40 border-game-border font-mono text-lg tracking-widest uppercase text-game-text"
                maxLength={6}
                value={inviteCode || joinFromUrl}
                onChange={(e) => setInviteCode(e.target.value.trim().toUpperCase())}
              />
              <Button
                className="w-full bg-game-accent/20 border-game-accent/30 text-game-accent hover:bg-game-accent/30"
                onClick={() => void joinByCode()}
                disabled={joining}
              >
                {joining ? 'Beitreten…' : 'Beitreten'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={
      <PageShell backHref="/">
        <AppHeader showRanking showAuth />
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
          <p className="text-game-text-muted text-center py-8">Lade…</p>
        </div>
      </PageShell>
    }>
      <LobbyContent />
    </Suspense>
  );
}
