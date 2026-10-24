// Estado da seção de concreto armado (V5, K1.11.30): plano de deformações do estado último (ELU), posição da linha
// neutra, domínio, tensões do concreto (parábola-retângulo e retangular) e do aço por barra, na reta normal à linha
// neutra. Usa as fibras de `fiber.ts` (a mesma conta do cálculo: nada é recalculado por outro caminho).
// Seção: x = largura, y = altura (m); tensões em MPa, forças em MN e MN·m (compressão +).
import { ES, barArea, type Concrete } from '../concrete';
import { circlePolygon, fiberEstado, fiberMesh, fiberSigmaC, fiberSolve, polyProps, type FiberSection, type Pt, type RBar } from '../fiber';

export type Dominio = '1' | '2' | '3' | '4' | '4a' | '5';

export interface BarraEstado {
  x: number; y: number; A: number;
  /** Deformação (compressão +) e tensão do aço (MPa, compressão +, limitada a ±fyd). */
  eps: number; sigma: number;
  /** Força líquida (MN): aço menos o concreto deslocado. */
  F: number;
  /** Aço em escoamento (|σ| = fyd). */
  escoa: boolean;
  /** Distância da barra à fibra mais comprimida, medida na normal à linha neutra (m). */
  prof: number;
}

export interface PontoTensao { /** profundidade a partir da fibra mais comprimida (m) */ prof: number; eps: number; sigma: number }

export interface EstadoDaSecao {
  resolvido: boolean;
  /** Motivo quando não resolve (normal fora da faixa resistente). */
  erro?: string;
  /** Normal (kN, compressão +) e momentos solicitantes (kN·m, componentes do "lado comprimido": mx comprime x+, my comprime y+). */
  Nd: number; mx: number; my: number;
  /** Momento resistente (kN·m) na direção do momento solicitante e a relação solicitante/resistente. */
  MRd: number; util: number;
  /** Direção da compressão máxima (ângulo θ da normal à linha neutra) e parâmetro t do estado. */
  theta: number; t: number; normal: [number, number];
  dominio: Dominio;
  /** Extensão da seção na normal (m) e altura útil medida pela barra mais afastada (m). */
  h: number; d: number;
  /** Deformação na fibra mais comprimida e na mais tracionada/menos comprimida (compressão +, adimensional). */
  epsTopo: number; epsBase: number;
  /** Profundidade da linha neutra a partir da fibra mais comprimida (m); null se a deformação é uniforme. Fora de [0, h] = a linha neutra está fora da seção. */
  x: number | null; xd: number | null; linhaNeutraNaSecao: boolean;
  /** Posição da linha neutra na normal (m, a partir do centroide da seção; positivo para o lado comprimido); null se não há. */
  s0: number | null;
  /** Concreto: tensões ao longo da profundidade (parábola-retângulo), resultante (MN) e o diagrama retangular equivalente. */
  concreto: { perfil: PontoTensao[]; Rc: number; retangular: { profundidade: number; sigma: number; Rc: number } };
  barras: BarraEstado[];
  /** Esforços integrados no estado (MN, MN·m) e diferença para o alvo (confere ∫σ = N). */
  integrados: { N: number; Mx: number; My: number };
  erroEquilibrio: { N: number; M: number };
}

/** Curva σ(ε) do concreto, parábola-retângulo (n pontos de 0 a εcu). */
export function curvaConcreto(c: Concrete, n = 24): [number, number][] {
  return Array.from({ length: n + 1 }, (_, k) => { const e = (c.ecu * k) / n; return [e, fiberSigmaC(e, c)] as [number, number]; });
}

/** Seção poligonal qualquer (m) com barras dadas; o centro de referência é o centroide da poligonal (V7c, K1.11.30). */
export function secaoArmada(poly: Pt[], barras: RBar[], c: Concrete, fyd: number, malha = 28): FiberSection {
  const P = polyProps(poly);
  return { mesh: fiberMesh(poly, malha), bars: barras, cx: P.cx, cy: P.cy, c, fyd, poly };
}

