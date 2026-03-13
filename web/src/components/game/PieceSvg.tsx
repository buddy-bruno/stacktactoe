'use client';

import { useId, useMemo } from 'react';
import type { Player, PieceSize } from '@/lib/game/stt';

type PieceColors = { hi: string; mid: string; lo: string; dk: string; acc: string; gem: string; sh: string };

const FALLBACK: Record<Player, PieceColors> = {
  human: { hi: '#7dd3fc', mid: '#38bdf8', lo: '#0369a1', dk: '#0c2d4a', acc: '#bae6fd', gem: '#f0fbff', sh: 'rgba(14,165,233,0.4)' },
  ai: { hi: '#fed7aa', mid: '#fb923c', lo: '#c2410c', dk: '#431407', acc: '#ffedd5', gem: '#fff7ed', sh: 'rgba(249,115,22,0.4)' },
};

function getGlobalToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function getPieceColors(player: Player): PieceColors {
  if (typeof document === 'undefined') return FALLBACK[player];
  const root = document.documentElement;
  const get = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
  const prefix = player === 'human' ? '--game-piece-human-' : '--game-piece-ai-';
  const keys = ['hi', 'mid', 'lo', 'dk', 'acc', 'gem', 'sh'] as const;
  const out = { ...FALLBACK[player] };
  keys.forEach((k) => {
    const v = get(prefix + k);
    if (v) (out as Record<string, string>)[k] = v;
  });
  return out;
}

export function PieceSvg({ player, size, className = '' }: { player: Player; size: PieceSize; className?: string }) {
  const id = useId().replace(/:/g, '');
  const C = useMemo(() => getPieceColors(player), [player]);
  if (size === 'small') return <PawnSvg id={id} C={C} className={className} />;
  if (size === 'medium') return <QueenSvg id={id} C={C} className={className} />;
  return <KingSvg id={id} C={C} className={className} />;
}

