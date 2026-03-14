/**
 * StackTacToe Game Engine (STT)
 * Modus 1 (Classic): Nur Platzieren, 3×3, 3 Bauern + 3 Damen + 1 König, Überdecken = Stapeln (obere zählt).
 * Modus 2 (Schach): Setzen oder Bewegen pro Zug; Bewegung ab 3 eigenen Figuren auf dem Brett (sichtbar+verdeckt);
 *   1 Feld (Nachbar), nur oberste Figur ziehbar; Dreifach-Wiederholung + Zurückpendeln = Unentschieden.
 *   Siehe docs/SPIELMODI-SCHACH.md.
 */

export type Player = 'human' | 'ai';
export type PieceSize = 'small' | 'medium' | 'large';
export type MovePlace = { type: 'place'; player: Player; size: PieceSize; index: number };
export type MoveMove = { type: 'move'; player: Player; fromIndex: number; toIndex: number; size: PieceSize };
export type Move = MovePlace | MoveMove;

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

  constructor(opts?: { placementOnly?: boolean }) {
    if (opts?.placementOnly) this.placementOnly = true;
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: 9 }, () => []);
    this.res = { human: { ...this.IR }, ai: { ...this.IR } };
    this.cur = 'human';
    this.phase = 'placement';
    this.over = false;
    this.winner = null;
    this.wl = null;
    this.positionCount = {};
    this.lastPositionBefore = { human: null, ai: null };
  }

  /** Vollständige Stellung für Dreifach-Wiederholung (Brett, Vorrat, wer am Zug). */
  positionKey(): string {
    const boardStr = this.board.map((stack) => stack.map((p) => `${p.player}:${p.size}`).join('|')).join(';');
    const resStr = `H${this.res.human.small},${this.res.human.medium},${this.res.human.large}A${this.res.ai.small},${this.res.ai.medium},${this.res.ai.large}`;
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
    const g = new STT({ placementOnly: this.placementOnly });
    g.board = this.board.map((s) => s.map((p) => ({ ...p })));
    g.res = { human: { ...this.res.human }, ai: { ...this.res.ai } };
    g.cur = this.cur;
    g.phase = this.phase;
    g.over = this.over;
    g.winner = this.winner;
    g.wl = this.wl ? [...this.wl] : null;
    g.positionCount = { ...this.positionCount };
    g.lastPositionBefore = { ...this.lastPositionBefore };
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
    if (this.over || i < 0 || i > 8 || this.res[p][z] <= 0) return false;
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

  place(p: Player, z: PieceSize, i: number): boolean {
    if (!this.canPlace(p, z, i)) return false;
    const keyBefore = this.positionKey();
    /** Schach: Überdecken = Schlagen, gegnerische Figur wird vom Brett entfernt (bleibt weg). Classic: Stapeln, Figur bleibt unter. */
    if (!this.placementOnly && this.top(i)?.player !== p) this.board[i].pop();
    this.board[i].push({ player: p, size: z });
    this.res[p][z]--;
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
    /** Kein legaler Zug für den Spieler am Zug → Unentschieden (Classic: alle gesetzt; Schach: §10). */
    if (!this.anyMove(this.cur)) {
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
    for (const z of ['small', 'medium', 'large'] as PieceSize[]) {
      if (!this.res[p][z]) continue;
      for (let i = 0; i < 9; i++) {
        if (this.canPlace(p, z, i)) r.push({ type: 'place', player: p, size: z, index: i });
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
}

export function serializeGameState(g: STT): GameState {
  return {
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
}

export function deserializeGameState(json: GameState): STT {
  const g = new STT({ placementOnly: json.placementOnly ?? false });
  g.board = json.board ?? Array.from({ length: 9 }, () => []);
  g.res = json.res ?? { human: { small: 3, medium: 3, large: 1 }, ai: { small: 3, medium: 3, large: 1 } };
  g.cur = json.cur ?? 'human';
  g.phase = json.phase ?? 'placement';
  g.over = json.over ?? false;
  g.winner = json.winner ?? null;
  g.wl = json.wl ?? null;
  g.positionCount = json.positionCount ? { ...json.positionCount } : {};
  g.lastPositionBefore = json.lastPositionBefore ? { ...json.lastPositionBefore } : { human: null, ai: null };
  return g;
}
