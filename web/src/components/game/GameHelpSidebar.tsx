'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export type HelpVariant = 'classic' | 'schach' | 'blitz' | 'pool';

const VARIANT_TITLE: Record<HelpVariant, string> = {
  classic: 'Classic',
  schach: 'Schach',
  blitz: 'Blitz',
  pool: 'Pool',
};

interface GameHelpSidebarProps {
  open: boolean;
  onClose: () => void;
  /** Welcher Modus: eigene Anleitung wie in den MD-Docs. */
  gameVariant?: HelpVariant;
}

export function GameHelpSidebar({ open, onClose, gameVariant = 'classic' }: GameHelpSidebarProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
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
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleTransitionEnd(e: React.TransitionEvent) {
    if (e.target !== e.currentTarget) return;
    if (!open) setMounted(false);
  }

  if (!mounted) return null;

  const title = VARIANT_TITLE[gameVariant];
  const show = open && visible;

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/30 backdrop-blur-md transition-opacity ease-out ${show ? 'opacity-100 duration-200' : 'opacity-0 duration-0 pointer-events-none'}`}
        aria-hidden
        onClick={onClose}
      />
      <aside
        className={`fixed z-[70] flex flex-col shadow-xl
          transition-[transform,opacity] ease-out ${show ? 'duration-200' : 'duration-0'}
          max-md:inset-4 max-md:rounded-3xl max-md:p-[1px] max-md:bg-gradient-to-br max-md:from-white/20 max-md:via-white/08 max-md:to-white/04
          md:top-0 md:right-0 md:h-full md:w-full md:max-w-md md:rounded-none
          ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
        role="dialog"
        aria-label={`Anleitung ${title}`}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="flex flex-col flex-1 min-h-0 max-md:rounded-3xl md:rounded-none bg-game-surface/90 backdrop-blur-xl border border-white/10 md:border-l md:border-game-border/50 overflow-hidden">
          <div className="flex items-center justify-between p-4 shrink-0">
            <h2 className="font-display font-bold text-lg text-game-text">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0" aria-label="Schließen">
              <span aria-hidden>✕</span>
            </Button>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent shrink-0" aria-hidden />
          <div className="flex-1 overflow-y-auto p-4 space-y-6 text-game-text text-sm">
          <h3 className="font-display font-semibold text-base text-game-primary">Spielerklärung</h3>

          {gameVariant === 'classic' && <ClassicContent />}
          {gameVariant === 'schach' && <SchachContent />}
          {gameVariant === 'blitz' && <BlitzContent />}
          {gameVariant === 'pool' && <PoolContent />}
          </div>
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

function PoolContent() {
  return (
    <>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Grundidee</h4>
        <p className="text-game-text-muted">
          Kein eigener Vorrat. Ein <strong>gemeinsamer Pool</strong>: 6 Bauern, 6 Damen, 2 Könige. Pro Zug nimmst du <strong>eine Figur aus dem Pool</strong> und setzt sie sofort auf das Brett. Die gesetzte Figur gehört danach dir.
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Material & Stärke</h4>
        <p className="text-game-text-muted">
          Pool: 6× Bauer (klein), 6× Dame (mittel), 2× König (groß). Rang unverändert: <strong>König &gt; Dame &gt; Bauer</strong>.
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Zugablauf</h4>
        <p className="text-game-text-muted">
          Figur aus dem Pool wählen (links oder rechts) und <strong>sofort regelkonform setzen</strong>: leeres Feld oder schwächere Gegnerfigur überdecken. Du darfst nur eine Figur wählen, die du in diesem Zug legal setzen kannst.
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Sieg & Unentschieden</h4>
        <p className="text-game-text-muted">
          Sieg: 3 eigene sichtbare Figuren in einer Reihe. Unentschieden: Pool leer ohne Sieg, oder keine Figur aus dem Pool kann legal gesetzt werden.
        </p>
      </section>
      <section>
        <h4 className="font-display font-semibold text-game-primary mb-2">Swap-Regel</h4>
        <p className="text-game-text-muted">
          Nach dem ersten Zug darf der zweite Spieler einmalig <strong>die Rolle tauschen</strong> (er übernimmt die Rolle des ersten Zuges). Macht den Modus ausgewogener.
        </p>
      </section>
    </>
  );
}
