// Método geral dos pilares (N2c): material elástico linear reproduz 1/(1 − N/Ncr); relação M–N–1/r das fibras;
// fluência da NBR 6118, 15.8.4.
import { describe, expect, it } from 'vitest';
import { excentricidadeAcidental, excentricidadeFluencia, metodoGeral, relacaoMCurvatura } from './metodoGeral';
import { concrete } from './concrete';
import { fiberCapacity, fiberMesh, polyProps, type FiberSection, type Pt } from './fiber';

describe('método geral', () => {
  it('material elástico com imperfeição senoidal: amplificação 1/(1 − N/Ncr)', () => {
    const L = 6, EI = 2e4, Ncr = (Math.PI ** 2 * EI) / (L * L), e0 = 0.01;
    for (const r of [0.2, 0.5, 0.8]) {
      const N = r * Ncr;
      const m = metodoGeral(L, N, (x) => N * e0 * Math.sin((Math.PI * x) / L), (M) => M / EI, { n: 60, tol: 1e-10, maxIter: 500 });
      expect(m.convergiu).toBe(true);
      expect(Math.abs(m.Mmax / (N * e0) / (1 / (1 - r)) - 1)).toBeLessThan(3e-3); // trapézios com 60 trechos
      expect(m.xMax).toBeCloseTo(L / 2, 6);
    }
  });
  it('acima da carga crítica: instabilidade', () => {
    const L = 6, EI = 2e4, N = 1.1 * (Math.PI ** 2 * EI) / (L * L);
    const m = metodoGeral(L, N, () => N * 0.01, (M) => M / EI, { n: 30 });
    expect(m.erro).toMatch(/Instabilidade/);
  });
  it('M–N–1/r de seção 20 × 50 com 6 φ16: rigidez inicial próxima de 1,1·σcd/εc2 ×(2/εc2)… e pico abaixo do resistente', () => {
    const c = concrete(30, 1.4), poly: Pt[] = [[0, 0], [0.2, 0], [0.2, 0.5], [0, 0.5]], P = polyProps(poly), Ab = Math.PI * 0.008 ** 2;
    const bars = [0.045, 0.25, 0.455].flatMap((y) => [{ x: 0.045, y, A: Ab }, { x: 0.155, y, A: Ab }]);
    const S: FiberSection = { mesh: fiberMesh(poly, 16), bars, cx: P.cx, cy: P.cy, c, fyd: 500 / 1.15, poly };
    const N = 1.0; // MN
    const k = relacaoMCurvatura(S, N, 1)!;
    expect(k).not.toBeNull();
    // momento pequeno: κ ≈ M / (E0·I), E0 = 2·1,1·σcd/εc2 (tangente inicial da parábola) com seção não fissurada (≈ bruta)
    const E0 = (2 * 1.1 * c.sigmaCd) / c.ec2, I = (0.2 * 0.5 ** 3) / 12;
    const M = 0.005;
    expect(k(M)! * E0 * I / M).toBeGreaterThan(0.8);
    expect(k(M)! * E0 * I / M).toBeLessThan(1.3);
    // a seção não equilibra momento muito maior que o resistente
    const MR = fiberCapacity(S, N, 0, 1)!;
    expect(k(1.5 * MR)).toBeNull();
    expect(k(0.9 * MR)).not.toBeNull();
  });
  it('fluência e excentricidade acidental', () => {
    expect(excentricidadeAcidental(3, 3)).toBeCloseTo((1 / 200) * 1.5, 9); // θ1 = 1/(100√3) > 1/200: limitado a 1/200
    expect(excentricidadeAcidental(9, 9)).toBeCloseTo((1 / 300) * 4.5, 9);
    // e_cc = (M/N + ea)(e^(φN/(Ne−N)) − 1)
    const Ne = (10 * 3e7 * 0.002) / 16, e = excentricidadeFluencia(500, 25, 0.01, 2.5, 3e7 * 0.002, 4);
    expect(e).toBeCloseTo((25 / 500 + 0.01) * (Math.exp((2.5 * 500) / (Ne - 500)) - 1), 12);
    expect(excentricidadeFluencia(Ne + 1, 0, 0, 2.5, 3e7 * 0.002, 4)).toBe(Infinity);
  });
});
