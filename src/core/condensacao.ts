// Condensação estática exata (complemento de Schur) de uma subestrutura linear (N2b): os gdl internos saem da
// solução global e voltam por retrossubstituição. S = Kbb − Kbi·Kii⁻¹·Kib; Pb = Pb − Kbi·Kii⁻¹·Pi; ui = Kii⁻¹·(Pi − Kib·ub).
// Kii em banda (Cuthill-McKee reversa de math.ts e LDLᵀ em banda próprio, com o produto L·D da linha guardado e
// várias soluções de uma vez): fatorada uma vez; todas as colunas de fronteira e os casos resolvidos juntos.
import { rcmOrder, type SpRows } from './math';

export interface Condensado {
  /** Número de gdl internos e de fronteira. */
  ni: number; nb: number;
  /** Rigidez condensada nb × nb (por linhas). */
  S: Float64Array;
  /** Carga condensada por caso (nb). */
  Pb: Float64Array[];
  /** Kii⁻¹·Pi por caso (ni). */
  Z: Float64Array[];
  /** X = Kii⁻¹·Kib (ni × nb, por linhas: X[i·nb + c]). */
  X: Float64Array;
  hb: number;
  /** Ordenação (Cuthill-McKee reversa) dos gdl internos, reaproveitável numa matriz de mesma esparsidade. */
  ordem: { order: number[]; hb: number };
  erro?: string;
}

/** LDLᵀ em banda (linha i, coluna j ∈ [i − hb, i] em L[i·w + j − i + hb]); `singular` ≥ 0 = pivô nulo. */
function fatorar(n: number, hb: number, L: Float64Array, D: Float64Array): number {
  const w = hb + 1, t = new Float64Array(w);
  let maxDiag = 0;
  for (let i = 0; i < n; i++) maxDiag = Math.max(maxDiag, Math.abs(L[i * w + hb]));
  const tol = 1e-11 * (maxDiag || 1);
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - hb), ri = i * w - i + hb;
    for (let j = i0; j <= i; j++) {
      let s = L[ri + j];
      const k0 = Math.max(i0, j - hb), rj = j * w - j + hb;
      for (let k = k0; k < j; k++) s -= t[k - i0] * L[rj + k];
      if (j < i) { t[j - i0] = s; L[ri + j] = s / D[j]; }
      else { if (Math.abs(s) < tol) return i; D[i] = s; L[ri + i] = 1; }
    }
  }
  return -1;
}

/** Resolve L·D·Lᵀ·X = B para m colunas ao mesmo tempo (B por linhas, n × m, sobrescrita). */
function resolverVarios(n: number, hb: number, L: Float64Array, D: Float64Array, B: Float64Array, m: number) {
  const w = hb + 1;
  for (let i = 0; i < n; i++) {
    const ri = i * w - i + hb, oi = i * m;
    for (let k = Math.max(0, i - hb); k < i; k++) { const l = L[ri + k]; if (!l) continue; const ok = k * m; for (let c = 0; c < m; c++) B[oi + c] -= l * B[ok + c]; }
  }
  for (let i = 0; i < n; i++) { const d = D[i], oi = i * m; for (let c = 0; c < m; c++) B[oi + c] /= d; }
  for (let i = n - 1; i >= 0; i--) {
    const oi = i * m;
    for (let k = i + 1; k <= Math.min(n - 1, i + hb); k++) { const l = L[k * w - k + hb + i]; if (!l) continue; const ok = k * m; for (let c = 0; c < m; c++) B[oi + c] -= l * B[ok + c]; }
  }
}

/**
 * Condensa K (simétrica, linhas esparsas completas, n = ni + nb gdl: internos 0…ni−1, fronteira ni…n−1) e as cargas.
 */
