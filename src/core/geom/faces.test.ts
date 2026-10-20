import { describe, expect, it } from 'vitest';
import { areaPoligono, faces, pontoInterno, dentroPoligono, type P } from './faces';

const seg = (a: P, z: P): [P, P] => [a, z];
const areas = (f: P[][]) => f.map(areaPoligono).map((a) => +a.toFixed(6)).sort((p, q) => p - q);

describe('faces de um arranjo de segmentos', () => {
  it('retângulo dividido por uma linha em T e uma em cruz: 4 panos; ponta solta (balanço) ignorada', () => {
    const s = [
      seg([0, 0], [10, 0]), seg([10, 0], [10, 6]), seg([10, 6], [0, 6]), seg([0, 6], [0, 0]),
      seg([4, 0], [4, 6]), // divide em 4 × 6 e 6 × 6
      seg([4, 3], [10, 3]), // T: divide o 6 × 6 em dois 6 × 3
      seg([10, 3], [12, 3]), // balanço
      seg([0, 3], [4, 3.0005]), // quase no T da esquerda (tolerância)
    ];
    const f = faces(s, { tol: 1e-3 });
    expect(areas(f)).toEqual([12, 12, 18, 18]);
    for (const p of f) expect(areaPoligono(p)).toBeGreaterThan(0);
  });

  it('segmentos colineares sobrepostos e vigas que terminam no meio de outra', () => {
    const f = faces([seg([0, 0], [6, 0]), seg([3, 0], [9, 0]), seg([9, 0], [9, 4]), seg([9, 4], [0, 4]), seg([0, 4], [0, 0]), seg([3, 0], [3, 4])]);
    expect(areas(f)).toEqual([12, 24]);
  });

  it('nada fechado: nenhuma face', () => {
    expect(faces([seg([0, 0], [1, 0]), seg([1, 0], [1, 1])])).toEqual([]);
  });

  it('ponto interno de polígono em L', () => {
    const L: P[] = [[0, 0], [4, 0], [4, 1], [1, 1], [1, 4], [0, 4]];
    expect(dentroPoligono(pontoInterno(L), L)).toBe(true);
  });
});
