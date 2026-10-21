// N2b: barra de Timoshenko, casca de 6 nós (testes da placa e da membrana, placa apoiada contra Mindlin, parede em
// balanço contra viga de Timoshenko), condensação estática e malha triangular.
import { describe, expect, it } from 'vitest';
import { resolver3, type Caso3, type Modelo3, type V3 } from './fe3d';
import type { Casca3 } from './casca';
import { condensar, forcaFronteira, recuperarInternos } from './condensacao';
import { delaunay, malhaTriangular, paraT6, qualidadeMalha, type MalhaTri } from './geom/malhaTri';
import type { P } from './geom/faces';
import type { SpRows } from './math';

/** Malha estruturada de retângulo (nx × ny células, diagonais alternadas), com os nós internos de vértice perturbados. */
function malhaRet(a: number, b: number, nx: number, ny: number, pert = 0): MalhaTri {
  const pontos: P[] = [], tris: [number, number, number][] = [];
  const id = (i: number, j: number) => j * (nx + 1) + i;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const interno = i > 0 && i < nx && j > 0 && j < ny;
    const dx = interno ? pert * Math.sin(7.3 * i + 3.1 * j) : 0, dy = interno ? pert * Math.cos(5.7 * i - 2.3 * j) : 0;
    pontos.push([(i / nx) * a + (dx * a) / nx, (j / ny) * b + (dy * b) / ny]);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const p = [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)];
    if ((i + j) % 2) { tris.push([p[0], p[1], p[2]], [p[0], p[2], p[3]]); } else { tris.push([p[0], p[1], p[3]], [p[1], p[2], p[3]]); }
  }
  return { pontos, tris };
}

/** Modelo de cascas no plano XY a partir de uma malha T6. */
function modeloCascas(m: MalhaTri, E: number, nu: number, h: number): { mod: Modelo3; pts: P[] } {
  const t6 = paraT6(m);
  const mod: Modelo3 = { nos: t6.pontos.map((p) => [p[0], p[1], 0] as V3), barras: [], apoios: new Map(), molas: [], cascas: t6.tris.map((t) => ({ nos: t, E, nu, h }) as Casca3) };
  return { mod, pts: t6.pontos };
}

describe('barra de Timoshenko', () => {
  it('balanço com força na ponta e com carga distribuída: δ = flexão + cortante', () => {
    const E = 25e6, G = E / 2.4, b = 0.3, h = 0.6, L = 2, A = b * h, I = (b * h ** 3) / 12, As = (5 / 6) * A;
    const m: Modelo3 = { nos: [[0, 0, 0], [L, 0, 0]], barras: [{ i: 0, j: 1, E, G, A, Iz: I, Iy: (h * b ** 3) / 12, J: 0.01, Ay: As }], apoios: new Map([[0, [0, 1, 2, 3, 4, 5]]]) };
    const P = 100, q = 20;
    const r = resolver3(m, [{ nodais: [{ no: 1, f: [0, 0, -P, 0, 0, 0] }], distribuidas: [] }, { nodais: [], distribuidas: [{ barra: 0, q: [0, 0, -q] }] }]);
    expect(r.erro).toBeUndefined();
    expect(-r.desloc[0][8]).toBeCloseTo((P * L ** 3) / (3 * E * I) + (P * L) / (G * As), 12);
    expect(-r.desloc[1][8]).toBeCloseTo((q * L ** 4) / (8 * E * I) + (q * L * L) / (2 * G * As), 12);
    // sem área de cisalhamento: Euler-Bernoulli
    const e = resolver3({ ...m, barras: [{ ...m.barras[0], Ay: undefined }] }, [{ nodais: [{ no: 1, f: [0, 0, -P, 0, 0, 0] }], distribuidas: [] }]);
    expect(-e.desloc[0][8]).toBeCloseTo((P * L ** 3) / (3 * E * I), 12);
  });
});

/** Fixa os nós de contorno por molas rígidas com forças k·u(campo) (deslocamentos prescritos por penalidade). */
function prescrever(mod: Modelo3, nos: number[], campo: (p: V3) => number[], k = 1e13): Caso3 {
  const caso: Caso3 = { nodais: [], distribuidas: [] };
  for (const n of nos) {
    const u = campo(mod.nos[n]);
    for (let g = 0; g < 6; g++) mod.molas!.push({ no: n, gdl: g, k });
    caso.nodais.push({ no: n, f: u.map((v) => k * v) });
  }
  return caso;
}