export function condensar(K: SpRows, ni: number, P: Float64Array[], ordem?: { order: number[]; hb: number }): Condensado {
  const n = K.length, nb = n - ni, nc = P.length;
  const idx = Array.from({ length: ni }, (_, i) => i);
  // linhas internas só com as colunas internas, para a ordenação e a banda
  const Kii: SpRows = idx.map((i) => { const m = new Map<number, number>(); for (const [c, v] of K[i]) if (c < ni) m.set(c, v); return m; });
  const { order, hb } = ordem ?? (ni ? rcmOrder(Kii, idx) : { order: [], hb: 0 });
  const pos = new Int32Array(ni);
  order.forEach((e, p) => (pos[e] = p));
  const w = hb + 1, L = new Float64Array(ni * w), D = new Float64Array(ni);
  for (let e = 0; e < ni; e++) for (const [c, v] of Kii[e]) { const p = pos[e], q = pos[c]; if (q <= p && p - q <= hb) L[p * w + q - p + hb] += v; }
  const vazio = { ni, nb, S: new Float64Array(nb * nb), Pb: P.map(() => new Float64Array(nb)), Z: P.map(() => new Float64Array(ni)), X: new Float64Array(ni * nb), hb, ordem: { order, hb } };
  const sing = fatorar(ni, hb, L, D);
  if (sing >= 0) return { ...vazio, erro: `subestrutura instável (gdl interno ${order[sing]})` };
  // colunas Kib (pela simetria, as linhas de fronteira restritas às colunas internas) e as cargas internas, juntas
  const m = nb + nc, B = new Float64Array(ni * m);
  for (let c = 0; c < nb; c++) for (const [i, v] of K[ni + c]) if (i < ni) B[pos[i] * m + c] = v;
  for (let k = 0; k < nc; k++) for (let i = 0; i < ni; i++) B[pos[i] * m + nb + k] = P[k][i];
  resolverVarios(ni, hb, L, D, B, m);
  const X = new Float64Array(ni * nb), Z = P.map(() => new Float64Array(ni));
  for (let i = 0; i < ni; i++) { const o = pos[i] * m; for (let c = 0; c < nb; c++) X[i * nb + c] = B[o + c]; for (let k = 0; k < nc; k++) Z[k][i] = B[o + nb + k]; }
  const S = new Float64Array(nb * nb);
  for (let a = 0; a < nb; a++) {
    const row = K[ni + a];
    for (let c = 0; c < nb; c++) S[a * nb + c] = row.get(ni + c) ?? 0;
    for (const [i, v] of row) if (i < ni) { const o = i * nb; for (let c = 0; c < nb; c++) S[a * nb + c] -= v * X[o + c]; }
  }
  // simetriza (arredondamento)
  for (let a = 0; a < nb; a++) for (let c = a + 1; c < nb; c++) { const v = (S[a * nb + c] + S[c * nb + a]) / 2; S[a * nb + c] = v; S[c * nb + a] = v; }
  const Pb = P.map((p, k) => {
    const out = new Float64Array(nb);
    for (let a = 0; a < nb; a++) { let s = p[ni + a]; for (const [i, v] of K[ni + a]) if (i < ni) s -= v * Z[k][i]; out[a] = s; }
    return out;
  });
  return { ni, nb, S, Pb, Z, X, hb, ordem: { order, hb } };
}

/** Gdl internos para os gdl de fronteira `ub` e a carga do caso `k` (sem carga: só −X·ub). */
export function recuperarInternos(c: Condensado, ub: ArrayLike<number>, k?: number): Float64Array {
  const ui = k === undefined ? new Float64Array(c.ni) : Float64Array.from(c.Z[k]);
  const nb = c.nb, X = c.X;
  for (let i = 0; i < c.ni; i++) { let s = 0; const o = i * nb; for (let b = 0; b < nb; b++) s += X[o + b] * ub[b]; ui[i] -= s; }
  return ui;
}

/** Força que a fronteira faz na subestrutura: S·ub − Pb (reações nos gdl de fronteira). */
export function forcaFronteira(c: Condensado, ub: ArrayLike<number>, k?: number): Float64Array {
  const f = new Float64Array(c.nb);
  for (let a = 0; a < c.nb; a++) { let s = k === undefined ? 0 : -c.Pb[k][a]; for (let b = 0; b < c.nb; b++) s += c.S[a * c.nb + b] * ub[b]; f[a] = s; }
  return f;
}
