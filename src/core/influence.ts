// Linhas de influência (Müller-Breslau via deformação inicial concentrada) e trem-tipo.
import { noLoad } from './element';
import { memberDisp, solveLoading, type CaseResult, type Prepared } from './solver';
import type { LoadTrain } from './types';
import { P } from './math';

export type Effect = 'N' | 'V' | 'M';

const E_VEC: Record<Effect, [number, number, number]> = { N: [1, 0, 0], V: [0, 1, 0], M: [0, 0, 1] };

/** Configuração deformada cujo deslocamento vertical (com sinal trocado) é a LI para carga unitária descendente. */
export function influenceField(prep: Prepared, memberIndex: number, a: number, effect: Effect): CaseResult {
  const loads = prep.members.map(() => noLoad());
  return solveLoading(prep, loads, new Float64Array(prep.ndof), null, { member: memberIndex, a, e: E_VEC[effect] });
}

/**
 * LI de reação (Müller-Breslau com deslocamento imposto): recalque −1 no gdl restringido do apoio.
 * Pelo teorema de Betti, a reação (no sentido positivo do eixo do apoio) devida à carga unitária
 * descendente em x é o deslocamento para cima do campo com recalque +1, ou seja, ilOrdinate do campo com −1.
 */
export function reactionField(prep: Prepared, nodeIndex: number, dir: 0 | 1 | 2): CaseResult | null {
  const d = nodeIndex * 3 + dir;
  if (!prep.constrained[d] || !prep.model.nodes[nodeIndex]?.support) return null;
  const presc = new Float64Array(prep.ndof);
  presc[d] = -1;
  return solveLoading(prep, prep.members.map(() => noLoad()), new Float64Array(prep.ndof), presc);
}

/**
 * LI de deslocamento de nó (Maxwell-Betti): o deslocamento do nó na direção `dir` devido à carga unitária
 * descendente em x é igual ao deslocamento descendente em x devido à carga unitária no nó na direção `dir`.
 */
export function displacementField(prep: Prepared, nodeIndex: number, dir: 0 | 1 | 2): CaseResult {
  const F = new Float64Array(prep.ndof);
  F[nodeIndex * 3 + dir] = 1;
  return solveLoading(prep, prep.members.map(() => noLoad()), F, null);
}

/** Ordenada da LI (carga unitária vertical para baixo) num ponto da barra k, posição x. */
export function ilOrdinate(prep: Prepared, field: CaseResult, k: number, x: number): number {
  const pm = prep.members[k];
  const [u, v] = memberDisp(field.members[k], x);
  return -(pm.s * u + pm.c * v);
}

export interface PathSeg { k: number; forward: boolean; s0: number; L: number }

/** Ordena as barras selecionadas em um caminho contínuo. Retorna null se não formarem cadeia. */
export function buildPath(prep: Prepared, memberIds: number[]): PathSeg[] | null {
  const ms = memberIds.map((id) => prep.members.find((m) => m.id === id)).filter(Boolean) as Prepared['members'];
  if (!ms.length) return null;
  const deg = new Map<number, number>();
  for (const m of ms) { deg.set(m.i, (deg.get(m.i) ?? 0) + 1); deg.set(m.j, (deg.get(m.j) ?? 0) + 1); }
  const ends = [...deg.entries()].filter(([, d]) => d === 1).map(([n]) => n);
  if ([...deg.values()].some((d) => d > 2) || ends.length !== 2) return null;
  // começa pela extremidade mais à esquerda (menor x)
  const nx = (n: number) => prep.model.nodes[n].x;
  let cur = nx(ends[0]) <= nx(ends[1]) ? ends[0] : ends[1];
  const left = new Set(ms);
  const out: PathSeg[] = [];
  let s0 = 0;
  while (left.size) {
    const m = [...left].find((mm) => mm.i === cur || mm.j === cur);
    if (!m) return null;
    left.delete(m);
    const forward = m.i === cur;
    out.push({ k: m.index, forward, s0, L: m.L });
    s0 += m.L;
    cur = forward ? m.j : m.i;
  }
  return out;
}

export interface ILSampled { s: Float64Array; f: Float64Array; total: number }

export function samplePath(prep: Prepared, field: CaseResult, path: PathSeg[], perMember = 60): ILSampled {
  const s: number[] = [], f: number[] = [];
  for (const seg of path) {
    const r = field.members[seg.k];
    const xs: number[] = [];
    for (let q = 0; q <= perMember; q++) xs.push((seg.L * q) / perMember);
    if (r.jump) { xs.push(r.jump.a - 1e-9 * seg.L, r.jump.a + 1e-9 * seg.L); }
    xs.sort((a, b) => a - b);
    for (const x of xs) {
      if (x < 0 || x > seg.L) continue;
      const along = seg.forward ? x : seg.L - x;
      s.push(seg.s0 + along);
      f.push(ilOrdinate(prep, field, seg.k, x));
    }
  }
  const idx = s.map((_, i) => i).sort((a, b) => s[a] - s[b] || a - b);
  const total = path.reduce((acc, p) => acc + p.L, 0);
  return { s: Float64Array.from(idx.map((i) => s[i])), f: Float64Array.from(idx.map((i) => f[i])), total };
}