describe('casca de 6 nós: testes da placa e da membrana', () => {
  const E = 2e7, nu = 0.25, h = 0.2;
  const borda = (p: V3, a: number, b: number) => Math.abs(p[0]) < 1e-9 || Math.abs(p[1]) < 1e-9 || Math.abs(p[0] - a) < 1e-9 || Math.abs(p[1] - b) < 1e-9;

  it('membrana: campo linear reproduzido em malha distorcida (deformações e Nx, Ny, Nxy constantes)', () => {
    const { mod } = modeloCascas(malhaRet(2, 1, 4, 3, 0.25), E, nu, h);
    const campo = (p: V3) => [1e-3 * (1 + 2 * p[0] + 3 * p[1]), 1e-3 * (-2 + p[0] - 4 * p[1]), 0, 0, 0, 0];
    const nb = mod.nos.map((p, i) => [p, i] as const).filter(([p]) => borda(p, 2, 1)).map(([, i]) => i);
    const caso = prescrever(mod, nb, campo);
    // nós internos: só membrana livre (placa e giro presos)
    mod.nos.forEach((_, i) => { if (!nb.includes(i)) mod.apoios.set(i, [2, 3, 4, 5]); });
    const r = resolver3(mod, [caso]);
    expect(r.erro).toBeUndefined();
    mod.nos.forEach((p, i) => { const u = campo(p); expect(r.desloc[0][i * 6]).toBeCloseTo(u[0], 8); expect(r.desloc[0][i * 6 + 1]).toBeCloseTo(u[1], 8); });
    const Dm = (E * h) / (1 - nu * nu), ex = 2e-3, ey = -4e-3, gxy = 4e-3;
    for (const s of r.cascas![0]) {
      expect(s[0] / (Dm * (ex + nu * ey))).toBeCloseTo(1, 5);
      expect(s[1] / (Dm * (nu * ex + ey))).toBeCloseTo(1, 5);
      expect(s[2] / ((Dm * (1 - nu) * gxy) / 2)).toBeCloseTo(1, 5);
    }
  });

  it('placa: curvatura constante (w quadrático, cortante nulo) em malha distorcida', () => {
    const { mod } = modeloCascas(malhaRet(2, 1.5, 4, 3, 0.25), E, nu, h);
    const a = 2e-3, b = -1e-3, c = 1.5e-3;
    const campo = (p: V3) => { const [x, y] = p; return [0, 0, 0.5 * (a * x * x + b * y * y + c * x * y), b * y + (c * x) / 2, -(a * x + (c * y) / 2), 0]; };
    const nb = mod.nos.map((p, i) => [p, i] as const).filter(([p]) => borda(p, 2, 1.5)).map(([, i]) => i);
    const caso = prescrever(mod, nb, campo);
    mod.nos.forEach((_, i) => { if (!nb.includes(i)) mod.apoios.set(i, [0, 1, 5]); });
    const r = resolver3(mod, [caso]);
    expect(r.erro).toBeUndefined();
    mod.nos.forEach((p, i) => { const u = campo(p); for (const g of [2, 3, 4]) expect(r.desloc[0][i * 6 + g]).toBeCloseTo(u[g], 8); });
    const Db = (E * h ** 3) / (12 * (1 - nu * nu));
    for (const s of r.cascas![0]) {
      expect(s[3] / (Db * (a + nu * b))).toBeCloseTo(1, 5);
      expect(s[4] / (Db * (nu * a + b))).toBeCloseTo(1, 5);
      expect(s[5] / ((Db * (1 - nu) * c) / 2)).toBeCloseTo(1, 5);
      expect(Math.abs(s[6]) + Math.abs(s[7])).toBeLessThan(1e-6 * Db * Math.abs(a));
    }
  });

});

/** Placa quadrada apoiada (apoio "rígido") com carga uniforme: deflexão de Mindlin w = wK + M/(κGh) (Marcus), por série. */
function mindlinCentro(a: number, q: number, E: number, nu: number, h: number) {
  const D = (E * h ** 3) / (12 * (1 - nu * nu)), G = E / (2 * (1 + nu));
  let wK = 0, M = 0;
  for (let m = 1; m < 400; m += 2) for (let n = 1; n < 400; n += 2) {
    const s = Math.sin((m * Math.PI) / 2) * Math.sin((n * Math.PI) / 2), k2 = (m * m + n * n) / (a * a);
    wK += (16 * q * s) / (Math.PI ** 6 * D * m * n * k2 * k2);
    M += (16 * q * s) / (Math.PI ** 4 * m * n * k2);
  }
  return { wK, w: wK + M / ((5 / 6) * G * h) };
}

