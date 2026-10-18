import { describe, expect, it } from 'vitest';
import { buildPath, effectAt, ilOrdinate, influenceField, samplePath, trainEnvelope } from './influence';
import { prepare, solveCase } from './solver';
import type { Model } from './types';

function beam(hingeAt?: number): Model {
  return {
    version: 1, name: 'b',
    nodes: [
      { id: 1, x: 0, y: 0, support: { ux: 'fixed', uy: 'fixed', rz: 'free' } },
      { id: 2, x: 5, y: 0 },
      { id: 3, x: 10, y: 0, support: { ux: 'free', uy: 'fixed', rz: 'free' } },
    ],
    members: [
      { id: 1, ni: 1, nj: 2, material: 1, section: 1, hingeJ: hingeAt === 2 },
      { id: 2, ni: 2, nj: 3, material: 1, section: 1 },
    ],
    materials: [{ id: 1, name: 'm', E: 2e8, nu: 0.2, alpha: 1e-5, gamma: 25 }],
    sections: [{ id: 1, name: 's', shape: { kind: 'rect', b: 0.2, h: 0.6 } }],
    cases: [{ id: 1, name: 'c' }], combinations: [], loads: [], trains: [],
    options: { shearDeformation: false, axialDeformation: true },
  };
}

describe('linhas de influência', () => {
  const prep = prepare(beam());
  it('momento fletor em x = 2,5 m (viga biapoiada de 10 m)', () => {
    const fld = influenceField(prep, 0, 2.5, 'M');
    expect(ilOrdinate(prep, fld, 0, 2.5)).toBeCloseTo(1.875, 9);
    expect(ilOrdinate(prep, fld, 1, 2.5)).toBeCloseTo(0.625, 9); // p = 7,5 m
    expect(ilOrdinate(prep, fld, 0, 0)).toBeCloseTo(0, 9);
  });
  it('cortante em x = 2,5 m', () => {
    const fld = influenceField(prep, 0, 2.5, 'V');
    expect(ilOrdinate(prep, fld, 0, 2.5 - 1e-9)).toBeCloseTo(-0.25, 6);
    expect(ilOrdinate(prep, fld, 0, 2.5 + 1e-9)).toBeCloseTo(0.75, 6);
    expect(ilOrdinate(prep, fld, 1, 5)).toBeCloseTo(0, 9);
  });
  it('trem-tipo: carga concentrada + q fora do veículo', () => {
    const fld = influenceField(prep, 0, 5, 'M');
    const path = buildPath(prep, [2, 1])!;
    expect(path.map((p) => p.k)).toEqual([0, 1]);
    const sm = samplePath(prep, fld, path, 200);
    const env1 = trainEnvelope(sm, { id: 1, name: 't', length: 0, loads: [{ d: 0, P: 10 }], q: 0, qIn: 0, impact: 1 });
    expect(env1.max).toBeCloseTo(25, 6);
    expect(env1.posMax).toBeCloseTo(5, 6);
    const env2 = trainEnvelope(sm, { id: 1, name: 't', length: 0, loads: [{ d: 0, P: 10 }], q: 5, qIn: 0, impact: 1.2 });
    expect(env2.max).toBeCloseTo(1.2 * (25 + 62.5), 4);
    expect(env2.min).toBeCloseTo(0, 6);
  });
  it('viga Gerber: LI de momento no engaste', () => {
    const m: Model = beam();
    m.nodes[0].support = { ux: 'fixed', uy: 'fixed', rz: 'fixed' };
    m.members[0].hingeJ = true;
    const p = prepare(m);
    const fld = influenceField(p, 0, 0, 'M');
    // carga na rótula (x = 5): M = −5 ; carga sobre o apoio direito: 0
    expect(ilOrdinate(p, fld, 0, 5)).toBeCloseTo(-5, 8);
    expect(ilOrdinate(p, fld, 1, 5)).toBeCloseTo(0, 8);
    expect(ilOrdinate(p, fld, 1, 2.5)).toBeCloseTo(-2.5, 8);
  });
});

describe('linha de influência com ligação semirrígida', () => {
  it('ordenada da LI de M coincide com a análise direta da carga unitária', () => {
    const m = beam();
    m.nodes[0].support = { ux: 'fixed', uy: 'fixed', rz: 'fixed' };
    m.nodes[2].support = { ux: 'fixed', uy: 'fixed', rz: 'fixed' };
    m.members[0].springI = 2e4;
    m.members[1].springJ = 5e4;
    const prep = prepare(m);
    const fld = influenceField(prep, 0, 2, 'M');
    const direct = prepare({ ...m, loads: [{ kind: 'nodal', id: 1, caseId: 1, node: 2, fx: 0, fy: -1, mz: 0 }] });
    const res = solveCase(direct, 1);
    expect(ilOrdinate(prep, fld, 0, 5)).toBeCloseTo(effectAt(res, 0, 2, 'M'), 8);
  });
});
