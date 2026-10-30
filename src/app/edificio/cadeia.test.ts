import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../../core/commands';
import { linhaDeAjuste } from '../../core/commands/vigas';
import { acaoDoClique, estenderCadeia, iniciarCadeia, passagensDoTrecho, reconciliarCadeia } from './cadeia';

describe('lançamento em cadeia', () => {
  it('o clique inicia, estende ou encerra pela distância ao último ponto', () => {
    expect(acaoDoClique([], [1, 1], 0.01)).toBe('iniciar');
    expect(acaoDoClique([[0, 0]], [3, 4], 0.01)).toBe('estender');
    expect(acaoDoClique([[0, 0], [3, 4]], [3, 4], 0.01)).toBe('encerrar');
    expect(acaoDoClique([[0, 0], [3, 4]], [3.006, 4.008], 0.0101)).toBe('encerrar');
    expect(acaoDoClique([[0, 0], [3, 4]], [3.02, 4], 0.01)).toBe('estender');
  });

  it('passagens: mantém as anteriores e acrescenta a do trecho novo', () => {
    expect(passagensDoTrecho([], 1, false, null)).toEqual([null]);
    expect(passagensDoTrecho([], 1, true, [1, 2])).toEqual([[1, 2]]);
    expect(passagensDoTrecho([[1, 2]], 2, false, [9, 9])).toEqual([[1, 2], null]);
    expect(passagensDoTrecho([[1, 2], null], 3, true, [5, 5])).toEqual([[1, 2], null, [5, 5]]);
  });

  it('3 cliques: dois trechos, pontos na ordem dos cliques', () => {
    let c = iniciarCadeia([0, 0], 10);
    c = estenderCadeia(c, [4, 0], [null], 11, 'v1');
    c = estenderCadeia(c, [4, 3], [null, null], 12, 'v1');
    expect(c).toHaveLength(3);
    expect(c[2].pontos).toEqual([[0, 0], [4, 0], [4, 3]]);
    expect(c[2].passagens).toEqual([null, null]);
    expect(c[2].id).toBe('v1');
  });

  it('desfazer remove o último trecho; desfazer tudo encerra a cadeia', () => {
    let c = iniciarCadeia([0, 0], 10);
    c = estenderCadeia(c, [4, 0], [null], 11, 'v1');
    c = estenderCadeia(c, [4, 3], [null, null], 12, 'v1');
    const a = reconciliarCadeia(c, 11)!;
    expect(a).toHaveLength(2);
    expect(a[1].pontos).toEqual([[0, 0], [4, 0]]);
    const b = reconciliarCadeia(c, 10)!;
    expect(b).toHaveLength(1);
    expect(b[0].pontos).toEqual([[0, 0]]);
    expect(reconciliarCadeia(c, 9)).toBeNull();
    expect(reconciliarCadeia(c, 13)).toBeNull(); // comando alheio
    expect(reconciliarCadeia(c, 12)).toBe(c); // nada mudou
  });

  it('só com o 1º ponto a cadeia acompanha o log sem terminar', () => {
    const c = iniciarCadeia([1, 1], 5);
    expect(reconciliarCadeia(c, 7)).toEqual([{ pontos: [[1, 1]], passagens: [], log: 7 }]);
  });

  it('estender a viga com viga.editar dá a mesma polilinha que traçá-la inteira (com e sem deslocamento do clique)', () => {
    const novo = () => { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); return s; };
    const secao = { b: 0.15, h: 0.4 }, g = 'g_3';
    for (const cm of [0, 10, -25]) {
      const cadeia = novo();
      expect(cadeia.executar('viga.tracar', { grupo: g, pontos: [[0, 0], [4, 0]], secao, deslocamentoClique: cm || undefined }).ok).toBe(true);
      const id = cadeia.modelo.vigas.at(-1)!.id;
      const aj = linhaDeAjuste([[0, 0], [4, 0], [4, 3]], undefined, cm || undefined);
      expect(cadeia.executar('viga.editar', { id, pontos: aj.pontos }).ok).toBe(true);
      const inteira = novo();
      expect(inteira.executar('viga.tracar', { grupo: g, pontos: [[0, 0], [4, 0], [4, 3]], secao, deslocamentoClique: cm || undefined }).ok).toBe(true);
      expect(cadeia.modelo.vigas).toHaveLength(1);
      expect(cadeia.modelo.vigas[0].pontos).toEqual(inteira.modelo.vigas[0].pontos);
      expect(cadeia.modelo.vigas[0].nome).toBe(inteira.modelo.vigas[0].nome);
    }
    // sem deslocamento os pontos são os clicados; com 10 cm à esquerda do traçado (y+) o 1º trecho sobe 0,10 m
    const s = novo();
    s.executar('viga.tracar', { grupo: g, pontos: [[0, 0], [4, 0], [4, 3]], secao });
    expect(s.modelo.vigas[0].pontos).toEqual([[0, 0], [4, 0], [4, 3]]);
  });

  it('parede e carga linear: criar com 2 pontos e estender com o comando de edição acrescenta o trecho no mesmo elemento', () => {
    const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    expect(s.executar('parede.criar', { pontos: [[0, 0], [4, 0]] }).ok).toBe(true);
    const w = s.modelo.paredes!.at(-1)!;
    expect(s.executar('parede.editar', { id: w.id, pontos: [[0, 0], [4, 0], [4, 3]] }).ok).toBe(true);
    expect(s.modelo.paredes).toHaveLength(1);
    expect(s.modelo.paredes![0].pontos).toEqual([[0, 0], [4, 0], [4, 3]]);
    expect(s.executar('carga.linha', { grupo: 'g_3', pontos: [[0, 0], [4, 0]], valor: 5, caso: 'G' }).ok).toBe(true);
    const c = s.modelo.cargas.at(-1)!;
    expect(s.executar('carga.editar', { id: c.id, pontos: [[0, 0], [4, 0], [4, 3]] }).ok).toBe(true);
    expect(s.modelo.cargas.filter((x) => x.tipo === 'linha')).toHaveLength(1);
    expect(s.modelo.cargas.find((x) => x.id === c.id)!.pontos).toEqual([[0, 0], [4, 0], [4, 3]]);
    expect(s.modelo.cargas.find((x) => x.id === c.id)!.valor).toBe(5);
    s.desfazer(); // um desfazer tira só o último trecho
    expect(s.modelo.cargas.find((x) => x.id === c.id)!.pontos).toEqual([[0, 0], [4, 0]]);
  });
});
