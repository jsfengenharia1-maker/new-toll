// Sapatas isoladas rígidas e flexíveis (NBR 6122 / NBR 6118, itens 22.6 e 19.5).
// Planta pela tensão admissível do solo (informada ou estimada pelo SPT), base sem tração (área comprimida),
// altura rígida h ≥ (a − ap)/3, flexão pelo CEB-70 (padrão) ou bielas (Lebelle), punção nas flexíveis.
// x ao longo de A (lado do momento My), y ao longo de B (momento Mx). Unidades: kN, m, kPa; tensões de cálculo em MPa.
import { barArea, beamFlexure, concrete } from './concrete';
import { anchorageLength, bestBars, ceil05, spacedBars, type BarSet } from './rebar';
import type { Boring, FGroup, FixedDims, FoundationParams } from './piles';

// ---------------------------------------------------------------- tensões na base (sem tração)
export interface Pressure { s0: number; sx: number; sy: number; sigmaMax: number; sigmaMin: number; compressed: number }

/** ∫ max(0, a + c·y) dy em [−L/2, L/2]: [área, momento estático, comprimento comprimido]. */
function strip(a: number, c: number, L: number): [number, number, number] {
  let y1 = -L / 2, y2 = L / 2;
  if (Math.abs(c) < 1e-14) return a > 0 ? [a * L, 0, L] : [0, 0, 0];
  const y0 = -a / c;
  if (c > 0) y1 = Math.max(y1, y0); else y2 = Math.min(y2, y0);
  if (y2 <= y1) return [0, 0, 0];
  return [a * (y2 - y1) + (c * (y2 * y2 - y1 * y1)) / 2, (a * (y2 * y2 - y1 * y1)) / 2 + (c * (y2 ** 3 - y1 ** 3)) / 3, y2 - y1];
}

/** Simpson em [a, b]. */
function simpson(f: (x: number) => number, a: number, b: number, n = 400): number {
  if (b <= a) return 0;
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

/** Polígono recortado pelo semiplano s0 + sx·x + sy·y ≥ 0 e suas propriedades geométricas (exatas). */
export function contactPoly(rect: Pt[], v: [number, number, number]) {
  const f = (x: number, y: number) => v[0] + v[1] * x + v[2] * y;
  const poly: Pt[] = [];
  const m = rect.length;
  for (let i = 0; i < m; i++) {
    const P = rect[i], Q = rect[(i + 1) % m];
    const fp = f(P[0], P[1]), fq = f(Q[0], Q[1]);
    if (fp >= 0) poly.push(P);
    if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); poly.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]); }
  }
  let a = 0, sx = 0, sy = 0, ixx = 0, iyy = 0, ixy = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length];
    const c = x0 * y1 - x1 * y0;
    a += c / 2; sx += ((x0 + x1) * c) / 6; sy += ((y0 + y1) * c) / 6;
    ixx += ((x0 * x0 + x0 * x1 + x1 * x1) * c) / 12; iyy += ((y0 * y0 + y0 * y1 + y1 * y1) * c) / 12;
    ixy += ((x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * c) / 24;
  }
  const J = [[a, sx, sy], [sx, ixx, ixy], [sy, ixy, iyy]];
  const F = J.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  return { area: a, J, F, poly };
}

export type Pt = [number, number];
const rectPoly = (A: number, B: number): Pt[] => [[-A / 2, -B / 2], [A / 2, -B / 2], [A / 2, B / 2], [-A / 2, B / 2]];

/** Retângulo A × B recortado pelo semiplano s0 + sx·x + sy·y ≥ 0 e suas propriedades geométricas (exatas). */
function contact(A: number, B: number, v: [number, number, number]) { return contactPoly(rectPoly(A, B), v); }

/** Newton do plano de tensões sem tração: F(v) = alvo [N, N·ex, N·ey] para a área de contato exata. null: não convergiu. */
function solvePlane(ct: (v: [number, number, number]) => ReturnType<typeof contactPoly>, v0: [number, number, number], target: number[], N: number) {
  let v = v0;
  let c = ct(v);
  let r = c.F.map((x, i) => x - target[i]), nr = Math.hypot(...r);
  for (let it = 0; it < 100 && nr > 1e-10 * N; it++) {
    const dv = solve3(c.J, r.map((x) => -x));
    if (!dv) return null;
    let t = 1, ok = false;
    for (let ls = 0; ls < 40; ls++) {
      const w: [number, number, number] = [v[0] + t * dv[0], v[1] + t * dv[1], v[2] + t * dv[2]];
      const cw = ct(w);
      const rw = cw.F.map((x, i) => x - target[i]), nw = Math.hypot(...rw);
      if (nw < nr) { v = w; c = cw; r = rw; nr = nw; ok = true; break; }
      t /= 2;
    }
    if (!ok) break;
  }
  return nr > 1e-6 * N ? null : { v, c };
}

