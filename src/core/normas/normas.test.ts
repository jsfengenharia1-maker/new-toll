import { describe, expect, it } from 'vitest';
import { exportarNormas, importarNormas, IDS_NORMAS, NORMAS, normaEmUso, tabelaNorma, validarLinhas } from '.';
import { Sessao } from '../commands';
import { edificioVazio, USOS } from '../building/types';
import { LAJE_APOIADA, NERVURADA_BIAPOIADA, PILAR_TABELA_2004, PILAR_UMA_FACE, VIGA_CONTINUA, EFICIENCIA_PROTETOR_2004, DIVISOES_OCUPACAO, trrfSugerido } from '../building/fogoTabelas';
import { fogoViga } from '../building/fogo';
import { TELAS, telaPor } from '../building/telasSoldadas';
import { categoriasDeUso } from '../building/categoriasUso';
import { GAMA_ORIGEM } from '../building/acoes';
import { PRECAST_CATALOG, STRUCT, catalogoPreMoldadas, defaultFoundationParams, limitesBlevot } from '../piles';
import { parametrosFundacao } from '../building/fundacao';

describe('biblioteca de normas (N3)', () => {
  it('toda tabela de fábrica é válida pelo próprio esquema e os ids são únicos', () => {
    expect(new Set(IDS_NORMAS).size).toBe(NORMAS.length);
    for (const t of NORMAS) expect(validarLinhas(t.id, t.linhas), t.id).toEqual([]);
  });

  it('valores de fábrica idênticos aos das constantes originais', () => {
    expect(TELAS).toHaveLength(12);
    expect(telaPor('Q138')).toMatchObject({ phiL: 4.2, sL: 10, AsL: 1.38, kgm2: 2.167 });
    expect(STRUCT.helice).toEqual({ 'I-II': { fck: 30, gc: 2.7 }, 'III-IV': { fck: 40, gc: 3.6 }, Lmin: 4, sigmaLim: 6, rhoMin: 0.004 });
    expect(STRUCT.escavada['III-IV']).toEqual({ fck: 40, gc: 5.0 });
    expect(PRECAST_CATALOG[80]).toEqual({ P: 4000, T: 640 });
    expect(Object.keys(PRECAST_CATALOG)).toHaveLength(8);
    expect(limitesBlevot()).toEqual({ capKR: 0.9, capK2: 1.4, capK3: 1.75, capK4: 2.1, capK5: 2.1, capK6: 2.1 });
    expect(defaultFoundationParams().capK3).toBe(1.75);
    expect(LAJE_APOIADA).toEqual({ h: [60, 80, 100, 120], c1: { duas15: [10, 10, 15, 20], duas20: [10, 15, 20, 25], uma: [10, 20, 30, 40] } });
    expect(NERVURADA_BIAPOIADA.nervuras[1]).toEqual([[100, 35], [120, 25], [190, 15]]);
    expect(NERVURADA_BIAPOIADA.capa[3]).toEqual([120, 20]);
    expect(VIGA_CONTINUA.bw).toEqual([80, 100, 100, 120]);
    expect(VIGA_CONTINUA.combinacoes[3][2]).toEqual([450, 35]);
    expect(PILAR_TABELA_2004.porTrrf[2][1]).toEqual([300, 45]);
    expect(PILAR_UMA_FACE[4]).toEqual({ trrf: 180, par: [230, 55] });
    expect(EFICIENCIA_PROTETOR_2004).toBe(2.5);
    expect(DIVISOES_OCUPACAO).toHaveLength(48);
    expect(trrfSugerido('A-2', 20)).toMatchObject({ trrf: 60, classe: 'P3' });
    expect(trrfSugerido('F-3', 40)!.trrf).toBeNull();
    expect(GAMA_ORIGEM).toHaveLength(6);
    expect(GAMA_ORIGEM[3]).toMatchObject({ id: 'empuxo', normal: [1.4, 1], especial: [1.3, 1], excepcional: [1.2, 1], aConfirmar: true });
  });

  it('categorias de uso: os sete usos do modelo batem com USOS', () => {
    const c = categoriasDeUso();
    expect(c).toHaveLength(16);
    for (const u of USOS) expect(c.find((x) => x.id === u.v)).toMatchObject({ q: u.q, rotulo: u.label, uso: u.v });
  });

  it('a versão do usuário vence a de fábrica e o restaurar volta', () => {
    const s = new Sessao(edificioVazio());
    const linhas = tabelaNorma(s.modelo, 'nbr7481.telas-q').map((l) => (l.id === 'Q138' ? { ...l, n: 150 } : l));
    const r = s.executar('norma.tabela.definir', { id: 'nbr7481.telas-q', linhas, edicao: 'NBR 7481:2024', nota: 'ajuste' });
    expect(r.ok).toBe(true);
    expect(telaPor('Q138', s.modelo)!.AsL).toBe(1.5);
    expect(telaPor('Q138')!.AsL).toBe(1.38);
    expect(normaEmUso(s.modelo, 'nbr7481.telas-q')).toMatchObject({ alterada: true, edicao: 'NBR 7481:2024', nota: 'ajuste' });
    expect(s.executar('norma.tabela.restaurar', { ids: ['nbr7481.telas-q'] }).ok).toBe(true);
    expect(s.modelo.normas).toBeUndefined();
    s.desfazer();
    expect(s.modelo.normas).toBeDefined();
  });

  it('tabela igual à de fábrica não é guardada; esquema inválido é recusado', () => {
    const s = new Sessao(edificioVazio());
    expect(s.executar('norma.tabela.definir', { id: 'scac.pre-moldadas', linhas: tabelaNorma(s.modelo, 'scac.pre-moldadas') }).ok).toBe(true);
    expect(s.modelo.normas).toBeUndefined();
    expect(s.executar('norma.tabela.definir', { id: 'scac.pre-moldadas', linhas: [{ D: 26, P: 'x', T: 1 }] }).ok).toBe(false);
    expect(validarLinhas('blevot.bielas', [{ param: 'KR', valor: 1 }]).join(' ')).toContain('faltam as linhas');
    expect(validarLinhas('nbr15200.viga-continua', [{ trrf: 30, bw: 80, pares: [80, 15, 3] }]).join(' ')).toContain('pares');
  });

  it('nível de cálculo segue a tabela', () => {
    const s = new Sessao(edificioVazio());
    const a = s.revCalculo, f = s.revFundacao, d = s.revDetalhe;
    s.executar('norma.tabela.definir', { id: 'nbr6120.uso', linhas: tabelaNorma(s.modelo, 'nbr6120.uso').map((l) => (l.id === 'misto' ? { ...l, q: 1 } : l)) });
    expect([s.revCalculo, s.revFundacao, s.revDetalhe]).toEqual([a, f, d]);
    s.executar('norma.tabela.definir', { id: 'scac.pre-moldadas', linhas: tabelaNorma(s.modelo, 'scac.pre-moldadas').map((l) => (l.D === 26 ? { ...l, P: 400 } : l)) });
    expect(s.revCalculo).toBe(a);
    expect(s.revFundacao).toBe(f + 1);
    s.executar('norma.tabela.definir', { id: 'nbr7481.telas-q', linhas: tabelaNorma(s.modelo, 'nbr7481.telas-q').slice(0, 3) });
    expect(s.revCalculo).toBe(a);
    expect(s.revDetalhe).toBeGreaterThan(d);
  });

  it('fundações e fogo leem a tabela do usuário', () => {
    const s = new Sessao(edificioVazio());
    s.executar('norma.tabela.definir', { id: 'blevot.bielas', linhas: tabelaNorma(s.modelo, 'blevot.bielas').map((l) => (l.param === 'K3' ? { ...l, valor: 1.6 } : l)) });
    s.executar('norma.tabela.definir', { id: 'scac.pre-moldadas', linhas: tabelaNorma(s.modelo, 'scac.pre-moldadas').map((l) => (l.D === 26 ? { ...l, P: 400 } : l)) });
    const p = parametrosFundacao(s.modelo);
    expect(p.capK3).toBe(1.6);
    expect(catalogoPreMoldadas(p)[26].P).toBe(400);
    expect(catalogoPreMoldadas(undefined)[26].P).toBe(500);
    const e = { b: 150, c1: 30, revestimento: 0, trrf: 60, continua: true };
    expect(fogoViga(e).ok).toBe(true);
    const viga = tabelaNorma(s.modelo, 'nbr15200.viga-continua').map((l) => (l.trrf === 60 ? { ...l, pares: [400, 100], bw: 400 } : l));
    s.executar('norma.tabela.definir', { id: 'nbr15200.viga-continua', linhas: viga });
    expect(fogoViga(e, s.modelo).ok).toBe(false);
  });

  it('exportar e importar a biblioteca inteira ou uma tabela', () => {
    const s = new Sessao(edificioVazio());
    const linhas = tabelaNorma(s.modelo, 'nbr15200.laje-lisa').map((l) => (l.trrf === 30 ? { ...l, h: 140 } : l));
    s.executar('norma.tabela.definir', { id: 'nbr15200.laje-lisa', linhas, nota: 'x' });
    const um = importarNormas(exportarNormas(s.modelo, ['nbr15200.laje-lisa']));
    expect(um.ok && um.tabelas['nbr15200.laje-lisa'].linhas).toEqual(linhas);
    const tudo = importarNormas(exportarNormas(s.modelo));
    expect(tudo.ok).toBe(true);
    const outro = new Sessao(edificioVazio());
    if (tudo.ok) expect(outro.executar('norma.tabela.definir', { tabelas: tudo.tabelas }).ok).toBe(true);
    expect(Object.keys(outro.modelo.normas!)).toEqual(['nbr15200.laje-lisa']);
    expect(importarNormas('{').ok).toBe(false);
    expect(importarNormas(JSON.stringify({ formato: 'statikos-normas', versao: 1, tabelas: { 'scac.pre-moldadas': { linhas: [{ D: 1 }] } } })).ok).toBe(false);
  });
});
