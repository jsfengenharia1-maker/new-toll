// Seção de um lado de parede ou pilar-parede por fibras (E1d): flexo-compressão oblíqua da seção retangular L × t com a
// malha vertical e os reforços locais (fiber.ts, o mesmo núcleo dos pilares circulares e poligonais).
//  - lado em casca: verificação global da armadura adotada pelos panos contra as resultantes (N, Mp, Mo) do lado;
//  - lado em barra (trecho curto, tratado como pilar): dimensionamento da malha vertical e dos estribos, com momento
//    mínimo de 1ª ordem e 2ª ordem local pelo pilar-padrão de curvatura aproximada nas duas direções.
// Eixos da seção: x ao longo do comprimento L (flexão no plano), y ao longo da espessura t (flexão fora do plano).
import { barArea, type Concrete } from '../concrete';
import { fiberCapacity, fiberMesh, type FiberSection, type Pt, type RBar } from '../fiber';
import { escolherMalha, listaMalhas, type LimitesMalha, type Malha, type ReforcoLocal } from './paredesArmadura';

/** Resultantes de um lado numa combinação (kN, kN·m; N > 0 tração): normal, momento no plano e fora do plano. */
export interface EsforcoLado { nome: string; N: number; Mp: number; Mo: number }

const poligono = (L: number, t: number): Pt[] => [[0, 0], [L, 0], [L, t], [0, t]];
const MESH = 28;

/**
 * Barras da seção: malha vertical (bitola e espaçamento por face, uniformes entre os eixos das barras de extremidade) e
 * reforços locais distribuídos nas duas faces. `a` = distância da face ao centro das barras (m).
 */
export function barrasDoLado(L: number, t: number, a: number, vert: Malha | null, reforcos: ReforcoLocal[] = []): RBar[] {
  const out: RBar[] = [];
  if (vert && vert.s > 0) {
    const n = Math.max(2, Math.ceil((L - 2 * a) / vert.s - 1e-9) + 1), A = barArea(vert.phi);
    for (let i = 0; i < n; i++) { const x = a + ((L - 2 * a) * i) / (n - 1); out.push({ x, y: a, A }, { x, y: t - a, A }); }
  }
  for (const r of reforcos) {
    if (r.direcao !== 'vertical') continue;
    const A = barArea(r.phi), porFace = Math.max(1, Math.round(r.n / 2));
    const x0 = Math.max(a, r.de), x1 = Math.min(L - a, r.ate);
    for (let i = 0; i < porFace; i++) { const x = porFace === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (porFace - 1); out.push({ x, y: a, A }, { x, y: t - a, A }); }
  }
  return out;
}

export function secaoDoLado(L: number, t: number, bars: RBar[], conc: Concrete, fyd: number): FiberSection {
  const poly = poligono(L, t);
  return { mesh: fiberMesh(poly, MESH), bars, cx: L / 2, cy: t / 2, c: conc, fyd, poly };
}

/** Utilização (solicitação/resistência na direção do momento) numa combinação; 99 se a normal sai da faixa resistente. */
function utilSecao(S: FiberSection, Nd: number, mx: number, my: number, simetricaX: boolean): number {
  const mom = Math.hypot(mx, my) / 1000;
  if (mom < 1e-12) { const R = fiberCapacity(S, Nd / 1000, 1, 0); return R === null ? 99 : 0; }
  let u = 0;
  for (const [a, c] of simetricaX ? [[mx, my]] : [[mx, my], [mx, -my]]) { const R = fiberCapacity(S, Nd / 1000, a, c); u = Math.max(u, R === null ? 99 : mom / R); }
  return u;
}

/** Combinações determinantes: maior compressão, menor compressão (ou maior tração), maiores momentos e a maior soma normalizada. */
export function determinantes(es: EsforcoLado[]): EsforcoLado[] {
  if (es.length <= 5) return es;
  const mp = Math.max(...es.map((e) => Math.abs(e.Mp)), 1e-9), mo = Math.max(...es.map((e) => Math.abs(e.Mo)), 1e-9);
  const pick = (f: (e: EsforcoLado) => number) => es.reduce((m, e) => (f(e) > f(m) ? e : m), es[0]);
  const set = new Set([pick((e) => -e.N), pick((e) => e.N), pick((e) => Math.abs(e.Mp)), pick((e) => Math.abs(e.Mo)), pick((e) => Math.abs(e.Mp) / mp + Math.abs(e.Mo) / mo - e.N / 1e6)]);
  return [...set];
}

export interface VerificacaoLado { util: number; combo: string; N: number; Mp: number; Mo: number; NRc: number }

/** Verificação à flexo-compressão oblíqua do lado com a armadura dada nas combinações determinantes. */
export function verificarLado(S: FiberSection, es: EsforcoLado[]): VerificacaoLado {
  let pior: VerificacaoLado = { util: 0, combo: '', N: 0, Mp: 0, Mo: 0, NRc: 0 };
  for (const e of determinantes(es)) {
    const u = utilSecao(S, -e.N, -e.Mp, Math.abs(e.Mo), false);
    if (u >= pior.util) pior = { util: u, combo: e.nome, N: e.N, Mp: e.Mp, Mo: e.Mo, NRc: 0 };
  }
  return pior;
}

