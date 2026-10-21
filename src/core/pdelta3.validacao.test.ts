// Validação pública do P-Δ 3D contra o OpenSees: validation/opensees/pdelta3d.py gera o JSON de referência.
import { describe, expect, it } from 'vitest';
import ref from '../../validation/opensees/pdelta3d.json';
import { resolver3, type Modelo3, type V3 } from './fe3d';
import { pDelta3 } from './pdelta3';

describe('validação: P-Δ no pórtico espacial com diafragma rígido × OpenSees (transformação PDelta)', () => {
  const m: Modelo3 = {
    nos: ref.nos as V3[],
    barras: ref.barras.map((b) => ({ i: b.i, j: b.j, E: ref.E, G: ref.G, A: b.A, Iy: b.Iy, Iz: b.Iz, J: b.J, ref: b.ref as V3 })),
    apoios: new Map<number, number[]>([...ref.apoios.map((i) => [i, [0, 1, 2, 3, 4, 5]] as [number, number[]]), ...Object.values(ref.mestres).map((i) => [i, [2, 3, 4]] as [number, number[]])]),
    escravos: Object.entries(ref.mestres).flatMap(([z, mi]) => ref.nos.map((p, i) => [p, i] as const).filter(([p, i]) => Math.abs(p[2] - +z) < 1e-9 && i !== mi).map(([, i]) => ({ no: i, mestre: mi }))),
  };
  const caso = { nodais: ref.cargas, distribuidas: [] };
  it('1ª ordem igual (conferência do modelo)', () => {
    const r = resolver3(m, [caso]);
    for (const [z, mi] of Object.entries(ref.mestres)) (ref.primeira.mestres as Record<string, number[]>)[z].forEach((v, k) => expect(Math.abs(r.desloc[0][mi * 6 + [0, 1, 5][k]] - v) / Math.abs(v)).toBeLessThan(1e-6));
  });
  it('2ª ordem: deslocamentos dos mestres e reações na base coincidem', () => {
    const r = pDelta3(m, caso, { barras: ref.pilares, tol: 1e-12, maxIter: 200 });
    expect(r.convergiu).toBe(true);
    expect(r.amplificacao).toBeGreaterThan(1.1);
    for (const [z, mi] of Object.entries(ref.mestres)) {
      (ref.segunda.mestres as Record<string, number[]>)[z].forEach((v, k) => expect(Math.abs(r.res.desloc[0][mi * 6 + [0, 1, 5][k]] - v) / Math.abs(v)).toBeLessThan(1e-6));
    }
    for (const [i, R] of Object.entries(ref.segunda.reacoes as Record<string, number[]>)) {
      const nosso = r.res.reacoes[0].get(+i)!;
      R.forEach((v, g) => expect(Math.abs(nosso[g] - v)).toBeLessThan(1e-4 * Math.max(1, Math.abs(v))));
    }
  });
});
