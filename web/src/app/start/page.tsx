'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function StartPage() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-end bg-game-bg text-game-text overflow-hidden"
      style={{
        backgroundImage: 'url(/stacktactoe-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: '50% 0%',
      }}
    >
      <div className="w-full max-w-[var(--game-content-max-width)] px-[var(--game-content-padding)] flex justify-center pb-12">
        <Link href="/play" className="w-full sm:w-auto">
          <Button
            size="lg"
            className="w-full sm:min-w-[200px] h-12 sm:h-14 text-base sm:text-lg font-semibold bg-game-primary hover:bg-game-primary/90 text-white border-0 shadow-lg"
          >
            Jetzt spielen
          </Button>
        </Link>
      </div>
    </div>
  );
}
