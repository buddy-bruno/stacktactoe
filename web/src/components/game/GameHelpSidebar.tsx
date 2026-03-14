'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export type HelpVariant = 'classic' | 'schach' | 'blitz';

const VARIANT_TITLE: Record<HelpVariant, string> = {
  classic: 'Classic',
  schach: 'Schach',
  blitz: 'Blitz',
};

interface GameHelpSidebarProps {
  open: boolean;
  onClose: () => void;
  /** Welcher Modus: eigene Anleitung wie in den MD-Docs. */
  gameVariant?: HelpVariant;
}

export function GameHelpSidebar({ open, onClose, gameVariant = 'classic' }: GameHelpSidebarProps) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
    }
  }, [open]);
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleTransitionEnd(e: React.TransitionEvent) {
    if (e.target !== e.currentTarget) return;
    if (!open) setMounted(false);
  }

  if (!mounted) return null;

  const title = VARIANT_TITLE[gameVariant];

  return (
    <>
      {/* z-[60] über Header (z-50), damit Backdrop auch Nav/Header blurt */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-md md:bg-black/25 transition-opacity duration-300 ease-out ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-md bg-game-surface border-l border-game-border shadow-xl flex flex-col transition-[transform] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label={`Anleitung ${title}`}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="flex items-center justify-between p-4 border-b border-game-border shrink-0">
          <h2 className="font-display font-bold text-lg text-game-text">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0" aria-label="Schließen">
            <span aria-hidden>✕</span>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-game-text text-sm">
          <h3 className="font-display font-semibold text-base text-game-primary">Spielerklärung</h3>

          {gameVariant === 'classic' && <ClassicContent />}
          {gameVariant === 'schach' && <SchachContent />}
          {gameVariant === 'blitz' && <BlitzContent />}
        </div>
      </aside>
    </>
  );
}

function ClassicContent() {
  return (
    <>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Spielidee</h4>
        <p className="text-game-text-muted">
          Zwei Spieler versuchen, <strong>3 eigene sichtbare Figuren in eine Reihe</strong> zu bringen. Eine stärkere Figur kann eine schwächere gegnerische auf demselben Feld <strong>überdecken</strong> (Stapel). Es gibt <strong>kein Bewegen</strong> bereits gesetzter Figuren.
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Material & Stärke</h4>
        <p className="text-game-text-muted">
          Pro Spieler: 3 Bauern (klein), 3 Damen (mittel), 1 König (groß). Rang: <strong>König &gt; Dame &gt; Bauer</strong>.
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Brett & Ziel</h4>
        <p className="text-game-text-muted">
          9 Felder (3×3). Gewinn: 3 eigene <strong>sichtbare</strong> Figuren in einer Reihe (horizontal, vertikal oder diagonal). Es zählt nur die <strong>oberste</strong> Figur pro Feld.
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Züge</h4>
        <ul className="list-disc list-inside text-game-text-muted space-y-1">
          <li>Auf <strong>leeres Feld</strong> setzen oder <strong>schwächere Gegnerfigur überdecken</strong> (Dame über Bauer, König über Bauer/Dame).</li>
          <li>Nicht erlaubt: eigene überdecken; gleich starke oder stärkere gegnerische überdecken.</li>
        </ul>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Stapel</h4>
        <p className="text-game-text-muted">
          Überdeckte Figuren bleiben im Stapel. Es zählt nur die oberste sichtbare Figur pro Feld.
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Ende der Runde</h4>
        <p className="text-game-text-muted">
          Sieg: 3 eigene in einer Reihe. Unentschieden: Beide haben keinen legalen Zug mehr.
        </p>
      </section>
    </>
  );
}

function SchachContent() {
  return (
    <>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Grundidee</h4>
        <p className="text-game-text-muted">
          Zunächst setzen wie Classic. <strong>Ab 3 eigenen Figuren auf dem Brett</strong> darfst du pro Zug wählen: <strong>setzen</strong> oder <strong>eine sichtbare eigene Figur um 1 Feld bewegen</strong>. Material &amp; Ziel wie Classic.
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Vor der Bewegungsfreischaltung</h4>
        <p className="text-game-text-muted">
          Weniger als 3 eigene Figuren auf dem Brett: nur Setzen (leeres Feld oder schwächere Gegnerfigur überdecken). Verdeckte Figuren zählen mit – ab 3 eigenen ist Bewegen freigeschaltet.
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Bewegen</h4>
        <p className="text-game-text-muted">
          Nur die <strong>oberste sichtbare</strong> eigene Figur pro Feld ziehbar. Genau <strong>1 Feld</strong> (Nachbar, auch diagonal). Zielfeld: leer oder <strong>schwächere Gegnerfigur</strong> (dann Schlagen: Gegnerfigur wird vom Brett entfernt und bleibt weg).
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Schlagen</h4>
        <p className="text-game-text-muted">
          Überdecken = Schlagen. Die gegnerische Figur wird entfernt; beim Wegziehen bleibt das Feld leer (keine Freilegung).
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Sieg & Unentschieden</h4>
        <p className="text-game-text-muted">
          Sieg: 3 sichtbare eigene in einer Reihe. Unentschieden: Dreifache gleiche Stellung, Zurückpendeln verboten, oder kein legaler Zug.
        </p>
      </section>
    </>
  );
}

function BlitzContent() {
  return (
    <>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Spielidee</h4>
        <p className="text-game-text-muted">
          Gleiche Regeln wie <strong>Classic</strong> (nur Setzen, kein Bewegen). Zusätzlich: <strong>5 Sekunden pro Zug</strong>. Zeit läuft für dich sichtbar und für die KI intern.
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Zeitablauf</h4>
        <p className="text-game-text-muted">
          Läuft die Zeit ab, bevor ein Zug ausgeführt wird, <strong>verliert der Spieler die Runde</strong> (der andere gewinnt). Der Runden-Gewinner erhält <strong>4 Punkte</strong> für diese Runde.
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Ablauf</h4>
        <p className="text-game-text-muted">
          Pro Runde: Classic-Logik. Dein Zug: Timer sichtbar; Ablauf → du verlierst die Runde. KI-Zug: 5 s Frist; zieht die KI nicht rechtzeitig → du gewinnst die Runde. 5 Siege = Match gewonnen.
        </p>
      </section>
    </>
  );
}
