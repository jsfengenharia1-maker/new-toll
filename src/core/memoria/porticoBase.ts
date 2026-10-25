// Memória detalhada do pórtico plano 2D (MD8): contexto comum e composição dos esforços por caso.
// O contexto é montado por `runDesign` só com a memória ligada; os registradores (viga, pilar, aço, global) usam os mesmos
// resultados e as mesmas funções determinísticas do dimensionamento, sem refazer a análise.
import { P } from '../math';
import { sampleXs } from '../estacoes';
import type { NamedCombo } from '../design';
import type { Analysis, CaseResult } from '../solver';
import type { Model } from '../types';
import { fm, fp } from './registrador';

export interface ComboRes { cb: NamedCombo; r: CaseResult }

export interface CtxPortico {
  a: Analysis;
  model: Model;
  mode: 'gammaZ' | 'pdelta';
  /** Resultados unitários do desaprumo por caso (modo γz; vazio no P-Δ). */
  desap: Map<number, CaseResult>;
  eluRes: ComboRes[];
  qpRes: ComboRes[];
  freqRes: ComboRes[];
  rareRes: ComboRes[];
}

export type Grandeza = 'N' | 'V' | 'M';

export interface Parcela { chave: string; nome: string; f: number; v: number }

/** Esforço de uma combinação numa abscissa: Σ γ·Sk por caso (e pelo desaprumo) ou valor direto da análise P-Δ. */
export interface Composicao {
  combinacao: string; x: number; grandeza: Grandeza; parcelas: Parcela[];
  /** Σ f·S das parcelas (igual a `total` salvo o arredondamento de ponto flutuante). */
  soma: number;
  /** Valor da combinação usado no cálculo (resultado da análise combinada). */
  total: number;
  /** false quando a combinação não é uma superposição de casos (P-Δ). */
  linear: boolean;
}

const nomeCaso = (m: Model, id: number) => m.cases.find((c) => c.id === id)?.name ?? `caso ${id}`;

export function composicao(c: CtxPortico, e: ComboRes, k: number, g: Grandeza, x: number, elu: boolean): Composicao {
  const total = P.evaluate(e.r.members[k][g], x);
  if (elu && c.mode === 'pdelta') return { combinacao: e.cb.name, x, grandeza: g, parcelas: [], soma: total, total, linear: false };
  const parcelas: Parcela[] = [];
  for (const [ids, f] of Object.entries(e.cb.factors)) {
    const id = +ids;
    const r = c.a.cases.get(id);
    if (!r || !f) continue;
    parcelas.push({ chave: `c${id}`, nome: nomeCaso(c.model, id), f, v: P.evaluate(r.members[k][g], x) });
  }
  if (elu && e.cb.desap) {
    for (const [ids, f] of Object.entries(e.cb.factors)) {
      const d = c.desap.get(+ids);
      if (d && f) parcelas.push({ chave: `d${ids}`, nome: `desaprumo (${nomeCaso(c.model, +ids)})`, f: f * e.cb.desap, v: P.evaluate(d.members[k][g], x) });
    }
  }
  const soma = parcelas.reduce((t, p) => t + p.f * p.v, 0);
  return { combinacao: e.cb.name, x, grandeza: g, parcelas, soma, total, linear: true };
}

/** Entradas exatas de uma composição (f_<caso>, S_<caso>, combinação e abscissa). */
export function entradasComposicao(cp: Composicao): Record<string, number | string> {
  const ent: Record<string, number | string> = { combinacao: cp.combinacao, x: cp.x };
  for (const p of cp.parcelas) { ent[`f_${p.chave}`] = p.f; ent[`S_${p.chave}`] = p.v; }
  return ent;
}

export function textoSoma(cp: Composicao): string {
  return cp.parcelas.map((p) => `${fm(p.f)}·${fp(p.v)} [${p.nome}]`).join(' + ') || '0';
}

/** Extremo de uma grandeza em todas as combinações e estações (a mesma varredura do dimensionamento, primeiro máximo estrito). */
export function extremo(list: ComboRes[], k: number, L: number, g: Grandeza, modo: 'max' | 'min' | 'abs'): { e: ComboRes; x: number; v: number } | null {
  let best: { e: ComboRes; x: number; v: number } | null = null, ref = 0;
  for (const e of list) {
    const m = e.r.members[k];
    for (const x of sampleXs(L, [m.M])) {
      const v = P.evaluate(m[g], x);
      const s = modo === 'abs' ? Math.abs(v) : modo === 'min' ? -v : v;
      if (s > ref) { ref = s; best = { e, x, v }; }
    }
  }
  return best;
}

/** Flecha elástica (relativa à corda ou total na ponta do balanço) da combinação, como em `deflOf`, com a estação governante. */
export function flechaElastica(r: CaseResult, k: number, L: number, balanco: boolean, livreJ: boolean) {
  const m = r.members[k];
  const v0 = P.evaluate(m.v, 0), vL = P.evaluate(m.v, L);
  let f = 0, xm = 0, vm = 0;
  for (let q = 0; q <= 40; q++) {
    const x = (L * q) / 40, v = P.evaluate(m.v, x);
    const rel = balanco ? (livreJ ? v - v0 : v - vL) : v - (v0 + ((vL - v0) * x) / L);
    if (Math.abs(rel) > f) { f = Math.abs(rel); xm = x; vm = v; }
  }
  return { f, x: xm, v: vm, v0, vL };
}