/** Seção retangular b × h (m) com barras dadas, malha de fibras 28 × 28. */
export function secaoRetangularArmada(b: number, h: number, barras: RBar[], c: Concrete, fyd: number, malha = 28): FiberSection {
  const poly: Pt[] = [[0, 0], [b, 0], [b, h], [0, h]];
  return { mesh: fiberMesh(poly, malha), bars: barras, cx: b / 2, cy: h / 2, c, fyd, poly };
}

/** Seção circular de diâmetro D (m, centro em D/2, D/2) com barras dadas: polígono de 48 lados e malha de fibras 40 × 40. */
export function secaoCircularArmada(D: number, barras: RBar[], c: Concrete, fyd: number, malha = 40): FiberSection {
  const poly = circlePolygon(D);
  return { mesh: fiberMesh(poly, malha), bars: barras, cx: D / 2, cy: D / 2, c, fyd, poly };
}

/** n barras igualmente espaçadas no círculo de diâmetro D, com o centro das barras a `a` da borda (mesmo arranjo do dimensionamento do pilar circular). */
export function barrasDoCirculo(D: number, a: number, n: number, phi: number): RBar[] {
  const rs = D / 2 - a, A = barArea(phi);
  return Array.from({ length: n }, (_, k) => ({ x: D / 2 + rs * Math.cos((2 * Math.PI * k) / n), y: D / 2 + rs * Math.sin((2 * Math.PI * k) / n), A }));
}

/** Arranjo do pilar retangular (nb barras na face inferior, nbS na superior, nh à esquerda e nhD à direita, cantos compartilhados). a = centro da barra à face (m); phi em mm. */
export function barrasDoArranjo(w: number, h: number, a: number, arr: { phi: number; nb?: number; nh?: number; nbS?: number; nhD?: number }): RBar[] {
  const nb = arr.nb ?? 2, nh = arr.nh ?? 2, nbS = arr.nbS ?? nb, nhD = arr.nhD ?? nh, A = barArea(arr.phi), out: RBar[] = [];
  const linha = (n: number, y: number) => { for (let k = 0; k < n; k++) out.push({ x: n === 1 ? w / 2 : a + ((w - 2 * a) * k) / (n - 1), y, A }); };
  linha(nb, a); linha(nbS, h - a);
  const lado = (n: number, x: number) => { for (let k = 1; k < n - 1; k++) out.push({ x, y: a + ((h - 2 * a) * k) / (n - 1), A }); };
  lado(nh, a); lado(nhD, w - a);
  return out;
}

/** Barras da viga: inferior (n barras de phi mm, centro a `a` da face inferior) e superior opcional (`a` da face superior). */
export function barrasDaViga(b: number, h: number, inf: { n: number; phi: number; a: number }, sup?: { n: number; phi: number; a: number }): RBar[] {
  const out: RBar[] = [];
  const linha = (n: number, phi: number, y: number, a: number) => { for (let k = 0; k < n; k++) out.push({ x: n === 1 ? b / 2 : a + ((b - 2 * a) * k) / (n - 1), y, A: barArea(phi) }); };
  // afastamento lateral = o mesmo da face (estribo e cobrimento já embutidos em `a`)
  linha(inf.n, inf.phi, inf.a, inf.a);
  if (sup) linha(sup.n, sup.phi, h - sup.a, sup.a);
  return out;
}

/**
 * Estado último da seção para Nd (kN, compressão +) e momentos (kN·m; mx > 0 comprime x+, my > 0 comprime y+). Na
 * viga com M > 0 (traciona embaixo) a face de cima é comprimida: `my = M`. O estado é o do ELU para a normal Nd na
 * direção do momento (o momento resistente `MRd` é o da seção; `util` = solicitante / resistente).
 */
