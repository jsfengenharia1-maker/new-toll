import { describe, expect, it } from 'vitest';
import { edificioExemplo } from '../sheets/exemplo';
import { edificioVazio } from './types';
import { errosDoCalculo, faixaDeNomes, pendenciasAntesDeCalcular, resultadoDoCalculo, tipoDoElemento } from './pendencias';
import type { ItemRevisao } from './revisao';
import type { Diagnostico } from './verify';
import { verificar } from './verify';

const comPanos = (n: number) => {
  const { modelo } = edificioExemplo();
  const m = structuredClone(modelo);
  m.lajes.slice(0, n).forEach((l) => { l.definir = true; });
  return m;
};

describe('faixaDeNomes', () => {
  it('junta números seguidos em faixa e mantém o resto', () => {
    expect(faixaDeNomes(['L1', 'L2', 'L3', 'L4', 'L5', 'L6'])).toBe('L1–L6');
    expect(faixaDeNomes(['L1', 'L2', 'L4'])).toBe('L1, L2, L4');
    expect(faixaDeNomes(['L6', 'L1', 'L2', 'L3', 'L9'])).toBe('L1–L3, L6, L9');
    expect(faixaDeNomes(['L1'])).toBe('L1');
    expect(faixaDeNomes(['Sala', 'L2'])).toBe('Sala, L2');
    expect(faixaDeNomes([])).toBe('');
  });
});

describe('pendenciasAntesDeCalcular', () => {
  it('obra do exemplo sem panos a definir: nada impeditivo', () => {
    const { modelo } = edificioExemplo();
    const r = pendenciasAntesDeCalcular(modelo, verificar(modelo));
    expect(r.podeCalcular).toBe(true);
    expect(r.impeditivas).toEqual([]);
  });

  it('3 panos a definir viram UMA pendência impeditiva de lajes, com o seletor de tipo e o ir ao elemento', () => {
    const m = comPanos(3);
    const nomes = m.lajes.slice(0, 3).map((l) => l.nome);
    const r = pendenciasAntesDeCalcular(m, verificar(m));
    expect(r.podeCalcular).toBe(false);
    expect(r.impeditivas).toHaveLength(1);
    const p = r.impeditivas[0];
    expect(p).toMatchObject({ classe: 'impeditivo', grupo: 'lajes', codigo: 'DEFINIR_PANO' });
    expect(p.ids).toEqual(m.lajes.slice(0, 3).map((l) => l.id));
    expect(p.titulo).toContain('3 lajes sem tipo definido');
    expect(p.titulo).toContain(faixaDeNomes(nomes));
    expect(p.titulo).not.toContain('DEFINIR_PANO');
    expect(p.acoes.map((a) => a.tipo)).toEqual(['tipoLajes', 'ir']);
    expect(p.acoes[0].rotulo).toBe(`Definir tipo das lajes ${faixaDeNomes(nomes)}`);
    // o erro DEFINIR_PANO não se repete na lista de avisos
    expect(r.avisos.some((x) => x.codigo === 'DEFINIR_PANO')).toBe(false);
  });

  it('um só pano: texto no singular', () => {
    const m = comPanos(1);
    const p = pendenciasAntesDeCalcular(m, verificar(m)).impeditivas[0];
    expect(p.titulo.startsWith('1 laje sem tipo definido (')).toBe(true);
    expect(p.acoes[1].rotulo).toBe('Ir ao elemento');
  });

  it('corrigir (tirar o a definir) zera as impeditivas', () => {
    const m = comPanos(2);
    m.lajes.forEach((l) => { delete l.definir; });
    expect(pendenciasAntesDeCalcular(m, verificar(m)).podeCalcular).toBe(true);
  });

  it('obra sem pavimentos e obra sem pilares são impeditivas, com ação para a etapa', () => {
    const v = edificioVazio();
    const r = pendenciasAntesDeCalcular(v, verificar(v));
    expect(r.impeditivas.map((x) => x.codigo)).toEqual(['OBRA_SEM_PAVIMENTO']);
    expect(r.impeditivas[0].acoes).toEqual([{ tipo: 'etapa', rotulo: 'Ir à etapa Obra', etapa: 'obra' }]);
    expect(r.avisos.some((x) => x.codigo === 'OBRA_SEM_PAVIMENTO')).toBe(false);
    // obra só de arranques (sem pavimentos) calcula só a fundação: nada impeditivo
    const arr = edificioVazio();
    arr.pilares.push({ ...edificioExemplo().modelo.pilares[0], nasce: 'fundacao', morre: 'fundacao' });
    expect(pendenciasAntesDeCalcular(arr, verificar(arr)).impeditivas).toEqual([]);
    const { modelo } = edificioExemplo();
    const s = structuredClone(modelo);
    s.pilares = [];
    const rs = pendenciasAntesDeCalcular(s, []);
    expect(rs.impeditivas.map((x) => x.codigo)).toEqual(['OBRA_SEM_PILAR']);
    expect(rs.impeditivas[0].acoes[0]).toMatchObject({ tipo: 'etapa', etapa: 'pilares' });
  });

  it('diagnósticos que não impedem viram avisos agrupados por tipo, com ir ao elemento e correção por comando', () => {
    const { modelo } = edificioExemplo();
    const lj = modelo.lajes[0], vg = modelo.vigas[0];
    const diags: Diagnostico[] = [
      { codigo: 'INFO_X', severidade: 'info', elementos: [], mensagem: 'só informação' },
      { codigo: 'VIGA_X', severidade: 'aviso', elementos: [vg.id], mensagem: 'viga estranha' },
      { codigo: 'PANO_SEM_LAJE', severidade: 'aviso', elementos: [], mensagem: 'região sem laje', sugestao: { comando: 'laje.criar', params: { grupo: 'g' }, texto: 'Criar laje' } },
      { codigo: 'LAJE_X', severidade: 'erro', elementos: [lj.id], mensagem: 'laje com erro' },
    ];
    const r = pendenciasAntesDeCalcular(modelo, diags);
    expect(r.podeCalcular).toBe(true);
    expect(r.avisos.map((x) => [x.grupo, x.gravidade, x.codigo])).toEqual([
      ['vigas', 'aviso', 'VIGA_X'], ['lajes', 'erro', 'LAJE_X'], ['outros', 'aviso', 'PANO_SEM_LAJE'],
    ]);
    expect(r.avisos[0].acoes).toEqual([{ tipo: 'ir', rotulo: 'Ir ao elemento', elemento: 'viga', ids: [vg.id] }]);
    expect(r.avisos[2].acoes).toEqual([{ tipo: 'comando', rotulo: 'Criar laje', comando: 'laje.criar', params: { grupo: 'g' } }]);
  });

  it('tipoDoElemento acha lajes, vigas e pilares', () => {
    const { modelo } = edificioExemplo();
    expect(tipoDoElemento(modelo, modelo.lajes[0].id)).toBe('laje');
    expect(tipoDoElemento(modelo, modelo.vigas[0].id)).toBe('viga');
    expect(tipoDoElemento(modelo, modelo.pilares[0].id)).toBe('pilar');
    expect(tipoDoElemento(modelo, 'inexistente')).toBeNull();
  });
});

