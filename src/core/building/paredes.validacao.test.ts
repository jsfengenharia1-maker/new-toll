// E1c: parede com abertura sob empuxo de terra contra o OpenSees (ShellMITC4, malha de 0,125 m).
// Referência: `python3 validation/opensees/parede_empuxo.py` (fora do npm test) → validation/opensees/parede_empuxo.json.
import { describe, expect, it } from 'vitest';
import { resolver3 } from '../fe3d';
import { modelo } from './paredesEmpuxoFixture';
import ref from '../../../validation/opensees/parede_empuxo.json';

describe('parede com abertura sob empuxo contra o OpenSees', () => {
  for (const [malha, tol] of [[1, 0.02], [0.5, 0.01]] as const) {
    it(`malha de ${malha} m: deslocamentos fora do plano e reações da base`, () => {
      const m = modelo(malha), o = ref.resultados;
      expect(-m.r0.empuxo[0].F[1]).toBeCloseTo(o.F, 6);
      const r = resolver3(m.pm, m.casos);
      expect(r.erro).toBeUndefined();
      const uy = (x: number, z: number) => r.desloc[0][m.pm.nos.findIndex((p) => Math.abs(p[0] - x) < 1e-6 && Math.abs(p[1]) < 1e-6 && Math.abs(p[2] - z) < 1e-6) * 6 + 1];
      const esc = Math.abs(o.topo_canto);
      for (const [nome, x, z] of [['topo_meio', 3, 3], ['topo_canto', 0, 3], ['lintel_meio', 3, 2.5], ['peitoril_meio', 3, 0.5]] as const)
        expect(Math.abs(uy(x, z) - o[nome]) / esc, nome).toBeLessThan(tol);
      let Ry = 0, Mx = 0;
      for (const [, rr] of r.reacoes[0]) { Ry += rr[1]; Mx += rr[3]; }
      expect(Ry).toBeCloseTo(o.Ry, 3);
      expect(Mx / o.Mx).toBeCloseTo(1, 3);
    });
  }
});