/**
 * Distribuição plana de tensões sem tração numa base A × B sob N com excentricidades ex (ao longo de A) e ey.
 * Dentro do núcleo central é a fórmula da flexão composta; fora, resolve o equilíbrio por Newton com a área de contato exata.
 */
export function basePressure(A: number, B: number, N: number, ex: number, ey: number): Pressure | null {
  if (N <= 0) return null;
  ex = Math.abs(ex); ey = Math.abs(ey);
  if (ex >= A / 2 - 1e-9 || ey >= B / 2 - 1e-9) return null;
  let v: [number, number, number] = [N / (A * B), (12 * N * ex) / (B * A ** 3), (12 * N * ey) / (A * B ** 3)];
  const corner = (w: [number, number, number]) => [w[0] - (w[1] * A) / 2 - (w[2] * B) / 2, w[0] + (w[1] * A) / 2 + (w[2] * B) / 2];
  if (corner(v)[0] >= -1e-12) {
    const [mn, mx] = corner(v);
    return { s0: v[0], sx: v[1], sy: v[2], sigmaMax: mx, sigmaMin: Math.max(0, mn), compressed: 1 };
  }
  const target = [N, N * ex, N * ey];
  const sol = solvePlane((w) => contact(A, B, w), v, target, N);
  if (!sol) return null;
  const [mn, mx] = corner(sol.v);
  return { s0: sol.v[0], sx: sol.v[1], sy: sol.v[2], sigmaMax: mx, sigmaMin: Math.max(0, mn), compressed: sol.c.area / (A * B) };
}

/** Tensões sem tração numa região poligonal convexa (m) sob N com excentricidades ex, ey em relação à origem (com sinal). */
export interface PolyPressure extends Pressure { v: [number, number, number]; contato: Pt[] }

export function polyPressure(poly: Pt[], N: number, ex: number, ey: number): PolyPressure | null {
  if (N <= 0 || poly.length < 3) return null;
  const full = contactPoly(poly, [1, 0, 0]);
  if (full.area <= 1e-9) return null;
  const target = [N, N * ex, N * ey];
  const v0 = solve3(full.J, target) as [number, number, number] | null;
  const area = full.area;
  const fv = (w: [number, number, number], q: Pt) => w[0] + w[1] * q[0] + w[2] * q[1];
  const ext = (w: [number, number, number]) => { const f = poly.map((q) => fv(w, q)); return [Math.min(...f), Math.max(...f)]; };
  if (v0) {
    const [mn, mx] = ext(v0);
    if (mn >= -1e-12) return { s0: v0[0], sx: v0[1], sy: v0[2], sigmaMax: mx, sigmaMin: Math.max(0, mn), compressed: 1, v: v0, contato: poly };
  }
  if (!dentroConvexo(poly, [ex, ey])) return null;
  const start: [number, number, number] = v0 ?? [N / area, 0, 0];
  const sol = solvePlane((w) => contactPoly(poly, w), start, target, N);
  if (!sol) return null;
  const [mn, mx] = ext(sol.v);
  return { s0: sol.v[0], sx: sol.v[1], sy: sol.v[2], sigmaMax: mx, sigmaMin: Math.max(0, mn), compressed: sol.c.area / area, v: sol.v, contato: sol.c.poly };
}

/** Ponto estritamente dentro de polígono convexo (qualquer orientação). */
export function dentroConvexo(poly: Pt[], q: Pt, tol = 1e-9): boolean {
  let pos = 0, neg = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const c = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
    if (c > tol) pos++; else if (c < -tol) neg++; else return false;
  }
  return pos === 0 || neg === 0;
}

function solve3(J: number[][], b: number[]): number[] | null {
  const M = J.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 3; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k]; }
  }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
}

/**
 * Momento das tensões além das seções xc ± x1 (balanços ao longo de A), por unidade de largura total B.
 * xc: centro do pilar em relação ao centro da base (0 = centrado).
 */
function overhangMoment(pr: Pressure, A: number, B: number, x1: number, axis: 'x' | 'y', xc = 0): number {
  const [L, W] = axis === 'x' ? [A, B] : [B, A];
  const lin = axis === 'x' ? (t: number) => strip(pr.s0 + pr.sx * t, pr.sy, W)[0] : (t: number) => strip(pr.s0 + pr.sy * t, pr.sx, W)[0];
  const a = xc + x1, z = xc - x1;
  const pos = a < L / 2 ? simpson((t) => lin(t) * (t - a), a, L / 2) : 0;
  const neg = z > -L / 2 ? simpson((t) => lin(t) * (z - t), -L / 2, z) : 0;
  return Math.max(pos, neg);
}

