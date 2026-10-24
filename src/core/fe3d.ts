// Barras 3D (pórtico espacial e, com os gdl do plano presos, grelha), com trechos rígidos nas extremidades,
// liberações por condensação, molas, restrições mestre-escravo (diafragma rígido) e vários casos de carga.
// Rigidez direta: K esparsa nas equações independentes, Cuthill-McKee reversa e LDLᵀ em banda (math.ts).
// N2b: barra de Timoshenko (áreas de cisalhamento Ay/Az), barras só no plano (soPlano), gdl condensados
// recuperados por superelementos (complemento de Schur, condensacao.ts) e cascas de 6 nós (casca.ts).
import { rcmOrder, spAdd, type SpRows } from './math';
import { fatorarLDL } from './sparseldl';
import { cargaPressaoCasca, esforcosCasca, rigidezCasca, type Casca3 } from './casca';
export type { Casca3 } from './casca';

export type V3 = [number, number, number];

export interface Barra3 {
  i: number; j: number;
  E: number; G: number; A: number;
  /** Inércias em torno dos eixos locais y e z, e constante de torção. */
  Iy: number; Iz: number; J: number;
  /** Vetor no plano local x-y (define o eixo y). Padrão: Z global; para barras verticais, X global. */
  ref?: V3;
  /** Trechos rígidos: do nó até a extremidade flexível, em coordenadas globais. */
  offI?: V3; offJ?: V3;
  /** Liberações por extremidade (gdl locais 3 = torção, 4 = My, 5 = Mz). */
  libI?: number[]; libJ?: number[];
  /**
   * Engaste parcial por extremidade: [gdl local, α] com 0 ≤ α ≤ 1 (0 = rótula, 1 = engaste).
   * Rigidez e forças de engastamento interpoladas entre a barra engastada e a liberada,
   * K = α·Kee + (1 − α)·Ker; com vários gdl, os pesos se multiplicam (interpolação multilinear).
   */
  engI?: [number, number][]; engJ?: [number, number][];
  /**
   * Áreas de cisalhamento (Timoshenko) para a flexão com deslocamento em y local (Ay, junto com Iz) e em z local
   * (Az, junto com Iy). Ausentes: Euler-Bernoulli (sem deformação por cortante).
   */
  Ay?: number; Az?: number;
  /**
   * Só a parte no plano XY entra na montagem (gdl globais ux, uy, rz das pontas) e nas cargas; a parte fora do plano
   * (uz, rx, ry) está num superelemento. Os esforços saem completos, com os deslocamentos recuperados.
   */
  soPlano?: boolean;
}

/** Superelemento: rigidez condensada (complemento de Schur) sobre gdl globais de fronteira. */
export interface Superelemento3 {
  /** Gdl globais (nó·6 + gdl) da fronteira, na ordem das linhas de K. */
  dofs: number[];
  /** Rigidez condensada nb × nb, por linhas. */
  K: ArrayLike<number>;
  /** Preenche em `u` os gdl condensados a partir da fronteira já resolvida e da carga do caso (ou sem carga). */
  recuperar?: (u: Float64Array, carga: CargaSuper3 | undefined) => void;
}
/** Carga condensada de um superelemento num caso: P (nb) e um dado livre para a recuperação. */
export interface CargaSuper3 { se: number; P: ArrayLike<number>; dados?: unknown }

/** Gdl do nó: 0 ux, 1 uy, 2 uz, 3 rx, 4 ry, 5 rz. */
export interface Modelo3 {
  nos: V3[];
  barras: Barra3[];
  /** Gdl presos por nó (índice do nó → lista de gdl). */
  apoios: Map<number, number[]>;
  molas?: { no: number; gdl: number; k: number }[];
  /** Diafragma rígido: ux, uy e rz do escravo seguem o mestre (corpo rígido no plano XY). */
  escravos?: { no: number; mestre: number }[];
  /** Gdl (nó·6 + gdl) fora das equações, preenchidos pela recuperação dos superelementos (não são apoios). */
  condensados?: Set<number>;
  superelementos?: Superelemento3[];
  /** Cascas de 6 nós (casca.ts). */
  cascas?: Casca3[];
}

export interface Caso3 {
  nodais: { no: number; f: number[] }[];
  /** Carga uniforme por comprimento da parte flexível, em coordenadas globais. */
  distribuidas: { barra: number; q: V3 }[];
  /** Forças e momentos concentrados (globais: Fx, Fy, Fz, Mx, My, Mz) a `a` metros da extremidade flexível i. */
  pontuais?: { barra: number; a: number; f: number[] }[];
  /** Cargas condensadas dos superelementos. */
  superelementos?: CargaSuper3[];
  /** Pressão uniforme na casca (kN/m², ao longo da normal local z da casca). */
  pressoes?: { casca: number; q: number }[];
}

