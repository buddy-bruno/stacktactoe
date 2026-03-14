'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(q ? `/zugang?${q}` : '/zugang');
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-game-bg flex items-center justify-center text-game-text-muted">
      Lade…
    </div>
  );
}

/** Weiterleitung: /auth → /zugang (Anmelden/Registrieren). */
export default function AuthRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-game-bg flex items-center justify-center text-game-text-muted">Lade…</div>}>
      <AuthRedirect />
    </Suspense>
  );
}
