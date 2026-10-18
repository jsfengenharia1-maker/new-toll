import { describe, expect, it } from 'vitest';
import { capacity, defaultFoundationParams, maxDepth, pileLoads, pileStructure, sampleFoundation, solveSupport, type Boring } from './piles';

const uniform = (N: number, n = 15, soil: 'areia' | 'argila' = 'areia', water: number | null = null): Boring => ({ name: 't', water, endImpenetrable: false, meters: Array.from({ length: n }, () => ({ N, soil })) });

describe('Décourt-Quaresma', () => {
  it('hélice Ø40 em areia N = 20, L = 10 m', () => {
    const c = capacity('helice', 0.4, 10, uniform(20), 0)!;
    const Ap = Math.PI * 0.04;
    expect(c.Rp).toBeCloseTo(0.3 * 400 * 20 * Ap, 6);
    expect(c.Rl).toBeCloseTo(1 * 10 * (20 / 3 + 1) * Math.PI * 0.4 * 10, 6);
    expect(c.Padm).toBeCloseTo((c.Rp + c.Rl) / 2, 6);
  });
  it('escavada: ponta limitada e Padm ≤ 1,25·Rl', () => {
    const c = capacity('escavada', 0.5, 4, uniform(40, 15, 'areia'), 0)!;
    expect(c.RpUsed).toBeLessThanOrEqual(c.Rl + 1e-9);
    expect(c.Padm).toBeLessThanOrEqual(1.25 * c.Rl + 1e-9);
  });
  it('N do fuste limitado entre 3 e 50', () => {
    const lo = capacity('premoldada', 0.33, 8, uniform(1), 0)!;
    expect(lo.Nl).toBe(3);
    const hi = capacity('premoldada', 0.33, 8, uniform(70), 0)!;
    expect(hi.Np).toBe(50);
  });
});

describe('limites e bloco', () => {
  it('escavada para no nível d’água; pré-moldada na nega estimada', () => {
    const p = defaultFoundationParams();
    expect(maxDepth('escavada', uniform(10, 15, 'areia', 6.5), p).L).toBe(6);
    const b = uniform(10); b.meters[9].N = 32;
    expect(maxDepth('premoldada', b, p).L).toBe(10);
  });
  it('4 estacas com momento My: N/4 + My/(2s)', () => {
    const pl = pileLoads({ id: 1, label: 'x', Nk: 1000, NkMin: 1000, Hx: 0, Hy: 0, Mx: 0, My: 120 }, 4, 0.4, 3, 0);
    expect(pl.Nmax).toBeCloseTo(250 + 120 / (2 * 1.2), 6);
    expect(pl.Nmin).toBeCloseTo(250 - 120 / (2 * 1.2), 6);
  });
});

describe('estrutural e solução', () => {
  it('estaca comprimida abaixo do limite: armadura mínima no comprimento mínimo', () => {
    const p = defaultFoundationParams();
    const pl = pileLoads({ id: 1, label: 'x', Nk: 400, NkMin: 400, Hx: 0, Hy: 0, Mx: 0, My: 0 }, 1, 0.4, 3, 0);
    const s = pileStructure('helice', 0.4, 12, pl, uniform(20), p);
    expect(s.needComp).toBe(false);
    expect(s.armedLength).toBe(4);
    expect(s.options[0].n).toBeGreaterThanOrEqual(3);
    expect(s.options.at(-1)!.n).toBe(3);
  });
  it('exemplo completo encontra solução para todos os tipos', () => {
    const f = sampleFoundation();
    for (const ld of f.loads) {
      const r = solveSupport(ld, f);
      for (const t of r.byType) {
        expect(t.recommended, `${ld.label} ${t.type}`).not.toBeNull();
        console.log(ld.label, t.type, `Ø${Math.round(t.recommended!.D * 100)} n=${t.recommended!.n} L=${t.recommended!.L} Padm=${t.recommended!.cap.Padm.toFixed(0)} Nmax=${t.recommended!.loads.Nmax.toFixed(0)}`, t.recommended!.struct.options.map((o) => `${o.n}φ${o.phi}`).join(' '));
      }
    }
  });
});
