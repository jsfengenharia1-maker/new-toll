// Todas as cadeias de segmentos ligados de uma camada (polilinhas explodidas do DXF) e utilidades de polígonos
// usadas no lançamento automático por camada (L2). Funções puras, em m.
export type Pt = [number, number];
export interface CadeiaL { pontos: Pt[]; fechada: boolean }

const dist = (a: Pt, z: Pt) => Math.hypot(a[0] - z[0], a[1] - z[1]);

/** Remove pontos repetidos e colineares (em cadeia fechada, também o do fecho). */
export function simplificarCadeia(pts: Pt[], fechada: boolean, tol: number): Pt[] {
  const lim: Pt[] = [];
  for (const q of pts) if (!lim.length || dist(lim[lim.length - 1], q) > tol / 2) lim.push(q);
  if (fechada && lim.length > 1 && dist(lim[0], lim[lim.length - 1]) <= tol / 2) lim.pop();
  const n = lim.length;
  const col = (a: Pt, b: Pt, c: Pt) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) <= 1e-9 + tol * dist(a, c) * 0.05;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const extremo = !fechada && (i === 0 || i === n - 1);
    if (!extremo && n > 2 && col(lim[(i - 1 + n) % n], lim[i], lim[(i + 1) % n])) continue;
    out.push(lim[i]);
  }
  return out;
}

/**
 * Cadeias da lista de segmentos [x1, y1, x2, y2, ...]. Pontas a menos de `tol` são o mesmo nó; a cadeia para num
 * nó com grau diferente de 2 (ponta livre ou cruzamento). Ciclos viram cadeias fechadas (sem repetir o primeiro ponto).
 */
export function cadeiasDe(segs: ArrayLike<number>, tol = 0.005): CadeiaL[] {
  const n = Math.floor(segs.length / 4);
  const nos: Pt[] = [];
  const celula = new Map<string, number[]>();
  const c = (v: number) => Math.floor(v / (2 * tol));
  const no = (x: number, y: number): number => {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++)
      for (const k of celula.get(`${c(x) + dx},${c(y) + dy}`) ?? []) if (Math.hypot(nos[k][0] - x, nos[k][1] - y) <= tol) return k;
    nos.push([x, y]);
    const ch = `${c(x)},${c(y)}`;
    celula.set(ch, [...(celula.get(ch) ?? []), nos.length - 1]);
    return nos.length - 1;
  };
  const arestas: [number, number][] = [];
  const vistas = new Set<string>();
  for (let i = 0; i < n; i++) {
    const a = no(segs[4 * i], segs[4 * i + 1]), z = no(segs[4 * i + 2], segs[4 * i + 3]);
    if (a === z) continue;
    const ch = a < z ? `${a}-${z}` : `${z}-${a}`;
    if (vistas.has(ch)) continue; // linha repetida
    vistas.add(ch);
    arestas.push([a, z]);
  }
  const adj: number[][] = nos.map(() => []);
  arestas.forEach(([a, z], i) => { adj[a].push(i); adj[z].push(i); });
  const usada = new Array(arestas.length).fill(false);
  const out: CadeiaL[] = [];
  const andar = (inicio: number, e0: number): CadeiaL => {
    const idx = [inicio];
    let atual = inicio, e = e0;
    for (;;) {
      usada[e] = true;
      const prox = arestas[e][0] === atual ? arestas[e][1] : arestas[e][0];
      idx.push(prox);
      atual = prox;
      if (adj[atual].length !== 2) return { pontos: idx.map((k) => nos[k]), fechada: false };
      const seguinte = adj[atual].find((x) => !usada[x]);
      if (seguinte === undefined) return { pontos: idx.map((k) => nos[k]), fechada: idx[0] === atual };
      e = seguinte;
    }
  };
  for (let k = 0; k < nos.length; k++) {
    if (adj[k].length === 2) continue;
    for (const e of adj[k]) if (!usada[e]) out.push(andar(k, e));
  }
  for (let e = 0; e < arestas.length; e++) {
    if (usada[e]) continue;
    const c0 = andar(arestas[e][0], e);
    c0.pontos.pop();
    c0.fechada = true;
    out.push(c0);
  }
  return out.map((ch) => {
    const pts = simplificarCadeia(ch.pontos, ch.fechada, tol);
    return { pontos: pts, fechada: ch.fechada && pts.length >= 3 };
  }).filter((ch) => ch.pontos.length >= 2);
}

