// Análises além da linear: 2ª ordem global (P-Δ por matriz geométrica, iterativa),
// flambagem global (autovalores de estabilidade) e vibração livre (modos naturais).
import { condense, type ElemLoad, type ElemMatrices } from './element';
import { BandLDL, P, spAdd, type Mat, type SpRows } from './math';
import { assembleGlobal, caseVectors, dofMap, factorFree, memberLoads, solveLoading, type CaseResult, type PMember, type Prepared } from './solver';

/** Matriz geométrica consistente do elemento de pórtico (local, N > 0 tração), gdl [u, v, θ]ᵢ [u, v, θ]ⱼ. */
export function geometricLocal(L: number, N: number): Mat {
  const k = N / L;
  return [
    [0, 0, 0, 0, 0, 0],
    [0, (6 / 5) * k, (L / 10) * k, 0, (-6 / 5) * k, (L / 10) * k],
    [0, (L / 10) * k, ((2 * L * L) / 15) * k, 0, (-L / 10) * k, (-L * L / 30) * k],
    [0, 0, 0, 0, 0, 0],
    [0, (-6 / 5) * k, (-L / 10) * k, 0, (6 / 5) * k, (-L / 10) * k],
    [0, (L / 10) * k, (-L * L / 30) * k, 0, (-L / 10) * k, ((2 * L * L) / 15) * k],
  ];
}

const addM = (A: Mat, B: Mat): Mat => A.map((r, i) => r.map((v, j) => v + B[i][j]));
const subM = (A: Mat, B: Mat): Mat => A.map((r, i) => r.map((v, j) => v - B[i][j]));

/** Matrizes do elemento com a parcela geométrica somada antes da condensação das rótulas. */
function withGeometric(em: ElemMatrices, Kg: Mat): ElemMatrices {
  const K = addM(em.K, Kg);
  const { Kc, fc } = condense(K, em.f, em.released);
  return { ...em, K, Kc, fc };
}

/** Kg condensada da barra (diferença entre K+Kg e K, ambas condensadas). */
function kgCondensed(pm: PMember, N: number): Mat {
  const Kg = geometricLocal(pm.L, N);
  const a = condense(addM(pm.base.K, Kg), pm.base.f, pm.base.released).Kc;
  return subM(a, pm.base.Kc);
}

/** Força normal média por barra (N > 0 tração). */
export function axialForces(r: CaseResult, prep: Prepared): number[] {
  return prep.members.map((pm, k) => (P.evaluate(r.members[k].N, 0) + P.evaluate(r.members[k].N, pm.L)) / 2);
}

export interface Loading { elem: ElemLoad[]; nodal: Float64Array; presc: Float64Array | null }

/** Carregamento de uma combinação (superposição dos casos) para análises não lineares. */
export function comboLoading(prep: Prepared, factors: Record<number, number>, extraNodal?: Float64Array): Loading {
  const elem: ElemLoad[] = prep.members.map(() => ({ qx: [0], qy: [0], eps0: 0, kap0: 0, mi: 0, mj: 0 }));
  const nodal = new Float64Array(prep.ndof);
  let presc: Float64Array | null = null;
  for (const [idS, f] of Object.entries(factors)) {
    const id = +idS;
    if (!f || !prep.model.cases.some((c) => c.id === id)) continue;
    const lds = memberLoads(prep, id);
    lds.forEach((l, k) => {
      const e = elem[k];
      e.qx = P.add(e.qx, P.scale(l.qx, f)); e.qy = P.add(e.qy, P.scale(l.qy, f));
      e.eps0 += f * l.eps0; e.kap0 += f * l.kap0; e.mi += f * l.mi; e.mj += f * l.mj;
    });
    const cv = caseVectors(prep, id);
    for (let d = 0; d < prep.ndof; d++) nodal[d] += f * cv.nodal[d];
    if (cv.presc) { presc ??= new Float64Array(prep.ndof); for (let d = 0; d < prep.ndof; d++) presc[d] += f * cv.presc[d]; }
  }
  if (extraNodal) for (let d = 0; d < prep.ndof; d++) nodal[d] += extraNodal[d];
  return { elem, nodal, presc };
}

export interface PDeltaResult {
  result: CaseResult;
  linear: CaseResult;
  iterations: number;
  converged: boolean;
  /** Razão entre o maior deslocamento horizontal de 2ª e de 1ª ordem. */
  amplification: number;
  error?: string;
}

/**
 * 2ª ordem global (P-Δ): K_T = K + K_G(N), iterando N até convergir os deslocamentos.
 * A parcela local P-δ dentro das barras não é incluída (fica com o pilar-padrão no dimensionamento).
 */