function placaApoiada(m: MalhaTri, a: number, E: number, nu: number, h: number, q: number) {
  const { mod } = modeloCascas(m, E, nu, h);
  mod.nos.forEach((p, i) => {
    const g = [0, 1, 5];
    if (Math.abs(p[0]) < 1e-9 || Math.abs(p[0] - a) < 1e-9) g.push(2, 3); // w = 0 e βy = −θx = 0
    if (Math.abs(p[1]) < 1e-9 || Math.abs(p[1] - a) < 1e-9) g.push(2, 4); // w = 0 e βx = θy = 0
    mod.apoios.set(i, [...new Set(g)]);
  });
  const r = resolver3(mod, [{ nodais: [], distribuidas: [], pressoes: mod.cascas!.map((_, k) => ({ casca: k, q: -q })) }]);
  expect(r.erro).toBeUndefined();
  const c = mod.nos.findIndex((p) => Math.hypot(p[0] - a / 2, p[1] - a / 2) < 1e-9);
  return { w: r.desloc[0][c * 6 + 2], r, mod };
}

describe('casca de 6 nós: placa quadrada apoiada contra a solução de Mindlin', () => {
  const E = 1e7, nu = 0.3, a = 1, q = 10;
  for (const h of [0.01, 0.1, 0.2]) it(`a/h = ${a / h}: deflexão no centro dentro de 0,2 % (8 × 8 células)`, () => {
    const ref = mindlinCentro(a, q, E, nu, h);
    const { w } = placaApoiada(malhaRet(a, a, 8, 8), a, E, nu, h, q);
    expect(Math.abs(-w / ref.w - 1)).toBeLessThan(0.002); // 0,07 / 0,03 / 0,02 % em 21/10/2026
    if (h === 0.01) expect(Math.abs(-w / ref.wK - 1)).toBeLessThan(0.002); // placa fina: sem travamento por cortante
  });
  it('malha da malhaTri (Delaunay restrita) dá o mesmo resultado (0,5 %)', () => {
    const h = 0.05, ref = mindlinCentro(a, q, E, nu, h);
    const m = malhaTriangular([[0, 0], [a, 0], [a, a], [0, a]], { tamanho: 0.15, obrigatorios: [[a / 2, a / 2]] });
    const { w } = placaApoiada(m, a, E, nu, h, q);
    expect(Math.abs(-w / ref.w - 1)).toBeLessThan(0.005); // 0,02 % em 21/10/2026
  });
  it('carga total = soma das reações', () => {
    const { r } = placaApoiada(malhaRet(a, a, 4, 4), a, E, nu, 0.1, q);
    let Rz = 0;
    for (const [, f] of r.reacoes[0]) Rz += f[2];
    expect(Rz).toBeCloseTo(q * a * a, 8);
  });
});

