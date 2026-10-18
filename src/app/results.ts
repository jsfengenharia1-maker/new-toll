import { useMemo } from 'react';
import { analyze, memberDisp, type Analysis, type CaseResult } from '../core/solver';
import { P } from '../core/math';
import { useStore, type Source } from './store';

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
export function linkText(m: { hingeI?: boolean; hingeJ?: boolean; springI?: number; springJ?: number }) {
  const end = (h?: boolean, k?: number) => (h ? 'rótula' : k && k > 0 ? `k = ${fmt(k, 0)} kN·m/rad` : '');
  const i = end(m.hingeI, m.springI), j = end(m.hingeJ, m.springJ);
  if (!i && !j) return '—';
  if (i === j) return `ambas: ${i}`;
  return [i && `início: ${i}`, j && `fim: ${j}`].filter(Boolean).join(' · ');
}

export const isSemi = (h?: boolean, k?: number) => !h && !!k && k > 0;
