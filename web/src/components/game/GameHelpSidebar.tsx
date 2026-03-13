'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameHelpSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function GameHelpSidebar({ open, onClose }: GameHelpSidebarProps) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-once so exit animation runs
      setMounted(true);
    }
  }, [open]);
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:bg-black/20 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-game-surface border-l border-game-border shadow-xl flex flex-col transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label="Spielerklärung"
      >
        <div className="flex items-center justify-between p-4 border-b border-game-border shrink-0">
          <h2 className="font-display font-bold text-lg text-game-text">Spielerklärung</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0" aria-label="Schließen">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-game-text text-sm">
          <section>
            <h3 className="font-display font-semibold text-game-primary mb-2">Ziel</h3>
            <p className="text-game-text-muted">
              Drei eigene Figuren in einer Reihe (waagrecht, senkrecht oder diagonal) platzieren — wie Tic-Tac-Toe, aber mit Stapeln und Schlagregeln.
            </p>
          </section>
          <section>
            <h3 className="font-display font-semibold text-game-primary mb-2">Brett</h3>
            <p className="text-game-text-muted">
              3×3 Felder. In jedes Feld können Figuren gestapelt werden. Es zählt nur die <strong>oberste</strong> Figur eines Stapels.
            </p>
          </section>
          <section>
            <h3 className="font-display font-semibold text-game-primary mb-2">Figuren</h3>
            <ul className="list-disc list-inside text-game-text-muted space-y-1">
              <li><strong>Bauer</strong> (klein) — schlägt nichts, kann geschlagen werden</li>
              <li><strong>Dame</strong> (mittel) — schlägt Bauer</li>
              <li><strong>König</strong> (groß) — schlägt Bauer und Dame</li>
            </ul>
            <p className="text-game-text-muted mt-2">Gleiche Größe schlägt gleiche Größe (beide weg). Pro Seite: 3 Bauern, 3 Damen, 2 Könige.</p>
          </section>
          <section>
            <h3 className="font-display font-semibold text-game-primary mb-2">Ablauf einer Runde</h3>
            <ol className="list-decimal list-inside text-game-text-muted space-y-2">
              <li><strong>Platzierungsphase:</strong> Reihum setzt jeder eine Figur aus seinem Vorrat auf ein leeres Feld.</li>
              <li><strong>Bewegungsphase:</strong> Reihum zieht jeder die oberste Figur eines Stapels auf ein Nachbarfeld (waagrecht, senkrecht oder diagonal). Liegt dort eine kleinere oder gleich große Figur, wird sie geschlagen (vom Brett). Größere Figur blockt den Zug.</li>
            </ol>
          </section>
          <section>
            <h3 className="font-display font-semibold text-game-primary mb-2">Sieg & Match</h3>
            <p className="text-game-text-muted">
              Wer zuerst drei eigene Figuren in einer Reihe hat, gewinnt die Runde. Ein Match besteht aus mehreren Runden; die Rundenpunkte werden gezählt.
            </p>
          </section>
        </div>
      </aside>
    </>
  );
}
