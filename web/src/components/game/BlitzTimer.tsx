'use client';

import { useState, useEffect, useRef } from 'react';

const BLITZ_SEC = 10;

export function BlitzTimer({ active, onTimeout }: { active: boolean; onTimeout?: () => void }) {
  const [sec, setSec] = useState(BLITZ_SEC);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (ref.current) clearInterval(ref.current);
      const t = setTimeout(() => setSec(BLITZ_SEC), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSec(BLITZ_SEC), 0);
    ref.current = setInterval(() => {
      setSec((s) => {
        if (s <= 1) {
          if (ref.current) clearInterval(ref.current);
          onTimeout?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      clearTimeout(t);
      if (ref.current) clearInterval(ref.current);
    };
  }, [active, onTimeout]);

  if (!active) return null;
  return (
    <div className={`font-display font-bold text-sm px-3 py-1.5 rounded-lg border ${sec <= 3 ? 'border-game-danger/50 text-game-danger animate-pulse' : 'border-game-accent/30 text-game-accent'}`}>
      ⏱ {sec}s
    </div>
  );
}
