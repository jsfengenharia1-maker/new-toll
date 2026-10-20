// Validação pública contra o OpenSees: validation/opensees/portico3d.py gera o JSON de referência.
import { describe, expect, it } from 'vitest';
import ref from '../../validation/opensees/portico3d.json';
import { resolver3, type Modelo3, type V3 } from './fe3d';

describe('validação: pórtico espacial com diafragma rígido × OpenSees', () => {
  it('deslocamentos dos mestres e reações na base coincidem', () => {
    const m: Modelo3 = {
      nos: ref.nos as V3[],
      barras: ref.barras.map((b) => ({ i: b.i, j: b.j, E: ref.E, G: ref.G, A: b.A, Iy: b.Iy, Iz: b.Iz, J: b.J, ref: b.ref as V3 })),
      apoios: new Map<number, number[]>([...ref.apoios.map((i) => [i, [0, 1, 2, 3, 4, 5]] as [number, number[]]), ...Object.values(ref.mestres).map((i) => [i, [2, 3, 4]] as [number, number[]])]),
      escravos: Object.entries(ref.mestres).flatMap(([z, mi]) => ref.nos.map((p, i) => [p, i] as const).filter(([p, i]) => Math.abs(p[2] - +z) < 1e-9 && i !== mi).map(([, i]) => ({ no: i, mestre: mi }))),
    };
    const r = resolver3(m, [{ nodais: ref.cargas, distribuidas: [] }]);
    expect(r.erro).toBeUndefined();
    for (const [z, mi] of Object.entries(ref.mestres)) {
      const [ux, uy, rz] = (ref.resultados.mestres as Record<string, number[]>)[z];
      const u = r.desloc[0];
      expect(Math.abs(u[mi * 6] - ux) / Math.abs(ux)).toBeLessThan(1e-6);
      expect(Math.abs(u[mi * 6 + 1] - uy) / Math.abs(uy)).toBeLessThan(1e-6);
      expect(Math.abs(u[mi * 6 + 5] - rz) / Math.abs(rz)).toBeLessThan(1e-6);
    }
    for (const [i, R] of Object.entries(ref.resultados.reacoes as Record<string, number[]>)) {
      const nosso = r.reacoes[0].get(+i)!;
      R.forEach((v, g) => expect(nosso[g]).toBeCloseTo(v, 4));
    }
  });
});
