// Triangulação de polígonos com furos por ear clipping (sem dependência): os furos são ligados ao contorno por uma
// ponte (vértices duplicados) e o polígono simples resultante é cortado orelha por orelha.
export type P = [number, number];

/** Área com sinal (anti-horária positiva). */
export const areaComSinal = (p: P[]) => p.reduce((s, a, i) => { const z = p[(i + 1) % p.length]; return s + a[0] * z[1] - z[0] * a[1]; }, 0) / 2;

const cruz = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const igual = (a: P, b: P) => Math.abs(a[0] - b[0]) < 1e-12 && Math.abs(a[1] - b[1]) < 1e-12;

/** Os segmentos ab e cd se cruzam em ponto interno a ambos? (encostar nas pontas não conta) */
function seCruzam(a: P, b: P, c: P, d: P): boolean {
  if (igual(a, c) || igual(a, d) || igual(b, c) || igual(b, d)) return false;
  const d1 = cruz(a, b, c), d2 = cruz(a, b, d), d3 = cruz(c, d, a), d4 = cruz(c, d, b);
  return d1 * d2 < -1e-18 && d3 * d4 < -1e-18;
}

/** O ponto p está sobre o interior do segmento ab (sem contar as pontas)? */
function tocaNoMeio(a: P, b: P, p: P): boolean {
  if (igual(p, a) || igual(p, b)) return false;
  if (Math.abs(cruz(a, b, p)) > 1e-12) return false;
  const t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
  return t > 1e-9 && t < 1 - 1e-9;
}

/** Ponto dentro do triângulo abc (anti-horário), fronteira incluída. */
function dentroTri(p: P, a: P, b: P, c: P, eps = 1e-12): boolean {
  return cruz(a, b, p) >= -eps && cruz(b, c, p) >= -eps && cruz(c, a, p) >= -eps;
}

function pontoNoPoligono(p: P, poly: P[]): boolean {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) dentro = !dentro;
  }
  return dentro;
}

/** Liga cada furo ao contorno por uma ponte; devolve o polígono simples (anti-horário, com vértices repetidos nas pontes). */
function ligarFuros(contorno: P[], furos: P[][]): P[] {
  let poly = contorno.slice();
  // furos da direita para a esquerda (pela maior abscissa), como no earcut
  const fs = furos.map((f) => f.slice()).sort((a, z) => Math.max(...z.map((q) => q[0])) - Math.max(...a.map((q) => q[0])));
  for (let k = 0; k < fs.length; k++) {
    const furo = fs[k];
    let im = 0;
    for (let i = 1; i < furo.length; i++) if (furo[i][0] > furo[im][0]) im = i;
    const M = furo[im];
    const arestas: [P, P][] = [];
    for (const r of [poly, ...fs.filter((_, j) => j !== k)]) for (let i = 0; i < r.length; i++) arestas.push([r[i], r[(i + 1) % r.length]]);
    // candidatos do contorno atual por distância; o primeiro cuja ponte não cruza nenhuma aresta serve
    const cand = poly.map((v, i) => ({ i, d: Math.hypot(v[0] - M[0], v[1] - M[1]) })).sort((a, z) => a.d - z.d);
    let escolhido = -1;
    for (const c of cand) {
      const V = poly[c.i];
      if (arestas.some(([p, q]) => seCruzam(M, V, p, q) || tocaNoMeio(M, V, p))) continue;
      // a ponte não pode atravessar o interior do furo (amostras junto de M, no meio e junto do contorno)
      if ([0.001, 0.02, 0.5, 0.98].some((u) => pontoNoPoligono([M[0] + u * (V[0] - M[0]), M[1] + u * (V[1] - M[1])], furo))) continue;
      escolhido = c.i;
      break;
    }
    if (escolhido < 0) escolhido = cand[0].i;
    const V = poly[escolhido];
    const girado = [...furo.slice(im), ...furo.slice(0, im)]; // começa em M
    poly = [...poly.slice(0, escolhido + 1), ...girado, M, V, ...poly.slice(escolhido + 1)];
  }
  return poly;
}

export interface Triangulacao {
  /** Vértices [x0, y0, x1, y1, ...] (os da ponte aparecem duas vezes). */
  pos: number[];
  /** Triângulos anti-horários (índices dos vértices). */
  idx: number[];
}

/** Triangula o contorno com furos (em qualquer orientação). Soma das áreas dos triângulos = área líquida. */
export function triangular(contorno: P[], furos: P[][] = []): Triangulacao {
  const ccw = (p: P[]) => (areaComSinal(p) >= 0 ? p.slice() : p.slice().reverse());
  const cw = (p: P[]) => (areaComSinal(p) <= 0 ? p.slice() : p.slice().reverse());
  const poly = ligarFuros(ccw(contorno), furos.filter((f) => f.length >= 3).map(cw));
  const n = poly.length;
  const pos = poly.flatMap((q) => [q[0], q[1]]);
  const idx: number[] = [];
  const vivo = Array.from({ length: n }, (_, i) => i);
  let guarda = 0;
  while (vivo.length > 3 && guarda++ < n * n + 10) {
    let cortou = false;
    for (let k = 0; k < vivo.length; k++) {
      const ia = vivo[(k + vivo.length - 1) % vivo.length], ib = vivo[k], ic = vivo[(k + 1) % vivo.length];
      const a = poly[ia], b = poly[ib], c = poly[ic];
      if (cruz(a, b, c) <= 1e-14) continue; // reflexo ou colinear
      let orelha = true;
      for (const j of vivo) {
        if (j === ia || j === ib || j === ic) continue;
        const q = poly[j];
        if (igual(q, a) || igual(q, b) || igual(q, c)) continue;
        if (dentroTri(q, a, b, c)) { orelha = false; break; }
      }
      if (!orelha) continue;
      idx.push(ia, ib, ic);
      vivo.splice(k, 1);
      cortou = true;
      break;
    }
    if (!cortou) { // polígono degenerado (colinear): remove um vértice colinear para seguir
      const k = vivo.findIndex((_, i) => Math.abs(cruz(poly[vivo[(i + vivo.length - 1) % vivo.length]], poly[vivo[i]], poly[vivo[(i + 1) % vivo.length]])) <= 1e-9);
      vivo.splice(k >= 0 ? k : 0, 1);
    }
  }
  if (vivo.length === 3 && cruz(poly[vivo[0]], poly[vivo[1]], poly[vivo[2]]) > 1e-14) idx.push(vivo[0], vivo[1], vivo[2]);
  return { pos, idx };
}

/** Soma das áreas dos triângulos. */
export function areaTriangulada(t: Triangulacao): number {
  let s = 0;
  for (let i = 0; i < t.idx.length; i += 3) {
    const [a, b, c] = [t.idx[i], t.idx[i + 1], t.idx[i + 2]].map((j) => [t.pos[2 * j], t.pos[2 * j + 1]] as P);
    s += cruz(a, b, c) / 2;
  }
  return s;
}
