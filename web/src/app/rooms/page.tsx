'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

const VARIANTS = ['classic', 'schach', 'pool', 'blitz'] as const;
const VARIANT_LABELS: Record<(typeof VARIANTS)[number], string> = {
  classic: 'Classic',
  schach: 'Schach',
  pool: 'Pool',
  blitz: 'Blitz',
};

type Room = {
  id: string;
  name: string;
  invite_code: string | null;
  created_by: string | null;
  variant: string;
  is_public?: boolean;
  max_members?: number;
  creator?: { display_name: string | null; username: string | null } | null;
};

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function RoomsPage() {
  const router = useRouter();
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [myRoomIds, setMyRoomIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState('');
  const [createVariant, setCreateVariant] = useState<(typeof VARIANTS)[number]>('classic');
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [memberCountByRoom, setMemberCountByRoom] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/zugang?redirect=/rooms');
        return;
      }
      setUserId(data.user.id);
    }).catch(() => router.replace('/zugang?redirect=/rooms'));
  }, [router]);

  const fetchRooms = useCallback(async () => {
    if (!userId) return;
    const { data: myMembers } = await supabase.from('room_members').select('room_id').eq('user_id', userId);
    const myIds = myMembers?.map((m) => m.room_id) ?? [];

    const { data: roomList } = await supabase
      .from('rooms')
      .select('id, name, invite_code, created_by, variant, is_public, max_members, profiles(display_name, username)')
      .order('variant')
      .order('name');

    const roomsWithCreator = (roomList ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      invite_code: r.invite_code as string | null,
      created_by: r.created_by as string | null,
      variant: (r.variant as string) || 'classic',
      is_public: r.is_public as boolean | undefined,
      max_members: (r.max_members as number) ?? 20,
      creator: (r.profiles ?? r.creator) as Room['creator'],
    }));
    setAllRooms(roomsWithCreator);
    setMyRoomIds(new Set(myIds));

    const roomIds = roomsWithCreator.map((ro) => ro.id);
    if (roomIds.length > 0) {
      const { data: allMembers } = await supabase.from('room_members').select('room_id').in('room_id', roomIds);
      const countByRoom: Record<string, number> = {};
      for (const rid of roomIds) countByRoom[rid] = 0;
      for (const m of allMembers ?? []) {
        const id = (m as { room_id: string }).room_id;
        if (id in countByRoom) countByRoom[id] += 1;
      }
      setMemberCountByRoom(countByRoom);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => { void fetchRooms(); }, 0);
    return () => clearTimeout(t);
  }, [userId, fetchRooms]);

  useEffect(() => {
    if (!userId) return;
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        debounceId = null;
        void fetchRooms();
      }, 300);
    };
    const channel = supabase.channel('rooms-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rooms' }, scheduleRefetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, scheduleRefetch)
      .subscribe();
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') void fetchRooms();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (debounceId) clearTimeout(debounceId);
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, fetchRooms]);

  const myRooms = useMemo(() => allRooms.filter((r) => myRoomIds.has(r.id)), [allRooms, myRoomIds]);
  const roomsByVariant = useMemo(() => {
    const map: Record<string, Room[]> = { classic: [], schach: [], pool: [], blitz: [] };
    for (const r of allRooms) {
      const v = VARIANTS.includes(r.variant as (typeof VARIANTS)[number]) ? r.variant : 'classic';
      if (!map[v]) map[v] = [];
      map[v].push(r);
    }
    return map;
  }, [allRooms]);

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
      const { data: room, error: err } = await supabase
        .from('rooms')
        .insert({ name, created_by: user.id, invite_code: code, variant: createVariant })
        .select('id')
        .single();
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

  async function joinPublicRoom(roomId: string) {
    if (!userId) return;
    setError('');
    const { error: err } = await supabase.from('room_members').insert({ room_id: roomId, user_id: userId }).select().single();
    if (err) {
      if ((err as { code?: string }).code === '23505') router.push('/room/' + roomId);
      else setError('Beitreten fehlgeschlagen.');
    } else {
      router.push('/room/' + roomId);
    }
  }

  if (!userId) {
    return (
      <PageShell backHref="/lobby" header={<AppHeader title="Räume" showRanking showAuth />}>
        <main className="flex-1 flex flex-col items-center justify-center py-12">
          <p className="text-game-text-muted">Lade…</p>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell backHref="/lobby" header={<AppHeader title="Räume" showRanking showAuth />}>
      <main className="flex-1 flex flex-col gap-6 py-8 pb-20 max-w-2xl mx-auto w-full px-4">
        <h1 className="font-display text-2xl font-bold text-game-text">Räume</h1>

        {/* Räume nach Spielmodi */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Räume nach Spielmodus</CardTitle>
            <CardDescription className="text-game-text-muted">Alle Räume von allen Nutzern, gruppiert nach Spielmodus. Anzeige: Mitglieder (z. B. 1/20 = einer drin, max. 20).</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-game-text-muted text-sm">Lade…</p>
            ) : (
              <div className="space-y-6">
                {VARIANTS.map((variant) => {
                  const list = roomsByVariant[variant] ?? [];
                  if (list.length === 0) return null;
                  return (
                    <section key={variant}>
                      <h3 className="text-sm font-semibold text-game-text-muted mb-2">{VARIANT_LABELS[variant]}</h3>
                      <ul className="space-y-2">
                        {list.map((r) => {
                          const isMember = myRoomIds.has(r.id);
                          const creatorName = r.creator?.display_name?.trim() || r.creator?.username || null;
                          return (
                            <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-game-border bg-game-bg-subtle/40 p-2">
                              <span className="font-medium text-game-text flex-1 min-w-0 truncate">{r.name}</span>
                              <span className="text-xs text-game-text-muted tabular-nums">{memberCountByRoom[r.id] ?? 0}/{r.max_members ?? 20}</span>
                              {creatorName && <span className="text-xs text-game-text-muted">@{r.creator?.username ?? creatorName}</span>}
                              <span className="text-xs text-game-text-muted">{VARIANT_LABELS[r.variant as keyof typeof VARIANT_LABELS] ?? r.variant}</span>
                              {isMember ? (
                                <Link href={'/room/' + r.id}>
                                  <Button variant="outline" size="sm" className="border-game-border text-game-text hover:bg-game-surface-hover">Öffnen</Button>
                                </Link>
                              ) : r.is_public ? (
                                <Button size="sm" className="bg-game-accent/20 border-game-accent/30 text-game-accent hover:bg-game-accent/30" onClick={() => void joinPublicRoom(r.id)}>Beitreten</Button>
                              ) : (
                                <span className="text-xs text-game-text-muted">Per Code beitreten</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
                {allRooms.length === 0 && <p className="text-game-text-muted text-sm">Noch keine Räume sichtbar. Erstelle einen oder trete per Code bei.</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-game-text">Raum erstellen</CardTitle>
            <CardDescription className="text-game-text-muted">Erstelle einen neuen Raum und wähle den Spielmodus.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Raumname"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="bg-game-bg-subtle/40 border-game-border text-game-text"
            />
            <div className="flex flex-wrap gap-2">
              {VARIANTS.map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={createVariant === v ? 'default' : 'outline'}
                  size="sm"
                  className={createVariant === v ? 'bg-game-primary text-white' : 'border-game-border text-game-text'}
                  onClick={() => setCreateVariant(v)}
                >
                  {VARIANT_LABELS[v]}
                </Button>
              ))}
            </div>
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
            ) : myRooms.length === 0 ? (
              <p className="text-game-text-muted text-sm">Noch keine Räume. Erstelle einen oder trete per Code bei.</p>
            ) : (
              <ul className="space-y-2">
                {myRooms.map((r) => (
                  <li key={r.id}>
                    <Link href={'/room/' + r.id}>
                      <Button variant="outline" className="w-full justify-start border-game-border text-game-text hover:bg-game-surface-hover hover:text-game-text">
                        <span className="flex-1 text-left truncate">{r.name}</span>
                        <span className="text-xs text-game-text-muted shrink-0 ml-2 tabular-nums">{memberCountByRoom[r.id] ?? 0}/{r.max_members ?? 20}</span>
                        <span className="text-xs text-game-text-muted shrink-0 ml-2">{VARIANT_LABELS[r.variant as keyof typeof VARIANT_LABELS] ?? r.variant}</span>
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-game-accent/20">
          <CardHeader>
            <CardTitle className="font-display text-game-text">Schnell spielen</CardTitle>
            <CardDescription className="text-game-text-muted">Ohne Raum direkt einen Gegner finden.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Link href="/lobby" className="flex-1">
              <Button className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30">
                Schnell-Suche
              </Button>
            </Link>
            <Link href="/lobby" className="flex-1">
              <Button className="w-full bg-game-accent/20 border-game-accent/30 text-game-accent hover:bg-game-accent/30">
                Roulette
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}
