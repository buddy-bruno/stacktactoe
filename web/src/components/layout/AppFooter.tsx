import Link from 'next/link';
import { cn } from '@/lib/utils';
import { headerInnerClass } from './navStyles';

const currentYear = new Date().getFullYear();

export function AppFooter() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center"
      style={{
        marginBottom: 'var(--game-footer-margin)',
        marginLeft: 0,
        marginRight: 0,
        background: 'var(--game-bg)',
      }}
    >
      <div className="w-full max-w-[var(--game-content-max-width)] mx-auto px-[var(--game-content-padding)]">
        <footer
          className={cn(
            'game-nav-header rounded-xl p-[1px] shadow-lg shadow-black/5 overflow-hidden',
            'bg-[var(--game-glass-gradient)]'
          )}
        >
          {/* Border-Gradient-Linie oben */}
          <div
            className="h-px w-full shrink-0 rounded-t-xl"
            style={{ background: 'var(--game-border-gradient-reverse)' }}
            aria-hidden
          />
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 p-4 max-lg:py-2.5 max-lg:px-3 text-sm text-game-text-muted',
              headerInnerClass,
              'rounded-t-none rounded-b-[11px]'
            )}
          >
            <span className="shrink-0">
              © {currentYear} Stack Tac Toe
            </span>
            <nav className="flex flex-wrap items-center justify-end gap-4 sm:gap-6" aria-label="Rechtliches und Kontakt">
              <Link href="/impressum" className="text-game-text-muted hover:text-game-primary transition-colors">
                Impressum
              </Link>
              <Link href="/datenschutz" className="text-game-text-muted hover:text-game-primary transition-colors">
                Datenschutz
              </Link>
              <Link href="/kontakt" className="text-game-text-muted hover:text-game-primary transition-colors">
                Kontakt
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
