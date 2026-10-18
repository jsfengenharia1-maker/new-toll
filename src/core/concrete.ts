// Dimensionamento de concreto armado — ABNT NBR 6118:2023.
// Unidades internas: MN, m, MPa (= MN/m²). Entradas e saídas públicas convertidas em kN onde indicado.

export interface Concrete {
  fck: number; fcd: number; sigmaCd: number; lambda: number; ec2: number; ecu: number; n: number;
  fctm: number; fctkInf: number; fctkSup: number; fctd: number; Eci: number; Ecs: number; av2: number; xLimRatio: number;
}

/** Propriedades do concreto (granito/gnaisse, αE = 1,0). */
export function concrete(fck: number, gammaC = 1.4): Concrete {
  const fcd = fck / gammaC;
  const high = fck > 50;
  const fctm = high ? 2.12 * Math.log(1 + 0.11 * fck) : 0.3 * fck ** (2 / 3);
  const Eci = high ? 21.5e3 * (fck / 10 + 1.25) ** (1 / 3) : 5600 * Math.sqrt(fck);
  const ai = Math.min(1, 0.8 + (0.2 * fck) / 80);
  const ac = high ? 0.85 * (1 - (fck - 50) / 200) : 0.85;
  const etac = fck > 40 ? (40 / fck) ** (1 / 3) : 1; // NBR 6118:2023, item 8.2.10.1
  const lambda = high ? 0.8 - (fck - 50) / 400 : 0.8;
  const ec2 = high ? 0.002 + 0.000085 * (fck - 50) ** 0.53 : 0.002;
  const ecu = high ? 0.0026 + 0.035 * ((90 - fck) / 100) ** 4 : 0.0035;
  const n = high ? 1.4 + 23.4 * ((90 - fck) / 100) ** 4 : 2;
  const fctkInf = 0.7 * fctm;
  return {
    fck, fcd, sigmaCd: ac * etac * fcd, lambda, ec2, ecu, n,
    fctm, fctkInf, fctkSup: 1.3 * fctm, fctd: fctkInf / gammaC, Eci, Ecs: ai * Eci,
    av2: 1 - fck / 250, xLimRatio: high ? 0.35 : 0.45,
  };
}

export const ES = 210000; // MPa
export const barArea = (phiMm: number) => (Math.PI * (phiMm / 1000) ** 2) / 4;
export const PHI_L = [8, 10, 12.5, 16, 20, 25, 32];
export const PHI_T = [5, 6.3, 8, 10, 12.5];

/** Cobrimento nominal de vigas e pilares (Tabela 7.2) e fck mínimo (Tabela 7.1) por CAA. */
export const CAA_TABLE: Record<1 | 2 | 3 | 4, { cover: number; fckMin: number; label: string }> = {
  1: { cover: 0.025, fckMin: 20, label: 'I — fraca (rural/submersa)' },
  2: { cover: 0.03, fckMin: 25, label: 'II — moderada (urbana)' },
  3: { cover: 0.04, fckMin: 30, label: 'III — forte (marinha/industrial)' },
  4: { cover: 0.05, fckMin: 40, label: 'IV — muito forte (industrial química/respingos de maré)' },
};

// ---------------------------------------------------------------------------
// Análise de seção retangular armada por compatibilidade de deformações
// (diagrama parábola-retângulo; domínios 1 a 5).

export interface Bar { y: number; A: number } // y: profundidade a partir da face superior (m)

function sigmaC(e: number, c: Concrete) {
  if (e <= 0) return 0;
  if (e >= c.ec2) return c.sigmaCd;
  return c.sigmaCd * (1 - (1 - e / c.ec2) ** c.n);
}

function sigmaS(e: number, fyd: number) {
  return Math.max(-fyd, Math.min(fyd, ES * e));
}

