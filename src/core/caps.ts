// Blocos de coroamento rígidos sobre 1 a 6 estacas — método das bielas e tirantes (Blévot; NBR 6118, item 22.7).
// Disposições iguais às de piles.ts (blockCoords). Unidades: kN, m; tensões em MPa.
import { barArea, concrete } from './concrete';
import { anchorageLength, bandBars, bestBars, ceil05, spacedBars, type BarSet } from './rebar';
import type { FoundationParams } from './piles';

/** Pilar de um bloco com vários pilares: centro relativo ao centro do estaqueamento (m), seção e carga característica (kN) da combinação de projeto. */
export interface CapCol { label: string; x: number; y: number; ap: number; bp: number; Nk: number }

export interface CapInput {
  n: number; coords: [number, number][]; D: number; s: number;
  Nk: number; Mx: number; My: number; // característicos no topo do bloco
  ap: number; bp: number; // pilar (m), ap ao longo de x
  WbAssumed?: number; // peso do bloco adotado na distribuição das cargas (kN)
  /** Vários pilares (FU3): bielas e tirantes por pilar, com as estacas pela resultante. */
  cols?: CapCol[];
  /** Dimensões impostas (m): o bloco só é verificado. `bars`: φ (mm) e n barras por tirante (direção x, y ou oblíqua). */
  fixed?: { lx: number; ly: number; h: number; bars?: { phi: number; n: number } };
}

/** Biela de um pilar a uma estaca (bloco com vários pilares). */
export interface CapStrut { col: number; pile: number; F: number; top: [number, number]; arm: number; theta: number }

export interface CapTie {
  a: number; b: number; // índices das estacas
  T: number; // kN, cálculo
  As: number; // m²
  dir: 'x' | 'y' | 'oblíqua';
  options: BarSet[]; bars: BarSet | null;
  lbNec: number; lbAvail: number; // ancoragem com gancho a partir da face interna da estaca
}

export interface CapResult {
  n: number; lx: number; ly: number; h: number; d: number; dPrime: number; volume: number; weight: number; WbAssumed?: number;
  Nd: number; NdEq: number; Rd: number; // kN: γf·Nk, n·Rd e maior reação de cálculo por estaca
  R: number[]; // reação de cálculo de cada estaca (kN)
  K: number; KR: number; fcd: number; sigmaLim: number;
  strutCol: number; strutPile: number; // MPa
  theta: number[]; thetaMin: number; thetaMax: number; // graus (estaca central: 90)
  arms: number[]; tops: ([number, number] | null)[];
  dMin: number; dMax: number; lbCol: number;
  ties: CapTie[];
  mesh: { x: { As: number; bars: BarSet | null }; y: { As: number; bars: BarSet | null } } | null;
  top?: { As: number; bars: BarSet | null };
  skin?: { AsFace: number; bars: BarSet | null };
  stirrups?: { aswS: number; phi: number; s: number; legs: number };
  susp: { need: boolean; AsTot: number };
  /** Bloco com vários pilares: bielas por pilar e a verificação de cada pilar. */
  multi?: { struts: CapStrut[]; cols: { label: string; Nd: number; NdEq: number; sigma: number; thetaMin: number; ok: boolean }[]; residuo: number };
  /** Dimensões impostas (só verificadas). */
  fixed?: boolean;
  single?: { a: number; Rst: [number, number]; As: [number, number]; bars: [BarSet | null, BarSet | null]; colLim: number; colSigma: number; pileLim: number; pileSigma: number };
  ok: boolean; messages: string[];
}

export const capK = (n: number, p: FoundationParams) => (n <= 2 ? p.capK2 : n === 3 ? p.capK3 : n === 4 ? p.capK4 : n === 5 ? p.capK5 : p.capK6);

