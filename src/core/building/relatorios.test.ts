// R7g: sugestões de correção, taxa As/Ac, capacidade resistente das vigas, intercâmbio da armadura, quantitativos e
// índices, listagem geral, vento por pavimento, opções do estribo (gancho e U), tabela de pilares por seção e de grampos,
// As,mín ponto a ponto e opções de desenho das pranchas (máscara e ponto fixo).
import { beforeAll, describe, expect, it } from 'vitest';
import { auditDrawing, readDxf } from 'nasjidwg';
import { analisarEdificio, type AnaliseEdificio } from './analitico';
import { dimensionarEdificio, type Dimensionamento } from './dimensionamento';
import { CODIGOS_REVISAO, revisarEdificio } from './revisao';
import { SUGESTOES, sugestaoDe } from './sugestoes';
import { capacidadeViga, intercambioArmadura, intercambioCsv, listagemGeral, quantitativosDetalhados, taxasPilares, ventoPorPavimento, FORMATO_INTERCAMBIO } from './relatorios';
import { estriboComprimento, ganchoEstribo } from './detalhamento';
import { gramposPorEstribo } from './detalhamentoPilares';
import { modoGrampos, tabelaPilarNaSecao, tabelaDeFabrica, validarTabela, type TabelaPilares } from './tabelasArmadura';
import { OPCOES_ANALISE, OPCOES_DETALHE, opcaoClassificada } from './opcoes';
import { areaLaje, propriedadesLaje } from './lajes';
import { barArea } from '../concrete';
import { edificioExemplo } from '../sheets/exemplo';
import { montarPrancha } from '../sheets/prancha';
import { montarPranchasLajes } from '../sheets/armacaoLajes';
import { escreverDxf } from '../sheets/dxf';
import type { Sessao } from '../commands';

let s: Sessao, an: AnaliseEdificio, dim: Dimensionamento;
beforeAll(() => {
  s = edificioExemplo();
  an = analisarEdificio(s.modelo);
  dim = dimensionarEdificio(s.modelo, an);
}, 120000);

describe('R7g: sugestões de correção (C4.38)', () => {
  it('todo código de erro e aviso tem sugestão própria', () => {
    const sem = CODIGOS_REVISAO.filter((c) => c.nivel !== 'info' && !sugestaoDe(c.codigo)).map((c) => c.codigo);
    expect(sem).toEqual([]);
    expect(sugestaoDe('ANALISE')).not.toBe('');
    expect(sugestaoDe('AVISO')).not.toBe('');
    for (const [k, v] of Object.entries(SUGESTOES)) expect(v.length, k).toBeGreaterThan(20);
  });
  it('os itens da revisão carregam a sugestão do código', () => {
    const rev = revisarEdificio(s.modelo, an, dim);
    for (const i of rev.itens) expect(i.sugestao, i.codigo).toBe(sugestaoDe(i.codigo) || undefined);
  });
});

describe('R7g: taxa As/Ac dos pilares (C4.45)', () => {
  it('taxa = As / seção bruta, conferida à mão', () => {
    const t = taxasPilares(s.modelo, dim);
    expect(t.length).toBeGreaterThan(0);
    for (const x of t) {
      const r = dim.pilares.find((y) => y.pilar === x.pilar && y.pavimento === x.pavimento)!;
      const m = /^(\d+)×(\d+)$/.exec(r.secao);
      const Ac = m ? Number(m[1]) * Number(m[2]) : (Math.PI * Number(r.secao.slice(1)) ** 2) / 4;
      expect(x.Ac).toBeCloseTo(Ac, 1);
      expect(x.taxa).toBeCloseTo(((r.As * 1e4) / Ac) * 100, 1);
      expect(x.taxa).toBeGreaterThanOrEqual(0.39); // As,mín 0,4 %
      expect(x.taxa).toBeLessThanOrEqual(4.01);
    }
  });
});

