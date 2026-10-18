import { describe, expect, it } from 'vitest';
import { axialCapacity, barArea, beamAsMin, beamFlexure, beamShear, columnBars, concrete, designColumn, momentCapacity } from './concrete';

const c25 = concrete(25), c30 = concrete(30);
const fyd = 500 / 1.15;

describe('materiais', () => {
  it('C30: fctm, Eci, Ecs', () => {
    expect(c30.fctm).toBeCloseTo(2.896, 2);
    expect(c30.Eci).toBeCloseTo(30672, 0);
    expect(c30.Ecs).toBeCloseTo(26838, -1);
  });
  it('C50 sem ηc e C60 com ηc (NBR 6118:2023)', () => {
    expect(concrete(40).sigmaCd).toBeCloseTo(0.85 * 40 / 1.4, 6);
    expect(concrete(60).sigmaCd).toBeLessThan(0.85 * 60 / 1.4);
  });
});

describe('vigas', () => {
  it('flexão simples clássica: 20x50, d = 45, C25, Md = 100 kN·m → As ≈ 5,61 cm²', () => {
    const r = beamFlexure({ kind: 'rect', bw: 0.2, h: 0.5 }, true, 100, 0.45, 0.04, c25, fyd);
    expect(r.As * 1e4).toBeCloseTo(5.61, 1);
    expect(r.xd).toBeCloseTo(0.223, 2);
    expect(r.double).toBe(false);
  });
  it('armadura dupla acima de x/d = 0,45', () => {
    const r = beamFlexure({ kind: 'rect', bw: 0.2, h: 0.5 }, true, 220, 0.45, 0.04, c25, fyd);
    expect(r.double).toBe(true);
    expect(r.As2).toBeGreaterThan(0);
  });
  it('As,min 20x50 C30 próximo de 0,15%', () => {
    const a = beamAsMin({ kind: 'rect', bw: 0.2, h: 0.5 }, true, 0.45, c30, fyd);
    expect(a * 1e4).toBeGreaterThanOrEqual(1.5 - 1e-9);
    expect(a * 1e4).toBeLessThan(1.8);
  });
  it('cisalhamento modelo I: VRd2 = 0,27·αv2·fcd·bw·d', () => {
    const r = beamShear(0.2, 0.45, 150, c25, 500, 1.15);
    expect(r.VRd2).toBeCloseTo(0.27 * 0.9 * (25 / 1.4) * 0.2 * 0.45 * 1000, 3);
    expect(r.ok).toBe(true);
    expect(r.stirrup).not.toBeNull();
  });
});

describe('seção de pilar', () => {
  const b = 0.2, h = 0.5;
  const L = { phi: 16, nx: 2, ny: 3, n: 6, As: 6 * barArea(16), a: 0.03 + 0.0063 + 0.008 };
  it('compressão centrada = 0,85fcd·Ac + As·σs(2‰)', () => {
    const { NRc } = axialCapacity(b, h, columnBars(b, h, L, true), c25, fyd);
    const exp = 0.85 * (25 / 1.4) * (b * h - L.As) + L.As * 420;
    expect(NRc).toBeCloseTo(exp, 3);
  });
  it('flexão pura simétrica ≈ As·fyd·braço', () => {
    const M = momentCapacity(b, h, columnBars(b, h, L, true), 0, c25, fyd)!;
    const z = h - 2 * L.a;
    expect(M).toBeGreaterThan(0.9 * 2 * barArea(16) * fyd * z);
    expect(M).toBeLessThan(1.3 * 3 * barArea(16) * fyd * z);
  });
  it('pilar curto com carga centrada passa com armadura mínima', () => {
    const d = designColumn({ b: 0.3, h: 0.3, L: 3, leIn: 3, leOut: 3, cover: 0.03, conc: c30, fyk: 500, gammaS: 1.15, dmax: 0.019, combos: [{ name: 'c', N0: -800, NL: -790, M0: 0, ML: 0, Mspan: 0, transverse: false }] });
    expect(d.ok).toBe(true);
    expect(d.layout!.As).toBeGreaterThanOrEqual(d.AsMin - 1e-12);
    expect(d.check!.M1dMinX).toBeCloseTo(800 * (0.015 + 0.03 * 0.3), 6);
  });
  it('pilar sobrecarregado falha e informa', () => {
    const d = designColumn({ b: 0.2, h: 0.2, L: 3, leIn: 3, leOut: 3, cover: 0.03, conc: c30, fyk: 500, gammaS: 1.15, dmax: 0.019, combos: [{ name: 'c', N0: -3000, NL: -3000, M0: 50, ML: -50, Mspan: 50, transverse: false }] });
    expect(d.ok).toBe(false);
  });
});

describe('pilares: αb do balanço e γn nos esforços finais', () => {
  const c30 = concrete(30);
  const base = { L: 3, cover: 0.03, conc: c30, fyk: 500, gammaS: 1.15, dmax: 0.019 };
  it('balanço com carga no topo: αb = 0,80 + 0,20·MC/MA = 0,90 (não 0,60 de biapoiado)', () => {
    const cb = { name: 'c', N0: -600, NL: -600, M0: 60, ML: 0, Mspan: 60, transverse: false, cantilever: true, Mmid: 30 };
    const d = designColumn({ ...base, b: 0.3, h: 0.4, leIn: 6, leOut: 3, combos: [cb] });
    expect(d.check?.alphaB).toBeCloseTo(0.9, 9);
    const bi = designColumn({ ...base, b: 0.3, h: 0.4, leIn: 6, leOut: 3, combos: [{ ...cb, cantilever: false }] });
    expect(bi.check?.alphaB).toBeCloseTo(0.6, 9);
  });
  it('γn não reduz a curvatura: M2d = γn·Nd·le²/10·0,005/(h(ν+0,5)), com ν sem γn', () => {
    const b = 0.15, h = 0.4, Nd = 500, le = 6;
    const d = designColumn({ ...base, b, h, leIn: le, leOut: 1, combos: [{ name: 'c', N0: -Nd, NL: -Nd, M0: 10, ML: 10, Mspan: 10, transverse: false }] });
    const gn = 1.95 - 0.05 * 15;
    const nu = Nd / 1000 / (b * h * c30.fcd);
    const ref = ((gn * Nd * le ** 2) / 10) * Math.min(0.005 / (h * (nu + 0.5)), 0.005 / h);
    expect(d.gammaN).toBeCloseTo(gn, 12);
    expect(d.check?.M2dX).toBeCloseTo(ref, 6);
  });
});
