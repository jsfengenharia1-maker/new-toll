import { describe, expect, it } from 'vitest';
import { readDxf } from 'nasjidwg';
import { edificioExemplo } from './exemplo';
import { montarConjunto } from './conjunto';
import { escreverDxf } from './dxf';
import { escreverPdf } from './pdf';
import { svgPrancha } from './svg';
import { CAMADAS, type Prancha } from './prancha';
import { abrirEstilo, aplicarEstilo, resolverEstilo, salvarEstilo, validarEstilo } from './estilo';
import { detalheDeDxf, inserirDetalhes, mmPorUnidade, primitivasDoDetalhe } from './saidas';
import { primitivasDoSimbolo } from './simbolos';
import type { DetalheDxf } from '../building/types';
import { analisarEdificio } from '../building/analitico';
import { combinacoesEdificio } from '../building/combinacoes';
import { dimensionarEdificio } from '../building/dimensionamento';
import { areaDoCampo, areaPoligono } from '../resultados/bandas';
import { hipoteseDeCombinacao } from '../resultados/deformada';
import { campoDoPavimento, pavimentosComMapa } from '../resultados/isovalores';
import { montarPranchasResultados } from './folhasV5';

const txt = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');
const formas = (s = edificioExemplo()) => montarConjunto(s.modelo, null, null, { tipos: 'formas' }).pranchas[0];

/** DXF mínimo em mm: retângulo 100 × 50 (4 LINE), um círculo e um texto. */
const DXF = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES',
  ...[[0, 0, 100, 0], [100, 0, 100, 50], [100, 50, 0, 50], [0, 50, 0, 0]].flatMap(([a, b, c, d]) => ['0', 'LINE', '8', 'MOLDURA', '10', String(a), '20', String(b), '11', String(c), '21', String(d)]),
  '0', 'CIRCLE', '8', 'MOLDURA', '10', '50', '20', '25', '40', '5', '0', 'TEXT', '8', 'TEXTOS', '10', '5', '20', '5', '40', '3', '1', 'LOGO', '0', 'ENDSEC', '0', 'EOF'].join('\n');

