import { describe, expect, it } from 'vitest';
import { Sessao } from '../commands';
import { ESPEC_PADRAO, gerarObra, validarEspecificacao, type EspecificacaoObra } from './assistente';
import { edificioVazio } from './types';

const espec = (over: Partial<EspecificacaoObra>): EspecificacaoObra => ({ ...ESPEC_PADRAO, ...over });

describe('validarEspecificacao', () => {
  it('aceita a especificação padrão e reprova as violações com a mensagem certa', () => {
    expect(validarEspecificacao(ESPEC_PADRAO)).toEqual([]);
    expect(validarEspecificacao(espec({ nome: ' ' }))).toContain('Informe o nome da obra.');
    expect(validarEspecificacao(espec({ pavimentos: [] }))).toContain('Informe ao menos um pavimento.');
    const r0 = validarEspecificacao(espec({ pavimentos: [{ nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 0 }] }));
    expect(r0).toContain('Pavimento 1: repetições de 1 a 60.');
  });
  it('não lança com entrada incompleta', () => {
    expect(() => validarEspecificacao({} as EspecificacaoObra)).not.toThrow();
    expect(validarEspecificacao({} as EspecificacaoObra)).toContain('Informe ao menos um pavimento.');
  });
});

describe('gerarObra', () => {
  it('gera o mesmo modelo que a sequência manual de comandos', () => {
    const { comandos, erros } = gerarObra(ESPEC_PADRAO);
    expect(erros).toEqual([]);
    const A = new Sessao(edificioVazio());
    for (const c of comandos) expect(A.executar(c.nome, c.params, 'sistema').ok, c.nome).toBe(true);
    const B = new Sessao(edificioVazio());
    const manual: [string, Record<string, unknown>][] = [
      ['obra.definir', { nome: 'Nova obra', profundidadeFundacao: 1.5, origem: 'assistente' }],
      ['norma.definir', { fck: 30, aco: 'CA-50', caa: 'II' }],
      ['grupo.criar', { nome: 'Térreo', uso: 'comum', gRev: 1, q: 3 }],
      ['pavimento.criar', { nome: 'Térreo', cota: 0, grupo: 'g_1' }],
      ['grupo.criar', { nome: 'Tipo', uso: 'residencial', gRev: 1, q: 1.5 }],
      ['pavimento.criar', { nome: 'Tipo 1', cota: 3, grupo: 'g_3' }],
      ['pavimento.repetir', { id: 'pav_4', vezes: 2, peDireito: 3 }],
      ['grupo.criar', { nome: 'Cobertura', uso: 'cobertura', gRev: 1, q: 1 }],
      ['pavimento.criar', { nome: 'Cobertura', cota: 12, grupo: 'g_7' }],
    ];
    for (const [n, p] of manual) expect(B.executar(n, p, 'sistema').ok, n).toBe(true);
    expect(A.modelo).toEqual(B.modelo);
    expect(A.modelo.pavimentos.map((p) => [p.nome, p.cota])).toEqual([['Térreo', 0], ['Tipo 1', 3], ['Tipo 2', 6], ['Tipo 3', 9], ['Cobertura', 12]]);
    expect(A.modelo.seq).toBe(8);
  });
  it('ids a partir de seqInicial', () => {
    const { comandos } = gerarObra(ESPEC_PADRAO, 5);
    expect(comandos.find((c) => c.nome === 'pavimento.criar')!.params.grupo).toBe('g_6');
    const s = new Sessao({ ...edificioVazio(), seq: 5 });
    for (const c of comandos) expect(s.executar(c.nome, c.params, 'sistema').ok, c.nome).toBe(true);
    expect(s.modelo.seq).toBe(13);
  });
  it('mantém o nome sem número quando não há repetição', () => {
    const { comandos } = gerarObra(espec({ pavimentos: [{ nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 }, { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 3 }] }));
    const nomes = comandos.filter((c) => c.nome === 'pavimento.criar').map((c) => c.params.nome);
    expect(nomes).toEqual(['Térreo', 'Tipo 1']);
  });
  it('aplica a cota base', () => {
    const { comandos } = gerarObra(espec({ cotaBase: 100 }));
    const s = new Sessao(edificioVazio());
    for (const c of comandos) expect(s.executar(c.nome, c.params, 'sistema').ok, c.nome).toBe(true);
    expect(s.modelo.pavimentos.slice(0, 2).map((p) => p.cota)).toEqual([100, 103]);
  });
  it('sobrecarga por categoria vence a da categoria, mas não a da linha', () => {
    const { comandos } = gerarObra(espec({ qCategoria: { comum: 4 }, pavimentos: [
      { nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 },
      { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 1 },
      { nome: 'Outro', peDireito: 3, categoria: 'residencial', repeticoes: 1, q: 2 },
    ] }));
    const grupos = comandos.filter((c) => c.nome === 'grupo.criar').map((c) => c.params.q);
    expect(grupos).toEqual([4, 1.5, 2]);
  });
  it('perfil nbr e malha de eixos', () => {
    const { comandos } = gerarObra(espec({ perfil: 'nbr', eixos: { dx: [5, 5], dy: [4] } }));
    expect(comandos.some((c) => c.nome === 'opcoes.definir' && c.params.perfil === 'nbr')).toBe(true);
    const malha = comandos.find((c) => c.nome === 'eixo.malha');
    expect(malha?.params).toEqual({ origem: [0, 0], dx: [5, 5], dy: [4] });
    const s = new Sessao(edificioVazio());
    for (const c of comandos) expect(s.executar(c.nome, c.params, 'sistema').ok, c.nome).toBe(true);
    expect(s.modelo.perfilOpcoes).toBe('nbr');
    expect(s.modelo.eixos.length).toBe(5);
  });
});
