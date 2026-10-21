// Efeitos locais de 2ª ordem dos pilares (N2c): método geral (NBR 6118, 15.8.3.2) por integração das curvaturas ao longo
// da barra com a relação M–N–1/r da seção (fibras), e fluência (15.8.4). Núcleo puro.
import type { Concrete } from './concrete';
import { ES } from './concrete';
import type { FiberSection } from './fiber';

export interface MetodoGeral {
  /** Maior momento total (1ª + 2ª ordem) ao longo da barra, nas unidades de M1. */
  Mmax: number;
  /** Abscissa do maior momento. */
  xMax: number;
  /** Deslocamentos transversais nas estações. */
  y: number[];
  iteracoes: number;
  convergiu: boolean;
  /** Instabilidade (deslocamentos crescentes) ou momento acima da capacidade da seção. */
  erro?: string;
}

/**
 * Barra birrotulada de comprimento L (o comprimento de flambagem) com momento de 1ª ordem M1(x) e normal N
 * (compressão > 0): iteração y ← ∬ −κ(M1 + N·y), com y(0) = y(L) = 0 e a curvatura dada pela relação M → κ da seção
 * (null = momento acima do resistente). Integração pela regra dos trapézios em n trechos.
 */
export function metodoGeral(L: number, N: number, M1: (x: number) => number, curvatura: (M: number) => number | null, o: { n?: number; maxIter?: number; tol?: number } = {}): MetodoGeral {
  const n = o.n ?? 20, maxIter = o.maxIter ?? 100, tol = o.tol ?? 1e-7, h = L / n;
  const xs = Array.from({ length: n + 1 }, (_, i) => i * h), m1 = xs.map(M1);
  let y = new Array(n + 1).fill(0), it = 0, dAnt = Infinity, cresce = 0;
  const momentos = () => m1.map((m, i) => m + N * y[i]);
  for (it = 1; it <= maxIter; it++) {
    const M = momentos(), k: number[] = [];
    for (const m of M) { const c = curvatura(m); if (c === null) return { Mmax: Infinity, xMax: 0, y, iteracoes: it, convergiu: false, erro: 'Momento total acima do resistente da seção (ruptura antes do equilíbrio).' }; k.push(c); }
    // y'' = −κ: inclinação e deslocamento com θ0 a determinar por y(L) = 0
    const th = [0], yy = [0];
    for (let i = 1; i <= n; i++) { th.push(th[i - 1] - ((k[i - 1] + k[i]) * h) / 2); yy.push(yy[i - 1] + ((th[i - 1] + th[i]) * h) / 2); }
    const t0 = -yy[n] / L, novo = yy.map((v, i) => v + t0 * xs[i]);
    let d = 0, um = 0;
    for (let i = 0; i <= n; i++) { d = Math.max(d, Math.abs(novo[i] - y[i])); um = Math.max(um, Math.abs(novo[i])); }
    y = novo;
    if (!Number.isFinite(um) || um > L) return { Mmax: Infinity, xMax: 0, y, iteracoes: it, convergiu: false, erro: 'Instabilidade: os deslocamentos não convergem (carga acima da crítica do pilar).' };
    if (d > dAnt * 1.0001) cresce++; else cresce = 0;
    dAnt = d;
    if (cresce >= 5) return { Mmax: Infinity, xMax: 0, y, iteracoes: it, convergiu: false, erro: 'Instabilidade: os deslocamentos não convergem (carga acima da crítica do pilar).' };
    if (d <= tol * Math.max(um, 1e-12) || um < 1e-15) break;
  }
  const M = momentos();
  let iMax = 0;
  M.forEach((m, i) => { if (Math.abs(m) > Math.abs(M[iMax])) iMax = i; });
  const ok = it <= maxIter;
  return { Mmax: Math.abs(M[iMax]), xMax: xs[iMax], y, iteracoes: Math.min(it, maxIter), convergiu: ok, ...(ok ? {} : { erro: `Método geral não convergiu em ${maxIter} iterações.` }) };
}

/** Fator sobre a resistência do concreto na relação M–N–1/r de 2ª ordem (NBR 6118, 15.3.1: 1,1·fcd) [a confirmar]. */
export const FATOR_FCD_SEGUNDA_ORDEM = 1.1;

/** Tensão do concreto (MPa, compressão > 0) pelo diagrama parábola-retângulo com pico `pico`. */
function sigma(e: number, c: Concrete, pico: number) {
  if (e <= 0) return 0;
  if (e >= c.ec2) return pico;
  return pico * (1 - (1 - e / c.ec2) ** c.n);
}

/**
 * Relação M → 1/r da seção de fibras para a normal N (MN, compressão > 0), na direção `dir` (0 = flexão com
 * deformação variando ao longo de x da seção, momento "mx"; 1 = ao longo de y). Tabelada uma vez (curvaturas até
 * a ruptura convencional: εc = εcu ou εs = 10 ‰) e interpolada; |M| acima do pico devolve null. M em MN·m, 1/r em 1/m.
 * Concreto com 1,1 × σcd (FATOR_FCD_SEGUNDA_ORDEM), aço bilinear com fyd.
 */
