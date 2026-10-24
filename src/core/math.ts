// Polinômios (coeficientes em ordem crescente) e álgebra linear densa.

export type Poly = number[];

export const P = {
  evaluate(p: Poly, x: number): number {
    let r = 0;
    for (let i = p.length - 1; i >= 0; i--) r = r * x + p[i];
    return r;
  },
  add(...ps: Poly[]): Poly {
    const n = Math.max(0, ...ps.map((p) => p.length));
    const r = new Array(n).fill(0);
    for (const p of ps) for (let i = 0; i < p.length; i++) r[i] += p[i];
    return r;
  },
  scale(p: Poly, k: number): Poly {
    return p.map((c) => c * k);
  },
  /** Primitiva com valor nulo em x = 0. */
  integrate(p: Poly): Poly {
    return [0, ...p.map((c, i) => c / (i + 1))];
  },
  derive(p: Poly): Poly {
    return p.slice(1).map((c, i) => c * (i + 1));
  },
  /** Raízes reais em [a, b] (grau ≤ 3 analítico, maior por bisseção amostrada). */
  rootsIn(p: Poly, a: number, b: number): number[] {
    const q = trim(p);
    const out: number[] = [];
    const N = 64;
    let x0 = a, f0 = P.evaluate(q, a);
    for (let k = 1; k <= N; k++) {
      const x1 = a + ((b - a) * k) / N;
      const f1 = P.evaluate(q, x1);
      if (f0 === 0) out.push(x0);
      else if (f0 * f1 < 0) {
        let lo = x0, hi = x1, flo = f0;
        for (let it = 0; it < 60; it++) {
          const m = (lo + hi) / 2, fm = P.evaluate(q, m);
          if (flo * fm <= 0) hi = m; else { lo = m; flo = fm; }
        }
        out.push((lo + hi) / 2);
      }
      x0 = x1; f0 = f1;
    }
    return out;
  },
};

function trim(p: Poly): Poly {
  const r = p.slice();
  while (r.length > 1 && Math.abs(r[r.length - 1]) < 1e-300) r.pop();
  return r;
}

/** Linear (de a para b em [0, L]). */
export function linearPoly(a: number, b: number, L: number): Poly {
  return [a, (b - a) / L];
}

// Gauss-Legendre 8 pontos em [-1, 1]
const GX = [-0.9602898564975363, -0.7966664774136267, -0.525532409916329, -0.1834346424956498, 0.1834346424956498, 0.525532409916329, 0.7966664774136267, 0.9602898564975363];
const GW = [0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.3626837833783620, 0.3626837833783620, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763];

export function gauss(f: (x: number) => number, a: number, b: number): number {
  const h = (b - a) / 2, c = (a + b) / 2;
  let s = 0;
  for (let i = 0; i < 8; i++) s += GW[i] * f(c + h * GX[i]);
  return s * h;
}

export type Mat = number[][];

export function zeros(n: number, m = n): Mat {
  return Array.from({ length: n }, () => new Array(m).fill(0));
}

export function matMul(A: Mat, B: Mat): Mat {
  const n = A.length, m = B[0].length, k = B.length;
  const C = zeros(n, m);
  for (let i = 0; i < n; i++) for (let p = 0; p < k; p++) { const a = A[i][p]; if (a) for (let j = 0; j < m; j++) C[i][j] += a * B[p][j]; }
  return C;
}

export function transpose(A: Mat): Mat {
  return A[0].map((_, j) => A.map((r) => r[j]));
}

export function matVec(A: Mat, x: number[]): number[] {
  return A.map((r) => r.reduce((s, a, j) => s + a * x[j], 0));
}

export function inv3(F: Mat): Mat {
  const [[a, b, c], [d, e, f], [g, h, i]] = F;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

/** Fatoração LU densa com pivotamento parcial (armazenada em Float64Array). */
export class LU {
  n: number;
  a: Float64Array;
  piv: Int32Array;
  singularRow = -1;

  constructor(K: Float64Array, n: number, scale?: number) {
    this.n = n;
    this.a = K;
    this.piv = new Int32Array(n);
    const a = this.a;
    let maxDiag = 0;
    for (let i = 0; i < n; i++) maxDiag = Math.max(maxDiag, Math.abs(a[i * n + i]));
    const tol = 1e-11 * (scale || maxDiag || 1);
    for (let k = 0; k < n; k++) {
      let p = k, mx = Math.abs(a[k * n + k]);
      for (let i = k + 1; i < n; i++) { const v = Math.abs(a[i * n + k]); if (v > mx) { mx = v; p = i; } }
      this.piv[k] = p;
      if (mx < tol) { this.singularRow = k; return; }
      if (p !== k) for (let j = 0; j < n; j++) { const t = a[k * n + j]; a[k * n + j] = a[p * n + j]; a[p * n + j] = t; }
      const akk = a[k * n + k];
      for (let i = k + 1; i < n; i++) {
        const f = (a[i * n + k] /= akk);
        if (f !== 0) for (let j = k + 1; j < n; j++) a[i * n + j] -= f * a[k * n + j];
      }
    }
  }

  solve(bIn: ArrayLike<number>): Float64Array {
    const n = this.n, a = this.a, b = Float64Array.from(bIn);
    for (let k = 0; k < n; k++) { const p = this.piv[k]; if (p !== k) { const t = b[k]; b[k] = b[p]; b[p] = t; } }
    for (let i = 0; i < n; i++) { let s = b[i]; for (let j = 0; j < i; j++) s -= a[i * n + j] * b[j]; b[i] = s; }
    for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= a[i * n + j] * b[j]; b[i] = s / a[i * n + i]; }
    return b;
  }
}