export interface Resultado3 {
  /** Deslocamentos nodais (6 por nó), um vetor por caso. */
  desloc: Float64Array[];
  /** Esforços nas extremidades flexíveis, eixos locais (12 por barra: N, Vy, Vz, T, My, Mz em i e em j), por caso. */
  esforcos: Float64Array[][];
  /** Reações nos gdl presos (6 por nó com apoio), por caso. */
  reacoes: Map<number, number[]>[];
  /** Esforços das cascas no centroide (Nx, Ny, Nxy, Mx, My, Mxy, Qx, Qy; eixos locais, por metro), por caso. */
  cascas?: Float64Array[][];
  neq: number; hb: number;
  erro?: string;
}

const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const L = Math.hypot(a[0], a[1], a[2]); return [a[0] / L, a[1] / L, a[2] / L]; };

/** Geometria da barra: comprimento flexível, base local (linhas = ex, ey, ez) e trechos rígidos. */
export function baseBarra(m: Modelo3, b: Barra3) {
  const oi = b.offI ?? [0, 0, 0], oj = b.offJ ?? [0, 0, 0];
  const pi = m.nos[b.i], pj = m.nos[b.j];
  const a: V3 = [pi[0] + oi[0], pi[1] + oi[1], pi[2] + oi[2]], z: V3 = [pj[0] + oj[0], pj[1] + oj[1], pj[2] + oj[2]];
  const d: V3 = [z[0] - a[0], z[1] - a[1], z[2] - a[2]];
  const L = Math.hypot(d[0], d[1], d[2]);
  const ex = norm(d);
  let ref: V3 = b.ref ?? [0, 0, 1];
  if (Math.abs(ex[0] * ref[0] + ex[1] * ref[1] + ex[2] * ref[2]) > 0.999 * Math.hypot(...ref)) ref = Math.abs(ex[2]) > 0.999 ? [1, 0, 0] : [0, 0, 1];
  const ez = norm(cross(ex, ref)), ey = cross(ez, ex);
  return { L, R: [ex, ey, ez] as [V3, V3, V3], oi, oj };
}

/** Rigidez local 12×12 (Euler-Bernoulli; Timoshenko com Ay/Az: Φ = 12EI/(G·As·L²)). */
export function rigidezLocal(b: Barra3, L: number): number[][] {
  const k = Array.from({ length: 12 }, () => new Array(12).fill(0));
  const set = (r: number, c: number, v: number) => { k[r][c] += v; if (r !== c) k[c][r] += v; };
  const EA = (b.E * b.A) / L, GJ = (b.G * b.J) / L;
  set(0, 0, EA); set(6, 6, EA); set(0, 6, -EA);
  set(3, 3, GJ); set(9, 9, GJ); set(3, 9, -GJ);
  const z = b.E * b.Iz, y = b.E * b.Iy, L2 = L * L, L3 = L2 * L;
  if (b.Ay || b.Az) {
    const fy = b.Ay ? (12 * z) / (b.G * b.Ay * L2) : 0, fz = b.Az ? (12 * y) / (b.G * b.Az * L2) : 0;
    const cy = z / (1 + fy), cz = y / (1 + fz);
    set(1, 1, (12 * cy) / L3); set(1, 5, (6 * cy) / L2); set(1, 7, (-12 * cy) / L3); set(1, 11, (6 * cy) / L2);
    set(5, 5, ((4 + fy) * cy) / L); set(5, 7, (-6 * cy) / L2); set(5, 11, ((2 - fy) * cy) / L);
    set(7, 7, (12 * cy) / L3); set(7, 11, (-6 * cy) / L2); set(11, 11, ((4 + fy) * cy) / L);
    set(2, 2, (12 * cz) / L3); set(2, 4, (-6 * cz) / L2); set(2, 8, (-12 * cz) / L3); set(2, 10, (-6 * cz) / L2);
    set(4, 4, ((4 + fz) * cz) / L); set(4, 8, (6 * cz) / L2); set(4, 10, ((2 - fz) * cz) / L);
    set(8, 8, (12 * cz) / L3); set(8, 10, (6 * cz) / L2); set(10, 10, ((4 + fz) * cz) / L);
    return k;
  }
  // flexão no plano x-y (v, θz)
  set(1, 1, (12 * z) / L3); set(1, 5, (6 * z) / L2); set(1, 7, (-12 * z) / L3); set(1, 11, (6 * z) / L2);
  set(5, 5, (4 * z) / L); set(5, 7, (-6 * z) / L2); set(5, 11, (2 * z) / L);
  set(7, 7, (12 * z) / L3); set(7, 11, (-6 * z) / L2); set(11, 11, (4 * z) / L);
  // flexão no plano x-z (w, θy; θy = −dw/dx)
  set(2, 2, (12 * y) / L3); set(2, 4, (-6 * y) / L2); set(2, 8, (-12 * y) / L3); set(2, 10, (-6 * y) / L2);
  set(4, 4, (4 * y) / L); set(4, 8, (6 * y) / L2); set(4, 10, (2 * y) / L);
  set(8, 8, (12 * y) / L3); set(8, 10, (6 * y) / L2); set(10, 10, (4 * y) / L);
  return k;
}