export function relacaoMCurvatura(S: FiberSection, N: number, dir: 0 | 1, pontos = 40): ((M: number) => number | null) | null {
  const pico = FATOR_FCD_SEGUNDA_ORDEM * S.c.sigmaCd;
  const fs = S.mesh.map((f) => ({ s: (dir === 0 ? f.x - S.cx : f.y - S.cy), A: f.A }));
  const bs = S.bars.map((b) => ({ s: (dir === 0 ? b.x - S.cx : b.y - S.cy), A: b.A }));
  const sMax = Math.max(...S.poly.map((p) => (dir === 0 ? p[0] - S.cx : p[1] - S.cy)));
  const sMin = Math.min(...S.poly.map((p) => (dir === 0 ? p[0] - S.cx : p[1] - S.cy)));
  const sBar = bs.length ? Math.min(...bs.map((b) => b.s)) : sMin;
  /** Esforços para ε(s) = e0 + k·s (compressão > 0). */
  const forcas = (e0: number, k: number) => {
    let Nr = 0, M = 0;
    for (const f of fs) { const e = e0 + k * f.s; if (e > 0) { const F = sigma(e, S.c, pico) * f.A; Nr += F; M += F * f.s; } }
    for (const b of bs) { const e = e0 + k * b.s, F = (Math.max(-S.fyd, Math.min(S.fyd, ES * e)) - sigma(e, S.c, pico)) * b.A; Nr += F; M += F * b.s; }
    return { N: Nr, M };
  };
  /** e0 com N(e0, k) = N (bisseção; N cresce com e0). */
  const e0De = (k: number) => {
    let a = -0.05, z = 0.01;
    if (forcas(z, k).N < N || forcas(a, k).N > N) return null;
    for (let i = 0; i < 60; i++) { const m = (a + z) / 2; if (forcas(m, k).N < N) a = m; else z = m; }
    return (a + z) / 2;
  };
  // curvatura de ruptura convencional: maior k com εc(topo) ≤ εcu e εs(barra mais tracionada) ≥ −10 ‰
  const rompe = (k: number) => { const e0 = e0De(k); if (e0 === null) return true; return e0 + k * sMax > S.c.ecu + 1e-12 || e0 + k * sBar < -0.01 - 1e-12; };
  if (rompe(0)) return null;
  let a = 0, z = (S.c.ecu + 0.01) / Math.max(sMax - sMin, 1e-6);
  for (let i = 0; i < 50; i++) { const m = (a + z) / 2; if (rompe(m)) z = m; else a = m; }
  const kMax = a, tab: { k: number; M: number }[] = [{ k: 0, M: 0 }];
  for (let i = 1; i <= pontos; i++) { const k = (kMax * i) / pontos, e0 = e0De(k); if (e0 === null) break; tab.push({ k, M: forcas(e0, k).M }); }
  // trecho crescente (a partir do pico, a seção não equilibra momento maior)
  let fim = tab.length - 1;
  for (let i = 1; i < tab.length; i++) if (tab[i].M < tab[i - 1].M) { fim = i - 1; break; }
  const t = tab.slice(0, fim + 1), Mpico = t[t.length - 1].M;
  return (M: number) => {
    const s = Math.sign(M), m = Math.abs(M);
    if (m > Mpico) return null;
    for (let i = 1; i < t.length; i++) if (m <= t[i].M) { const r = (m - t[i - 1].M) / (t[i].M - t[i - 1].M || 1); return s * (t[i - 1].k + r * (t[i].k - t[i - 1].k)); }
    return s * t[t.length - 1].k;
  };
}

/**
 * Excentricidade de fluência (NBR 6118, 15.8.4): e_cc = (MSg/NSg + ea)·(2,718^(φ·NSg/(Ne − NSg)) − 1), Ne = 10·Eci·Ic/ℓe²
 * (kN, kN·m, m; Eci em kN/m²). Infinity quando NSg ≥ Ne.
 */
export function excentricidadeFluencia(NSg: number, MSg: number, ea: number, phi: number, EciIc: number, le: number): number {
  if (NSg <= 0 || phi <= 0) return 0;
  const Ne = (10 * EciIc) / (le * le);
  if (NSg >= Ne) return Infinity;
  return (Math.abs(MSg) / NSg + ea) * (Math.exp((phi * NSg) / (Ne - NSg)) - 1);
}

/** Excentricidade acidental do pilar (NBR 6118, 11.3.3.4.2): ea = θ1·ℓe/2, θ1 = 1/(100√ℓ) entre 1/300 e 1/200. */
export function excentricidadeAcidental(l: number, le: number): number {
  const t1 = Math.min(1 / 200, Math.max(1 / 300, 1 / (100 * Math.sqrt(Math.max(l, 1e-9)))));
  return (t1 * le) / 2;
}
