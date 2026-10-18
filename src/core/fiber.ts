// Seções poligonais: propriedades geométricas (fórmulas de Green) e ELU de concreto armado por fibras
// com flexão oblíqua real (linha neutra inclinada), usada em pilares circulares, em L e de forma qualquer.
// Coordenadas da seção: x = largura (fora do plano do pórtico), y = altura (no plano do pórtico). Metros.
import { ES, type Concrete } from './concrete';

export type Pt = [number, number];

export interface PolyProps { A: number; cx: number; cy: number; Ix: number; Iy: number; xmin: number; xmax: number; ymin: number; ymax: number }

/** Área, centróide e momentos de inércia centroidais (Ix em torno do eixo horizontal, flexão no plano). */
export function polyProps(pts: Pt[]): PolyProps {
  let A = 0, Sx = 0, Sy = 0, Ixx = 0, Iyy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    const cr = x0 * y1 - x1 * y0;
    A += cr; Sx += (x0 + x1) * cr; Sy += (y0 + y1) * cr;
    Ixx += (y0 * y0 + y0 * y1 + y1 * y1) * cr; Iyy += (x0 * x0 + x0 * x1 + x1 * x1) * cr;
  }
  A /= 2;
  const sgn = Math.sign(A) || 1;
  const cx = Sx / (6 * A), cy = Sy / (6 * A);
  const Ix = (sgn * Ixx) / 12 - Math.abs(A) * cy * cy, Iy = (sgn * Iyy) / 12 - Math.abs(A) * cx * cx;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { A: Math.abs(A), cx, cy, Ix, Iy, xmin: Math.min(...xs), xmax: Math.max(...xs), ymin: Math.min(...ys), ymax: Math.max(...ys) };
}