function interp(sm: ILSampled, x: number): number {
  const { s, f } = sm;
  if (x < s[0] || x > s[s.length - 1]) return 0;
  let lo = 0, hi = s.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] <= x) lo = m; else hi = m; }
  const ds = s[hi] - s[lo];
  return ds < 1e-14 ? f[hi] : f[lo] + ((f[hi] - f[lo]) * (x - s[lo])) / ds;
}

/** Integrais acumuladas das partes positiva e negativa (trapézios com corte no zero). */
function prefix(sm: ILSampled) {
  const n = sm.s.length;
  const pos = new Float64Array(n), neg = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const ds = sm.s[i] - sm.s[i - 1], a = sm.f[i - 1], b = sm.f[i];
    let p = 0, q = 0;
    if (a >= 0 && b >= 0) p = ((a + b) / 2) * ds;
    else if (a <= 0 && b <= 0) q = ((a + b) / 2) * ds;
    else { const t = a / (a - b); const area1 = (a / 2) * t * ds, area2 = (b / 2) * (1 - t) * ds; if (a > 0) { p = area1; q = area2; } else { q = area1; p = area2; } }
    pos[i] = pos[i - 1] + p; neg[i] = neg[i - 1] + q;
  }
  return { pos, neg };
}

function cumAt(sm: ILSampled, arr: Float64Array, x: number): number {
  const { s } = sm;
  if (x <= s[0]) return 0;
  if (x >= s[s.length - 1]) return arr[arr.length - 1];
  let lo = 0, hi = s.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] <= x) lo = m; else hi = m; }
  // aproximação linear dentro do intervalo (suficiente com amostragem fina)
  const ds = s[hi] - s[lo];
  return ds < 1e-14 ? arr[hi] : arr[lo] + ((arr[hi] - arr[lo]) * (x - s[lo])) / ds;
}

export interface TrainEnvelope { max: number; min: number; posMax: number; posMin: number; revMax: boolean; revMin: boolean }

/**
 * Envoltória do trem-tipo sobre a LI amostrada. Cargas concentradas sempre presentes;
 * q (fora do veículo) e q' (sob o veículo) aplicadas apenas nos trechos desfavoráveis.
 * posMax/posMin: posição da frente do veículo ao longo do caminho.
 */
export function trainEnvelope(sm: ILSampled, train: LoadTrain): TrainEnvelope {
  const { pos, neg } = prefix(sm);
  const totPos = pos[pos.length - 1], totNeg = neg[neg.length - 1];
  const Lt = train.length;
  const phi = train.impact || 1;
  let best: TrainEnvelope = { max: -Infinity, min: Infinity, posMax: 0, posMin: 0, revMax: false, revMin: false };
  for (const rev of [false, true]) {
    const loads = train.loads.map((l) => ({ d: rev ? Lt - l.d : l.d, P: l.P }));
    const cands = new Set<number>();
    for (let i = 0; i < sm.s.length; i++) for (const l of loads) cands.add(sm.s[i] + l.d);
    cands.add(0); cands.add(sm.total + Lt);
    for (let k = 0; k <= 50; k++) cands.add(((sm.total + Lt) * k) / 50);
    for (const t of cands) {
      if (t < 0 || t > sm.total + Lt) continue;
      let conc = 0;
      for (const l of loads) conc += l.P * interp(sm, t - l.d);
      const a = Math.max(0, t - Lt), b = Math.min(sm.total, t);
      const inPos = b > a ? cumAt(sm, pos, b) - cumAt(sm, pos, a) : 0;
      const inNeg = b > a ? cumAt(sm, neg, b) - cumAt(sm, neg, a) : 0;
      const eMax = phi * (conc + train.q * (totPos - inPos) + train.qIn * inPos);
      const eMin = phi * (conc + train.q * (totNeg - inNeg) + train.qIn * inNeg);
      if (eMax > best.max) best = { ...best, max: eMax, posMax: t, revMax: rev };
      if (eMin < best.min) best = { ...best, min: eMin, posMin: t, revMin: rev };
    }
  }
  return best;
}

/** Valor de um esforço de seção num resultado (para somar a parcela estática). */
export function effectAt(res: CaseResult, k: number, x: number, e: Effect): number {
  const m = res.members[k];
  return P.evaluate(e === 'N' ? m.N : e === 'V' ? m.V : m.M, x);
}

export interface MemberEnvelope { xs: number[]; max: Record<Effect, number[]>; min: Record<Effect, number[]> }

export function trainEnvelopeAll(prep: Prepared, path: PathSeg[], train: LoadTrain, stat: CaseResult | null, nSec = 10, perMember = 30): MemberEnvelope[] {
  return prep.members.map((pm) => {
    const xs = Array.from({ length: nSec + 1 }, (_, q) => (pm.L * q) / nSec);
    const max = { N: [] as number[], V: [] as number[], M: [] as number[] };
    const min = { N: [] as number[], V: [] as number[], M: [] as number[] };
    for (const x of xs) {
      for (const e of ['N', 'V', 'M'] as Effect[]) {
        const field = influenceField(prep, pm.index, x, e);
        const env = trainEnvelope(samplePath(prep, field, path, perMember), train);
        const st = stat ? effectAt(stat, pm.index, x, e) : 0;
        max[e].push(env.max + st);
        min[e].push(env.min + st);
      }
    }
    return { xs, max, min };
  });
}
