import { describe, expect, it } from 'vitest';
import { NOMES_ICONE } from './Icone';

describe('ícones', () => {
  it('traz os 17 ícones da L4 e os 70 da faixa (87 no total), sem nomes repetidos', () => {
    expect(NOMES_ICONE.length).toBe(87);
    expect(new Set(NOMES_ICONE).size).toBe(87);
  });
  it('nomes que a faixa usa existem', () => {
    for (const n of ['abrir', 'salvar', 'pilar', 'viga', 'laje', 'carga', 'fundacao', 'calcular', 'pranchas', 'enquadrar', 'paleta', 'dividir', 'puncao']) expect(NOMES_ICONE).toContain(n);
  });
});
