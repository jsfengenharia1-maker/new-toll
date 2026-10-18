// Resultados ao longo de uma cadeia de barras (abscissa acumulada), para exportar em CSV.
import type { Analysis, CaseResult } from '../core/solver';
import type { PathSeg } from '../core/influence';
import { P } from '../core/math';
import { globalDisp, fmt, samplePoints } from './results';
import type { Units } from './units';

/** Caminho automático: barras horizontais no nível mais alto em que existam (ou todas as barras). */
export function defaultPath(model: { members: { id: number; ni: number; nj: number }[]; nodes: { id: number; y: number }[] }) {
  const y = (id: number) => model.nodes.find((n) => n.id === id)!.y;
  const horiz = model.members.filter((m) => Math.abs(y(m.ni) - y(m.nj)) < 1e-9);
  if (!horiz.length) return model.members.map((m) => m.id);
  const top = Math.max(...horiz.map((m) => y(m.ni)));
  return horiz.filter((m) => Math.abs(y(m.ni) - top) < 1e-9).map((m) => m.id);
}

export interface PathSample {
  s: number; member: number; x: number;
  /** [mín, máx] de N, V, M em kN e kN·m (iguais quando há um só resultado). */
  N: [number, number]; V: [number, number]; M: [number, number];
  /** Deslocamentos globais (m); só com um resultado. */
  dx?: number; dy?: number;
}

/**
 * Amostra N, V, M e deslocamentos ao longo do caminho. Em cada barra: divisões iguais
 * mais os pontos de momento extremo. N, V e M no sentido do caminho: numa barra percorrida
 * de j para i o eixo y local se inverte e o sinal de M é trocado (x local continua o da barra).
 */
export function pathSamples(a: Analysis, results: CaseResult[], path: PathSeg[], perMember = 10): PathSample[] {
  const out: PathSample[] = [];
  for (const seg of path) {
    const pm = a.prep.members[seg.k];
    const xs = samplePoints(results, seg.k, seg.L, 'M', perMember);
    if (!seg.forward) xs.reverse();
    for (const x of xs) {
      // barra percorrida de j para i: eixo y local invertido, o que troca o sinal de M (V e N não mudam)
      const range = (e: 'N' | 'V' | 'M'): [number, number] => {
        const f = e === 'M' && !seg.forward ? -1 : 1;
        const v = results.map((r) => f * P.evaluate(r.members[seg.k][e], x));
        return [Math.min(...v), Math.max(...v)];
      };
      const smp: PathSample = { s: seg.s0 + (seg.forward ? x : seg.L - x), member: pm.id, x, N: range('N'), V: range('V'), M: range('M') };
      if (results.length === 1) { const d = globalDisp(a, results[0], seg.k, x); smp.dx = d[0]; smp.dy = d[1]; }
      out.push(smp);
    }
  }
  return out;
}

/** Tabela pronta para CSV (unidade de força de exibição; deslocamentos em mm). */
export function pathTable(a: Analysis, results: CaseResult[], path: PathSeg[], U: Units, perMember = 10): { head: string[]; body: string[][] } {
  const smp = pathSamples(a, results, path, perMember);
  const F = U.F, M = U.M;
  if (results.length === 1) {
    return {
      head: ['s (m)', 'Barra', 'x local (m)', `N (${F.label})`, `V (${F.label})`, `M (${M.label})`, 'δx (mm)', 'δy (mm)'],
      body: smp.map((p) => [fmt(p.s, 3), String(p.member), fmt(p.x, 3), fmt(F.to(p.N[0])), fmt(F.to(p.V[0])), fmt(M.to(p.M[0])), fmt((p.dx ?? 0) * 1000, 3), fmt((p.dy ?? 0) * 1000, 3)]),
    };
  }
  return {
    head: ['s (m)', 'Barra', 'x local (m)', `N máx (${F.label})`, `N mín (${F.label})`, `V máx (${F.label})`, `V mín (${F.label})`, `M máx (${M.label})`, `M mín (${M.label})`],
    body: smp.map((p) => [fmt(p.s, 3), String(p.member), fmt(p.x, 3), fmt(F.to(p.N[1])), fmt(F.to(p.N[0])), fmt(F.to(p.V[1])), fmt(F.to(p.V[0])), fmt(M.to(p.M[1])), fmt(M.to(p.M[0]))]),
  };
}