describe('estilo de desenho (K1.4.90)', () => {
  const estilo = { camadas: { PILAR: { nome: 'PILARES-EST', cor: 30, pena: 0.7 }, VIGA: { cor: 150, tipo: 'trac' as const } }, textos: { cotas: 1.5 } };

  it('sem estilo a prancha não muda; com estilo, camadas e textos mudam', () => {
    const pr = formas();
    expect(aplicarEstilo(pr, undefined)).toBe(pr);
    expect(aplicarEstilo(pr, {})).toBe(pr);
    const e = aplicarEstilo(pr, estilo);
    expect(e.estilo!.camadas.PILAR).toEqual({ nome: 'PILARES-EST', cor: 30, pena: 0.7, tipo: 'cont' });
    expect(e.estilo!.camadas.EIXO.cor).toBe(CAMADAS.EIXO.cor);
    const alt = (p: Prancha) => p.modelo.filter((q) => q.t === 'txt' && q.c === 'COTA').map((q) => (q.t === 'txt' ? q.h : 0));
    expect(alt(e).length).toBeGreaterThan(0);
    alt(e).forEach((h, i) => expect(h).toBeCloseTo(1.5 * alt(pr)[i], 9));
    // textos de outros tipos intactos
    const rot = (p: Prancha) => p.modelo.filter((q) => q.t === 'txt' && q.c === 'TEXTO').map((q) => (q.t === 'txt' ? q.h : 0));
    expect(rot(e)).toEqual(rot(pr));
  });

  it('DXF: camada renomeada, cor, pena e tipo de linha relidos; PDF e SVG usam o estilo', () => {
    const pr = aplicarEstilo(formas(), estilo);
    const d = readDxf(escreverDxf(pr));
    const l = d.layers.find((x) => x.name === 'PILARES-EST')!;
    expect(l).toBeTruthy();
    expect(l.color).toEqual({ kind: 'aci', index: 30 });
    expect(l.lineweight).toBeCloseTo(0.7, 2);
    expect(d.layers.find((x) => x.name === 'PILAR')).toBeUndefined();
    expect(d.layers.find((x) => x.name === 'VIGA')?.linetype).toBe('TRACEJADA');
    expect(d.entities.filter((e) => e.layer === 'PILARES-EST').length).toBeGreaterThan(0);
    expect(d.entities.some((e) => e.layer === 'PILAR')).toBe(false);
    expect(txt(escreverPdf([pr]))).toContain('/Name (PILARES-EST)');
    expect(txt(escreverPdf([pr]))).toContain('0.7 w');
    expect(svgPrancha(pr)).toContain('stroke-width="0.7"');
  });

  it('validação: camada, cor, pena, nome repetido ou reservado, fator de texto', () => {
    expect(validarEstilo(estilo)).toEqual([]);
    expect(validarEstilo({ camadas: { XYZ: { cor: 3 } } })[0]).toMatch(/desconhecida/);
    expect(validarEstilo({ camadas: { PILAR: { cor: 300 } } })[0]).toMatch(/cor ACI/);
    expect(validarEstilo({ camadas: { PILAR: { pena: 5 } } })[0]).toMatch(/pena/);
    expect(validarEstilo({ camadas: { PILAR: { nome: 'VIGA' } } }).join(' ')).toMatch(/mesmo nome/);
    expect(validarEstilo({ camadas: { PILAR: { nome: 'a/b' } } })[0]).toMatch(/nome inválido/);
    expect(validarEstilo({ camadas: { PILAR: { nome: '0' } } }).join(' ')).toMatch(/reservado/);
    expect(validarEstilo({ textos: { cotas: 9 } })[0]).toMatch(/fator/);
    expect(resolverEstilo().camadas.PILAR.pena).toBe(CAMADAS.PILAR.pena);
  });

  it('estilo salvo e aberto na biblioteca', () => {
    const t = salvarEstilo('Escritório', estilo);
    expect(abrirEstilo(t)).toEqual({ nome: 'Escritório', estilo });
    expect('erro' in abrirEstilo('{"tipo":"outro"}')).toBe(true);
    expect('erro' in abrirEstilo('não é json')).toBe(true);
  });

  it('comando prancha.definir grava e limpa o estilo; o conjunto o aplica', () => {
    const s = edificioExemplo();
    expect(s.executar('prancha.definir', { estilo }).ok).toBe(true);
    expect(s.modelo.prancha!.estilo).toEqual(estilo);
    expect(s.executar('prancha.definir', { estilo: { camadas: { PILAR: { cor: 40 } } } }).ok).toBe(true);
    expect(s.modelo.prancha!.estilo!.camadas!.PILAR).toEqual({ nome: 'PILARES-EST', cor: 40, pena: 0.7 });
    expect(formas(s).estilo!.camadas.PILAR.cor).toBe(40);
    expect(s.executar('prancha.definir', { estilo: { camadas: { PILAR: { cor: 999 } } } }).ok).toBe(false);
    expect(s.executar('prancha.definir', { estiloPadrao: true }).ok).toBe(true);
    expect(s.modelo.prancha!.estilo).toBeUndefined();
    expect(formas(s).estilo).toBeUndefined();
  });
});

describe('símbolos do pilar (K1.4.57)', () => {
  const c: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  it('cada símbolo gera as primitivas esperadas', () => {
    expect(primitivasDoSimbolo('hachura', c).map((q) => `${q.t}:${q.c}`)).toEqual(['hach:PILAR-HACH', 'pl:PILAR']);
    expect(primitivasDoSimbolo('tracejado', c).map((q) => `${q.t}:${q.c}`)).toEqual(['pl:PILAR-NASCE']);
    expect(primitivasDoSimbolo('cruz', c)).toHaveLength(3);
    expect(primitivasDoSimbolo('solido', c).map((q) => q.t)).toEqual(['hach', 'pl']);
    expect(primitivasDoSimbolo('vazio', c)).toHaveLength(1);
  });

  it('padrão mantém a planta; escolher cruz para o que passa troca as hachuras; nasce vira o símbolo pedido', () => {
    const s = edificioExemplo(), base = formas(s);
    const conta = (p: Prancha, c: string, t: string) => p.modelo.filter((q) => q.c === c && q.t === t).length;
    expect(conta(base, 'PILAR-HACH', 'hach')).toBe(12);
    expect(s.executar('prancha.definir', { simbolos: { passa: 'cruz' } }).ok).toBe(true);
    const cruz = formas(s);
    expect(conta(cruz, 'PILAR-HACH', 'hach')).toBe(0);
    expect(conta(cruz, 'PILAR-HACH', 'pl')).toBe(24);
    expect(s.executar('prancha.definir', { simbolos: { passa: 'hachura' } }).ok).toBe(true);
    expect(s.modelo.prancha!.simbolos).toBeUndefined();
    expect(conta(formas(s), 'PILAR-HACH', 'hach')).toBe(12);
  });
});