export function pointInPoly(p: Pt, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Polígono deslocado para dentro de `d` (esquina por esquadro; válido para polígonos simples sem arestas curtas). */
export function insetPolygon(pts: Pt[], d: number): Pt[] {
  const ccw = polySigned(pts) > 0 ? 1 : -1;
  const n = pts.length;
  return pts.map((_, i) => {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const e1 = norm([p1[0] - p0[0], p1[1] - p0[1]]), e2 = norm([p2[0] - p1[0], p2[1] - p1[1]]);
    // normais internas
    const n1: Pt = [-e1[1] * ccw, e1[0] * ccw], n2: Pt = [-e2[1] * ccw, e2[0] * ccw];
    const bis = norm([n1[0] + n2[0], n1[1] + n2[1]]);
    const cos = bis[0] * n1[0] + bis[1] * n1[1];
    const k = d / Math.max(cos, 0.2);
    return [p1[0] + bis[0] * k, p1[1] + bis[1] * k] as Pt;
  });
}
const polySigned = (pts: Pt[]) => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
const norm = (v: Pt): Pt => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

/** Polígono regular aproximando o círculo de diâmetro D (centro em D/2, D/2). */
export function circlePolygon(D: number, n = 48): Pt[] {
  return Array.from({ length: n }, (_, k) => [D / 2 + (D / 2) * Math.cos((2 * Math.PI * k) / n), D / 2 + (D / 2) * Math.sin((2 * Math.PI * k) / n)] as Pt);
}

/** Seção em L: aba horizontal b1 × t1 na base e alma vertical t2 × h no lado esquerdo. */
export function lPolygon(b: number, h: number, tw: number, tf: number): Pt[] {
  return [[0, 0], [b, 0], [b, tf], [tw, tf], [tw, h], [0, h]];
}

export interface Fiber { x: number; y: number; A: number }
export interface RBar { x: number; y: number; A: number }

/** Malha de fibras: células de uma grade regular cujo centro está dentro do polígono (área corrigida para a exata). */
export function fiberMesh(pts: Pt[], n = 28): Fiber[] {
  const p = polyProps(pts);
  const dx = (p.xmax - p.xmin) / n, dy = (p.ymax - p.ymin) / n;
  const out: Fiber[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const c: Pt = [p.xmin + (i + 0.5) * dx, p.ymin + (j + 0.5) * dy];
    if (pointInPoly(c, pts)) out.push({ x: c[0], y: c[1], A: dx * dy });
  }
  const sum = out.reduce((s, f) => s + f.A, 0) || 1;
  for (const f of out) f.A *= p.A / sum;
  return out;
}

function sigmaC(e: number, c: Concrete) {
  if (e <= 0) return 0;
  if (e >= c.ec2) return c.sigmaCd;
  return c.sigmaCd * (1 - (1 - e / c.ec2) ** c.n);
}

export interface FiberSection { mesh: Fiber[]; bars: RBar[]; cx: number; cy: number; c: Concrete; fyd: number; poly: Pt[] }

/** Esforços (MN, MN·m) para a linha neutra perpendicular a u = (cos θ, sin θ) e parâmetro de domínio t ∈ [0, 3]. */
function stateForces(S: FiberSection, theta: number, t: number) {
  const ux = Math.cos(theta), uy = Math.sin(theta);
  const sOf = (x: number, y: number) => (x - S.cx) * ux + (y - S.cy) * uy;
  let sMax = -Infinity, sMin = Infinity, sBar = Infinity;
  for (const p of S.poly) { const s = sOf(p[0], p[1]); sMax = Math.max(sMax, s); sMin = Math.min(sMin, s); }
  for (const b of S.bars) sBar = Math.min(sBar, sOf(b.x, b.y));
  const h = sMax - sMin, d = Math.max(sMax - sBar, 0.9 * h);
  const c = S.c;
  let top: number, bot: number; // deformações na fibra mais comprimida (profundidade 0) e em h
  if (t <= 1) { top = -0.01 + (0.01 + c.ecu) * t; bot = top + ((-0.01 - top) * h) / d; }
  else if (t <= 2) { top = c.ecu; bot = (c.ecu + ((-0.01 - c.ecu) * h) / d) * (2 - t); }
  else { const yC = (1 - c.ec2 / c.ecu) * h, b2 = c.ec2 * (t - 2), sl = (b2 - c.ec2) / (h - yC); top = c.ec2 - sl * yC; bot = b2; }
  const eps = (s: number) => top + ((bot - top) * (sMax - s)) / h;
  let N = 0, Mx = 0, My = 0;
  for (const f of S.mesh) { const F = sigmaC(eps(sOf(f.x, f.y)), c) * f.A; N += F; Mx += F * (f.x - S.cx); My += F * (f.y - S.cy); }
  for (const b of S.bars) {
    const e = eps(sOf(b.x, b.y));
    const F = (Math.max(-S.fyd, Math.min(S.fyd, ES * e)) - sigmaC(e, c)) * b.A;
    N += F; Mx += F * (b.x - S.cx); My += F * (b.y - S.cy);
  }
  return { N, Mx, My };
}

/** Faixa de normal resistente (MN, compressão +). */
export function fiberAxialRange(S: FiberSection) {
  return { NRc: stateForces(S, Math.PI / 2, 3).N, NRt: stateForces(S, Math.PI / 2, 0).N };
}

/**
 * Momento resistente (MN·m) na direção do momento solicitante (mx, my) — componentes do "lado comprimido":
 * mx > 0 comprime x+, my > 0 comprime y+ — para a normal Nd (MN, compressão +). null se Nd fora da faixa.
 */
export function fiberCapacity(S: FiberSection, NdMN: number, mx: number, my: number): number | null {
  const target = Math.atan2(my, mx);
  const atN = (theta: number) => {
    const lo0 = stateForces(S, theta, 0).N, hi0 = stateForces(S, theta, 3).N;
    if (NdMN < lo0 || NdMN > hi0) return null;
    let lo = 0, hi = 3;
    for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; if (stateForces(S, theta, m).N < NdMN) lo = m; else hi = m; }
    return stateForces(S, theta, (lo + hi) / 2);
  };
  const ang = (theta: number) => { const r = atN(theta); if (!r) return null; let d = Math.atan2(r.My, r.Mx) - target; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return { d, r }; };
  let a = target - Math.PI / 2.2, b = target + Math.PI / 2.2;
  let fa = ang(a), fb = ang(b);
  if (!fa || !fb) { const r = atN(target); return r ? Math.hypot(r.Mx, r.My) : null; }
  if (fa.d * fb.d > 0) { const r = atN(target)!; return Math.hypot(r.Mx, r.My); }
  let best = fa;
  for (let it = 0; it < 24; it++) {
    const m = (a + b) / 2, fm = ang(m);
    if (!fm) break;
    best = fm;
    if (Math.abs(fm.d) < 1e-4) break;
    if (fa.d * fm.d <= 0) { b = m; fb = fm; } else { a = m; fa = fm; }
  }
  return Math.hypot(best.r.Mx, best.r.My);
}