/** Deformações [topo, base] para o parâmetro t ∈ [0, 3] (t cresce com a compressão). */
function strains(t: number, h: number, d: number, c: Concrete): [number, number] {
  if (t <= 1) {
    const top = -0.01 + (0.01 + c.ecu) * t;
    return [top, top + ((-0.01 - top) * h) / d];
  }
  if (t <= 2) {
    const bot1 = c.ecu + ((-0.01 - c.ecu) * h) / d;
    return [c.ecu, bot1 * (2 - t)];
  }
  const yC = (1 - c.ec2 / c.ecu) * h;
  const bot = c.ec2 * (t - 2);
  const slope = (bot - c.ec2) / (h - yC);
  return [c.ec2 - slope * yC, bot];
}

type Width = number | ((y: number) => number);

function forces(b: Width, h: number, bars: Bar[], top: number, bot: number, c: Concrete, fyd: number) {
  const nS = 60;
  let N = 0, M = 0;
  for (let k = 0; k < nS; k++) {
    const y = ((k + 0.5) * h) / nS;
    const e = top + ((bot - top) * y) / h;
    const f = sigmaC(e, c) * (typeof b === 'number' ? b : b(y)) * (h / nS);
    N += f; M += f * (h / 2 - y);
  }
  for (const s of bars) {
    const e = top + ((bot - top) * s.y) / h;
    const f = (sigmaS(e, fyd) - sigmaC(e, c)) * s.A;
    N += f; M += f * (h / 2 - s.y);
  }
  return { N, M };
}

/** Momento resistente (MN·m) para a normal Nd (MN, compressão +). null se Nd fora do intervalo resistente. */
export function momentCapacity(b: Width, h: number, bars: Bar[], NdMN: number, c: Concrete, fyd: number): number | null {
  const d = Math.max(...bars.map((s) => s.y), 0.9 * h);
  const at = (t: number) => { const [a, z] = strains(t, h, d, c); return forces(b, h, bars, a, z, c, fyd); };
  const lo0 = at(0), hi0 = at(3);
  if (NdMN < lo0.N || NdMN > hi0.N) return null;
  let lo = 0, hi = 3;
  for (let it = 0; it < 60; it++) {
    const m = (lo + hi) / 2;
    if (at(m).N < NdMN) lo = m; else hi = m;
  }
  return Math.abs(at((lo + hi) / 2).M);
}

export function axialCapacity(b: Width, h: number, bars: Bar[], c: Concrete, fyd: number) {
  const d = Math.max(...bars.map((s) => s.y), 0.9 * h);
  const [a1, z1] = strains(3, h, d, c);
  const [a0, z0] = strains(0, h, d, c);
  return { NRc: forces(b, h, bars, a1, z1, c, fyd).N, NRt: forces(b, h, bars, a0, z0, c, fyd).N };
}

// ---------------------------------------------------------------------------
// Pilares retangulares

export interface ColumnLayout { phi: number; nx: number; ny: number; n: number; As: number; a: number }

/** Barras para flexão no plano (profundidade h) ou fora do plano (profundidade b). */
export function columnBars(b: number, h: number, L: ColumnLayout, inPlane: boolean): Bar[] {
  const depth = inPlane ? h : b;
  const nFace = inPlane ? L.nx : L.ny;
  const nSide = inPlane ? L.ny : L.nx;
  const Ab = barArea(L.phi);
  const a = L.a;
  const bars: Bar[] = [{ y: a, A: nFace * Ab }, { y: depth - a, A: nFace * Ab }];
  for (let k = 1; k <= nSide - 2; k++) bars.push({ y: a + (k * (depth - 2 * a)) / (nSide - 1), A: 2 * Ab });
  return bars;
}

export interface ColumnCombo {
  name: string;
  N0: number; NL: number; // kN, convenção de esforço interno (tração +)
  M0: number; ML: number; // kN·m no plano
  Mspan: number; // |M| máximo no vão (kN·m)
  transverse: boolean; // há carga transversal na barra
  /** Pilar em balanço (uma extremidade livre): αb pela expressão de balanço (NBR 6118, 15.8.2). */
  cantilever?: boolean;
  /** M a meia altura (kN·m, com sinal), usado no αb do balanço. */
  Mmid?: number;
}

export interface ColumnInput {
  b: number; h: number; L: number; leIn: number; leOut: number; cover: number;
  conc: Concrete; fyk: number; gammaS: number; dmax: number; combos: ColumnCombo[];
}

