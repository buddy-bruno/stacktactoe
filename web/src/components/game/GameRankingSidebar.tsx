'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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

type GameMode = 'ai' | 'pvp' | 'daily';

interface GameRankingSidebarProps {
  open: boolean;
  onClose: () => void;
  /** Aktueller Spielmodus — Sidebar zeigt passende Rangliste (KI oder PvP) */
  gameMode: GameMode;
}

export function GameRankingSidebar({ open, onClose, gameMode }: GameRankingSidebarProps) {
  const [activeTab, setActiveTab] = useState<'pvp' | 'ai'>(gameMode === 'pvp' ? 'pvp' : 'ai');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-once for sidebar
      setMounted(true);
    }
  }, [open]);
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!mounted || !open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync tab to gameMode when sidebar opens
    setActiveTab(gameMode === 'pvp' ? 'pvp' : 'ai');
  }, [gameMode, mounted, open]);

  const loadRanking = useCallback(async (tab: 'pvp' | 'ai') => {
    setLoading(true);
    if (tab === 'ai') {
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
  }, []);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load ranking when sidebar opens/tab changes
    loadRanking(activeTab);
  }, [open, activeTab, loadRanking]);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  function handleTransitionEnd(e: React.TransitionEvent) {
    if (e.target !== e.currentTarget) return;
    if (!open) setMounted(false);
  }

  if (!mounted) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[var(--game-overlay-bg)] md:bg-[var(--game-overlay-bg-desktop)] backdrop-blur-sm transition-opacity duration-300 ease-out ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-game-surface border-l border-game-border shadow-xl flex flex-col transition-[transform] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label="Rangliste"
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="flex items-center justify-between p-4 border-b border-game-border shrink-0">
          <h2 className="font-display font-bold text-lg text-game-text">Rangliste</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0" aria-label="Schließen">
            <span aria-hidden>✕</span>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {gameMode === 'pvp' && (
            <p className="text-game-text-muted text-sm mb-3">Spiel gegen echte Gegner — hier die Multiplayer-Rangliste.</p>
          )}
          {(gameMode === 'ai' || gameMode === 'daily') && (
            <p className="text-game-text-muted text-sm mb-3">Punkte aus allen KI-Partien (Anfänger, Schwer, Profi).</p>
          )}

          {myProfile && (
            <div className="mb-4 p-3 rounded-xl bg-game-primary/10 border border-game-primary/20">
              <p className="text-xs font-medium text-game-primary uppercase tracking-wider mb-1">Deine Stats vs KI</p>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <p className="font-display font-bold text-game-accent">{myProfile.ai_easy_points ?? 0}</p>
                  <p className="text-game-text-muted text-xs">Anfänger</p>
                </div>
                <div>
                  <p className="font-display font-bold text-game-accent">{myProfile.ai_mid_points ?? 0}</p>
                  <p className="text-game-text-muted text-xs">Schwer</p>
                </div>
                <div>
                  <p className="font-display font-bold text-game-accent">{myProfile.ai_hard_points ?? 0}</p>
                  <p className="text-game-text-muted text-xs">Profi</p>
                </div>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'pvp' | 'ai'); loadRanking(v as 'pvp' | 'ai'); }}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="pvp">Multiplayer</TabsTrigger>
              <TabsTrigger value="ai">Gegen KI</TabsTrigger>
            </TabsList>
            {(['pvp', 'ai'] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                {loading ? (
                  <p className="text-game-text-muted py-6 text-center">Laden…</p>
                ) : (
                  <div className="space-y-2">
                    {profiles.map((p, i) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-game-bg-subtle/30 border border-game-border"
                      >
                        <span className="w-6 text-sm font-display font-bold text-game-primary">#{i + 1}</span>
                        <div
                          className="w-7 h-7 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.avatar_color || 'var(--game-primary)' }}
                        />
                        <span className="flex-1 text-sm font-medium truncate text-game-text">
                          {p.display_name || p.username}
                        </span>
                        <span className="font-display font-bold text-game-accent text-sm">
                          {tab === 'pvp' ? (p.pvp_points ?? 0) : aiTotal(p)}
                        </span>
                        {tab === 'pvp' && (
                          <span className="text-xs text-game-text-muted">{p.pvp_wins ?? 0} Siege</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </aside>
    </>
  );
}
