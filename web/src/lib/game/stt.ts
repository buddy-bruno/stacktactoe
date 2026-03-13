/**
 * StackTacToe Game Engine (STT)
 * 3×3 Board, 3 piece sizes (Bauer/Dame/König), placement → movement phases
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
}

export class STT {
  SO: Record<PieceSize, number> = { small: 1, medium: 2, large: 3 };
  SL: Record<PieceSize, string> = { small: 'B', medium: 'D', large: 'K' };
  SN: Record<PieceSize, string> = { small: 'Bauer', medium: 'Dame', large: 'König' };
  IR: Record<PieceSize, number> = { small: 3, medium: 3, large: 2 };
  WL = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
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

  constructor() {
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
  }

  clone(): STT {
    const g = new STT();
    g.board = this.board.map((s) => s.map((p) => ({ ...p })));
    g.res = { human: { ...this.res.human }, ai: { ...this.res.ai } };
    g.cur = this.cur;
    g.phase = this.phase;
    g.over = this.over;
    g.winner = this.winner;
    g.wl = this.wl ? [...this.wl] : null;
    return g;
  }

  top(i: number): { player: Player; size: PieceSize } | null {
    const s = this.board[i];
    return s.length ? s[s.length - 1] : null;
  }

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

  advPhase() {
    if (this.phase === 'placement' && this.resEmpty() && !this.checkWin()) this.phase = 'movement';
  }

  canPlace(p: Player, z: PieceSize, i: number): boolean {
    if (this.over || this.phase !== 'placement' || i < 0 || i > 8 || this.res[p][z] <= 0) return false;
    const t = this.top(i);
    if (!t) return true;
    return t.player !== p && this.SO[z] > this.SO[t.size];
  }

  canMove(p: Player, f: number, t: number): boolean {
    if (this.over || this.phase !== 'movement' || f === t || f < 0 || f > 8 || t < 0 || t > 8) return false;
    const tp = this.top(f);
    if (!tp || tp.player !== p) return false;
    if (!this.ADJ[f].includes(t)) return false;
    const tt = this.top(t);
    if (!tt) return true;
    return tt.player !== p && this.SO[tp.size] > this.SO[tt.size];
  }

  place(p: Player, z: PieceSize, i: number): boolean {
    if (!this.canPlace(p, z, i)) return false;
    const top_ = this.top(i);
    if (top_ && top_.player !== p) this.board[i].pop();
    this.board[i].push({ player: p, size: z });
    this.res[p][z]--;
    const w = this.checkWin();
    if (w) {
      this.fin(w.p, w.l);
      return true;
    }
    this.advPhase();
    if (!this.over) this.cur = p === 'human' ? 'ai' : 'human';
    return true;
  }

  move(p: Player, f: number, t: number): boolean {
    if (!this.canMove(p, f, t)) return false;
    const ttop_ = this.top(t);
    if (ttop_ && ttop_.player !== p) this.board[t].pop();
    this.board[t].push(this.board[f].pop()!);
    const w = this.checkWin();
    if (w) {
      this.fin(w.p, w.l);
      return true;
    }
    const o: Player = p === 'human' ? 'ai' : 'human';
    if (!this.anyMove(p) && !this.anyMove(o)) {
      this.over = true;
      this.winner = null;
      return true;
    }
    this.cur = o;
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

  moves(p: Player): Move[] {
    if (this.phase === 'placement') return this.placements(p);
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
  };
}

export function deserializeGameState(json: GameState): STT {
  const g = new STT();
  g.board = json.board;
  g.res = json.res;
  g.cur = json.cur;
  g.phase = json.phase;
  g.over = json.over;
  g.winner = json.winner;
  g.wl = json.wl;
  return g;
}