/** Forças de engastamento perfeito (locais) para carga uniforme local q = (qx, qy, qz). */
function engastamento(q: V3, L: number): number[] {
  const [qx, qy, qz] = q, L2 = L * L;
  // cargas nodais equivalentes P; esforços de engastamento f0 = −P
  const P = [qx * L / 2, qy * L / 2, qz * L / 2, 0, (-qz * L2) / 12, (qy * L2) / 12, qx * L / 2, qy * L / 2, qz * L / 2, 0, (qz * L2) / 12, (-qy * L2) / 12];
  return P.map((v) => -v);
}

/** Forças de engastamento perfeito (locais) para força e momento concentrados locais f = (Fx, Fy, Fz, Mx, My, Mz) em x = a. */
function engastamentoPontual(f: number[], a0: number, L: number): number[] {
  const a = Math.min(Math.max(a0, 0), L), b = L - a, L2 = L * L, L3 = L2 * L;
  const [Fx, Fy, Fz, Mx, My, Mz] = f;
  const P = new Array(12).fill(0);
  P[0] = (Fx * b) / L; P[6] = (Fx * a) / L;
  P[3] = (Mx * b) / L; P[9] = (Mx * a) / L;
  // força em y (v, θz = dv/dx)
  P[1] += (Fy * b * b * (3 * a + b)) / L3; P[5] += (Fy * a * b * b) / L2; P[7] += (Fy * a * a * (a + 3 * b)) / L3; P[11] += (-Fy * a * a * b) / L2;
  // força em z (w, θy = −dw/dx)
  P[2] += (Fz * b * b * (3 * a + b)) / L3; P[4] += (-Fz * a * b * b) / L2; P[8] += (Fz * a * a * (a + 3 * b)) / L3; P[10] += (Fz * a * a * b) / L2;
  // momento em z (gira no plano x-y)
  P[1] += (-6 * Mz * a * b) / L3; P[5] += (Mz * b * (b - 2 * a)) / L2; P[7] += (6 * Mz * a * b) / L3; P[11] += (Mz * a * (a - 2 * b)) / L2;
  // momento em y (gira no plano x-z)
  P[2] += (6 * My * a * b) / L3; P[4] += (My * b * (b - 2 * a)) / L2; P[8] += (-6 * My * a * b) / L3; P[10] += (My * a * (a - 2 * b)) / L2;
  return P.map((v) => -v);
}

/** Condensa os gdl liberados (rigidez e forças de engastamento). */
function condensar(k: number[][], f0: number[], lib: number[]) {
  for (const r of lib) {
    const krr = k[r][r];
    if (Math.abs(krr) < 1e-300) continue;
    const kr = k[r].slice(), fr = f0[r];
    for (let a = 0; a < 12; a++) {
      f0[a] -= (kr[a] / krr) * fr;
      for (let c = 0; c < 12; c++) k[a][c] -= (kr[a] * kr[c]) / krr;
    }
    for (let a = 0; a < 12; a++) { k[r][a] = 0; k[a][r] = 0; }
    f0[r] = 0;
  }
}

/** Gdl com engaste parcial (0 < α < 1); α ≤ 0 vira liberação e α ≥ 1, engaste. */
function parciais(b: Barra3): { gdl: number; a: number }[] {
  const out: { gdl: number; a: number }[] = [];
  for (const [lista, d] of [[b.engI, 0], [b.engJ, 6]] as const) for (const [g, a] of lista ?? []) out.push({ gdl: g + d, a: Math.min(1, Math.max(0, a)) });
  return out;
}

/**
 * Condensa as liberações e interpola os engastes parciais: soma, sobre cada combinação de gdl
 * parciais liberados (S), a barra com S liberado, com peso Π(1 − α) nos liberados × Π α nos demais.
 */
function condensarParcial(k: number[][], f0s: number[][], lib: number[], parc: { gdl: number; a: number }[]) {
  const sempre = [...lib, ...parc.filter((p) => p.a <= 0).map((p) => p.gdl)];
  const mistos = parc.filter((p) => p.a > 0 && p.a < 1);
  const kc = Array.from({ length: 12 }, () => new Array(12).fill(0));
  const fc = f0s.map(() => new Array(12).fill(0));
  for (let m = 0; m < 1 << mistos.length; m++) {
    let w = 1;
    const sub = [...sempre];
    mistos.forEach((p, i) => { if (m & (1 << i)) { w *= 1 - p.a; sub.push(p.gdl); } else w *= p.a; });
    if (!w) continue;
    const kk = k.map((r) => r.slice());
    condensar(kk, new Array(12).fill(0), sub);
    for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) kc[r][c] += w * kk[r][c];
    f0s.forEach((f0, ic) => { const ff = f0.slice(), k2 = k.map((r) => r.slice()); condensar(k2, ff, sub); for (let r = 0; r < 12; r++) fc[ic][r] += w * ff[r]; });
  }
  return { k: kc, f0s: fc };
}

