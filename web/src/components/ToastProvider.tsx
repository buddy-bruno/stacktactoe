'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

type ToastContextValue = { toast: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {} };
  return ctx;
}

const TOAST_DURATION_MS = 3500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(msg);
    timeoutRef.current = setTimeout(() => {
      setMessage(null);
      timeoutRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 z-[9999] -translate-x-1/2 px-4 py-2.5 rounded-lg shadow-lg bg-game-surface border border-game-border text-game-text text-sm font-medium text-center max-w-[min(90vw,20rem)]"
          style={{
            top: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))',
          }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