// ---------------------------------------------------------------- σadm pelo SPT
/** σadm ≈ N̄/div (MPa), N̄ = média do SPT de z0 até z0 + bulbo (estimativa empírica, a confirmar). */
export function sptSigma(b: Boring, z0: number, bulb: number, div: number, Nmax: number): { sigma: number; Nbar: number; Nused: number; from: number; to: number } | null {
  const sel = b.meters.map((m, i) => ({ z: i + 1, N: m.N })).filter((m) => m.z > z0 + 1e-9 && m.z <= z0 + Math.max(1, bulb) + 1e-9);
  if (!sel.length) return null;
  const Nbar = sel.reduce((s, m) => s + m.N, 0) / sel.length;
  const Nused = Math.min(Nbar, Nmax);
  return { sigma: (Nused / div) * 1000, Nbar, Nused, from: sel[0].z, to: sel[sel.length - 1].z };
}

/** Peso mínimo do concreto de uma sapata com dimensões impostas (kN): prisma A·B·h0 (limite inferior do tronco), 0 sem altura imposta. */
export function pesoMinimoImposto(fixed: FixedDims | undefined, p: Pick<FoundationParams, 'ftH0Min'>, constH: boolean): number {
  if (!fixed?.h) return 0;
  const h0 = constH ? fixed.h : fixed.h0 ? Math.min(fixed.h, fixed.h0) : Math.min(fixed.h, ceil05(Math.max(fixed.h / 3, p.ftH0Min)));
  return 25 * fixed.A * fixed.B * h0;
}

/** σadm da sapata em função do menor lado (informada ou estimada pelo SPT, com cache por lado em cm). */
export function sigmaProvider(boring: Boring | undefined, p: FoundationParams) {
  const cache = new Map<number, ReturnType<typeof sptSigma>>();
  return (Bmin: number): { s: number; spt?: NonNullable<ReturnType<typeof sptSigma>> } | null => {
    if (p.ftSigmaMode === 'informada') return { s: p.ftSigmaAdm };
    if (!boring) return null;
    const key = Math.round(Bmin * 100);
    if (!cache.has(key)) cache.set(key, sptSigma(boring, p.ftDepth, p.ftBulb * Bmin, p.ftSptDiv, p.ftNmaxEst));
    const r = cache.get(key);
    return r ? { s: r.sigma, spt: r } : null;
  };
}

// ---------------------------------------------------------------- sapata
export interface FootingInput {
  Nk: number; NkMin: number; Mx: number; My: number; ap: number; bp: number; boring?: Boring;
  /** Pilar fora do centro: posição fixa do centro do pilar em relação ao centro da base (m; x ao longo de A). */
  offset?: [number, number];
  /**
   * Divisa e canto: lado da divisa em cada direção (−1, 0 ou 1). A face do pilar desse lado coincide com a borda da
   * base, e a excentricidade (A − ap)/2 cresce com a base. Prevalece sobre `offset` na direção em que não é 0.
   */
  edge?: [number, number];
  /** Dimensões impostas (m): a base A × B (e a altura h, h0 e a armadura, se dadas) só é verificada. */
  fixed?: FixedDims;
  /** Sapata de concreto simples: sem armadura de flexão; a altura vem da tração na flexão (NBR 6118, cap. 24). */
  simples?: boolean;
  /** Altura constante (h0 = h). */
  constH?: boolean;
  /** Vários pilares (sapata associada) ou limites: usado por `designFootingGroup` (footingsGroup.ts). */
  group?: FGroup;
}

/** Posição do centro do pilar em relação ao centro da base A × B (m). */
export function columnOffset(inp: Pick<FootingInput, 'ap' | 'bp' | 'offset' | 'edge'>, A: number, B: number): [number, number] {
  const ex = inp.edge?.[0] ? Math.sign(inp.edge[0]) * (A - inp.ap) / 2 : inp.offset?.[0] ?? 0;
  const ey = inp.edge?.[1] ? Math.sign(inp.edge[1]) * (B - inp.bp) / 2 : inp.offset?.[1] ?? 0;
  return [ex, ey];
}

export interface FlexDir {
  Md: number; T: number; As: number; AsMin: number; AsAdopt: number; dEff: number; bars: BarSet | null; width: number;
  /** Concreto simples: tensão de tração na flexão e resistência (MPa). */
  sigmaT?: number; fctd?: number;
  /** Armadura imposta pelo usuário (φ, espaçamento): área fornecida (m²) e se atende. */
  imposed?: { phi: number; s: number; As: number; ok: boolean };
  /** Associada: momento negativo entre pilares (kN·m, tração em cima) e malha superior (só se a tração passar de fctd). */
  top?: { Md: number; sigmaT: number; fctd: number; As: number; AsMin: number; bars: BarSet | null; needed: boolean };
}

