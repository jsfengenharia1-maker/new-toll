// Dimensionamento das vigas inclinadas de concreto (E2c; K1.12.2-1 a K1.12.2-6, K1.4.88, K1.11.48, C6.68 a C6.74): flexo-compressão
// (ou flexo-tração) oblíqua pelas combinações ELU ao longo da barra, com a seção retangular por fibras (fiber.ts), nos dois
// planos paralelos às faces (vertical e horizontal); armadura superior e inferior = máximo das seções; efeitos locais de
// 2ª ordem pelo pilar-padrão com curvatura aproximada (NBR 6118, 15.8.3.3) com ℓe = k·ℓ por plano; estribos pelo cortante
// nos dois planos e pela torção. O detalhe dos nós das pontas fica a cargo do projetista (aviso). Reaproveitável pelas diagonais (E2d).
import { barArea, beamAsMin, beamShear, chooseStirrup, torsionRect } from '../concrete';
import { fiberAxialRange, fiberCapacity, fiberMesh, type FiberSection, type Pt, type RBar } from '../fiber';
import type { AnaliseEdificio, InclinadaNoPortico } from './analitico';
import type { CombinacaoEd } from './combinacoes';
import type { Estacao } from './dimensionamento';
import { ganchoNoventa, estriboComprimento, lbBasico } from './detalhamento';
import { acoDe, cobrimentoViga, concretoDe, gamas } from './materiais';
import { barrasDaInclinada } from './inclinadas';
import type { ArmaduraInclinada, BuildingModel, VigaInclinada } from './types';

/** Bitolas longitudinais do dimensionamento automático (mm). */
const PHI_PRINCIPAL = [10, 12.5, 16, 20, 25, 32];
const PHI_PELE = [8, 10, 12.5, 16];
const PHI_ESTRIBO_GEOMETRIA = 0.0063;
const DMAX = 0.019;
/** Estações por barra (extremos incluídos) e fração da barra em que a 2ª ordem local atinge o máximo (meia onda de seno). */
const N_ESTACOES = 21;

export interface EstacaoEnvoltoria {
  /** Abscissa na parte flexível (m). */
  x: number;
  /** Extremos sobre as combinações ELU: N (kN, tração +), Mz (vertical) e My (transversal) em kN·m, cortantes e torção. */
  Nmax: number; Nmin: number; Mzmax: number; Mzmin: number; Mymax: number; Mymin: number; Vy: number; Vz: number; T: number;
  /** Maior utilização da armadura adotada nesta seção. */
  util: number;
}

export interface ResultadoInclinada {
  /** Id da viga inclinada lançada e da barra (uma por pavimento nas múltiplas). */
  inclinada: string; barra: string; nome: string; pavimento: string; pavimentoFim: string;
  secao: string; b: number; h: number; L: number; Lf: number; angulo: number; ligacao: string;
  /** Comprimentos de flambagem (m) e esbeltezes nos planos vertical e transversal. */
  le: [number, number]; lambda: [number, number];
  /** Maiores solicitações de cálculo: normal de compressão e de tração (kN), Mz e My (kN·m), cortantes Vy e Vz (kN) e torção (kN·m). */
  Nd: { compressao: number; tracao: number }; Mz: number; My: number; Vd: [number, number]; Td: number;
  arranjo: ArmaduraInclinada; As: { sup: number; inf: number; lat: number; total: number }; taxa: number;
  armadura: string; estribo: string;
  util: number; utilCortante: number;
  /** Combinações e seções mais desfavoráveis (até 5). */
  determinantes: { combinacao: string; x: number; N: number; Mz: number; My: number; util: number }[];
  envoltoria: EstacaoEnvoltoria[];
  bloqueada?: boolean;
  status: 'ok' | 'fail' | 'review';
  mensagens: string[];
}

interface Ponto { combinacao: string; x: number; N: number; Mz: number; My: number; /** compressão + (MN) e momentos de cálculo (MN·m): mx = |My|, my = Mz */ Nc: number; mx: number; my: number }

const nf = (v: number, c = 1) => String(+v.toFixed(c)).replace('.', ',');

