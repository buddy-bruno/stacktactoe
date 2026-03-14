/**
 * StackTacToe Game Engine (STT)
 * Modus 1 (Classic): Nur Platzieren, 3×3, 3 Bauern + 3 Damen + 1 König, Überdecken = Stapeln (obere zählt).
 * Modus 2 (Schach): Setzen oder Bewegen pro Zug; Bewegung ab 3 eigenen Figuren auf dem Brett (sichtbar+verdeckt);
 *   1 Feld (Nachbar), nur oberste Figur ziehbar; Dreifach-Wiederholung + Zurückpendeln = Unentschieden.
 *   Siehe docs/SPIELMODI-SCHACH.md.
 * Modus Pool: Gemeinsamer Pool (6B, 6D, 2K), Zug = Figur aus Pool nehmen + sofort setzen. Siehe docs/SPIELMODI-POOL.md.
 */

export type Player = 'human' | 'ai';
export type PieceSize = 'small' | 'medium' | 'large';
export type PoolSide = 'left' | 'right';
export type MovePlace = { type: 'place'; player: Player; size: PieceSize; index: number; fromPool?: PoolSide };
export type MoveMove = { type: 'move'; player: Player; fromIndex: number; toIndex: number; size: PieceSize };
export type Move = MovePlace | MoveMove;

/** Pool-Modus: links und rechts je 3B, 3D, 1K (gesamt 6B, 6D, 2K). */
export const POOL_LEFT_INIT: Record<PieceSize, number> = { small: 3, medium: 3, large: 1 };
export const POOL_RIGHT_INIT: Record<PieceSize, number> = { small: 3, medium: 3, large: 1 };

export interface GameState {
  board: { player: Player; size: PieceSize }[][];
  res: Record<Player, Record<PieceSize, number>>;
  cur: Player;
  phase: 'placement' | 'movement';
  over: boolean;
  winner: Player | null;
  wl: number[] | null;
  placementOnly?: boolean;
  positionCount?: Record<string, number>;
  lastPositionBefore?: Record<Player, string | null>;
  /** Pool-Modus: Vorrat links (nur gesetzt wenn poolMode). */
  poolLeft?: Record<PieceSize, number>;
  /** Pool-Modus: Vorrat rechts (nur gesetzt wenn poolMode). */
  poolRight?: Record<PieceSize, number>;
  /** Legacy: ein gemeinsamer Pool (wird bei Deserialisierung in poolLeft/poolRight aufgeteilt). */
  pool?: Record<PieceSize, number>;
  /** Pool-Modus: Swap-Regel (nicht mehr genutzt, Popup entfernt). */
  swapApplied?: boolean;
}

export class STT {
  /** Stärke: König > Dame > Bauer */
  SO: Record<PieceSize, number> = { small: 1, medium: 2, large: 3 };
  SL: Record<PieceSize, string> = { small: 'B', medium: 'D', large: 'K' };
  SN: Record<PieceSize, string> = { small: 'Bauer', medium: 'Dame', large: 'König' };
  /** Modus 1: 3 Bauern, 3 Damen, 1 König pro Spieler */
  IR: Record<PieceSize, number> = { small: 3, medium: 3, large: 1 };
  WL = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  /** Maximal 8 Nachbarn (orthogonal + diagonal) */
  ADJ: Record<number, number[]> = {
    0: [1, 3, 4], 1: [0, 2, 3, 4, 5], 2: [1, 4, 5],
    3: [0, 1, 4, 6, 7], 4: [0, 1, 2, 3, 5, 6, 7, 8], 5: [1, 2, 4, 7, 8],
    6: [3, 4, 7], 7: [3, 4, 5, 6, 8], 8: [4, 5, 7],
  };

