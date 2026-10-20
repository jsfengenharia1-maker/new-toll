// Sapatas isoladas rígidas e flexíveis (NBR 6122 / NBR 6118, itens 22.6 e 19.5).
// Planta pela tensão admissível do solo (informada ou estimada pelo SPT), base sem tração (área comprimida),
// altura rígida h ≥ (a − ap)/3, flexão pelo CEB-70 (padrão) ou bielas (Lebelle), punção nas flexíveis.
// x ao longo de A (lado do momento My), y ao longo de B (momento Mx). Unidades: kN, m, kPa; tensões de cálculo em MPa.
import { beamFlexure, concrete } from './concrete';
import { anchorageLength, bestBars, ceil05, spacedBars, type BarSet } from './rebar';
import type { Boring, FoundationParams } from './piles';

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

/** Retângulo A × B recortado pelo semiplano s0 + sx·x + sy·y ≥ 0 e suas propriedades geométricas (exatas). */
function contact(A: number, B: number, v: [number, number, number]) {
  const f = (x: number, y: number) => v[0] + v[1] * x + v[2] * y;
  const rect: [number, number][] = [[-A / 2, -B / 2], [A / 2, -B / 2], [A / 2, B / 2], [-A / 2, B / 2]];
  const poly: [number, number][] = [];
  for (let i = 0; i < 4; i++) {
    const P = rect[i], Q = rect[(i + 1) % 4];
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
  return { area: a, J, F };
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
  let ct = contact(A, B, v);
  let r = ct.F.map((x, i) => x - target[i]), nr = Math.hypot(...r);
  for (let it = 0; it < 100 && nr > 1e-10 * N; it++) {
    const dv = solve3(ct.J, r.map((x) => -x));
    if (!dv) return null;
    let t = 1, ok = false;
    for (let ls = 0; ls < 40; ls++) {
      const w: [number, number, number] = [v[0] + t * dv[0], v[1] + t * dv[1], v[2] + t * dv[2]];
      const cw = contact(A, B, w);
      const rw = cw.F.map((x, i) => x - target[i]), nw = Math.hypot(...rw);
      if (nw < nr) { v = w; ct = cw; r = rw; nr = nw; ok = true; break; }
      t /= 2;
    }
    if (!ok) break;
  }
  if (nr > 1e-6 * N) return null;
  const [mn, mx] = corner(v);
  return { s0: v[0], sx: v[1], sy: v[2], sigmaMax: mx, sigmaMin: Math.max(0, mn), compressed: ct.area / (A * B) };
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
  /** Dimensões impostas (m): a base A × B (e a altura h, se dada) só é verificada. */
  fixed?: { A: number; B: number; h?: number };
}

/** Posição do centro do pilar em relação ao centro da base A × B (m). */
export function columnOffset(inp: Pick<FootingInput, 'ap' | 'bp' | 'offset' | 'edge'>, A: number, B: number): [number, number] {
  const ex = inp.edge?.[0] ? Math.sign(inp.edge[0]) * (A - inp.ap) / 2 : inp.offset?.[0] ?? 0;
  const ey = inp.edge?.[1] ? Math.sign(inp.edge[1]) * (B - inp.bp) / 2 : inp.offset?.[1] ?? 0;
  return [ex, ey];
}

export interface FlexDir { Md: number; T: number; As: number; AsMin: number; AsAdopt: number; dEff: number; bars: BarSet | null; width: number }

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
  const sigmaCache = new Map<number, ReturnType<typeof sptSigma>>();
  const sigmaFor = (Bmin: number): { s: number; spt?: ReturnType<typeof sptSigma> } | null => {
    if (p.ftSigmaMode === 'informada') return { s: p.ftSigmaAdm };
    if (!inp.boring) return null;
    const key = Math.round(Bmin * 100);
    if (!sigmaCache.has(key)) sigmaCache.set(key, sptSigma(inp.boring, p.ftDepth, p.ftBulb * Bmin, p.ftSptDiv, p.ftNmaxEst));
    const r = sigmaCache.get(key);
    return r ? { s: r.sigma, spt: r } : null;
  };
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
      if (!pr || pr.sigmaMax > p.ftEdgeFactor * sg.s + 1e-6 || pr.compressed < p.ftMinCompressed - 1e-6) return null;
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
  const fyd = p.fyk / p.gammaS;
  const lbCol = anchorageLength(p.colPhi, c, fyd);
  const colOffset = columnOffset(inp, A, B);
  // balanços: o maior de cada direção (centrada: (A − ap)/2)
  const [cA, cB] = over(A, B);
  const hRigid = (2 * Math.max(cA, cB)) / 3;
  const gf = p.gammaF;
  const M0 = momentsAt(A, B, inp.Nk);
  const Nd = gf * inp.Nk, Mdx = gf * M0.Mx, Mdy = gf * M0.My;
  const prD = basePressure(A, B, Nd, Mdy / Nd, Mdx / Nd);
  if (!prD) return { ok: false, messages: ['Excentricidade de cálculo fora da base.'] };
  const methodNotes: string[] = [];
  const centered = Math.abs(colOffset[0]) < 1e-9 && Math.abs(colOffset[1]) < 1e-9;
  const bielas = p.ftMethod === 'bielas' && centered;
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
      const AsAdopt = Math.max(As, AsMin);
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
  if (inp.fixed?.h) {
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
  const h0 = kind === 'rigida' ? Math.min(h, ceil05(Math.max(h / 3, p.ftH0Min))) : h;
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
  if (!flex.x.bars || !flex.y.bars) messages.push('Armadura de flexão não coube com espaçamento entre 10 e 20 cm.');
  const A1 = A * B, A2 = (ap + 0.05) * (bp + 0.05);
  const volume = kind === 'rigida' ? A * B * h0 + ((h - h0) / 3) * (A1 + A2 + Math.sqrt(A1 * A2)) : A * B * h;
  const Wconc = 25 * volume, Wsoil = p.gammaSoil * Math.max(0, A * B * p.ftDepth - volume);
  if (Wconc <= W + 0.5 && Wconc + Wsoil > W + 1e-6) messages.push(`Concreto + solo sobre a sapata somam ${(Wconc + Wsoil).toFixed(0)} kN, acima dos ${W.toFixed(0)} kN adotados: o percentual só cobre o acréscimo líquido se σadm for líquida (o solo reaterrado substitui o escavado). Confirme o critério.`);
  const anchOk = !inp.fixed?.h || h >= lbCol + p.cover - 1e-9;
  const ok = anchOk && punch.tauSd0 <= punch.tauRd2 + 1e-9 && !(kind === 'flexivel' && punch.applies && punch.tauSd1! > punch.tauRd1! + 1e-9) && !!flex.x.bars && !!flex.y.bars;
  return {
    ok, messages, A, B, W, Wconc, Wsoil, sigmaAdm: sg.s, sigmaSrc, spt: sg.spt ? { Nbar: sg.spt.Nbar, Nused: sg.spt.Nused, from: sg.spt.from, to: sg.spt.to } : undefined,
    cases: best.chk.out, kind, h, h0, d: dOf(h), hRigid, lbCol, method: bielas && kind === 'rigida' ? 'bielas' : 'ceb70', methodNotes,
    sigmaD: { max: prD.sigmaMax, min: prD.sigmaMin }, colOffset, ...(inp.fixed ? { fixed: true } : {}), flex, punch, volume,
  };
}

export const isFooting = (r: ReturnType<typeof designFooting>): r is FootingResult => 'A' in r;
