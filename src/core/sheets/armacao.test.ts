import { beforeAll, describe, expect, it } from 'vitest';
import { auditDrawing, readDxf, type Entity } from 'nasjidwg';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import type { Sessao } from '../commands';
import { comprimentoPolilinha } from '../building/types';
import { edificioExemplo } from './exemplo';
import { Posicoes, resumoDaTabela } from './armacao';
import { montarPranchasVigas } from './armacaoVigas';
import { montarPranchasPilares } from './armacaoPilares';
import { montarPranchasLajes } from './armacaoLajes';
import { montarPranchaLocacao } from './locacao';
import { montarConjunto } from './conjunto';
import { escreverPdf } from './pdf';
import { escreverDxf } from './dxf';
import { desenhoDwg, type EscritorDwg } from './dwg';
import { svgPrancha } from './svg';
import type { Prancha } from './prancha';

const vendor = import.meta.glob('/public/vendor/nasjidwg-*.mjs');

let s: Sessao, an: AnaliseEdificio, dim: Dimensionamento;
beforeAll(() => {
  s = edificioExemplo();
  // uma laje treliçada para as vigotas na prancha de lajes
  expect(s.executar('laje.atribuir', { ids: [s.modelo.lajes[0].id], tipo: { tipo: 'trelicada', modelo: 'H16', capa: 0.04 } }).ok).toBe(true);
  an = analisarEdificio(s.modelo);
  dim = dimensionarEdificio(s.modelo, an);
});

const textos = (pr: Prancha) => [...pr.papel, ...pr.modelo].flatMap((q) => (q.t === 'txt' ? [q.s] : []));
const soma = (xs: { peso: number }[]) => xs.reduce((t, x) => t + x.peso, 0);
const pesoFolhas = (prs: Prancha[]) => prs.reduce((t, p) => t + (p.aco?.peso ?? 0), 0);

