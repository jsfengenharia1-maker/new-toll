// Pilares de concreto armado de seção circular ou poligonal (ex.: em L), NBR 6118:
// mesmo pilar-padrão dos retangulares, com o ELU de seção por fibras e flexão oblíqua real
// (a capacidade é tomada na direção do momento solicitante, sem a interação simplificada α = 1,2).
import { PHI_L, PHI_T, barArea, gammaNFor, type ColumnCheck, type ColumnCombo, type ColumnDesign, type Concrete } from './concrete';
import { circlePolygon, fiberAxialRange, fiberCapacity, fiberMesh, insetPolygon, polyProps, type FiberSection, type Pt, type RBar } from './fiber';

export interface GeneralColumnInput {
  /** Polígono da seção (m); para circular use `circleD`. */
  poly?: Pt[];
  circleD?: number;
  L: number; leIn: number; leOut: number; cover: number; conc: Concrete; fyk: number; gammaS: number; dmax: number;
  combos: ColumnCombo[];
}

/** Menor espessura: menor aresta do polígono (seções ortogonais) ou o diâmetro. */
function minThickness(poly: Pt[], circleD?: number) {
  if (circleD) return circleD;
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; m = Math.min(m, Math.hypot(q[0] - p[0], q[1] - p[1])); }
  return m;
}

/** Barras ao longo do contorno interno, com espaçamento máximo `s`. */
function perimeterBars(poly: Pt[], a: number, s: number, Ab: number, circleD?: number): RBar[] {
  if (circleD) {
    const rs = circleD / 2 - a;
    const n = Math.max(6, Math.ceil((2 * Math.PI * rs) / s));
    return Array.from({ length: n }, (_, k) => ({ x: circleD / 2 + rs * Math.cos((2 * Math.PI * k) / n), y: circleD / 2 + rs * Math.sin((2 * Math.PI * k) / n), A: Ab }));
  }
  const inner = insetPolygon(poly, a);
  const out: RBar[] = [];
  for (let i = 0; i < inner.length; i++) {
    const p = inner[i], q = inner[(i + 1) % inner.length];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const n = Math.max(1, Math.ceil(L / s - 1e-9));
    for (let k = 0; k < n; k++) out.push({ x: p[0] + ((q[0] - p[0]) * k) / n, y: p[1] + ((q[1] - p[1]) * k) / n, A: Ab });
  }
  return out;
}

