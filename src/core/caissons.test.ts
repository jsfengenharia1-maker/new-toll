import { describe, expect, it } from 'vitest';
import { caissonShaft, designCaisson, isCaisson } from './caissons';
import { defaultFoundationParams, type Boring } from './piles';

const P = (o: Partial<ReturnType<typeof defaultFoundationParams>> = {}) => ({ ...defaultFoundationParams(), ...o });
const boring = (N: number[], water: number | null = null): Boring => ({ name: 't', water, endImpenetrable: false, meters: N.map((n) => ({ N: n, soil: 'argila' as const })) });

describe('tubulões a céu aberto', () => {
  it('base: Ab = N/σadm (sem peso próprio), Db em múltiplos de 5 cm; altura com 60° + rodapé', () => {
    const r = designCaisson({ Nk: 1500, NkMin: 1000, Mx: 0, My: 0 }, P({ tbSigmaMode: 'informada', tbSigmaAdm: 600, tbDepth: 5, tbWeight: false }));
    expect(isCaisson(r)).toBe(true);
    if (!isCaisson(r)) return;
    const AbReq = 1500 / 600;
    expect((Math.PI * r.Db ** 2) / 4).toBeGreaterThanOrEqual(AbReq - 1e-9);
    expect((Math.PI * (r.Db - 0.05) ** 2) / 4).toBeLessThan(AbReq);
    expect(r.Db).toBeCloseTo(1.8, 9);
    expect(r.Df).toBeCloseTo(0.7, 9);
    expect(r.Hcone).toBeCloseTo(0.866 * (1.8 - 0.7), 9);
    expect(r.H).toBeCloseTo(r.Hcone + 0.2, 9);
  });
  it('fuste: γf·N/Af ≤ 0,85·fck/γc; diâmetro mínimo de 70 cm', () => {
    const s = caissonShaft(6000, P());
    const lim = (0.85 * 25) / 1.6;
    expect(s.lim).toBeCloseTo(lim, 9);
    expect(s.sigma).toBeLessThanOrEqual(lim + 1e-9);
    expect(s.Df).toBeGreaterThan(0.7);
    expect(caissonShaft(500, P()).Df).toBe(0.7);
  });
  it('cota automática acima do NA, σadm pelo SPT (N̄/30) e peso próprio incluído', () => {
    const b = boring([4, 5, 6, 8, 12, 18, 22, 25, 28, 30, 32, 35], 9.5);
    const r = designCaisson({ Nk: 2000, NkMin: 1500, Mx: 0, My: 0, boring: b }, P());
    if (!isCaisson(r)) throw new Error(JSON.stringify(r.messages));
    expect(r.depth).toBeLessThanOrEqual(9);
    expect(r.W).toBeCloseTo(25 * r.volume, 9);
    expect(r.Nbase / ((Math.PI * r.Db ** 2) / 4)).toBeLessThanOrEqual(r.sigmaAdm + 1e-9);
    expect(r.spt).toBeTruthy();
    expect(r.sigmaAdm).toBeCloseTo((Math.min(r.spt!.Nbar, 40) / 30) * 1000, 9);
  });
  it('tração recusada', () => {
    expect(designCaisson({ Nk: 100, NkMin: -10, Mx: 0, My: 0 }, P()).ok).toBe(false);
  });
});