describe('saídas: detalhes DXF e moldura importada (K1.11.54)', () => {
  const det = detalheDeDxf(DXF, 'Modelo') as DetalheDxf;
  it('leitura: unidades, segmentos, arcos e textos', () => {
    expect(det.nome).toBe('Modelo');
    expect(det.insunits).toBe(4);
    expect(det.linhas).toHaveLength(16);
    expect(det.arcos).toEqual([50, 25, 5, 0, 360]);
    expect(det.textos[0].t).toBe('LOGO');
    expect(mmPorUnidade(4)).toBeCloseTo(1, 12); expect(mmPorUnidade(6)).toBeCloseTo(1000, 12); expect(mmPorUnidade(5)).toBeCloseTo(10, 12);
    expect('erro' in (detalheDeDxf('0\nEOF', 'x') as object)).toBe(true);
  });

  it('inserção com escala, posição e rotação', () => {
    const ps = primitivasDoDetalhe(det, { x: 10, y: 20, escala: 2 });
    const lin = ps.filter((q) => q.t === 'pl');
    expect(lin).toHaveLength(4);
    expect(lin[0].t === 'pl' && lin[0].pts).toEqual([[10, 20], [210, 20]]);
    const c = ps.find((q) => q.t === 'circ');
    expect(c && c.t === 'circ' && [c.centro, c.r]).toEqual([[110, 70], 10]);
    const t = ps.find((q) => q.t === 'txt');
    expect(t && t.t === 'txt' && [t.p, t.h]).toEqual([[20, 30], 6]);
    const rot = primitivasDoDetalhe(det, { x: 0, y: 0, escala: 1, rotacao: 90 }).filter((q) => q.t === 'pl')[0];
    expect(rot.t === 'pl' && rot.pts[1][0]).toBeCloseTo(0, 9);
    expect(rot.t === 'pl' && rot.pts[1][1]).toBeCloseTo(100, 9);
  });

  it('detalhe inserido na folha (todas ou só as escolhidas) sai no DXF', () => {
    const pr = formas();
    expect(inserirDetalhes(pr, undefined, 'formas')).toBe(pr);
    expect(inserirDetalhes(pr, [{ id: 'dt', detalhe: det, x: 5, y: 5, escala: 1, folhas: ['vigas'] }], 'formas')).toBe(pr);
    const com = inserirDetalhes(pr, [{ id: 'dt', detalhe: det, x: 5, y: 5, escala: 1 }], 'formas');
    expect(com.papel.length - pr.papel.length).toBe(6);
    expect(readDxf(escreverDxf(com)).paperSpace!.some((e) => e.type === 'text' && e.text === 'LOGO')).toBe(true);
  });

  it('comando: detalhe e moldura importados do DXF; a moldura troca o retângulo da folha e a legenda', () => {
    const s = edificioExemplo();
    const r = s.executar('prancha.definir', { detalhe: { dxf: DXF, nome: 'Selo', x: 30, y: 30, escala: 1 } });
    expect(r.ok).toBe(true);
    expect(s.modelo.prancha!.detalhes).toHaveLength(1);
    const pr0 = montarConjunto(s.modelo, null, null, { tipos: 'formas' }).pranchas[0];
    expect(pr0.papel.some((q) => q.t === 'txt' && q.s === 'LOGO')).toBe(true);
    const id = s.modelo.prancha!.detalhes![0].id;
    expect(s.executar('prancha.definir', { removerDetalhes: [id] }).ok).toBe(true);
    expect(s.modelo.prancha!.detalhes).toBeUndefined();

    const sem = formas(s);
    expect(s.executar('prancha.definir', { moldura: { dxf: DXF, x: 0, y: 0, escala: 1, modo: 'moldura' } }).ok).toBe(true);
    const mold = formas(s);
    // o retângulo FOLHA/FOLHA-FINA da folha dá lugar ao do DXF; a legenda segue
    expect(mold.papel.some((q) => q.t === 'txt' && q.s === 'LOGO')).toBe(true);
    expect(mold.papel.some((q) => q.t === 'txt' && q.s === 'CONTEÚDO')).toBe(true);
    expect(mold.papel.filter((q) => q.t === 'pl' && q.c === 'FOLHA-FINA' && q.fechada && q.pts[2][0] === sem.W)).toHaveLength(0);
    expect(s.executar('prancha.definir', { moldura: { dxf: DXF, x: 0, y: 0, escala: 1, modo: 'moldura+legenda' } }).ok).toBe(true);
    const tudo = formas(s);
    expect(tudo.papel.some((q) => q.t === 'txt' && q.s === 'CONTEÚDO')).toBe(false);
    expect(tudo.papel.some((q) => q.t === 'txt' && q.s === 'LOGO')).toBe(true);
    expect(s.executar('prancha.definir', { removerMoldura: true }).ok).toBe(true);
    expect(s.modelo.prancha!.moldura).toBeUndefined();
    expect(s.executar('prancha.definir', { detalhe: { dxf: '0\nEOF', x: 0, y: 0 } }).ok).toBe(false);
  });
});