/** Matriz esparsa simétrica por linhas (padrão simétrico). */
export type SpRows = Map<number, number>[];

export function spAdd(K: SpRows, r: number, c: number, v: number) {
  if (v === 0) return;
  const row = K[r];
  row.set(c, (row.get(c) ?? 0) + v);
}

/**
 * Renumeração Cuthill-McKee reversa dos índices `idx` (subconjunto das linhas de K).
 * Retorna `order` (posição → índice original) e a meia largura de banda resultante.
 */
export function rcmOrder(K: SpRows, idx: number[]): { order: number[]; hb: number } {
  const n = idx.length;
  const pos = new Map(idx.map((d, i) => [d, i]));
  const adj: number[][] = idx.map((d) => [...K[d].keys()].map((c) => pos.get(c)).filter((p): p is number => p !== undefined && p !== pos.get(d)));
  const deg = adj.map((a) => a.length);
  const seen = new Uint8Array(n);
  const out: number[] = [];
  while (out.length < n) {
    let start = -1;
    for (let i = 0; i < n; i++) if (!seen[i] && (start < 0 || deg[i] < deg[start])) start = i;
    const queue = [start];
    seen[start] = 1;
    for (let q = 0; q < queue.length; q++) {
      const v = queue[q];
      out.push(v);
      const nb = adj[v].filter((w) => !seen[w]).sort((a, b) => deg[a] - deg[b]);
      for (const w of nb) { seen[w] = 1; queue.push(w); }
    }
  }
  out.reverse();
  const rank = new Int32Array(n);
  out.forEach((v, r) => (rank[v] = r));
  let hb = 0;
  for (let i = 0; i < n; i++) for (const j of adj[i]) hb = Math.max(hb, Math.abs(rank[i] - rank[j]));
  return { order: out.map((v) => idx[v]), hb };
}

/**
 * Pivô nulo (estrutura instável) na fatoração LDLᵀ: |s| abaixo de `tol` (1e-11 da escala, em geral a maior diagonal)
 * E com perda de dígitos, isto é, s cancelado em relação à diagonal original d0 da própria linha (|s| < 1e-6·|d0|), ou
 * já no nível do arredondamento da escala (|s| < 1e-5·tol ≈ 1e-16 da escala). Um mecanismo zera o pivô por cancelamento
 * (s ≪ d0); um gdl legítimo de rigidez pequena (giro no plano de casca, estabilizado por penalização relativa) tem s ≈ d0
 * e não é mecanismo, mesmo quando a escala vem de ligações rígidas por penalidade (barra–casca, 24/10/2026). Só alivia o
 * critério antigo (|s| < tol): o que passava continua passando com o mesmo resultado.
 */
export const pivoNulo = (s: number, d0: number, tol: number): boolean => {
  const a = Math.abs(s);
  return a < tol && (a < 1e-6 * Math.abs(d0) || a < 1e-5 * tol);
};

/**
 * Fatoração LDLᵀ em banda (matriz simétrica, sem pivotamento). Custo n·hb².
 * `singularRow` ≥ 0 indica pivô nulo (estrutura instável) na posição dada.
 */
export class BandLDL {
  n: number; hb: number; w: number;
  L: Float64Array; D: Float64Array;
  singularRow = -1;
  /** Número de pivôs negativos (índice de inércia: modos abaixo do deslocamento aplicado). */
  negatives = 0;

  constructor(n: number, hb: number, fill: (set: (i: number, j: number, v: number) => void) => void, scale?: number) {
    this.n = n; this.hb = hb; this.w = hb + 1;
    const L = (this.L = new Float64Array(n * this.w));
    const D = (this.D = new Float64Array(n));
    const w = this.w;
    // armazenamento: linha i, coluna j (i−hb ≤ j ≤ i) em L[i·w + (j − i + hb)]
    fill((i, j, v) => { if (j > i) [i, j] = [j, i]; if (i - j <= hb) L[i * w + (j - i + hb)] += v; });
    let maxDiag = 0;
    for (let i = 0; i < n; i++) maxDiag = Math.max(maxDiag, Math.abs(L[i * w + hb]));
    const tol = 1e-11 * (scale || maxDiag || 1);
    for (let i = 0; i < n; i++) {
      const i0 = Math.max(0, i - hb);
      for (let j = i0; j <= i; j++) {
        let s = L[i * w + (j - i + hb)];
        const k0 = Math.max(i0, j - hb);
        for (let k = k0; k < j; k++) s -= L[i * w + (k - i + hb)] * L[j * w + (k - j + hb)] * D[k];
        if (j < i) L[i * w + (j - i + hb)] = s / D[j];
        else {
          if (pivoNulo(s, L[i * w + hb], tol)) { this.singularRow = i; return; }
          D[i] = s;
          if (s < 0) this.negatives++;
          L[i * w + hb] = 1;
        }
      }
    }
  }

  solve(bIn: ArrayLike<number>): Float64Array {
    const { n, hb, w, L, D } = this;
    const x = Float64Array.from(bIn);
    for (let i = 0; i < n; i++) { let s = x[i]; for (let k = Math.max(0, i - hb); k < i; k++) s -= L[i * w + (k - i + hb)] * x[k]; x[i] = s; }
    for (let i = 0; i < n; i++) x[i] /= D[i];
    for (let i = n - 1; i >= 0; i--) { let s = x[i]; for (let k = i + 1; k <= Math.min(n - 1, i + hb); k++) s -= L[k * w + (i - k + hb)] * x[k]; x[i] = s; }
    return x;
  }
}
