import { describe, expect, it } from 'vitest';
import { basePressure, designFooting, isFooting, sptSigma } from './footings';
import { defaultFoundationParams, type Boring } from './piles';

const uniform = (N: number, n = 15): Boring => ({ name: 't', water: null, endImpenetrable: false, meters: Array.from({ length: n }, () => ({ N, soil: 'argila' as const })) });
const P = (o: Partial<ReturnType<typeof defaultFoundationParams>> = {}) => ({ ...defaultFoundationParams(), ...o });

describe('tensões na base sem tração', () => {
  it('dentro do núcleo: N/(AB)·(1 + 6e/A)', () => {
    const r = basePressure(2, 1, 100, 0.2, 0)!;
    expect(r.sigmaMax).toBeCloseTo(50 * 1.6, 9);
    expect(r.compressed).toBe(1);
  });
  it('fora do núcleo, uniaxial: 2N/(3B(A/2 − e)) e área comprimida 3(A/2 − e)/A', () => {
    const r = basePressure(2, 1, 100, 0.5, 0)!;
    expect(r.sigmaMax).toBeCloseTo(200 / 1.5, 3);
    expect(r.compressed).toBeCloseTo(0.75, 3);
  });
  it('fora do núcleo, biaxial: solução existe e tensão máxima acima da elástica', () => {
    const r = basePressure(2, 2, 100, 0.3, 0.3)!;
    expect(r).not.toBeNull();
    expect(r.compressed).toBeLessThan(1);
    expect(r.sigmaMax).toBeGreaterThan((100 / 4) * (1 + (6 * 0.3) / 2 + (6 * 0.3) / 2));
  });
});

describe('σadm pelo SPT (estimativa N̄/50)', () => {
  it('N̄ = 15 → 300 kPa; N̄ = 30 limitado a 20 → 400 kPa', () => {
    expect(sptSigma(uniform(15), 1.5, 4, 50, 20)!.sigma).toBeCloseTo(300, 9);
    expect(sptSigma(uniform(30), 1.5, 4, 50, 20)!.sigma).toBeCloseTo(400, 9);
  });
});

describe('sapatas', () => {
  it('centrada, σadm informada: A·B ≥ N·(1 + pp)/σadm, balanços iguais, h ≥ (a − ap)/3', () => {
    const r = designFooting({ Nk: 1000, NkMin: 800, Mx: 0, My: 0, ap: 0.3, bp: 0.3 }, P({ ftSigmaMode: 'informada', ftSigmaAdm: 200 }));
    expect(isFooting(r)).toBe(true);
    if (!isFooting(r)) return;
    expect(r.A * r.B).toBeGreaterThanOrEqual(1050 / 200 - 1e-9);
    expect(r.A).toBeCloseTo(2.3, 9);
    expect(r.B).toBeCloseTo(2.3, 9);
    expect(r.h).toBeGreaterThanOrEqual((2.3 - 0.3) / 3 - 1e-9);
    expect(r.kind).toBe('rigida');
    // CEB-70: M = σd·B·(c + 0,15ap)²/2 na seção a 0,15ap dentro da face do pilar
    const sd = 1400 / (2.3 * 2.3);
    expect(r.flex.x.Md).toBeCloseTo((sd * 2.3 * (1 + 0.045) ** 2) / 2, 6);
    expect(r.flex.x.bars).not.toBeNull();
  });
  it('pilar retangular: balanços aproximadamente iguais (A − ap ≈ B − bp)', () => {
    const r = designFooting({ Nk: 1500, NkMin: 1200, Mx: 0, My: 0, ap: 0.2, bp: 0.6 }, P({ ftSigmaMode: 'informada', ftSigmaAdm: 250 }));
    if (!isFooting(r)) throw new Error('sem solução');
    expect(Math.abs(r.A - 0.2 - (r.B - 0.6))).toBeLessThanOrEqual(0.1 + 1e-9);
  });
  it('bielas (Lebelle): T = Nd·(A − ap)/(8d)', () => {
    const r = designFooting({ Nk: 1000, NkMin: 800, Mx: 0, My: 0, ap: 0.3, bp: 0.3 }, P({ ftSigmaMode: 'informada', ftSigmaAdm: 200, ftMethod: 'bielas' }));
    if (!isFooting(r)) throw new Error('sem solução');
    expect(r.method).toBe('bielas');
    expect(r.flex.x.T).toBeCloseTo((1400 * (r.A - 0.3)) / (8 * r.d), 6);
  });
  it('momento: área comprimida ≥ 2/3 e σmáx ≤ σadm, lado maior na direção do momento', () => {
    const r = designFooting({ Nk: 800, NkMin: 500, Mx: 0, My: 200, ap: 0.3, bp: 0.3 }, P({ ftSigmaMode: 'informada', ftSigmaAdm: 250 }));
    if (!isFooting(r)) throw new Error('sem solução');
    for (const c of r.cases) { expect(c.compressed).toBeGreaterThanOrEqual(2 / 3 - 1e-6); expect(c.sigmaMax).toBeLessThanOrEqual(250 + 1e-6); }
    expect(r.A).toBeGreaterThan(r.B);
  });
  it('flexível: punção verificada no contorno C′', () => {
    const r = designFooting({ Nk: 1200, NkMin: 900, Mx: 0, My: 0, ap: 0.4, bp: 0.4 }, P({ ftSigmaMode: 'informada', ftSigmaAdm: 150, ftKind: 'flexivel' }));
    if (!isFooting(r)) throw new Error('sem solução');
    expect(r.kind).toBe('flexivel');
    expect(r.h).toBeLessThan(r.hRigid);
    expect(r.punch.applies).toBe(true);
    expect(r.punch.tauSd1!).toBeLessThanOrEqual(r.punch.tauRd1! + 1e-9);
    expect(r.punch.tauSd0).toBeCloseTo((1.4 * 1200) / 1000 / (1.6 * r.d), 9);
  });
  it('peso próprio: o maior entre o percentual e o peso do concreto', () => {
    const r = designFooting({ Nk: 1350, NkMin: 900, Mx: 0, My: 60, ap: 0.3, bp: 0.3 }, P({ ftSigmaMode: 'informada', ftSigmaAdm: 150 }));
    if (!isFooting(r)) throw new Error('sem solução');
    expect(r.W).toBeGreaterThanOrEqual(0.05 * 1350 - 1e-9);
    expect(r.W + 0.5).toBeGreaterThanOrEqual(r.Wconc);
    expect(r.cases[0].N).toBeCloseTo(1350 + r.W, 9);
  });
  it('σadm pelo SPT e tração recusada', () => {
    const r = designFooting({ Nk: 600, NkMin: 400, Mx: 0, My: 0, ap: 0.3, bp: 0.3, boring: uniform(10) }, P());
    if (!isFooting(r)) throw new Error('sem solução');
    expect(r.sigmaAdm).toBeCloseTo(200, 9);
    const t = designFooting({ Nk: 100, NkMin: -50, Mx: 0, My: 0, ap: 0.3, bp: 0.3 }, P({ ftSigmaMode: 'informada' }));
    expect(t.ok).toBe(false);
  });
});