export function pDelta(prep: Prepared, ld: Loading, opts: { maxIter?: number; tol?: number } = {}): PDeltaResult {
  const maxIter = opts.maxIter ?? 30, tol = opts.tol ?? 1e-4;
  const linear = solveLoading(prep, ld.elem, ld.nodal, ld.presc);
  let res = linear, N = axialForces(linear, prep), it = 0, converged = false;
  const scale = Math.max(...prep.free.map((d) => Math.abs(prep.K[d].get(d) ?? 0)), 1);
  for (it = 1; it <= maxIter; it++) {
    const kg = prep.members.map((pm, k) => kgCondensed(pm, N[k]));
    const extra = assembleGlobal(prep, (pm) => kg[pm.index]);
    const lu = factorFree(prep.K, prep.free, prep.freePos, prep.hb, scale, extra);
    if (lu.singularRow >= 0 || lu.negatives > 0) return { result: res, linear, iterations: it, converged: false, amplification: Infinity, error: 'Instabilidade global: a carga da combinação atinge ou supera a carga crítica (K + K_G deixou de ser positiva definida).' };
    const next = solveLoading(prep, ld.elem, ld.nodal, ld.presc, undefined, {
      lu, extra,
      elem: (pm, em) => withGeometric(em, geometricLocal(pm.L, N[pm.index])),
    });
    let du = 0, um = 0;
    for (let d = 0; d < prep.ndof; d++) { du = Math.max(du, Math.abs(next.u[d] - res.u[d])); um = Math.max(um, Math.abs(next.u[d])); }
    res = next;
    N = axialForces(res, prep);
    if (du <= tol * Math.max(um, 1e-12)) { converged = true; break; }
  }
  const hx = (r: CaseResult) => { let m = 0; for (let k = 0; k < r.u.length; k += 3) m = Math.max(m, Math.abs(r.u[k])); return m; };
  const h1 = hx(linear);
  return { result: res, linear, iterations: Math.min(it, maxIter), converged, amplification: h1 > 1e-12 ? hx(res) / h1 : 1, error: converged ? undefined : `P-Δ não convergiu em ${maxIter} iterações.` };
}

// ---------------------------------------------------------------------------
// Autovalores: iteração inversa em subespaço com quociente de Rayleigh-Ritz.

/** y = A·x para matriz esparsa restrita aos gdl livres (na ordem prep.free). */
function spMul(A: SpRows, prep: Prepared, x: Float64Array): Float64Array {
  const y = new Float64Array(x.length);
  prep.free.forEach((d, p) => { let s = 0; for (const [c, v] of A[d]) { const q = prep.freePos[c]; if (q >= 0) s += v * x[q]; } y[p] = s; });
  return y;
}
const dot = (a: Float64Array, b: Float64Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/** Problema generalizado simétrico pequeno A·x = λ·B·x (B positiva definida) por Jacobi após Cholesky. */
function smallGeneralized(A: number[][], B: number[][]): { values: number[]; vectors: number[][] } {
  const n = A.length;
  const L = B.map((r) => r.slice());
  for (let j = 0; j < n; j++) {
    for (let k = 0; k < j; k++) L[j][j] -= L[j][k] ** 2;
    L[j][j] = Math.sqrt(Math.max(L[j][j], 1e-300));
    for (let i = j + 1; i < n; i++) { for (let k = 0; k < j; k++) L[i][j] -= L[i][k] * L[j][k]; L[i][j] /= L[j][j]; }
    for (let i = 0; i < j; i++) L[i][j] = 0;
  }
  const Linv = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j): number => (i === j ? 1 : 0)));
  for (let c = 0; c < n; c++) for (let i = 0; i < n; i++) { let s = Linv[i][c]; for (let k = 0; k < i; k++) s -= L[i][k] * Linv[k][c]; Linv[i][c] = s / L[i][i]; }
  const C = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => { let s = 0; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) s += Linv[i][a] * A[a][b] * Linv[j][b]; return s; }));
  const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j): number => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += C[p][q] ** 2;
    if (off < 1e-24) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(C[p][q]) < 1e-300) continue;
      const th = (C[q][q] - C[p][p]) / (2 * C[p][q]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const a = C[k][p], b = C[k][q]; C[k][p] = c * a - s * b; C[k][q] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = C[p][k], b = C[q][k]; C[p][k] = c * a - s * b; C[q][k] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = V[k][p], b = V[k][q]; V[k][p] = c * a - s * b; V[k][q] = s * a + c * b; }
    }
  }
  const values = C.map((r, i) => r[i]);
  // x = L⁻ᵀ·y
  const vectors = values.map((_, m) => Array.from({ length: n }, (_, i) => { let s = 0; for (let k = 0; k < n; k++) s += Linv[k][i] * V[k][m]; return s; }));
  return { values, vectors };
}