describe('R7g: capacidade resistente das vigas (K1.11.46)', () => {
  it('MRd pela armadura colocada cobre a envoltória e bate com o bloco retangular na seção do meio', () => {
    const v = s.modelo.vigas[0], d = dim.detalhes!.find((x) => x.viga === v.id)!, r = dim.vigas.find((x) => x.viga === v.id)!;
    const cap = capacidadeViga(s.modelo, v, d, r, 0.25);
    expect(cap.length).toBeGreaterThan(4);
    const MmaxEnv = Math.max(...r.envoltoria.pontos.map((p) => p.Mmax));
    expect(Math.max(...cap.map((c) => c.MRdPos))).toBeGreaterThanOrEqual(MmaxEnv * 0.999);
    // sem barras: capacidade nula; com as barras inferiores no ponto de maior momento positivo, MRd ≈ As·fyd·(d − 0,4x)
    const pico = r.envoltoria.pontos.reduce((m, p) => (p.Mmax > m.Mmax ? p : m));
    const c = cap.reduce((m, q) => (Math.abs(q.s - pico.s) < Math.abs(m.s - pico.s) ? q : m));
    const fyd = 500 / 1.15, As = r.arranjo.inf ? r.arranjo.inf.n * barArea(r.arranjo.inf.phi) : 0;
    expect(As).toBeGreaterThan(0);
    const bw = v.secao.b, fcd = s.modelo.norma.fck / 1.4, h = v.secao.h;
    const dEf = h - s.modelo.norma.cobrimento.viga / 100 - (r.arranjo.estribo?.phi ?? 5) / 1000 - r.arranjo.inf!.phi / 2000;
    const x = (As * fyd) / (0.85 * fcd * bw * 0.8), MRdMan = As * fyd * (dEf - 0.4 * x) * 1000;
    // o detalhamento pode ter mais barras que o arranjo nessa seção; a capacidade não é menor que a do arranjo
    expect(c.MRdPos).toBeGreaterThanOrEqual(MRdMan * 0.9);
    expect(c.MRdPos).toBeLessThan(MRdMan * 2.5);
  });
});

describe('R7g: intercâmbio da armadura (K1.11.46)', () => {
  it('JSON de barras de vigas, pilares e lajes; CSV com o peso conferido', () => {
    const i = intercambioArmadura(s.modelo, dim);
    expect(i.formato).toBe(FORMATO_INTERCAMBIO);
    expect(new Set(i.barras.map((x) => x.elemento))).toEqual(new Set(['viga', 'pilar', 'laje']));
    const csv = intercambioCsv(i).split('\n');
    expect(csv).toHaveLength(i.barras.length + 1);
    expect(csv[0].startsWith('elemento;nome;posicao')).toBe(true);
    // peso do CSV das barras das vigas (sem perdas) = peso dos detalhes × repetições
    const pesoCsv = csv.slice(1).filter((l) => l.startsWith('viga;')).reduce((t, l) => t + Number(l.split(';').at(-1)!.replace(',', '.')), 0);
    const pesoDet = dim.detalhes!.reduce((t, d) => t + d.peso * d.repeticoes, 0);
    expect(pesoCsv).toBeCloseTo(pesoDet, 0);
  });
});

describe('R7g: quantitativos, blocos de enchimento e índices por m² (K1.11.47)', () => {
  it('panos e vigas contra a soma manual; índices = totais / área', () => {
    const q = quantitativosDetalhados(s.modelo, dim);
    const l0 = s.modelo.lajes[0], p0 = q.panos.find((p) => p.laje === l0.id)!;
    expect(p0.area).toBeCloseTo(areaLaje(l0), 1);
    expect(p0.volume).toBeCloseTo(areaLaje(l0) * (l0.tipo.tipo === 'macica' ? l0.tipo.h : p0.h), 2);
    expect(p0.pesoProprio).toBeCloseTo(propriedadesLaje(l0.tipo).pp * areaLaje(l0), 0);
    const area = q.panos.reduce((t, p) => t + p.area * p.pavimentos, 0);
    expect(q.indices.area).toBeCloseTo(area, 1);
    expect(q.indices.kgPorM2).toBeCloseTo(q.indices.aco / area, 1);
    expect(q.indices.m3PorM2).toBeCloseTo(q.indices.concreto / area, 2);
    expect(q.indices.m2PorM2).toBeCloseTo(q.indices.forma / area, 1);
    expect(q.indices.kgPorM3).toBeCloseTo(q.indices.aco / q.indices.concreto, 0);
    const v0 = q.vigas[0], vg = s.modelo.vigas[0];
    expect(v0.volume).toBeCloseTo(vg.secao.b * vg.secao.h * v0.L, 1);
    expect(q.indices.acoDetalhado).toBe(true);
  });
  it('treliçada: enchimento = área × (intereixo − bw)/intereixo', () => {
    const t = edificioExemplo();
    expect(t.executar('laje.atribuir', { ids: [t.modelo.lajes[0].id], tipo: { tipo: 'trelicada', modelo: 'H16', capa: 0.04 } }).ok).toBe(true);
    const a = analisarEdificio(t.modelo), d = dimensionarEdificio(t.modelo, a);
    const q = quantitativosDetalhados(t.modelo, d), p = q.panos.find((x) => x.laje === t.modelo.lajes[0].id)!;
    expect(p.enchimento).toBeDefined();
    expect(p.enchimento!.area).toBeCloseTo((p.area * (0.42 - 0.09)) / 0.42, 1);
    expect(p.enchimento!.volume).toBeCloseTo(p.enchimento!.area * 0.16, 2);
    expect(q.enchimento.pecas).toBeGreaterThan(0);
  }, 60000);
});

