// E5e: igualação pela área de aço, flecha de montagem e estribo em ômega (valores à mão e fórmulas fechadas).
import { describe, expect, it } from 'vitest';
import { gruposEmCadeia, igualarPorArea, type ConversaoArea } from './vigotasArea';
import { gruposIgualacao } from './vigotas';
import { escorasIntermediarias, flechaMontagem, momentosApoiosIguais, rigidezVigotaIsolada, verificarMontagem } from './vigotasMontagem';
import { comprimentoEstribo } from './vigotasRelatorio';
import { concrete } from '../concrete';

describe('igualação pela área (C7.100)', () => {
  it('cadeia: cada vigota é comparada com a vizinha (à mão)', () => {
    // 2,0 → 2,2 (0,2 < 15 % de 2,2 = 0,33), 2,2 → 2,5 (0,3 < 0,375), 2,5 → 3,5 (1,0 > 0,525)
    expect(gruposEmCadeia([2, 2.2, 2.5, 3.5], 15, 1)).toEqual([[0, 1, 2], [3]]);
    // pelo extremo do grupo (R6/E3b), 2,5 − 2,0 = 0,5 > 0,375 já separa
    expect(gruposIgualacao([2, 2.2, 2.5, 3.5], 15, 1)).toEqual([[0, 1], [2], [3]]);
  });
  it('critério 0 separa tudo; 100 % junta tudo; zeros entram juntos', () => {
    expect(gruposEmCadeia([1, 1, 1], 100, 0)).toEqual([[0], [1], [2]]);
    expect(gruposEmCadeia([1, 5, 9], 100, 1)).toEqual([[0, 1, 2]]);
    expect(gruposEmCadeia([0, 0, 0.0], 10, 1)).toEqual([[0, 1, 2]]);
    expect(gruposEmCadeia([], 10, 1)).toEqual([]);
  });
  it('média das áreas volta em momento; máximo não converte', () => {
    const lin: ConversaoArea = { pos: { areaDe: (M) => M / 2, momentoDe: (A) => 2 * A }, neg: { areaDe: (M) => M / 4, momentoDe: (A) => 4 * A } };
    const ig = igualarPorArea(lin);
    expect(ig([4, 8, 12], 2)).toBeCloseTo(8, 12);
    expect(ig([-4, -8], 2, true)).toBeCloseTo(-6, 12);
    expect(ig([4, 8, 12], 1)).toBe(12);
    expect(ig([-4, -8], 1, true)).toBe(-8);
    expect(ig([], 2)).toBe(0);
  });
});

describe('flecha de montagem (C7.102)', () => {
  const EI = 500, q = 3, L = 3;
  it('biapoiada: 5qL⁴/384EI', () => {
    const f = flechaMontagem(L, 0, q, EI);
    expect(f.flecha).toBeCloseTo((5 * q * L ** 4) / (384 * EI), 6);
    expect(f.Mvao).toBeCloseTo((q * L * L) / 8, 6);
    expect(f.reacaoEscora).toBe(0);
  });
  it('uma escora no meio (2 vãos): momento qℓ²/8 e flecha do engastado-apoiado', () => {
    const f = flechaMontagem(L, 1, q, EI), l = L / 2;
    expect(f.momentos[0]).toBeCloseTo(-(q * l * l) / 8, 10);
    const x = (l * (1 + Math.sqrt(33))) / 16, esperado = (q * x * (l ** 3 - 3 * l * x * x + 2 * x ** 3)) / (48 * EI);
    expect(f.flecha).toBeCloseTo(esperado, 7);
    expect(f.reacaoEscora).toBeCloseTo(1.25 * q * l, 8);
    expect(f.flecha).toBeLessThan(flechaMontagem(L, 0, q, EI).flecha / 20);
  });
  it('duas escoras (3 vãos): momentos qℓ²/10 e reação interna 1,1·qℓ', () => {
    const m = momentosApoiosIguais(2, 1, 10);
    expect(m[0]).toBeCloseTo(-1, 12);
    expect(m[1]).toBeCloseTo(-1, 12);
    expect(flechaMontagem(3, 2, 10, 1000).reacaoEscora).toBeCloseTo(1.1 * 10, 8);
  });
  it('número de escoras pela distância', () => {
    expect(escorasIntermediarias(3, 1.5)).toBe(1);
    expect(escorasIntermediarias(3.1, 1.5)).toBe(2);
    expect(escorasIntermediarias(1.5, 1.5)).toBe(0);
    expect(escorasIntermediarias(4, 0)).toBe(0);
  });
  it('verificação: carga = (peso + construção) × intereixo e limite = vão entre escoras / divisor', () => {
    const v = verificarMontagem({ L: 4, dist: 0, pp: 2, construcao: 1, intereixo: 0.5, EI: 100, divisor: 500 });
    expect(v.q).toBeCloseTo(1.5, 12);
    expect(v.flecha).toBeCloseTo((5 * 1.5 * 4 ** 4) / (384 * 100), 6);
    expect(v.limite).toBeCloseTo(4 / 500, 12);
    expect(v.ok).toBe(false);
    expect(verificarMontagem({ L: 4, dist: 1, pp: 2, construcao: 1, intereixo: 0.5, EI: 100, divisor: 500 }).ok).toBe(true);
  });
  it('rigidez da vigota isolada: base de concreto e, com treliça, os banzos de aço', () => {
    const c = concrete(25);
    const so = rigidezVigotaIsolada(c, { b: 0.12, hs: 0.03 });
    expect(so).toBeCloseTo((c.Ecs * 1000 * 0.12 * 0.03 ** 3) / 12, 6);
    const com = rigidezVigotaIsolada(c, { b: 0.12, hs: 0.03 }, { h: 0.12, sup: 8, inf: 4.2 });
    // aço: Ai = 2·π·4,2²/4, As = π·8²/4 (m²), distância entre eixos = 0,12 − 0,0061 = 0,1139 m
    const Ai = 2 * Math.PI * (0.0042 ** 2) / 4, As = Math.PI * (0.008 ** 2) / 4, d = 0.12 - 0.0061, Is = (Ai * As * d * d) / (Ai + As);
    expect(com - so).toBeCloseTo(2.1e8 * Is, 3);
  });
});

describe('estribo em ômega (C7.194)', () => {
  it('fechado: perímetro + ganchos; ômega: base + 2 pernas + 2 abas', () => {
    const g = { bw: 0.12, h: 0.3, cob: 0.025, phi: 5 };
    expect(comprimentoEstribo({ ...g, omega: false, aba: 0.05 })).toBeCloseTo(2 * 0.07 + 2 * 0.25 + 2 * 0.05, 9);
    // ômega: base 0,07 + pernas 2 × (0,30 − 2 × 0,025) + abas 2 × máx(0,05; 10φ = 0,05)
    expect(comprimentoEstribo({ ...g, omega: true, aba: 0.05 })).toBeCloseTo(0.07 + 2 * 0.25 + 2 * 0.05, 9);
    // φ10: aba = máx(5 cm; 10φ = 10 cm)
    expect(comprimentoEstribo({ ...g, phi: 10, omega: true, aba: 0.05 })).toBeCloseTo(0.07 + 2 * 0.25 + 2 * 0.1, 9);
  });
});
