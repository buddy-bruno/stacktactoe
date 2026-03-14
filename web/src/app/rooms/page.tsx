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

type Room = { id: string; name: string; invite_code: string | null; created_by: string | null };

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/auth?redirect=/rooms');
        return;
      }
      setUserId(data.user.id);
    }).catch(() => router.replace('/auth?redirect=/rooms'));
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: members } = await supabase.from('room_members').select('room_id').eq('user_id', userId);
      if (!members?.length) {
        setRooms([]);
        setLoading(false);
        return;
      }
      const ids = members.map((m) => m.room_id);
      const { data: roomList } = await supabase.from('rooms').select('id, name, invite_code, created_by').in('id', ids).order('name');
      setRooms((roomList as Room[]) ?? []);
      setLoading(false);
    })();
  }, [userId]);

  async function createRoom() {
    setError('');
    const name = createName.trim();
    if (!name) {
      setError('Bitte einen Raumnamen eingeben.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCreating(true);
    let code = generateRoomCode();
    for (let i = 0; i < 5; i++) {
      const { data: room, error: err } = await supabase.from('rooms').insert({ name, created_by: user.id, invite_code: code }).select('id').single();
      if (!err && room) {
        await supabase.from('room_members').insert({ room_id: room.id, user_id: user.id });
        setCreating(false);
        setCreateName('');
        router.push('/room/' + room.id);
        return;
      }
      if ((err as { code?: string })?.code === '23505') code = generateRoomCode();
      else break;
    }
    setError('Raum konnte nicht erstellt werden.');
    setCreating(false);
  }

  async function joinRoom() {
    setError('');
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      setError('Bitte einen gültigen Code eingeben.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setJoining(true);
    const { data: room } = await supabase.from('rooms').select('id').eq('invite_code', code).single();
    if (!room) {
      setError('Code nicht gefunden.');
      setJoining(false);
      return;
    }
    const { error: err } = await supabase.from('room_members').insert({ room_id: room.id, user_id: user.id }).select().single();
    if (err) {
      if ((err as { code?: string }).code === '23505') {
        router.push('/room/' + room.id);
      } else {
        setError('Beitreten fehlgeschlagen.');
      }
    } else {
      router.push('/room/' + room.id);
    }
    setJoining(false);
  }

  if (!userId) {
    return (
      <PageShell backHref="/lobby" header={<AppHeader showRanking showAuth />}>
        <main className="flex-1 flex flex-col items-center justify-center py-12">
          <p className="text-game-text-muted">Lade…</p>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell backHref="/lobby" header={<AppHeader showRanking showAuth />}>
      <main className="flex-1 flex flex-col gap-6 py-8 pb-20 max-w-2xl mx-auto w-full px-4">
        <h1 className="font-display text-2xl font-bold text-game-text">Räume</h1>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Raum erstellen</CardTitle>
            <CardDescription className="text-game-text-muted">Erstelle einen neuen Raum und lade andere per Code ein.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Raumname"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="bg-game-bg-subtle/40 border-game-border text-game-text"
            />
            <Button className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30" onClick={() => void createRoom()} disabled={creating}>
              {creating ? 'Erstelle…' : 'Raum erstellen'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Raum beitreten</CardTitle>
            <CardDescription className="text-game-text-muted">Gib den Einladungscode des Raums ein.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.trim().toUpperCase())}
              className="bg-game-bg-subtle/40 border-game-border font-mono tracking-widest text-game-text"
              maxLength={6}
            />
            <Button className="w-full bg-game-accent/20 border-game-accent/30 text-game-accent hover:bg-game-accent/30" onClick={() => void joinRoom()} disabled={joining}>
              {joining ? 'Beitreten…' : 'Beitreten'}
            </Button>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-game-danger text-center">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Meine Räume</CardTitle>
            <CardDescription className="text-game-text-muted">Räume, denen du beigetreten bist.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-game-text-muted text-sm">Lade…</p>
            ) : rooms.length === 0 ? (
              <p className="text-game-text-muted text-sm">Noch keine Räume. Erstelle einen oder trete per Code bei.</p>
            ) : (
              <ul className="space-y-2">
                {rooms.map((r) => (
                  <li key={r.id}>
                    <Link href={'/room/' + r.id}>
                      <Button variant="outline" className="w-full justify-start border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text">
                        {r.name}
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