/** Matriz que leva os 12 gdl dos nós (globais) aos 12 gdl locais das extremidades flexíveis. */
function transformacao(R: [V3, V3, V3], oi: V3, oj: V3): number[][] {
  const T = Array.from({ length: 12 }, () => new Array(12).fill(0));
  for (const [e, off] of [[0, oi], [1, oj]] as const) {
    // u_ext = u_no + θ × off  (θ × r = −[r]× θ)
    const S = [[0, off[2], -off[1]], [-off[2], 0, off[0]], [off[1], -off[0], 0]];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      T[6 * e + r][6 * e + c] = R[r][c];
      T[6 * e + 3 + r][6 * e + 3 + c] = R[r][c];
      let s = 0;
      for (let k = 0; k < 3; k++) s += R[r][k] * S[k][c];
      T[6 * e + r][6 * e + 3 + c] = s;
    }
  }
  return T;
}

/** Elemento de barra pronto para montar: rigidez local condensada, transformação e forças de engastamento por caso. */
export interface ElementoBarra { L: number; R: [V3, V3, V3]; T: number[][]; k: number[][]; f0s: number[][]; dofs: number[] }

/**
 * Rigidez local (com liberações e engastes parciais), transformação nó → extremidade flexível e forças de engastamento
 * das cargas da barra em cada caso (`dist`/`pont`: cargas globais da barra por caso).
 * Cargas concentradas em barras com áreas de cisalhamento usam as fórmulas de Euler-Bernoulli (o app não as aplica).
 */
export function elementoBarra(m: Modelo3, b: Barra3, dist: (V3[] | undefined)[], pont: ({ a: number; f: number[] }[] | undefined)[]): ElementoBarra {
  const { L, R, oi, oj } = baseBarra(m, b);
  const k = rigidezLocal(b, L);
  const lib = [...(b.libI ?? []), ...(b.libJ ?? []).map((g) => g + 6)];
  const T = transformacao(R, oi, oj);
  const f0s = dist.map((dl, ic) => {
    const f0 = new Array(12).fill(0);
    for (const q of dl ?? []) {
      const ql: V3 = [R[0][0] * q[0] + R[0][1] * q[1] + R[0][2] * q[2], R[1][0] * q[0] + R[1][1] * q[1] + R[1][2] * q[2], R[2][0] * q[0] + R[2][1] * q[1] + R[2][2] * q[2]];
      engastamento(ql, L).forEach((v, a) => (f0[a] += v));
    }
    for (const q of pont[ic] ?? []) {
      const fl = [0, 1, 2, 3, 4, 5].map((kk) => { const r = R[kk % 3], o = kk < 3 ? 0 : 3; return r[0] * q.f[o] + r[1] * q.f[o + 1] + r[2] * q.f[o + 2]; });
      engastamentoPontual(fl, q.a, L).forEach((v, a) => (f0[a] += v));
    }
    return f0;
  });
  const parc = parciais(b);
  // sem liberações nem engastes parciais a condensação não muda nada (pulá-la dá os mesmos valores)
  const { k: kc, f0s: fc } = lib.length || parc.length ? condensarParcial(k, f0s, lib, parc) : { k, f0s };
  return { L, R, T, k: kc, f0s: fc, dofs: [b.i, b.j].flatMap((n) => [0, 1, 2, 3, 4, 5].map((g) => n * 6 + g)) };
}

/** Rigidez local 12 × 12 com as liberações e os engastes parciais da barra condensados (sem cargas). */
export function rigidezCondensada(b: Barra3, L: number): number[][] {
  const k = rigidezLocal(b, L), lib = [...(b.libI ?? []), ...(b.libJ ?? []).map((g) => g + 6)], parc = parciais(b);
  return lib.length || parc.length ? condensarParcial(k, [], lib, parc).k : k;
}

