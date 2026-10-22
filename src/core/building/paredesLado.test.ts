// E1d: seção do lado da parede por fibras contra a seção retangular do pilar comum (concrete.ts) e contra cálculo manual.
import { describe, expect, it } from 'vitest';
import { barArea, concrete, momentCapacity } from '../concrete';
import { fiberAxialRange, fiberCapacity } from '../fiber';
import { barrasDoLado, dimensionarLadoBarra, estriboDoLadoBarra, secaoDoLado, verificarLado } from './paredesLado';
import { asMalha } from './paredesArmadura';

const c = concrete(30, 1.4), fyd = 500 / 1.15 ;
const L = 1.2, t = 0.2, a = 0.04;

describe('seção do lado por fibras × pilar comum', () => {
  const malha = { phi: 10, s: 0.15, As: asMalha(10, 0.15) };
  const bars = barrasDoLado(L, t, a, malha);
  const S = secaoDoLado(L, t, bars, c, fyd);
  // barras do pilar comum: profundidade medida a partir da face x = 0 (flexão no plano), largura b = t
  const barsRet = (() => { const m = new Map<number, number>(); for (const b of bars) m.set(+b.x.toFixed(6), (m.get(+b.x.toFixed(6)) ?? 0) + b.A); return [...m].map(([y, A]) => ({ y, A })); })();

  it('armadura total = 2 faces × barras da malha', () => {
    const n = Math.ceil((L - 2 * a) / 0.15) + 1;
    expect(bars.length).toBe(2 * n);
    expect(bars.reduce((s, b) => s + b.A, 0)).toBeCloseTo(2 * n * barArea(10), 12);
  });
  it('momento resistente no plano: fibras × compatibilidade de deformações do pilar retangular (2 %)', () => {
    for (const N of [-0.2, 0.2, 0.8, 1.5]) { // MN, compressão +
      const ref = momentCapacity(t, L, barsRet, N, c, fyd);
      const mr = fiberCapacity(S, N, 1, 0);
      expect(ref).not.toBeNull();
      expect(mr).not.toBeNull();
      expect(Math.abs(mr! - ref!) / ref!, `N=${N}`).toBeLessThan(0.02);
    }
  });
  it('compressão centrada: NRc = 0,85·fcd·(Ac − As) + As·σs com ε = 0,2 % (fibras)', () => {
    const As = bars.reduce((x, b) => x + b.A, 0), Ac = L * t;
    const ref = c.sigmaCd * (Ac - As) + As * Math.min(fyd, 210000 * 0.002);
    expect(fiberAxialRange(S).NRc).toBeCloseTo(ref, 3);
  });
  it('verificação: sem momento e N pequeno atende; excesso reprova', () => {
    const ok = verificarLado(S, [{ nome: 'C1', N: -500, Mp: 0, Mo: 0 }]);
    expect(ok.util).toBeLessThan(0.2);
    const ruim = verificarLado(S, [{ nome: 'C2', N: -500, Mp: 5000, Mo: 0 }]);
    expect(ruim.util).toBeGreaterThan(1);
  });
});

describe('lado curto como pilar', () => {
  it('estribo: φ ≥ φl/4 e s ≤ mín(20 cm; t; 12φl)', () => {
    expect(estriboDoLadoBarra(10, 0.2)).toEqual({ phi: 5, s: 0.12 });
    expect(estriboDoLadoBarra(20, 0.3)).toEqual({ phi: 5, s: 0.2 });
    expect(estriboDoLadoBarra(25, 0.3).phi).toBe(6.3);
  });
  it('dimensiona: menor malha com util ≤ 1 e As ≥ máx(0,4 % Ac; 0,15Nd/fyd)', () => {
    const r = dimensionarLadoBarra({
      L: 0.6, t: 0.2, a: 0.04, le: 3, conc: c, fyd, limites: { t: 0.2, bitolaMax: 16, espMin: 8, espMax: 40 }, taxaMin: 0.4, taxaMax: 4,
      esforcos: [{ nome: 'C1', N: -1200, Mp: 30, Mo: 4 }, { nome: 'C2', N: -400, Mp: 90, Mo: 10 }],
    });
    expect(r.ok).toBe(true);
    expect(r.util).toBeLessThanOrEqual(1);
    expect(r.As).toBeGreaterThanOrEqual(0.004 * 0.6 * 0.2 - 1e-12);
    expect(r.As).toBeGreaterThanOrEqual((0.15 * 1200) / 1000 / fyd - 1e-12);
    // a malha anterior (menor área) não atendia
    expect(r.vert).not.toBeNull();
  });
  it('seção insuficiente: não atende e avisa', () => {
    const r = dimensionarLadoBarra({
      L: 0.4, t: 0.15, a: 0.04, le: 3, conc: c, fyd, limites: { t: 0.15, bitolaMax: 16, espMin: 8, espMax: 40 }, taxaMin: 0.4, taxaMax: 4,
      esforcos: [{ nome: 'C1', N: -2500, Mp: 200, Mo: 30 }],
    });
    expect(r.ok).toBe(false);
    expect(r.mensagens.length).toBeGreaterThan(0);
  });
});