  board: { player: Player; size: PieceSize }[][] = [];
  res: Record<Player, Record<PieceSize, number>> = { human: { ...this.IR }, ai: { ...this.IR } };
  cur: Player = 'human';
  phase: 'placement' | 'movement' = 'placement';
  over = false;
  winner: Player | null = null;
  wl: number[] | null = null;
  /** Modus 1: nur Platzieren, keine Bewegungsphase. Modus 2: Platzieren oder Bewegen pro Zug. */
  placementOnly = false;
  /** Modus 2: Zähler für Dreifach-Wiederholung (vollständige Stellung → Anzahl). */
  positionCount: Record<string, number> = {};
  /** Modus 2: Stellung vor dem letzten Zug dieses Spielers (Zurückpendeln verboten). */
  lastPositionBefore: Record<Player, string | null> = { human: null, ai: null };
  /** Modus Pool: Vorrat links (3B, 3D, 1K). */
  poolLeft?: Record<PieceSize, number>;
  /** Modus Pool: Vorrat rechts (3B, 3D, 1K). */
  poolRight?: Record<PieceSize, number>;
  /** Legacy. */
  pool?: Record<PieceSize, number>;
  swapApplied?: boolean;
  private poolMode = false;

  constructor(opts?: { placementOnly?: boolean; poolMode?: boolean }) {
    if (opts?.placementOnly) this.placementOnly = true;
    if (opts?.poolMode) this.poolMode = true;
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: 9 }, () => []);
    if (this.poolMode) {
      this.poolLeft = { ...POOL_LEFT_INIT };
      this.poolRight = { ...POOL_RIGHT_INIT };
      this.pool = undefined;
      this.res = { human: { small: 0, medium: 0, large: 0 }, ai: { small: 0, medium: 0, large: 0 } };
      this.swapApplied = false;
    } else {
      this.res = { human: { ...this.IR }, ai: { ...this.IR } };
      this.poolLeft = undefined;
      this.poolRight = undefined;
      this.pool = undefined;
      this.swapApplied = undefined;
    }
    this.cur = 'human';
    this.phase = 'placement';
    this.over = false;
    this.winner = null;
    this.wl = null;
    this.positionCount = {};
    this.lastPositionBefore = { human: null, ai: null };
  }

  /** Pool-Modus: true wenn getrennter Vorrat links/rechts genutzt wird. */
  isPoolMode(): boolean {
    return this.poolMode && (this.poolLeft != null || this.pool != null);
  }

  /** Pool-Modus: beide Seiten leer (Summe = 0). */
  poolEmpty(): boolean {
    if (this.poolLeft && this.poolRight) {
      const L = this.poolLeft.small + this.poolLeft.medium + this.poolLeft.large;
      const R = this.poolRight.small + this.poolRight.medium + this.poolRight.large;
      return L + R === 0;
    }
    if (this.pool) return this.pool.small + this.pool.medium + this.pool.large === 0;
    return false;
  }

  /** Pool-Modus: Anzahl einer Größe auf einer Seite (für Anzeige). */
  poolCount(side: PoolSide, size: PieceSize): number {
    const p = side === 'left' ? this.poolLeft : this.poolRight;
    if (p) return p[size] ?? 0;
    if (this.pool) return Math.floor((this.pool[size] ?? 0) / 2);
    return 0;
  }

  /** Vollständige Stellung für Dreifach-Wiederholung (Brett, Vorrat, wer am Zug). */
  positionKey(): string {
    const boardStr = this.board.map((stack) => stack.map((p) => `${p.player}:${p.size}`).join('|')).join(';');
    const resStr = this.poolLeft && this.poolRight
      ? `PL${this.poolLeft.small},${this.poolLeft.medium},${this.poolLeft.large}PR${this.poolRight.small},${this.poolRight.medium},${this.poolRight.large}`
      : this.pool
        ? `P${this.pool.small},${this.pool.medium},${this.pool.large}`
        : `H${this.res.human.small},${this.res.human.medium},${this.res.human.large}A${this.res.ai.small},${this.res.ai.medium},${this.res.ai.large}`;
    return `${boardStr}|${resStr}|${this.cur}`;
  }

  private recordPosition(): void {
    if (this.placementOnly) return;
    const key = this.positionKey();
    this.positionCount[key] = (this.positionCount[key] ?? 0) + 1;
    if (this.positionCount[key]! >= 3) {
      this.over = true;
      this.winner = null;
    }
  }

  clone(): STT {
    const g = new STT({ placementOnly: this.placementOnly, poolMode: this.poolMode });
    g.board = this.board.map((s) => s.map((p) => ({ ...p })));
    g.res = { human: { ...this.res.human }, ai: { ...this.res.ai } };
    g.cur = this.cur;
    g.phase = this.phase;
    g.over = this.over;
    g.winner = this.winner;
    g.wl = this.wl ? [...this.wl] : null;
    g.positionCount = { ...this.positionCount };
    g.lastPositionBefore = { ...this.lastPositionBefore };
    if (this.poolLeft) g.poolLeft = { ...this.poolLeft };
    if (this.poolRight) g.poolRight = { ...this.poolRight };
    if (this.pool) g.pool = { ...this.pool };
    if (this.swapApplied !== undefined) g.swapApplied = this.swapApplied;
    return g;
  }

  /** Stellungsschlüssel nach Zug (f→t) ohne Mutation; für Zurückpendel-Check. Muss dieselbe Schlag-Logik wie move() anwenden. */
  private keyAfterMove(p: Player, f: number, t: number): string {
    const g = this.clone();
    if (g.top(t)?.player !== p) g.board[t].pop();
    g.board[t].push(g.board[f].pop()!);
    g.cur = p === 'human' ? 'ai' : 'human';
    return g.positionKey();
  }

  top(i: number): { player: Player; size: PieceSize } | null {
    const s = this.board[i];
    return s.length ? s[s.length - 1] : null;
  }

  /** Nur die oberste sichtbare Figur pro Feld zählt (Modus 1 & 2). */
  vis(): ({ player: Player; size: PieceSize } | null)[] {
    return this.board.map((s) => (s.length ? s[s.length - 1] : null));
  }

  resEmpty(): boolean {
    if (this.pool) return this.poolEmpty();
    for (const p of ['human', 'ai'] as Player[]) {
      for (const z of ['small', 'medium', 'large'] as PieceSize[]) {
        if (this.res[p][z] > 0) return false;
      }
    }
    return true;
  }

  /** Anzahl eigener Figuren auf dem Brett (sichtbar + verdeckt). Schach: Bewegung freigeschaltet ab 3 – strikt unabhängig davon, ob Gegnerfiguren auf den eigenen stehen. */
  countPiecesOnBoard(p: Player): number {
    let n = 0;
    for (let i = 0; i < 9; i++) {
      const stack = this.board[i] ?? [];
      for (const cell of stack) {
        if (cell.player === p) n++;
      }
    }
    return n;
  }

  /** Schach: true, wenn dieser Spieler bewegen darf (≥ 3 eigene Figuren auf dem Brett). */
  canMovePieces(p: Player): boolean {
    if (this.placementOnly) return false;
    return this.countPiecesOnBoard(p) >= 3;
  }

  advPhase() {
    if (this.placementOnly) return;
    if (this.phase === 'placement' && this.resEmpty() && !this.checkWin()) this.phase = 'movement';
  }

  canPlace(p: Player, z: PieceSize, i: number): boolean {
    if (this.over || i < 0 || i > 8) return false;
    const hasPiece = this.poolLeft && this.poolRight
      ? (this.poolLeft[z] ?? 0) + (this.poolRight[z] ?? 0) > 0
      : this.pool
        ? (this.pool[z] ?? 0) > 0
        : this.res[p][z] > 0;
    if (!hasPiece) return false;
    const t = this.top(i);
    if (!t) return true;
    if (t.player === p) return false;
    return this.SO[z] > this.SO[t.size];
  }

  canMove(p: Player, f: number, t: number): boolean {
    if (this.placementOnly || this.over || f === t || f < 0 || f > 8 || t < 0 || t > 8) return false;
    if (!this.canMovePieces(p)) return false;
    const tp = this.top(f);
    if (!tp || tp.player !== p) return false;
    if (!this.ADJ[f].includes(t)) return false;
    const tt = this.top(t);
    if (!tt) {
      if (this.lastPositionBefore[p] !== null && this.keyAfterMove(p, f, t) === this.lastPositionBefore[p]) return false;
      return true;
    }
    if (tt.player === p) return false;
    if (this.SO[tp.size] <= this.SO[tt.size]) return false;
    if (this.lastPositionBefore[p] !== null && this.keyAfterMove(p, f, t) === this.lastPositionBefore[p]) return false;
    return true;
  }

  place(p: Player, z: PieceSize, i: number, fromPool?: PoolSide): boolean {
    if (!this.canPlace(p, z, i)) return false;
    const keyBefore = this.positionKey();
    /** Schach: Überdecken = Schlagen, gegnerische Figur wird vom Brett entfernt (bleibt weg). Classic/Pool: Stapeln, Figur bleibt unter. */
    if (!this.placementOnly && this.top(i)?.player !== p) this.board[i].pop();
    this.board[i].push({ player: p, size: z });
    if (this.poolLeft != null && this.poolRight != null) {
      const side = fromPool ?? ((this.poolLeft[z] ?? 0) > 0 ? 'left' : 'right');
      const pool = side === 'left' ? this.poolLeft : this.poolRight;
      pool[z]--;
    } else if (this.pool) this.pool[z]--;
    else this.res[p][z]--;
    this.lastPositionBefore[p] = keyBefore;
    const w = this.checkWin();
    if (w) {
      this.fin(w.p, w.l);
      return true;
    }
    this.advPhase();
    this.cur = p === 'human' ? 'ai' : 'human';
    this.recordPosition();
    if (this.over) return true;
    /** Kein legaler Zug für den Spieler am Zug → Unentschieden (Classic: alle gesetzt; Schach: §10; Pool: Pool leer oder kein legaler Zug). */
    if (this.poolLeft != null || this.pool != null) {
      if (this.poolEmpty() || !this.anyMove(this.cur)) {
        this.over = true;
        this.winner = null;
      }
    } else if (!this.anyMove(this.cur)) {
      this.over = true;
      this.winner = null;
    }
    return true;
  }

  move(p: Player, f: number, t: number): boolean {
    if (!this.canMove(p, f, t)) return false;
    const keyBefore = this.positionKey();
    /** Schach: Ziehen auf Gegnerfigur = Schlagen, gegnerische Figur wird vom Brett entfernt (bleibt weg). */
    if (this.top(t)?.player !== p) this.board[t].pop();
    this.board[t].push(this.board[f].pop()!);
    this.lastPositionBefore[p] = keyBefore;
    const w = this.checkWin();
    if (w) {
      this.fin(w.p, w.l);
      return true;
    }
    this.cur = p === 'human' ? 'ai' : 'human';
    this.recordPosition();
    if (this.over) return true;
    /** Kein legaler Zug (Spieler am Zug hat keine Züge) → Unentschieden, §10 SPIELMODI-SCHACH. */
    if (!this.anyMove(this.cur)) {
      this.over = true;
      this.winner = null;
    }
    return true;
  }

  fin(p: Player, l: number[]) {
    this.over = true;
    this.winner = p;
    this.wl = l;
  }

  checkWin(): { p: Player; l: number[] } | null {
    const v = this.vis();
    for (const [a, b, c] of this.WL) {
      if (v[a] && v[b] && v[c] && v[a]!.player === v[b]!.player && v[b]!.player === v[c]!.player) {
        return { p: v[a]!.player, l: [a, b, c] };
      }
    }
    return null;
  }

  placements(p: Player): MovePlace[] {
    const r: MovePlace[] = [];
    const sizes = ['small', 'medium', 'large'] as PieceSize[];
    for (const z of sizes) {
      if (this.poolLeft != null && this.poolRight != null) {
        for (let i = 0; i < 9; i++) {
          if (!this.canPlace(p, z, i)) continue;
          if ((this.poolLeft[z] ?? 0) > 0) r.push({ type: 'place', player: p, size: z, index: i, fromPool: 'left' });
          if ((this.poolRight[z] ?? 0) > 0) r.push({ type: 'place', player: p, size: z, index: i, fromPool: 'right' });
        }
      } else {
        const has = this.pool ? (this.pool[z] ?? 0) > 0 : this.res[p][z] > 0;
        if (!has) continue;
        for (let i = 0; i < 9; i++) {
          if (this.canPlace(p, z, i)) r.push({ type: 'place', player: p, size: z, index: i });
        }
      }
    }
    return r;
  }

  moveMoves(p: Player): MoveMove[] {
    const r: MoveMove[] = [];
    for (let f = 0; f < 9; f++) {
      const t = this.top(f);
      if (!t || t.player !== p) continue;
      for (const to of this.ADJ[f]) {
        if (this.canMove(p, f, to)) r.push({ type: 'move', player: p, fromIndex: f, toIndex: to, size: t.size });
      }
    }
    return r;
  }

  moves(p: Player): Move[] {
    if (this.placementOnly) return this.placements(p);
    return [...this.placements(p), ...this.moveMoves(p)];
  }

  anyMove(p: Player): boolean {
    return this.moves(p).length > 0;
  }

  /** Pool-Modus: Swap-Regel anwenden – alle Brett-Figuren human↔ai tauschen, cur = 'human' (Tauschender bleibt am Zug), swapApplied = true. */
  applySwap(): void {
    if (!this.pool || this.swapApplied) return;
    for (let i = 0; i < 9; i++) {
      for (const piece of this.board[i] ?? []) {
        piece.player = piece.player === 'human' ? 'ai' : 'human';
      }
    }
    this.cur = 'human';
    this.swapApplied = true;
  }

  /** Pool-Modus: Swap ablehnen – nur swapApplied = true setzen, kein Tausch (Modal nicht erneut anzeigen). */
  declineSwap(): void {
    if (this.pool) this.swapApplied = true;
  }

  /** Pool-Modus: Genau eine Figur auf dem Brett (für Swap-Angebot nach erstem Zug). */
  countPiecesOnBoardTotal(): number {
    let n = 0;
    for (let i = 0; i < 9; i++) n += (this.board[i] ?? []).length;
    return n;
  }
}