/** Retângulo (orientado) de um polígono de 4 vértices com ângulos retos (tolerância em graus), ou null. */
export function retanguloDe(p: Pt[], tolGraus = 2): { cx: number; cy: number; b: number; h: number; angulo: number } | null {
  if (p.length !== 4) return null;
  const lado = (i: number): Pt => [p[(i + 1) % 4][0] - p[i][0], p[(i + 1) % 4][1] - p[i][1]];
  for (let i = 0; i < 4; i++) {
    const u = lado(i), v = lado((i + 1) % 4), lu = Math.hypot(...u), lv = Math.hypot(...v);
    if (lu < 1e-9 || lv < 1e-9) return null;
    if (Math.abs((u[0] * v[0] + u[1] * v[1]) / (lu * lv)) > Math.sin((tolGraus * Math.PI) / 180)) return null;
  }
  const l0 = Math.hypot(...lado(0)), l2 = Math.hypot(...lado(2)), l1 = Math.hypot(...lado(1)), l3 = Math.hypot(...lado(3));
  if (Math.abs(l0 - l2) > 0.02 * Math.max(l0, l2) + 1e-6 || Math.abs(l1 - l3) > 0.02 * Math.max(l1, l3) + 1e-6) return null;
  // b na direção do lado que faz o menor ângulo (módulo 90°) com +x; horizontal ou vertical → b horizontal
  let ang = (Math.atan2(lado(0)[1], lado(0)[0]) * 180) / Math.PI;
  ang = ((ang % 90) + 90) % 90;
  if (ang > 90 - 0.01 || ang < 0.01) ang = 0;
  const a = (ang * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
  let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
  for (const q of p) { const u = q[0] * ux + q[1] * uy, v = -q[0] * uy + q[1] * ux; umin = Math.min(umin, u); umax = Math.max(umax, u); vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); }
  const um = (umin + umax) / 2, vm = (vmin + vmax) / 2;
  return { cx: um * ux - vm * uy, cy: um * uy + vm * ux, b: umax - umin, h: vmax - vmin, angulo: ang };
}

/** Pares de segmentos paralelos (viga desenhada por duas faces): eixo médio do trecho comum e afastamento. */
export function paresParalelos(segs: [Pt, Pt][], emin: number, emax: number, lmin: number): { a: Pt; z: Pt; e: number; i: number; j: number }[] {
  const out: { a: Pt; z: Pt; e: number; i: number; j: number }[] = [];
  const usado = new Set<number>();
  for (let i = 0; i < segs.length; i++) {
    if (usado.has(i)) continue;
    const [a, z] = segs[i], L = dist(a, z);
    if (L < lmin) continue;
    const ux = (z[0] - a[0]) / L, uy = (z[1] - a[1]) / L, nx = -uy, ny = ux;
    let melhor: { j: number; e: number; t0: number; t1: number } | null = null;
    for (let j = 0; j < segs.length; j++) {
      if (j === i || usado.has(j)) continue;
      const [c, f] = segs[j], M = dist(c, f);
      if (M < lmin || Math.abs(((f[0] - c[0]) * ux + (f[1] - c[1]) * uy) / M) < 0.9998) continue;
      const e = (c[0] - a[0]) * nx + (c[1] - a[1]) * ny, e2 = (f[0] - a[0]) * nx + (f[1] - a[1]) * ny;
      if (Math.abs(e - e2) > 0.005 || Math.abs(e) < emin || Math.abs(e) > emax) continue;
      const s0 = (c[0] - a[0]) * ux + (c[1] - a[1]) * uy, s1 = (f[0] - a[0]) * ux + (f[1] - a[1]) * uy;
      const t0 = Math.max(0, Math.min(s0, s1)), t1 = Math.min(L, Math.max(s0, s1));
      if (t1 - t0 < lmin) continue;
      if (!melhor || Math.abs(e) < Math.abs(melhor.e)) melhor = { j, e, t0, t1 };
    }
    if (!melhor) continue;
    usado.add(i); usado.add(melhor.j);
    const h = melhor.e / 2;
    const p = (t: number): Pt => [a[0] + ux * t + nx * h, a[1] + uy * t + ny * h];
    out.push({ a: p(melhor.t0), z: p(melhor.t1), e: Math.abs(melhor.e), i, j: melhor.j });
  }
  return out;
}
