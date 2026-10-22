// E1c (interface): helper puro da lista de paredes, contra valores conhecidos.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../../core/commands';
import { linhasParedes } from './paredesLista';

describe('ParedesUI: lista de paredes', () => {
  it('linhasParedes resume a parede lançada (comprimento em m, espessura em cm)', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const r = s.executar('parede.criar', { pontos: [[0, 0], [6, 0], [6, 4]], espessura: 0.2 });
    expect(r.ok).toBe(true);
    const b = s.modelo;
    expect(linhasParedes(b)).toEqual([{ id: b.paredes![0].id, nome: 'M1', trechos: 2, comprimento: 10, e: 20, nAberturas: 0, empuxo: false }]);
  });
});
