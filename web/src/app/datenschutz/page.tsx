import { PageShell } from '@/components/layout/PageShell';
import { AppHeader } from '@/components/layout/AppHeader';

export const metadata = {
  title: 'Datenschutz — Stack Tac Toe',
  description: 'Datenschutzerklärung für Stack Tac Toe.',
};

export default function DatenschutzPage() {
  return (
    <PageShell backHref="/" header={<AppHeader title="Datenschutz" showRanking showAuth />}>
      <main className="flex-1 flex flex-col gap-6 py-8">
        <h1 className="font-display text-2xl font-bold text-game-text">
          Datenschutzerklärung
        </h1>
        <p className="text-game-text-muted text-sm">
          Informationen zur Verarbeitung Ihrer personenbezogenen Daten gemäß DSGVO
        </p>
        <section className="flex flex-col gap-4 text-game-text text-sm">
          <h2 className="font-display font-semibold text-base text-game-text mt-2">1. Verantwortliche Stelle</h2>
          <p>
            Verantwortlich für die Datenverarbeitung im Sinne der DSGVO ist:<br />
            René Nettelbeck, Fährstraße 217, 40221 Düsseldorf.<br />
            E-Mail: <a href="mailto:nettelbeck555@gmail.com" className="text-game-primary hover:underline">nettelbeck555@gmail.com</a>
          </p>

          <h2 className="font-display font-semibold text-base text-game-text mt-2">2. Welche Daten wir verarbeiten</h2>
          <p>
            <strong>Zugriffs- und Nutzungsdaten:</strong> Beim Aufruf der Webseite können beim Hoster (z. B. IP-Adresse, Datum, aufgerufene Seiten, Browsertyp) Zugriffsdaten in Logs anfallen.
          </p>
          <p>
            <strong>Konto- und Profildaten:</strong> Bei Registrierung und Anmeldung werden E-Mail-Adresse und ein von Ihnen gewähltes Passwort (verschlüsselt) verarbeitet. Optional können Sie in Ihrem Profil Anzeigename, Benutzername und eine Profilfarbe pflegen.
          </p>
          <p>
            <strong>Spiel- und Multiplayer-Daten:</strong> Bei Nutzung von Mehrspieler-Partien, Räumen oder Turnieren werden Spielstände, Spielerzuordnungen und ggf. Einladungscodes verarbeitet, um die Dienste bereitzustellen.
          </p>
          <p>
            <strong>Lokale Speicherung:</strong> Im Browser werden temporär Session-Daten (z. B. für Matchmaking) in sessionStorage gespeichert; diese werden beim Schließen des Tabs bzw. Browsers gelöscht.
          </p>

          <h2 className="font-display font-semibold text-base text-game-text mt-2">3. Zweck und Rechtsgrundlage</h2>
          <p>
            Die Verarbeitung erfolgt zur Bereitstellung der Webseite und der Spielfunktionen (Vertragserfüllung bzw. vorvertragliche Maßnahmen, Art. 6 Abs. 1 lit. b DSGVO), zur technischen Abwicklung von Anmeldung und Konto (Art. 6 Abs. 1 lit. b DSGVO) sowie zur Gewährleistung von Sicherheit und Stabilität (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO). Soweit Sie uns ausdrücklich einwilligen, stützen wir die Verarbeitung auf Art. 6 Abs. 1 lit. a DSGVO.
          </p>

          <h2 className="font-display font-semibold text-base text-game-text mt-2">4. Empfänger und Drittanbieter</h2>
          <p>
            Die Webseite wird über einen Hosting-Dienst (z. B. Netlify) betrieben; Anmeldung, Konten und Spieldaten werden über den Anbieter Supabase (Datenbank und Authentifizierung) verarbeitet. Beide können personenbezogene Daten in dem für den Betrieb erforderlichen Umfang verarbeiten. Eine Weitergabe zu Werbezwecken oder an Dritte außerhalb dieser technischen Erforderlichkeit erfolgt nicht.
          </p>

          <h2 className="font-display font-semibold text-base text-game-text mt-2">5. Speicherdauer</h2>
          <p>
            Zugriffslogs werden in der Regel nur kurzfristig aufbewahrt. Konto- und Profildaten sowie Spieldaten speichern wir, solange Ihr Konto besteht und danach nur, soweit gesetzliche Aufbewahrungspflichten bestehen. Session-Daten im Browser enden mit dem Schließen der Sitzung.
          </p>

          <h2 className="font-display font-semibold text-base text-game-text mt-2">6. Ihre Rechte</h2>
          <p>
            Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) und Widerspruch (Art. 21 DSGVO). Sofern die Verarbeitung auf Einwilligung beruht, können Sie diese jederzeit widerrufen. Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
          </p>

          <h2 className="font-display font-semibold text-base text-game-text mt-2">7. Kontakt</h2>
          <p>
            Für alle datenschutzrechtlichen Anliegen nutzen Sie bitte die unter „Kontakt“ bzw. im Impressum genannte E-Mail-Adresse.
          </p>
        </section>
      </main>
    </PageShell>
  );
}