/** Posição das barras da seção b × h (origem no canto inferior esquerdo; x ao longo de b, y para cima). */
function barrasDaSecao(b: number, h: number, cob: { inf: number; sup: number; lat: number }, a: ArmaduraInclinada): { bars: RBar[]; cabe: boolean } {
  const fsup = a.sup.phi / 1000, finf = a.inf.phi / 1000, flat = (a.laterais?.phi ?? a.sup.phi) / 1000, phiT = PHI_ESTRIBO_GEOMETRIA;
  const bars: RBar[] = [];
  let cabe = true;
  const fila = (n: number, phi: number, y: number, A: number) => {
    const aL = cob.lat + phiT + phi / 2, vao = b - 2 * aL;
    if (vao < 0 || (n > 1 && vao / (n - 1) - phi < Math.max(0.02, phi, 1.2 * DMAX) - 1e-9)) cabe = false;
    for (let i = 0; i < n; i++) bars.push({ x: n > 1 ? aL + (vao * i) / (n - 1) : b / 2, y, A });
  };
  const yInf = cob.inf + phiT + finf / 2, ySup = h - cob.sup - phiT - fsup / 2;
  fila(a.inf.n, finf, yInf, barArea(a.inf.phi)); fila(a.sup.n, fsup, ySup, barArea(a.sup.phi));
  const nl = a.laterais?.n ?? 0;
  if (nl > 0) {
    const aL = cob.lat + phiT + flat / 2, passo = (ySup - yInf) / (nl + 1);
    if (passo - flat < Math.max(0.02, flat, 1.2 * DMAX) - 1e-9) cabe = false;
    for (let k = 1; k <= nl; k++) for (const x of [aL, b - aL]) bars.push({ x, y: yInf + passo * k, A: barArea(a.laterais!.phi) });
  }
  return { bars, cabe };
}

const areaCm2 = (a: ArmaduraInclinada) => {
  const sup = a.sup.n * barArea(a.sup.phi) * 1e4, inf = a.inf.n * barArea(a.inf.phi) * 1e4, lat = a.laterais ? 2 * a.laterais.n * barArea(a.laterais.phi) * 1e4 : 0;
  return { sup, inf, lat, total: sup + inf + lat };
};

const textoArmadura = (a: ArmaduraInclinada) => `${a.sup.n}φ${nf(a.sup.phi, a.sup.phi % 1 ? 1 : 0)} sup + ${a.inf.n}φ${nf(a.inf.phi, a.inf.phi % 1 ? 1 : 0)} inf${a.laterais ? ` + 2×${a.laterais.n}φ${nf(a.laterais.phi, a.laterais.phi % 1 ? 1 : 0)} lat` : ''}`;

/** Pele (NBR 6118, 17.3.5.2.3) quando h > 60 cm: ≥ 0,10 % da área por face, espaçamento ≤ mín(d/3; 20 cm). */
function peleDe(b: number, h: number, cob: { inf: number; sup: number }): { n: number; phi: number } | undefined {
  if (h <= 0.6) return undefined;
  const d = h - cob.inf - 0.0063 - 0.008, n = Math.max(1, Math.ceil((h - cob.inf - cob.sup - 0.03) / Math.min(d / 3, 0.2)) - 1);
  const phi = PHI_PELE.find((p) => n * barArea(p) >= 0.001 * b * h) ?? PHI_PELE.at(-1)!;
  return { n, phi };
}

export interface OpcoesDimInclinada {
  /** Estações do cálculo por barra de inclinada (padrão 21). */
  estacoes?: number;
}

/**
 * Dimensiona (ou, com armadura bloqueada, verifica) as vigas inclinadas da análise. `estacoes(bi, xs)` devolve os esforços por
 * caso nas abscissas `xs` da barra `bi` do pórtico (porCaso do dimensionamento).
 */
export function dimensionarInclinadas(b: BuildingModel, an: AnaliseEdificio, elu: CombinacaoEd[], estacoes: (bi: number, xs: number[]) => Record<string, Estacao[]>): ResultadoInclinada[] {
  if (!an.inclinadas?.length || !an.portico.res) return [];
  const c = concretoDe(b, 'viga'), aLong = acoDe(b, 'vigaPos'), aEst = acoDe(b, 'vigaEstribo'), gs = gamas(b).s, op = an.opcoes;
  const fywd = Math.min(aEst.fyk / gs, 435), fyd = aLong.fyd;
  const out: ResultadoInclinada[] = [];
  const barras = new Map(b.vigasInclinadas?.flatMap((v) => barrasDaInclinada(b, v).map((x) => [x.id, x] as const)) ?? []);
  for (const inc of an.inclinadas) {
    const vi = b.vigasInclinadas?.find((x) => x.id === inc.ref);
    if (!vi) continue;
    out.push(dimensionarUma(b, inc, vi, barras.get(inc.id)?.rotulo ?? inc.nome, elu, estacoes, { c, aEst, aLong, gs, fywd, fyd, op }));
  }
  return out;
}

