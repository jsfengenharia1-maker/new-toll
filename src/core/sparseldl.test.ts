import { describe, expect, it } from 'vitest';
import { BandLDL, rcmOrder, spAdd, type SpRows } from './math';
import { definirLimiteBanda, fatorarLDL, grauMinimo, LIMITE_BANDA, SparseLDL } from './sparseldl';

/** Gerador pseudoaleatório determinístico. */
function lcg(seed: number) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

/** Malha n × m de molas (Laplaciano + massa) com um "mestre" ligado a todos os nós: banda cheia, grau mínimo barato. */
function malhaComMestre(nx: number, ny: number, k = 0) {
  const n = nx * ny + 1, mestre = n - 1, K: SpRows = Array.from({ length: n }, () => new Map<number, number>());
  const mola = (a: number, b: number, c: number) => { spAdd(K, a, a, c); spAdd(K, b, b, c); spAdd(K, a, b, -c); spAdd(K, b, a, -c); };
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const a = i * ny + j;
    if (i + 1 < nx) mola(a, a + ny, 1 + 0.3 * ((a * 7) % 5));
    if (j + 1 < ny) mola(a, a + 1, 1 + 0.2 * ((a * 3) % 4));
    spAdd(K, a, a, 0.01);
    if (k) mola(a, mestre, k);
  }
  spAdd(K, mestre, mestre, 1);
  return { K, n };
}

const preencher = (K: SpRows) => (set: (i: number, j: number, v: number) => void) => { for (let i = 0; i < K.length; i++) for (const [j, v] of K[i]) if (j >= i) set(i, j, v); };
const vetor = (n: number, seed = 5) => { const r = lcg(seed); return Float64Array.from({ length: n }, () => r() - 0.5); };
const mult = (K: SpRows, x: ArrayLike<number>) => { const y = new Float64Array(K.length); K.forEach((row, i) => { for (const [j, v] of row) y[i] += v * x[j]; }); return y; };
const erroMax = (a: ArrayLike<number>, b: ArrayLike<number>) => { let m = 0, s = 0; for (let i = 0; i < a.length; i++) { m = Math.max(m, Math.abs(a[i] - b[i])); s = Math.max(s, Math.abs(b[i])); } return m / (s || 1); };

describe('SparseLDL (grau mínimo + LDLᵀ esparso)', () => {
  it('resolve K·x = b com resíduo pequeno e dá a mesma solução da fatoração em banda', () => {
    const { K, n } = malhaComMestre(14, 11, 0.05);
    const b = vetor(n);
    const { order, hb } = rcmOrder(K, Array.from({ length: n }, (_, i) => i));
    const pos = new Int32Array(n); order.forEach((e, p) => (pos[e] = p));
    const fillPos = (set: (i: number, j: number, v: number) => void) => { for (let e = 0; e < n; e++) for (const [c, v] of K[e]) { const p = pos[e], q = pos[c]; if (q >= p) set(p, q, v); } };
    const banda = new BandLDL(n, hb, fillPos, 1), esparsa = new SparseLDL(n, fillPos, 1);
    const bp = new Float64Array(n); for (let e = 0; e < n; e++) bp[pos[e]] = b[e];
    const xb = banda.solve(bp), xs = esparsa.solve(bp);
    expect(erroMax(xs, xb)).toBeLessThan(1e-10);
    const x = new Float64Array(n); for (let e = 0; e < n; e++) x[e] = xs[pos[e]];
    expect(erroMax(mult(K, x), b)).toBeLessThan(1e-10);
    expect(esparsa.negatives).toBe(0);
    expect(esparsa.singularRow).toBe(-1);
  });

  it('o mestre ligado a todos os nós enche a banda (hb ≈ n) mas o preenchimento esparso é pequeno', () => {
    const { K, n } = malhaComMestre(30, 20, 0.05);
    const { hb } = rcmOrder(K, Array.from({ length: n }, (_, i) => i));
    expect(hb).toBeGreaterThan(0.5 * n); // banda quase cheia
    const s = new SparseLDL(n, preencher(K), 1);
    expect(s.nnzL).toBeLessThan(0.1 * n * hb); // contra n·hb armazenados na banda
    const b = vetor(n, 9), x = s.solve(b);
    expect(erroMax(mult(K, x), b)).toBeLessThan(1e-9);
  });

  it('indefinida: número de pivôs negativos igual ao da fatoração em banda (lei de Sylvester) e solução igual', () => {
    const { K, n } = malhaComMestre(9, 8, 0.1);
    for (let i = 0; i < n; i += 5) spAdd(K, i, i, -2.5); // deslocamento: alguns modos negativos
    const { order, hb } = rcmOrder(K, Array.from({ length: n }, (_, i) => i));
    const pos = new Int32Array(n); order.forEach((e, p) => (pos[e] = p));
    const fillPos = (set: (i: number, j: number, v: number) => void) => { for (let e = 0; e < n; e++) for (const [c, v] of K[e]) { const p = pos[e], q = pos[c]; if (q >= p) set(p, q, v); } };
    const banda = new BandLDL(n, hb, fillPos, 1), esparsa = new SparseLDL(n, fillPos, 1);
    expect(banda.singularRow).toBe(-1);
    expect(esparsa.singularRow).toBe(-1);
    expect(banda.negatives).toBeGreaterThan(0);
    expect(esparsa.negatives).toBe(banda.negatives);
  });

  it('matriz singular (nó solto): singularRow indica uma equação do nó sem rigidez', () => {
    const n = 6, K: SpRows = Array.from({ length: n }, () => new Map<number, number>());
    for (let i = 0; i < n - 2; i++) { spAdd(K, i, i, 2); spAdd(K, i, i + 1, -1); spAdd(K, i + 1, i, -1); spAdd(K, i + 1, i + 1, 2); }
    spAdd(K, 5, 5, 0); // equação 5 sem rigidez
    const s = new SparseLDL(n, preencher(K), 1);
    expect(s.singularRow).toBe(5);
  });

  it('grauMinimo devolve uma permutação', () => {
    const { K, n } = malhaComMestre(7, 6, 0.1);
    const ai: number[] = [], aj: number[] = [];
    K.forEach((r, i) => { for (const [j] of r) { ai.push(i); aj.push(j); } });
    const p = grauMinimo(n, Int32Array.from(ai), Int32Array.from(aj), ai.length);
    expect([...p].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
  });

  it('fatorarLDL: banda abaixo do limite (resultados de sempre) e esparsa acima; limite trocável nos testes', () => {
    const { K, n } = malhaComMestre(6, 5, 0.1);
    expect(fatorarLDL(n, 10, preencher(K), 1)).toBeInstanceOf(BandLDL);
    expect(fatorarLDL(n, Math.ceil(Math.sqrt(LIMITE_BANDA / n)) + 1, preencher(K), 1)).toBeInstanceOf(SparseLDL);
    try {
      definirLimiteBanda(0);
      expect(fatorarLDL(n, 10, preencher(K), 1)).toBeInstanceOf(SparseLDL);
      definirLimiteBanda(Infinity);
      expect(fatorarLDL(n, 1e4, preencher(K), 1)).toBeInstanceOf(BandLDL);
    } finally { definirLimiteBanda(); }
    expect(fatorarLDL(n, 10, preencher(K), 1)).toBeInstanceOf(BandLDL);
  });
});
