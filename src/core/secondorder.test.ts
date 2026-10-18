import { describe, expect, it } from 'vitest';
import { prepare } from './solver';
import { buckling, comboLoading, pDelta, vibration } from './secondorder';
import type { Load, Model } from './types';

const E = 2e8, b = 0.3, h = 0.3, I = (b * h ** 3) / 12, EI = E * I, A = b * h;

function column(L: number, nEl: number, top: 'free' | 'pinned', loads: Load[]): Model {
  const nodes = Array.from({ length: nEl + 1 }, (_, k) => ({ id: k + 1, x: 0, y: (L * k) / nEl }));
  (nodes[0] as { support?: unknown }).support = top === 'free' ? { ux: 'fixed', uy: 'fixed', rz: 'fixed' } : { ux: 'fixed', uy: 'fixed', rz: 'free' };
  if (top === 'pinned') (nodes[nEl] as { support?: unknown }).support = { ux: 'fixed', uy: 'free', rz: 'free' };
  return {
    version: 1, name: 'col', nodes: nodes as Model['nodes'],
    members: Array.from({ length: nEl }, (_, k) => ({ id: k + 1, ni: k + 1, nj: k + 2, material: 1, section: 1 })),
    materials: [{ id: 1, name: 'm', E, nu: 0.2, alpha: 1e-5, gamma: 0 }],
    sections: [{ id: 1, name: 's', shape: { kind: 'rect', b, h } }],
    cases: [{ id: 1, name: 'c' }], combinations: [], loads, trains: [],
    options: { shearDeformation: false, axialDeformation: true },
  };
}
const top = (n: number, fx: number, fy: number): Load => ({ kind: 'nodal', id: 1, caseId: 1, node: n, fx, fy, mz: 0 });

describe('flambagem global', () => {
  it('balanço (engaste-livre): Pcr = π²EI/(4L²)', () => {
    const L = 5, m = column(L, 10, 'free', [top(11, 0, -1)]);
    const prep = prepare(m);
    const r = buckling(prep, comboLoading(prep, { 1: 1 }), 2);
    expect(r.modes[0].factor / ((Math.PI ** 2 * EI) / (4 * L * L))).toBeCloseTo(1, 4);
  });
  it('biapoiado: Pcr = π²EI/L² e 2º modo 4×', () => {
    const L = 5, m = column(L, 12, 'pinned', [top(13, 0, -1)]);
    const prep = prepare(m);
    const r = buckling(prep, comboLoading(prep, { 1: 1 }), 2);
    const pe = (Math.PI ** 2 * EI) / (L * L);
    expect(r.modes[0].factor / pe).toBeCloseTo(1, 3);
    expect(r.modes[1].factor / pe).toBeCloseTo(4, 2);
  });
});

describe('2ª ordem P-Δ', () => {
  it('balanço com P e H no topo: δ = H/(P·k)·(tan kL − kL)', () => {
    const L = 5, P = 0.4 * (Math.PI ** 2 * EI) / (4 * L * L), H = 10;
    const m = column(L, 10, 'free', [top(11, H, -P)]);
    const prep = prepare(m);
    const r = pDelta(prep, comboLoading(prep, { 1: 1 }));
    const k = Math.sqrt(P / EI);
    const exact = (H / (P * k)) * (Math.tan(k * L) - k * L);
    expect(r.converged).toBe(true);
    expect(r.result.u[10 * 3] / exact).toBeCloseTo(1, 3);
    expect(r.amplification).toBeGreaterThan(1.5);
    // momento na base = H·L + P·δ
    expect(Math.abs(r.result.reactions.get(0)![2]) / (H * L + P * exact)).toBeCloseTo(1, 3);
  });
  it('acima da carga crítica acusa instabilidade', () => {
    const L = 5, P = 1.2 * (Math.PI ** 2 * EI) / (4 * L * L);
    const m = column(L, 10, 'free', [top(11, 1, -P)]);
    const prep = prepare(m);
    expect(pDelta(prep, comboLoading(prep, { 1: 1 })).error).toBeTruthy();
  });
});

describe('vibração livre', () => {
  it('massa na ponta do balanço: ω = √(3EI/(m·L³)); massa efetiva = massa total', () => {
    const L = 4, W = 98.0665; // 10 t
    const m = column(L, 1, 'free', [top(2, 0, -W)]);
    const prep = prepare(m);
    const r = vibration(prep, comboLoading(prep, { 1: 1 }), new Map(), 2);
    const mass = W / 9.80665;
    expect(r.totalMass).toBeCloseTo(mass, 9);
    expect(r.modes[0].omega).toBeCloseTo(Math.sqrt((3 * EI) / (mass * L ** 3)), 6);
    expect(r.modes[0].massX).toBeCloseTo(mass, 6);
    expect(r.modes[1].omega).toBeCloseTo(Math.sqrt((E * A) / L / mass), 3);
  });
});

describe('modos em modelo pequeno (subespaço com B de posto baixo)', () => {
  it('pórtico de galpão: modos de flambagem positivos e crescentes', async () => {
    const { samplePortico } = await import('../app/samples');
    const { nbrCombinations } = await import('./edit');
    const m = samplePortico(); m.combinations = nbrCombinations(m.cases, 1);
    const prep = prepare(m);
    const r = buckling(prep, comboLoading(prep, m.combinations[0].factors), 3);
    expect(r.modes.length).toBe(3);
    expect(r.modes[0].factor).toBeGreaterThan(1);
    expect(r.modes[1].factor).toBeGreaterThan(r.modes[0].factor);
  });
});

describe('vibração com massa consistente', () => {
  it('viga biapoiada com massa distribuída: f1 = π/(2L²)·√(EI/m)', () => {
    const L = 8, q = 9.80665 * 2, nEl = 8; // 2 t/m
    const nodes = Array.from({ length: nEl + 1 }, (_, k) => ({ id: k + 1, x: (L * k) / nEl, y: 0 })) as Model['nodes'];
    (nodes[0] as { support?: unknown }).support = { ux: 'fixed', uy: 'fixed', rz: 'free' };
    (nodes[nEl] as { support?: unknown }).support = { ux: 'free', uy: 'fixed', rz: 'free' };
    const m: Model = {
      version: 1, name: 'v', nodes,
      members: Array.from({ length: nEl }, (_, k) => ({ id: k + 1, ni: k + 1, nj: k + 2, material: 1, section: 1 })),
      materials: [{ id: 1, name: 'm', E, nu: 0.2, alpha: 1e-5, gamma: 0 }],
      sections: [{ id: 1, name: 's', shape: { kind: 'rect', b, h } }],
      cases: [{ id: 1, name: 'c' }], combinations: [], trains: [],
      loads: Array.from({ length: nEl }, (_, k) => ({ kind: 'dist' as const, id: k + 1, caseId: 1, member: k + 1, system: 'global' as const, qxi: 0, qyi: -q, qxj: 0, qyj: -q })),
      options: { shearDeformation: false, axialDeformation: true },
    };
    const prep = prepare(m);
    const exact = (Math.PI / (2 * L * L)) * Math.sqrt(EI / 2);
    const cons = vibration(prep, comboLoading(prep, { 1: 1 }), new Map(), 3, 9.80665, true);
    const lump = vibration(prep, comboLoading(prep, { 1: 1 }), new Map(), 3, 9.80665, false);
    expect(cons.totalMass).toBeCloseTo(2 * L, 6);
    expect(cons.modes[0].freq / exact).toBeCloseTo(1, 3);
    expect(Math.abs(lump.modes[0].freq / exact - 1)).toBeLessThan(0.02);
  });
});
