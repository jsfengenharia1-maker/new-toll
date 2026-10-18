import { describe, expect, it } from 'vitest';
import { P } from './math';
import { analyze, memberDisp, type CaseResult } from './solver';
import type { Load, Member, Model, Node, Support } from './types';

const E = 2e8; // kN/m²
const b = 0.2, h = 0.5;
const I = (b * h ** 3) / 12, A = b * h;
const EI = E * I;

const PIN: Support = { ux: 'fixed', uy: 'fixed', rz: 'free' };
const ROLLER: Support = { ux: 'free', uy: 'fixed', rz: 'free' };
const FIX: Support = { ux: 'fixed', uy: 'fixed', rz: 'fixed' };

function model(nodes: Node[], members: Partial<Member>[], loads: Load[], opts: Partial<Model['options']> = {}): Model {
  return {
    version: 1, name: 't', nodes,
    members: members.map((m, k) => ({ id: k + 1, material: 1, section: 1, ni: 0, nj: 0, ...m })),
    materials: [{ id: 1, name: 'm', E, nu: 0.25, alpha: 1e-5, gamma: 25 }],
    sections: [{ id: 1, name: 's', shape: { kind: 'rect', b, h } }],
    cases: [{ id: 1, name: 'c1' }], combinations: [], loads, trains: [],
    options: { shearDeformation: false, axialDeformation: true, ...opts },
  };
}
const run = (m: Model): CaseResult => {
  const a = analyze(m);
  if (a.prep.error) throw new Error(a.prep.error);
  return a.cases.get(1)!;
};
const dist = (member: number, qy: number, system: 'global' | 'local' = 'global', qyj = qy): Load =>
  ({ kind: 'dist', id: member * 100, caseId: 1, member, system, qxi: 0, qyi: qy, qxj: 0, qyj });

describe('vigas isostáticas', () => {
  it('biapoiada com carga uniforme', () => {
    const L = 6, q = -10;
    const r = run(model([{ id: 1, x: 0, y: 0, support: PIN }, { id: 2, x: L, y: 0, support: ROLLER }], [{ ni: 1, nj: 2 }], [dist(1, q)]));
    const m = r.members[0];
    expect(P.evaluate(m.M, L / 2)).toBeCloseTo((10 * L * L) / 8, 8);
    expect(r.reactions.get(0)![1]).toBeCloseTo(30, 8);
    expect(r.reactions.get(1)![1]).toBeCloseTo(30, 8);
    expect(memberDisp(m, L / 2)[1]).toBeCloseTo((-5 * 10 * L ** 4) / (384 * EI), 10);
    expect(P.evaluate(m.v, L)).toBeCloseTo(m.ul[4], 12);
  });

  it('balanço com carga na ponta, com e sem cisalhamento', () => {
    const L = 4, Pk = 10;
    const nodes = [{ id: 1, x: 0, y: 0, support: FIX }, { id: 2, x: L, y: 0 }];
    const loads: Load[] = [{ kind: 'nodal', id: 1, caseId: 1, node: 2, fx: 0, fy: -Pk, mz: 0 }];
    const r = run(model(nodes, [{ ni: 1, nj: 2 }], loads));
    expect(r.u[4]).toBeCloseTo((-Pk * L ** 3) / (3 * EI), 12);
    expect(r.reactions.get(0)![2]).toBeCloseTo(Pk * L, 8);
    expect(P.evaluate(r.members[0].M, 0)).toBeCloseTo(-Pk * L, 8);
    const G = E / (2 * 1.25), As = A / 1.2;
    const rs = run(model(nodes, [{ ni: 1, nj: 2 }], loads, { shearDeformation: true }));
    expect(rs.u[4]).toBeCloseTo((-Pk * L ** 3) / (3 * EI) - (Pk * L) / (G * As), 12);
    expect(memberDisp(rs.members[0], L)[1]).toBeCloseTo(rs.u[4], 12);
  });

  it('viga Gerber com rótula interna', () => {
    // engaste em 0, rótula em 4, apoio móvel em 8; carga uniforme 10 no trecho 4-8
    const r = run(model(
      [{ id: 1, x: 0, y: 0, support: FIX }, { id: 2, x: 4, y: 0 }, { id: 3, x: 8, y: 0, support: ROLLER }],
      [{ ni: 1, nj: 2, hingeJ: true }, { ni: 2, nj: 3 }], [dist(2, -10)]));
    expect(r.reactions.get(2)![1]).toBeCloseTo(20, 8);
    expect(r.reactions.get(0)![1]).toBeCloseTo(20, 8);
    expect(r.reactions.get(0)![2]).toBeCloseTo(80, 8);
    expect(P.evaluate(r.members[0].M, 4)).toBeCloseTo(0, 8);
  });
});

