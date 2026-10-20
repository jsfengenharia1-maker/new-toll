import { describe, expect, it } from 'vitest';
import { aplicarComando, comandosEdificioPadrao, listarComandos, replay, Sessao, validarSchema, type JsonSchema } from './index';
import { edificioVazio, peDireito } from '../building/types';
import { verificar } from '../building/verify';
import { lerEdificio } from '../building/file';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) expect(s.executar(c.nome, c.params, 'sistema').ok).toBe(true);
  return s;
}

/** Parâmetros válidos de exemplo para cada comando, sobre o edifício padrão. */
const EXEMPLOS: Record<string, Record<string, unknown>> = {
  'obra.definir': { nome: 'Outro', profundidadeFundacao: 2 },
  'norma.definir': { fck: 35, caa: 'III' },
  'grupo.criar': { nome: 'Garagem', uso: 'garagem' },
  'grupo.editar': { id: 'g_3', uso: 'escritorio' },
  'grupo.remover': { id: 'g_x' },
  'grupo.desvincular': { pavimento: 'pav_5' },
  'pavimento.criar': { nome: 'Ático', cota: 15 },
  'pavimento.editar': { id: 'pav_8', cota: 12.5 },
  'pavimento.remover': { id: 'pav_6' },
  'pavimento.repetir': { id: 'pav_6', vezes: 3 },
  'eixo.criar': { nome: 'A', p1: [0, 0], p2: [10, 0] },
  'eixo.editar': { id: 'e_x', nome: 'B' },
  'eixo.remover': { ids: ['e_x'] },
  'eixo.malha': { dx: [4, 5], dy: [3] },
};