export interface ColumnCheck {
  combo: string; Nd: number; util: number; governing: 'S1' | 'S2' | 'N' | 'T';
  lambdaX: number; lambda1X: number; alphaB: number; M1dA: number; M1dMinX: number; M2dX: number; MdTotX: number; MRxx: number;
  lambdaY: number; M1dMinY: number; M2dY: number; MdTotY: number; MRyy: number; MxS2: number; interaction: number; nu: number;
  gn1?: number;
}

export interface ColumnDesign {
  ok: boolean;
  status: 'ok' | 'fail' | 'review';
  util: number;
  gammaN: number;
  layout: ColumnLayout | null;
  rho: number;
  AsMin: number;
  AsMax: number;
  stirrup: { phi: number; s: number } | null;
  check: ColumnCheck | null; // combinação determinante
  checks: ColumnCheck[];
  NRc: number; // kN, capacidade à compressão centrada com a armadura adotada
  messages: string[];
}

export function gammaNFor(bMin: number): number {
  const cm = bMin * 100;
  if (cm >= 19) return 1;
  return 1.95 - 0.05 * cm;
}

function evaluateColumn(inp: ColumnInput, L: ColumnLayout, gn: number) {
  const { b, h, conc: c } = inp;
  const fyd = inp.fyk / inp.gammaS;
  const barsX = columnBars(b, h, L, true), barsY = columnBars(b, h, L, false);
  const Ac = b * h;
  const cache = new Map<string, number | null>();
  const MR = (inPlane: boolean, NdKN: number) => {
    const key = `${inPlane}|${NdKN.toFixed(3)}`;
    if (!cache.has(key)) {
      const v = inPlane ? momentCapacity(b, h, barsX, NdKN / 1000, c, fyd) : momentCapacity(h, b, barsY, NdKN / 1000, c, fyd);
      cache.set(key, v === null ? null : v * 1000);
    }
    return cache.get(key)!;
  };
  const checks: ColumnCheck[] = [];
  for (const cb of inp.combos) {
    const n0 = -cb.N0 * gn, nL = -cb.NL * gn; // compressão +
    const Nd = Math.max(n0, nL);
    const m0 = cb.M0 * gn, mL = cb.ML * gn, ms = cb.Mspan * gn;
    const base: ColumnCheck = { combo: cb.name, Nd, util: 0, governing: 'S1', lambdaX: 0, lambda1X: 0, alphaB: 1, M1dA: 0, M1dMinX: 0, M2dX: 0, MdTotX: 0, MRxx: 0, lambdaY: 0, M1dMinY: 0, M2dY: 0, MdTotY: 0, MRyy: 0, MxS2: 0, interaction: 0, nu: Nd / 1000 / (Ac * c.fcd) };
    if (Nd <= 0) {
      // tração: verificação de flexo-tração nas extremidades
      let util = 0;
      for (const [N, M] of [[n0, m0], [nL, mL]] as const) {
        const R = MR(true, N);
        util = Math.max(util, R === null ? 99 : Math.abs(M) / Math.max(R, 1e-9));
      }
      checks.push({ ...base, util, governing: 'T', MdTotX: Math.max(Math.abs(m0), Math.abs(mL), ms) });
      continue;
    }
    const aM0 = Math.abs(m0), aML = Math.abs(mL);
    const MA = Math.max(aM0, aML), MB = Math.min(aM0, aML);
    const sameSign = m0 * mL > 0;
    const M1dMinX = Nd * (0.015 + 0.03 * h);
    let alphaB: number;
    if (cb.cantilever) {
      // balanço: αb = 0,80 + 0,20·MC/MA, entre 0,85 e 1,0; MA no engaste, MC a meia altura (sinal relativo a MA)
      const MAs = aM0 >= aML ? m0 : mL, MC = (cb.Mmid ?? 0) * gn;
      alphaB = Math.max(0.85, Math.min(1, 0.8 + 0.2 * (MA > 0 ? (MC * Math.sign(MAs)) / MA : 0)));
    } else alphaB = cb.transverse ? 1 : Math.max(0.4, Math.min(1, 0.6 + 0.4 * (MA > 0 ? (sameSign ? MB / MA : -MB / MA) : 0)));
    if (MA < M1dMinX) alphaB = 1;
    const Mbase = Math.max(MA, M1dMinX);
    const e1 = MA / Nd;
    const lambda1X = Math.max(35, Math.min(90, (25 + (12.5 * e1) / h) / alphaB));
    const lambdaX = (Math.sqrt(12) * inp.leIn) / h;
    const nu = Nd / 1000 / (Ac * c.fcd);
    // γn majora os esforços finais (13.2.3): a curvatura 1/r usa ν sem γn
    const nuR = nu / gn;
    let M2dX = 0;
    if (lambdaX > lambda1X) M2dX = ((Nd * inp.leIn ** 2) / 10) * Math.min(0.005 / (h * (nuR + 0.5)), 0.005 / h);
    const lambdaY = (Math.sqrt(12) * inp.leOut) / b;
    // 140 < λ ≤ 200: esforços finais × γn1 = 1 + 0,01·(λ − 140)/1,4 (15.8.1)
    const lamMax = Math.max(lambdaX, lambdaY);
    const gn1 = lamMax > 140 ? 1 + (0.01 * (lamMax - 140)) / 1.4 : 1;
    const MdTotX = Math.max(alphaB * Mbase + M2dX, Mbase, ms) * gn1;
    const M1dMinY = Nd * (0.015 + 0.03 * b);
    const M2dY = lambdaY > 35 ? ((Nd * inp.leOut ** 2) / 10) * Math.min(0.005 / (b * (nuR + 0.5)), 0.005 / b) : 0;
    const MdTotY = (M1dMinY + M2dY) * gn1;
    const MRxx = MR(true, Nd * gn1), MRyy = MR(false, Nd * gn1);
    if (MRxx === null || MRyy === null) {
      checks.push({ ...base, util: 99, governing: 'N', lambdaX, lambda1X, alphaB, M1dA: MA, M1dMinX, M2dX, MdTotX, lambdaY, M1dMinY, M2dY, MdTotY, nu });
      continue;
    }
    const s1 = MdTotX / Math.max(MRxx, 1e-9);
    const MxS2 = Math.max(MA, ms) * gn1;
    const inter = (MxS2 / MRxx) ** 1.2 + (MdTotY / MRyy) ** 1.2;
    const util = Math.max(s1, inter);
    checks.push({ ...base, util, governing: s1 >= inter ? 'S1' : 'S2', lambdaX, lambda1X, alphaB, M1dA: MA, M1dMinX, M2dX, MdTotX, MRxx, lambdaY, M1dMinY, M2dY, MdTotY, MRyy, MxS2, interaction: inter, nu, gn1 });
  }
  const util = checks.reduce((m, k) => Math.max(m, k.util), 0);
  return { util, checks };
}

