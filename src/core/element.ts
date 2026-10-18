// Elemento de pórtico plano formulado por flexibilidade (base em balanço engastado em i).
// Unifica Euler-Bernoulli e Timoshenko, cargas lineares, temperatura e deformações iniciais
// concentradas (usadas nas linhas de influência por Müller-Breslau).
import { P, gauss, inv3, matMul, transpose, type Mat, type Poly } from './math';

export interface ElemProps {
  L: number; EA: number; EI: number; GAs: number;
  /** Ligação semirrígida: rigidez rotacional da mola entre a barra e o nó (kN·m/rad). Ausente = rígida. */
  kI?: number;
  kJ?: number;
}

/** Flexibilidades das molas de extremidade (1/k), nulas quando a ligação é rígida. */
export function springFlex(p: ElemProps): [number, number] {
  const f = (k?: number) => (k !== undefined && Number.isFinite(k) && k > 0 ? 1 / k : 0);
  return [f(p.kI), f(p.kJ)];
}

export interface ElemLoad {
  qx: Poly; // carga axial local (kN/m), função de x
  qy: Poly; // carga transversal local (kN/m)
  eps0: number; // deformação axial inicial (térmica)
  kap0: number; // curvatura inicial (térmica)
  mi: number; // momento aplicado na extremidade i
  mj: number;
  /** Deformação inicial concentrada em x = a: e = [Δu, γ (conjugado de V), Δθ]. */
  dirac?: { a: number; e: [number, number, number] };
}

export const noLoad = (): ElemLoad => ({ qx: [0], qy: [0], eps0: 0, kap0: 0, mi: 0, mj: 0 });

/** Matriz que leva Q = [Nj, Vj, Mj] aos esforços de seção [N, V, M] em x. */
function bMat(x: number, L: number): Mat {
  return [
    [1, 0, 0],
    [0, -1, 0],
    [0, L - x, 1],
  ];
}

function flex(p: ElemProps) {
  return { fN: 1 / p.EA, fV: Number.isFinite(p.GAs) ? 1 / p.GAs : 0, fM: 1 / p.EI };
}

/** Esforços na base engastada (balanço) devidos às cargas de vão, com Q = 0. */
function loadIntegrals(ld: ElemLoad, L: number) {
  const Qx = P.integrate(ld.qx);
  const Qy = P.integrate(ld.qy);
  const Ay = P.integrate(P.add(P.scale([0, ...ld.qy], 1))); // ∫ ξ qy dξ
  const QxL = P.evaluate(Qx, L), QyL = P.evaluate(Qy, L), AyL = P.evaluate(Ay, L);
  const N0 = (x: number) => QxL - P.evaluate(Qx, x);
  const V0 = (x: number) => -(QyL - P.evaluate(Qy, x));
  const M0 = (x: number) => AyL - P.evaluate(Ay, x) - x * (QyL - P.evaluate(Qy, x));
  return { QxL, QyL, AyL, N0, V0, M0 };
}

export interface ElemMatrices {
  K: Mat; // 6x6 local completa (sem condensação)
  f: number[]; // forças de engastamento perfeito locais (sem condensação)
  Kc: Mat; // condensada para as liberações
  fc: number[];
  released: number[]; // índices locais liberados (2 e/ou 5)
}