interface Ctx { c: ReturnType<typeof concretoDe>; aEst: ReturnType<typeof acoDe>; aLong: ReturnType<typeof acoDe>; gs: number; fywd: number; fyd: number; op: AnaliseEdificio['opcoes'] }

function dimensionarUma(b: BuildingModel, inc: InclinadaNoPortico, vi: VigaInclinada, rotulo: string, elu: CombinacaoEd[], estacoes: (bi: number, xs: number[]) => Record<string, Estacao[]>, k: Ctx): ResultadoInclinada {
  const { c, aEst, gs, fywd, fyd, op } = k;
  const { b: bw, h } = vi.secao, Ac = bw * h, cob = cobrimentoViga(b, vi.cobrimento), mensagens: string[] = [];
  // ---- esforços por combinação nas estações ----
  const n = N_ESTACOES, xs = Array.from({ length: n }, (_, i) => (inc.Lf * i) / (n - 1));
  const pc = estacoes(inc.bi, xs);
  const comb = (cb: CombinacaoEd, i: number, kk: keyof Estacao) => { let s = 0; for (const nome in cb.fatores) { const e = pc[nome]; if (e) s += cb.fatores[nome] * e[i][kk]; } return s; };
  type Linha = { cb: string; N: number[]; Mz: number[]; My: number[]; Vy: number[]; Vz: number[]; T: number[] };
  const linhas: Linha[] = elu.map((cb) => {
    const col = (kk: keyof Estacao) => xs.map((_, i) => comb(cb, i, kk));
    return { cb: cb.nome, N: col('N'), Mz: col('Mz'), My: col('My'), Vy: col('Vy'), Vz: col('Vz'), T: col('T') };
  });
  // ---- flambagem por plano (ℓe = k·ℓ entre os nós) e esbeltez ----
  const kV = vi.flambagem?.vertical ?? op.inclinadaFlambagemVertical, kT = vi.flambagem?.transversal ?? op.inclinadaFlambagemTransversal;
  const le: [number, number] = [kV * inc.L, kT * inc.L], lambda: [number, number] = [le[0] / (h / Math.sqrt(12)), le[1] / (bw / Math.sqrt(12))];
  // ---- pontos de cálculo: compressão com mínimo e 2ª ordem; tração e flexão simples sem acréscimos ----
  const pontos: Ponto[] = [];
  const fcdMN = c.fcd; // MPa = MN/m²
  const lamMax = Math.max(lambda[0], lambda[1]);
  for (const l of linhas) {
    const M1A: [number, number] = [Math.max(...l.Mz.map(Math.abs)), Math.max(...l.My.map(Math.abs))];
    xs.forEach((x, i) => {
      const N = l.N[i], Nd = -N; // Nd: compressão +
      if (Nd <= 0) { pontos.push({ combinacao: l.cb, x, N, Mz: l.Mz[i], My: l.My[i], Nc: Nd / 1000, mx: Math.abs(l.My[i]) / 1000, my: l.Mz[i] / 1000 }); return; }
      const forma = Math.sin((Math.PI * x) / inc.Lf);
      const plano = (M1: number, M1A_: number, dim: number, lam: number, leP: number) => {
        const M1min = Nd * (0.015 + 0.03 * dim), lam1 = Math.max(35, Math.min(90, 25 + (12.5 * M1A_) / (Nd * dim)));
        const nu = Nd / 1000 / (Ac * fcdMN);
        const M2 = lam > lam1 ? ((Nd * leP * leP) / 10) * Math.min(0.005 / (dim * (nu + 0.5)), 0.005 / dim) * forma : 0;
        return { M1min, M2, tot: Math.max(Math.abs(M1), M1min) + M2, abaixo: Math.abs(M1) < M1min };
      };
      const v = plano(l.Mz[i], M1A[0], h, lambda[0], le[0]), t = plano(l.My[i], M1A[1], bw, lambda[1], le[1]);
      const sinais = v.abaixo ? [1, -1] : [l.Mz[i] >= 0 ? 1 : -1];
      for (const s of sinais) pontos.push({ combinacao: l.cb, x, N, Mz: s * v.tot, My: t.tot, Nc: Nd / 1000, mx: t.tot / 1000, my: (s * v.tot) / 1000 });
    });
  }
  const comp = linhas.flatMap((l) => l.N).map((v) => -v), NdMax = Math.max(0, ...comp), NtMax = Math.max(0, ...comp.map((v) => -v));
  // ---- cortante e torção (máximos sobre todas as combinações e estações) ----
  const maxAbs = (f: (l: Linha) => number[]) => Math.max(0, ...linhas.flatMap((l) => f(l).map(Math.abs)));
  const Vy = maxAbs((l) => l.Vy), Vz = maxAbs((l) => l.Vz), Td = maxAbs((l) => l.T), Mz = maxAbs((l) => l.Mz), My = maxAbs((l) => l.My);
  // ---- armadura ----
  const mesh = fiberMesh([[0, 0], [bw, 0], [bw, h], [0, h]], 20);
  const poly: Pt[] = [[0, 0], [bw, 0], [bw, h], [0, h]];
  const secaoDe = (bars: RBar[]): FiberSection => ({ mesh, bars, cx: bw / 2, cy: h / 2, c, fyd, poly });
  const utilPonto = (S: FiberSection, p: Ponto, faixa: { NRc: number; NRt: number }) => {
    if (p.Nc > faixa.NRc + 1e-12 || p.Nc < faixa.NRt - 1e-12) return 99;
    const m = Math.hypot(p.mx, p.my);
    if (m < 1e-9) return p.Nc >= 0 ? p.Nc / faixa.NRc : p.Nc / faixa.NRt;
    const R = fiberCapacity(S, p.Nc, p.mx, p.my);
    return R === null ? 99 : m / R;
  };
  const utilDe = (S: FiberSection, ps: Ponto[], parar = false) => {
    const faixa = fiberAxialRange(S);
    let u = 0;
    for (const p of ps) { u = Math.max(u, utilPonto(S, p, faixa)); if (parar && u > 1) return u; }
    return u;
  };
  const dEf = h - cob.inf - 0.0063 - 0.008;
  const AsMin = op.vigaTaxaMin > 0 ? (op.vigaTaxaMin / 100) * Ac : beamAsMin({ kind: 'rect', bw, h }, false, dEf, c, fyd);
  const AsMinTot = Math.max(AsMin, NdMax > 0 ? Math.max((0.15 * NdMax) / 1000 / fyd, 0.004 * Ac) : 0) * 1e4; // cm²
  const AsMax = 0.04 * Ac * 1e4;
  const pele = peleDe(bw, h, cob);
  const lat = (a: Omit<ArmaduraInclinada, 'estribo'>): ArmaduraInclinada => ({ ...a, ...(pele ? { laterais: pele } : {}), estribo: { phi: 6.3, s: 0.2 } });
  let arranjo: ArmaduraInclinada | null = null, util = 0, bloqueada = false;
  let determinantes: ResultadoInclinada['determinantes'] = [];
  let utilPorPonto: number[] = [];
  const completo = (a: ArmaduraInclinada) => {
    const { bars } = barrasDaSecao(bw, h, cob, a), S = secaoDe(bars), faixa = fiberAxialRange(S);
    utilPorPonto = pontos.map((p) => utilPonto(S, p, faixa));
    return Math.max(0, ...utilPorPonto);
  };
  if (vi.armadura) {
    arranjo = { ...vi.armadura, ...(vi.armadura.laterais ? { laterais: { ...vi.armadura.laterais } } : {}), estribo: { ...vi.armadura.estribo } };
    bloqueada = true;
    util = completo(arranjo);
    if (!barrasDaSecao(bw, h, cob, arranjo).cabe) mensagens.push('Viga inclinada: as barras da armadura informada não cabem numa camada com o espaçamento mínimo da NBR 6118 (18.3.2.2); aumente a seção ou use bitolas menores.');
  } else if (lamMax <= 200 && pontos.length) {
    // candidatos simétricos (mesmo número de barras em cima e embaixo), por área crescente; busca binária pela utilização
    const cands: ArmaduraInclinada[] = [];
    for (const phi of PHI_PRINCIPAL) for (let nb = 2; nb <= 12; nb++) {
      const a = lat({ sup: { n: nb, phi }, inf: { n: nb, phi } });
      if (!barrasDaSecao(bw, h, cob, a).cabe) break;
      const As = areaCm2(a).total;
      if (As >= AsMinTot - 1e-9 && As <= AsMax + 1e-9) cands.push(a);
    }
    cands.sort((p, q) => areaCm2(p).total - areaCm2(q).total);
    // pontos de busca: os mais desfavoráveis por vários critérios; a verificação final usa todos
    const escolha = (ps: Ponto[]) => {
      const crit: ((p: Ponto) => number)[] = [(p) => Math.hypot(p.mx / bw, p.my / h), (p) => p.Nc, (p) => -p.Nc, (p) => Math.abs(p.my), (p) => Math.abs(p.mx)];
      const set = new Set<Ponto>();
      for (const f of crit) [...ps].sort((p, q) => f(q) - f(p)).slice(0, 6).forEach((p) => set.add(p));
      return [...set];
    };
    let busca = escolha(pontos);
    const passa = (a: ArmaduraInclinada, ps: Ponto[]) => { const S = secaoDe(barrasDaSecao(bw, h, cob, a).bars); return utilDe(S, ps, true) <= 1; };
    for (let rodada = 0; rodada < 5; rodada++) {
      if (!cands.length) break;
      let lo = 0, hi = cands.length - 1;
      if (!passa(cands[hi], busca)) { lo = hi; }
      else { while (lo < hi) { const mid = (lo + hi) >> 1; if (passa(cands[mid], busca)) hi = mid; else lo = mid + 1; } }
      let ia = lo;
      for (let j = Math.max(0, ia - 4); j < ia; j++) if (passa(cands[j], busca)) { ia = j; break; }
      let a = cands[ia];
      if (passa(a, busca)) {
        // assimetria: tira barras de cima e de baixo enquanto a seção ainda atende
        for (const lado of ['sup', 'inf'] as const) while (a[lado].n > 2) {
          const t: ArmaduraInclinada = { ...a, [lado]: { n: a[lado].n - 1, phi: a[lado].phi } };
          if (areaCm2(t).total >= AsMinTot - 1e-9 && passa(t, busca)) a = t; else break;
        }
      }
      arranjo = a;
      util = completo(a);
      if (util <= 1 + 1e-9) break;
      // a busca ficou frouxa: acrescenta os pontos que falharam e repete
      const piores = pontos.map((p, i) => [p, utilPorPonto[i]] as const).sort((p, q) => q[1] - p[1]).slice(0, 6).map(([p]) => p);
      busca = [...new Set([...busca, ...piores])];
      if (rodada === 4) mensagens.push('Viga inclinada: a busca da armadura não convergiu numa disposição que atenda todas as seções; confira a armadura adotada.');
    }
  }
  if (!arranjo) {
    arranjo = lat({ sup: { n: 2, phi: 10 }, inf: { n: 2, phi: 10 } });
    util = 99;
  }
  // ---- cortante e torção ----
  const d = h - cob.inf - 0.0063 - 0.008, dH = bw - cob.lat - 0.0063 - 0.008;
  const vcOff = NtMax > 0;
  const sV = beamShear(bw, d, Vy, c, aEst.fyk, gs, vcOff), sH = beamShear(h, dH, Vz, c, aEst.fyk, gs, vcOff);
  const tor = torsionRect(bw, h, cob.lat + 0.0063 + 0.004, Td, c, fywd, fyd);
  const utilCortante = Math.max(Vy / Math.max(sV.VRd2, 1e-9), Vz / Math.max(sH.VRd2, 1e-9)) + (Td > 0 ? Td / tor.TRd2 : 0);
  let estribo = arranjo.estribo;
  if (!bloqueada) {
    const aswS = Math.max(sV.aswS, sH.aswS) + 2 * tor.a90S;
    let smax = Math.min(sV.smax, sH.smax);
    if (NdMax > 0) smax = Math.min(smax, 0.2, bw, 12 * Math.min(arranjo.sup.phi, arranjo.inf.phi) / 1000);
    const e = chooseStirrup(aswS, smax);
    estribo = e ? { phi: e.phi, s: e.s } : { phi: 12.5, s: 0.1 };
    arranjo = { ...arranjo, estribo };
  }
  // verificação do estribo adotado (também no bloqueado)
  const aswAdot = (2 * barArea(estribo.phi)) / estribo.s, aswNec = Math.max(sV.aswS, sH.aswS) + 2 * tor.a90S;
  const estriboOk = aswAdot + 1e-9 >= aswNec;
  // ---- envoltória por estação e utilização final ----
  const faixa = fiberAxialRange(secaoDe(barrasDaSecao(bw, h, cob, arranjo).bars));
  const S = secaoDe(barrasDaSecao(bw, h, cob, arranjo).bars);
  const envoltoria: EstacaoEnvoltoria[] = xs.map((x, i) => {
    const ps = pontos.filter((p) => p.x === x);
    const ext = (f: (l: Linha) => number[]) => { const v = linhas.map((l) => f(l)[i]); return [Math.max(...v), Math.min(...v)] as const; };
    const [Nmax, Nmin] = ext((l) => l.N), [Mzmax, Mzmin] = ext((l) => l.Mz), [Mymax, Mymin] = ext((l) => l.My);
    return { x, Nmax, Nmin, Mzmax, Mzmin, Mymax, Mymin, Vy: Math.max(...linhas.map((l) => Math.abs(l.Vy[i]))), Vz: Math.max(...linhas.map((l) => Math.abs(l.Vz[i]))), T: Math.max(...linhas.map((l) => Math.abs(l.T[i]))), util: Math.max(0, ...ps.map((p) => utilPonto(S, p, faixa))) };
  });
  util = Math.max(0, ...pontos.map((p) => utilPonto(S, p, faixa)));
  determinantes = pontos.map((p) => ({ combinacao: p.combinacao, x: p.x, N: p.N, Mz: p.Mz, My: p.My, util: utilPonto(S, p, faixa) })).sort((p, q) => q.util - p.util).filter((p, i, a) => a.findIndex((q) => q.combinacao === p.combinacao) === i).slice(0, 5);
  // ---- mensagens e situação ----
  let status: ResultadoInclinada['status'] = 'ok';
  const As = areaCm2(arranjo);
  if (lamMax > 200) { status = 'fail'; mensagens.push(`Viga inclinada: esbeltez λ = ${nf(lamMax, 0)} acima de 200 (NBR 6118, 15.8.3.3.5): aumente a seção, trave a barra ou reduza o comprimento entre nós.`); }
  else if (lamMax > 90) { status = 'review'; mensagens.push(`Viga inclinada: esbeltez λ = ${nf(lamMax, 0)} acima de 90: o pilar-padrão com curvatura aproximada não vale (NBR 6118, 15.8.3.3.2); resultado indicativo, confira por método mais rigoroso.`); }
  if (!pontos.length && lamMax <= 200) mensagens.push('Viga inclinada: sem combinações ELU para dimensionar.');
  if (util > 1 + 1e-9) {
    status = 'fail';
    mensagens.push(`Viga inclinada: ${bloqueada ? 'a armadura informada' : 'nenhuma disposição com até 4 % de armadura'} não atende a flexo-${NdMax > 0 && NdMax >= NtMax ? 'compressão' : 'tração'} oblíqua (utilização ${nf(util * 100, 0)} %); aumente a seção${bloqueada ? ' ou a armadura' : ''}.`);
  }
  if (As.total < AsMinTot - 1e-9 && bloqueada) { status = 'fail'; mensagens.push(`Viga inclinada: armadura longitudinal ${nf(As.total)} cm² abaixo do mínimo ${nf(AsMinTot)} cm².`); }
  if (As.total > AsMax + 1e-9) { status = 'fail'; mensagens.push(`Viga inclinada: armadura longitudinal ${nf(As.total)} cm² acima de 4 % da seção (${nf(AsMax)} cm²).`); }
  if (!sV.ok || !sH.ok || utilCortante > 1 + 1e-9 || tor.TRd2 < Td - 1e-9) { status = 'fail'; mensagens.push(`Viga inclinada: compressão diagonal do concreto esgotada (cortante${Td > 0 ? ' e torção' : ''}, ${nf(utilCortante * 100, 0)} % de VRd2/TRd2): aumente a largura ou a altura da seção.`); }
  if (!estriboOk) { status = 'fail'; mensagens.push(`Viga inclinada: estribo φ${nf(estribo.phi, estribo.phi % 1 ? 1 : 0)} c/${nf(estribo.s * 100, 0)} abaixo do necessário pelo cortante e pela torção.`); }
  mensagens.push('Viga inclinada: o detalhe dos nós de extremidade (ancoragem, cruzamento com pilar ou viga) fica a cargo do projetista; as pontas foram calculadas com a ligação informada (NBR 6118, cap. 22).');
  return {
    inclinada: inc.ref, barra: inc.id, nome: rotulo, pavimento: inc.pavimento, pavimentoFim: inc.pavimentoFim, secao: `${nf(bw * 100, 0)}×${nf(h * 100, 0)}`, b: bw, h, L: inc.L, Lf: inc.Lf, angulo: inc.angulo,
    ligacao: `${vi.ligIni === 'articulada' ? 'articulada' : 'engastada'} / ${vi.ligFim === 'articulada' ? 'articulada' : 'engastada'}`, le, lambda,
    Nd: { compressao: NdMax, tracao: NtMax }, Mz, My, Vd: [Vy, Vz], Td, arranjo, As, taxa: As.total / (Ac * 1e4),
    armadura: textoArmadura(arranjo), estribo: `φ${nf(estribo.phi, estribo.phi % 1 ? 1 : 0)} c/${nf(estribo.s * 100, 0)}`, util, utilCortante, determinantes, envoltoria, ...(bloqueada ? { bloqueada } : {}), status, mensagens,
  };
}

