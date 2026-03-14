'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type Profile = { display_name: string | null; username: string; avatar_color: string | null };

interface NavSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function NavSidebar({ open, onClose }: NavSidebarProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false); // für Einblend-Animation: erst rechts, dann rein
  const [user, setUser] = useState<SupabaseUser | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => setMounted(true));
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    } else {
      queueMicrotask(() => setVisible(false));
    }
  }, [open]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null)).catch(() => setUser(null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      queueMicrotask(() => setProfile(null));
      return;
    }
    void Promise.resolve(
      supabase.from('profiles').select('display_name, username, avatar_color').eq('id', user.id).single()
    ).then(({ data }) => setProfile((data as Profile) ?? null), () => setProfile(null));
  }, [user?.id]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  function handleLink() {
    onClose();
  }

  function handleLogout() {
    supabase.auth.signOut();
    onClose();
    router.push('/');
  }

  function handleTransitionEnd(e: React.TransitionEvent) {
    if (e.target !== e.currentTarget) return;
    if (!open) setMounted(false);
  }

  if (!mounted) return null;

  const displayName = profile?.display_name?.trim() || profile?.username || 'Spieler';

  const show = open && visible;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-game-bg-subtle border-l border-game-border shadow-2xl flex flex-col will-change-transform transition-[transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${show ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label="Menü"
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="flex items-center justify-between p-4 max-[1024px]:py-2.5 max-[1024px]:px-3 border-b border-game-border shrink-0 rounded-[11px] rounded-b-none backdrop-blur-2xl bg-game-surface/90">
          <span className="text-sm sm:text-base font-semibold text-game-text">Menü</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 text-game-text hover:bg-game-surface-hover" aria-label="Schließen">
            <span aria-hidden>✕</span>
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          <div className="space-y-0.5">
            <Link href="/" onClick={handleLink} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-game-text hover:bg-game-surface-hover hover:text-game-primary transition-colors">
              <span className="text-lg shrink-0" aria-hidden>🏠</span>
              <span>Dashboard</span>
            </Link>
            <Link href="/play" onClick={handleLink} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-game-text hover:bg-game-surface-hover hover:text-game-primary transition-colors">
              <span className="text-lg shrink-0" aria-hidden>🎮</span>
              <span>Jetzt spielen</span>
            </Link>
            <Link href="/ranking" onClick={handleLink} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-game-text hover:bg-game-surface-hover hover:text-game-primary transition-colors">
              <span className="text-lg shrink-0" aria-hidden>🏆</span>
              <span>Rangliste</span>
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-game-border space-y-0.5">
            <Link href="/profile" onClick={handleLink} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-game-text hover:bg-game-surface-hover hover:text-game-primary transition-colors">
              <span className="text-lg shrink-0" aria-hidden>👤</span>
              <span>Mein Konto</span>
            </Link>
            <Link href="/kontakt" onClick={handleLink} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-game-text hover:bg-game-surface-hover hover:text-game-primary transition-colors">
              <span className="text-lg shrink-0" aria-hidden>❓</span>
              <span>Hilfe &amp; Kontakt</span>
            </Link>
          </div>

          <div className="mt-auto pt-6 pb-4 border-t border-game-border space-y-4">
            {user === undefined ? (
              <div className="h-12 flex items-center justify-center text-game-text-muted text-sm">Lade…</div>
            ) : !user ? (
              <Link href="/zugang?redirect=/lobby" onClick={handleLink} className="block">
                <Button className="w-full h-9 rounded-lg text-sm bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30">
                  Anmelden / Registrieren
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2">
                <div
                  className="h-10 w-10 rounded-full shrink-0"
                  style={{ backgroundColor: profile?.avatar_color ?? 'var(--game-primary)' }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-game-text truncate">{displayName}</p>
                  <p className="text-xs text-game-text-muted truncate">{user.email ?? ''}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="shrink-0 text-game-text-muted hover:text-game-danger hover:bg-game-danger/10" aria-label="Abmelden">
                  <span aria-hidden>👋</span>
                </Button>
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
