// Regiões fechadas (faces limitadas) de um conjunto de segmentos: arranjo planar com divisão nas interseções,
// semiarestas ordenadas por ângulo em cada vértice e percurso "próxima aresta no sentido horário".
// Usado para detectar os panos de laje pelo eixo das vigas.

export type P = [number, number];

export interface OpcoesFaces { tol?: number; areaMin?: number }

/** Área com sinal (anti-horário > 0). */
export const areaPoligono = (p: P[]) => p.reduce((s, a, i) => { const z = p[(i + 1) % p.length]; return s + a[0] * z[1] - z[0] * a[1]; }, 0) / 2;

export function dentroPoligono(pt: P, poly: P[]): boolean {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
}

/** Um ponto garantidamente interno (polígono simples, inclusive côncavo). */
export function pontoInterno(poly: P[]): P {
  const n = poly.length, A = areaPoligono(poly);
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { const a = poly[i], z = poly[(i + 1) % n], c = a[0] * z[1] - z[0] * a[1]; cx += (a[0] + z[0]) * c; cy += (a[1] + z[1]) * c; }
  const c: P = A ? [cx / (6 * A), cy / (6 * A)] : poly[0];
  if (dentroPoligono(c, poly)) return c;
  // reta horizontal pelo centróide: meio do primeiro trecho interno
  const xs: number[] = [];
  for (let i = 0; i < n; i++) { const a = poly[i], z = poly[(i + 1) % n]; if (a[1] > c[1] !== z[1] > c[1]) xs.push(a[0] + ((c[1] - a[1]) * (z[0] - a[0])) / (z[1] - a[1])); }
  xs.sort((p, q) => p - q);
  return xs.length >= 2 ? [(xs[0] + xs[1]) / 2, c[1]] : c;
}

/** Faces limitadas (anti-horárias) formadas pelos segmentos. Arestas soltas (pontas) não fecham face e são ignoradas. */
export function faces(segs: [P, P][], o: OpcoesFaces = {}): P[][] {
  const tol = o.tol ?? 1e-3, areaMin = o.areaMin ?? 1e-4;
  // 1. vértices fundidos por tolerância
  const vs: P[] = [];
  const grade = new Map<string, number[]>();
  const chave = (x: number, y: number) => `${Math.round(x / tol)}:${Math.round(y / tol)}`;
  const vertice = (p: P): number => {
    const gx = Math.round(p[0] / tol), gy = Math.round(p[1] / tol);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const i of grade.get(`${gx + dx}:${gy + dy}`) ?? []) if (Math.hypot(vs[i][0] - p[0], vs[i][1] - p[1]) <= tol) return i;
    vs.push([p[0], p[1]]);
    const k = chave(p[0], p[1]);
    grade.set(k, [...(grade.get(k) ?? []), vs.length - 1]);
    return vs.length - 1;
  };
  const S = segs.filter(([a, z]) => Math.hypot(z[0] - a[0], z[1] - a[1]) > tol);
  // 2. parâmetros de divisão de cada segmento (interseções e pontas encostadas)
  const cortes: number[][] = S.map(() => [0, 1]);
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const [a, b] = S[i], [c, d] = S[j];
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    const Li = Math.hypot(r[0], r[1]), Lj = Math.hypot(s[0], s[1]);
    if (Math.abs(den) > 1e-12 * Li * Lj) {
      const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
      const ti = tol / Li, tj = tol / Lj;
      if (t >= -ti && t <= 1 + ti && u >= -tj && u <= 1 + tj) { cortes[i].push(Math.min(1, Math.max(0, t))); cortes[j].push(Math.min(1, Math.max(0, u))); }
    } else {
      // colineares sobrepostos: cada ponta de um que cai no outro divide o outro
      const proj = (p: P, a0: P, v: number[], L: number) => { const t = ((p[0] - a0[0]) * v[0] + (p[1] - a0[1]) * v[1]) / (L * L); const q: P = [a0[0] + t * v[0], a0[1] + t * v[1]]; return Math.hypot(q[0] - p[0], q[1] - p[1]) <= tol && t > 0 && t < 1 ? t : null; };
      for (const p of [c, d]) { const t = proj(p, a, r, Li); if (t !== null) cortes[i].push(t); }
      for (const p of [a, b]) { const t = proj(p, c, s, Lj); if (t !== null) cortes[j].push(t); }
    }
  }
  // 3. arestas sem repetição
  const arestas = new Set<string>();
  const adj = new Map<number, Set<number>>();
  const liga = (u: number, v: number) => {
    if (u === v) return;
    const k = u < v ? `${u}-${v}` : `${v}-${u}`;
    if (arestas.has(k)) return;
    arestas.add(k);
    if (!adj.has(u)) adj.set(u, new Set());
    if (!adj.has(v)) adj.set(v, new Set());
    adj.get(u)!.add(v); adj.get(v)!.add(u);
  };
  S.forEach(([a, z], i) => {
    const ts = [...new Set(cortes[i].map((t) => +t.toFixed(12)))].sort((p, q) => p - q);
    let prev = vertice(a);
    for (const t of ts.slice(1)) { const q = vertice([a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])]); liga(prev, q); prev = q; }
  });
  // 4. poda das pontas soltas (grau 1)
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const [v, ns] of adj) if (ns.size <= 1) { for (const u of ns) adj.get(u)?.delete(v); adj.delete(v); mudou = true; }
  }
  // 5. semiarestas ordenadas por ângulo em cada vértice
  const ord = new Map<number, number[]>();
  for (const [v, ns] of adj) ord.set(v, [...ns].sort((p, q) => Math.atan2(vs[p][1] - vs[v][1], vs[p][0] - vs[v][0]) - Math.atan2(vs[q][1] - vs[v][1], vs[q][0] - vs[v][0])));
  const usada = new Set<string>();
  const out: P[][] = [];
  for (const [u, ns] of ord) for (const v0 of ns) {
    if (usada.has(`${u}>${v0}`)) continue;
    const face: number[] = [];
    let a = u, b = v0, guarda = 0;
    while (!usada.has(`${a}>${b}`) && guarda++ < 100000) {
      usada.add(`${a}>${b}`);
      face.push(a);
      // próxima: a saída de b imediatamente anterior (sentido horário) à volta b→a
      const l = ord.get(b)!, k = l.indexOf(a);
      const c = l[(k - 1 + l.length) % l.length];
      a = b; b = c;
    }
    const poly = face.map((i) => vs[i]);
    if (areaPoligono(poly) > areaMin) out.push(simplificar(poly));
  }
  return out;
}

/** Remove vértices colineares. */
function simplificar(p: P[]): P[] {
  const out = [...p];
  for (let i = out.length - 1; i >= 0 && out.length > 3; i--) {
    const a = out[(i - 1 + out.length) % out.length], m = out[i], z = out[(i + 1) % out.length];
    if (Math.abs((m[0] - a[0]) * (z[1] - a[1]) - (m[1] - a[1]) * (z[0] - a[0])) < 1e-9) out.splice(i, 1);
  }
  return out;
}