/** Kg = Tᵀ k T (12 × 12, global), pulando os termos nulos de T. */
export function rigidezGlobal(e: { T: number[][]; k: number[][] }): number[][] {
  // laços explícitos na mesma ordem de soma, pulando os termos de T nulos (somariam ±0: os valores não nulos
  // de Kg ficam idênticos aos dos map/reduce; os nulos não entram na montagem)
  const nzT: number[][] = [];
  for (let c = 0; c < 12; c++) { const l: number[] = []; for (let a = 0; a < 12; a++) if (e.T[a][c] !== 0) l.push(a); nzT.push(l); }
  const kT: number[][] = [], Kg: number[][] = [];
  for (let r = 0; r < 12; r++) { const kr = e.k[r], row = new Array<number>(12); for (let c = 0; c < 12; c++) { const l = nzT[c]; let s = 0; for (let j = 0; j < l.length; j++) s += kr[l[j]] * e.T[l[j]][c]; row[c] = s; } kT.push(row); }
  for (let r = 0; r < 12; r++) { const row = new Array<number>(12), l = nzT[r]; for (let c = 0; c < 12; c++) { let s = 0; for (let j = 0; j < l.length; j++) s += e.T[l[j]][r] * kT[l[j]][c]; row[c] = s; } Kg.push(row); }
  return Kg;
}

/** Esforços de extremidade (locais, 12) da barra para os deslocamentos nodais globais `u` (6 por nó); caso sem forças de engastamento (ic fora da lista): só k·T·u. */
export function esforcosBarra(e: ElementoBarra, u: ArrayLike<number>, ic: number, ug = new Float64Array(12), ul = new Float64Array(12)): Float64Array {
  for (let a = 0; a < 12; a++) ug[a] = u[e.dofs[a]];
  for (let r = 0; r < 12; r++) { const row = e.T[r]; let s = 0; for (let a = 0; a < 12; a++) s += row[a] * ug[a]; ul[r] = s; }
  const f = new Float64Array(12), f0 = e.f0s[ic];
  for (let r = 0; r < 12; r++) { const row = e.k[r]; let s = 0; for (let a = 0; a < 12; a++) s += row[a] * ul[a]; f[r] = f0 ? s + f0[r] : s; }
  return f;
}

/** Gdl globais no plano XY (ux, uy, rz). */
export const NO_PLANO = [true, true, false, false, false, true];

