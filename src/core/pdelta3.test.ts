// P-Δ no pórtico espacial (N2c): igual ao `pDelta` do Pórtico 2D num pórtico plano, solução fechada do balanço
// e instabilidade acima da carga crítica.
import { describe, expect, it } from 'vitest';
import { prepare } from './solver';
import { comboLoading, pDelta } from './secondorder';
import type { Load, Model } from './types';
import type { Barra3, Caso3, Modelo3, V3 } from './fe3d';
import { pDelta3 } from './pdelta3';

const E = 2.5e7, b = 0.3, h = 0.4, I = (b * h ** 3) / 12, A = b * h;

/** Pórtico plano de 2 vãos (5 m) e 2 pavimentos (3 m) no Pórtico 2D e o mesmo no espacial (plano XZ). */
function porticos(H: number, P: number) {
  const xs = [0, 5, 10], ys = [0, 3, 6];
  const nodes: Model['nodes'] = [], id = (i: number, j: number) => j * xs.length + i + 1;
  ys.forEach((y, j) => xs.forEach((x, i) => nodes.push({ id: id(i, j), x, y, ...(j === 0 ? { support: { ux: 'fixed', uy: 'fixed', rz: 'fixed' } } : {}) } as Model['nodes'][number])));
  const members: Model['members'] = [];
  for (let j = 1; j < ys.length; j++) {
    xs.forEach((_, i) => members.push({ id: members.length + 1, ni: id(i, j - 1), nj: id(i, j), material: 1, section: 1 }));
    for (let i = 1; i < xs.length; i++) members.push({ id: members.length + 1, ni: id(i - 1, j), nj: id(i, j), material: 1, section: 1 });
  }
  const loads: Load[] = [];
  for (let j = 1; j < ys.length; j++) {
    loads.push({ kind: 'nodal', id: loads.length + 1, caseId: 1, node: id(0, j), fx: H * j, fy: 0, mz: 0 });
    xs.forEach((_, i) => loads.push({ kind: 'nodal', id: loads.length + 1, caseId: 1, node: id(i, j), fx: 0, fy: -P, mz: 0 }));
  }
  const m2: Model = {
    version: 1, name: 'p', nodes, members,
    materials: [{ id: 1, name: 'c', E, nu: 0.2, alpha: 1e-5, gamma: 0 }],
    sections: [{ id: 1, name: 's', shape: { kind: 'rect', b, h } }],
    cases: [{ id: 1, name: 'c' }], combinations: [], loads, trains: [],
    options: { shearDeformation: false, axialDeformation: true },
  };
  // espacial: x → X, y → Z; fora do plano (uy, rx, rz) preso em todos os nós
  const nos: V3[] = nodes.map((n) => [n.x, 0, n.y]);
  const apoios = new Map<number, number[]>(nodes.map((n, k) => [k, (n as { support?: unknown }).support ? [0, 1, 2, 3, 4, 5] : [1, 3, 5]]));
  const barras: Barra3[] = members.map((mb) => ({ i: mb.ni - 1, j: mb.nj - 1, E, G: E / 2.4, A, Iy: I, Iz: I, J: 1e-3 }));
  const caso: Caso3 = { nodais: loads.map((l) => ({ no: (l as { node: number }).node - 1, f: [(l as { fx: number }).fx, 0, (l as { fy: number }).fy, 0, 0, 0] })), distribuidas: [] };
  const m3: Modelo3 = { nos, barras, apoios };
  return { m2, m3, caso };
}

