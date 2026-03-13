/**
 * StackTacToe AI Engine — klare Regeln pro Schwierigkeit
 *
 * Easy (Anfänger):
 *   - Immer eigenen Sieg nehmen, wenn möglich.
 *   - 20% Chance: Gegner-Sieg blockieren, wenn möglich.
 *   - 65% Chance: Zufälliger gültiger Zug.
 *   - Sonst: Bester Zug nach Bewertung (Eval).
 *
 * Mid (Schwer):
 *   - Immer eigenen Sieg nehmen.
 *   - 88% Chance: Blockieren, wenn Gegner im nächsten Zug gewinnen würde.
 *   - Sonst: Minimax Tiefe 2 (ein Halbzug voraus) + ±14 Zufallsrauschen für Abwechslung.
 *
 * Hard (Profi):
 *   - Immer eigenen Sieg nehmen.
 *   - Immer blockieren, wenn Gegner sonst gewinnt.
 *   - Sonst: Minimax mit Alpha-Beta, Tiefe 3 in Placement, Tiefe 4 in Movement.
 */

import { STT, type Move, type Player } from './stt';

export type Difficulty = 'easy' | 'mid' | 'hard';

export class AI {
  constructor(public d: Difficulty) {}

  static eval(state: STT, player: Player): number {
    if (state.winner === player) return 100000;
    if (state.winner && state.winner !== player) return -100000;
    const opp: Player = player === 'human' ? 'ai' : 'human';
    const v = state.vis();
    let s = 0;
    const pw = [3, 2, 3, 2, 6, 2, 3, 2, 3];
    const sw: Record<string, number> = { small: 1, medium: 2.5, large: 4 };
    for (let i = 0; i < 9; i++) {
      if (!v[i]) continue;
      const val = pw[i] * sw[v[i]!.size];
      s += v[i]!.player === player ? val : -val;
    }
    for (const [a, b, c] of state.WL) {
      const pc = v.filter((x, i) => [a, b, c].includes(i) && x && x.player === player).length;
      const oc = v.filter((x, i) => [a, b, c].includes(i) && x && x.player === opp).length;
      const em = v.filter((x, i) => [a, b, c].includes(i) && !x).length;
      if (pc === 2 && em === 1) s += 45;
      if (pc === 1 && em === 2) s += 10;
      if (oc === 2 && em === 1) s -= 42;
    }
    for (let i = 0; i < 9; i++) {
      const st = state.board[i];
      if (st.length > 1) {
        const t = st[st.length - 1]!;
        s += (t.player === player ? 4 : -4) * st.length;
      }
    }
    return s;
  }

  static mm(state: STT, depth: number, alpha: number, beta: number, maxim: boolean, player: Player): number {
    if (state.over || depth === 0) return AI.eval(state, player);
    const cur: Player = maxim ? player : (player === 'human' ? 'ai' : 'human');
    const mvs = state.moves(cur);
    if (!mvs.length) return AI.eval(state, player);
    if (maxim) {
      let best = -Infinity;
      for (const m of mvs) {
        const g = state.clone();
        if (m.type === 'place') g.place(cur, m.size, m.index);
        else g.move(cur, m.fromIndex, m.toIndex);
        best = Math.max(best, AI.mm(g, depth - 1, alpha, beta, false, player));
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of mvs) {
        const g = state.clone();
        if (m.type === 'place') g.place(cur, m.size, m.index);
        else g.move(cur, m.fromIndex, m.toIndex);
        best = Math.min(best, AI.mm(g, depth - 1, alpha, beta, true, player));
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  findWin(state: STT, p: Player): Move | null {
    for (const m of state.moves(p)) {
      const g = state.clone();
      if (m.type === 'place') g.place(p, m.size, m.index);
      else g.move(p, m.fromIndex, m.toIndex);
      if (g.winner === p) return m;
    }
    return null;
  }

  findBlock(state: STT, p: Player): Move | null {
    const o: Player = p === 'human' ? 'ai' : 'human';
    for (const om of state.moves(o)) {
      const g = state.clone();
      if (om.type === 'place') g.place(o, om.size, om.index);
      else g.move(o, om.fromIndex, om.toIndex);
      if (g.winner === o) {
        const ti = om.type === 'place' ? om.index : om.toIndex;
        const cands = state.moves(p).filter((m) => (m.type === 'place' ? m.index : m.toIndex) === ti);
        if (cands.length) {
          cands.sort((a, b) => {
            const ga = state.clone();
            const gb = state.clone();
            if (a.type === 'place') ga.place(p, a.size, a.index);
            else ga.move(p, a.fromIndex, a.toIndex);
            if (b.type === 'place') gb.place(p, b.size, b.index);
            else gb.move(p, b.fromIndex, b.toIndex);
            return AI.eval(gb, p) - AI.eval(ga, p);
          });
          return cands[0]!;
        }
      }
    }
    return null;
  }

  choose(state: STT): Move | null {
    const mvs = state.moves('ai');
    if (!mvs.length) return null;
    const win = this.findWin(state, 'ai');
    if (win) return win;
    if (this.d === 'easy') {
      if (Math.random() < 0.2) {
        const bl = this.findBlock(state, 'ai');
        if (bl) return bl;
      }
      if (Math.random() < 0.65) return mvs[Math.floor(Math.random() * mvs.length)]!;
      return mvs.sort((a, b) => {
        const ga = state.clone();
        const gb = state.clone();
        if (a.type === 'place') ga.place('ai', a.size, a.index);
        else ga.move('ai', a.fromIndex, a.toIndex);
        if (b.type === 'place') gb.place('ai', b.size, b.index);
        else gb.move('ai', b.fromIndex, b.toIndex);
        return AI.eval(gb, 'ai') - AI.eval(ga, 'ai');
      })[0]!;
    }
    const bl = this.findBlock(state, 'ai');
    if (this.d === 'mid') {
      if (bl && Math.random() < 0.88) return bl;
      let best = -Infinity;
      let bm = mvs[0]!;
      for (const m of mvs) {
        const g = state.clone();
        if (m.type === 'place') g.place('ai', m.size, m.index);
        else g.move('ai', m.fromIndex, m.toIndex);
        const sc = AI.mm(g, 2, -Infinity, Infinity, false, 'ai') + (Math.random() - 0.5) * 14;
        if (sc > best) {
          best = sc;
          bm = m;
        }
      }
      return bm;
    }
    if (bl) return bl;
    let best = -Infinity;
    let bm = mvs[0]!;
    const depth = state.phase === 'placement' ? 3 : 4;
    for (const m of mvs) {
      const g = state.clone();
      if (m.type === 'place') g.place('ai', m.size, m.index);
      else g.move('ai', m.fromIndex, m.toIndex);
      const sc = AI.mm(g, depth, -Infinity, Infinity, false, 'ai');
      if (sc > best) {
        best = sc;
        bm = m;
      }
    }
    return bm;
  }
}