describe('hiperestáticas', () => {
  it('biengastada com carga uniforme', () => {
    const L = 5, q = 12;
    const r = run(model([{ id: 1, x: 0, y: 0, support: FIX }, { id: 2, x: L, y: 0, support: FIX }], [{ ni: 1, nj: 2 }], [dist(1, -q)]));
    const m = r.members[0];
    expect(P.evaluate(m.M, 0)).toBeCloseTo((-q * L * L) / 12, 8);
    expect(P.evaluate(m.M, L / 2)).toBeCloseTo((q * L * L) / 24, 8);
    expect(memberDisp(m, L / 2)[1]).toBeCloseTo((-q * L ** 4) / (384 * EI), 10);
  });

  it('engaste-apoio com carga triangular (0 → q)', () => {
    const L = 6, q = 9;
    const r = run(model([{ id: 1, x: 0, y: 0, support: FIX }, { id: 2, x: L, y: 0, support: ROLLER }], [{ ni: 1, nj: 2 }], [dist(1, 0, 'global', -q)]));
    // momento no engaste para carga crescendo até a extremidade apoiada: 7qL²/120
    expect(P.evaluate(r.members[0].M, 0)).toBeCloseTo((-7 * q * L * L) / 120, 8);
  });

  it('recalque do apoio central em viga contínua de dois vãos', () => {
    const L = 5, d = -0.01;
    const r = run(model(
      [{ id: 1, x: 0, y: 0, support: PIN }, { id: 2, x: L, y: 0, support: ROLLER }, { id: 3, x: 2 * L, y: 0, support: ROLLER }],
      [{ ni: 1, nj: 2 }, { ni: 2, nj: 3 }], [{ kind: 'presc', id: 1, caseId: 1, node: 2, dy: d }]));
    expect(P.evaluate(r.members[0].M, L)).toBeCloseTo((-3 * EI * d) / (L * L), 6);
    expect(r.u[4]).toBeCloseTo(d, 14);
  });

  it('gradiente térmico: biengastada (momento constante) e biapoiada (só flecha)', () => {
    const L = 6, dT = 20; // fibra inferior 20 °C mais quente
    const th: Load = { kind: 'thermal', id: 1, caseId: 1, member: 1, tTop: 0, tBot: dT };
    const k = (1e-5 * dT) / h;
    const rf = run(model([{ id: 1, x: 0, y: 0, support: FIX }, { id: 2, x: L, y: 0, support: FIX }], [{ ni: 1, nj: 2 }], [th]));
    expect(P.evaluate(rf.members[0].M, 1.3)).toBeCloseTo(-EI * k, 6);
    expect(Math.abs(memberDisp(rf.members[0], L / 2)[1])).toBeLessThan(1e-12);
    const rs = run(model([{ id: 1, x: 0, y: 0, support: PIN }, { id: 2, x: L, y: 0, support: ROLLER }], [{ ni: 1, nj: 2 }], [th]));
    expect(Math.abs(P.evaluate(rs.members[0].M, 2))).toBeLessThan(1e-8);
    expect(memberDisp(rs.members[0], L / 2)[1]).toBeCloseTo((-k * L * L) / 8, 12);
  });

  it('apoio inclinado equivale ao apoio girado de 90°', () => {
    const nodes = (s: Support): Node[] => [{ id: 1, x: 0, y: 0, support: PIN }, { id: 2, x: 6, y: 0, support: s }];
    const loads = [dist(1, -10)];
    const a = run(model(nodes(ROLLER), [{ ni: 1, nj: 2 }], loads));
    const bR = run(model(nodes({ ux: 'fixed', uy: 'free', rz: 'free', angle: 90 }), [{ ni: 1, nj: 2 }], loads));
    expect(P.evaluate(bR.members[0].M, 3)).toBeCloseTo(P.evaluate(a.members[0].M, 3), 8);
    expect(bR.reactions.get(1)![1]).toBeCloseTo(30, 8);
    // rolete a 45°: reação perpendicular ao plano de rolamento gera empuxo horizontal no pino
    const c = run(model(nodes({ ux: 'free', uy: 'fixed', rz: 'free', angle: 45 }), [{ ni: 1, nj: 2 }], loads));
    const R = c.reactions.get(1)!;
    expect(R[0]).toBeCloseTo(-R[1], 8);
    expect(c.reactions.get(0)![0] + R[0]).toBeCloseTo(0, 8);
  });

  it('pórtico: equilíbrio global e mola', () => {
    const r = run(model(
      [{ id: 1, x: 0, y: 0, support: FIX }, { id: 2, x: 0, y: 4 }, { id: 3, x: 6, y: 4 }, { id: 4, x: 6, y: 0, support: { ux: 'spring', uy: 'fixed', rz: 'fixed', kx: 5e3 } }],
      [{ ni: 1, nj: 2 }, { ni: 2, nj: 3 }, { ni: 4, nj: 3 }],
      [{ kind: 'nodal', id: 1, caseId: 1, node: 2, fx: 15, fy: 0, mz: 0 }, dist(2, -8)]));
    const R = [...r.reactions.values()];
    expect(R.reduce((s, x) => s + x[0], 0)).toBeCloseTo(-15, 7);
    expect(R.reduce((s, x) => s + x[1], 0)).toBeCloseTo(48, 7);
    expect(r.reactions.get(3)![0]).toBeCloseTo(-5e3 * r.u[9], 8);
  });

  it('instabilidade é detectada', () => {
    const a = analyze(model([{ id: 1, x: 0, y: 0, support: ROLLER }, { id: 2, x: 6, y: 0, support: ROLLER }], [{ ni: 1, nj: 2 }], [dist(1, -10)]));
    expect(a.prep.error).toMatch(/hipostática/);
  });
});
