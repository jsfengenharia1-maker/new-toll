// Geometria da importação IFC (L3): matrizes 4×4 dos IfcLocalPlacement aninhados, retângulo de menor área e
// polígonos. Funções puras, em metros (a conversão de unidade acontece na leitura).
export type V3 = [number, number, number];
export type P2 = [number, number];
/** Matriz 4×4 por linhas: [r00 r01 r02 tx, r10 r11 r12 ty, r20 r21 r22 tz, 0 0 0 1]. */
export type M4 = number[];

export const IDENT: M4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function mul(a: M4, b: M4): M4 {
  const r = new Array<number>(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[i * 4 + k] * b[k * 4 + j]; r[i * 4 + j] = s; }
  return r;
}
export const ponto = (m: M4, p: V3): V3 => [
  m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3], m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7], m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11],
];
/** Só a rotação (direções). */
export const direcao = (m: M4, d: V3): V3 => [
  m[0] * d[0] + m[1] * d[1] + m[2] * d[2], m[4] * d[0] + m[5] * d[1] + m[6] * d[2], m[8] * d[0] + m[9] * d[1] + m[10] * d[2],
];
const norma = (v: V3) => Math.hypot(v[0], v[1], v[2]);
export const unit = (v: V3): V3 => { const n = norma(v); return n > 0 ? [v[0] / n, v[1] / n, v[2] / n] : v; };
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Matriz de um IfcAxis2Placement3D: origem, eixo Z (padrão 0,0,1) e direção de referência X (padrão 1,0,0). */
export function matrizEixo3(o: V3, eixoZ?: V3 | null, ref?: V3 | null): M4 {
  const z = unit(eixoZ && norma(eixoZ) > 1e-12 ? eixoZ : [0, 0, 1]);
  let x: V3 = ref && norma(ref) > 1e-12 ? ref : Math.abs(z[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const k = dot(x, z);
  x = unit([x[0] - k * z[0], x[1] - k * z[1], x[2] - k * z[2]]);
  const y = cruz(z, x);
  return [x[0], y[0], z[0], o[0], x[1], y[1], z[1], o[1], x[2], y[2], z[2], o[2], 0, 0, 0, 1];
}
/** Matriz de um IfcAxis2Placement2D no plano XY. */
export function matrizEixo2(o: P2, ref?: P2 | null): M4 {
  const r: P2 = ref && Math.hypot(ref[0], ref[1]) > 1e-12 ? ref : [1, 0];
  const n = Math.hypot(r[0], r[1]);
  const c = r[0] / n, s = r[1] / n;
  return [c, -s, 0, o[0], s, c, 0, o[1], 0, 0, 1, 0, 0, 0, 0, 1];
}
/** Inversa de uma matriz rígida (rotação + translação; a escala uniforme é tratada pela transposta normalizada). */
export function inversa(m: M4): M4 {
  const e = [Math.hypot(m[0], m[4], m[8]), Math.hypot(m[1], m[5], m[9]), Math.hypot(m[2], m[6], m[10])];
  const t = [m[0] / (e[0] ** 2), m[4] / (e[0] ** 2), m[8] / (e[0] ** 2), m[1] / (e[1] ** 2), m[5] / (e[1] ** 2), m[9] / (e[1] ** 2), m[2] / (e[2] ** 2), m[6] / (e[2] ** 2), m[10] / (e[2] ** 2)];
  const tx = -(t[0] * m[3] + t[1] * m[7] + t[2] * m[11]), ty = -(t[3] * m[3] + t[4] * m[7] + t[5] * m[11]), tz = -(t[6] * m[3] + t[7] * m[7] + t[8] * m[11]);
  return [t[0], t[1], t[2], tx, t[3], t[4], t[5], ty, t[6], t[7], t[8], tz, 0, 0, 0, 1];
}

// ---- polígonos ----

export const areaComSinal = (p: P2[]): number => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
export const centroide = (p: P2[]): P2 => {
  const a = areaComSinal(p);
  if (Math.abs(a) < 1e-12) return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
  let cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) { const u = p[i], v = p[(i + 1) % p.length], w = u[0] * v[1] - v[0] * u[1]; cx += (u[0] + v[0]) * w; cy += (u[1] + v[1]) * w; }
  return [cx / (6 * a), cy / (6 * a)];
};
/** Remove pontos repetidos consecutivos (e o de fechamento repetido). */
export function limparPoligono(p: P2[], tol = 1e-6): P2[] {
  const o: P2[] = [];
  for (const q of p) if (!o.length || Math.hypot(q[0] - o.at(-1)![0], q[1] - o.at(-1)![1]) > tol) o.push(q);
  while (o.length > 1 && Math.hypot(o[0][0] - o.at(-1)![0], o[0][1] - o.at(-1)![1]) <= tol) o.pop();
  return o;
}
export function envoltoriaConvexa(pts: P2[]): P2[] {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (s.length < 3) return s;
  const cr = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const baixo: P2[] = [], cima: P2[] = [];
  for (const q of s) { while (baixo.length >= 2 && cr(baixo.at(-2)!, baixo.at(-1)!, q) <= 0) baixo.pop(); baixo.push(q); }
  for (const q of [...s].reverse()) { while (cima.length >= 2 && cr(cima.at(-2)!, cima.at(-1)!, q) <= 0) cima.pop(); cima.push(q); }
  return [...baixo.slice(0, -1), ...cima.slice(0, -1)];
}
export interface RetanguloOrientado { centro: P2; /** comprimento ao longo do ângulo (m) */ a: number; /** dimensão perpendicular (m) */ b: number; /** direção do lado `a` (graus, de −180 a 180) */ angulo: number }
/** Retângulo de menor área que contém os pontos (calibre giratório sobre a envoltória convexa). `a` ≥ `b`. */
export function retanguloMinimo(pts: P2[]): RetanguloOrientado | null {
  const h = envoltoriaConvexa(pts);
  if (h.length < 3) return null;
  let melhor: RetanguloOrientado | null = null, areaMin = Infinity;
  for (let i = 0; i < h.length; i++) {
    const p = h[i], q = h[(i + 1) % h.length];
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), c = Math.cos(ang), s = Math.sin(ang);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const r of h) { const u = (r[0] - p[0]) * c + (r[1] - p[1]) * s, v = -(r[0] - p[0]) * s + (r[1] - p[1]) * c; x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
    const A = (x1 - x0) * (y1 - y0);
    if (A < areaMin - 1e-12) {
      areaMin = A;
      const cu = (x0 + x1) / 2, cv = (y0 + y1) / 2;
      let a = x1 - x0, b = y1 - y0, an = ang;
      if (b > a) { [a, b] = [b, a]; an += Math.PI / 2; }
      melhor = { centro: [p[0] + cu * c - cv * s, p[1] + cu * s + cv * c], a, b, angulo: ((an * 180 / Math.PI + 540) % 360) - 180 };
    }
  }
  return melhor;
}
/** O polígono é um retângulo (4 vértices, ângulos retos)? Devolve lados e direção do primeiro lado. */
export function comoRetangulo(p: P2[], tol = 1e-3): { centro: P2; l1: number; l2: number; angulo: number } | null {
  if (p.length !== 4) return null;
  const e = p.map((q, i) => { const r = p[(i + 1) % 4]; return [r[0] - q[0], r[1] - q[1]] as P2; });
  const comp = e.map((v) => Math.hypot(v[0], v[1]));
  if (comp.some((c) => c < 1e-9)) return null;
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; if (Math.abs(e[i][0] * e[j][0] + e[i][1] * e[j][1]) / (comp[i] * comp[j]) > tol) return null; }
  if (Math.abs(comp[0] - comp[2]) > tol * Math.max(comp[0], 1) || Math.abs(comp[1] - comp[3]) > tol * Math.max(comp[1], 1)) return null;
  return { centro: centroide(p), l1: comp[0], l2: comp[1], angulo: Math.atan2(e[0][1], e[0][0]) * 180 / Math.PI };
}
/** Ângulo em graus normalizado para (−180, 180]. */
export const angulo180 = (g: number) => { let a = ((g % 360) + 360) % 360; if (a > 180) a -= 360; return a; };
