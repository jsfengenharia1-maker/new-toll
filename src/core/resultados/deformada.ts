// Deformada do edifício (V3): deslocamentos nodais por hipótese (caso simples ou combinação), linha elástica das barras
// por interpolação cúbica de Hermite (com a parcela da carga distribuída, exata para Euler-Bernoulli), escala
// automática e fator da animação. Núcleo puro, sem three nem React.
import { baseBarra, type Modelo3, type V3 } from '../fe3d';
import type { AnaliseEdificio } from '../building/analitico';
import { combinacoesEdificio, type CombinacaoEd } from '../building/combinacoes';
import { casosDaObra, type BuildingModel } from '../building/types';

/** Hipótese de carga: caso simples (fator 1) ou combinação (fatores por caso, como em `CombinacaoEd`). */
export interface Hipotese { id: string; nome: string; tipo: 'caso' | 'combinacao'; fatores: Record<string, number> }

export const hipoteseDeCaso = (caso: string, nome = caso): Hipotese => ({ id: `caso:${caso}`, nome, tipo: 'caso', fatores: { [caso]: 1 } });
export const hipoteseDeCombinacao = (c: CombinacaoEd): Hipotese => ({ id: `comb:${c.nome}`, nome: c.nome, tipo: 'combinacao', fatores: c.fatores });

/** Casos simples (G, Q, adicionais e vento) e combinações da obra, na ordem da lista da interface. */
export function hipotesesDisponiveis(b: BuildingModel, an: AnaliseEdificio): Hipotese[] {
  const nomes = new Map(casosDaObra(b).map((c) => [c.id, c.nome]));
  const casos = an.casos.map((c) => hipoteseDeCaso(c, nomes.get(c) ?? c));
  const vento = (an.vento?.casos ?? []).filter((_, i) => !!an.portico.resVento?.desloc[i]).map((c) => hipoteseDeCaso(c.nome));
  return [...casos, ...vento, ...combinacoesEdificio(b, an).map(hipoteseDeCombinacao)];
}

/** Deslocamentos nodais de uma hipótese: pórtico (6 por nó), grelha de cada pavimento e casos que não puderam entrar. */
export interface DeslocamentosHipotese {
  portico: Float64Array;
  grelhas: Map<string, Float64Array>;
  /** Casos da hipótese sem resultado de deslocamento (ex.: P-Δ de combinação sem convergência). */
  ignorados: string[];
}

/** Vetor de deslocamentos de um caso (pelo nome) no pórtico, ou null. */
export function deslocPorticoDoCaso(an: AnaliseEdificio, caso: string): Float64Array | null {
  const pm = an.portico, ic = an.casos.indexOf(caso);
  if (ic >= 0) return pm.res?.desloc[ic] ?? null;
  const iw = (an.vento?.casos ?? []).findIndex((c) => c.nome === caso);
  if (iw >= 0) return pm.resVento?.desloc[iw] ?? null;
  const m = /^PΔ (\d+)$/.exec(caso);
  if (m) return pm.resPDelta?.desloc[+m[1] - 1] ?? null;
  return null;
}