describe('P-Δ 3D', () => {
  it('pórtico plano: deslocamentos e reações iguais aos do pDelta do Pórtico 2D (matriz consistente)', () => {
    const { m2, m3, caso } = porticos(20, 1500);
    const prep = prepare(m2);
    const r2 = pDelta(prep, comboLoading(prep, { 1: 1 }), { tol: 1e-10, maxIter: 100 });
    const r3 = pDelta3(m3, caso, { consistente: true, tol: 1e-10, maxIter: 200 });
    expect(r2.converged).toBe(true);
    expect(r3.convergiu).toBe(true);
    expect(r3.amplificacao).toBeGreaterThan(1.05);
    for (let k = 0; k < m2.nodes.length; k++) {
      expect(r3.res.desloc[0][k * 6]).toBeCloseTo(r2.result.u[k * 3], 9);
      expect(r3.res.desloc[0][k * 6 + 2]).toBeCloseTo(r2.result.u[k * 3 + 1], 9);
    }
    for (const k of [0, 1, 2]) {
      const R2 = r2.result.reactions.get(k)!, R3 = r3.res.reacoes[0].get(k)!;
      expect(R3[0]).toBeCloseTo(R2[0], 5);
      expect(R3[2]).toBeCloseTo(R2[1], 5);
      expect(R3[4]).toBeCloseTo(-R2[2], 5); // giro em torno de Y global = −rz do plano XZ visto de frente
    }
    // amplificação igual à do 2D
    expect(r3.amplificacao).toBeCloseTo(r2.amplification, 6);
  });

  it('balanço com P e H no topo (10 barras, consistente): δ = H/(P·k)·(tan kL − kL)', () => {
    const L = 5, n = 10, EI = E * I, P = 0.4 * (Math.PI ** 2 * EI) / (4 * L * L), H = 10;
    const nos: V3[] = Array.from({ length: n + 1 }, (_, k) => [0, 0, (L * k) / n]);
    const apoios = new Map<number, number[]>(nos.map((_, k) => [k, k === 0 ? [0, 1, 2, 3, 4, 5] : [1, 3, 5]]));
    const barras: Barra3[] = Array.from({ length: n }, (_, k) => ({ i: k, j: k + 1, E, G: E / 2.4, A, Iy: I, Iz: I, J: 1e-3 }));
    const r = pDelta3({ nos, barras, apoios }, { nodais: [{ no: n, f: [H, 0, -P, 0, 0, 0] }], distribuidas: [] }, { consistente: true, tol: 1e-10, maxIter: 200 });
    const k = Math.sqrt(P / EI), exato = (H / (P * k)) * (Math.tan(k * L) - k * L);
    expect(r.convergiu).toBe(true);
    expect(r.res.desloc[0][n * 6] / exato).toBeCloseTo(1, 3);
    // momento na base = H·L + P·δ
    expect(Math.abs(r.res.reacoes[0].get(0)![4]) / (H * L + P * exato)).toBeCloseTo(1, 3);
  });

  it('só P-Δ (sem a parcela consistente): balanço de uma barra dá δ = δ1/(1 − PL/(3EI/L²)·…) exato da mola P/L', () => {
    // uma barra: K lateral = 3EI/L³ (com o giro livre no topo); P-Δ de corpo rígido: K_T = 3EI/L³ − P/L
    const L = 4, EI = E * I, P = 0.3 * (3 * EI) / (L * L), H = 5;
    const nos: V3[] = [[0, 0, 0], [0, 0, L]];
    const r = pDelta3({ nos, barras: [{ i: 0, j: 1, E, G: E / 2.4, A: A * 1e6, Iy: I, Iz: I, J: 1e-3 }], apoios: new Map([[0, [0, 1, 2, 3, 4, 5]], [1, [1, 3, 5]]]) }, { nodais: [{ no: 1, f: [H, 0, -P, 0, 0, 0] }], distribuidas: [] }, { tol: 1e-12, maxIter: 200 });
    expect(r.convergiu).toBe(true);
    expect(r.res.desloc[0][6] / (H / ((3 * EI) / L ** 3 - P / L))).toBeCloseTo(1, 6);
  });

  it('acima da carga crítica acusa instabilidade', () => {
    const L = 5, n = 6, EI = E * I, P = 1.2 * (Math.PI ** 2 * EI) / (4 * L * L);
    const nos: V3[] = Array.from({ length: n + 1 }, (_, k) => [0, 0, (L * k) / n]);
    const apoios = new Map<number, number[]>(nos.map((_, k) => [k, k === 0 ? [0, 1, 2, 3, 4, 5] : [1, 3, 5]]));
    const barras: Barra3[] = Array.from({ length: n }, (_, k) => ({ i: k, j: k + 1, E, G: E / 2.4, A, Iy: I, Iz: I, J: 1e-3 }));
    const r = pDelta3({ nos, barras, apoios }, { nodais: [{ no: n, f: [1, 0, -P, 0, 0, 0] }], distribuidas: [] }, { consistente: true });
    expect(r.erro).toMatch(/Instabilidade/);
  });
});