export function resolver3(m: Modelo3, casos: Caso3[]): Resultado3 {
  const nn = m.nos.length;
  // equações: cada gdl livre e não escravo ganha uma; escravos combinam os do mestre; condensados ficam de fora
  const mapa: [number, number][][] = Array.from({ length: nn * 6 }, () => []);
  const presos = new Set<number>();
  for (const [no, gs] of m.apoios) for (const g of gs) presos.add(no * 6 + g);
  const cond = m.condensados ?? new Set<number>();
  const escravo = new Map((m.escravos ?? []).map((e) => [e.no, e.mestre]));
  let neq = 0;
  const eqDe = new Int32Array(nn * 6).fill(-1);
  for (let d = 0; d < nn * 6; d++) {
    const g = d % 6, no = (d - g) / 6;
    if (presos.has(d) || cond.has(d)) continue;
    if (escravo.has(no) && (g === 0 || g === 1 || g === 5)) continue;
    eqDe[d] = neq++;
  }
  for (let d = 0; d < nn * 6; d++) {
    const g = d % 6, no = (d - g) / 6;
    if (presos.has(d) || cond.has(d)) continue;
    const ms = escravo.get(no);
    if (ms !== undefined && (g === 0 || g === 1 || g === 5)) {
      const dx = m.nos[no][0] - m.nos[ms][0], dy = m.nos[no][1] - m.nos[ms][1];
      const em = (h: number) => eqDe[ms * 6 + h];
      if (g === 0) { if (em(0) >= 0) mapa[d].push([em(0), 1]); if (em(5) >= 0) mapa[d].push([em(5), -dy]); }
      if (g === 1) { if (em(1) >= 0) mapa[d].push([em(1), 1]); if (em(5) >= 0) mapa[d].push([em(5), dx]); }
      if (g === 5 && em(5) >= 0) mapa[d].push([em(5), 1]);
    } else mapa[d].push([eqDe[d], 1]);
  }

  const K: SpRows = Array.from({ length: neq }, () => new Map<number, number>());
  const P = casos.map(() => new Float64Array(neq));
  const porBarra = casos.map((c) => { const mp = new Map<number, V3[]>(); for (const q of c.distribuidas) { const l = mp.get(q.barra); if (l) l.push(q.q); else mp.set(q.barra, [q.q]); } return mp; });
  const pontBarra = casos.map((c) => { const mp = new Map<number, { a: number; f: number[] }[]>(); for (const q of c.pontuais ?? []) { const l = mp.get(q.barra); if (l) l.push(q); else mp.set(q.barra, [q]); } return mp; });
  // condensação: a rigidez é a mesma para todos os casos; as forças de engastamento, uma por caso
  const elem = m.barras.map((b, bi) => ({ b, ...elementoBarra(m, b, porBarra.map((mp) => mp.get(bi)), pontBarra.map((mp) => mp.get(bi))) }));
  for (const e of elem) {
    const Kg = rigidezGlobal(e);
    const plano = e.b.soPlano;
    for (let a = 0; a < 12; a++) {
      if (plano && !NO_PLANO[a % 6]) continue;
      for (const [ea, ca] of mapa[e.dofs[a]]) for (let c = 0; c < 12; c++) {
        if (plano && !NO_PLANO[c % 6]) continue;
        const v = Kg[a][c];
        if (!v) continue;
        for (const [ec, cc] of mapa[e.dofs[c]]) spAdd(K, ea, ec, ca * cc * v);
      }
    }
    e.f0s.forEach((f0, ic) => {
      for (let a = 0; a < 12; a++) {
        if (plano && !NO_PLANO[a % 6]) continue;
        let fa = 0; // −Tᵀ f0
        for (let r = 0; r < 12; r++) fa -= e.T[r][a] * f0[r];
        for (const [ea, ca] of mapa[e.dofs[a]]) P[ic][ea] += ca * fa;
      }
    });
  }
  // superelementos: rigidez condensada densa e cargas condensadas por caso
  const ses = m.superelementos ?? [];
  for (const se of ses) {
    const nb = se.dofs.length;
    for (let a = 0; a < nb; a++) for (const [ea, ca] of mapa[se.dofs[a]]) for (let c = 0; c < nb; c++) {
      const v = se.K[a * nb + c];
      if (!v) continue;
      for (const [ec, cc] of mapa[se.dofs[c]]) spAdd(K, ea, ec, ca * cc * v);
    }
  }
  casos.forEach((c, ic) => { for (const cs of c.superelementos ?? []) { const se = ses[cs.se]; se.dofs.forEach((d, a) => { for (const [e, cf] of mapa[d]) P[ic][e] += cf * cs.P[a]; }); } });
  // cascas: rigidez global 36 × 36 e pressões
  const cas = (m.cascas ?? []).map((c) => rigidezCasca(m.nos, c));
  for (const ce of cas) {
    for (let a = 0; a < 36; a++) for (const [ea, ca] of mapa[ce.dofs[a]]) for (let c = 0; c < 36; c++) {
      const v = ce.K[a * 36 + c];
      if (!v) continue;
      for (const [ec, cc] of mapa[ce.dofs[c]]) spAdd(K, ea, ec, ca * cc * v);
    }
  }
  casos.forEach((c, ic) => { for (const pr of c.pressoes ?? []) { const ce = cas[pr.casca], f = cargaPressaoCasca(ce, pr.q); for (let a = 0; a < 36; a++) for (const [e, cf] of mapa[ce.dofs[a]]) P[ic][e] += cf * f[a]; } });
  for (const s of m.molas ?? []) for (const [e, c] of mapa[s.no * 6 + s.gdl]) for (const [e2, c2] of mapa[s.no * 6 + s.gdl]) spAdd(K, e, e2, c * c2 * s.k);
  casos.forEach((c, ic) => { for (const n of c.nodais) n.f.forEach((v, g) => { for (const [e, cf] of mapa[n.no * 6 + g]) P[ic][e] += cf * v; }); });

  const vazio: Resultado3 = { desloc: [], esforcos: [], reacoes: [], neq, hb: 0 };
  const { order, hb } = neq ? rcmOrder(K, Array.from({ length: neq }, (_, i) => i)) : { order: [], hb: 0 };
  const pos = new Int32Array(neq);
  order.forEach((e, p) => (pos[e] = p));
  let maxDiag = 0;
  for (let e = 0; e < neq; e++) maxDiag = Math.max(maxDiag, Math.abs(K[e].get(e) ?? 0));
  const ldl = fatorarLDL(neq, hb, (set) => { for (let e = 0; e < neq; e++) for (const [c, v] of K[e]) { const p = pos[e], q = pos[c]; if (q >= p) set(p, q, v); } }, maxDiag || 1);
  if (ldl.singularRow >= 0) {
    const eq = order[ldl.singularRow], d = eqDe.indexOf(eq);
    return { ...vazio, hb, erro: `Estrutura instável (gdl ${['ux', 'uy', 'uz', 'rx', 'ry', 'rz'][d % 6]} do nó ${(d - (d % 6)) / 6}).` };
  }
  const molasNo = new Map<number, NonNullable<Modelo3['molas']>>();
  for (const s of m.molas ?? []) { const l = molasNo.get(s.no); if (l) l.push(s); else molasNo.set(s.no, [s]); }
  const desloc: Float64Array[] = [], esforcos: Float64Array[][] = [], reacoes: Map<number, number[]>[] = [], esfCascas: Float64Array[][] = [];
  casos.forEach((caso, ic) => {
    const b = new Float64Array(neq);
    for (let e = 0; e < neq; e++) b[pos[e]] = P[ic][e];
    const x = ldl.solve(b);
    const u = new Float64Array(nn * 6);
    for (let d = 0; d < nn * 6; d++) for (const [e, c] of mapa[d]) u[d] += c * x[pos[e]];
    ses.forEach((se, k) => se.recuperar?.(u, caso.superelementos?.find((c) => c.se === k)));
    desloc.push(u);
    const forcasNo = new Float64Array(nn * 6); // forças que as barras fazem nos nós (sinal: ação dos nós sobre as barras)
    const ug = new Float64Array(12), ul = new Float64Array(12);
    const ef = elem.map((e) => {
      const f = esforcosBarra(e, u, ic, ug, ul);
      for (let a = 0; a < 12; a++) { let s = 0; for (let r = 0; r < 12; r++) s += e.T[r][a] * f[r]; forcasNo[e.dofs[a]] += s; }
      return f;
    });
    esforcos.push(ef);
    ses.forEach((se, k) => {
      const nb = se.dofs.length, cs = caso.superelementos?.find((c) => c.se === k);
      for (let a = 0; a < nb; a++) { let s = -(cs?.P[a] ?? 0); for (let c = 0; c < nb; c++) s += se.K[a * nb + c] * u[se.dofs[c]]; forcasNo[se.dofs[a]] += s; }
    });
    if (cas.length) esfCascas.push(cas.map((ce, k) => esforcosCasca(ce, u, (caso.pressoes ?? []).filter((p) => p.casca === k).reduce((s, p) => s + p.q, 0), forcasNo)));
    const rc = new Map<number, number[]>();
    const nodaisNo = new Map<number, Caso3['nodais']>();
    for (const n of caso.nodais) { const l = nodaisNo.get(n.no); if (l) l.push(n); else nodaisNo.set(n.no, [n]); }
    for (const [no] of m.apoios) {
      const r = [0, 1, 2, 3, 4, 5].map((g) => forcasNo[no * 6 + g]);
      for (const n of nodaisNo.get(no) ?? []) n.f.forEach((v, g) => (r[g] -= v));
      for (const s of molasNo.get(no) ?? []) r[s.gdl] += s.k * u[no * 6 + s.gdl];
      rc.set(no, r);
    }
    reacoes.push(rc);
  });
  return { desloc, esforcos, reacoes, ...(cas.length ? { cascas: esfCascas } : {}), neq, hb };
}