describe('pranchas de armação (R5)', () => {
  it('posições: barras iguais somadas, resumo por bitola com perdas', () => {
    const r = new Posicoes();
    expect(r.pos('L|0|0', 'CA-50', 10, 500, 6)).toBe('N1');
    expect(r.pos('L|0|9', 'CA-50', 10, 500, 2)).toBe('N2'); // outro desenho
    expect(r.pos('L|0|0', 'CA-50', 10, 500, 3)).toBe('N1');
    expect(r.pos('E|15|44', 'CA-60', 5, 125, 10)).toBe('N3');
    expect(r.tabela[0]).toMatchObject({ quant: 9, cUnit: 500, cTotal: 45 });
    const res = resumoDaTabela(r.tabela, 10);
    expect(res.map((x) => [x.aco, x.phi, x.comprimento])).toEqual([['CA-50', 10, 55], ['CA-60', 5, 12.5]]);
    // φ10: 0,617 kg/m
    expect(res[0].peso).toBeCloseTo(55 * Math.PI * 0.005 ** 2 * 7850, 6);
    expect(res[0].pesoComPerdas).toBeCloseTo(res[0].peso * 1.1, 9);
  });

  it('vigas: elevações, cotas, estribos por zona, seção; tabela de aço igual ao detalhamento', () => {
    const prs = montarPranchasVigas(s.modelo, an, dim);
    expect(prs).toHaveLength(1);
    const pr = prs[0];
    expect([pr.tipo, pr.formato, pr.janela, pr.modelo.length]).toEqual(['vigas', 'A1', undefined, 0]);
    expect(pr.avisos).toEqual([]);
    expect(pr.elementos).toEqual(['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7']);
    const t = textos(pr);
    for (const x of ['V1', 'SEÇÃO', 'P1', 'TABELA DE AÇO', 'RESUMO DE AÇO', 'ARMAÇÃO DAS VIGAS — TIPO', 'SCV', 'INDICADA']) expect(t).toContain(x);
    expect(t.filter((x) => /^3×\d+ N\d+ φ\d+,\d C=\d+$/.test(x)).length).toBeGreaterThan(20); // barras: repetições × n
    expect(t.some((x) => /^3×\d+ N\d+ c\/\d+$/.test(x))).toBe(true); // zonas de estribos
    expect(t).toContain('480'); // vão livre 5 m − 20 cm de pilar
    // tabela: cada posição uma vez e o peso igual ao do resumo do dimensionamento (repetições incluídas)
    const a = pr.aco!;
    expect(new Set(a.tabela.map((l) => l.pos)).size).toBe(a.tabela.length);
    expect(a.peso).toBeCloseTo(soma(dim.resumoAcoVigas!), 6);
    expect(a.pesoComPerdas).toBeCloseTo(a.peso * 1.1, 6);
    expect(a.concreto).toBeCloseTo(dim.detalhes!.reduce((t2, d) => { const v = s.modelo.vigas.find((x) => x.id === d.viga)!; return t2 + v.secao.b * v.secao.h * comprimentoPolilinha(v.pontos) * d.repeticoes; }, 0), 6);
    for (const r of a.resumo) expect(r.peso).toBeCloseTo(dim.resumoAcoVigas!.find((x) => x.phi === r.phi && x.aco === r.aco)!.peso, 6);
  });

  it('vigas: paginação em várias folhas no formato fixo pequeno, posições por folha', () => {
    const s2 = edificioExemplo();
    expect(s2.executar('prancha.definir', { armacao: { formato: 'A3', escalaVigas: 50 } }).ok).toBe(true);
    const an2 = analisarEdificio(s2.modelo), d2 = dimensionarEdificio(s2.modelo, an2);
    const prs = montarPranchasVigas(s2.modelo, an2, d2);
    expect(prs.length).toBeGreaterThan(1);
    expect(prs.flatMap((p) => p.elementos)).toHaveLength(7);
    expect(pesoFolhas(prs)).toBeCloseTo(soma(d2.resumoAcoVigas!), 6);
    for (const p of prs) expect(p.aco!.tabela[0].pos).toBe('N1');
    expect(textos(prs[0])).toContain('ESC 1:50 · 15×50 · 3× (Tipo 1 a Tipo 3)');
  });

  it('pilares: grupos de iguais, níveis, seções; peso igual ao detalhamento; quadro opcional', () => {
    const prs = montarPranchasPilares(s.modelo, an, dim);
    const arm = prs.filter((p) => p.aco), quadro = prs.filter((p) => !p.aco);
    expect(quadro).toHaveLength(1);
    const t = arm.flatMap(textos);
    const titulos = t.filter((x) => /^P\d+(=P\d+)*=?$/.test(x));
    expect(titulos.length).toBeGreaterThan(0);
    // todos os pilares aparecem uma vez nos títulos
    const nomes = titulos.join('=').split('=').filter(Boolean).sort();
    expect(nomes).toEqual(s.modelo.pilares.map((p) => p.nome).sort());
    for (const x of ['Fundação -1,50', 'Cobertura +12,00', 'Térreo +0,00']) expect(t).toContain(x);
    expect(t.some((x) => / N\d+ φ\d+,\d C=\d+ \(grampo\)$/.test(x))).toBe(true);
    expect(pesoFolhas(arm)).toBeCloseTo(soma(dim.resumoAcoPilares!), 6);
    const tq = textos(quadro[0]);
    expect(tq).toContain('QUADRO DE PILARES');
    expect(tq.filter((x) => x === 'P1')).toHaveLength(5); // um por lance
    s.executar('prancha.definir', { armacao: { quadroPilares: 0 } });
    expect(montarPranchasPilares(s.modelo, an, dim).every((p) => p.aco)).toBe(true);
    s.executar('prancha.definir', { armacao: { quadroPilares: 1 } });
    expect(s.modelo.prancha?.armacao).toBeUndefined(); // igual ao padrão não fica guardado
  });

  it('lajes: positivas e negativas em folhas separadas (ou juntas), vigotas; peso = lajes + vigotas', () => {
    const prs = montarPranchasLajes(s.modelo, an, dim);
    expect(prs.map((p) => p.titulo)).toEqual(['Armação das lajes — Tipo — positivas', 'Armação das lajes — Tipo — negativas']);
    expect(prs[0].janela).toBeDefined();
    const total = soma(dim.resumoAcoLajes!) + soma(dim.resumoAcoVigotas!);
    expect(pesoFolhas(prs)).toBeCloseTo(total, 6);
    const t0 = textos(prs[0]), t1 = textos(prs[1]);
    expect(t0.some((x) => /^3×\d+ N\d+ φ\d+,\d c\/\d+ C=\d+$/.test(x))).toBe(true);
    expect(t0.some((x) => /^TR 16745 · \d+ vigotas/.test(x))).toBe(true);
    expect(t0.some((x) => /— adicional$/.test(x)) || dim.vigotas![0].posicoes.every((p) => p.tipo !== 'adicional')).toBe(true);
    expect(t1.some((x) => /— (negativos|distribuição \(capa\))$/.test(x))).toBe(true);
    expect(prs[1].modelo.some((q) => q.c === 'ARMADURA-NEG')).toBe(true);
    expect(prs[0].modelo.some((q) => q.c === 'ARMADURA-NEG')).toBe(false);
    s.executar('prancha.definir', { armacao: { lajesSeparadas: 0 } });
    const juntas = montarPranchasLajes(s.modelo, an, dim);
    expect(juntas).toHaveLength(1);
    expect(juntas[0].aco!.peso).toBeCloseTo(total, 6);
    s.executar('prancha.definir', { armacao: { lajesSeparadas: 1 } });
  });

  it('locação: pilares, eixos, cargas características e de cálculo e notas gerais', () => {
    const pr = montarPranchaLocacao(s.modelo, an)!;
    const t = textos(pr);
    for (const x of ['P1', '20×50', 'A', '1', 'Nk,máx', 'Nd,máx', 'Hyd', 'NOTAS GERAIS', 'SLP']) expect(t).toContain(x);
    expect(t.some((x) => /C30/.test(x) && /pilares/.test(x))).toBe(true);
    // valores com vírgula e duas casas; Nd > Nk no pilar
    const tp = pr.papel.flatMap((q) => (q.t === 'txt' ? [q.s] : [])), i5 = tp.indexOf('P5');
    expect(tp[i5 + 1]).toBe('20×50');
    const nk = +tp[i5 + 2].replace(',', '.'), nd = +tp[i5 + 8].replace(',', '.');
    expect(nk).toBeGreaterThan(0);
    expect(nd).toBeGreaterThan(nk);
    expect(t.filter((x) => /^-?\d+,\d\d$/.test(x)).length).toBeGreaterThanOrEqual(12 * 12);
    expect(montarPranchaLocacao(s.modelo, null)!.avisos.join(' ')).toMatch(/calcular/);
  });

  it('conjunto: ordem, numeração "n/N", PDF, DXF e SVG de todas as pranchas', async () => {
    const { pranchas, avisos } = montarConjunto(s.modelo, an, dim, { tipos: 'todas' });
    expect(avisos).toEqual([]);
    expect(pranchas.map((p) => p.tipo)).toEqual(['locacao', 'formas', 'vigas', 'pilares', 'pilares', 'lajes', 'lajes']);
    pranchas.forEach((p, i) => expect(textos(p)).toContain(`${String(i + 1).padStart(2, '0')}/07`));
    // sem cálculo: só formas e locação
    const sem = montarConjunto(s.modelo, null, null, { tipos: 'todas' });
    expect(sem.pranchas.map((p) => p.tipo)).toEqual(['locacao', 'formas']);
    expect(sem.avisos).toHaveLength(3);
    const pdf = Array.from(escreverPdf(pranchas), (c) => String.fromCharCode(c)).join('');
    expect((pdf.match(/\/Type \/Page\b/g) ?? []).length).toBe(7);
    expect(pdf).toContain('/OCG');
    for (const pr of pranchas) {
      const d = readDxf(escreverDxf(pr));
      expect(d.warnings).toEqual([]);
      expect(auditDrawing(d).filter((f) => f.severity === 'error')).toEqual([]);
      const tx = (es: Entity[]) => es.flatMap((e) => (e.type === 'text' ? [e.text] : [])).sort();
      expect(tx(d.paperSpace ?? [])).toEqual(pr.papel.flatMap((q) => (q.t === 'txt' ? [q.s] : [])).sort());
      expect((d.paperSpace ?? []).filter((e) => e.type === 'viewport')).toHaveLength(pr.janela ? 2 : 1);
      expect(svgPrancha(pr)).toMatch(/^<svg/);
    }
    // DWG da prancha de vigas (só papel)
    const w = ((await Object.values(vendor)[0]()) as { writeDwg2018: EscritorDwg }).writeDwg2018;
    expect(w(desenhoDwg(pranchas[2])).skipped).toEqual([]);
  });
});