describe('registro de comandos', () => {
  it('todo comando registrado tem exemplo, descrição e schema de objeto', () => {
    for (const c of listarComandos()) {
      expect(EXEMPLOS[c.nome], c.nome).toBeDefined();
      expect(c.descricao.length).toBeGreaterThan(10);
      expect(c.schema.type).toBe('object');
    }
  });

  it('aplicar + inverso devolve o modelo original (todos os comandos aplicáveis)', () => {
    const base = padrao().modelo;
    const comEixo = aplicarComando(base, 'eixo.malha', { dx: [4], dy: [3] }).modelo;
    const comGrupoVazio = aplicarComando(comEixo, 'grupo.criar', { nome: 'Vazio' }).modelo;
    for (const c of listarComandos()) {
      const p = { ...EXEMPLOS[c.nome] };
      if (c.nome === 'grupo.remover') p.id = comGrupoVazio.grupos.find((g) => g.nome === 'Vazio')!.id;
      if (c.nome.startsWith('eixo.') && c.nome !== 'eixo.criar' && c.nome !== 'eixo.malha') { if ('ids' in p) p.ids = [comEixo.eixos[0].id]; else p.id = comEixo.eixos[0].id; }
      const s = new Sessao(comGrupoVazio);
      const r = s.executar(c.nome, p);
      expect(r.ok, `${c.nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true);
      expect(r.diff!.resumo.length, c.nome).toBeGreaterThan(0);
      s.desfazer();
      expect(s.modelo).toEqual(comGrupoVazio);
      s.refazer();
      expect(s.modelo).not.toEqual(comGrupoVazio);
    }
  });

  it('parâmetros inválidos e desconhecidos são recusados sem alterar o modelo', () => {
    const s = padrao();
    const antes = s.modelo;
    for (const [nome, p] of [
      ['pavimento.criar', { nome: 'X' }],
      ['pavimento.criar', { nome: 'X', cota: 'alta' }],
      ['pavimento.criar', { nome: 'X', cota: 3 }], // cota ocupada
      ['pavimento.editar', { id: 'nao', cota: 1 }],
      ['norma.definir', { fck: 10 }],
      ['obra.definir', { cor: 'azul' }],
      ['grupo.remover', { id: 'g_3' }], // em uso
      ['comando.inexistente', {}],
    ] as const) {
      const r = s.executar(nome, p);
      expect(r.ok, `${nome} ${JSON.stringify(p)}`).toBe(false);
      expect(r.erros[0].severidade).toBe('erro');
    }
    expect(s.modelo).toBe(antes);
    expect(s.podeDesfazer).toBe(true);
  });

  it('replay do log reproduz o modelo, inclusive depois de desfazer', () => {
    const s = padrao();
    s.executar('eixo.malha', { dx: [4, 4], dy: [5] });
    s.executar('pavimento.repetir', { id: 'pav_6', vezes: 2 });
    s.desfazer();
    s.executar('norma.definir', { caa: 'III' });
    expect(replay(s.log)).toEqual(s.modelo);
    // o arquivo guarda modelo + log e é relido igual
    const f = lerEdificio(JSON.parse(JSON.stringify({ building: s.modelo, buildingLog: s.log })))!;
    expect(replay(f.buildingLog)).toEqual(f.building);
  });

  it('prévia não altera o modelo; o token vale só na mesma revisão', () => {
    const s = padrao();
    const antes = s.modelo;
    const pv = s.previa('pavimento.criar', { nome: 'Ático', cota: 15 });
    expect(pv.ok).toBe(true);
    expect(pv.diff!.resumo).toEqual(['+ pavimento Ático', '+ grupo Ático']);
    expect(s.modelo).toBe(antes);
    const pv2 = s.previa('obra.definir', { nome: 'Y' });
    expect(s.aplicar(pv.token!).ok).toBe(true);
    expect(s.modelo.pavimentos.some((p) => p.nome === 'Ático')).toBe(true);
    const r = s.aplicar(pv2.token!);
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('PREVIA_INVALIDA'); // prévias anteriores são descartadas ao alterar
    expect(s.log.at(-1)!.autor).toBe('ia');
  });
});

describe('obra e pavimentos', () => {
  it('edifício padrão: 5 pavimentos, tipo vinculado, pés-direitos', () => {
    const b = padrao().modelo;
    expect(b.pavimentos.map((p) => [p.nome, p.cota])).toEqual([['Térreo', 0], ['Tipo 1', 3], ['Tipo 2', 6], ['Tipo 3', 9], ['Cobertura', 12]]);
    const tipo = b.pavimentos.filter((p) => p.nome.startsWith('Tipo'));
    expect(new Set(tipo.map((p) => p.grupo)).size).toBe(1);
    expect(b.grupos).toHaveLength(3);
    expect(peDireito(b, b.pavimentos[0].id)).toBe(1.5);
    expect(peDireito(b, b.pavimentos[4].id)).toBe(3);
    expect(verificar(b)).toEqual([]);
  });

  it('repetir insere acima e sobe os pavimentos de cima', () => {
    const s = padrao();
    s.executar('pavimento.repetir', { id: 'pav_6', vezes: 3 }); // Tipo 3 → Tipo 4, 5, 6
    const b = s.modelo;
    expect(b.pavimentos.map((p) => p.nome)).toEqual(['Térreo', 'Tipo 1', 'Tipo 2', 'Tipo 3', 'Tipo 4', 'Tipo 5', 'Tipo 6', 'Cobertura']);
    expect(b.pavimentos.at(-1)!.cota).toBe(21);
    expect(verificar(b)).toEqual([]);
  });

  it('pé-direito diferente no mesmo grupo é erro, com correção sugerida que resolve', () => {
    const s = padrao();
    s.executar('pavimento.editar', { id: 'pav_6', cota: 9.5 }); // Tipo 3 com 3,5 m
    const d = verificar(s.modelo).filter((x) => x.codigo === 'GRUPO_PE_DIREITO');
    expect(d).toHaveLength(1);
    expect(d[0].elementos[0]).toBe('pav_6');
    const sg = d[0].sugestao!;
    expect(s.executar(sg.comando, sg.params).ok).toBe(true);
    expect(verificar(s.modelo).filter((x) => x.severidade === 'erro')).toEqual([]);
  });

  it('remover o último pavimento do grupo remove o grupo; desfazer restaura', () => {
    const s = padrao();
    const antes = s.modelo;
    s.executar('pavimento.remover', { id: 'pav_8' });
    expect(s.modelo.grupos.some((g) => g.nome === 'Cobertura')).toBe(false);
    s.desfazer();
    expect(s.modelo).toEqual(antes);
  });

  it('CAA define os cobrimentos da Tabela 7.2; mudar o uso aplica a carga padrão', () => {
    const s = padrao();
    s.executar('norma.definir', { caa: 'III' });
    expect(s.modelo.norma.cobrimento).toEqual({ laje: 3.5, viga: 4.0, pilar: 4.0 });
    s.executar('grupo.editar', { id: 'g_3', uso: 'escritorio' });
    expect(s.modelo.grupos.find((g) => g.id === 'g_3')!.q).toBe(2.5);
  });

  it('malha de eixos: números nos verticais, letras nos horizontais, com giro', () => {
    const s = new Sessao(edificioVazio());
    s.executar('eixo.malha', { dx: [4, 5], dy: [3], angulo: 90, balanco: 0 });
    const e = s.modelo.eixos;
    expect(e.map((x) => x.nome)).toEqual(['1', '2', '3', 'A', 'B']);
    // eixo 3 (u = 9, v de 0 a 3) girado 90°: (x, y) = (−v, u)
    expect(e[2].p1).toEqual([0, 9]);
    expect(e[2].p2).toEqual([-3, 9]);
  });
});

describe('schema', () => {
  const s: JsonSchema = { type: 'object', additionalProperties: false, required: ['a'], properties: {
    a: { type: 'integer', minimum: 1 }, b: { type: 'array', items: { type: 'string', enum: ['x', 'y'] }, maxItems: 2 },
    c: { oneOf: [{ type: 'number' }, { type: 'string' }] },
  } };
  it('aponta caminho e motivo', () => {
    expect(validarSchema(s, { a: 2, b: ['x'], c: 's' })).toEqual([]);
    expect(validarSchema(s, { a: 0.5, b: ['z', 'x', 'y'], c: true, d: 1 }).map((e) => `${e.caminho}: ${e.mensagem}`)).toEqual([
      'a: esperado inteiro', 'b: máximo de 2 item(ns)', 'b[0]: deve ser um de: x, y', 'c: não corresponde a nenhuma alternativa', 'd: parâmetro desconhecido',
    ]);
    expect(validarSchema(s, {})[0]).toEqual({ caminho: 'a', mensagem: 'obrigatório' });
  });
});

describe('núcleo sem navegador', () => {
  it('src/core não usa window, document, localStorage nem navigator', () => {
    const src = import.meta.glob(['../**/*.ts', '!../**/*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(src).length).toBeGreaterThan(20);
    const bad = Object.keys(src).filter((f) => /\b(window|document|localStorage|navigator)\s*[.[]/.test(src[f].replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '')));
    expect(bad).toEqual([]);
  });
});

