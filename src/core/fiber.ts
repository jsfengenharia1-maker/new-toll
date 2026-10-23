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
  const r = 1 - e / c.ec2;
  return c.sigmaCd * (1 - (c.n === 2 ? r * r : r ** c.n));
}

export interface FiberSection { mesh: Fiber[]; bars: RBar[]; cx: number; cy: number; c: Concrete; fyd: number; poly: Pt[] }

/** Esforços (MN, MN·m) para a linha neutra perpendicular a u = (cos θ, sin θ) e parâmetro de domínio t ∈ [0, 3]. */
/** Fibras e barras em vetores (coordenadas relativas ao centro), calculados uma vez por seção. */
const vetores = new WeakMap<FiberSection, { fx: Float64Array; fy: Float64Array; fa: Float64Array; bx: Float64Array; by: Float64Array; ba: Float64Array; px: Float64Array; py: Float64Array }>();
function vetoresDe(S: FiberSection) {
  let v = vetores.get(S);
  if (!v) {
    const m = S.mesh, br = S.bars, pl = S.poly;
    v = {
      fx: Float64Array.from(m, (f) => f.x - S.cx), fy: Float64Array.from(m, (f) => f.y - S.cy), fa: Float64Array.from(m, (f) => f.A),
      bx: Float64Array.from(br, (b) => b.x - S.cx), by: Float64Array.from(br, (b) => b.y - S.cy), ba: Float64Array.from(br, (b) => b.A),
      px: Float64Array.from(pl, (p) => p[0] - S.cx), py: Float64Array.from(pl, (p) => p[1] - S.cy),
    };
    vetores.set(S, v);
  }
  return v;
}

/** Plano de deformações da família de estados (θ = direção da compressão, t ∈ [0, 3]): ε(s) = e0 + e1·s, compressão +. */
function planoDeformacoes(S: FiberSection, theta: number, t: number) {
  const ux = Math.cos(theta), uy = Math.sin(theta);
  const V = vetoresDe(S);
  let sMax = -Infinity, sMin = Infinity, sBar = Infinity;
  for (let k = 0; k < V.px.length; k++) { const s = V.px[k] * ux + V.py[k] * uy; if (s > sMax) sMax = s; if (s < sMin) sMin = s; }
  for (let k = 0; k < V.bx.length; k++) { const s = V.bx[k] * ux + V.by[k] * uy; if (s < sBar) sBar = s; }
  const h = sMax - sMin, d = Math.max(sMax - sBar, 0.9 * h);
  const c = S.c;
  let top: number, bot: number; // deformações na fibra mais comprimida (profundidade 0) e em h
  if (t <= 1) { top = -0.01 + (0.01 + c.ecu) * t; bot = top + ((-0.01 - top) * h) / d; }
  else if (t <= 2) { top = c.ecu; bot = (c.ecu + ((-0.01 - c.ecu) * h) / d) * (2 - t); }
  else { const yC = (1 - c.ec2 / c.ecu) * h, b2 = c.ec2 * (t - 2), sl = (b2 - c.ec2) / (h - yC); top = c.ec2 - sl * yC; bot = b2; }
  // ε(s) = top + (bot − top)·(sMax − s)/h = e0 + e1·s
  const e1 = -(bot - top) / h, e0 = top + (bot - top) * sMax / h;
  return { ux, uy, V, sMax, sMin, sBar, h, d, top, bot, e0, e1 };
}

function stateForces(S: FiberSection, theta: number, t: number) {
  const { ux, uy, V, e0, e1 } = planoDeformacoes(S, theta, t);
  const c = S.c;
  let N = 0, Mx = 0, My = 0;
  // fibras tracionadas (ε ≤ 0) têm σ = 0: somariam +0, que não muda nenhuma soma (que nunca chega a −0)
  for (let k = 0; k < V.fx.length; k++) {
    const x = V.fx[k], y = V.fy[k], e = e0 + e1 * (x * ux + y * uy);
    if (e <= 0) continue;
    const F = sigmaC(e, c) * V.fa[k];
    N += F; Mx += F * x; My += F * y;
  }
  for (let k = 0; k < V.bx.length; k++) {
    const x = V.bx[k], y = V.by[k], e = e0 + e1 * (x * ux + y * uy);
    const F = (Math.max(-S.fyd, Math.min(S.fyd, ES * e)) - sigmaC(e, c)) * V.ba[k];
    N += F; Mx += F * x; My += F * y;
  }
  return { N, Mx, My };
}

const nUniforme = new WeakMap<FiberSection, number>();
function compressaoUniforme(S: FiberSection) {
  let n = nUniforme.get(S);
  if (n === undefined) { n = stateForces(S, Math.PI / 2, 3).N; nUniforme.set(S, n); }
  return n;
}

/** Faixa de normal resistente (MN, compressão +). */
export function fiberAxialRange(S: FiberSection) {
  return { NRc: compressaoUniforme(S), NRt: stateForces(S, Math.PI / 2, 0).N };
}

/**
 * Momento resistente (MN·m) na direção do momento solicitante (mx, my) — componentes do "lado comprimido":
 * mx > 0 comprime x+, my > 0 comprime y+ — para a normal Nd (MN, compressão +). null se Nd fora da faixa.
 */
