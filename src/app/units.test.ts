import { describe, expect, it } from 'vitest';
import { makeUnits } from './units';

describe('unidades de exibição', () => {
  it('tf e kgf a partir de kN (g = 9,80665)', () => {
    const u = makeUnits('tf');
    expect(u.F.to(9.80665)).toBeCloseTo(1, 12);
    expect(u.M.label).toBe('tf·m');
    expect(u.q.from(2)).toBeCloseTo(19.6133, 10);
    expect(makeUnits('kgf').F.to(1)).toBeCloseTo(101.97162, 4);
    expect(makeUnits('N').eff('M').to(1)).toBeCloseTo(1000, 9);
  });
  it('ida e volta sem perda', () => {
    for (const f of ['kN', 'tf', 'kgf', 'N'] as const) {
      const u = makeUnits(f);
      expect(u.F.from(u.F.to(123.456))).toBeCloseTo(123.456, 10);
    }
  });
});