export function designColumn(inp: ColumnInput): ColumnDesign {
  const { b, h, conc: c } = inp;
  const messages: string[] = [];
  const bMin = Math.min(b, h);
  const Ac = b * h;
  const fyd = inp.fyk / inp.gammaS;
  const gn = gammaNFor(bMin);
  const empty: ColumnDesign = { ok: false, status: 'fail', util: 99, gammaN: gn, layout: null, rho: 0, AsMin: 0, AsMax: 0.04 * Ac, stirrup: null, check: null, checks: [], NRc: 0, messages };
  if (bMin < 0.14) { messages.push('Menor dimensão abaixo de 14 cm: não permitida para pilares (NBR 6118, 13.2.3).'); return empty; }
  if (Ac < 0.036 - 1e-9) { messages.push('Área da seção abaixo de 360 cm² (NBR 6118, 13.2.3).'); return empty; }
  if (gn > 1) messages.push(`Menor dimensão < 19 cm: esforços majorados por γn = ${gn.toFixed(2)}.`);
  const NdMax = Math.max(0, ...inp.combos.map((k) => Math.max(-k.N0, -k.NL) * gn));
  const AsMin = Math.max((0.15 * NdMax) / 1000 / fyd, 0.004 * Ac);
  const AsMax = 0.04 * Ac;
  const lambdaMaxX = (Math.sqrt(12) * inp.leIn) / h, lambdaMaxY = (Math.sqrt(12) * inp.leOut) / b;
  const lmax = Math.max(lambdaMaxX, lambdaMaxY);
  if (lmax > 200) { messages.push(`Esbeltez λ = ${lmax.toFixed(0)} > 200: não permitida.`); return { ...empty, AsMin }; }

  const candidates: ColumnLayout[] = [];
  const phiT0 = 0.0063;
  for (const phi of PHI_L) {
    if (phi < 10 || phi / 1000 > bMin / 8) continue;
    const a = inp.cover + phiT0 + phi / 2000;
    const sMin = Math.max(0.02, phi / 1000, 1.2 * inp.dmax) + phi / 1000;
    const sMaxC = Math.min(0.4, 2 * bMin);
    const lims = (dim: number) => {
      const free = dim - 2 * a;
      const nMin = Math.max(2, Math.ceil(free / sMaxC - 1e-9) + 1);
      const nMax = Math.floor(free / sMin + 1e-9) + 1;
      return [nMin, nMax];
    };
    const [nxMin, nxMax] = lims(b), [nyMin, nyMax] = lims(h);
    for (let nx = nxMin; nx <= nxMax; nx++)
      for (let ny = nyMin; ny <= nyMax; ny++) {
        const n = 2 * nx + 2 * ny - 4;
        const As = n * barArea(phi);
        if (As > AsMax + 1e-12) continue;
        candidates.push({ phi, nx, ny, n, As: Math.max(As, 0), a });
      }
  }
  candidates.sort((p, q) => p.As - q.As || p.n - q.n);
  let chosen: ColumnLayout | null = null;
  let res: ReturnType<typeof evaluateColumn> | null = null;
  let tried = 0;
  for (const cand of candidates) {
    if (cand.As < AsMin) continue;
    const r = evaluateColumn(inp, cand, gn);
    tried++;
    if (r.util <= 1) { chosen = cand; res = r; break; }
    if (!res || r.util < res.util) { res = r; chosen = cand; }
    if (tried > 400) break;
  }
  if (!chosen || !res) { messages.push('Nenhuma disposição de armadura cabe na seção.'); return { ...empty, AsMin }; }
  const ok = res.util <= 1;
  const check = res.checks.reduce((m, k) => (k.util > (m?.util ?? -1) ? k : m), null as ColumnCheck | null);
  let status: ColumnDesign['status'] = ok ? 'ok' : 'fail';
  if (lmax > 90) { status = 'review'; messages.push(`λ = ${lmax.toFixed(0)} > 90: a NBR 6118 exige pilar-padrão acoplado a diagramas M, N, 1/r ou método geral, e a consideração da fluência. Resultado indicativo.`); }
  if (!ok) messages.push('A seção não atende com até 4% de armadura. Aumente a seção (veja a sugestão).');
  const phiT = PHI_T.find((p) => p >= Math.max(5, chosen!.phi / 4)) ?? 10;
  const s = Math.floor(Math.min(0.2, bMin, (12 * chosen.phi) / 1000) * 100) / 100;
  const caps = axialCapacity(b, h, columnBars(b, h, chosen, true), c, fyd);
  return {
    ok, status, util: res.util, gammaN: gn, layout: chosen, rho: chosen.As / Ac, AsMin, AsMax,
    stirrup: { phi: phiT, s }, check, checks: res.checks, NRc: caps.NRc * 1000, messages,
  };
}