export function H(L: number): Mat {
  return [
    [-1, 0, 0],
    [0, -1, 0],
    [0, -L, -1],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

export function flexibility(p: ElemProps): Mat {
  const { fN, fV, fM } = flex(p);
  const F: Mat = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const fd = [fN, fV, fM];
  for (let a = 0; a < 3; a++)
    for (let b = 0; b < 3; b++)
      F[a][b] = gauss((x) => {
        const B = bMat(x, p.L);
        let s = 0;
        for (let k = 0; k < 3; k++) s += B[k][a] * fd[k] * B[k][b];
        return s;
      }, 0, p.L);
  // molas de extremidade: curvatura concentrada M/k em x = 0 e x = L
  const [fi, fj] = springFlex(p);
  const B0 = bMat(0, p.L)[2];
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) F[a][b] += fi * B0[a] * B0[b];
  F[2][2] += fj;
  return F;
}

export function elementMatrices(p: ElemProps, ld: ElemLoad, releaseI: boolean, releaseJ: boolean): ElemMatrices {
  const L = p.L;
  const F = flexibility(p);
  const Fi = inv3(F);
  const Hm = H(L);
  const K = matMul(matMul(Hm, Fi), transpose(Hm));

  const { fN, fV, fM } = flex(p);
  const li = loadIntegrals(ld, L);
  const d0 = [0, 0, 0];
  for (let a = 0; a < 3; a++)
    d0[a] = gauss((x) => {
      const B = bMat(x, L);
      const e = [fN * li.N0(x) + ld.eps0, fV * li.V0(x), fM * li.M0(x) + ld.kap0];
      return B[0][a] * e[0] + B[1][a] * e[1] + B[2][a] * e[2];
    }, 0, L);
  const [fi] = springFlex(p);
  if (fi) { const B0 = bMat(0, L)[2], m0 = li.M0(0) * fi; for (let a = 0; a < 3; a++) d0[a] += B0[a] * m0; }
  if (ld.dirac) {
    const B = bMat(ld.dirac.a, L), e = ld.dirac.e;
    for (let a = 0; a < 3; a++) d0[a] += B[0][a] * e[0] + B[1][a] * e[1] + B[2][a] * e[2];
  }
  const Q0 = Fi.map((r) => -(r[0] * d0[0] + r[1] * d0[1] + r[2] * d0[2]));
  const f = Hm.map((r) => r[0] * Q0[0] + r[1] * Q0[1] + r[2] * Q0[2]);
  f[0] += -li.QxL;
  f[1] += -li.QyL;
  f[2] += -li.AyL - ld.mi;
  f[5] += -ld.mj;

  const released: number[] = [];
  if (releaseI) released.push(2);
  if (releaseJ) released.push(5);
  const { Kc, fc } = condense(K, f, released);
  return { K, f, Kc, fc, released };
}

function condense(K: Mat, f: number[], R: number[]) {
  if (!R.length) return { Kc: K.map((r) => r.slice()), fc: f.slice() };
  const Kc = K.map((r) => r.slice());
  const fc = f.slice();
  // condensação sequencial (exata)
  for (const r of R) {
    const krr = Kc[r][r];
    const row = Kc[r].slice(), fr = fc[r];
    for (let i = 0; i < 6; i++) {
      const kir = Kc[i][r];
      if (kir === 0) continue;
      for (let j = 0; j < 6; j++) Kc[i][j] -= (kir * row[j]) / krr;
      fc[i] -= (kir * fr) / krr;
    }
    for (let j = 0; j < 6; j++) { Kc[r][j] = 0; Kc[j][r] = 0; }
    fc[r] = 0;
  }
  return { Kc, fc };
}

/** Recupera rotações liberadas a partir dos demais deslocamentos locais. */
export function recoverReleased(em: ElemMatrices, uLocal: number[]): number[] {
  const u = uLocal.slice();
  const R = em.released;
  if (!R.length) return u;
  for (const r of R) u[r] = 0;
  const known = [0, 1, 2, 3, 4, 5].filter((i) => !R.includes(i));
  const rhs = R.map((r) => -(em.f[r] + known.reduce((s, k) => s + em.K[r][k] * u[k], 0)));
  if (R.length === 1) u[R[0]] = rhs[0] / em.K[R[0]][R[0]];
  else {
    const [a, b] = R;
    const k11 = em.K[a][a], k12 = em.K[a][b], k21 = em.K[b][a], k22 = em.K[b][b];
    const det = k11 * k22 - k12 * k21;
    u[a] = (rhs[0] * k22 - k12 * rhs[1]) / det;
    u[b] = (k11 * rhs[1] - k21 * rhs[0]) / det;
  }
  return u;
}

export function rotation(c: number, s: number): Mat {
  return [
    [c, s, 0, 0, 0, 0],
    [-s, c, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, c, s, 0],
    [0, 0, 0, -s, c, 0],
    [0, 0, 0, 0, 0, 1],
  ];
}
