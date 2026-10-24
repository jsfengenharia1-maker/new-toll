// Casca espessa plana de 6 nós (N2b, K1.3.34): triângulo com nós nos vértices e nos meios dos lados, 6 gdl por nó
// (ux, uy, uz, rx, ry, rz globais). Membrana de deformação linear (LST, deslocamentos quadráticos); placa de Mindlin
// com w e rotações quadráticas e o cortante transversal por interpolação mista (família MITC): campo de Raviart-Thomas
// de grau 1 girado (8 parâmetros) amarrado às deformações tangenciais de cortante em dois pontos de Gauss de cada lado
// e às integrais ∫γ̃ dA = ∫γ dA no interior. Como ∇w (w quadrático) pertence a esse espaço, a restrição de Kirchhoff é
// representável e a placa fina não trava; passa os testes da membrana e da placa com curvatura constante. Giro no plano
// (rz local) com rigidez pequena só para não deixar o gdl solto (`kGiro`). Membrana, flexão e pressão com 3 pontos de
// integração (exatos); cortante com 6 pontos (grau 4). Núcleo puro, sem dependências.
import type { V3 } from './fe3d';

export interface Casca3 {
  /** Nós: vértices 1, 2, 3 (anti-horário em torno da normal) e meios dos lados 1-2, 2-3, 3-1. */
  nos: [number, number, number, number, number, number];
  E: number; nu: number; h: number;
  /** Fator de cisalhamento transversal (padrão 5/6). */
  kc?: number;
  /** Rigidez do giro no plano, por nó, como fração de E·h·A (padrão 1e-4). */
  kGiro?: number;
  /**
   * Giro no plano acoplado à rotação da membrana (escadas, E4c): penalização (η·G·h/2)·∫(θn − ω)² dA, com ω = ½(∂v/∂x − ∂u/∂y) a
   * rotação do campo de deslocamentos da membrana e η esta fração (1 = valor de Hughes-Brezzi). Em dobras entre cascas não
   * coplanares o giro "solto" de `kGiro` deixa a ligação mais mole que a casca contínua. Quando informado, substitui `kGiro`.
   */
  acoplarGiro?: number;
  /** Direção de referência do eixo local x (projetada no plano da casca). Padrão: X global (Y se a casca for normal a X). */
  ref?: V3;
  /** Material com rigidez própria (alvenaria, E1e): os fatores de rigidez do concreto (EA dos pilares, 0,8·Eci) não se aplicam. */
  semReducao?: boolean;
}

/** Elemento montado: rigidez global 36 × 36 (por linhas), gdl, base local e dados para cargas e esforços. */
export interface ElementoCasca {
  K: Float64Array; dofs: number[]; R: [V3, V3, V3]; area: number;
  /** Matrizes B no centroide (locais): membrana 3 × 36, curvaturas 3 × 36, cortante 2 × 36. */
  Bm: number[][]; Bb: number[][]; Bs: number[][];
  Dm: number; Db: number; Ds: number; nu: number;
  /** Carga nodal equivalente local de pressão unitária (36). */
  fq: Float64Array;
  /** Rigidez local (para esforços sem transformar de novo). */
  Kl: Float64Array;
}

const PG: [number, number, number][] = [[2 / 3, 1 / 6, 1 / 6], [1 / 6, 2 / 3, 1 / 6], [1 / 6, 1 / 6, 2 / 3]]; // (L1, L2, L3), peso A/3
// regra de 6 pontos (grau 4): (L1, L2, L3, peso relativo à área)
const QA = 0.445948490915965, WA = 0.223381589678011, QB = 0.091576213509771, WB = 0.109951743655322;
const PG6: [number, number, number, number][] = [[QA, QA, 1 - 2 * QA, WA], [QA, 1 - 2 * QA, QA, WA], [1 - 2 * QA, QA, QA, WA], [QB, QB, 1 - 2 * QB, WB], [QB, 1 - 2 * QB, QB, WB], [1 - 2 * QB, QB, QB, WB]];

