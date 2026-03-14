import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';

export const metadata = {
  title: 'Kontakt — Stack Tac Toe',
  description: 'Kontaktmöglichkeiten für Stack Tac Toe.',
};

export default function KontaktPage() {
  return (
    <PageShell backHref="/" header={<AppHeader title="Kontakt" showRanking showAuth />}>
      <main className="flex-1 flex flex-col gap-6 py-8">
        <h1 className="font-display text-2xl font-bold text-game-text">
          Kontakt
        </h1>
        <p className="text-game-text-muted text-sm">
          So erreichst du uns
        </p>
        <section className="flex flex-col gap-4 text-game-text text-sm">
          <p>
            <strong>René Nettelbeck</strong><br />
            Fährstraße 217<br />
            40221 Düsseldorf
          </p>
          <p>
            <strong>Rufnummer</strong><br />
            <a href="tel:+4915901795625" className="text-game-primary hover:underline">0159 0179 56 25</a>
          </p>
          <p>
            <strong>E-Mail</strong><br />
            <a href="mailto:nettelbeck555@gmail.com" className="text-game-primary hover:underline">nettelbeck555@gmail.com</a>
          </p>
          <p className="text-game-text-muted">
            Bei Fragen, Feedback oder technischen Problemen — wir antworten in der Regel innerhalb von wenigen Werktagen.
          </p>
        </section>
      </main>
    </PageShell>
  );
}
