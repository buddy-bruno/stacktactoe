import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';

export const metadata = {
  title: 'Impressum — Stack Tac Toe',
  description: 'Impressum und Angaben gemäß § 5 TMG.',
};

export default function ImpressumPage() {
  return (
    <PageShell backHref="/" header={<AppHeader title="Impressum" showRanking showAuth />}>
      <main className="flex-1 flex flex-col gap-6 py-8">
        <h1 className="font-display text-2xl font-bold text-game-text">
          Impressum
        </h1>
        <p className="text-game-text-muted text-sm">
          Angaben gemäß § 5 TMG
        </p>
        <section className="flex flex-col gap-3 text-game-text text-sm space-y-2">
          <p>
            <strong>Stack Tac Toe</strong><br />
            René Nettelbeck<br />
            Fährstraße 217<br />
            40221 Düsseldorf
          </p>
          <p>
            <strong>Kontakt</strong><br />
            Telefon: <a href="tel:+4915901795625" className="text-game-primary hover:underline">0159 0179 56 25</a><br />
            E-Mail: <a href="mailto:nettelbeck555@gmail.com" className="text-game-primary hover:underline">nettelbeck555@gmail.com</a>
          </p>
          <p>
            <strong>Verantwortlich für den Inhalt</strong> (§ 55 Abs. 2 RStV)<br />
            René Nettelbeck, Fährstraße 217, 40221 Düsseldorf
          </p>
        </section>
      </main>
    </PageShell>
  );
}