/** Funções de forma T6 e derivadas em relação a L2 (ξ) e L3 (η), com L1 = 1 − ξ − η. */
function forma(L1: number, L2: number, L3: number) {
  const N = [L1 * (2 * L1 - 1), L2 * (2 * L2 - 1), L3 * (2 * L3 - 1), 4 * L1 * L2, 4 * L2 * L3, 4 * L3 * L1];
  const dXi = [-(4 * L1 - 1), 4 * L2 - 1, 0, 4 * (L1 - L2), 4 * L3, -4 * L3];
  const dEt = [-(4 * L1 - 1), 0, 4 * L3 - 1, -4 * L2, 4 * L2, 4 * (L1 - L3)];
  return { N, dXi, dEt };
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V3): V3 => { const L = Math.hypot(a[0], a[1], a[2]); return [a[0] / L, a[1] / L, a[2] / L]; };
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Inversa de matriz quadrada pequena (Gauss-Jordan com pivotamento parcial). */
function inversa(A: number[][]): number[][] {
  const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c];
    if (Math.abs(d) < 1e-300) throw new Error('Casca degenerada (matriz de amarração singular).');
    for (let k = 0; k < 2 * n; k++) M[c][k] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let k = 0; k < 2 * n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r) => r.slice(n));
}

/** Índices locais: gdl g (0 u, 1 v, 2 w, 3 θx, 4 θy, 5 θz) do nó i. */
const ix = (i: number, g: number) => 6 * i + g;