// ---------------------------------------------------------------------------
// Vigas: flexão simples (retangular ou T) e cisalhamento (modelo I)

export interface BeamSection { kind: 'rect' | 'tee'; bw: number; h: number; bf?: number; hf?: number }

export interface FlexureResult {
  Md: number; // kN·m
  As: number; As2: number; x: number; xd: number; d: number; double: boolean; ok: boolean; msg?: string;
}

function blockForce(sec: BeamSection, flangeComp: boolean, x: number, c: Concrete) {
  // resultante e braço (a partir da face comprimida) do bloco retangular
  const y = c.lambda * x;
  const tee = sec.kind === 'tee' && flangeComp && sec.bf && sec.hf;
  if (!tee || y <= sec.hf!) {
    const w = tee ? sec.bf! : sec.bw;
    return { C: c.sigmaCd * w * y, z: y / 2 };
  }
  const Cf = c.sigmaCd * (sec.bf! - sec.bw) * sec.hf!;
  const Cw = c.sigmaCd * sec.bw * y;
  return { C: Cf + Cw, z: (Cf * sec.hf! / 2 + Cw * y / 2) / (Cf + Cw) };
}

export function beamFlexure(sec: BeamSection, flangeComp: boolean, MdKN: number, d: number, d2: number, c: Concrete, fyd: number): FlexureResult {
  const Md = Math.abs(MdKN) / 1000;
  const xlim = c.xLimRatio * d;
  const Mx = (x: number) => { const f = blockForce(sec, flangeComp, x, c); return f.C * (d - f.z); };
  if (Md <= 1e-12) return { Md: 0, As: 0, As2: 0, x: 0, xd: 0, d, double: false, ok: true };
  if (Md <= Mx(xlim)) {
    let lo = 0, hi = xlim;
    for (let it = 0; it < 80; it++) { const m = (lo + hi) / 2; if (Mx(m) < Md) lo = m; else hi = m; }
    const x = (lo + hi) / 2;
    const f = blockForce(sec, flangeComp, x, c);
    return { Md: MdKN, As: f.C / fyd, As2: 0, x, xd: x / d, d, double: false, ok: true };
  }
  const x = xlim;
  const f = blockForce(sec, flangeComp, x, c);
  const Mlim = f.C * (d - f.z);
  const dM = Md - Mlim;
  const es2 = (c.ecu * (x - d2)) / x;
  const s2 = Math.min(ES * es2, fyd);
  const As2 = dM / (s2 * (d - d2));
  const As = f.C / fyd + dM / (fyd * (d - d2));
  return { Md: MdKN, As, As2, x, xd: x / d, d, double: true, ok: true, msg: 'Armadura dupla (x limitado a ' + c.xLimRatio.toFixed(2) + 'd).' };
}