describe('casca de 6 nós: parede em balanço contra viga de Timoshenko', () => {
  it('flecha da ponta (força parabólica no extremo) dentro de 1 %', () => {
    const E = 2e7, nu = 0.2, t = 0.2, L = 4, H = 1, Pt = 50;
    const m = malhaRet(L, H, 16, 4);
    const { mod } = modeloCascas(m, E, nu, t);
    const ponta: number[] = [];
    mod.nos.forEach((p, i) => {
      if (Math.abs(p[0]) < 1e-9) mod.apoios.set(i, [0, 1, 2, 3, 4, 5]);
      else mod.apoios.set(i, [2, 3, 4, 5]);
      if (Math.abs(p[0] - L) < 1e-9) ponta.push(i);
    });
    // cortante parabólico τ ∝ 1 − (2y′/H)²: forças nodais consistentes nos lados quadráticos do extremo
    const caso: Caso3 = { nodais: [], distribuidas: [] };
    const tau = (y: number) => ((1.5 * Pt) / H) * (1 - ((2 * (y - H / 2)) / H) ** 2);
    const ord = ponta.slice().sort((i, j) => mod.nos[i][1] - mod.nos[j][1]);
    const f = new Map<number, number>();
    for (let k = 0; k + 2 < ord.length; k += 2) {
      const [a, mm, b] = [ord[k], ord[k + 1], ord[k + 2]], y0 = mod.nos[a][1], y1 = mod.nos[b][1], Ls = y1 - y0;
      for (const [s, w] of [[0.5 - Math.sqrt(3 / 5) / 2, 5 / 18], [0.5, 8 / 18], [0.5 + Math.sqrt(3 / 5) / 2, 5 / 18]]) {
        const n = [(1 - s) * (1 - 2 * s), 4 * s * (1 - s), s * (2 * s - 1)], tv = tau(y0 + s * Ls) * w * Ls;
        [a, mm, b].forEach((no, i) => f.set(no, (f.get(no) ?? 0) + n[i] * tv));
      }
    }
    for (const [no, v] of f) caso.nodais.push({ no, f: [0, -v, 0, 0, 0, 0] });
    const r = resolver3(mod, [caso]);
    expect(r.erro).toBeUndefined();
    const I = (t * H ** 3) / 12, A = t * H, G = E / (2 * (1 + nu));
    const ref = (Pt * L ** 3) / (3 * E * I) + (Pt * L) / ((5 / 6) * G * A);
    const meio = ponta.find((i) => Math.abs(mod.nos[i][1] - H / 2) < 1e-9)!;
    expect(Math.abs(-r.desloc[0][meio * 6 + 1] / ref - 1)).toBeLessThan(0.01); // −0,34 % em 21/10/2026 (engaste pleno restringe o efeito de Poisson)
  });
});

describe('condensação estática (complemento de Schur)', () => {
  it('igual à solução direta (erro relativo < 1e-9)', () => {
    const n = 60, nb = 9;
    // matriz SPD esparsa em banda com acoplamentos da fronteira (últimos nb) a vários internos
    const K: SpRows = Array.from({ length: n }, () => new Map());
    const add = (i: number, j: number, v: number) => { K[i].set(j, (K[i].get(j) ?? 0) + v); if (i !== j) K[j].set(i, (K[j].get(i) ?? 0) + v); };
    for (let i = 0; i < n; i++) add(i, i, 10 + (i % 7));
    for (let i = 0; i + 1 < n; i++) add(i, i + 1, -1 - 0.1 * (i % 3));
    for (let i = 0; i + 5 < n; i++) add(i, i + 5, -0.7);
    for (let b = n - nb; b < n; b++) for (let i = (b * 7) % (n - nb), k = 0; k < 4; k++, i = (i + 11) % (n - nb)) add(b, i, -0.9);
    const P = [Float64Array.from({ length: n }, (_, i) => Math.sin(i + 1)), Float64Array.from({ length: n }, (_, i) => (i % 5) - 2)];
    // solução direta densa (Gauss)
    const direta = (p: Float64Array) => {
      const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => K[i].get(j) ?? 0)), x = Array.from(p);
      for (let c = 0; c < n; c++) for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; if (!f) continue; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; x[r] -= f * x[c]; }
      for (let r = n - 1; r >= 0; r--) { let s = x[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / A[r][r]; }
      return x;
    };
    const c = condensar(K, n - nb, P);
    expect(c.erro).toBeUndefined();
    P.forEach((p, k) => {
      const ref = direta(p);
      // S·ub = Pb (sem forças externas na fronteira)
      const S = Array.from({ length: nb }, (_, a) => Array.from({ length: nb }, (_, b) => c.S[a * nb + b])), ub = Array.from(c.Pb[k]);
      for (let col = 0; col < nb; col++) for (let r = col + 1; r < nb; r++) { const f = S[r][col] / S[col][col]; for (let q = col; q < nb; q++) S[r][q] -= f * S[col][q]; ub[r] -= f * ub[col]; }
      for (let r = nb - 1; r >= 0; r--) { let s = ub[r]; for (let q = r + 1; q < nb; q++) s -= S[r][q] * ub[q]; ub[r] = s / S[r][r]; }
      const ui = recuperarInternos(c, ub, k);
      const sol = [...ui, ...ub], nr = Math.hypot(...ref);
      expect(Math.hypot(...sol.map((v, i) => v - ref[i])) / nr).toBeLessThan(1e-9);
      expect(Math.max(...forcaFronteira(c, ub, k).map(Math.abs))).toBeLessThan(1e-9 * Math.max(...ref.map(Math.abs)) * 20);
    });
  });
});