/**
 * Autovalores de K·φ = μ·B·φ (K positiva definida, fatorada em `lu`) por iteração em subespaço:
 * resolve-se B·φ = ν·K·φ (ν = 1/μ), cujos maiores ν positivos dão os menores μ positivos.
 * Flambagem: B = −K_G, μ = λ (fator de carga). Vibração: B = M, μ = ω².
 */
function subspace(prep: Prepared, lu: BandLDL, B: SpRows, nModes: number, iters = 80): { mu: number; phi: Float64Array }[] {
  const n = prep.free.length;
  if (!n) return [];
  const q = Math.min(n, Math.max(2 * nModes, nModes + 8));
  let X: Float64Array[] = Array.from({ length: q }, (_, j) => { const v = new Float64Array(n); for (let i = 0; i < n; i++) v[i] = Math.sin((i + 1) * (j + 1) * 0.7) + ((i + j) % 7 === 0 ? 1 : 0); return v; });
  let prev: number[] = [];
  let out: { mu: number; phi: Float64Array }[] = [];
  for (let it = 0; it < iters; it++) {
    // Y = K⁻¹·B·X, ortonormalizada (Gram-Schmidt) e sem vetores dependentes (B pode ter posto baixo)
    const Y: Float64Array[] = [];
    for (const x of X) {
      const y = lu.solve(spMul(B, prep, x));
      const n0 = Math.sqrt(dot(y, y));
      for (const z of Y) { const c = dot(y, z); for (let r = 0; r < n; r++) y[r] -= c * z[r]; }
      const ny = Math.sqrt(dot(y, y));
      if (!(ny > 1e-8 * n0) || ny === 0) continue;
      for (let r = 0; r < n; r++) y[r] /= ny;
      Y.push(y);
    }
    if (!Y.length) return [];
    const KY = Y.map((y) => spMul(prep.K, prep, y)), BY = Y.map((y) => spMul(B, prep, y));
    const m = Y.length;
    const Kr = Y.map((yi) => KY.map((ky) => dot(yi, ky))); // Yᵀ·K·Y
    const Ar = Y.map((yi) => BY.map((by) => dot(yi, by))); // Yᵀ·B·Y
    for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) { const a = (Kr[i][j] + Kr[j][i]) / 2, b = (Ar[i][j] + Ar[j][i]) / 2; Kr[i][j] = Kr[j][i] = a; Ar[i][j] = Ar[j][i] = b; }
    const { values, vectors } = smallGeneralized(Ar, Kr);
    const idx = values.map((_, i) => i).sort((a, b) => values[b] - values[a]);
    X = idx.map((i) => { const v = new Float64Array(n); for (let k = 0; k < m; k++) { const c = vectors[i][k]; if (c) for (let r = 0; r < n; r++) v[r] += c * Y[k][r]; } const nv = Math.sqrt(dot(v, v)) || 1; for (let r = 0; r < n; r++) v[r] /= nv; return v; });
    // completa o subespaço com vetores de partida para não perder dimensão
    for (let j = X.length; j < q; j++) { const v = new Float64Array(n); for (let i = 0; i < n; i++) v[i] = Math.cos((i + 3) * (j + it + 2) * 0.37); X.push(v); }
    const nus = idx.map((i) => values[i]);
    const pos = nus.map((nu, k) => ({ nu, k })).filter((x) => x.nu > 0).slice(0, nModes);
    out = pos.map(({ nu, k }) => ({ mu: 1 / nu, phi: X[k] }));
    const cur = pos.map((x) => x.nu);
    const conv = prev.length === cur.length && cur.length > 0 && cur.every((m, k) => Math.abs(m - prev[k]) <= 1e-10 * Math.abs(m));
    prev = cur;
    if (conv) break;
  }
  return out;
}

/** Expande um vetor nos gdl livres para o vetor global (gdl dos apoios inclinados voltam ao sistema global). */
function expand(prep: Prepared, phi: Float64Array): Float64Array {
  const u = new Float64Array(prep.ndof);
  prep.free.forEach((d, p) => (u[d] = phi[p]));
  for (const sk of prep.skew) { const b = sk.nodeIdx * 3, a0 = u[b], a1 = u[b + 1]; u[b] = sk.c * a0 - sk.s * a1; u[b + 1] = sk.s * a0 + sk.c * a1; }
  return u;
}

export interface BucklingMode { factor: number; shape: Float64Array }

/**
 * Flambagem global: (K + λ·K_G(N₀))·φ = 0 com N₀ da análise linear da combinação.
 * Retorna os menores fatores de carga positivos λ (carga crítica = λ × combinação).
 */
