'use client';

import { useEffect } from 'react';

/**
 * Unterdrückt in der Entwicklung die Konsole für den bekannten AbortError
 * "Lock broken by another request with the 'steal' option" (Web Locks API),
 * ausgelöst z. B. durch Turbopack/HMR oder Supabase bei schneller Navigation.
 * In Production wird nichts geändert.
 */
export function DevSuppressLockAbortError() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const handler = (event: PromiseRejectionEvent) => {
      const err = event.reason;
      if (err?.name === 'AbortError' && typeof err?.message === 'string' && err.message.includes("Lock broken by another request") && err.message.includes("steal")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  return null;
}