export function estadoDaSecao(S: FiberSection, NdkN: number, mx: number, my: number, nPerfil = 20): EstadoDaSecao {
  const base = { Nd: NdkN, mx, my };
  const falha = (erro: string): EstadoDaSecao => ({ resolvido: false, erro, ...base, MRd: 0, util: 99, theta: 0, t: 0, normal: [1, 0], dominio: '5', h: 0, d: 0, epsTopo: 0, epsBase: 0, x: null, xd: null, linhaNeutraNaSecao: false, s0: null, concreto: { perfil: [], Rc: 0, retangular: { profundidade: 0, sigma: 0, Rc: 0 } }, barras: [], integrados: { N: 0, Mx: 0, My: 0 }, erroEquilibrio: { N: 0, M: 0 } });
  const Nd = NdkN / 1000;
  // sem momento solicitante, o estado é o da flexão mínima no sentido y
  const semMomento = Math.abs(mx) + Math.abs(my) < 1e-12;
  const r = fiberSolve(S, Nd, semMomento ? 0 : mx, semMomento ? 1 : my);
  if (!r) return falha('Normal fora da faixa resistente da seção.');
  const e = fiberEstado(S, r.theta, r.t);
  const c = S.c;
  const MRd = Math.hypot(r.Mx, r.My) * 1000, Msd = Math.hypot(mx, my);
  // deformações e domínio
  const epsEm = (s: number) => e.e0 + e.e1 * s;
  const bars = S.bars.map((b) => ({ b, s: (b.x - S.cx) * e.ux + (b.y - S.cy) * e.uy }));
  const sBar = bars.length ? Math.min(...bars.map((q) => q.s)) : e.sMin;
  const epsAco = -epsEm(sBar); // tração +
  const eyd = S.fyd / ES;
  let dominio: Dominio;
  if (r.t <= 1) dominio = e.top < 0 ? '1' : '2';
  else if (r.t <= 2) dominio = epsAco >= eyd - 1e-9 ? '3' : epsAco >= 0 ? '4' : '4a';
  else dominio = '5';
  // linha neutra
  const s0 = Math.abs(e.e1) < 1e-15 ? null : -e.e0 / e.e1;
  const x = s0 === null ? null : e.sMax - s0;
  // perfil de tensões do concreto ao longo da profundidade
  const perfil: PontoTensao[] = Array.from({ length: nPerfil + 1 }, (_, k) => {
    const prof = (e.h * k) / nPerfil, eps = epsEm(e.sMax - prof);
    return { prof, eps, sigma: eps > 0 ? fiberSigmaC(eps, c) : 0 };
  });
  // resultante do concreto e diagrama retangular equivalente (fibras com profundidade ≤ λ·x)
  let Rc = 0, Rret = 0;
  const xRet = x === null ? 0 : Math.max(0, Math.min(e.h, c.lambda * x));
  for (const f of S.mesh) {
    const s = (f.x - S.cx) * e.ux + (f.y - S.cy) * e.uy, eps = epsEm(s), prof = e.sMax - s;
    if (eps > 0) Rc += fiberSigmaC(eps, c) * f.A;
    if (x !== null && x > 0 && prof <= xRet + 1e-12) Rret += c.sigmaCd * f.A;
  }
  const barras: BarraEstado[] = bars.map(({ b, s }) => {
    const eps = epsEm(s), sc = eps > 0 ? fiberSigmaC(eps, c) : 0, sigma = Math.max(-S.fyd, Math.min(S.fyd, ES * eps));
    return { x: b.x, y: b.y, A: b.A, eps, sigma, F: (sigma - sc) * b.A, escoa: Math.abs(ES * eps) >= S.fyd - 1e-9, prof: e.sMax - s };
  });
  return {
    resolvido: true, ...base, MRd, util: MRd > 0 ? Msd / MRd : 99, theta: r.theta, t: r.t, normal: [e.ux, e.uy], dominio, h: e.h, d: e.sMax - sBar,
    epsTopo: e.top, epsBase: e.bot, x, xd: x === null ? null : x / Math.max(e.sMax - sBar, 1e-9), linhaNeutraNaSecao: x !== null && x >= 0 && x <= e.h, s0,
    concreto: { perfil, Rc, retangular: { profundidade: xRet, sigma: c.sigmaCd, Rc: Rret } },
    barras, integrados: { N: e.N, Mx: e.Mx, My: e.My }, erroEquilibrio: { N: e.N - Nd, M: Math.hypot(e.Mx, e.My) - Math.hypot(r.Mx, r.My) },
  };
}