describe('R7g: listagem geral e vento por pavimento (K1.11.44, K1.11.51)', () => {
  it('coordenadas, dimensões, vínculos e pesos das lajes', () => {
    const g = listagemGeral(s.modelo);
    expect(g.pilares).toHaveLength(s.modelo.pilares.length);
    const p = s.modelo.pilares[0], lp = g.pilares[0];
    expect(lp.x).toBeCloseTo(p.x, 3);
    expect(lp.secoes.length).toBeGreaterThan(0);
    expect(lp.vinculo).toMatch(/engastado|apoiado|rotulada|molas/);
    const l = g.lajes[0], l0 = s.modelo.lajes[0];
    expect(l.pesoProprio).toBeCloseTo(propriedadesLaje(l0.tipo).pp * areaLaje(l0), 0);
    expect(l.permanente).toBeCloseTo((propriedadesLaje(l0.tipo).pp + l.revKNm2) * areaLaje(l0), 0);
    expect(g.pavimentos.length).toBe(s.modelo.pavimentos.length);
    expect(g.totais.permanente).toBeGreaterThan(g.totais.pesoProprio);
  });
  it('forças de vento por pavimento somam o caso', () => {
    const v = ventoPorPavimento(s.modelo, an);
    if (!an.vento) { expect(v).toEqual([]); return; }
    expect(v.length).toBe(an.vento.casos.length);
    for (const c of v) expect(c.total).toBeCloseTo(c.forcas.reduce((t, f) => t + f.F, 0), 0);
  });
});

describe('R7g: estribo (gancho do fechamento e em U)', () => {
  it('comprimentos pelas pontas retas da NBR 6118, 9.4.6.1', () => {
    // 135° (padrão, comportamento anterior): perna máx(5φ; 5 cm) e arco de 135° em D = 4φ
    expect(ganchoEstribo(5, 135)).toBeCloseTo(0.05 + (3 * Math.PI) / 8 * 0.02, 6);
    expect(ganchoEstribo(10, 135)).toBeCloseTo(0.05 + (3 * Math.PI) / 8 * 0.04, 6);
    // 90°: perna máx(10φ; 7 cm); 180°: máx(5φ; 5 cm)
    expect(ganchoEstribo(5, 90)).toBeCloseTo(0.07 + (Math.PI / 4) * 0.02, 6);
    expect(ganchoEstribo(10, 90)).toBeCloseTo(0.1 + (Math.PI / 4) * 0.04, 6);
    expect(ganchoEstribo(8, 180)).toBeCloseTo(0.05 + (Math.PI / 2) * 0.032, 6);
    // fechado × U: o U troca o lado superior pelas duas pernas livres
    const f = estriboComprimento(0.1, 0.4, 5, 135, false), u = estriboComprimento(0.1, 0.4, 5, 135, true);
    expect(f - u).toBeCloseTo(0.1, 9);
    expect(f).toBeCloseTo(2 * 0.1 + 2 * 0.4 + 2 * ganchoEstribo(5, 135), 9);
  });
  it('as opções mudam o comprimento das peças e a zona editada pode virar U', () => {
    const t = s;
    const base = dimensionarEdificio(t.modelo, an), idv = base.detalhes![0].viga;
    const c0 = base.detalhes![0].estribos[0].comprimento;
    const sU = edificioExemplo();
    expect(sU.executar('opcoes.definir', { valores: { vigaEstriboU: 1, vigaEstriboGancho: 90 } }).ok).toBe(true);
    const aU = analisarEdificio(sU.modelo), dU = dimensionarEdificio(sU.modelo, aU);
    const z = dU.detalhes!.find((x) => x.viga === idv)!.estribos[0];
    expect(z.u).toBe(true);
    expect(z.comprimento).toBeLessThan(c0 + 0.2);
    expect(z.comprimento).not.toBeCloseTo(c0, 2);
    // edição da zona: volta a fechado só nessa zona
    expect(sU.executar('viga.detalhe', { id: idv, zonas: [{ zona: 0, u: false }] }).ok).toBe(true);
    const dE = dimensionarEdificio(sU.modelo, aU);
    const zE = dE.detalhes!.find((x) => x.viga === idv)!;
    expect(zE.estribos[0].u).toBeUndefined();
    expect(zE.estribos[0].comprimento).toBeGreaterThan(z.comprimento);
  }, 120000);
});