function PawnSvg({ id, C, className }: { id: string; C: PieceColors; className: string }) {
  return (
    <svg viewBox="0 0 80 120" className={className} overflow="visible">
      <defs>
        <radialGradient id={`${id}b`} cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor={C.hi} />
          <stop offset="50%" stopColor={C.mid} />
          <stop offset="100%" stopColor={C.dk} />
        </radialGradient>
        <radialGradient id={`${id}h`} cx="36%" cy="30%" r="58%">
          <stop offset="0%" stopColor={C.hi} />
          <stop offset="45%" stopColor={C.mid} />
          <stop offset="100%" stopColor={C.lo} />
        </radialGradient>
        <filter id={`${id}glow`}>
          <feGaussianBlur stdDeviation="2" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}shadow`}>
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <ellipse cx="40" cy="116" rx="26" ry="5" fill={C.sh} filter={`url(#${id}shadow)`} />
      <ellipse cx="40" cy="108" rx="28" ry="7" fill={C.dk} opacity="0.9" />
      <ellipse cx="40" cy="105" rx="24" ry="5.5" fill={`url(#${id}b)`} />
      <ellipse cx="40" cy="103" rx="20" ry="3.5" fill={C.hi} opacity="0.35" />
      <path d="M20,105 Q18,96 22,92 L58,92 Q62,96 60,105 Z" fill={`url(#${id}b)`} />
      <path d="M28,92 Q26,80 30,73 L50,73 Q54,80 52,92 Z" fill={`url(#${id}b)`} />
      <path d="M30,90 Q28,82 31,76" stroke={C.hi} strokeWidth="1.2" fill="none" opacity="0.45" strokeLinecap="round" />
      <ellipse cx="40" cy="73" rx="14" ry="4" fill={C.lo} opacity="0.8" />
      <ellipse cx="40" cy="72" rx="11" ry="3" fill={C.mid} />
      <rect x="35" y="58" width="10" height="15" rx="5" fill={`url(#${id}b)`} />
      <circle cx="40" cy="48" r="18" fill={`url(#${id}h)`} filter={`url(#${id}glow)`} />
      <ellipse cx="33" cy="41" rx="6" ry="5" fill={C.acc} opacity="0.35" transform="rotate(-20,33,41)" />
      <ellipse cx="33" cy="41" rx="3" ry="2.5" fill={C.gem} opacity="0.55" transform="rotate(-20,33,41)" />
      <circle cx="40" cy="48" r="18" fill="none" stroke={C.mid} strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

function QueenSvg({ id, C, className }: { id: string; C: PieceColors; className: string }) {
  return (
    <svg viewBox="0 0 80 130" className={className} overflow="visible">
      <defs>
        <linearGradient id={`${id}robe`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor={C.hi} />
          <stop offset="55%" stopColor={C.mid} />
          <stop offset="100%" stopColor={C.dk} />
        </linearGradient>
        <radialGradient id={`${id}head`} cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor={C.hi} />
          <stop offset="50%" stopColor={C.mid} />
          <stop offset="100%" stopColor={C.lo} />
        </radialGradient>
        <radialGradient id={`${id}orb`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor={C.gem} />
          <stop offset="40%" stopColor={C.acc} />
          <stop offset="100%" stopColor={C.lo} />
        </radialGradient>
        <filter id={`${id}glow`}>
          <feGaussianBlur stdDeviation="2.5" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}shadow`}>
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>
      <ellipse cx="40" cy="127" rx="30" ry="5.5" fill={C.sh} filter={`url(#${id}shadow)`} />
      <ellipse cx="40" cy="118" rx="30" ry="7.5" fill={C.dk} opacity="0.95" />
      <ellipse cx="40" cy="115" rx="26" ry="6" fill={`url(#${id}robe)`} />
      <ellipse cx="40" cy="113" rx="21" ry="4" fill={C.hi} opacity="0.3" />
      <path d="M14,116 Q11,82 18,66 Q22,56 30,52 L50,52 Q58,56 62,66 Q69,82 66,116 Z" fill={`url(#${id}robe)`} />
      <path d="M22,100 Q20,80 24,68" stroke={C.hi} strokeWidth="1" fill="none" opacity="0.3" strokeLinecap="round" />
      <path d="M14,116 Q40,110 66,116" stroke={C.acc} strokeWidth="1.2" fill="none" opacity="0.45" />
      <path d="M26,72 Q40,69 54,72" stroke={C.acc} strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d="M30,52 Q28,42 32,38 L48,38 Q52,42 50,52 Z" fill={C.mid} />
      <line x1="40" y1="40" x2="40" y2="52" stroke={C.hi} strokeWidth="1" opacity="0.5" />
      <rect x="35.5" y="27" width="9" height="12" rx="4.5" fill={`url(#${id}robe)`} />
      <circle cx="40" cy="20" r="16" fill={`url(#${id}head)`} filter={`url(#${id}glow)`} />
      <ellipse cx="33" cy="14" rx="5" ry="4" fill={C.acc} opacity="0.32" transform="rotate(-18,33,14)" />
      <ellipse cx="33" cy="14" rx="2.5" ry="2" fill={C.gem} opacity="0.55" transform="rotate(-18,33,14)" />
      <ellipse cx="40" cy="5" rx="14" ry="3.8" fill={C.dk} opacity="0.9" />
      <line x1="26" y1="4" x2="23" y2="-7" stroke={C.hi} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="31" y1="3" x2="29" y2="-9" stroke={C.hi} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="40" y1="2" x2="40" y2="-12" stroke={C.hi} strokeWidth="2.8" strokeLinecap="round" />
      <line x1="49" y1="3" x2="51" y2="-9" stroke={C.hi} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="54" y1="4" x2="57" y2="-7" stroke={C.hi} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="-12" r="2.5" fill={C.gem} opacity="0.95" />
      <circle cx="23" cy="-7" r="2" fill={C.acc} opacity="0.9" />
      <circle cx="57" cy="-7" r="2" fill={C.acc} opacity="0.9" />
      <circle cx="62" cy="74" r="7" fill={`url(#${id}orb)`} />
      <circle cx="62" cy="74" r="7" fill="none" stroke={C.hi} strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}

function KingSvg({ id, C, className }: { id: string; C: PieceColors; className: string }) {
  return (
    <svg viewBox="0 0 80 145" className={className} overflow="visible">
      <defs>
        <linearGradient id={`${id}arm`} x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor={C.hi} />
          <stop offset="45%" stopColor={C.mid} />
          <stop offset="100%" stopColor={C.dk} />
        </linearGradient>
        <linearGradient id={`${id}cape`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={C.lo} />
          <stop offset="100%" stopColor={C.dk} />
        </linearGradient>
        <radialGradient id={`${id}helm`} cx="36%" cy="30%" r="62%">
          <stop offset="0%" stopColor={C.hi} />
          <stop offset="50%" stopColor={C.mid} />
          <stop offset="100%" stopColor={C.lo} />
        </radialGradient>
        <radialGradient id={`${id}shd`} cx="35%" cy="28%" r="68%">
          <stop offset="0%" stopColor={C.hi} />
          <stop offset="55%" stopColor={C.mid} />
          <stop offset="100%" stopColor={C.dk} />
        </radialGradient>
        <linearGradient id={`${id}blade`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={C.gem} />
          <stop offset="40%" stopColor={C.acc} />
          <stop offset="100%" stopColor={C.lo} />
        </linearGradient>
        <filter id={`${id}glow`}>
          <feGaussianBlur stdDeviation="2.5" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}shadow`}>
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <ellipse cx="40" cy="141" rx="32" ry="6" fill={C.sh} filter={`url(#${id}shadow)`} />
      <ellipse cx="40" cy="132" rx="30" ry="7" fill={C.dk} opacity="0.95" />
      <ellipse cx="40" cy="129" rx="26" ry="5.5" fill={`url(#${id}arm)`} />
      <path d="M8,130 Q6,85 14,60 Q18,48 26,42 L54,42 Q62,48 66,60 Q74,85 72,130 Z" fill={`url(#${id}cape)`} opacity="0.88" />
      <path d="M20,128 Q18,90 24,72 Q28,60 36,56 L44,56 Q52,60 56,72 Q62,90 60,128 Z" fill={`url(#${id}arm)`} />
      <path d="M28,100 Q40,97 52,100" stroke={C.hi} strokeWidth="0.9" fill="none" opacity="0.35" />
      <rect x="38.5" y="74" width="3" height="14" rx="1.5" fill={C.hi} opacity="0.55" />
      <rect x="33" y="79" width="14" height="3" rx="1.5" fill={C.hi} opacity="0.55" />
      <path d="M14,68 Q10,62 16,56 Q22,52 28,56 L26,68 Z" fill={`url(#${id}arm)`} />
      <path d="M66,68 Q70,62 64,56 Q58,52 52,56 L54,68 Z" fill={`url(#${id}arm)`} />
      <path d="M8,62 L8,56 L18,52 L24,56 L24,72 Q16,78 12,72 Z" fill={`url(#${id}shd)`} />
      <path d="M8,62 L8,56 L18,52 L24,56 L24,72 Q16,78 12,72 Z" fill="none" stroke={C.hi} strokeWidth="0.8" opacity="0.5" />
      <line x1="16" y1="56" x2="16" y2="72" stroke={C.acc} strokeWidth="0.9" opacity="0.5" />
      <line x1="8" y1="64" x2="24" y2="64" stroke={C.acc} strokeWidth="0.9" opacity="0.5" />
      <circle cx="16" cy="64" r="2.5" fill={C.gem} opacity="0.7" />
      <line x1="64" y1="90" x2="72" y2="30" stroke={`url(#${id}blade)`} strokeWidth="3" strokeLinecap="round" />
      <line x1="65" y1="86" x2="71.5" y2="36" stroke={getGlobalToken('--game-piece-line', 'rgba(255,255,255,0.3)')} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="56" y1="80" x2="72" y2="76" stroke={C.acc} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <circle cx="64" cy="91" r="4" fill={C.mid} />
      <circle cx="64" cy="91" r="2" fill={C.acc} opacity="0.7" />
      <circle cx="72" cy="30" r="3" fill={C.gem} opacity="0.8" />
      <rect x="32" y="38" width="16" height="10" rx="4" fill={`url(#${id}arm)`} />
      <ellipse cx="40" cy="28" rx="16" ry="17" fill={`url(#${id}helm)`} filter={`url(#${id}glow)`} />
      <ellipse cx="33" cy="20" rx="5" ry="4.5" fill={C.acc} opacity="0.3" transform="rotate(-18,33,20)" />
      <path d="M25,32 Q40,30 55,32" stroke={C.lo} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M27,32 Q40,30.5 53,32" stroke={C.dk} strokeWidth="2.5" fill="none" opacity="0.6" />
      <ellipse cx="40" cy="12" rx="14" ry="3.5" fill={C.dk} opacity="0.9" />
      <line x1="26.5" y1="12" x2="24" y2="-2" stroke={C.hi} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="31" y1="11" x2="30" y2="-4" stroke={C.hi} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="40" y1="10" x2="40" y2="-7" stroke={C.hi} strokeWidth="2.8" strokeLinecap="round" />
      <line x1="49" y1="11" x2="50" y2="-4" stroke={C.hi} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="53.5" y1="12" x2="56" y2="-2" stroke={C.hi} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="40" cy="-7" r="2.8" fill={C.gem} opacity="0.95" />
      <circle cx="24" cy="-2" r="2" fill={C.acc} opacity="0.9" />
      <circle cx="56" cy="-2" r="2" fill={C.acc} opacity="0.9" />
      <rect x="38.8" y="-16" width="2.4" height="10" rx="1.2" fill={C.acc} opacity="0.9" />
      <rect x="35" y="-11" width="10" height="2.4" rx="1.2" fill={C.acc} opacity="0.9" />
    </svg>
  );
}
