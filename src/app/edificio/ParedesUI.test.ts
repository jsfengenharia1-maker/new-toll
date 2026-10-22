// E1c (interface): helper puro da lista de paredes, contra valores conhecidos.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../../core/commands';
import { aberturasNaPlanta, linhasParedes } from './paredesLista';

describe('ParedesUI: lista de paredes', () => {
  it('linhasParedes resume a parede lançada (comprimento em m, espessura em cm)', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const r = s.executar('parede.criar', { pontos: [[0, 0], [6, 0], [6, 4]], espessura: 0.2 });
    expect(r.ok).toBe(true);
    const b = s.modelo;
    expect(linhasParedes(b)).toEqual([{ id: b.paredes![0].id, nome: 'M1', trechos: 2, comprimento: 10, e: 20, nAberturas: 0, empuxo: false }]);
  });

  it('aberturasNaPlanta devolve o segmento no eixo só para o pavimento de base da abertura', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const b0 = s.modelo;
    const terreo = b0.pavimentos.find((p) => p.nome === 'Térreo')!.id, tipo1 = b0.pavimentos.find((p) => p.nome === 'Tipo 1')!.id;
    expect(s.executar('parede.criar', { pontos: [[0, 0], [6, 0], [6, 4]], espessura: 0.2 }).ok).toBe(true);
    const w = s.modelo.paredes![0];
    expect(s.executar('parede.abertura', { parede: w.id, s: 7, largura: 1.5, peitoril: 1, altura: 1.2, pavimento: terreo }).ok).toBe(true);
    const segs = aberturasNaPlanta(s.modelo, s.modelo.paredes![0], terreo);
    expect(segs.length).toBe(1);
    expect(segs[0][0][0]).toBeCloseTo(6, 6); expect(segs[0][0][1]).toBeCloseTo(1, 6);
    expect(segs[0][1][0]).toBeCloseTo(6, 6); expect(segs[0][1][1]).toBeCloseTo(2.5, 6);
    expect(aberturasNaPlanta(s.modelo, s.modelo.paredes![0], tipo1)).toEqual([]);
  });
});
