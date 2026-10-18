import { describe, expect, it } from 'vitest';
import { analyze } from './solver';
import { runDesign } from './design';
import { designSteel } from './steel';
import { samplePortico, sampleViga } from '../app/samples';

describe('dimensionamento integrado', () => {
  it('pórtico exemplo: dimensiona pilares e vigas, calcula fundação e γz', () => {
    const m = samplePortico();
    const rep = runDesign(m, analyze(m));
    expect(rep.members.length).toBe(m.members.length);
    const cols = rep.members.filter((x) => x.role === 'column');
    expect(cols.length).toBe(2);
    for (const c of cols) { expect(c.column?.layout).toBeTruthy(); expect(c.NdMax).toBeGreaterThan(0); }
    const beams = rep.members.filter((x) => x.role === 'beam');
    for (const b of beams) expect((b.beam?.pos.AsAdopt ?? 0) + (b.beam?.neg.AsAdopt ?? 0)).toBeGreaterThan(0);
    expect(rep.foundation.length).toBe(2);
    expect(rep.foundation[0].perCase.length).toBe(3);
    expect(rep.gammaZ.rows.length).toBeGreaterThan(0);
    expect(rep.gammaZ.max).toBeGreaterThan(1);
    console.log(rep.members.map((x) => `${x.id} ${x.role} ${x.status} ${x.util.toFixed(2)} ${x.summary} ${x.suggestion ?? ''}`).join('\n'), '\nγz', rep.gammaZ.max.toFixed(3), rep.warnings);
  });
  it('viga contínua: flecha e armaduras', () => {
    const m = sampleViga();
    const rep = runDesign(m, analyze(m));
    for (const b of rep.members) { expect(b.deflection).toBeTruthy(); expect(b.beam?.shear.stirrup).toBeTruthy(); }
    console.log(rep.members.map((x) => `${x.id} ${x.status} ${x.summary} f=${((x.deflection?.f ?? 0) * 1000).toFixed(1)}mm lim=${((x.deflection?.limit ?? 0) * 1000).toFixed(1)}`).join('\n'));
  });
});

describe('aço NBR 8800', () => {
  it('perfil I compacto travado: MRd = Zx·fy/1,1', () => {
    const shape = { kind: 'ishape' as const, bf: 0.2, tf: 0.016, tw: 0.009, h: 0.4 };
    const r = designSteel({ shape, fy: 345, gammaA1: 1.1, L: 1, leIn: 1, leOut: 0.5, combos: [{ name: 'c', N: 0, Mmax: 100, MA: 100, MB: 100, MC: 100, Mend0: 100, MendL: 100, V: 10, transverse: false }] });
    const Zx = 0.2 * 0.016 * (0.4 - 0.016) + 0.009 * (0.4 - 0.032) ** 2 / 4;
    expect(r.MRd).toBeCloseTo((Zx * 345 / 1.1) * 1000, 0);
    expect(r.ok).toBe(true);
  });
  it('compressão: χ pela curva da NBR 8800', () => {
    const shape = { kind: 'tube' as const, d: 0.1143, t: 0.006 };
    const r = designSteel({ shape, fy: 250, gammaA1: 1.1, L: 3, leIn: 3, leOut: 3, combos: [{ name: 'c', N: -100, Mmax: 0, MA: 0, MB: 0, MC: 0, Mend0: 0, MendL: 0, V: 0, transverse: false }] });
    const A = Math.PI * (0.1143 ** 2 - 0.1023 ** 2) / 4, I = Math.PI * (0.1143 ** 4 - 0.1023 ** 4) / 64;
    const l0 = Math.sqrt(A * 250 / (Math.PI ** 2 * 200000 * I / 9));
    expect(r.chi).toBeCloseTo(0.658 ** (l0 * l0), 6);
    expect(r.NcRd).toBeCloseTo(r.chi * A * 250 / 1.1 * 1000, 3);
  });
});
