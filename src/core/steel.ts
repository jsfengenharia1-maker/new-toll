// Verificação de barras de aço — ABNT NBR 8800:2008 (perfis I laminados duplamente simétricos, tubos circulares e caixões).
// Unidades internas: MN, m, MPa.
import type { SectionShape } from './types';

export const E_STEEL = 200000;
export const G_STEEL = 77000;

export interface SteelProps { A: number; Ix: number; Iy: number; Zx: number; Wx: number; rx: number; ry: number; J: number; Cw: number; Aw: number }

export function steelProps(s: SectionShape): SteelProps | null {
  if (s.kind === 'ishape') {
    const hw = s.h - 2 * s.tf;
    const A = 2 * s.bf * s.tf + hw * s.tw;
    const Ix = (s.bf * s.h ** 3 - (s.bf - s.tw) * hw ** 3) / 12;
    const Iy = (2 * s.tf * s.bf ** 3) / 12 + (hw * s.tw ** 3) / 12;
    const Zx = s.bf * s.tf * (s.h - s.tf) + (s.tw * hw ** 2) / 4;
    const J = (2 * s.bf * s.tf ** 3 + hw * s.tw ** 3) / 3;
    const Cw = (Iy * (s.h - s.tf) ** 2) / 4;
    return { A, Ix, Iy, Zx, Wx: (2 * Ix) / s.h, rx: Math.sqrt(Ix / A), ry: Math.sqrt(Iy / A), J, Cw, Aw: s.h * s.tw };
  }
  if (s.kind === 'tube') {
    const di = s.d - 2 * s.t;
    const A = (Math.PI * (s.d ** 2 - di ** 2)) / 4;
    const I = (Math.PI * (s.d ** 4 - di ** 4)) / 64;
    const Z = (s.d ** 3 - di ** 3) / 6;
    const r = Math.sqrt(I / A);
    return { A, Ix: I, Iy: I, Zx: Z, Wx: (2 * I) / s.d, rx: r, ry: r, J: 2 * I, Cw: 0, Aw: A / 2 };
  }
  if (s.kind === 'box') {
    const bi = s.b - 2 * s.t, hi = s.h - 2 * s.t;
    const A = s.b * s.h - bi * hi;
    const Ix = (s.b * s.h ** 3 - bi * hi ** 3) / 12;
    const Iy = (s.h * s.b ** 3 - hi * bi ** 3) / 12;
    const Zx = (s.b * s.h ** 2) / 4 - (bi * hi ** 2) / 4;
    const Am = (s.b - s.t) * (s.h - s.t);
    const J = (4 * Am ** 2 * s.t) / (2 * ((s.b - s.t) + (s.h - s.t)));
    return { A, Ix, Iy, Zx, Wx: (2 * Ix) / s.h, rx: Math.sqrt(Ix / A), ry: Math.sqrt(Iy / A), J, Cw: 0, Aw: 2 * s.h * s.t };
  }
  return null;
}

export interface SteelCombo { name: string; N: number; Mmax: number; MA: number; MB: number; MC: number; Mend0: number; MendL: number; V: number; transverse: boolean } // kN, kN·m (MA..MC nos quartos)

export interface SteelInput { shape: SectionShape; fy: number; gammaA1: number; L: number; leIn: number; leOut: number; combos: SteelCombo[] }

export interface SteelCheck {
  combo: string; NSd: number; NRd: number; MSd: number; MRd: number; VSd: number; VRd: number; B1: number; Cb: number; interaction: number; util: number;
}

export interface SteelDesign {
  ok: boolean; status: 'ok' | 'fail' | 'review'; util: number; Q: number; chi: number; lambda0: number; slenderness: number;
  NcRd: number; NtRd: number; MRd: number; VRd: number; check: SteelCheck | null; checks: SteelCheck[]; messages: string[]; limits: string[];
}

