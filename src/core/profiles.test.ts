import { describe, expect, it } from 'vitest';
import { PROFILES, findProfile, profileMass, profileShape } from './profiles';
import { sectionProps } from './section';
import { steelProps } from './steel';

// Fórmulas geométricas fechadas, escritas aqui de forma independente (sem raio de concordância).
function iGeo(d: number, bf: number, tw: number, tf: number) {
  const hw = d - 2 * tf;
  return { A: 2 * bf * tf + hw * tw, Ix: (bf * d ** 3) / 12 - ((bf - tw) * hw ** 3) / 12 };
}

describe('perfis de catálogo (geometria nominal)', () => {
  it('W310×38,7: A e Ix pela fórmula de três retângulos', () => {
    const s = profileShape('W310×38,7')!;
    expect(s.kind).toBe('ishape');
    const g = iGeo(0.310, 0.165, 0.0058, 0.0097);
    const p = sectionProps(s);
    expect(p.A).toBeCloseTo(g.A, 10);
    expect(p.I).toBeCloseTo(g.Ix, 12);
    expect(steelProps(s)!.Ix).toBeCloseTo(g.Ix, 12);
    // ordem de grandeza: 48,9 cm² e ~8,4e3 cm⁴ pela geometria
    expect(p.A * 1e4).toBeCloseTo(48.86, 1);
    expect(p.I * 1e8).toBeGreaterThan(8000);
    expect(p.I * 1e8).toBeLessThan(8800);
  });

  it('HP310×125,0 e W610×174,0', () => {
    for (const [name, d, bf, tw, tf] of [['HP310×125,0', 0.312, 0.312, 0.0174, 0.0174], ['W610×174,0', 0.616, 0.325, 0.014, 0.0216]] as const) {
      const p = sectionProps(profileShape(name)!);
      const g = iGeo(d, bf, tw, tf);
      expect(p.A).toBeCloseTo(g.A, 10);
      expect(p.I).toBeCloseTo(g.Ix, 12);
    }
  });

  it('tubo circular e tubo retangular', () => {
    const t = sectionProps(profileShape('Tubo Ø114,3×6,02')!);
    const D = 0.1143, di = D - 2 * 0.00602;
    expect(t.A).toBeCloseTo((Math.PI * (D ** 2 - di ** 2)) / 4, 12);
    expect(t.I).toBeCloseTo((Math.PI * (D ** 4 - di ** 4)) / 64, 14);
    const r = sectionProps(profileShape('TR 200×100×6,3')!);
    const h = 0.2, b = 0.1, e = 0.0063;
    expect(r.A).toBeCloseTo(b * h - (b - 2 * e) * (h - 2 * e), 12);
    expect(r.I).toBeCloseTo((b * h ** 3 - (b - 2 * e) * (h - 2 * e) ** 3) / 12, 14);
    expect(r.h).toBeCloseTo(h, 12); // altura no plano do pórtico
  });

  it('nomes únicos e massa geométrica coerente com a designação (concordância só acrescenta área)', () => {
    expect(new Set(PROFILES.map((p) => p.name)).size).toBe(PROFILES.length);
    expect(findProfile('HP200×53,0')).toBeTruthy();
    expect(findProfile('W150×13,0')).toBeTruthy();
    for (const p of PROFILES) {
      if (!p.massNominal) continue;
      const r = profileMass(p.shape) / p.massNominal;
      expect(r, p.name).toBeGreaterThan(0.9);
      expect(r, p.name).toBeLessThan(1.02);
    }
  });
});