export function fiberCapacity(S: FiberSection, NdMN: number, mx: number, my: number): number | null {
  const r = fiberSolve(S, NdMN, mx, my);
  return r ? Math.hypot(r.Mx, r.My) : null;
}

/** Estado último da seção para a normal Nd (MN, compressão +) e a direção do momento (mx, my): esforços resistentes e parâmetros (θ da compressão, t ∈ [0, 3]) do plano de deformações. */
export interface EstadoUltimo { N: number; Mx: number; My: number; theta: number; t: number }

/** Mesma busca de `fiberCapacity`, devolvendo o estado (V5, K1.11.30). */
export function fiberSolve(S: FiberSection, NdMN: number, mx: number, my: number): EstadoUltimo | null {
  const target = Math.atan2(my, mx);
  // raiz de N(m) = Nd por falsa posição modificada (Illinois): converge em poucas iterações, tolerância 1e-9 MN
  const atN = (theta: number) => {
    let a = 0, b = 3;
    // t = 3 é a compressão uniforme (ε = εc2 em toda a seção): N não depende de θ, calculado uma vez por seção
    let fa = stateForces(S, theta, a).N - NdMN, fb = compressaoUniforme(S) - NdMN;
    if (fa > 0 || fb < 0) return null;
    let lado = 0, m = a, r = null as unknown as { N: number; Mx: number; My: number };
    for (let it = 0; it < 80; it++) {
      m = fb !== fa ? (a * fb - b * fa) / (fb - fa) : (a + b) / 2;
      if (!(m > a && m < b)) m = (a + b) / 2;
      r = stateForces(S, theta, m);
      const fm = r.N - NdMN;
      if (Math.abs(fm) < 1e-9 || b - a < 1e-12) break;
      if (fm < 0) { a = m; fa = fm; if (lado === -1) fb /= 2; lado = -1; } else { b = m; fb = fm; if (lado === 1) fa /= 2; lado = 1; }
    }
    return { ...r, theta, t: m };
  };
  const ang = (theta: number) => { const r = atN(theta); if (!r) return null; let d = Math.atan2(r.My, r.Mx) - target; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return { d, r }; };
  let a = target - Math.PI / 2.2, b = target + Math.PI / 2.2;
  let fa = ang(a), fb = ang(b);
  if (!fa || !fb) return atN(target);
  if (fa.d * fb.d > 0) return atN(target)!;
  // ângulo da linha neutra cuja resultante tem a direção pedida: também por Illinois
  let best = Math.abs(fa.d) < Math.abs(fb.d) ? fa : fb, lado = 0, da = fa.d, db = fb.d;
  for (let it = 0; it < 40; it++) {
    let m = (a * db - b * da) / (db - da);
    if (!(m > a && m < b)) m = (a + b) / 2;
    const fm = ang(m);
    if (!fm) break;
    best = fm;
    if (Math.abs(fm.d) < 1e-6) break;
    if (da * fm.d <= 0) { b = m; db = fm.d; if (lado === 1) da /= 2; lado = 1; } else { a = m; da = fm.d; if (lado === -1) db /= 2; lado = -1; }
  }
  return best.r;
}

/**
 * Estado da seção para um estado (θ, t) da família do ELU: plano de deformações (compressão +), posição da linha
 * neutra, tensões do concreto (parábola-retângulo) e do aço por barra, e os esforços resultantes (MN, MN·m).
 */
export function fiberEstado(S: FiberSection, theta: number, t: number) {
  const P = planoDeformacoes(S, theta, t);
  const f = stateForces(S, theta, t);
  return { ...f, ux: P.ux, uy: P.uy, sMax: P.sMax, sMin: P.sMin, h: P.h, d: P.d, top: P.top, bot: P.bot, e0: P.e0, e1: P.e1 };
}

/** Tensão do concreto (MPa, compressão +) para a deformação ε (compressão +), diagrama parábola-retângulo. */
export const fiberSigmaC = sigmaC;

/** Perfil U (C) de alma vertical à esquerda: altura h, mesas b × tf, alma tw. */
export function cPolygon(h: number, b: number, tw: number, tf: number): Pt[] {
  return [[0, 0], [b, 0], [b, tf], [tw, tf], [tw, h - tf], [b, h - tf], [b, h], [0, h]];
}

/** Perfil Z: mesa inferior à direita, mesa superior à esquerda, alma central tw. */
export function zPolygon(h: number, b: number, tw: number, tf: number): Pt[] {
  const x0 = b - tw / 2;
  return [[x0, 0], [x0 + b, 0], [x0 + b, tf], [x0 + tw, tf], [x0 + tw, h], [x0 + tw - b, h], [x0 + tw - b, h - tf], [x0, h - tf]];
}

/** Dupla cantoneira (abas iguais b × t), costas com costas e afastamento g; os dois L ligados por fenda de largura nula. */
export function doubleAnglePolygon(b: number, t: number, g: number): Pt[] {
  const xr = b + g; // origem do L direito
  return [
    [0, 0], [b, 0], [xr, 0], [xr + b, 0], [xr + b, t], [xr + t, t], [xr + t, b], [xr, b], [xr, 0], // L direito
    [b, 0], [b, b], [b - t, b], [b - t, t], [0, t], // volta pela fenda e contorna o L esquerdo
  ];
}
