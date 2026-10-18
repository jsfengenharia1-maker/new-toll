import { describe, expect, it } from 'vitest';
import { buildPath, displacementField, effectAt, ilOrdinate, influenceField, reactionField, samplePath, trainEnvelope } from './influence';
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

describe('LI de reação e de deslocamento', () => {
  it('viga biapoiada: LI da reação no apoio esquerdo é 1 − x/L', () => {
    const prep = prepare(beam());
    const f = reactionField(prep, 0, 1)!;
    expect(ilOrdinate(prep, f, 0, 0)).toBeCloseTo(1, 9);
    expect(ilOrdinate(prep, f, 0, 2.5)).toBeCloseTo(0.75, 9);
    expect(ilOrdinate(prep, f, 1, 5)).toBeCloseTo(0, 9);
  });
  it('viga contínua de 2 vãos: LI da reação central confere com a análise direta', () => {
    const m = beam();
    m.nodes[1].support = { ux: 'free', uy: 'fixed', rz: 'free' };
    const prep = prepare(m);
    const f = reactionField(prep, 1, 1)!;
    const direct = prepare({ ...m, loads: [{ kind: 'dist', id: 1, caseId: 1, member: 1, system: 'global', qxi: 0, qyi: -1, qxj: 0, qyj: -1 }] });
    // carga uniforme unitária no 2º vão: reação = área da LI sob o vão
    const r = solveCase(direct, 1).reactions.get(1)![1];
    let area = 0;
    for (let i = 0; i < 200; i++) area += ilOrdinate(prep, f, 1, 5 * (i + 0.5) / 200) * (5 / 200);
    expect(area).toBeCloseTo(r, 4);
    expect(r).toBeCloseTo(5 * 5 / 8, 6); // 5qL/8 de cada vão, metade vem do vão carregado
  });
  it('LI de deslocamento vertical no meio do vão = flecha por carga unitária', () => {
    const prep = prepare(beam());
    const f = displacementField(prep, 1, 1);
    const EI = 2e8 * 0.2 * 0.6 ** 3 / 12;
    // carga unitária descendente no meio (x = 5): δ = −L³/(48EI) (para cima positivo) → ordenada = δ
    expect(ilOrdinate(prep, f, 0, 5)).toBeCloseTo(-(10 ** 3) / (48 * EI), 12);
  });
});