// ---------------- detalhamento ----------------

export interface BarraInclinadaDet { pos: string; face: 'sup' | 'inf' | 'lateral'; n: number; phi: number; /** Comprimento de cada barra (m). */ comprimento: number }
export interface DetalheInclinada {
  inclinada: string; barra: string; nome: string; L: number; Lf: number; b: number; h: number;
  barras: BarraInclinadaDet[];
  estribos: { phi: number; s: number; n: number; comprimento: number; largura: number; altura: number };
  /** Comprimento de ancoragem básico (m) das barras superiores e inferiores, para o projetista dos nós. */
  lb: { sup: number; inf: number };
  peso: number;
  avisos: string[];
}

const PESO_ACO = 7850;
const arred = (v: number) => Math.round(v * 100) / 100;

/** Barras longitudinais ao longo da barra inteira (entre as pontas lançadas) e estribos a cada `s` na parte flexível. */
export function detalharInclinada(b: BuildingModel, r: ResultadoInclinada, perdas = 0): DetalheInclinada {
  const vi = b.vigasInclinadas?.find((x) => x.id === r.inclinada), cob = cobrimentoViga(b, vi?.cobrimento), c = concretoDe(b, 'viga'), aLong = acoDe(b, 'vigaPos');
  const a = r.arranjo, barras: BarraInclinadaDet[] = [];
  const C = arred(r.L);
  barras.push({ pos: 'N1', face: 'sup', n: a.sup.n, phi: a.sup.phi, comprimento: C }, { pos: 'N2', face: 'inf', n: a.inf.n, phi: a.inf.phi, comprimento: C });
  if (a.laterais) barras.push({ pos: 'N3', face: 'lateral', n: 2 * a.laterais.n, phi: a.laterais.phi, comprimento: C });
  const larg = r.b - 2 * cob.lat - a.estribo.phi / 1000, alt = r.h - cob.inf - cob.sup - a.estribo.phi / 1000;
  const nEst = Math.ceil(r.Lf / a.estribo.s - 1e-9) + 1, Ce = arred(estriboComprimento(larg, alt, a.estribo.phi, 135));
  const peso = (barras.reduce((s, x) => s + x.n * x.comprimento * barArea(x.phi) * PESO_ACO, 0) + nEst * Ce * barArea(a.estribo.phi) * PESO_ACO) * (1 + perdas / 100);
  const lb = { sup: lbBasico(a.sup.phi, c, aLong.fyd, false), inf: lbBasico(a.inf.phi, c, aLong.fyd, true) };
  return {
    inclinada: r.inclinada, barra: r.barra, nome: r.nome, L: r.L, Lf: r.Lf, b: r.b, h: r.h, barras, estribos: { phi: a.estribo.phi, s: a.estribo.s, n: nEst, comprimento: Ce, largura: larg, altura: alt },
    lb, peso,
    avisos: [`Nós de extremidade a cargo do projetista: barras com ${arred(r.L)} m entre as pontas lançadas; ancoragem básica ${arred(lb.inf * 100)} cm (inferior) e ${arred(lb.sup * 100)} cm (superior), gancho de 90° ${arred(ganchoNoventa(a.inf.phi) * 100)} cm.`],
  };
}