export function grossProps(sec: BeamSection) {
  if (sec.kind === 'tee' && sec.bf && sec.hf) {
    const Aw = sec.bw * (sec.h - sec.hf), Af = sec.bf * sec.hf;
    const A = Aw + Af;
    const ycb = (Aw * (sec.h - sec.hf) / 2 + Af * (sec.h - sec.hf / 2)) / A; // a partir da base
    const I = (sec.bw * (sec.h - sec.hf) ** 3) / 12 + Aw * ((sec.h - sec.hf) / 2 - ycb) ** 2 + (sec.bf * sec.hf ** 3) / 12 + Af * (sec.h - sec.hf / 2 - ycb) ** 2;
    return { A, I, ycb };
  }
  return { A: sec.bw * sec.h, I: (sec.bw * sec.h ** 3) / 12, ycb: sec.h / 2 };
}

/** As,min pela NBR 6118 17.3.5.2.1: Md,min = 0,8·W0·fctk,sup, com ρmin absoluto de 0,15%. */
export function beamAsMin(sec: BeamSection, flangeComp: boolean, d: number, c: Concrete, fyd: number): number {
  const g = grossProps(sec);
  const yt = flangeComp ? g.ycb : sec.h - g.ycb; // fibra tracionada
  const W0 = g.I / yt;
  const Mmin = 0.8 * W0 * c.fctkSup; // MN·m
  const r = beamFlexure(sec, flangeComp, Mmin * 1000, d, 0.04, c, fyd);
  return Math.max(r.As, 0.0015 * g.A);
}

export interface BarChoice { phi: number; n: number; As: number; layers: number }

