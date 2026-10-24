// Fundação do pilar-parede (frente FU, fatia FU7d): o pilar-parede que nasce na fundação ganha um pilar equivalente
// (retângulo envolvente nos eixos do pilar-parede, centrado no ponto onde a análise reduz as reações da base) que o
// resto das fundações (sapata, bloco sobre estacas, vigas de equilíbrio e de travamento) trata como um pilar comum.
// A análise (FU7c) já entrega as reações da base do pilar-parede por caso, em `AnaliseEdificio.fundacao` com
// `pilar` = id do pilar-parede, na mesma convenção dos pilares. Unidades: kN, m.
import type { P } from '../geom/faces';
import { lancesDoPP, ladosDoPP, retanguloDoLado } from './pilarParede';
import type { BuildingModel, Pilar, PilarParede } from './types';

/** Retângulo envolvente do pilar-parede no primeiro lance, nos eixos locais dele (ângulo do pilar-parede). */
export interface ReferenciaPP {
  /** Ponto de redução das reações: centroide das áreas dos lados (o mesmo de `ParedesNoPortico.centro`). */
  c: P;
  /** Dimensões do retângulo simétrico em relação a `c` que envolve os lados (m), ao longo de x e y locais. */
  ap: number; bp: number;
  angulo: number;
}

/** Centroide das áreas dos lados e o retângulo envolvente simétrico em torno dele, nos eixos do pilar-parede. */
export function referenciaDoPP(b: BuildingModel, pp: PilarParede): ReferenciaPP | null {
  const lances = lancesDoPP(b, pp);
  if (!lances.length) return null;
  const pav = lances[0].id, lados = ladosDoPP(b, pp);
  if (!lados.length) return null;
  let A = 0, cx = 0, cy = 0;
  for (const g of lados) { const r = retanguloDoLado(g, pav), a = r.comp * r.t; A += a; cx += a * r.c[0]; cy += a * r.c[1]; }
  if (!(A > 0)) return null;
  const c: P = [cx / A, cy / A], t = (pp.angulo * Math.PI) / 180, co = Math.cos(t), si = Math.sin(t);
  let mx = 0, my = 0;
  for (const g of lados) {
    const e = g.esp(pav), q = (s: number, d: number): P => [g.a[0] + g.u[0] * s + g.n[0] * d, g.a[1] + g.u[1] * s + g.n[1] * d];
    for (const s of [0, g.L]) for (const d of [e.esq, -e.dir]) {
      const p = q(s, d), dx = p[0] - c[0], dy = p[1] - c[1];
      mx = Math.max(mx, Math.abs(dx * co + dy * si)); my = Math.max(my, Math.abs(-dx * si + dy * co));
    }
  }
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
  return { c: [r4(c[0]), r4(c[1])], ap: r4(2 * mx), bp: r4(2 * my), angulo: pp.angulo };
}

const memo = new WeakMap<BuildingModel, Map<string, Pilar | null>>();

/** Pilar equivalente do pilar-parede que nasce na fundação (id igual ao do pilar-parede); null se não nasce lá ou sem geometria. */
export function pilarDoPP(b: BuildingModel, id: string): Pilar | null {
  let m = memo.get(b);
  if (!m) { m = new Map(); memo.set(b, m); }
  if (m.has(id)) return m.get(id)!;
  const pp = b.pilaresParede?.find((x) => x.id === id), ref = pp && pp.nasce === 'fundacao' ? referenciaDoPP(b, pp) : null;
  const p: Pilar | null = pp && ref
    ? { id: pp.id, nome: pp.nome, x: ref.c[0], y: ref.c[1], angulo: pp.angulo, ajuste: 'c', nasce: pp.nasce, morre: pp.morre, secao: { tipo: 'ret', b: ref.ap, h: ref.bp }, inicio: 'fundacao' }
    : null;
  m.set(id, p);
  return p;
}

/** Pilar (ou o equivalente do pilar-parede) com o id dado. */
export const acharPilar = (b: BuildingModel, id: string): Pilar | undefined => b.pilares.find((x) => x.id === id) ?? pilarDoPP(b, id) ?? undefined;

/** Pilares equivalentes de todos os pilares-parede que nascem na fundação. */
export const pilaresEquivalentesPP = (b: BuildingModel): Pilar[] =>
  (b.pilaresParede ?? []).flatMap((pp) => { const p = pilarDoPP(b, pp.id); return p ? [p] : []; });

/** Pilares-parede com fundação lançada (elemento ou ponta de viga de fundação): entram nas cargas por pilar. */
export function pilaresParedeEmUso(b: BuildingModel): Pilar[] {
  const usados = new Set<string>();
  for (const e of b.fundacao?.elementos ?? []) for (const id of e.pilares) usados.add(id);
  for (const v of b.fundacao?.vigas ?? []) { usados.add(v.ini); usados.add(v.fim); }
  for (const e of b.fundacao?.elementos ?? []) if (usados.has(e.id)) for (const id of e.pilares) usados.add(id);
  return pilaresEquivalentesPP(b).filter((p) => usados.has(p.id) && !b.pilares.some((x) => x.id === p.id));
}