/** Resumo do aço das vigas inclinadas por bitola (kg e comprimento total em m, sem perdas). */
export function resumoAcoInclinadas(b: BuildingModel, dets: DetalheInclinada[]): { aco: string; phi: number; comprimento: number; peso: number }[] {
  const acoL = acoDe(b, 'vigaPos').aco, acoE = acoDe(b, 'vigaEstribo').aco, m = new Map<string, { aco: string; phi: number; comprimento: number }>();
  const soma = (aco: string, phi: number, len: number) => { const k = `${aco}|${phi}`; const e = m.get(k) ?? { aco, phi, comprimento: 0 }; e.comprimento += len; m.set(k, e); };
  for (const d of dets) {
    for (const x of d.barras) soma(acoL, x.phi, x.n * x.comprimento);
    soma(acoE, d.estribos.phi, d.estribos.n * d.estribos.comprimento);
  }
  return [...m.values()].sort((p, q) => p.aco.localeCompare(q.aco) || p.phi - q.phi).map((e) => ({ ...e, peso: e.comprimento * barArea(e.phi) * PESO_ACO }));
}

// ---------------- listagem (C6.70, K1.12.2-6) ----------------

export interface ListagemInclinada {
  nome: string;
  /** Materiais: fck (MPa), aço das barras e dos estribos, cobrimento (cm), γc e γs. */
  materiais: { fck: number; acoLongitudinal: string; acoEstribo: string; cobrimento: number; gamaC: number; gamaS: number };
  /** Descrição: seção, comprimentos, ângulo, ligações e coeficientes de flambagem. */
  descricao: string[];
  /** Estações (abscissa na parte flexível) e esforços por caso (hipótese) e por combinação ELU. */
  xs: number[];
  casos: Record<string, Estacao[]>;
  combinacoes: { nome: string; estacoes: Estacao[] }[];
  /** Envoltória por estação (para o estudo das seções e dos nós de ligação), aproveitamento, resultado e erros. */
  envoltoria: EstacaoEnvoltoria[];
  aproveitamento: number;
  resultado: string;
  erros: string[];
}