describe('R7g: As,mín ponto a ponto nas vigas', () => {
  it('ligada, a cobertura da armadura não diminui e o detalhamento segue válido', () => {
    const t = edificioExemplo();
    const off = dimensionarEdificio(t.modelo, analisarEdificio(t.modelo));
    expect(t.executar('opcoes.definir', { valores: { vigaAsMinPonto: 1 } }).ok).toBe(true);
    const on = dimensionarEdificio(t.modelo, analisarEdificio(t.modelo));
    const peso = (d: Dimensionamento) => d.detalhes!.reduce((a, x) => a + x.peso, 0);
    expect(peso(on)).toBeGreaterThanOrEqual(peso(off) - 1e-6);
    expect(on.detalhes!.every((d) => d.barras.length > 0)).toBe(true);
  }, 120000);
});

describe('R7g: tabela de pilares por seção e tabela de grampos', () => {
  const base = (): TabelaPilares => tabelaDeFabrica('pilares');
  it('faixa de seção substitui bitolas e espaçamentos; fora das faixas vale a geral', () => {
    const t = base();
    t.secoes = [{ ladoMenorAte: 25, ladoMaiorAte: 40, bitolas: [16], espacamentos: [15] }];
    expect(validarTabela('pilares', t)).toEqual([]);
    const a = tabelaPilarNaSecao(t, 0.25, 0.4);
    expect(a.bitolas).toEqual([16]);
    expect(a.espacamentos).toEqual([15]);
    expect(a.estribos).toEqual(t.estribos);
    const b = tabelaPilarNaSecao(t, 0.3, 0.5);
    expect(b.bitolas).toEqual(t.bitolas);
    expect(validarTabela('pilares', { ...t, secoes: [{ ladoMenorAte: 30, ladoMaiorAte: 20 }] })).not.toEqual([]);
  });
  it('modos de grampos: norma (18.2.4), todas e nenhum', () => {
    const t = base();
    t.grampos = [{ phiAte: 16, ladoMaiorAte: 60, modo: 'nenhum' }, { phiAte: 25, ladoMaiorAte: 999, modo: 'todas' }];
    expect(modoGrampos(t, 12.5, 0.3, 0.5)).toBe('nenhum');
    expect(modoGrampos(t, 20, 0.3, 0.5)).toBe('todas');
    expect(modoGrampos(t, 12.5, 0.3, 0.8)).toBe('todas');
    expect(modoGrampos(base(), 12.5, 0.3, 0.5)).toBe('norma');
    // 20 × 80, 4 barras por face maior: duas intermediárias a mais de 20φt (5 mm → 10 cm) do canto
    const norma = gramposPorEstribo(0.8, 0.2, 0.04, 6, 2, 5);
    expect(norma).toBeGreaterThan(0);
    expect(gramposPorEstribo(0.8, 0.2, 0.04, 6, 2, 5, 6, 2, 'nenhum')).toBe(0);
    expect(gramposPorEstribo(0.8, 0.2, 0.04, 6, 2, 5, 6, 2, 'todas')).toBe(4 + 4);
  });
  it('tabela com grampos "nenhum" gera o aviso GRAMPOS_TABELA quando a norma os pede', () => {
    const t = edificioExemplo();
    const p = t.modelo.pilares[0];
    expect(t.executar('pilar.editar', { id: p.id, secao: { tipo: 'ret', b: 0.2, h: 0.9 } }).ok).toBe(true);
    const tab = base();
    tab.grampos = [{ phiAte: 25, ladoMaiorAte: 999, modo: 'nenhum' }];
    expect(t.executar('tabela.definir', { tipo: 'pilares', tabela: { ...tab, id: 'padrao' } }).ok).toBe(true);
    const d = dimensionarEdificio(t.modelo, analisarEdificio(t.modelo));
    const rs = d.pilares.filter((r) => r.pilar === p.id);
    expect(rs.some((r) => r.mensagens.some((m) => /^Grampos fora da NBR 6118/.test(m)))).toBe(true);
    const det = d.detalhesPilares?.find((x) => x.pilar === p.id);
    if (det) expect(det.lances.every((l) => l.estribos.grampos === 0)).toBe(true);
  }, 120000);
});

