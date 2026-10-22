import { describe, expect, it } from 'vitest';
import { categoriasDeUso, categoriaPorId } from './categoriasUso';
import { USOS, qDoUso } from './types';

describe('categoriasDeUso', () => {
  it('começa pelas 7 categorias do modelo, com as mesmas sobrecargas', () => {
    expect(categoriasDeUso().slice(0, 7).map((c) => [c.id, c.q])).toEqual(USOS.map((u) => [u.v, qDoUso(u.v)]));
  });
  it('tem 16 categorias, ids únicos e q ≥ 0', () => {
    const cats = categoriasDeUso();
    expect(cats).toHaveLength(16);
    expect(new Set(cats.map((c) => c.id)).size).toBe(16);
    expect(cats.every((c) => c.q >= 0)).toBe(true);
  });
  it('toda categoria adicional aponta para uma categoria do modelo', () => {
    for (const c of categoriasDeUso()) expect(USOS.some((u) => u.v === c.uso)).toBe(true);
  });
  it('devolve cópias independentes', () => {
    const a = categoriasDeUso();
    a[0].q = 99;
    expect(categoriasDeUso()[0].q).toBe(1.5);
  });
  it('categoriaPorId', () => {
    expect(categoriaPorId('comercio')?.q).toBe(4);
    expect(categoriaPorId('nao-existe')).toBeUndefined();
  });
});