describe('malha triangular (Delaunay restrita)', () => {
  it('Delaunay de pontos aleatórios: nenhum ponto dentro do círculo de outro triângulo', () => {
    const pts: P[] = Array.from({ length: 150 }, (_, i) => [Math.sin(i * 12.9898) * 43758.5453 % 1, Math.sin(i * 78.233) * 12345.678 % 1] as P).map((p) => [Math.abs(p[0]) * 5, Math.abs(p[1]) * 3] as P);
    const t = delaunay(pts);
    expect(t.length).toBeGreaterThan(200);
    for (const [a, b, c] of t.slice(0, 80)) {
      const [A, B, C] = [pts[a], pts[b], pts[c]];
      const D = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
      const a2 = A[0] ** 2 + A[1] ** 2, b2 = B[0] ** 2 + B[1] ** 2, c2 = C[0] ** 2 + C[1] ** 2;
      const ux = (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / D, uy = (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / D, r2 = (A[0] - ux) ** 2 + (A[1] - uy) ** 2;
      for (const p of pts) expect((p[0] - ux) ** 2 + (p[1] - uy) ** 2).toBeGreaterThan(r2 * (1 - 1e-9));
    }
  });
  it('polígono em L com abertura e pontos obrigatórios: área, contorno, qualidade e T6', () => {
    const cont: P[] = [[0, 0], [6, 0], [6, 3], [3, 3], [3, 5], [0, 5]], furo: P[] = [[1, 1], [2, 1], [2, 2], [1, 2]];
    const obr: P[] = [[4.5, 1.5], [0.5, 4.2], [6, 1.5]];
    const m = malhaTriangular(cont, { tamanho: 0.5, furos: [furo], obrigatorios: obr });
    const q = qualidadeMalha(m);
    expect(q.area).toBeCloseTo(6 * 3 + 3 * 2 - 1, 6);
    expect(q.anguloMin).toBeGreaterThan(18);
    for (const p of obr) expect(m.pontos.some((x) => Math.hypot(x[0] - p[0], x[1] - p[1]) < 1e-9)).toBe(true);
    // todos anti-horários e nenhum centróide dentro da abertura
    for (const t of m.tris) {
      const [a, b, c] = t.map((i) => m.pontos[i]);
      expect((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])).toBeGreaterThan(0);
      const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
      expect(cx > 1 && cx < 2 && cy > 1 && cy < 2).toBe(false);
    }
    // lados do contorno preservados: cada lado do contorno coberto por lados de triângulos que só aparecem uma vez
    const conta = new Map<string, number>();
    for (const t of m.tris) for (let k = 0; k < 3; k++) { const a = t[k], b = t[(k + 1) % 3], kk = a < b ? `${a}:${b}` : `${b}:${a}`; conta.set(kk, (conta.get(kk) ?? 0) + 1); }
    let perim = 0;
    for (const [kk, n] of conta) if (n === 1) { const [a, b] = kk.split(':').map(Number); perim += Math.hypot(m.pontos[a][0] - m.pontos[b][0], m.pontos[a][1] - m.pontos[b][1]); }
    expect(perim).toBeCloseTo(6 + 3 + 3 + 2 + 3 + 5 + 4, 6);
    const t6 = paraT6(m);
    expect(t6.tris.every((t) => t.length === 6)).toBe(true);
    // refino: lados junto aos cantos menores que no meio
    const lados = [...conta.keys()].map((kk) => kk.split(':').map(Number)).map(([a, b]) => ({ L: Math.hypot(m.pontos[a][0] - m.pontos[b][0], m.pontos[a][1] - m.pontos[b][1]), p: m.pontos[a] }));
    const perto = lados.filter((l) => Math.hypot(l.p[0], l.p[1]) < 0.4), longe = lados.filter((l) => Math.hypot(l.p[0] - 4.5, l.p[1] - 0.2) < 0.6 && Math.hypot(l.p[0] - 4.5, l.p[1] - 1.5) > 1);
    if (perto.length && longe.length) expect(Math.max(...perto.map((l) => l.L))).toBeLessThan(Math.max(...longe.map((l) => l.L)));
  });
});