/** Rigidez e dados do elemento a partir das coordenadas globais dos nós. */
export function rigidezCasca(nos: V3[], c: Casca3): ElementoCasca {
  const P = c.nos.map((n) => nos[n]);
  // eixos locais: z normal (regra da mão direita em 1-2-3); x = projeção de `ref` (padrão X global; Y global quando a
  // casca é perpendicular a X) no plano da casca; y = z × x
  const ez = unit(cross(sub(P[1], P[0]), sub(P[2], P[0])));
  let rf: V3 = c.ref ?? [1, 0, 0];
  if (Math.abs(dot(rf, ez)) > 0.99 * Math.hypot(...rf)) rf = [0, 1, 0];
  const ex = unit(sub(rf, [ez[0] * dot(rf, ez), ez[1] * dot(rf, ez), ez[2] * dot(rf, ez)])), ey = cross(ez, ex);
  const R: [V3, V3, V3] = [ex, ey, ez];
  const xy = P.map((p) => { const d = sub(p, P[0]); return [dot(d, ex), dot(d, ey)] as [number, number]; });
  const kc = c.kc ?? 5 / 6, G = c.E / (2 * (1 + c.nu));
  const Dm = (c.E * c.h) / (1 - c.nu * c.nu), Db = (c.E * c.h ** 3) / (12 * (1 - c.nu * c.nu)), Ds = kc * G * c.h;
  /** Derivadas cartesianas das funções de forma num ponto. */
  const derivadas = (L1: number, L2: number, L3: number) => {
    const { N, dXi, dEt } = forma(L1, L2, L3);
    let J11 = 0, J12 = 0, J21 = 0, J22 = 0;
    for (let i = 0; i < 6; i++) { J11 += dXi[i] * xy[i][0]; J12 += dXi[i] * xy[i][1]; J21 += dEt[i] * xy[i][0]; J22 += dEt[i] * xy[i][1]; }
    const det = J11 * J22 - J12 * J21;
    const dx = N.map((_, i) => (J22 * dXi[i] - J12 * dEt[i]) / det), dy = N.map((_, i) => (-J21 * dXi[i] + J11 * dEt[i]) / det);
    return { N, dx, dy, det };
  };
  // amarração do cortante: 2 pontos de Gauss por lado (lados 1-2, 2-3, 3-1 com nós do meio 4, 5, 6)
  const lados: [number, number, number][] = [[0, 1, 3], [1, 2, 4], [2, 0, 5]];
  const g1 = 0.5 - 0.5 / Math.sqrt(3), g2 = 0.5 + 0.5 / Math.sqrt(3);
  const A: number[][] = [], Bt: number[][] = [];
  for (const [a, b, m] of lados) {
    const dxl = xy[b][0] - xy[a][0], dyl = xy[b][1] - xy[a][1], L = Math.hypot(dxl, dyl), tx = dxl / L, ty = dyl / L;
    for (const s of [g1, g2]) {
      // funções quadráticas do lado: a (s=0), m (s=1/2), b (s=1)
      const n = [(1 - s) * (1 - 2 * s), 4 * s * (1 - s), s * (2 * s - 1)], dn = [4 * s - 3, 4 - 8 * s, 4 * s - 1];
      const x = xy[a][0] + s * dxl, y = xy[a][1] + s * dyl;
      const r0 = y * tx - x * ty; // (y, −x)·t
      A.push([tx, tx * x, tx * y, ty, ty * x, ty * y, r0 * x, r0 * y]);
      const row = new Array(36).fill(0);
      [a, m, b].forEach((no, k) => {
        row[ix(no, 2)] += dn[k] / L; // dw/ds
        row[ix(no, 4)] += n[k] * tx; // θy·tx (βx = θy)
        row[ix(no, 3)] -= n[k] * ty; // −θx·ty (βy = −θx)
      });
      Bt.push(row);
    }
  }
  // momentos internos: ∫γ̃ dA = ∫γ dA (γ do campo de deslocamentos; integrandos de grau 2, regra de 3 pontos exata)
  const Ain = [new Array(8).fill(0), new Array(8).fill(0)], Bin = [new Array(36).fill(0), new Array(36).fill(0)];
  for (const [L1, L2, L3] of PG) {
    const { N, dx, dy, det } = derivadas(L1, L2, L3), w = det / 6;
    const x = N.reduce((t, v, i) => t + v * xy[i][0], 0), y = N.reduce((t, v, i) => t + v * xy[i][1], 0);
    [1, x, y, 0, 0, 0, y * x, y * y].forEach((v, k) => (Ain[0][k] += w * v));
    [0, 0, 0, 1, x, y, -x * x, -x * y].forEach((v, k) => (Ain[1][k] += w * v));
    for (let i = 0; i < 6; i++) {
      Bin[0][ix(i, 2)] += w * dx[i]; Bin[0][ix(i, 4)] += w * N[i];
      Bin[1][ix(i, 2)] += w * dy[i]; Bin[1][ix(i, 3)] -= w * N[i];
    }
  }
  A.push(...Ain); Bt.push(...Bin);
  const Ai = inversa(A);
  const coef = Ai.map((r) => Array.from({ length: 36 }, (_, j) => r.reduce((t, v, k) => t + v * Bt[k][j], 0))); // 8 × 36
  // γ̃x = a0 + a1·x + a2·y + y·(d·x + e·y); γ̃y = b0 + b1·x + b2·y − x·(d·x + e·y)  (Raviart-Thomas de grau 1 girado)
  const Bcort = (x: number, y: number) => [
    Array.from({ length: 36 }, (_, j) => coef[0][j] + x * coef[1][j] + y * coef[2][j] + y * x * coef[6][j] + y * y * coef[7][j]),
    Array.from({ length: 36 }, (_, j) => coef[3][j] + x * coef[4][j] + y * coef[5][j] - x * x * coef[6][j] - x * y * coef[7][j]),
  ];
  const Bmem = (dx: number[], dy: number[]) => {
    const B = [new Array(36).fill(0), new Array(36).fill(0), new Array(36).fill(0)];
    for (let i = 0; i < 6; i++) { B[0][ix(i, 0)] = dx[i]; B[1][ix(i, 1)] = dy[i]; B[2][ix(i, 0)] = dy[i]; B[2][ix(i, 1)] = dx[i]; }
    return B;
  };
  const Bcurv = (dx: number[], dy: number[]) => {
    const B = [new Array(36).fill(0), new Array(36).fill(0), new Array(36).fill(0)];
    // κx = βx,x = θy,x; κy = βy,y = −θx,y; κxy = βx,y + βy,x = θy,y − θx,x
    for (let i = 0; i < 6; i++) { B[0][ix(i, 4)] = dx[i]; B[1][ix(i, 3)] = -dy[i]; B[2][ix(i, 4)] = dy[i]; B[2][ix(i, 3)] = -dx[i]; }
    return B;
  };
  const Kl = new Float64Array(36 * 36), fq = new Float64Array(36);
  const nu = c.nu, half = (1 - nu) / 2;
  const addBtDB = (B: number[][], D: number, w: number, iso: boolean) => {
    // D isótropo [[1,ν,0],[ν,1,0],[0,0,(1−ν)/2]]·D (membrana e flexão) ou D·I₂ (cortante)
    const DB = iso ? [B[0].map((v, j) => D * (v + nu * B[1][j])), B[1].map((v, j) => D * (nu * B[0][j] + v)), B[2].map((v) => D * half * v)] : B.map((r) => r.map((v) => D * v));
    for (let a = 0; a < 36; a++) for (let k = 0; k < B.length; k++) { const ba = B[k][a]; if (!ba) continue; for (let b = 0; b < 36; b++) Kl[a * 36 + b] += w * ba * DB[k][b]; }
  };
  let area = 0;
  for (const [L1, L2, L3] of PG) {
    const { N, dx, dy, det } = derivadas(L1, L2, L3);
    const w = det / 6; // peso 1/6 na área de referência 1/2
    area += w;
    addBtDB(Bmem(dx, dy), Dm, w, true);
    addBtDB(Bcurv(dx, dy), Db, w, true);
    for (let i = 0; i < 6; i++) fq[ix(i, 2)] += w * N[i];
  }
  // cortante (γ̃ quadrático): regra de 6 pontos, exata até grau 4
  for (const [L1, L2, L3, pw] of PG6) {
    const { N, det } = derivadas(L1, L2, L3);
    const x = N.reduce((t, v, i) => t + v * xy[i][0], 0), y = N.reduce((t, v, i) => t + v * xy[i][1], 0);
    addBtDB(Bcort(x, y), Ds, (pw * det) / 2, false);
  }
  if (c.acoplarGiro) {
    // θn − ω ≈ 0 com o giro local interpolado (T6) e ω da membrana; (θn − ω)² tem grau 4 → regra de 6 pontos
    const gamma = c.acoplarGiro * (c.E / (2 * (1 + c.nu))) * c.h;
    for (const [L1, L2, L3, pw] of PG6) {
      const { N, dx, dy, det } = derivadas(L1, L2, L3);
      const B = new Array(36).fill(0);
      for (let i = 0; i < 6; i++) { B[ix(i, 5)] += N[i]; B[ix(i, 1)] -= 0.5 * dx[i]; B[ix(i, 0)] += 0.5 * dy[i]; }
      const w = gamma * ((pw * det) / 2);
      for (let a = 0; a < 36; a++) { if (!B[a]) continue; for (let b2 = 0; b2 < 36; b2++) if (B[b2]) Kl[a * 36 + b2] += w * B[a] * B[b2]; }
    }
  } else {
    const kg = (c.kGiro ?? 1e-4) * c.E * c.h * area;
    for (let i = 0; i < 6; i++) Kl[ix(i, 5) * 36 + ix(i, 5)] += kg;
  }
  // global: K = Tᵀ Kl T, T bloco-diagonal com R (linhas ex, ey, ez) em cada trio de gdl
  const K = new Float64Array(36 * 36);
  const tmp = new Float64Array(36 * 36);
  for (let a = 0; a < 36; a++) for (let B = 0; B < 12; B++) for (let q = 0; q < 3; q++) {
    // (Kl T)[a][3B+q] = Σ_r Kl[a][3B+r] R[r][q]
    let s = 0;
    for (let r = 0; r < 3; r++) s += Kl[a * 36 + 3 * B + r] * R[r][q];
    tmp[a * 36 + 3 * B + q] = s;
  }
  for (let A2 = 0; A2 < 12; A2++) for (let p = 0; p < 3; p++) for (let b = 0; b < 36; b++) {
    let s = 0;
    for (let r = 0; r < 3; r++) s += R[r][p] * tmp[(3 * A2 + r) * 36 + b];
    K[(3 * A2 + p) * 36 + b] = s;
  }
  const { N: Nc, dx: dxc, dy: dyc } = derivadas(1 / 3, 1 / 3, 1 / 3);
  const xc = Nc.reduce((s, v, i) => s + v * xy[i][0], 0), yc = Nc.reduce((s, v, i) => s + v * xy[i][1], 0);
  return { K, Kl, dofs: c.nos.flatMap((n) => [0, 1, 2, 3, 4, 5].map((g) => n * 6 + g)), R, area, Bm: Bmem(dxc, dyc), Bb: Bcurv(dxc, dyc), Bs: Bcort(xc, yc), Dm, Db, Ds, nu, fq };
}