/** Tirantes sobre as estacas (pares de índices de blockCoords). */
export const CAP_TIES: Record<number, [number, number][]> = {
  2: [[0, 1]],
  3: [[0, 1], [1, 2], [2, 0]],
  4: [[0, 1], [1, 2], [2, 3], [3, 0]],
  5: [[1, 2], [2, 3], [3, 4], [4, 1]],
  6: [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [2, 5], [1, 4]],
};

/**
 * Ponto de partida de cada biela no topo: centróide da parte da seção do pilar voltada para a estaca
 * (partição angular). Reproduz ap/4 (2 estacas), (ap/4, bp/4) (4 estacas) e ≈ 0,3·ap (3 estacas).
 */
export function strutTops(coords: [number, number][], ap: number, bp: number, G = 60): ([number, number] | null)[] {
  const dirs = coords.map(([x, y]) => (Math.hypot(x, y) > 1e-9 ? Math.atan2(y, x) : null));
  const acc = coords.map(() => ({ x: 0, y: 0, n: 0 }));
  const wrap = (a: number) => { let v = a % (2 * Math.PI); if (v > Math.PI) v -= 2 * Math.PI; if (v < -Math.PI) v += 2 * Math.PI; return Math.abs(v); };
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
    const cx = -ap / 2 + ((i + 0.5) * ap) / G, cy = -bp / 2 + ((j + 0.5) * bp) / G;
    const ang = Math.atan2(cy, cx);
    let best = -1, bd = Infinity;
    dirs.forEach((d, k) => { if (d === null) return; const v = wrap(ang - d); if (v < bd - 1e-12) { bd = v; best = k; } });
    if (best >= 0) { acc[best].x += cx; acc[best].y += cy; acc[best].n++; }
  }
  return coords.map((_, k) => (dirs[k] === null ? null : acc[k].n ? [acc[k].x / acc[k].n, acc[k].y / acc[k].n] : [0, 0]));
}

/** Resolve o equilíbrio horizontal dos nós (estacas) da treliça plana de tirantes por mínimos quadrados. */
function solveTies(coords: [number, number][], edges: [number, number][], h: [number, number][]): number[] {
  const m = edges.length, n = coords.length;
  const A: number[][] = Array.from({ length: 2 * n }, () => new Array(m).fill(0));
  edges.forEach(([a, b], e) => {
    const dx = coords[b][0] - coords[a][0], dy = coords[b][1] - coords[a][1], L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L;
    A[2 * a][e] += ux; A[2 * a + 1][e] += uy; A[2 * b][e] -= ux; A[2 * b + 1][e] -= uy;
  });
  const rhs = h.flatMap(([x, y]) => [-x, -y]);
  const N = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => A.reduce((s, r) => s + r[i] * r[j], 0)));
  const v = Array.from({ length: m }, (_, i) => A.reduce((s, r, k) => s + r[i] * rhs[k], 0));
  for (let c = 0; c < m; c++) {
    let piv = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(N[r][c]) > Math.abs(N[piv][c])) piv = r;
    [N[c], N[piv]] = [N[piv], N[c]]; [v[c], v[piv]] = [v[piv], v[c]];
    for (let r = 0; r < m; r++) {
      if (r === c || Math.abs(N[c][c]) < 1e-14) continue;
      const f = N[r][c] / N[c][c];
      for (let k = c; k < m; k++) N[r][k] -= f * N[c][k];
      v[r] -= f * v[c];
    }
  }
  return v.map((x, i) => x / N[i][i]);
}