describe('R7g: classificação das opções novas', () => {
  it('estão classificadas (detalhe)', () => {
    for (const k of ['vigaEstriboGancho', 'vigaEstriboU', 'vigaAsMinPonto']) {
      expect(opcaoClassificada(k), k).toBe(true);
      expect(OPCOES_DETALHE.has(k)).toBe(true);
      expect(OPCOES_ANALISE.has(k as never)).toBe(false);
    }
  });
});

describe('R7g: pranchas com máscara e ponto fixo (C2.22, C4.61)', () => {
  it('sem as opções a prancha é a de antes; com elas entram as camadas MASCARA e PONTO-FIXO e o DXF passa na auditoria', () => {
    const t = edificioExemplo();
    const grupo = t.modelo.pavimentos[1].grupo;
    expect(t.executar('mascara.importar', { grupo, nome: 'gabarito', escala: 1, geo: { PAREDE: { linhas: [0, 0, 8, 0, 8, 0, 8, 5], arcos: [4, 2.5, 1, 0, 90], textos: [] } } }).ok).toBe(true);
    const sem = montarPrancha(t.modelo, grupo);
    expect(sem.modelo.some((q) => q.c === 'MASCARA' || q.c === 'PONTO-FIXO')).toBe(false);
    expect(t.executar('prancha.definir', { armacao: { mascara: 1, pontoFixo: 1 } }).ok).toBe(true);
    const com = montarPrancha(t.modelo, grupo);
    const nM = com.modelo.filter((q) => q.c === 'MASCARA').length, nP = com.modelo.filter((q) => q.c === 'PONTO-FIXO').length;
    expect(nM).toBe(3); // dois segmentos e um arco em polilinha
    expect(nP).toBeGreaterThan(0);
    expect(nP % 3).toBe(0);
    expect(com.modelo.length).toBe(sem.modelo.length + nM + nP);
    const d = readDxf(escreverDxf(com));
    expect(d.warnings).toEqual([]);
    expect(auditDrawing(d).filter((f) => f.severity === 'error')).toEqual([]);
    // desligar volta ao padrão e não deixa resíduo no modelo
    expect(t.executar('prancha.definir', { armacao: { mascara: 0, pontoFixo: 0 } }).ok).toBe(true);
    expect(t.modelo.prancha?.armacao).toBeUndefined();
  }, 120000);
  it('prancha de lajes também recebe a máscara', () => {
    const t = edificioExemplo();
    const a = analisarEdificio(t.modelo), d = dimensionarEdificio(t.modelo, a);
    const grupo = t.modelo.lajes[0].grupo;
    t.executar('mascara.importar', { grupo, nome: 'g', escala: 1, geo: { C: { linhas: [0, 0, 1, 1], arcos: [], textos: [] } } });
    t.executar('prancha.definir', { armacao: { mascara: 1 } });
    const prs = montarPranchasLajes(t.modelo, a, d);
    expect(prs.some((p) => p.modelo.some((q) => q.c === 'MASCARA'))).toBe(true);
  }, 120000);
});
