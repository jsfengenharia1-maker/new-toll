import { describe, expect, it } from 'vitest';
import { cadeiaDeSegmentos } from './cadeia';

const ret = (x0: number, y0: number, x1: number, y1: number) => [x0, y0, x1, y0, x1, y0, x1, y1, x1, y1, x0, y1, x0, y1, x0, y0];

describe('cadeiaDeSegmentos', () => {
  it('retângulo fechado a partir de um lado', () => {
    const c = cadeiaDeSegmentos(ret(0, 0, 4, 3), [2, 0.01], 0.1)!;
    expect(c.fechada).toBe(true);
    expect(c.pontos).toHaveLength(4);
    expect(c.pontos.map((p) => p.join(',')).sort()).toEqual(['0,0', '0,3', '4,0', '4,3']);
  });
  it('polilinha aberta (divisa) com colineares unidos', () => {
    const segs = [0, 0, 2, 0, 2, 0, 5, 0, 5, 0, 5, 4];
    const c = cadeiaDeSegmentos(segs, [3, 0], 0.1)!;
    expect(c.fechada).toBe(false);
    expect(c.pontos).toEqual([[0, 0], [5, 0], [5, 4]]);
  });
  it('para num nó de três segmentos', () => {
    const segs = [0, 0, 2, 0, 2, 0, 4, 0, 2, 0, 2, 3];
    const c = cadeiaDeSegmentos(segs, [0.5, 0], 0.1)!;
    expect(c.fechada).toBe(false);
    expect(c.pontos).toEqual([[0, 0], [2, 0]]);
  });
  it('sem segmento no raio devolve null', () => {
    expect(cadeiaDeSegmentos(ret(0, 0, 1, 1), [5, 5], 0.2)).toBeNull();
  });
});
