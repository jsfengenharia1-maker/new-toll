import { useMemo } from 'react';
import { analyze, memberDisp, type Analysis, type CaseResult } from '../core/solver';
import { P } from '../core/math';
import { useStore, type ILState, type Source } from './store';
import { displacementField, effectAt, influenceField, reactionField } from '../core/influence';

const analysisCache = new WeakMap<object, Analysis>();
export function useAnalysis(): Analysis {
  const model = useStore((s) => s.model);
  return useMemo(() => {
    let a = analysisCache.get(model);
    if (!a) { a = analyze(model); analysisCache.set(model, a); }
    return a;
  }, [model]);
}

export function resultFor(a: Analysis, src: Source): CaseResult[] {
  if (a.prep.error) return [];
  switch (src.kind) {
    case 'case': return a.cases.has(src.id) ? [a.cases.get(src.id)!] : [];
    case 'combo': return a.combos.has(src.id) ? [a.combos.get(src.id)!] : [];
    case 'envCases': return [...a.cases.values()];
    case 'envCombos': return [...a.combos.values()];
    case 'envSel': return [...src.cases.map((id) => a.cases.get(id)), ...src.combos.map((id) => a.combos.get(id))].filter((r): r is CaseResult => !!r);
  }
}

export type Eff = 'N' | 'V' | 'M';

export function effPoly(r: CaseResult, k: number, e: Eff) {
  const m = r.members[k];
  return e === 'N' ? m.N : e === 'V' ? m.V : m.M;
}

/** Pontos de amostragem da barra (inclui extremos do polinômio). */
export function samplePoints(r: CaseResult[], k: number, L: number, e: Eff, n = 24): number[] {
  const xs = new Set<number>();
  for (let q = 0; q <= n; q++) xs.add((L * q) / n);
  for (const res of r) {
    const p = effPoly(res, k, e);
    for (const x of P.rootsIn(P.derive(p), 0, L)) xs.add(x);
  }
  return [...xs].sort((a, b) => a - b);
}

export interface Series { xs: number[]; max: number[]; min: number[] }

export function memberSeries(r: CaseResult[], k: number, L: number, e: Eff): Series {
  const xs = samplePoints(r, k, L, e);
  const max: number[] = [], min: number[] = [];
  for (const x of xs) {
    let hi = -Infinity, lo = Infinity;
    for (const res of r) { const v = P.evaluate(effPoly(res, k, e), x); hi = Math.max(hi, v); lo = Math.min(lo, v); }
    max.push(hi); min.push(lo);
  }
  return { xs, max, min };
}

export function globalDisp(a: Analysis, r: CaseResult, k: number, x: number): [number, number] {
  const pm = a.prep.members[k];
  const [u, v] = memberDisp(r.members[k], x);
  return [pm.c * u - pm.s * v, pm.s * u + pm.c * v];
}

export function fmt(v: number, d = 2): string {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) < 1e-9) v = 0;
  const a = Math.abs(v);
  if (a !== 0 && (a < 10 ** -d || a >= 1e6)) return v.toExponential(2).replace('.', ',');
  return (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('.', ',').replace('-0,00', '0,00');
}

export function sourceLabel(model: { cases: { id: number; name: string }[]; combinations: { id: number; name: string }[] }, s: Source): string {
  if (s.kind === 'case') return model.cases.find((c) => c.id === s.id)?.name ?? 'Caso';
  if (s.kind === 'combo') return model.combinations.find((c) => c.id === s.id)?.name ?? 'Combinação';
  if (s.kind === 'envSel') return `Envoltória de ${s.cases.length + s.combos.length} escolhido(s)`;
  return s.kind === 'envCases' ? 'Envoltória dos casos' : 'Envoltória das combinações';
}

import { runDesign, type DesignReport } from '../core/design';

const designCache = new WeakMap<object, DesignReport>();
export function getDesign(a: Analysis): DesignReport {
  let d = designCache.get(a);
  if (!d) { d = runDesign(a.prep.model, a); designCache.set(a, d); }
  return d;
}
export function useDesign(): DesignReport {
  const a = useAnalysis();
  return useMemo(() => getDesign(a), [a]);
}

/** Descrição das ligações de extremidade de uma barra (rótula ou semirrígida). */
export function linkText(m: { hingeI?: boolean; hingeJ?: boolean; springI?: number; springJ?: number; rigid?: 'axial' | 'full' }, kConv: { label: string; to: (v: number) => number } = { label: 'kN·m/rad', to: (v) => v }): string {
  const end = (h?: boolean, k?: number) => (h ? 'rótula' : k && k > 0 ? `k = ${fmt(kConv.to(k), 0)} ${kConv.label}` : '');
  const i = end(m.hingeI, m.springI), j = end(m.hingeJ, m.springJ);
  const rg = m.rigid === 'full' ? 'barra rígida' : m.rigid === 'axial' ? 'inextensível' : '';
  if (!i && !j) return rg || '—';
  if (rg) return `${linkText({ ...m, rigid: undefined }, kConv)} · ${rg}`;
  if (i === j) return `ambas: ${i}`;
  return [i && `início: ${i}`, j && `fim: ${j}`].filter(Boolean).join(' · ');
}

export const isSemi = (h?: boolean, k?: number) => !h && !!k && k > 0;

/** Campo da linha de influência do alvo escolhido (seção, reação ou deslocamento). */
export function ilFieldOf(a: Analysis, il: ILState): { field: CaseResult; pm?: Analysis['prep']['members'][number]; x?: number; nodeIndex?: number } | null {
  if (a.prep.error) return null;
  const t = il.target ?? 'section';
  if (t === 'section') {
    if (il.member === null) return null;
    const pm = a.prep.members.find((m) => m.id === il.member);
    if (!pm) return null;
    const x = Math.min(Math.max(il.x, 0), pm.L);
    return { field: influenceField(a.prep, pm.index, x, il.effect), pm, x };
  }
  const k = a.prep.nodeIndex.get(il.node ?? -1);
  if (k === undefined) return null;
  const dir = il.dir ?? 1;
  const field = t === 'reaction' ? reactionField(a.prep, k, dir) : displacementField(a.prep, k, dir);
  return field ? { field, nodeIndex: k } : null;
}

/** Valor do alvo da LI num resultado estático (para somar à envoltória do trem-tipo). */
export function ilStaticValue(a: Analysis, il: ILState, r: CaseResult): number {
  const t = il.target ?? 'section';
  if (t === 'section') {
    const pm = a.prep.members.find((m) => m.id === il.member);
    return pm ? effectAt(r, pm.index, Math.min(Math.max(il.x, 0), pm.L), il.effect) : 0;
  }
  const k = a.prep.nodeIndex.get(il.node ?? -1);
  if (k === undefined) return 0;
  return t === 'reaction' ? r.reactions.get(k)?.[il.dir ?? 1] ?? 0 : r.u[k * 3 + (il.dir ?? 1)];
}