export interface FootingResult {
  ok: boolean; messages: string[];
  A: number; B: number; W: number; Wconc: number; Wsoil: number;
  sigmaAdm: number; sigmaSrc: string; spt?: { Nbar: number; Nused: number; from: number; to: number };
  cases: { label: string; N: number; ex: number; ey: number; sigmaMax: number; sigmaMin: number; compressed: number }[];
  kind: 'rigida' | 'flexivel'; h: number; h0: number; d: number; hRigid: number; lbCol: number;
  method: 'ceb70' | 'bielas'; methodNotes: string[];
  sigmaD: { max: number; min: number };
  /** Centro do pilar em relação ao centro da base (m); [0, 0] = centrada. */
  colOffset: [number, number];
  /** Dimensões impostas (só verificadas). */
  fixed?: boolean;
  /** Concreto simples; altura constante. */
  simples?: boolean; constH?: boolean;
  /** Descolamento permitido (sem a área comprimida mínima). */
  levantamento?: boolean;
  /** Sapata associada ou aparada por limites: pilares nos eixos do elemento (relativos ao centro da base), contorno em planta (relativo ao centro da base) e relações de rigidez. */
  grupo?: {
    cols: { label: string; x: number; y: number; ap: number; bp: number }[]; contorno: [number, number][];
    /** Maior vão entre pilares vizinhos (m), v/h, maior balanço (m) e b/h. */
    vao: number; vaoAltura: number; balanco: number; balancoAltura: number;
    /** Punção/compressão diagonal por pilar (MPa). */
    pilares: { label: string; Nd: number; tauSd0: number; tauRd2: number }[];
    /** Limites que atuaram (índices dos segmentos em `FGroup.limits`) e os ignorados com o motivo. */
    limitesUsados: number[]; limitesIgnorados: { indice: number; motivo: string }[];
    /** Posição da resultante em relação ao centro da base (m). */
    resultante: [number, number];
  };
  flex: { x: FlexDir; y: FlexDir };
  punch: { tauSd0: number; tauRd2: number; applies: boolean; tauSd1?: number; tauRd1?: number; Fred?: number; u1?: number };
  volume: number;
}

const kTable = (r: number) => { const t = [[0.5, 0.45], [1, 0.6], [2, 0.7], [3, 0.8]]; if (r <= 0.5) return 0.45; if (r >= 3) return 0.8; for (let i = 1; i < t.length; i++) if (r <= t[i][0]) return t[i - 1][1] + ((r - t[i - 1][0]) / (t[i][0] - t[i - 1][0])) * (t[i][1] - t[i - 1][1]); return 0.8; };

/**
 * Sapata isolada. O peso próprio entra como ftPP% de Nk; se o peso do concreto calculado for maior,
 * a sapata é refeita com o peso calculado (até convergir).
 */
export function designFooting(inp: FootingInput, p: FoundationParams): FootingResult | { ok: false; messages: string[] } {
  const W0 = (p.ftPP / 100) * inp.Nk;
  let r = sizeFooting(inp, p, W0);
  // dimensões impostas: o peso do concreto é conhecido; o percentual pode ser pouco (o peso também estabiliza a base)
  const Wi = pesoMinimoImposto(inp.fixed, p, !!inp.constH);
  if (!isFooting(r) && Wi > W0 + 1e-6) r = sizeFooting(inp, p, Math.ceil(Wi));
  for (let it = 0; it < 6 && isFooting(r) && r.Wconc > r.W + 0.5; it++) r = sizeFooting(inp, p, Math.ceil(r.Wconc));
  if (isFooting(r) && r.W > W0 + 1e-6) r.messages.unshift(`Peso do concreto (${r.Wconc.toFixed(0)} kN) maior que ${p.ftPP}% de Nk (${W0.toFixed(0)} kN): usado o peso calculado, ${r.W.toFixed(0)} kN.`);
  return r;
}

