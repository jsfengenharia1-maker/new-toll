// E3f: funções puras da interface dos planos (rótulo do Navegador, campos e parâmetros dos comandos) contra o núcleo.
import { describe, expect, it } from 'vitest';
import { coeficientesPlano, inclinacaoDoPlano } from '../../core/building/planos';
import type { Plano } from '../../core/building/types';
import { comandosEdificioPadrao, Sessao } from '../../core/commands';
import { DADOS_PLANO_NOVO, dadosDoPlano, paramsDoPlano, rotuloPlano, trocaTipoDef } from './planosUtil';

const novaSessao = () => { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); return s; };

describe('E3f: interface dos planos', () => {
  it('rótulo da árvore: nome e inclinação com 1 casa e vírgula', () => {
    const pl: Plano = { id: 'p1', nome: 'Plano 1', grupo: 'g', def: { tipo: 'maximaDeclividade', pontos: [[0, 0], [0, 4.5]], desnivel: 0, inclinacao: 30 } };
    expect(rotuloPlano(pl)).toBe('Plano 1 — 30,0 %');
    expect(rotuloPlano({ ...pl, def: { tipo: 'tresPontos', pontos: [[0, 0, 0], [5, 0, 0], [0, 4, 0.8]] } })).toBe('Plano 1 — 20,0 %');
  });
  it('unidade graus: 45 graus criam um plano de 100 %', () => {
    const s = novaSessao(), g = s.modelo.grupos[0].id;
    const r = s.executar('plano.criar', { grupo: g, ...paramsDoPlano({ ...DADOS_PLANO_NOVO, unidade: 'graus', inclinacao: 45 }) });
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    const pl = s.modelo.planos![0];
    expect(inclinacaoDoPlano(coeficientesPlano(pl.def)!).percentual).toBeCloseTo(100, 4);
  });
  it('trocar o tipo de definição aproveita os pontos e gera parâmetros aceitos pelo comando', () => {
    const s = novaSessao(), g = s.modelo.grupos[0].id;
    const tres = trocaTipoDef({ ...DADOS_PLANO_NOVO, desnivel: 0.3 }, 'tresPontos');
    expect(tres.pontos).toEqual([[0, 0, 0.3], [0, 4, 0.3], [-4, 0, 0.3]]);
    expect(s.executar('plano.criar', { grupo: g, ...paramsDoPlano(tres) }).ok).toBe(true);
    const d = dadosDoPlano(s.modelo.planos![0]);
    expect(d.tipo).toBe('tresPontos');
    const volta = trocaTipoDef(d, 'retaHorizontal');
    expect(volta.pontos).toEqual([[0, 0], [0, 4]]);
    expect(volta.desnivel).toBeCloseTo(0.3, 12);
  });
});