export function designCap(inp: CapInput, p: FoundationParams): CapResult {
  const { n, coords, D, ap, bp } = inp;
  const messages: string[] = [];
  const c = concrete(p.fckFound, p.gammaC);
  const fcd = c.fcd, fyd = p.fyk / p.gammaS;
  const gf = p.gammaF;
  const Sx = coords.reduce((a, [x]) => a + x * x, 0), Sy = coords.reduce((a, [, y]) => a + y * y, 0);
  const R = coords.map(([x, y]) => gf * (inp.Nk / n + (Sx > 1e-9 ? (Math.abs(inp.My) * Math.abs(x)) / Sx : 0) + (Sy > 1e-9 ? (Math.abs(inp.Mx) * Math.abs(y)) / Sy : 0)));
  const Rd = Math.max(...R);
  const Nd = gf * inp.Nk, NdEq = n * Rd;
  const lbCol = anchorageLength(p.colPhi, c, fyd);
  const Ae = (Math.PI * D * D) / 4;
  const KR = p.capKR, K = capK(n, p);
  const xs = coords.map(([x]) => x), ys = coords.map(([, y]) => y);
  let lx = Math.max(...xs) - Math.min(...xs) + D + 2 * p.capEdge;
  let ly = Math.max(...ys) - Math.min(...ys) + D + 2 * p.capEdge;
  lx = Math.max(ceil05(lx), ceil05(ap + 0.1)); ly = Math.max(ceil05(ly), ceil05(bp + 0.1));
  const cols = inp.cols && inp.cols.length > 1 ? inp.cols : null;
  if (cols) {
    // o bloco cobre todos os pilares (centrado no estaqueamento)
    lx = Math.max(lx, ceil05(2 * Math.max(...cols.map((q) => Math.abs(q.x) + q.ap / 2)) + 0.1));
    ly = Math.max(ly, ceil05(2 * Math.max(...cols.map((q) => Math.abs(q.y) + q.bp / 2)) + 0.1));
  }
  const fx = inp.fixed;
  if (fx) {
    if (fx.lx < Math.max(...xs) - Math.min(...xs) + D - 1e-9) messages.push(`Bloco imposto ${fx.lx.toFixed(2)} m menor que o estaqueamento (${(Math.max(...xs) - Math.min(...xs) + D).toFixed(2)} m em x).`);
    if (fx.ly < Math.max(...ys) - Math.min(...ys) + D - 1e-9) messages.push(`Bloco imposto ${fx.ly.toFixed(2)} m menor que o estaqueamento (${(Math.max(...ys) - Math.min(...ys) + D).toFixed(2)} m em y).`);
    lx = fx.lx; ly = fx.ly;
  }

  if (n === 1) {
    const a = Math.max(lx, ly);
    const h = fx?.h ? fx.h : ceil05(Math.max(p.cap1Ratio * a, lbCol + p.cover));
    const Rst: [number, number] = [0.25 * Nd * Math.max(0, a - ap) / a, 0.25 * Nd * Math.max(0, a - bp) / a];
    const As: [number, number] = [Rst[0] / 1000 / fyd, Rst[1] / 1000 / fyd];
    // estribos horizontais fechados (2 ramos por direção) distribuídos na altura
    const hoop = (A: number) => bestBars([8, 10, 12.5, 16].map((phi) => {
      const ab = (Math.PI * (phi / 1000) ** 2) / 4;
      const k = Math.max(3, Math.ceil(A / (2 * ab) - 1e-9));
      return { phi, n: k, As: 2 * k * ab, spacing: (h - 2 * p.cover) / (k - 1) };
    }).filter((o) => o.spacing >= 0.05));
    const Ac0 = ap * bp, colLim = fcd * Math.min(Math.sqrt(Math.min((a / ap) ** 2, (a / bp) ** 2)), 3.3);
    const colSigma = Nd / 1000 / Ac0;
    const pileLim = fcd * Math.min(a / (0.886 * D), 3.3), pileSigma = Nd / 1000 / Ae;
    const ok = colSigma <= colLim + 1e-9 && pileSigma <= pileLim + 1e-9;
    if (colSigma > colLim) messages.push(`Pressão do pilar ${colSigma.toFixed(1)} MPa > ${colLim.toFixed(1)} MPa (área parcialmente carregada).`);
    if (pileSigma > pileLim) messages.push(`Pressão na cabeça da estaca ${pileSigma.toFixed(1)} MPa > ${pileLim.toFixed(1)} MPa.`);
    const volume = a * a * h, weight = 25 * volume;
    if (inp.WbAssumed !== undefined && weight > inp.WbAssumed + 1e-6) messages.push(`Peso real do bloco (${weight.toFixed(0)} kN) maior que o adotado na distribuição (${inp.WbAssumed.toFixed(0)} kN): aumente o % de peso do bloco.`);
    return {
      n, lx: a, ly: a, h, d: h - p.cover, dPrime: p.cover, volume, weight, WbAssumed: inp.WbAssumed, Nd, NdEq: Nd, Rd: Nd, R: [Nd], K, KR, fcd, sigmaLim: colLim,
      strutCol: colSigma, strutPile: pileSigma, theta: [90], thetaMin: 90, thetaMax: 90, arms: [0], tops: [null], dMin: 0, dMax: Infinity, lbCol,
      ties: [], mesh: null, susp: { need: false, AsTot: 0 },
      single: { a, Rst, As, bars: [hoop(As[0]), hoop(As[1])], colLim, colSigma, pileLim, pileSigma },
      ok, messages,
    };
  }

  // bielas: cada uma de um pilar a uma estaca; pilar único: a estaca mais carregada em todas (Nd,eq = n·Rd)
  const sz = coords.length;
  type Strut = { col: number; pile: number; F: number; top: [number, number] | null; arm: number };
  let struts: Strut[];
  let colDims: { ap: number; bp: number; label: string; Nd: number; NdEq: number }[];
  if (!cols) {
    const t0 = strutTops(coords, ap, bp);
    struts = coords.map(([x, y], j) => ({ col: 0, pile: j, F: Rd, top: t0[j], arm: t0[j] ? Math.hypot(x - t0[j]![0], y - t0[j]![1]) : 0 }));
    colDims = [{ ap, bp, label: '', Nd, NdEq }];
  } else {
    // cargas dos pilares (ELU) levadas às estacas por ajuste bi-proporcional ao inverso do quadrado da distância,
    // com as reações das estacas R (momentos em módulo) e os pilares escalados para o mesmo total (a confirmar)
    const Nc = cols.map((q) => gf * q.Nk), somaN = Nc.reduce((a, v) => a + v, 0), somaR = R.reduce((a, v) => a + v, 0);
    const Nesc = Nc.map((v) => (v * somaR) / somaN);
    const w = cols.map((q) => coords.map(([x, y]) => 1 / ((q.x - x) ** 2 + (q.y - y) ** 2 + 0.0625) ** 2));
    for (let it = 0; it < 200; it++) {
      for (let i = 0; i < cols.length; i++) { const t = w[i].reduce((a, v) => a + v, 0); w[i] = w[i].map((v) => (v * Nesc[i]) / t); }
      for (let j = 0; j < sz; j++) { const t = w.reduce((a, r) => a + r[j], 0); for (let i = 0; i < cols.length; i++) w[i][j] = (w[i][j] * R[j]) / t; }
    }
    struts = [];
    cols.forEach((q, i) => {
      // bielas pequenas (< 5 % da carga do pilar) somam-se às demais do pilar
      const usadas = coords.map((_, j) => j).filter((j) => w[i][j] >= 0.05 * Nesc[i]);
      const mant = usadas.reduce((a, j) => a + w[i][j], 0);
      for (const j of usadas) w[i][j] = (w[i][j] * Nesc[i]) / mant;
      const rel = usadas.map((j) => [coords[j][0] - q.x, coords[j][1] - q.y] as [number, number]);
      const tp = strutTops(rel, q.ap, q.bp);
      usadas.forEach((j, k) => {
        const top: [number, number] | null = tp[k] ? [q.x + tp[k]![0], q.y + tp[k]![1]] : null;
        struts.push({ col: i, pile: j, F: w[i][j], top, arm: top ? Math.hypot(coords[j][0] - top[0], coords[j][1] - top[1]) : 0 });
      });
    });
    colDims = cols.map((q, i) => ({ ap: q.ap, bp: q.bp, label: q.label, Nd: Nc[i], NdEq: Nesc[i] }));
  }
  const outer = struts.filter((q) => q.arm > 1e-9);
  const tmin = (p.capThetaMin * Math.PI) / 180, tmax = (p.capThetaMax * Math.PI) / 180;
  const dMin = Math.max(...outer.map((q) => q.arm)) * Math.tan(tmin), dMax = Math.min(...outer.map((q) => q.arm)) * Math.tan(tmax);
  const dPrime = Math.max(p.capDprime, (0.886 * D) / 5);
  const dReq = Math.max(dMin, lbCol);
  const h = fx?.h ? fx.h : ceil05(dReq + dPrime);
  const d = h - dPrime;
  if (d > dMax + 1e-9) messages.push(`d = ${d.toFixed(2)} m > ${dMax.toFixed(2)} m: biela mais inclinada que ${p.capThetaMax}°${lbCol > dMin ? ' (altura governada pela ancoragem das barras do pilar)' : ''}.`);
  if (fx?.h && d < dMin - 1e-9) messages.push(`Bloco imposto: d = ${d.toFixed(2)} m < ${dMin.toFixed(2)} m — biela com inclinação menor que ${p.capThetaMin}°.`);
  const thetaOf = (q: Strut) => (q.arm > 1e-9 ? (Math.atan(d / q.arm) * 180) / Math.PI : 90);
  // por estaca: menor inclinação das bielas que chegam; arm e topo da biela mais carregada
  const theta = coords.map((_, j) => Math.min(90, ...struts.filter((q) => q.pile === j).map(thetaOf)));
  const arms = coords.map((_, j) => { const q = struts.filter((u) => u.pile === j).sort((a, b) => b.F - a.F)[0]; return q ? q.arm : 0; });
  const tops = coords.map((_, j) => { const q = struts.filter((u) => u.pile === j).sort((a, b) => b.F - a.F)[0]; return q ? q.top : null; });
  const thOuter = outer.map(thetaOf);
  const thetaMin = Math.min(...thOuter), thetaMax = Math.max(...thOuter);
  const sin2 = (deg: number) => Math.sin((deg * Math.PI) / 180) ** 2;
  const sigmaLim = K * KR * fcd;
  let strutCol: number, strutPile: number;
  let multi: CapResult['multi'];
  if (!cols) {
    strutCol = NdEq / 1000 / (ap * bp * sin2(thetaMin));
    strutPile = Math.max(...theta.map((t) => Rd / 1000 / (Ae * sin2(t))));
  } else {
    const porCol = colDims.map((cd, i) => {
      const th = Math.min(90, ...struts.filter((q) => q.col === i).map(thetaOf));
      const sigma = cd.NdEq / 1000 / (cd.ap * cd.bp * sin2(th));
      return { label: cd.label, Nd: cd.Nd, NdEq: cd.NdEq, sigma, thetaMin: th, ok: sigma <= sigmaLim + 1e-9 };
    });
    strutCol = Math.max(...porCol.map((q) => q.sigma));
    strutPile = Math.max(...coords.map((_, j) => Math.max(R[j], struts.filter((q) => q.pile === j).reduce((a, q) => a + q.F, 0)) / 1000 / (Ae * sin2(theta[j]))));
    multi = { struts: struts.map((q) => ({ col: q.col, pile: q.pile, F: q.F, top: q.top ?? [cols[q.col].x, cols[q.col].y], arm: q.arm, theta: thetaOf(q) })), cols: porCol, residuo: 0 };
    const ruim = porCol.find((q) => !q.ok);
    if (ruim) messages.push(`Biela junto ao pilar ${ruim.label}: ${ruim.sigma.toFixed(1)} MPa > ${sigmaLim.toFixed(1)} MPa. Aumente o pilar, o fck ou a altura.`);
  }
  if (!cols && strutCol > sigmaLim) messages.push(`Biela junto ao pilar: ${strutCol.toFixed(1)} MPa > ${sigmaLim.toFixed(1)} MPa. Aumente o pilar, o fck ou a altura.`);
  if (strutPile > sigmaLim) messages.push(`Biela junto à estaca: ${strutPile.toFixed(1)} MPa > ${sigmaLim.toFixed(1)} MPa. Aumente o diâmetro da estaca ou o fck.`);

  // tirantes: força horizontal das bielas em cada estaca (pilar único: a estaca mais carregada em todas)
  const hv: [number, number][] = coords.map(([x, y], j) => {
    let hx = 0, hy = 0;
    for (const q of struts) if (q.pile === j && q.top) { hx += (q.F * (x - q.top[0])) / d; hy += (q.F * (y - q.top[1])) / d; }
    return [hx, hy];
  });
  const edges = CAP_TIES[n] ?? [];
  const T = solveTies(coords, edges, hv);
  if (multi) {
    // resíduo do equilíbrio horizontal dos nós pelos tirantes (kN): a malha de tirantes é fixa por nº de estacas
    const res = hv.map(([hx, hy], j) => {
      let rx = hx, ry = hy;
      edges.forEach(([a, b], e) => {
        const dx = coords[b][0] - coords[a][0], dy = coords[b][1] - coords[a][1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
        if (a === j) { rx += T[e] * ux; ry += T[e] * uy; }
        if (b === j) { rx -= T[e] * ux; ry -= T[e] * uy; }
      });
      return Math.hypot(rx, ry);
    });
    multi.residuo = Math.max(...res);
    const tot = hv.reduce((a, [hx, hy]) => a + Math.hypot(hx, hy), 0);
    if (tot > 0 && multi.residuo > 0.1 * tot / sz) messages.push(`Equilíbrio horizontal dos tirantes aproximado (resíduo ${multi.residuo.toFixed(0)} kN): verifique a disposição pilares × estacas.`);
  }
  const band = p.capBand * D;
  let impOk = true;
  const lb = (phi: number) => anchorageLength(phi, c, fyd);
  const ties: CapTie[] = edges.map(([a, b], e) => {
    const dx = coords[b][0] - coords[a][0], dy = coords[b][1] - coords[a][1], L = Math.hypot(dx, dy);
    const dir: CapTie['dir'] = Math.abs(dx / L) > 0.99 ? 'x' : Math.abs(dy / L) > 0.99 ? 'y' : 'oblíqua';
    const Te = Math.max(0, T[e]);
    if (T[e] < -1e-6) messages.push(`Tirante ${a + 1}–${b + 1} comprimido no modelo (${T[e].toFixed(1)} kN): revisar.`);
    const As = Te / 1000 / fyd;
    const options = bandBars(As, band, p.dmax);
    let bars = bestBars(options.filter((o) => o.phi >= 10).length ? options.filter((o) => o.phi >= 10) : options);
    if (fx?.bars && As > 0) {
      // armadura imposta: n barras φ por tirante; só verificada
      const Aprov = fx.bars.n * barArea(fx.bars.phi);
      if (Aprov < As - 1e-9) { impOk = false; messages.push(`Armadura imposta insuficiente no tirante ${a + 1}–${b + 1}: ${fx.bars.n}φ${String(fx.bars.phi).replace('.', ',')} = ${(Aprov * 1e4).toFixed(2)} cm² < ${(As * 1e4).toFixed(2)} cm² necessários.`); }
      bars = { phi: fx.bars.phi, n: fx.bars.n, As: Aprov, spacing: fx.bars.n > 1 ? (band - fx.bars.phi / 1000) / (fx.bars.n - 1) : 0 };
    }
    const lbAvail = D + p.capEdge - p.cover;
    const lbNec = bars ? Math.max(0.7 * lb(bars.phi) * (As / bars.As), 0.3 * lb(bars.phi), (10 * bars.phi) / 1000, 0.1) : 0;
    if (!bars && As <= 1e-9) { /* tirante descarregado (bloco com vários pilares): sem armadura calculada */ }
    else if (!bars) messages.push(`Tirante ${a + 1}–${b + 1}: As = ${(As * 1e4).toFixed(2)} cm² não cabe na faixa de ${(band * 100).toFixed(0)} cm.`);
    else if (lbNec > lbAvail + 1e-9) messages.push(`Tirante ${a + 1}–${b + 1}: ancoragem com gancho ${(lbNec * 100).toFixed(0)} cm > ${(lbAvail * 100).toFixed(0)} cm disponíveis além da face interna da estaca.`);
    return { a, b, T: Te, As, dir, options, bars, lbNec, lbAvail };
  });

  let mesh: CapResult['mesh'] = null;
  if (n >= 3) {
    const proj = (axis: 0 | 1) => ties.reduce((s, t) => { const dx = coords[t.b][0] - coords[t.a][0], dy = coords[t.b][1] - coords[t.a][1]; return s + t.As * Math.abs((axis === 0 ? dx : dy) / Math.hypot(dx, dy)); }, 0);
    const Asx = p.capDistRatio * proj(0), Asy = p.capDistRatio * proj(1);
    mesh = { x: { As: Asx, bars: bestBars(spacedBars(Asx, ly - 2 * p.cover)) }, y: { As: Asy, bars: bestBars(spacedBars(Asy, lx - 2 * p.cover)) } };
  }
  let top: CapResult['top'], skin: CapResult['skin'], stirrups: CapResult['stirrups'];
  if (n === 2) {
    const tieAs = ties[0]?.As ?? 0;
    const w = (ties[0]?.dir === 'y' ? lx : ly);
    top = { As: p.capDistRatio * tieAs, bars: bestBars(spacedBars(p.capDistRatio * tieAs, w - 2 * p.cover)) };
    const AsFace = p.capSkinRatio * w * h;
    skin = { AsFace, bars: bestBars(spacedBars(AsFace, h - 2 * p.cover)) };
    const aswS = ((0.2 * c.fctm) / p.fyk) * w; // m²/m
    const legs = w > 0.6 ? 4 : 2;
    const st = [6.3, 8, 10, 12.5].map((phi) => ({ phi, s: Math.min(0.2, (legs * Math.PI * (phi / 1000) ** 2) / 4 / aswS) })).find((o) => o.s >= 0.1) ?? { phi: 12.5, s: 0.1 };
    stirrups = { aswS, phi: st.phi, s: Math.floor(st.s * 100) / 100, legs };
  }
  const suspNeed = inp.s > p.capSuspFactor * D + 1e-9;
  const susp = { need: suspNeed, AsTot: suspNeed ? Nd / 1000 / (1.5 * n * fyd) : 0 };
  const volume = lx * ly * h, weight = 25 * volume;
  if (inp.WbAssumed !== undefined && weight > inp.WbAssumed + 1e-6) messages.push(`Peso real do bloco (${weight.toFixed(0)} kN) maior que o adotado na distribuição (${inp.WbAssumed.toFixed(0)} kN): aumente o % de peso do bloco.`);
  const impGeom = !fx || ((!fx.h || (d >= dMin - 1e-9 && d <= dMax + 1e-9)) && lx >= Math.max(...xs) - Math.min(...xs) + D - 1e-9 && ly >= Math.max(...ys) - Math.min(...ys) + D - 1e-9);
  const ok = strutCol <= sigmaLim + 1e-9 && strutPile <= sigmaLim + 1e-9 && ties.every((t) => t.bars || t.As <= 1e-9) && impOk && impGeom && !(multi && multi.cols.some((q) => !q.ok));
  return { n, lx, ly, h, d, dPrime, volume, weight, WbAssumed: inp.WbAssumed, Nd, NdEq, Rd, R, K, KR, fcd, sigmaLim, strutCol, strutPile, theta, thetaMin, thetaMax, arms, tops, dMin, dMax, lbCol, ties, mesh, top, skin, stirrups, susp, ...(multi ? { multi } : {}), ...(fx ? { fixed: true } : {}), ok, messages };
}
