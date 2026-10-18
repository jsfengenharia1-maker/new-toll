import { describe, expect, it } from 'vitest';
import { designSupport } from './foundation';
import { normalizeFoundation, sampleFoundation, type FoundationData } from './piles';
import { isFooting } from './footings';
import { isCaisson } from './caissons';

describe('fundação por apoio', () => {
  const f: FoundationData = normalizeFoundation(sampleFoundation());
  it('estacas: bloco dimensionado para a recomendada do primeiro tipo ou para a adotada', () => {
    const d = designSupport(f.loads[1], f);
    expect(d.kind).toBe('estacas');
    expect(d.pile).toBeTruthy();
    expect(d.pileAdopted).toBe(false);
    expect(d.cap!.n).toBe(d.pile!.n);
    const pre = d.piles!.byType.find((t) => t.type === 'premoldada')!.recommended!;
    const a = designSupport({ ...f.loads[1], pile: { type: 'premoldada', D: Math.round(pre.D * 100) } }, f);
    expect(a.pileAdopted).toBe(true);
    expect(a.pile!.type).toBe('premoldada');
  });
  it('sapata e tubulão usam o furo do apoio e a seção do pilar', () => {
    const s = designSupport({ ...f.loads[0], kind: 'sapata', ap: 0.25, bp: 0.5 }, f);
    expect(isFooting(s.footing!)).toBe(true);
    expect(s.ap).toBe(0.25);
    const t = designSupport({ ...f.loads[0], kind: 'tubulao' }, f);
    expect(isCaisson(t.caisson!)).toBe(true);
    expect(t.boring.name).toBe(f.boring.name);
  });
});