describe('folhas de cargas por caso e de perspectiva (K1.11.62)', () => {
  it('prancha de cargas: uma por grupo, camada por natureza, valores e tabela de casos', () => {
    const s = edificioExemplo();
    const ok = (n: string, p: Record<string, unknown>) => expect(s.executar(n, p).ok).toBe(true);
    ok('caso.criar', { nome: 'Água', natureza: 'Q' });
    ok('carga.ponto', { grupo: 'g_3', ponto: [2, 2], valor: 12, caso: 'G' });
    ok('carga.linha', { grupo: 'g_3', pontos: [[0, 0], [5, 0]], valor: 4, caso: 'Q' });
    ok('carga.ponto', { grupo: 'g_3', ponto: [7, 3], valor: 9, caso: s.modelo.casos![0].id });
    const { pranchas, avisos } = montarConjunto(s.modelo, null, null, { tipos: 'cargas' });
    expect(avisos).toEqual([]);
    expect(pranchas).toHaveLength(1);
    const pr = pranchas[0];
    expect(pr.tipo).toBe('cargas');
    expect(new Set(pr.modelo.filter((q) => q.c.startsWith('CARGA')).map((q) => q.c))).toEqual(new Set(['CARGA-G', 'CARGA-Q', 'CARGA-ADIC']));
    const t = pr.modelo.flatMap((q) => (q.t === 'txt' ? [q.s] : []));
    expect(t).toEqual(expect.arrayContaining(['12,00 kN', '4,00 kN/m', '9,00 kN']));
    expect(pr.papel.some((q) => q.t === 'txt' && q.s === 'SCC')).toBe(true);
    // o conjunto completo não inclui a folha avulsa
    expect(montarConjunto(s.modelo, null, null, { tipos: 'todas' }).pranchas.some((p) => p.tipo === 'cargas')).toBe(false);
    // nenhum erro nos escritores
    expect(readDxf(escreverDxf(pr)).layers.some((l) => l.name === 'CARGA-ADIC')).toBe(true);
    expect(montarConjunto(edificioExemplo().modelo, null, null, { tipos: 'cargas' }).avisos[0]).toMatch(/não há cargas/);
  });

  it('perspectiva axonométrica: segmentos dos contornos dos elementos, cabem na área da folha A3', () => {
    const s = edificioExemplo();
    const { pranchas } = montarConjunto(s.modelo, null, null, { tipos: 'perspectiva' });
    expect(pranchas).toHaveLength(1);
    const pr = pranchas[0];
    expect(pr.tipo).toBe('perspectiva');
    expect(pr.formato).toBe('A3');
    const seg = pr.papel.filter((q) => q.t === 'pl' && ['PILAR', 'VIGA', 'LAJE'].includes(q.c));
    expect(seg.length).toBeGreaterThan(200);
    for (const q of seg) if (q.t === 'pl') for (const [x, y] of q.pts) { expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(pr.W); expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(pr.H); }
    // vertical continua vertical (pilares) em projeção ortográfica: x igual nas duas pontas
    const pil = seg.filter((q) => q.t === 'pl' && q.c === 'PILAR' && Math.abs(q.pts[0][0] - q.pts[1][0]) < 1e-6 && Math.abs(q.pts[0][1] - q.pts[1][1]) > 1);
    expect(pil.length).toBeGreaterThan(10);
    expect(svgPrancha(pr)).toMatch(/^<svg/);
  });
});