function sizeFooting(inp: FootingInput, p: FoundationParams, W: number): FootingResult | { ok: false; messages: string[] } {
  const { ap, bp } = inp;
  const messages: string[] = [];
  const cases = [
    { label: 'N máx + peso próprio', N: inp.Nk + W },
    { label: 'N mín + peso próprio', N: inp.NkMin + W },
  ];
  if (cases[1].N <= 0) return { ok: false, messages: ['N mín + peso próprio ≤ 0: a sapata não resiste à tração. Use estacas ou tubulão.'] };
  const sigmaFor = sigmaProvider(inp.boring, p);
  // momentos em relação ao centro da base: os do pilar mais N do pilar × excentricidade do pilar (a favor da segurança, somados em módulo)
  const momentsAt = (A: number, B: number, Ncol: number) => { const [ex, ey] = columnOffset(inp, A, B); return { My: Math.abs(inp.My) + Math.abs(Ncol * ex), Mx: Math.abs(inp.Mx) + Math.abs(Ncol * ey) }; };
  const Ncols = [inp.Nk, inp.NkMin];
  const check = (A: number, B: number) => {
    const sg = sigmaFor(Math.min(A, B));
    if (!sg) return null;
    if (cases[0].N / (A * B) > sg.s + 1e-9) return null;
    const out = [];
    for (const [i, cs] of cases.entries()) {
      const M = momentsAt(A, B, Ncols[i]);
      const pr = basePressure(A, B, cs.N, M.My / cs.N, M.Mx / cs.N);
      if (!pr || pr.sigmaMax > p.ftEdgeFactor * sg.s + 1e-6 || pr.compressed < (p.ftLevantamento ? 0 : p.ftMinCompressed) - 1e-6) return null;
      out.push({ label: cs.label, N: cs.N, ex: M.My / cs.N, ey: M.Mx / cs.N, sigmaMax: pr.sigmaMax, sigmaMin: pr.sigmaMin, compressed: pr.compressed });
    }
    return { sg, out };
  };
  // busca em passos de 5 cm: menor área; entre as de área até 3% maior, balanços mais próximos
  const lmin = 0.6, step = 0.05, lmax = 8;
  const cand: { A: number; B: number; area: number; dc: number }[] = [];
  const over = (A: number, B: number) => { const [ex, ey] = columnOffset(inp, A, B); return [A / 2 + Math.abs(ex) - ap / 2, B / 2 + Math.abs(ey) - bp / 2]; };
  if (inp.fixed) cand.push({ A: inp.fixed.A, B: inp.fixed.B, area: inp.fixed.A * inp.fixed.B, dc: 0 });
  else for (let A = Math.max(lmin, ceil05(ap + 0.1)); A <= lmax + 1e-9; A += step) for (let B = Math.max(lmin, ceil05(bp + 0.1)); B <= lmax + 1e-9; B += step) {
    const a = Math.round(A * 100) / 100, b = Math.round(B * 100) / 100;
    if (a / b > p.ftMaxRatio + 1e-9 || b / a > p.ftMaxRatio + 1e-9) continue;
    const [ca, cb] = over(a, b);
    cand.push({ A: a, B: b, area: a * b, dc: Math.abs(ca - cb) });
  }
  // empate: lado maior na direção da maior excentricidade (A ao longo de x, momento My)
  const dirPref = Math.sign(Math.abs(inp.My) - Math.abs(inp.Mx));
  cand.sort((x, y) => x.area - y.area || x.dc - y.dc || dirPref * ((y.A - y.B) - (x.A - x.B)));
  let best: (typeof cand)[number] & { chk: NonNullable<ReturnType<typeof check>> } | null = null;
  let firstArea = Infinity;
  for (const c of cand) {
    if (c.area > firstArea * 1.03) break;
    const chk = check(c.A, c.B);
    if (!chk) continue;
    if (firstArea === Infinity) firstArea = c.area;
    if (!best || c.dc < best.dc - 1e-9 || (Math.abs(c.dc - best.dc) < 1e-9 && Math.abs(c.area - best.area) < 1e-9 && dirPref * ((c.A - c.B) - (best.A - best.B)) > 0)) best = { ...c, chk };
  }
  if (!best) {
    const sg = sigmaFor(inp.fixed ? Math.min(inp.fixed.A, inp.fixed.B) : 1);
    if (!sg) return { ok: false, messages: [`Sem SPT abaixo da cota de apoio (${p.ftDepth} m) para estimar σadm.`] };
    return { ok: false, messages: [inp.fixed ? `As dimensões impostas ${inp.fixed.A.toFixed(2)} × ${inp.fixed.B.toFixed(2)} m não atendem σadm, área comprimida e excentricidade.` : `Nenhuma sapata até ${lmax} × ${lmax} m atende σadm, área comprimida e excentricidade.`] };
  }
  const { A, B } = best;
  const sg = best.chk.sg;
  const sigmaSrc = p.ftSigmaMode === 'informada' ? 'informada' : `estimada pelo SPT: N̄/${p.ftSptDiv} MPa (a confirmar)`;
  if (sg.spt && sg.spt.Nbar < 5) messages.push(`N̄ = ${sg.spt.Nbar.toFixed(1)} < 5 no bulbo: solo fraco para sapata (estimativa fora do campo usual).`);
  if (sg.spt && sg.spt.Nbar > p.ftNmaxEst) messages.push(`N̄ = ${sg.spt.Nbar.toFixed(1)} limitado a ${p.ftNmaxEst} na estimativa de σadm.`);

  // altura
  const c = concrete(p.fckFound, p.gammaC);
  const cSimples = concrete(p.fckFound, p.gammaC * p.ftSimplesGamma);
  const fyd = p.fyk / p.gammaS;
  const lbCol = anchorageLength(p.colPhi, c, fyd);
  const colOffset = columnOffset(inp, A, B);
  // balanços: o maior de cada direção (centrada: (A − ap)/2)
  const [cA, cB] = over(A, B);
  const hRigid = ((2 * Math.max(cA, cB)) / 3) * (1.5 / p.ftBalancoAltura);
  const gf = p.gammaF;
  const M0 = momentsAt(A, B, inp.Nk);
  const Nd = gf * inp.Nk, Mdx = gf * M0.Mx, Mdy = gf * M0.My;
  const prD = basePressure(A, B, Nd, Mdy / Nd, Mdx / Nd);
  if (!prD) return { ok: false, messages: ['Excentricidade de cálculo fora da base.'] };
  const methodNotes: string[] = [];
  const centered = Math.abs(colOffset[0]) < 1e-9 && Math.abs(colOffset[1]) < 1e-9;
  const bielas = p.ftMethod === 'bielas' && centered && !inp.simples;
  if (p.ftMethod === 'bielas' && !centered) methodNotes.push('Método das bielas só vale para pilar centrado: usado o CEB-70.');

  const dOf = (h: number) => h - p.cover - 0.01;
  const flexure = (h: number, kind: 'rigida' | 'flexivel') => {
    const d = dOf(h);
    const dir = (axis: 'x' | 'y'): FlexDir => {
      const [L, Wd, a0, cc] = axis === 'x' ? [A, B, ap, cA] : [B, A, bp, cB];
      const width = Wd - 2 * p.cover;
      const AsMin = p.ftRhoMin * Wd * h;
      let Md = 0, T = 0, As = 0, dEff = d;
      if (bielas && kind === 'rigida') {
        const NdEq = prD.sigmaMax * A * B;
        T = (NdEq * (L - a0)) / (8 * d);
        As = T / 1000 / fyd;
      } else {
        const x1 = a0 / 2 - 0.15 * a0;
        // a pressão máxima fica do lado +: o pilar excêntrico vai para esse lado (a carga excêntrica comprime o lado do pilar)
        Md = overhangMoment(prD, A, B, x1, axis, Math.abs(axis === 'x' ? colOffset[0] : colOffset[1]));
        dEff = Math.min(d, 1.5 * cc);
        As = beamFlexure({ kind: 'rect', bw: Wd, h: dEff + p.cover + 0.01 }, false, Md, dEff, 0.05, c, fyd).As;
      }
      if (inp.simples) {
        // concreto simples (NBR 6118, cap. 24): sem armadura; a tração na flexão não passa de fctd
        const sigmaT = (6 * (Md / 1000)) / (Wd * h * h);
        return { Md, T: 0, As: 0, AsMin: 0, AsAdopt: 0, dEff: h, bars: null, width, sigmaT, fctd: cSimples.fctd };
      }
      const AsAdopt = Math.max(As, p.ftRhoMinReduz ? Math.min(AsMin, (4 / 3) * As) : AsMin);
      const imp = inp.fixed?.bars?.[axis];
      if (imp) {
        // armadura imposta: n = largura útil/s + 1 barras; só verificada
        const ab = barArea(imp.phi), s = imp.s ?? 0.15, n = imp.n ?? Math.max(2, Math.floor(width / s + 1e-9) + 1), Aprov = n * ab;
        return { Md, T, As, AsMin, AsAdopt, dEff, bars: { phi: imp.phi, n, As: Aprov, spacing: n > 1 ? width / (n - 1) : 0 }, width, imposed: { phi: imp.phi, s, As: Aprov, ok: Aprov >= AsAdopt - 1e-9 } };
      }
      return { Md, T, As, AsMin, AsAdopt, dEff, bars: bestBars(spacedBars(AsAdopt, width)), width };
    };
    return { x: dir('x'), y: dir('y') };
  };
  const punching = (h: number, flex: { x: FlexDir; y: FlexDir }) => {
    const d = dOf(h);
    // pilar na divisa: a face junto à borda não entra no contorno C
    const u0 = 2 * (ap + bp) - (inp.edge?.[0] ? bp : 0) - (inp.edge?.[1] ? ap : 0);
    const tauSd0 = Nd / 1000 / (u0 * d);
    const tauRd2 = 0.27 * (1 - p.fckFound / 250) * c.fcd;
    const applies = cA >= 2 * d && cB >= 2 * d;
    if (!applies) return { tauSd0, tauRd2, applies };
    const areaC1 = ap * bp + 4 * d * (ap + bp) + 4 * Math.PI * d * d;
    const Fred = Nd - (Nd / (A * B)) * areaC1;
    const u1 = 2 * (ap + bp) + 4 * Math.PI * d;
    const Wp = (C1: number, C2: number) => (C1 * C1) / 2 + C1 * C2 + 4 * C2 * d + 16 * d * d + 2 * Math.PI * d * C1;
    const tauSd1 = (Fred / (u1 * d) + (kTable(ap / bp) * Mdy) / (Wp(ap, bp) * d) + (kTable(bp / ap) * Mdx) / (Wp(bp, ap) * d)) / 1000;
    const rx = (flex.x.bars?.As ?? flex.x.AsAdopt) / (B * d), ry = (flex.y.bars?.As ?? flex.y.AsAdopt) / (A * d);
    const rho = Math.min(0.02, Math.sqrt(rx * ry));
    const tauRd1 = 0.13 * (1 + Math.sqrt(20 / (d * 100))) * (100 * rho * p.fckFound) ** (1 / 3);
    return { tauSd0, tauRd2, applies, tauSd1, tauRd1, Fred, u1 };
  };

  let kind = p.ftKind;
  let h: number;
  if (inp.simples && kind !== 'rigida') { kind = 'rigida'; messages.push('Concreto simples: a sapata é rígida (sem armadura de flexão).'); }
  if (inp.simples && !inp.fixed?.h) {
    // altura pela tração na flexão: σt = 6·Md/(b·h²) ≤ fctd; Md independe de h no CEB-70
    const mom = (axis: 'x' | 'y') => {
      const [Wd, a0] = axis === 'x' ? [B, ap] : [A, bp];
      return { Md: overhangMoment(prD, A, B, a0 / 2 - 0.15 * a0, axis, Math.abs(axis === 'x' ? colOffset[0] : colOffset[1])), Wd };
    };
    const hT = Math.max(...(['x', 'y'] as const).map((ax) => { const m = mom(ax); return Math.sqrt((6 * (m.Md / 1000)) / (m.Wd * cSimples.fctd)); }));
    h = ceil05(Math.max(hRigid, lbCol + p.cover, hT));
  } else if (inp.fixed?.h) {
    h = inp.fixed.h;
    kind = h >= hRigid - 1e-9 ? 'rigida' : 'flexivel';
    if (h < lbCol + p.cover - 1e-9) messages.push(`Altura imposta ${h.toFixed(2)} m < lb + c = ${(lbCol + p.cover).toFixed(2)} m (ancoragem das barras do pilar).`);
  } else if (kind === 'rigida') h = ceil05(Math.max(hRigid, lbCol + p.cover));
  else {
    h = ceil05(Math.max(0.3, lbCol + p.cover));
    for (; h < 3; h = Math.round((h + 0.05) * 100) / 100) {
      const pu = punching(h, flexure(h, 'flexivel'));
      if (pu.tauSd0 <= pu.tauRd2 && (!pu.applies || pu.tauSd1! <= pu.tauRd1!)) break;
    }
    if (h >= hRigid - 1e-9) { kind = 'rigida'; messages.push(`A altura necessária (punção e ancoragem do pilar, lb + c = ${(lbCol + p.cover).toFixed(2)} m) deu h = ${h.toFixed(2)} m ≥ (a − ap)/3: a sapata resultou rígida.`); }
  }
  const flex = flexure(h, kind);
  const punch = punching(h, flex);
  const h0 = inp.constH || kind !== 'rigida' ? h : inp.fixed?.h0 ? Math.min(h, inp.fixed.h0) : Math.min(h, ceil05(Math.max(h / 3, p.ftH0Min)));
  if (bielas && kind === 'rigida') {
    const d = dOf(h);
    if (d < Math.max(A - ap, B - bp) / 4 - 1e-9) methodNotes.push(`Bielas: d = ${d.toFixed(2)} m < (a − ap)/4 = ${(Math.max(A - ap, B - bp) / 4).toFixed(2)} m — fora do campo do método.`);
    methodNotes.push('Bielas com a tensão de cálculo máxima aplicada em toda a base (Nd,eq = σd,máx·A·B), a favor da segurança com momento.');
  } else {
    if (bielas) methodNotes.push('Método das bielas só vale para sapata rígida: usado o CEB-70.');
    const cmax = Math.max(cA, cB);
    if (cmax < 0.5 * h - 1e-9) methodNotes.push(`CEB-70: balanço ${cmax.toFixed(2)} m < h/2 — sapata muito rígida, fora do campo do método (preferir bielas).`);
    if (cmax > 2 * h + 1e-9) methodNotes.push(`CEB-70: balanço ${cmax.toFixed(2)} m > 2h — fora do campo do método (calcular como placa).`);
  }
  if (punch.tauSd0 > punch.tauRd2 + 1e-9) messages.push(`Compressão diagonal no contorno do pilar: τSd = ${punch.tauSd0.toFixed(2)} > τRd2 = ${punch.tauRd2.toFixed(2)} MPa. Aumente h ou o pilar.`);
  if (kind === 'flexivel' && punch.applies && punch.tauSd1! > punch.tauRd1! + 1e-9) messages.push(`Punção no contorno C′: τSd = ${punch.tauSd1!.toFixed(2)} > τRd1 = ${punch.tauRd1!.toFixed(2)} MPa.`);
  if (!inp.simples && (!flex.x.bars || !flex.y.bars)) messages.push('Armadura de flexão não coube com espaçamento entre 10 e 20 cm.');
  for (const [ax, f] of [['x', flex.x], ['y', flex.y]] as const) {
    if (f.imposed && !f.imposed.ok) messages.push(`Armadura imposta insuficiente na direção ${ax}: φ${fmtN(f.imposed.phi)} c/${(f.imposed.s * 100).toFixed(0)} dá ${(f.imposed.As * 1e4).toFixed(2)} cm² < ${(f.AsAdopt * 1e4).toFixed(2)} cm² necessários.`);
    if (inp.simples && f.sigmaT! > f.fctd! + 1e-9) messages.push(`Concreto simples: tração na flexão ${f.sigmaT!.toFixed(2)} MPa > fctd = ${f.fctd!.toFixed(2)} MPa na direção ${ax}. Aumente h.`);
  }
  if (p.ftLevantamento) methodNotes.push(`Descolamento permitido: área comprimida mínima dispensada (menor encontrada ${(Math.min(...best.chk.out.map((o) => o.compressed)) * 100).toFixed(0)} %); a tensão máxima limita.`);
  const A1 = A * B, A2 = (ap + 0.05) * (bp + 0.05);
  const volume = kind === 'rigida' ? A * B * h0 + ((h - h0) / 3) * (A1 + A2 + Math.sqrt(A1 * A2)) : A * B * h;
  const Wconc = 25 * volume, Wsoil = p.gammaSoil * Math.max(0, A * B * p.ftDepth - volume);
  if (Wconc <= W + 0.5 && Wconc + Wsoil > W + 1e-6) messages.push(`Concreto + solo sobre a sapata somam ${(Wconc + Wsoil).toFixed(0)} kN, acima dos ${W.toFixed(0)} kN adotados: o percentual só cobre o acréscimo líquido se σadm for líquida (o solo reaterrado substitui o escavado). Confirme o critério.`);
  const anchOk = !inp.fixed?.h || h >= lbCol + p.cover - 1e-9;
  const impOk = [flex.x, flex.y].every((f) => !f.imposed || f.imposed.ok);
  const simplesOk = !inp.simples || [flex.x, flex.y].every((f) => f.sigmaT! <= f.fctd! + 1e-9);
  const ok = anchOk && impOk && simplesOk && punch.tauSd0 <= punch.tauRd2 + 1e-9 && !(kind === 'flexivel' && punch.applies && punch.tauSd1! > punch.tauRd1! + 1e-9) && (inp.simples || (!!flex.x.bars && !!flex.y.bars));
  return {
    ok, messages, A, B, W, Wconc, Wsoil, sigmaAdm: sg.s, sigmaSrc, spt: sg.spt ? { Nbar: sg.spt.Nbar, Nused: sg.spt.Nused, from: sg.spt.from, to: sg.spt.to } : undefined,
    cases: best.chk.out, kind, h, h0, d: dOf(h), hRigid, lbCol, method: bielas && kind === 'rigida' ? 'bielas' : 'ceb70', methodNotes,
    sigmaD: { max: prD.sigmaMax, min: prD.sigmaMin }, colOffset, ...(inp.fixed ? { fixed: true } : {}),
    ...(inp.simples ? { simples: true } : {}), ...(inp.constH ? { constH: true } : {}), ...(p.ftLevantamento ? { levantamento: true } : {}), flex, punch, volume,
  };
}

const fmtN = (v: number) => String(v).replace('.', ',');

export const isFooting = (r: ReturnType<typeof designFooting>): r is FootingResult => 'A' in r;