export function designSteel(inp: SteelInput): SteelDesign {
  const p = steelProps(inp.shape);
  const messages: string[] = [], limits: string[] = [];
  const empty: SteelDesign = { ok: false, status: 'review', util: 0, Q: 1, chi: 1, lambda0: 0, slenderness: 0, NcRd: 0, NtRd: 0, MRd: 0, VRd: 0, check: null, checks: [], messages, limits };
  if (!p) { messages.push('Verificação em aço disponível para perfil I, tubo circular e caixão.'); return empty; }
  const { fy, gammaA1: g } = inp;
  const E = E_STEEL, s = inp.shape;
  const rt = Math.sqrt(E / fy);
  // flambagem local (Anexo F)
  let Qs = 1, Qa = 1;
  if (s.kind === 'ishape') {
    const bt = s.bf / 2 / s.tf;
    if (bt > 0.56 * rt) Qs = bt <= 1.03 * rt ? 1.415 - 0.74 * bt / rt : (0.69 * E) / (fy * bt ** 2);
    const hw = s.h - 2 * s.tf, ht = hw / s.tw;
    if (ht > 1.49 * rt) {
      const bef = Math.min(hw, 1.92 * s.tw * rt * (1 - (0.34 / ht) * rt));
      Qa = (p.A - (hw - bef) * s.tw) / p.A;
    }
    limits.push(`mesa b/t = ${bt.toFixed(1)} (limite ${(0.56 * rt).toFixed(1)}); alma h/tw = ${ht.toFixed(1)} (limite ${(1.49 * rt).toFixed(1)})`);
  } else if (s.kind === 'tube') {
    const dt = s.d / s.t;
    if (dt > 0.45 * E / fy) { messages.push(`Tubo com D/t = ${dt.toFixed(0)} > 0,45E/fy: não permitido.`); return { ...empty, status: 'fail' }; }
    if (dt > 0.11 * E / fy) Qs = (0.038 * E) / (fy * dt) + 2 / 3;
    limits.push(`D/t = ${dt.toFixed(1)} (limite compacto ${(0.11 * E / fy).toFixed(1)})`);
  } else if (s.kind === 'box') {
    let Aef = p.A;
    for (const [w, n] of [[s.b, 2], [s.h, 2]] as const) {
      const bw = w - 3 * s.t, bt = bw / s.t;
      if (bt > 1.4 * rt) { const bef = Math.min(bw, 1.92 * s.t * rt * (1 - (0.38 / bt) * rt)); Aef -= n * (bw - bef) * s.t; }
    }
    Qa = Aef / p.A;
    limits.push(`paredes b/t = ${((s.b - 3 * s.t) / s.t).toFixed(1)} / ${((s.h - 3 * s.t) / s.t).toFixed(1)} (limite ${(1.4 * rt).toFixed(1)})`);
  }
  const Q = Qs * Qa;
  // compressão (5.3)
  const Nex = (Math.PI ** 2 * E * p.Ix) / inp.leIn ** 2;
  const Ney = (Math.PI ** 2 * E * p.Iy) / inp.leOut ** 2;
  let Ne = Math.min(Nex, Ney);
  if (s.kind === 'ishape') {
    const r0 = Math.sqrt(p.rx ** 2 + p.ry ** 2);
    const Nez = ((Math.PI ** 2 * E * p.Cw) / inp.leOut ** 2 + G_STEEL * p.J) / r0 ** 2;
    Ne = Math.min(Ne, Nez);
  }
  const lambda0 = Math.sqrt((Q * p.A * fy) / Ne);
  const chi = lambda0 <= 1.5 ? 0.658 ** (lambda0 ** 2) : 0.877 / lambda0 ** 2;
  const NcRd = (chi * Q * p.A * fy) / g;
  const NtRd = (p.A * fy) / g;
  const slenderness = Math.max(inp.leIn / p.rx, inp.leOut / p.ry);
  if (slenderness > 200) messages.push(`Esbeltez KL/r = ${slenderness.toFixed(0)} > 200 (limite para barras comprimidas).`);
  // flexão (Anexo G) e cisalhamento (5.4.3)
  const Mpl = p.Zx * fy;
  const sr = 0.3 * fy;
  const MRkFor = (Cb: number) => {
    const caps: number[] = [Mpl];
    if (s.kind === 'ishape') {
      const Lb = inp.leOut;
      const lam = Lb / p.ry, lp = 1.76 * rt;
      const b1 = ((fy - sr) * p.Wx) / (E * p.J);
      const lr = ((1.38 * Math.sqrt(p.Iy * p.J)) / (p.ry * p.J * b1)) * Math.sqrt(1 + Math.sqrt(1 + (27 * p.Cw * b1 ** 2) / p.Iy));
      const Mr = (fy - sr) * p.Wx;
      const Mcr = ((Cb * Math.PI ** 2 * E * p.Iy) / Lb ** 2) * Math.sqrt((p.Cw / p.Iy) * (1 + (0.039 * p.J * Lb ** 2) / p.Cw));
      caps.push(lam <= lp ? Mpl : lam <= lr ? Math.min(Mpl, Cb * (Mpl - ((Mpl - Mr) * (lam - lp)) / (lr - lp))) : Math.min(Mpl, Mcr));
      const lf = s.bf / 2 / s.tf, lpf = 0.38 * rt, lrf = 0.83 * Math.sqrt(E / (fy - sr));
      caps.push(lf <= lpf ? Mpl : lf <= lrf ? Mpl - ((Mpl - Mr) * (lf - lpf)) / (lrf - lpf) : (0.69 * E * p.Wx) / lf ** 2);
      const lw = (s.h - 2 * s.tf) / s.tw, lpw = 3.76 * rt, lrw = 5.7 * rt;
      if (lw > lrw) messages.push('Alma esbelta (h/tw > 5,70√(E/fy)): exige Anexo H. Resultado indicativo.');
      caps.push(lw <= lpw ? Mpl : Mpl - ((Mpl - fy * p.Wx) * (Math.min(lw, lrw) - lpw)) / (lrw - lpw));
    } else if (s.kind === 'tube') {
      const dt = s.d / s.t;
      if (dt > 0.07 * E / fy) caps.push(dt <= 0.31 * E / fy ? ((0.021 * E) / dt + fy) * p.Wx : (0.33 * E * p.Wx) / dt);
    } else if (s.kind === 'box') {
      const lf = (s.b - 3 * s.t) / s.t, lpf = 1.12 * rt, lrf = 1.4 * rt;
      if (lf > lpf) caps.push(Mpl - ((Mpl - (fy - sr) * p.Wx) * (Math.min(lf, lrf) - lpf)) / (lrf - lpf));
      const lw = (s.h - 3 * s.t) / s.t, lpw = 2.42 * rt, lrw = 5.7 * rt;
      if (lw > lpw) caps.push(Mpl - ((Mpl - fy * p.Wx) * (Math.min(lw, lrw) - lpw)) / (lrw - lpw));
    }
    return Math.min(...caps, 1.5 * p.Wx * fy) / g;
  };
  let VRd: number;
  {
    const Vpl = 0.6 * p.Aw * fy;
    if (s.kind === 'ishape' || s.kind === 'box') {
      const lam = s.kind === 'ishape' ? (s.h - 2 * s.tf) / s.tw : (s.h - 3 * s.t) / s.t;
      const lp = 1.1 * Math.sqrt((5 * E) / fy), lr = 1.37 * Math.sqrt((5 * E) / fy);
      VRd = (lam <= lp ? Vpl : lam <= lr ? (lp / lam) * Vpl : 1.24 * (lp / lam) ** 2 * Vpl) / g;
    } else VRd = Vpl / g;
  }
  const checks: SteelCheck[] = [];
  for (const cb of inp.combos) {
    const N = -cb.N / 1000; // compressão +
    const Mmax = Math.abs(cb.Mmax) / 1000;
    const Cb = inp.leOut >= inp.L - 1e-9 && Mmax > 0 ? Math.min(3, (12.5 * Mmax) / (2.5 * Mmax + 3 * Math.abs(cb.MA / 1000) + 4 * Math.abs(cb.MB / 1000) + 3 * Math.abs(cb.MC / 1000))) : 1;
    const MRd = MRkFor(Cb);
    let B1 = 1;
    if (N > 0) {
      const a0 = Math.abs(cb.Mend0), aL = Math.abs(cb.MendL);
      const M2 = Math.max(a0, aL), M1 = Math.min(a0, aL);
      const ratio = M2 > 0 ? (cb.Mend0 * cb.MendL > 0 ? M1 / M2 : -M1 / M2) : 0;
      const Cm = cb.transverse ? 1 : 0.6 - 0.4 * -ratio; // curvatura simples → razão negativa na convenção da norma
      const Ne1 = (Math.PI ** 2 * E * p.Ix) / inp.L ** 2;
      B1 = N < Ne1 ? Math.max(1, Cm / (1 - N / Ne1)) : 99;
    }
    const MSd = Mmax * B1;
    const NRd = N >= 0 ? NcRd : NtRd;
    const nr = Math.abs(N) / NRd;
    const inter = nr >= 0.2 ? nr + (8 / 9) * (MSd / MRd) : nr / 2 + MSd / MRd;
    const vr = Math.abs(cb.V) / 1000 / VRd;
    checks.push({ combo: cb.name, NSd: N * 1000, NRd: NRd * 1000, MSd: MSd * 1000, MRd: MRd * 1000, VSd: Math.abs(cb.V), VRd: VRd * 1000, B1, Cb, interaction: inter, util: Math.max(inter, vr) });
  }
  const check = checks.reduce((m, k) => (k.util > (m?.util ?? -1) ? k : m), null as SteelCheck | null);
  const util = check?.util ?? 0;
  const ok = util <= 1 && slenderness <= 200;
  const status: SteelDesign['status'] = !ok ? 'fail' : messages.some((m) => m.includes('indicativo')) ? 'review' : 'ok';
  return { ok, status, util, Q, chi, lambda0, slenderness, NcRd: NcRd * 1000, NtRd: NtRd * 1000, MRd: MRkFor(1) * 1000, VRd: VRd * 1000, check, checks, messages, limits };
}