describe('folha de resultados: mapa de isovalores por pavimento (V6f, C12.4)', { timeout: 120000 }, () => {
  const s = edificioExemplo(), b = s.modelo, an = analisarEdificio(b), dim = dimensionarEdificio(b, an);
  const { pranchas, avisos } = montarConjunto(b, an, dim, { tipos: 'resultados' });

  it('uma folha SCR por pavimento com laje calculada, com bandas, isolinhas e legenda', () => {
    expect(avisos).toEqual([]);
    expect(pranchas).toHaveLength(pavimentosComMapa(b, an).length);
    for (const pr of pranchas) {
      expect(pr.tipo).toBe('resultados');
      expect(pr.papel.some((q) => q.t === 'txt' && q.s === 'SCR')).toBe(true);
      const hach = pr.modelo.filter((q) => q.t === 'hach');
      expect(hach.length).toBeGreaterThan(5);
      expect(hach.every((q) => q.c.startsWith('ISO-') && q.t === 'hach' && q.g! > 0.3 && q.g! < 1)).toBe(true);
      expect(pr.modelo.some((q) => q.c === 'ISOLINHAS')).toBe(true);
      expect(pr.modelo.some((q) => q.t === 'txt' && q.s.startsWith('máx.'))).toBe(true);
    }
  });

  it('as bandas cobrem a área do campo (conferida com o mesmo mapa da aba Isovalores)', () => {
    const pv = pavimentosComMapa(b, an)[0], pr = pranchas[0];
    const qp = combinacoesEdificio(b, an).find((c) => c.tipo === 'QP')!;
    const campo = campoDoPavimento(b, an, dim, { pavimento: pv.id, grandeza: 'uz', hipotese: hipoteseDeCombinacao(qp) }).campo!;
    const area = pr.modelo.reduce((t, q) => t + (q.t === 'hach' ? Math.abs(areaPoligono(q.pts)) : 0), 0);
    expect(area).toBeCloseTo(areaDoCampo(campo), 6);
    // tabela de legenda: uma linha por banda, com a camada ISO correspondente
    const leg = pr.papel.filter((q) => q.t === 'txt' && /^ISO-\d+$/.test(q.s));
    expect(leg.length).toBeGreaterThanOrEqual(5);
  });

  it('escritores: camadas ISO no DXF e cinzas diferentes no PDF e no SVG', () => {
    const pr = pranchas[0];
    const camadas = readDxf(escreverDxf(pr)).layers.map((l) => l.name);
    expect(camadas.filter((c) => c.startsWith('ISO-')).length).toBeGreaterThanOrEqual(5);
    expect(camadas).toContain('ISOLINHAS');
    const pdf = txt(escreverPdf([pr]));
    expect(new Set(pdf.match(/\n0\.\d+ g\n/g) ?? []).size).toBeGreaterThanOrEqual(4);
    const cores = new Set((svgPrancha(pr).match(/fill="#[0-9a-f]{6}" stroke="none"/g) ?? []));
    expect(cores.size).toBeGreaterThanOrEqual(4);
    // sem análise: sem folha
    expect(montarConjunto(b, null, null, { tipos: 'resultados' }).pranchas).toHaveLength(0);
  });

  it('o conjunto completo não inclui a folha avulsa e a grandeza de cálculo dispensa hipótese', () => {
    expect(montarConjunto(b, an, dim, { tipos: 'todas' }).pranchas.some((p) => p.tipo === 'resultados')).toBe(false);
    const mx = montarPranchasResultados(b, an, dim, { grandeza: 'MxInf' });
    expect(mx.length).toBe(pranchas.length);
    expect(mx[0].titulo).toContain('Resultados');
  });
});