export function deslocamentosHipotese(an: AnaliseEdificio, h: Hipotese): DeslocamentosHipotese {
  const nn = an.portico.modelo.nos.length * 6, portico = new Float64Array(nn), grelhas = new Map<string, Float64Array>(), ignorados: string[] = [];
  for (const g of an.grelhas) if (g.res && !g.res.erro) grelhas.set(g.pavimento, new Float64Array(g.modelo.nos.length * 6));
  for (const [caso, f] of Object.entries(h.fatores)) {
    if (!f) continue;
    const u = deslocPorticoDoCaso(an, caso);
    if (!u) { ignorados.push(caso); continue; }
    for (let k = 0; k < nn; k++) portico[k] += f * u[k];
    const ic = an.casos.indexOf(caso);
    if (ic < 0) continue; // vento e P-Δ não existem nas grelhas (só nas ações verticais)
    for (const g of an.grelhas) {
      const v = grelhas.get(g.pavimento), ug = g.res?.desloc[ic];
      if (v && ug) for (let k = 0; k < v.length; k++) v[k] += f * ug[k];
    }
  }
  return { portico, grelhas, ignorados };
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Deslocamento e rotação (globais) de um ponto da barra. */
export interface PontoDeformado { pos: V3; u: V3; rot: V3 }

/** Cargas distribuídas por barra (globais, kN/m) somadas dos casos da hipótese: a parcela particular da linha elástica. */
export function cargasDistribuidasHipotese(an: AnaliseEdificio, h: Hipotese): Map<number, V3> {
  const pm = an.portico, out = new Map<number, V3>();
  const fonte = (caso: string): { distribuidas: { barra: number; q: V3 }[] } | undefined => {
    const ic = an.casos.indexOf(caso);
    if (ic >= 0) return pm.casos?.[ic];
    const iw = (an.vento?.casos ?? []).findIndex((c) => c.nome === caso);
    if (iw >= 0) return pm.casosVento?.[iw];
    return undefined;
  };
  for (const [caso, f] of Object.entries(h.fatores)) {
    if (!f) continue;
    for (const d of fonte(caso)?.distribuidas ?? []) {
      const q = out.get(d.barra) ?? [0, 0, 0];
      out.set(d.barra, [q[0] + f * d.q[0], q[1] + f * d.q[1], q[2] + f * d.q[2]]);
    }
  }
  return out;
}

/**
 * Ponto da barra `bi` à fração `t` (0 a 1) do eixo entre os nós i e j, deformado pela solução `u` (6 gdl por nó).
 * Trechos rígidos seguem o corpo rígido do nó; o trecho flexível usa Hermite cúbico nas duas direções transversais
 * (rotações das extremidades flexíveis = rotações nodais, valor exato para barras sem rótula) somado à solução
 * de engastamento perfeito da carga uniforme `q` (global, kN/m): juntas dão a linha elástica exata de Euler-Bernoulli.
 */
export function pontoDaBarra(m: Modelo3, bi: number, u: ArrayLike<number>, t: number, q?: V3): PontoDeformado {
  const b = m.barras[bi], { L, R, oi, oj } = baseBarra(m, b), [ex, ey, ez] = R;
  const pi = m.nos[b.i], pj = m.nos[b.j];
  const ui: V3 = [u[b.i * 6], u[b.i * 6 + 1], u[b.i * 6 + 2]], ti: V3 = [u[b.i * 6 + 3], u[b.i * 6 + 4], u[b.i * 6 + 5]];
  const uj: V3 = [u[b.j * 6], u[b.j * 6 + 1], u[b.j * 6 + 2]], tj: V3 = [u[b.j * 6 + 3], u[b.j * 6 + 4], u[b.j * 6 + 5]];
  const P: V3 = [pi[0] + t * (pj[0] - pi[0]), pi[1] + t * (pj[1] - pi[1]), pi[2] + t * (pj[2] - pi[2])];
  const A: V3 = [pi[0] + oi[0], pi[1] + oi[1], pi[2] + oi[2]];
  const x = L > 0 ? dot(sub(P, A), ex) : 0;
  const rigido = (n: V3, un: V3, tn: V3): PontoDeformado => {
    const r = cruz(tn, sub(P, n));
    return { pos: P, u: [un[0] + r[0], un[1] + r[1], un[2] + r[2]], rot: tn };
  };
  if (L <= 1e-9) return rigido(pi, ui, ti);
  if (x <= 0) return rigido(pi, ui, ti);
  if (x >= L) return rigido(pj, uj, tj);
  const xi = x / L;
  const ua: V3 = (() => { const r = cruz(ti, oi); return [ui[0] + r[0], ui[1] + r[1], ui[2] + r[2]]; })();
  const ub: V3 = (() => { const r = cruz(tj, oj); return [uj[0] + r[0], uj[1] + r[1], uj[2] + r[2]]; })();
  // axial e torção: linear
  const ax = (1 - xi) * dot(ua, ex) + xi * dot(ub, ex);
  const tx = (1 - xi) * dot(ti, ex) + xi * dot(tj, ex);
  const H1 = 1 - 3 * xi ** 2 + 2 * xi ** 3, H2 = xi - 2 * xi ** 2 + xi ** 3, H3 = 3 * xi ** 2 - 2 * xi ** 3, H4 = -(xi ** 2) + xi ** 3;
  const D1 = (-6 * xi + 6 * xi ** 2) / L, D2 = 1 - 4 * xi + 3 * xi ** 2, D3 = (6 * xi - 6 * xi ** 2) / L, D4 = -2 * xi + 3 * xi ** 2;
  const transversal = (e: V3, EI: number) => {
    const va = dot(ua, e), vb = dot(ub, e);
    const sa = dot(cruz(ti, ex), e), sb = dot(cruz(tj, ex), e);
    let v = va * H1 + L * sa * H2 + vb * H3 + L * sb * H4;
    let dv = va * D1 + sa * D2 + vb * D3 + sb * D4;
    const qe = q ? dot(q, e) : 0;
    if (qe && EI > 0) { // engastamento perfeito: w = q·x²(L−x)²/(24EI)
      v += (qe * x * x * (L - x) ** 2) / (24 * EI);
      dv += (qe * x * (L - x) * (L - 2 * x)) / (12 * EI);
    }
    return { v, dv };
  };
  const ty = transversal(ey, b.E * b.Iz), tz = transversal(ez, b.E * b.Iy);
  const comp = (k: 0 | 1 | 2): number => ax * ex[k] + ty.v * ey[k] + tz.v * ez[k];
  const rot = (k: 0 | 1 | 2): number => tx * ex[k] + ty.dv * ez[k] - tz.dv * ey[k];
  return { pos: P, u: [comp(0), comp(1), comp(2)], rot: [rot(0), rot(1), rot(2)] };
}

/** Deslocamento resultante |Δ| = √(Δx² + Δy² + Δz²). */
export const deslocResultante = (u: ArrayLike<number>, no: number) => Math.hypot(u[no * 6], u[no * 6 + 1], u[no * 6 + 2]);

/** Maior deslocamento resultante dos nós do pórtico e das grelhas (m). */
export function deslocamentoMaximo(d: DeslocamentosHipotese): number {
  let mx = 0;
  for (let n = 0; n * 6 < d.portico.length; n++) mx = Math.max(mx, deslocResultante(d.portico, n));
  for (const g of d.grelhas.values()) for (let n = 0; n * 6 < g.length; n++) mx = Math.max(mx, Math.abs(g[n * 6 + 2]));
  return mx;
}

/** Fração da altura do edifício que o maior deslocamento ocupa na escala automática (a confirmar: 5 %). */
export const FRACAO_ESCALA_AUTO = 0.05;
/** Pontos por barra na deformada (8 a 16; a confirmar). */
export const PONTOS_POR_BARRA = { min: 8, max: 16 };
/** Período padrão da animação (s) (a confirmar). */
export const PERIODO_ANIMACAO = 2;

/** Escala automática: o maior deslocamento passa a medir `fracao` da altura (1 quando não há deslocamento). */
export function escalaAutomatica(dmax: number, altura: number, fracao = FRACAO_ESCALA_AUTO): number {
  if (!(dmax > 1e-12) || !(altura > 0)) return 1;
  return (fracao * altura) / dmax;
}

/** Fator da animação u(t) = u·sin(2πt/T). */
export const fatorAnimacao = (t: number, periodo = PERIODO_ANIMACAO) => Math.sin((2 * Math.PI * t) / Math.max(1e-6, periodo));

export interface EixoDeformado {
  barra: number; tipo: string; ref: string; pavimento: string;
  /** Pontos originais e deslocamentos (x, y, z por ponto), e |Δ| por ponto (m). */
  pos: number[]; desl: number[]; delta: number[];
}

/**
 * Eixos deformados (estrutura simplificada): uma polilinha por barra do pórtico, com `pontos` (8 a 16) pontos pela
 * linha elástica. Barras de fundação/parede só entram quando têm eixo (duas pontas distintas).
 */
export function eixosDeformados(an: AnaliseEdificio, h: Hipotese, pontos = 12): EixoDeformado[] {
  const pm = an.portico, d = deslocamentosHipotese(an, h), q = cargasDistribuidasHipotese(an, h);
  const n = Math.min(PONTOS_POR_BARRA.max, Math.max(PONTOS_POR_BARRA.min, Math.round(pontos)));
  const out: EixoDeformado[] = [];
  const nb = Math.min(pm.barras.length, pm.modelo.barras.length);
  for (let bi = 0; bi < nb; bi++) {
    const tag = pm.barras[bi], b = pm.modelo.barras[bi];
    if (b.i === b.j) continue;
    const pos: number[] = [], desl: number[] = [], delta: number[] = [];
    for (let k = 0; k < n; k++) {
      const p = pontoDaBarra(pm.modelo, bi, d.portico, k / (n - 1), q.get(bi));
      pos.push(...p.pos); desl.push(...p.u); delta.push(Math.hypot(...p.u));
    }
    out.push({ barra: bi, tipo: tag.tipo, ref: tag.ref, pavimento: tag.pavimento, pos, desl, delta });
  }
  return out;
}