const item = (p: Partial<ItemRevisao>): ItemRevisao => ({ tipo: 'pilar', id: 'p1', nome: 'P1', nivel: 'erro', codigo: 'ARMADURA', mensagem: 'Não atende com até 4 camadas.', ...p });

describe('errosDoCalculo', () => {
  it('agrupa só os erros por tipo (ordem fixa) e pavimento, e marca quem tem janela de resultados', () => {
    const r = errosDoCalculo([
      item({ tipo: 'laje', id: 'l1', nome: 'L1', pavimento: 'Tipo 1', codigo: 'FLECHA', mensagem: 'Flecha total acima.' }),
      item({ id: 'p1', nome: 'P1', pavimento: 'Térreo', sugestao: 'Aumente a seção.' }),
      item({ id: 'p2', nome: 'P2', pavimento: 'Térreo' }),
      item({ id: 'p3', nome: 'P3', pavimento: 'Tipo 1' }),
      item({ tipo: 'pilar', id: 'p9', nome: 'P9', nivel: 'aviso', codigo: 'AVISO' }),
      item({ tipo: 'fundacao', id: 'f1', nome: 'F1', codigo: 'FUND_X', mensagem: 'Sapata não passa.' }),
      item({ tipo: 'laje', id: 'l2', nome: 'L2', pavimento: 'Tipo 1', codigo: 'PUNCAO_BIELA', mensagem: 'Punção em P3.' }),
      item({ tipo: 'obra', id: undefined, nome: 'Obra', codigo: 'ANALISE', mensagem: 'sem convergência' }),
    ]);
    expect(r.total).toBe(7);
    expect(r.grupos.map((g) => [g.grupo, g.total])).toEqual([['obra', 1], ['pilar', 3], ['laje', 1], ['puncao', 1], ['fundacao', 1]]);
    const pil = r.grupos[1];
    expect(pil.pavimentos.map((p) => [p.pavimento, p.itens.map((i) => i.nome)])).toEqual([['Térreo', ['P1', 'P2']], ['Tipo 1', ['P3']]]);
    expect(pil.pavimentos[0].itens[0]).toMatchObject({ sugestao: 'Aumente a seção.', temJanela: true });
    expect(r.grupos[0].pavimentos[0].itens[0]).toMatchObject({ temJanela: false, mensagem: 'A análise não fechou: sem convergência' });
  });

  it('sem erros: lista vazia e resultado ok; com erro ou reprovado: erros', () => {
    expect(errosDoCalculo([item({ nivel: 'aviso' })])).toEqual({ total: 0, grupos: [] });
    expect(resultadoDoCalculo([item({ nivel: 'aviso' })], 0)).toBe('ok');
    expect(resultadoDoCalculo([], 0)).toBe('ok');
    expect(resultadoDoCalculo([item({})], 0)).toBe('erros');
    expect(resultadoDoCalculo([], 2)).toBe('erros');
  });
});