// ---------------------------------------------------------------- lado em barra (trecho curto): dimensionamento

export interface EntradaLadoBarra {
  L: number; t: number; a: number; le: number; conc: Concrete; fyd: number;
  limites: LimitesMalha; taxaMin: number; taxaMax: number;
  esforcos: EsforcoLado[];
}

export interface ResultadoLadoBarra {
  ok: boolean; util: number; combo: string;
  vert: Malha | null; n: number; As: number; AsMin: number; AsMax: number;
  estribo: { phi: number; s: number };
  lambdaP: number; lambdaO: number;
  mensagens: string[];
}

/** Momento de 2ª ordem do pilar-padrão de curvatura aproximada (kN·m) para a normal de compressão Nd (kN) e a dimensão h na direção da flexão. */
export function m2dPadrao(Nd: number, h: number, le: number, c: Concrete, A: number): number {
  const lambda = (le * Math.sqrt(12)) / h;
  if (lambda <= 35) return 0;
  const nu = Nd / 1000 / (A * c.fcd);
  return ((Nd * le * le) / 10) * Math.min(0.005 / (h * (nu + 0.5)), 0.005 / h);
}

/**
 * Dimensiona o lado curto como pilar: momentos de projeto M = máx(|M|, M1d,mín) + M2d em cada direção (M1d,mín =
 * Nd·(0,015 + 0,03h), M2d para λ > 35, αb = 1), flexão oblíqua por fibras e a menor malha vertical (bitola e espaçamento
 * por face) que atende, com As entre o mínimo (taxa mínima e 0,15·Nd/fyd) e o máximo da seção.
 */
export function dimensionarLadoBarra(e: EntradaLadoBarra): ResultadoLadoBarra {
  const { L, t, a, le, conc, fyd } = e, Ac = L * t, msgs: string[] = [];
  const NdMax = Math.max(0, ...e.esforcos.map((x) => -x.N));
  const AsMin = Math.max((e.taxaMin / 100) * Ac, (0.15 * NdMax) / 1000 / fyd), AsMax = (e.taxaMax / 100) * Ac;
  const lambdaP = (le * Math.sqrt(12)) / L, lambdaO = (le * Math.sqrt(12)) / t;
  const base = { estribo: estriboDoLadoBarra(10, t), lambdaP, lambdaO };
  // momentos de projeto
  const es: EsforcoLado[] = e.esforcos.map((x) => {
    const Nd = Math.max(0, -x.N);
    if (Nd <= 0) return x;
    const p = Math.max(Math.abs(x.Mp), Nd * (0.015 + 0.03 * L)) + m2dPadrao(Nd, L, le, conc, Ac);
    const o = Math.max(Math.abs(x.Mo), Nd * (0.015 + 0.03 * t)) + m2dPadrao(Nd, t, le, conc, Ac);
    return { nome: x.nome, N: x.N, Mp: -p, Mo: o };
  });
  if (Math.max(lambdaP, lambdaO) > 90) msgs.push(`Esbeltez λ = ${Math.max(lambdaP, lambdaO).toFixed(0)} > 90: o pilar-padrão não vale; revisar pelo método geral.`);
  let melhor: { m: Malha; util: number; combo: string; n: number; As: number } | null = null;
  for (const m of listaMalhas(e.limites)) {
    const bars = barrasDoLado(L, t, a, m);
    const As = bars.reduce((s, b) => s + b.A, 0);
    if (As < AsMin - 1e-12) continue;
    if (As > AsMax + 1e-12) break;
    const S = secaoDoLado(L, t, bars, conc, fyd), v = verificarLado(S, es);
    if (!melhor || v.util < melhor.util) melhor = { m, util: v.util, combo: v.combo, n: bars.length, As };
    if (v.util <= 1) { melhor = { m, util: v.util, combo: v.combo, n: bars.length, As }; break; }
  }
  if (!melhor) {
    msgs.push('Nenhuma malha vertical cabe entre a taxa mínima e a máxima: aumente o lado ou a espessura.');
    return { ok: false, util: 99, combo: '', vert: null, n: 0, As: 0, AsMin, AsMax, ...base, mensagens: msgs };
  }
  const ok = melhor.util <= 1 + 1e-9;
  if (!ok) msgs.push(`Lado curto não atende com até ${e.taxaMax.toFixed(1).replace('.', ',')} % de armadura (utilização ${melhor.util.toFixed(2).replace('.', ',')} em ${melhor.combo}): aumente a seção.`);
  return { ok, util: melhor.util, combo: melhor.combo, vert: melhor.m, n: melhor.n, As: melhor.As, AsMin, AsMax, ...base, estribo: estriboDoLadoBarra(melhor.m.phi, t), mensagens: msgs };
}

/** Estribo do lado curto: φ ≥ máx(5; φl/4), espaçamento ≤ mín(20 cm; t; 12φl) (NBR 6118, 18.4.3). */
export function estriboDoLadoBarra(phiL: number, t: number): { phi: number; s: number } {
  const phi = [5, 6.3, 8, 10].find((p) => p >= Math.max(5, phiL / 4)) ?? 10;
  return { phi, s: Math.floor(Math.min(0.2, t, (12 * phiL) / 1000) * 100) / 100 };
}

export { escolherMalha };