const somaFatores = (pc: Record<string, Estacao[]>, fatores: Record<string, number>, n: number): Estacao[] =>
  Array.from({ length: n }, (_, i) => {
    const e: Estacao = { x: 0, N: 0, Vy: 0, Vz: 0, My: 0, Mz: 0, T: 0 };
    for (const nome in fatores) { const s = pc[nome]?.[i]; if (!s) continue; e.x = s.x; for (const k of ['N', 'Vy', 'Vz', 'My', 'Mz', 'T'] as const) e[k] += fatores[nome] * s[k]; }
    return e;
  });

/** Listagem completa de uma viga inclinada: materiais, descrição, esforços por hipótese e combinação, envoltórias, aproveitamento e erros. */
export function listagemInclinada(b: BuildingModel, an: AnaliseEdificio, r: ResultadoInclinada, elu: CombinacaoEd[], estacoes: (bi: number, xs: number[]) => Record<string, Estacao[]>): ListagemInclinada | null {
  const inc = an.inclinadas?.find((x) => x.id === r.barra), vi = b.vigasInclinadas?.find((x) => x.id === r.inclinada);
  if (!inc || !vi) return null;
  const xs = r.envoltoria.map((e) => e.x), pc = estacoes(inc.bi, xs), c = concretoDe(b, 'viga'), g = gamas(b);
  return {
    nome: r.nome,
    materiais: { fck: c.fck, acoLongitudinal: acoDe(b, 'vigaPos').aco, acoEstribo: acoDe(b, 'vigaEstribo').aco, cobrimento: +(cobrimentoViga(b, vi.cobrimento).lat * 100).toFixed(1), gamaC: g.c, gamaS: g.s },
    descricao: [
      `Seção ${r.secao} cm; comprimento entre as pontas ${nf(r.L, 2)} m, parte flexível ${nf(r.Lf, 2)} m, ângulo ${nf(r.angulo, 1)}° com a horizontal.`,
      `Pavimentos: ${r.pavimento} → ${r.pavimentoFim}; ligações das pontas: ${r.ligacao}.`,
      `Flambagem: ℓe = ${nf(r.le[0], 2)} m (plano vertical, λ = ${nf(r.lambda[0], 0)}) e ${nf(r.le[1], 2)} m (plano transversal, λ = ${nf(r.lambda[1], 0)}).`,
    ],
    xs, casos: pc, combinacoes: elu.map((cb) => ({ nome: cb.nome, estacoes: somaFatores(pc, cb.fatores, xs.length) })),
    envoltoria: r.envoltoria, aproveitamento: Math.max(r.util, r.utilCortante), resultado: `${r.armadura}; estribos ${r.estribo}; ${r.status === 'ok' ? 'atende' : r.status === 'review' ? 'revisar' : 'não atende'}`,
    erros: r.mensagens.filter((m) => !m.startsWith('Viga inclinada: o detalhe dos nós')),
  };
}