export function buckling(prep: Prepared, ld: Loading, nModes = 3): { modes: BucklingMode[]; error?: string } {
  if (!prep.lu) return { modes: [], error: prep.error };
  const lin = solveLoading(prep, ld.elem, ld.nodal, ld.presc);
  const N = axialForces(lin, prep);
  if (!N.some((x) => x < -1e-9)) return { modes: [], error: 'Sem compressão nas barras: não há flambagem para esta combinação.' };
  const Kg = assembleGlobal(prep, (pm) => kgCondensed(pm, N[pm.index]));
  const negKg: SpRows = Kg.map((row) => new Map([...row].map(([c, v]) => [c, -v])));
  // B = −K_G pode ser indefinida: usa-se a iteração em K⁻¹B e filtram-se os μ positivos
  const raw = subspace(prep, prep.lu, negKg, nModes + 3);
  const modes = raw.filter((m) => m.mu > 1e-9).slice(0, nModes).map((m) => ({ factor: m.mu, shape: expand(prep, m.phi) }));
  return { modes };
}

export interface VibrationMode { omega: number; freq: number; period: number; shape: Float64Array; partX: number; partY: number; massX: number; massY: number }

/**
 * Vibração livre K·φ = ω²·M·φ com massas concentradas nos nós (translações x e y),
 * obtidas das cargas verticais da combinação de massa (F/g) somadas a massas nodais adicionais (t).
 */
export function vibration(prep: Prepared, massLoading: Loading, extraMass: Map<number, number> = new Map(), nModes = 6, g = 9.80665): { modes: VibrationMode[]; totalMass: number; error?: string } {
  if (!prep.lu) return { modes: [], totalMass: 0, error: prep.error };
  // cargas verticais nodais equivalentes da combinação de massa
  const Fv = Float64Array.from(massLoading.nodal);
  prep.members.forEach((pm) => {
    const l = massLoading.elem[pm.index];
    if (l.qx.every((x) => x === 0) && l.qy.every((x) => x === 0)) return;
    // reações de engastamento perfeito por equilíbrio (cargas de vão) no sistema global
    const Qx = P.evaluate(P.integrate(l.qx), pm.L), Qy = P.evaluate(P.integrate(l.qy), pm.L);
    const Ay = P.evaluate(P.integrate([0, ...l.qy]), pm.L), Ax = P.evaluate(P.integrate([0, ...l.qx]), pm.L);
    const fyGlobal = pm.s * Qx + pm.c * Qy, wy = pm.s * Ax + pm.c * Ay;
    // divide a resultante vertical entre os nós pelo centro de carga
    const xr = Math.abs(fyGlobal) > 1e-12 ? wy / fyGlobal : pm.L / 2;
    Fv[pm.j * 3 + 1] += (fyGlobal * xr) / pm.L;
    Fv[pm.i * 3 + 1] += fyGlobal * (1 - xr / pm.L);
  });
  const mass = new Float64Array(prep.ndof);
  let totalMass = 0;
  prep.model.nodes.forEach((n, k) => {
    const m = Math.max(0, -Fv[k * 3 + 1]) / g + (extraMass.get(n.id) ?? 0);
    mass[k * 3] = m; mass[k * 3 + 1] = m;
    totalMass += m;
  });
  const M: SpRows = Array.from({ length: prep.ndof }, () => new Map<number, number>());
  for (let d = 0; d < prep.ndof; d++) if (mass[d]) spAdd(M, d, d, mass[d]);
  // massas em gdl girados (apoio inclinado): M é isotrópica nas translações, a rotação não a altera
  const raw = subspace(prep, prep.lu, M, nModes);
  const rx = new Float64Array(prep.free.length), ry = new Float64Array(prep.free.length);
  prep.free.forEach((d, p) => {
    const sk = prep.skew.find((s) => s.nodeIdx === Math.floor(d / 3));
    const t = d % 3;
    if (t === 2) return;
    if (!sk) { if (t === 0) rx[p] = 1; else ry[p] = 1; return; }
    // gdl nos eixos do apoio: componentes do deslocamento unitário global
    if (t === 0) { rx[p] = sk.c; ry[p] = sk.s; } else { rx[p] = -sk.s; ry[p] = sk.c; }
  });
  const Mrx = spMul(M, prep, rx), Mry = spMul(M, prep, ry);
  const modes = raw.filter((m) => m.mu > 0).map((m) => {
    const Mphi = spMul(M, prep, m.phi);
    const mg = dot(m.phi, Mphi);
    const Lx = dot(m.phi, Mrx), Ly = dot(m.phi, Mry);
    const omega = Math.sqrt(m.mu);
    return { omega, freq: omega / (2 * Math.PI), period: (2 * Math.PI) / omega, shape: expand(prep, m.phi), partX: Lx / mg, partY: Ly / mg, massX: (Lx * Lx) / mg, massY: (Ly * Ly) / mg };
  });
  return { modes, totalMass };
}

export { dofMap };