export function chooseBars(As: number, bw: number, cover: number, phiT: number, dmax: number): BarChoice | null {
  if (As <= 0) return null;
  const opts: BarChoice[] = [];
  for (const phi of PHI_L) {
    if (phi > 25 && As < 0.002) continue;
    const Ab = barArea(phi);
    const n = Math.max(2, Math.ceil(As / Ab - 1e-9));
    const ah = Math.max(0.02, phi / 1000, 1.2 * dmax);
    const free = bw - 2 * (cover + phiT);
    const perLayer = Math.max(1, Math.floor((free + ah) / (phi / 1000 + ah)));
    if (perLayer < 2) continue;
    const layers = Math.ceil(n / perLayer);
    if (layers > 3) continue;
    opts.push({ phi, n, As: n * Ab, layers });
  }
  opts.sort((p, q) => p.layers - q.layers || p.As - q.As || p.n - q.n);
  return opts[0] ?? null;
}

export interface ShearResult { Vsd: number; VRd2: number; Vc: number; aswS: number; aswMin: number; ok: boolean; smax: number; stirrup: { phi: number; s: number; legs: number } | null }

/** Cortante modelo I. `vcOff`: seção toda tracionada (linha neutra fora da seção) → Vc = 0 (17.4.2.2). */
export function beamShear(bw: number, d: number, VsdKN: number, c: Concrete, fywk: number, gammaS: number, vcOff = false): ShearResult {
  const Vsd = Math.abs(VsdKN) / 1000;
  const fywd = Math.min(fywk / gammaS, 435);
  const VRd2 = 0.27 * c.av2 * c.fcd * bw * d;
  const Vc = vcOff ? 0 : 0.6 * c.fctd * bw * d;
  const aswMin = ((0.2 * c.fctm) / fywk) * bw;
  const aswS = Math.max(aswMin, Math.max(0, Vsd - Vc) / (0.9 * d * fywd));
  const smax = Vsd <= 0.67 * VRd2 ? Math.min(0.6 * d, 0.3) : Math.min(0.3 * d, 0.2);
  let stirrup: ShearResult['stirrup'] = null;
  for (const phi of PHI_T) {
    const s = (2 * barArea(phi)) / aswS;
    const sAdopt = Math.floor(Math.min(s, smax) * 100) / 100;
    if (sAdopt >= 0.1 || phi === PHI_T[PHI_T.length - 1]) { stirrup = { phi, s: sAdopt, legs: 2 }; break; }
  }
  return { Vsd: VsdKN, VRd2: VRd2 * 1000, Vc: Vc * 1000, aswS, aswMin, ok: Vsd <= VRd2, smax, stirrup };
}

/** Inércia equivalente de Branson (NBR 6118 17.3.2.1.1) para a seção sob momento Ma (kN·m). */
export function bransonRatio(sec: BeamSection, flangeComp: boolean, As: number, d: number, MaKN: number, c: Concrete): { Ic: number; III: number; Ie: number; Mr: number } {
  const g = grossProps(sec);
  const alpha = sec.kind === 'tee' ? 1.2 : 1.5;
  const yt = flangeComp ? g.ycb : sec.h - g.ycb;
  const Mr = ((alpha * c.fctm * g.I) / yt) * 1000; // kN·m
  const ae = ES / c.Ecs;
  const wTop = sec.kind === 'tee' && flangeComp && sec.bf ? sec.bf : sec.bw;
  const area = (x: number) => {
    if (sec.kind === 'tee' && flangeComp && sec.bf && sec.hf && x > sec.hf) return sec.bf * sec.hf * (x - sec.hf / 2) + (sec.bw * (x - sec.hf) ** 2) / 2;
    return (wTop * x * x) / 2;
  };
  let lo = 0, hi = d;
  const nAs = Math.max(As, 1e-8);
  for (let it = 0; it < 80; it++) { const m = (lo + hi) / 2; if (area(m) < ae * nAs * (d - m)) lo = m; else hi = m; }
  const x = (lo + hi) / 2;
  let III: number;
  if (sec.kind === 'tee' && flangeComp && sec.bf && sec.hf && x > sec.hf) III = (sec.bf * x ** 3) / 3 - ((sec.bf - sec.bw) * (x - sec.hf) ** 3) / 3 + ae * nAs * (d - x) ** 2;
  else III = (wTop * x ** 3) / 3 + ae * nAs * (d - x) ** 2;
  const Ma = Math.abs(MaKN);
  const r = Ma > 0 ? Math.min(1, (Mr / Ma) ** 3) : 1;
  const Ie = Math.min(g.I, r * g.I + (1 - r) * III);
  return { Ic: g.I, III, Ie, Mr };
}