// ---------------- 2ª ordem (N2c) ----------------

/**
 * Matriz geométrica local 12 × 12 da barra (N > 0 tração). `consistente`: matriz consistente das funções cúbicas
 * (6/5, L/10, 2L²/15, −L²/30, como a `geometricLocal` do Pórtico 2D); senão só a parcela P-Δ de corpo rígido
 * (N/L nos deslocamentos transversais das pontas, como a transformação P-Delta do OpenSees). Torção não incluída.
 */
export function geometricaLocal3(L: number, N: number, consistente = false): number[][] {
  const k = Array.from({ length: 12 }, () => new Array(12).fill(0));
  const set = (r: number, c: number, v: number) => { k[r][c] += v; if (r !== c) k[c][r] += v; };
  const a = N / L;
  if (!consistente) {
    for (const [p, q] of [[1, 7], [2, 8]]) { set(p, p, a); set(q, q, a); set(p, q, -a); }
    return k;
  }
  // flexão no plano x-y (v, θz = dv/dx)
  set(1, 1, 1.2 * a); set(1, 5, (L / 10) * a); set(1, 7, -1.2 * a); set(1, 11, (L / 10) * a);
  set(5, 5, ((2 * L * L) / 15) * a); set(5, 7, (-L / 10) * a); set(5, 11, ((-L * L) / 30) * a);
  set(7, 7, 1.2 * a); set(7, 11, (-L / 10) * a); set(11, 11, ((2 * L * L) / 15) * a);
  // flexão no plano x-z (w, θy = −dw/dx)
  set(2, 2, 1.2 * a); set(2, 4, (-L / 10) * a); set(2, 8, -1.2 * a); set(2, 10, (-L / 10) * a);
  set(4, 4, ((2 * L * L) / 15) * a); set(4, 8, (L / 10) * a); set(4, 10, ((-L * L) / 30) * a);
  set(8, 8, 1.2 * a); set(8, 10, (L / 10) * a); set(10, 10, ((2 * L * L) / 15) * a);
  return k;
}

/** Sistema fatorado: resolve casos só com cargas nodais (deslocamentos de todos os gdl; condensados ficam nulos). */
export interface Fatorado3 { erro?: string; neq: number; deslocamentos: (cargas: { no: number; f: number[] }[][]) => Float64Array[] }

/**
 * Monta e fatora a rigidez do modelo (barras, superelementos, cascas e molas, como `resolver3`) uma vez, para
 * resolver depois vários vetores de carga nodal (iterações de 2ª ordem). Os gdl condensados dos superelementos
 * não são recuperados (ficam nulos).
 */