/** Carga nodal equivalente global (36) de pressão uniforme q ao longo da normal local z. */
export function cargaPressaoCasca(e: ElementoCasca, q: number): Float64Array {
  const f = new Float64Array(36);
  for (let i = 0; i < 6; i++) { const fz = q * e.fq[ix(i, 2)]; for (let r = 0; r < 3; r++) f[6 * i + r] += e.R[2][r] * fz; }
  return f;
}

/** Deslocamentos locais (36) do elemento a partir do vetor global u (6 por nó). */
function locais(e: ElementoCasca, u: ArrayLike<number>): Float64Array {
  const ul = new Float64Array(36);
  for (let B = 0; B < 12; B++) for (let r = 0; r < 3; r++) { let s = 0; for (let q = 0; q < 3; q++) s += e.R[r][q] * u[e.dofs[3 * B + q]]; ul[3 * B + r] = s; }
  return ul;
}

/**
 * Esforços no centroide, eixos locais, por metro: Nx, Ny, Nxy (kN/m), Mx, My, Mxy (kN·m/m; M > 0 traciona a face
 * z− local, como nas vigas), Qx, Qy (kN/m). Com `forcasNo`, soma K·u − f(q) do elemento (para as reações).
 */
export function esforcosCasca(e: ElementoCasca, u: ArrayLike<number>, q = 0, forcasNo?: Float64Array): Float64Array {
  const ul = locais(e, u);
  const mul = (B: number[][]) => B.map((r) => r.reduce((s, v, j) => s + v * ul[j], 0));
  const eps = mul(e.Bm), kap = mul(e.Bb), gam = mul(e.Bs), nu = e.nu, h2 = (1 - nu) / 2;
  const out = new Float64Array(8);
  out[0] = e.Dm * (eps[0] + nu * eps[1]); out[1] = e.Dm * (nu * eps[0] + eps[1]); out[2] = e.Dm * h2 * eps[2];
  out[3] = -e.Db * (kap[0] + nu * kap[1]); out[4] = -e.Db * (nu * kap[0] + kap[1]); out[5] = -e.Db * h2 * kap[2];
  out[6] = e.Ds * gam[0]; out[7] = e.Ds * gam[1];
  if (forcasNo) {
    const fq = q ? cargaPressaoCasca(e, q) : null;
    for (let a = 0; a < 36; a++) { let s = fq ? -fq[a] : 0; for (let b = 0; b < 36; b++) s += e.K[a * 36 + b] * u[e.dofs[b]]; forcasNo[e.dofs[a]] += s; }
  }
  return out;
}
