import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { ModeCard } from '@/components/layout/ModeCard';

export default function HomePage() {
  return (
    <PageShell header={<AppHeader showRanking showAuth />}>
      <main className="flex-1 flex flex-col items-center justify-center gap-8 py-12 pb-20">
        <h1 className="font-display text-2xl font-bold text-center text-game-text">
          Wähle deinen Modus
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          <ModeCard
            mode="classic"
            title="Classic"
            description="10 Runden pro Partie. Stapeln & Schlagen — gegen KI oder Online-Gegner."
            href="/play?mode=classic"
          />
          <ModeCard
            mode="daily"
            title="Daily Challenge"
            description="Ein Match pro Tag. Dein bestes Ergebnis zählt für die Rangliste."
            href="/daily"
            badge="Coming Soon"
            comingSoon
          />
          <ModeCard
            mode="puzzle"
            title="Puzzle"
            description="Ein Zug zum Sieg. Gewinnzug in vorgegebenen Stellungen."
            href="#"
            badge="Coming Soon"
            comingSoon
          />
          <ModeCard
            mode="blitz"
            title="Blitz"
            description="10 Sekunden pro Zug. Zeitdruck-Match gegen KI oder im Duell."
            href="#"
            badge="Coming Soon"
            comingSoon
          />
        </div>
      </main>
    </PageShell>
  );
}
