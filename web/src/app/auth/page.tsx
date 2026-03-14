'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/lib/supabase';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(redirect);
    }).catch(() => {});
  }, [redirect, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessageIsError(true);
      setMessage(error.message);
      return;
    }
    router.push(redirect);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessageIsError(true);
      setMessage(error.message);
      return;
    }
    setMessageIsError(false);
    setMessage('Konto erstellt. Prüfe deine E-Mail oder melde dich an.');
  }

  return (
    <PageShell backHref="/">
      <AppHeader showRanking showAuth />

      <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
        <h1 className="font-display text-2xl font-bold text-center text-game-text">
          {tab === 'login' ? 'Anmelden' : 'Registrieren'}
        </h1>
        <div className="w-full max-w-2xl flex flex-col items-center">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 pt-6">
              <div role="tablist" aria-label="Anmelden oder Registrieren" className="flex rounded-lg border border-game-border p-1 gap-1 bg-game-bg-subtle">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'login'}
                  aria-controls="auth-tabpanel-login"
                  id="auth-tab-login"
                  onClick={() => setTab('login')}
                  className={`flex-1 py-2 rounded-md font-display text-xs font-bold transition-colors ${tab === 'login' ? 'bg-game-primary text-game-text-inverse' : 'text-game-text-muted hover:text-game-text'}`}
                >
                  Anmelden
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'register'}
                  aria-controls="auth-tabpanel-register"
                  id="auth-tab-register"
                  onClick={() => setTab('register')}
                  className={`flex-1 py-2 rounded-md font-display text-xs font-bold transition-colors ${tab === 'register' ? 'bg-game-primary text-game-text-inverse' : 'text-game-text-muted hover:text-game-text'}`}
                >
                  Registrieren
                </button>
              </div>

              {tab === 'login' ? (
                <form id="auth-tabpanel-login" role="tabpanel" aria-labelledby="auth-tab-login" onSubmit={handleLogin} className="space-y-3">
                  <Input type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-game-bg-subtle/40 border-game-border text-game-text" required />
                  <Input type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-game-bg-subtle/40 border-game-border text-game-text" required />
                  <Button type="submit" className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30" disabled={loading}>Anmelden</Button>
                </form>
              ) : (
                <form id="auth-tabpanel-register" role="tabpanel" aria-labelledby="auth-tab-register" onSubmit={handleRegister} className="space-y-3">
                  <Input type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-game-bg-subtle/40 border-game-border text-game-text" required />
                  <Input type="password" placeholder="Passwort (min. 6 Zeichen)" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-game-bg-subtle/40 border-game-border text-game-text" minLength={6} required />
                  <Button type="submit" className="w-full bg-game-primary/20 border-game-primary/30 text-game-primary hover:bg-game-primary/30" disabled={loading}>Registrieren</Button>
                </form>
              )}

              {message && <p className={`text-sm ${messageIsError ? 'text-game-danger' : 'text-game-success'}`} role="alert">{message}</p>}
              <p className="text-center text-sm text-game-text-muted">
                Hiermit akzeptiere ich die AGB&apos;s und Datenschutz.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </PageShell>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <PageShell backHref="/">
        <AppHeader showRanking showAuth />
        <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
          <p className="text-game-text-muted text-center">Lade…</p>
        </main>
      </PageShell>
    }>
      <AuthContent />
    </Suspense>
  );
}