export function serializeGameState(g: STT): GameState {
  const out: GameState = {
    board: g.board,
    res: g.res,
    cur: g.cur,
    phase: g.phase,
    over: g.over,
    winner: g.winner,
    wl: g.wl,
    placementOnly: g.placementOnly,
    positionCount: g.positionCount && Object.keys(g.positionCount).length ? g.positionCount : undefined,
    lastPositionBefore: g.lastPositionBefore,
  };
  if (g.poolLeft) out.poolLeft = { ...g.poolLeft };
  if (g.poolRight) out.poolRight = { ...g.poolRight };
  if (g.pool) out.pool = { ...g.pool };
  if (g.swapApplied !== undefined) out.swapApplied = g.swapApplied;
  return out;
}

export function deserializeGameState(json: GameState): STT {
  const poolMode = json.poolLeft != null || json.poolRight != null || json.pool != null;
  const g = new STT({ placementOnly: json.placementOnly ?? true, poolMode });
  g.board = json.board ?? Array.from({ length: 9 }, () => []);
  g.res = json.res ?? (poolMode ? { human: { small: 0, medium: 0, large: 0 }, ai: { small: 0, medium: 0, large: 0 } } : { human: { small: 3, medium: 3, large: 1 }, ai: { small: 3, medium: 3, large: 1 } });
  g.cur = json.cur ?? 'human';
  g.phase = json.phase ?? 'placement';
  g.over = json.over ?? false;
  g.winner = json.winner ?? null;
  g.wl = json.wl ?? null;
  g.positionCount = json.positionCount ? { ...json.positionCount } : {};
  g.lastPositionBefore = json.lastPositionBefore ? { ...json.lastPositionBefore } : { human: null, ai: null };
  if (json.poolLeft && json.poolRight) {
    g.poolLeft = { ...json.poolLeft };
    g.poolRight = { ...json.poolRight };
  } else if (json.pool) {
    const half = (k: PieceSize) => Math.floor((json.pool![k] ?? 0) / 2);
    g.poolLeft = { small: half('small'), medium: half('medium'), large: half('large') };
    g.poolRight = {
      small: (json.pool!.small ?? 0) - g.poolLeft!.small,
      medium: (json.pool!.medium ?? 0) - g.poolLeft!.medium,
      large: (json.pool!.large ?? 0) - g.poolLeft!.large,
    };
  }
  if (json.swapApplied !== undefined) g.swapApplied = json.swapApplied;
  return g;
}