export function designColumnGeneral(inp: GeneralColumnInput): ColumnDesign & { bars: RBar[]; poly: Pt[] } {
  const c = inp.conc;
  const poly = inp.circleD ? circlePolygon(inp.circleD) : inp.poly!;
  const P = polyProps(poly);
  const fyd = inp.fyk / inp.gammaS;
  const Ac = inp.circleD ? (Math.PI * inp.circleD ** 2) / 4 : P.A;
  const hIn = P.ymax - P.ymin, hOut = P.xmax - P.xmin;
  const tMin = minThickness(poly, inp.circleD);
  const gn = gammaNFor(Math.min(tMin, hIn, hOut));
  const messages: string[] = [];
  const empty = { ok: false, status: 'fail' as const, util: 99, gammaN: gn, layout: null, rho: 0, AsMin: 0, AsMax: 0.04 * Ac, stirrup: null, check: null, checks: [] as ColumnCheck[], NRc: 0, messages, bars: [] as RBar[], poly };
  if (tMin < 0.14) { messages.push('Espessura abaixo de 14 cm: não permitida para pilares (NBR 6118, 13.2.3).'); return empty; }
  if (Ac < 0.036 - 1e-9) { messages.push('Área da seção abaixo de 360 cm² (NBR 6118, 13.2.3).'); return empty; }
  if (gn > 1) messages.push(`Menor dimensão < 19 cm: esforços majorados por γn = ${gn.toFixed(2)}.`);
  const iIn = Math.sqrt(P.Ix / P.A), iOut = Math.sqrt(P.Iy / P.A);
  const lamIn = inp.leIn / iIn, lamOut = inp.leOut / iOut;
  const lmax = Math.max(lamIn, lamOut);
  if (lmax > 200) { messages.push(`Esbeltez λ = ${lmax.toFixed(0)} > 200: não permitida.`); return empty; }
  const NdMax = Math.max(0, ...inp.combos.map((k) => Math.max(-k.N0, -k.NL) * gn));
  const AsMin = Math.max((0.15 * NdMax) / 1000 / fyd, 0.004 * Ac), AsMax = 0.04 * Ac;
  const mesh = fiberMesh(poly, inp.circleD ? 32 : 28);

  const evaluate = (bars: RBar[]) => {
    const S: FiberSection = { mesh, bars, cx: P.cx, cy: P.cy, c, fyd, poly };
    const cache = new Map<string, number | null>();
    const MR = (Nd: number, mx: number, my: number) => {
      const key = `${Nd.toFixed(2)}|${Math.atan2(my, mx).toFixed(3)}`;
      if (!cache.has(key)) { const v = fiberCapacity(S, Nd / 1000, mx, my); cache.set(key, v === null ? null : v * 1000); }
      return cache.get(key)!;
    };
    const checks: ColumnCheck[] = [];
    for (const cb of inp.combos) {
      const n0 = -cb.N0 * gn, nL = -cb.NL * gn, Nd = Math.max(n0, nL);
      const m0 = cb.M0 * gn, mL = cb.ML * gn, ms = cb.Mspan * gn;
      const base: ColumnCheck = { combo: cb.name, Nd, util: 0, governing: 'S1', lambdaX: lamIn, lambda1X: 35, alphaB: 1, M1dA: 0, M1dMinX: 0, M2dX: 0, MdTotX: 0, MRxx: 0, lambdaY: lamOut, M1dMinY: 0, M2dY: 0, MdTotY: 0, MRyy: 0, MxS2: 0, interaction: 0, nu: Nd / 1000 / (Ac * c.fcd) };
      if (Nd <= 0) {
        let util = 0;
        for (const [N, M] of [[n0, m0], [nL, mL]] as const) for (const sg of [1, -1]) { const R = MR(N, 0, sg); util = Math.max(util, R === null ? 99 : Math.abs(M) / Math.max(R, 1e-9)); }
        checks.push({ ...base, util, governing: 'T', MdTotX: Math.max(Math.abs(m0), Math.abs(mL), ms) });
        continue;
      }
      const aM0 = Math.abs(m0), aML = Math.abs(mL), MA = Math.max(aM0, aML), MB = Math.min(aM0, aML);
      const M1dMinX = Nd * (0.015 + 0.03 * hIn);
      let alphaB: number;
      if (cb.cantilever) { const MAs = aM0 >= aML ? m0 : mL; alphaB = Math.max(0.85, Math.min(1, 0.8 + 0.2 * (MA > 0 ? ((cb.Mmid ?? 0) * gn * Math.sign(MAs)) / MA : 0))); }
      else alphaB = cb.transverse ? 1 : Math.max(0.4, Math.min(1, 0.6 + 0.4 * (MA > 0 ? (m0 * mL > 0 ? MB / MA : -MB / MA) : 0)));
      if (MA < M1dMinX) alphaB = 1;
      const Mbase = Math.max(MA, M1dMinX);
      const lambda1X = Math.max(35, Math.min(90, (25 + (12.5 * (MA / Nd)) / hIn) / alphaB));
      const nu = Nd / 1000 / (Ac * c.fcd), nuR = nu / gn;
      const M2dX = lamIn > lambda1X ? ((Nd * inp.leIn ** 2) / 10) * Math.min(0.005 / (hIn * (nuR + 0.5)), 0.005 / hIn) : 0;
      const gn1 = lmax > 140 ? 1 + (0.01 * (lmax - 140)) / 1.4 : 1;
      const MdTotX = Math.max(alphaB * Mbase + M2dX, Mbase, ms) * gn1;
      const M1dMinY = Nd * (0.015 + 0.03 * hOut);
      const M2dY = lamOut > 35 ? ((Nd * inp.leOut ** 2) / 10) * Math.min(0.005 / (hOut * (nuR + 0.5)), 0.005 / hOut) : 0;
      const MdTotY = (M1dMinY + M2dY) * gn1;
      const MxS2 = Math.max(MA, ms) * gn1;
      const N = Nd * gn1;
      // S1: no plano, nos dois sentidos (seções sem simetria); S2: oblíqua, quatro quadrantes
      let s1 = 0, s2 = 0, MRx = Infinity, MRy = Infinity, failN = false;
      for (const sg of [1, -1]) { const R = MR(N, 0, sg); if (R === null) failN = true; else { MRx = Math.min(MRx, R); s1 = Math.max(s1, MdTotX / R); } }
      for (const sg of [1, -1]) { const R = MR(N, sg, 0); if (R !== null) MRy = Math.min(MRy, R); }
      for (const sx of [1, -1]) for (const sy of [1, -1]) {
        const mx = sx * MdTotY, my = sy * MxS2;
        const R = MR(N, mx, my);
        if (R === null) failN = true; else s2 = Math.max(s2, Math.hypot(mx, my) / R);
      }
      if (failN) { checks.push({ ...base, util: 99, governing: 'N', alphaB, M1dA: MA, M1dMinX, M2dX, MdTotX, lambda1X, M1dMinY, M2dY, MdTotY, nu, gn1 }); continue; }
      checks.push({ ...base, util: Math.max(s1, s2), governing: s1 >= s2 ? 'S1' : 'S2', lambda1X, alphaB, M1dA: MA, M1dMinX, M2dX, MdTotX, MRxx: MRx, M1dMinY, M2dY, MdTotY, MRyy: MRy, MxS2, interaction: s2, nu, gn1 });
    }
    return { util: checks.reduce((m, k) => Math.max(m, k.util), 0), checks, S };
  };

  const cands: { phi: number; s: number; bars: RBar[]; As: number }[] = [];
  for (const phi of PHI_L) {
    if (phi < 10 || phi / 1000 > tMin / 8) continue;
    const a = inp.cover + 0.0063 + phi / 2000;
    const sMin = Math.max(0.02, phi / 1000, 1.2 * inp.dmax) + phi / 1000;
    for (const s of [0.4, 0.3, 0.25, 0.2, 0.15, 0.12, 0.1, 0.08]) {
      if (s < sMin || s > Math.min(0.4, 2 * tMin) + 1e-9) continue;
      const bars = perimeterBars(poly, a, s, barArea(phi), inp.circleD);
      const As = bars.length * barArea(phi);
      if (As < AsMin || As > AsMax + 1e-12) continue;
      cands.push({ phi, s, bars, As });
    }
  }
  cands.sort((p, q) => p.As - q.As);
  let best: (typeof cands)[number] | null = null, res: ReturnType<typeof evaluate> | null = null;
  for (const cd of cands.slice(0, 60)) {
    const r = evaluate(cd.bars);
    if (!res || r.util < res.util) { res = r; best = cd; }
    if (r.util <= 1) { res = r; best = cd; break; }
  }
  if (!best || !res) { messages.push('Nenhuma disposição de armadura cabe na seção entre As,mín e 4%·Ac.'); return { ...empty, AsMin }; }
  const ok = res.util <= 1;
  let status: ColumnDesign['status'] = ok ? 'ok' : 'fail';
  if (lmax > 90) { status = 'review'; messages.push(`λ = ${lmax.toFixed(0)} > 90: exige método mais refinado (NBR 6118). Resultado indicativo.`); }
  if (!ok) messages.push('A seção não atende com até 4% de armadura. Aumente a seção.');
  if (!inp.circleD) messages.push('Esbeltez pelo raio de giração em torno dos eixos centroidais x e y da seção (não principais).');
  const check = res.checks.reduce((m, k) => (k.util > (m?.util ?? -1) ? k : m), null as ColumnCheck | null);
  const phiT = PHI_T.find((p) => p >= Math.max(5, best!.phi / 4)) ?? 10;
  const sT = Math.floor(Math.min(0.2, tMin, (12 * best.phi) / 1000) * 100) / 100;
  return {
    ok, status, util: res.util, gammaN: gn, layout: { phi: best.phi, nx: 0, ny: 0, n: best.bars.length, As: best.As, a: inp.cover + 0.0063 + best.phi / 2000 },
    rho: best.As / Ac, AsMin, AsMax, stirrup: { phi: phiT, s: sT }, check, checks: res.checks, NRc: fiberAxialRange(res.S).NRc * 1000, messages, bars: best.bars, poly,
  };
}