export function fatorar3(m: Modelo3): Fatorado3 {
  const nn = m.nos.length;
  const mapa: [number, number][][] = Array.from({ length: nn * 6 }, () => []);
  const presos = new Set<number>();
  for (const [no, gs] of m.apoios) for (const g of gs) presos.add(no * 6 + g);
  const cond = m.condensados ?? new Set<number>();
  const escravo = new Map((m.escravos ?? []).map((e) => [e.no, e.mestre]));
  let neq = 0;
  const eqDe = new Int32Array(nn * 6).fill(-1);
  for (let d = 0; d < nn * 6; d++) {
    const g = d % 6, no = (d - g) / 6;
    if (presos.has(d) || cond.has(d)) continue;
    if (escravo.has(no) && (g === 0 || g === 1 || g === 5)) continue;
    eqDe[d] = neq++;
  }
  for (let d = 0; d < nn * 6; d++) {
    const g = d % 6, no = (d - g) / 6;
    if (presos.has(d) || cond.has(d)) continue;
    const ms = escravo.get(no);
    if (ms !== undefined && (g === 0 || g === 1 || g === 5)) {
      const dx = m.nos[no][0] - m.nos[ms][0], dy = m.nos[no][1] - m.nos[ms][1];
      const em = (h: number) => eqDe[ms * 6 + h];
      if (g === 0) { if (em(0) >= 0) mapa[d].push([em(0), 1]); if (em(5) >= 0) mapa[d].push([em(5), -dy]); }
      if (g === 1) { if (em(1) >= 0) mapa[d].push([em(1), 1]); if (em(5) >= 0) mapa[d].push([em(5), dx]); }
      if (g === 5 && em(5) >= 0) mapa[d].push([em(5), 1]);
    } else mapa[d].push([eqDe[d], 1]);
  }
  const K: SpRows = Array.from({ length: neq }, () => new Map<number, number>());
  for (const b of m.barras) {
    const e = elementoBarra(m, b, [], []), Kg = rigidezGlobal(e), plano = b.soPlano;
    for (let a = 0; a < 12; a++) {
      if (plano && !NO_PLANO[a % 6]) continue;
      for (const [ea, ca] of mapa[e.dofs[a]]) for (let c = 0; c < 12; c++) {
        if (plano && !NO_PLANO[c % 6]) continue;
        const v = Kg[a][c];
        if (!v) continue;
        for (const [ec, cc] of mapa[e.dofs[c]]) spAdd(K, ea, ec, ca * cc * v);
      }
    }
  }
  for (const se of m.superelementos ?? []) {
    const nb = se.dofs.length;
    for (let a = 0; a < nb; a++) for (const [ea, ca] of mapa[se.dofs[a]]) for (let c = 0; c < nb; c++) {
      const v = se.K[a * nb + c];
      if (!v) continue;
      for (const [ec, cc] of mapa[se.dofs[c]]) spAdd(K, ea, ec, ca * cc * v);
    }
  }
  for (const ce of (m.cascas ?? []).map((c) => rigidezCasca(m.nos, c))) {
    for (let a = 0; a < 36; a++) for (const [ea, ca] of mapa[ce.dofs[a]]) for (let c = 0; c < 36; c++) {
      const v = ce.K[a * 36 + c];
      if (!v) continue;
      for (const [ec, cc] of mapa[ce.dofs[c]]) spAdd(K, ea, ec, ca * cc * v);
    }
  }
  for (const s of m.molas ?? []) for (const [e, c] of mapa[s.no * 6 + s.gdl]) for (const [e2, c2] of mapa[s.no * 6 + s.gdl]) spAdd(K, e, e2, c * c2 * s.k);
  const { order, hb } = neq ? rcmOrder(K, Array.from({ length: neq }, (_, i) => i)) : { order: [], hb: 0 };
  const pos = new Int32Array(neq);
  order.forEach((e, p) => (pos[e] = p));
  let maxDiag = 0;
  for (let e = 0; e < neq; e++) maxDiag = Math.max(maxDiag, Math.abs(K[e].get(e) ?? 0));
  const ldl = fatorarLDL(neq, hb, (set) => { for (let e = 0; e < neq; e++) for (const [c, v] of K[e]) { const p = pos[e], q = pos[c]; if (q >= p) set(p, q, v); } }, maxDiag || 1);
  if (ldl.singularRow >= 0) return { erro: 'Estrutura instável.', neq, deslocamentos: () => [] };
  return {
    neq,
    deslocamentos: (cargas) => cargas.map((nodais) => {
      const b = new Float64Array(neq);
      for (const n of nodais) n.f.forEach((v, g) => { if (v) for (const [e, cf] of mapa[n.no * 6 + g]) b[pos[e]] += cf * v; });
      const x = ldl.solve(b), u = new Float64Array(nn * 6);
      for (let d = 0; d < nn * 6; d++) for (const [e, c] of mapa[d]) u[d] += c * x[pos[e]];
      return u;
    }),
  };
}
