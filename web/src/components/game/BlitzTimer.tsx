'use client';

import { useState, useEffect, useRef } from 'react';

/** Blitz: Sekunden pro Zug (einheitlich für Spieler und KI). */
export const BLITZ_SEC = 5;

export function BlitzTimer({ active, onTimeout }: { active: boolean; onTimeout?: () => void }) {
  const [sec, setSec] = useState(BLITZ_SEC);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  const prevActiveRef = useRef(active);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (prevActiveRef.current) {
        const t = setTimeout(() => setSec(BLITZ_SEC), 0);
        return () => clearTimeout(t);
      }
      prevActiveRef.current = false;
      return () => {};
    }
    prevActiveRef.current = true;
    const startId = setTimeout(() => setSec(BLITZ_SEC), 0);
    intervalRef.current = setInterval(() => {
      setSec((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          const fn = onTimeoutRef.current;
          if (fn) setTimeout(fn, 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      clearTimeout(startId);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [active]);

  return (
    <div className={`font-display font-bold text-sm px-3 py-1.5 rounded-lg border ${active && sec <= 3 ? 'border-game-danger/50 text-game-danger animate-pulse' : 'border-game-accent/30 text-game-accent'}`}>
      ⏱ {sec}s
    </div>
  );
}
