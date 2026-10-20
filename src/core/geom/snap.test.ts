import { describe, expect, it } from 'vitest';
import { IndiceCaptura, pontoDigitado, restringir } from './snap';

describe('capturas', () => {
  // cruz de dois segmentos e um círculo de raio 1 em (10, 0)
  const ix = new IndiceCaptura([0, -2, 0, 2, -2, 0, 2, 0], [10, 0, 1, 0, 360]);

  it('extremidade vence o meio; interseção no cruzamento', () => {
    expect(ix.consultar(0.1, 1.9, 0.3)[0]).toMatchObject({ tipo: 'extremidade', x: 0, y: 2 });
    const c = ix.consultar(0.05, 0.05, 0.2);
    expect(c[0]).toMatchObject({ tipo: 'intersecao', x: 0, y: 0 });
    expect(c.some((x) => x.tipo === 'meio')).toBe(true);
  });

  it('círculo: quadrante perto do traço, centro sempre que o cursor está sobre o traço', () => {
    const c = ix.consultar(11.05, 0.02, 0.2);
    expect(c[0]).toMatchObject({ tipo: 'quadrante', x: 11, y: 0 });
    expect(c.find((x) => x.tipo === 'centro')).toMatchObject({ x: 10, y: 0 });
    expect(ix.consultar(10, 0, 0.2)).toEqual([]); // no centro, longe do traço: nada
  });

  it('perpendicular a partir do ponto anterior e filtro de modos', () => {
    const c = ix.consultar(1.2, 0.1, 0.3, new Set(['perpendicular']), [1, 5]);
    expect(c).toEqual([{ tipo: 'perpendicular', x: 1, y: 0, d: expect.any(Number) }]);
  });

  it('20 mil segmentos: consulta rápida', () => {
    const segs: number[] = [];
    let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 20000; i++) { const x = rnd() * 60, y = rnd() * 40; segs.push(x, y, x + rnd() * 3, y + rnd() * 3); }
    const big = new IndiceCaptura(segs);
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) big.consultar(rnd() * 60, rnd() * 40, 0.3);
    expect((performance.now() - t0) / 1000).toBeLessThan(2); // ms por consulta (meta da spec: ≤ 2 ms p99)
  });
});

describe('entrada digitada e restrições', () => {
  const ref: [number, number] = [1, 1];
  it('absoluto, relativo, polar e distância na direção do cursor', () => {
    expect(pontoDigitado('3,5;2', ref, [0, 0])).toEqual([3.5, 2]);
    expect(pontoDigitado('@2;-1', ref, [0, 0])).toEqual([3, 0]);
    const p = pontoDigitado('@2<90', ref, [0, 0])!;
    expect(p[0]).toBeCloseTo(1); expect(p[1]).toBeCloseTo(3);
    expect(pontoDigitado('4', ref, [1, 9])).toEqual([1, 5]);
    expect(pontoDigitado('abc', ref, [0, 0])).toBeNull();
    expect(pontoDigitado('@1;1', null, [0, 0])).toBeNull();
  });
  it('ortogonal e polar', () => {
    expect(restringir([0, 0], [5, 0.4], 90)).toEqual([5, 0]);
    const p = restringir([0, 0], [3, 1.5], 15); // ~26,6° → 30°
    expect(Math.atan2(p[1], p[0]) * 180 / Math.PI).toBeCloseTo(30);
  });
});