/** Largura de seção circular de diâmetro D na profundidade y (a partir do topo). */
export const circleWidth = (D: number) => (y: number) => { const r = D / 2, t = y - r; return t * t >= r * r ? 0 : 2 * Math.sqrt(r * r - t * t); };

/** Barras distribuídas uniformemente em círculo de raio rs (seção de diâmetro D), girando o arranjo de `rot` rad. */
export function circleBars(D: number, n: number, phiMm: number, rs: number, rot = 0): Bar[] {
  const A = barArea(phiMm);
  return Array.from({ length: n }, (_, k) => ({ y: D / 2 - rs * Math.cos(rot + (2 * Math.PI * k) / n), A }));
}

// ---------------------------------------------------------------------------
// Abertura de fissuras (ELS-W, NBR 6118 17.3.3.2), combinação frequente.

export interface CrackResult { wk: number; w1: number; w2: number; sigmaS: number; rhoR: number; x: number; limit: number }

/** Limite de wk (mm) por CAA para concreto armado (Tabela 13.4). */
export const crackLimit = (caa: 1 | 2 | 3 | 4) => (caa === 1 ? 0.4 : caa === 4 ? 0.2 : 0.3);

/**
 * wk = menor de w1 = φ/(12,5·η1)·(σs/Es)·(3σs/fctm) e w2 = φ/(12,5·η1)·(σs/Es)·(4/ρr + 45), η1 = 2,25 (CA-50).
 * σs no estádio II com αe = 15. Área de envolvimento Acr = bw·mín(h − d + 7,5·φ, h/2) para a camada tracionada
 * (simplificação da região de 7,5φ em torno das barras, a confirmar).
 */
export function crackWidth(sec: BeamSection, flangeComp: boolean, As: number, phiMm: number, d: number, MkKN: number, c: Concrete, caa: 1 | 2 | 3 | 4): CrackResult {
  const limit = crackLimit(caa);
  const M = Math.abs(MkKN) / 1000;
  if (M <= 0 || As <= 0) return { wk: 0, w1: 0, w2: 0, sigmaS: 0, rhoR: 0, x: 0, limit };
  const ae = 15;
  const wTop = sec.kind === 'tee' && flangeComp && sec.bf ? sec.bf : sec.bw;
  const area = (x: number) => (sec.kind === 'tee' && flangeComp && sec.bf && sec.hf && x > sec.hf ? sec.bf * sec.hf * (x - sec.hf / 2) + (sec.bw * (x - sec.hf) ** 2) / 2 : (wTop * x * x) / 2);
  let lo = 0, hi = d;
  for (let it = 0; it < 80; it++) { const m = (lo + hi) / 2; if (area(m) < ae * As * (d - m)) lo = m; else hi = m; }
  const x = (lo + hi) / 2;
  const III = sec.kind === 'tee' && flangeComp && sec.bf && sec.hf && x > sec.hf ? (sec.bf * x ** 3) / 3 - ((sec.bf - sec.bw) * (x - sec.hf) ** 3) / 3 + ae * As * (d - x) ** 2 : (wTop * x ** 3) / 3 + ae * As * (d - x) ** 2;
  const sigmaS = (ae * M * (d - x)) / III; // MPa
  const phi = phiMm / 1000, eta1 = 2.25;
  const hcr = Math.min(sec.h - d + 7.5 * phi, sec.h / 2);
  const rhoR = As / (sec.bw * hcr);
  const k = (phiMm / (12.5 * eta1)) * (sigmaS / ES);
  const w1 = k * ((3 * sigmaS) / c.fctm), w2 = k * (4 / rhoR + 45);
  return { wk: Math.min(w1, w2), w1, w2, sigmaS, rhoR, x, limit };
}
