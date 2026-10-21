import { beforeAll, describe, expect, it } from 'vitest';
import { auditDrawing, readDxf } from 'nasjidwg';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import type { Sessao } from '../commands';
import { ganchoNoventa } from '../building/detalhamento';
import { cobrimentoFundacao } from '../building/materiais';
import { edificioExemplo } from './exemplo';
import { agruparFundacoes, formaDe, montarPranchasFundacao, siglaFundacao } from './fundacao';
import { barrasDoBloco, blocoDe, estacasDe, sapataDe } from './fundacaoDetalhe';
import { montarConjunto } from './conjunto';
import { cargasDosPilares } from './locacao';
import { escreverDxf } from './dxf';
import { escreverPdf } from './pdf';
import { svgPrancha } from './svg';
import type { Prancha } from './prancha';

let s: Sessao, an: AnaliseEdificio, dim: Dimensionamento;

/** Edifício de exemplo (12 pilares) com 5 sapatas (uma de divisa com viga de equilíbrio), 3 blocos e 2 tubulões. */
beforeAll(() => {
  s = edificioExemplo();
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); if (!r.ok) throw new Error(`${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`); return r; };
  ok('fundacao.terreno', { sigmaAdm: 300, estacas: [{ id: 'e1', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
  const P = s.modelo.pilares;
  ok('pilar.editar', { id: P[0].id, ajuste: 'o' });
  ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata', posicao: 'divisa' });
  ok('fundacao.criar', { pilar: P[3].id, tipo: 'sapata' });
  ok('vigaFundacao.criar', { tipo: 'equilibrio', ini: s.modelo.fundacao!.elementos[0].id, fim: s.modelo.fundacao!.elementos[1].id });
  for (const p of [P[1], P[2], P[4], P[5]]) ok('fundacao.criar', { pilar: p.id, tipo: 'sapata' });
  for (const p of P.slice(6, 9)) ok('fundacao.criar', { pilar: p.id, tipo: 'bloco', estaca: { id: 'e1' } });
  for (const p of P.slice(9, 11)) ok('fundacao.criar', { pilar: p.id, tipo: 'tubulao', cota: -4 });
  an = analisarEdificio(s.modelo);
  dim = dimensionarEdificio(s.modelo, an);
});

const textos = (pr: Prancha) => [...pr.papel, ...pr.modelo].flatMap((q) => (q.t === 'txt' ? [q.s] : []));
const porTitulo = (prs: Prancha[], re: RegExp) => prs.find((p) => re.test(p.titulo))!;
const quantTotal = (pr: Prancha) => pr.aco!.tabela.reduce((t, l) => t + l.quant, 0);

describe('pranchas de fundação (FU5)', () => {
  it('siglas: SFS (direta), SFN (indireta), SFM (mista); locação dos pilares é SLP', () => {
    expect(siglaFundacao(['sapata'])).toBe('SFS');
    expect(siglaFundacao(['bloco', 'tubulao'])).toBe('SFN');
    expect(siglaFundacao(['sapata', 'bloco'])).toBe('SFM');
    const prs = montarPranchasFundacao(s.modelo, an, dim);
    expect(porTitulo(prs, /sapatas/).sigla).toBe('SFS');
    expect(porTitulo(prs, /blocos/).sigla).toBe('SFN');
    expect(porTitulo(prs, /tubulões/).sigla).toBe('SFN');
    expect(prs.every((p) => p.tipo === 'fundacao')).toBe(true);
    expect(textos(porTitulo(prs, /sapatas/))).toContain('SFS');
  });

  it('elementos iguais agrupados "B1=B3" (mesma geometria e armadura); diferentes ficam separados', () => {
    const { grupos, semDesenho } = agruparFundacoes(dim.fundacoes!);
    expect(semDesenho).toEqual([]);
    const blocos = grupos.filter((g) => g.tipo === 'bloco').map((g) => g.els.map((e) => e.nome));
    expect(blocos).toEqual([['B1', 'B3'], ['B2']]);
    // sapatas de dimensões diferentes não se misturam
    const sap = grupos.filter((g) => g.tipo === 'sapata');
    for (const g of sap) { const f0 = sapataDe(g.els[0])!; for (const e of g.els) expect([sapataDe(e)!.A, sapataDe(e)!.B, sapataDe(e)!.h]).toEqual([f0.A, f0.B, f0.h]); }
  });

  it('locação e planta de cargas: uma por nível, rótulos h0/h1/df e ha/hb/n×estaca, vigas, tabela com todos os pilares', () => {
    const prs = montarPranchasFundacao(s.modelo, an, dim).filter((p) => /locação/.test(p.titulo));
    expect(prs).toHaveLength(2); // assentamentos -1,50 m e -4,00 m
    const pr = prs.find((p) => /-1,50/.test(p.titulo))!;
    expect(pr.janela).toBeDefined();
    const t = textos(pr);
    expect(t.some((x) => /^S1 · P1 \/ 20×50 cm$/.test(x))).toBe(true);
    for (const x of ['h0 = 20 cm', 'h1 = 40 cm', 'df = 150 cm', 'ha = 0 cm', '1×ø40', '2×ø40']) expect(t).toContain(x);
    expect(t.some((x) => /^B2 · P8/.test(x))).toBe(true);
    expect(t).toContain('VF1 20×40');
    for (const x of ['PILARES E CARGAS — k CARACT. (RARA), d CÁLCULO (ELU) — kN, kN·m', 'FUNDAÇÃO E BLOCO (cm)', 'ELEMENTOS IGUAIS', 'B1=B3', 'Nk,máx', 'Nd,máx', 'SFM']) expect(t).toContain(x);
    // uma linha por pilar apoiado (9 no nível -1,50: 7 sapatas e blocos... P1 a P9), cargas iguais às da locação dos pilares
    const cs = cargasDosPilares(s.modelo, an);
    const tp = pr.papel.flatMap((q) => (q.t === 'txt' ? [q.s] : []));
    for (const nome of ['P1', 'P5', 'P9']) {
      const i = tp.indexOf(nome), c = cs.find((x) => x.pilar === nome)!;
      expect(tp[i + 1]).toBe('20×50');
      expect(tp[i + 4]).toBe(c.k.Nmax.toFixed(2).replace('.', ','));
    }
    // o nível mais profundo tem só os tubulões
    const fundo = prs.find((p) => /-4,00/.test(p.titulo))!;
    expect(fundo.elementos).toEqual(['T1', 'T2']);
    expect(textos(fundo).some((x) => /^øf = \d+ cm$/.test(x))).toBe(true);
  });

  it('sapatas: planta e corte 1:50, malhas "n×q Nk φ c/s C=", posições contadas, h0/h1/df cotados', () => {
    const pr = porTitulo(montarPranchasFundacao(s.modelo, an, dim), /sapatas/);
    const t = textos(pr);
    for (const x of ['PLANTA ESC 1:50', 'CORTE ESC 1:50', 'TABELA DE AÇO', 'RESUMO DE AÇO', 'INDICADA']) expect(t).toContain(x);
    expect(t.some((x) => /^S1=?/.test(x))).toBe(true);
    expect(t.filter((x) => /^(\d+×)?\d+ N\d+ φ\d+,\d c\/\d+ C=\d+$/.test(x)).length).toBeGreaterThanOrEqual(2 * 6);
    expect(t.some((x) => /^h0=\d+$/.test(x)) && t.some((x) => /^h1=\d+$/.test(x)) && t.some((x) => /^df=\d+$/.test(x))).toBe(true);
    expect(t.some((x) => /Solo compactado/.test(x))).toBe(true);
    // barras contadas: Σ (n_x + n_y) de cada sapata
    const sap = dim.fundacoes!.filter((e) => e.tipo === 'sapata');
    expect(quantTotal(pr)).toBe(sap.reduce((n, e) => { const f = sapataDe(e)!; return n + (f.flex.x.bars?.n ?? 0) + (f.flex.y.bars?.n ?? 0); }, 0));
    // comprimento = lado − 2 cobrimentos, ao cm
    const cob = cobrimentoFundacao(s.modelo), c0 = Math.round((sapataDe(sap[0])!.A - 2 * cob) * 100);
    expect(pr.aco!.tabela.some((l) => l.cUnit === c0)).toBe(true);
    // volume e forma da folha = soma dos elementos
    expect(pr.aco!.concreto).toBeCloseTo(sap.reduce((v, e) => v + e.volume, 0), 9);
    expect(pr.aco!.forma).toBeCloseTo(sap.reduce((v, e) => v + formaDe(e), 0), 9);
    expect(pr.aco!.concreto).toBeGreaterThan(0);
    // arranques na mesma folha, sem repetir o aço dos pilares
    expect(t.some((x) => /^NÍVEL /.test(x))).toBe(true);
    expect(t.some((x) => /C=VAR$/.test(x))).toBe(true);
  });

  it('blocos: legenda 1:25, estacas, tirantes e estribos; posições = barras do cálculo; iguais somam', () => {
    const pr = porTitulo(montarPranchasFundacao(s.modelo, an, dim), /blocos/);
    const t = textos(pr);
    for (const x of ['LEGENDA DOS BLOCOS ESC 1:25', '(1×ø40) B1=B3', '(2×ø40) B2', 'hb=70', 'hb=65', 'ha=0']) expect(t).toContain(x);
    expect(t.some((x) => /(: |^)2×\d+ N\d+ φ\d+,\d( c\/\d+)? C=\d+$/.test(x))).toBe(true); // B1=B3: 2 blocos × n barras
    const cob = cobrimentoFundacao(s.modelo), blocos = dim.fundacoes!.filter((e) => e.tipo === 'bloco');
    const esperado = blocos.reduce((n, e) => n + barrasDoBloco(blocoDe(e)!, estacasDe(e), cob).reduce((m, b) => m + b.n, 0), 0);
    expect(quantTotal(pr)).toBe(esperado);
    // tirante do bloco de 2 estacas: distância + ø − 2 cobrimentos + 2 ganchos (ao cm)
    const b2 = blocos.find((e) => e.nome === 'B2')!, est = estacasDe(b2)!, tie = blocoDe(b2)!.ties[0];
    const dist = Math.hypot(est.coords[1][0] - est.coords[0][0], est.coords[1][1] - est.coords[0][1]);
    const c = barrasDoBloco(blocoDe(b2)!, est, cob).find((x) => x.rot.startsWith('Tirante'))!.C;
    expect(c).toBe(Math.round((dist + est.D - 2 * cob + 2 * ganchoNoventa(tie.bars!.phi)) * 100));
    expect(pr.aco!.forma).toBeCloseTo(blocos.reduce((v, e) => v + formaDe(e), 0), 9);
  });

  it('tubulões: fuste e base, marcas C.T / C.A / C.T.B, sem aço de flexão', () => {
    const pr = porTitulo(montarPranchasFundacao(s.modelo, an, dim), /tubulões/);
    const t = textos(pr);
    expect(t.some((x) => /^C\.T\.B -?\d/.test(x))).toBe(true);
    expect(t.some((x) => /^C\.T = C\.A|^C\.A /.test(x))).toBe(true);
    expect(pr.aco!.peso).toBe(0);
    expect(pr.aco!.concreto).toBeCloseTo(dim.fundacoes!.filter((e) => e.tipo === 'tubulao').reduce((v, e) => v + e.volume, 0), 9);
  });

  it('vigas de fundação: elevação, seção, barras "n Nk φ C=", ancoragem editável (C11.45) muda o comprimento e avisa abaixo de lb', () => {
    const v0 = dim.vigasFundacao![0];
    const pr = porTitulo(montarPranchasFundacao(s.modelo, an, dim), /vigas de fundação/);
    const t = textos(pr);
    for (const x of ['VF1', 'SEÇÃO A-A ESC 1:25', 'TABELA DE AÇO']) expect(t).toContain(x);
    expect(t.some((x) => /^ELEVAÇÃO ESC 1:\d+$/.test(x))).toBe(true);
    expect(t.some((x) => /^Superior: \d+ N\d+ φ\d+,\d C=\d+$/.test(x))).toBe(true);
    expect(v0.armadura.ancoragem.editada).toEqual({ ini: false, fim: false });
    expect(v0.armadura.ancoragem.ini).toBeCloseTo(v0.armadura.lb, 9);
    const sup = pr.aco!.tabela.find((l) => l.phi === v0.armadura.sup.barras!.phi && l.quant === v0.armadura.sup.barras!.n)!;
    // edita a ancoragem da ponta inicial para 1,00 m
    expect(s.executar('vigaFundacao.editar', { id: s.modelo.fundacao!.vigas![0].id, ancoragem: { ini: 1 } }).ok).toBe(true);
    const dim2 = dimensionarEdificio(s.modelo, an), v1 = dim2.vigasFundacao![0];
    expect(v1.armadura.ancoragem).toMatchObject({ ini: 1, editada: { ini: true, fim: false } });
    const pr2 = porTitulo(montarPranchasFundacao(s.modelo, an, dim2), /vigas de fundação/);
    const sup2 = pr2.aco!.tabela.find((l) => l.phi === v1.armadura.sup.barras!.phi && l.quant === v1.armadura.sup.barras!.n)!;
    expect(sup2.cUnit - sup.cUnit).toBeCloseTo((1 - v0.armadura.lb) * 100, -0.5);
    expect(textos(pr2).some((x) => /Ancoragem das barras superiores: 100 cm \/ \d+ cm .*editada/.test(x))).toBe(true);
    // abaixo do lb: aviso FUND_VIGA_ANCORAGEM, sem reprovar
    expect(s.executar('vigaFundacao.editar', { id: s.modelo.fundacao!.vigas![0].id, ancoragem: { fim: 0.1 } }).ok).toBe(true);
    const dim3 = dimensionarEdificio(s.modelo, an), v3 = dim3.vigasFundacao![0];
    expect(v3.mensagens.some((m) => /^Viga de fundação: ancoragem informada/.test(m))).toBe(true);
    expect(v3.status).toBe(v0.status);
    // 0 volta ao lb calculado
    expect(s.executar('vigaFundacao.editar', { id: s.modelo.fundacao!.vigas![0].id, ancoragem: { ini: 0, fim: 0 } }).ok).toBe(true);
    expect(s.modelo.fundacao!.vigas![0].ancoragem).toBeUndefined();
  });

  it('quantitativos: concreto, forma, aço e estacas; aço total = soma das folhas de detalhamento', () => {
    const prs = montarPranchasFundacao(s.modelo, an, dim);
    const q = prs.at(-1)!;
    expect(q.titulo).toBe('Fundação — quantitativos');
    const t = textos(q);
    for (const x of ['QUANTITATIVOS POR ELEMENTO', 'ESTACAS', 'RESUMO DE AÇO']) expect(t).toContain(x);
    const det = prs.filter((p) => /sapatas|blocos|tubulões|vigas de fundação/.test(p.titulo));
    expect(q.aco!.peso).toBeCloseTo(det.reduce((n, p) => n + p.aco!.peso, 0), 6);
    expect(q.aco!.concreto).toBeCloseTo(dim.fundacoes!.reduce((v, e) => v + e.volume, 0) + dim.vigasFundacao!.reduce((v, e) => v + e.volume, 0), 9);
    expect(t.some((x) => /^TOTAL: 4 estacas/.test(x))).toBe(true);
    // a tabela por elemento traz o aço de cada grupo e o total confere com a folha
    const tot = t.find((x) => /^TOTAL: concreto /.test(x))!;
    expect(tot).toContain(`aço ${q.aco!.peso.toFixed(2).replace('.', ',')} kg`);
  });

  it('paginação: formato menor leva os elementos a mais de uma folha, com o resumo e a tabela de cada folha', () => {
    expect(s.executar('prancha.definir', { armacao: { formato: 'A3' } }).ok).toBe(true);
    const prs = montarPranchasFundacao(s.modelo, an, dim);
    const sap = prs.filter((p) => /^Fundação — sapatas/.test(p.titulo));
    expect(sap.length).toBeGreaterThan(1);
    expect(sap.map((p) => p.titulo)).toEqual(sap.map((_, i) => `Fundação — sapatas (${i + 1}/${sap.length})`));
    expect(sap.every((p) => p.formato === 'A3' || p.avisos.length > 0)).toBe(true);
    const todos = sap.flatMap((p) => p.elementos ?? []).filter((n) => /^S\d/.test(n));
    expect(new Set(todos).size).toBe(todos.length);
    expect(todos.sort()).toEqual(dim.fundacoes!.filter((e) => e.tipo === 'sapata').map((e) => e.nome).sort());
    s.executar('prancha.definir', { armacao: { formato: 'auto' } });
    expect(s.modelo.prancha?.armacao).toBeUndefined();
  });

  it('escala dos detalhes (1:25) e tubulões/blocos sem cálculo: aviso e folha ausente', () => {
    expect(s.executar('prancha.definir', { armacao: { escalaFundacao: 25 } }).ok).toBe(true);
    const prs = montarPranchasFundacao(s.modelo, an, dim);
    expect(textos(porTitulo(prs, /sapatas/))).toContain('PLANTA ESC 1:25');
    s.executar('prancha.definir', { armacao: { escalaFundacao: 50 } });
    expect(s.modelo.prancha?.armacao).toBeUndefined();
    expect(montarPranchasFundacao(s.modelo, an, { ...dim, fundacoes: [] })).toEqual([]);
  });

  it('conjunto: tipo fundacao sozinho ou em "todas" (depois da locação, antes das formas); aviso sem fundações; DXF, PDF e SVG válidos', () => {
    const só = montarConjunto(s.modelo, an, dim, { tipos: 'fundacao' });
    expect(só.avisos).toEqual([]);
    expect(só.pranchas.length).toBeGreaterThanOrEqual(6);
    só.pranchas.forEach((p, i) => expect(textos(p)).toContain(`${String(i + 1).padStart(2, '0')}/${String(só.pranchas.length).padStart(2, '0')}`));
    const todas = montarConjunto(s.modelo, an, dim, { tipos: 'todas' });
    const tipos = todas.pranchas.map((p) => p.tipo);
    expect(tipos.slice(0, 2)).toEqual(['locacao', 'fundacao']);
    expect(tipos.indexOf('formas')).toBeGreaterThan(tipos.lastIndexOf('fundacao'));
    expect(textos(todas.pranchas[0])).toContain('SLP');
    // sem fundações lançadas
    const limpo = edificioExemplo();
    const a2 = analisarEdificio(limpo.modelo), d2 = dimensionarEdificio(limpo.modelo, a2);
    expect(montarConjunto(limpo.modelo, a2, d2, { tipos: 'fundacao' }).avisos.join(' ')).toMatch(/lance fundações/);
    expect(montarConjunto(limpo.modelo, a2, d2, { tipos: 'todas' }).avisos).toEqual([]);
    // sem cálculo
    expect(montarConjunto(s.modelo, null, null, { tipos: 'fundacao' }).avisos.join(' ')).toMatch(/calcule/);
    // escritores
    const pdf = Array.from(escreverPdf(só.pranchas), (c) => String.fromCharCode(c)).join('');
    expect((pdf.match(/\/Type \/Page\b/g) ?? []).length).toBe(só.pranchas.length);
    for (const pr of só.pranchas) {
      const d = readDxf(escreverDxf(pr));
      expect(d.warnings).toEqual([]);
      expect(auditDrawing(d).filter((f) => f.severity === 'error')).toEqual([]);
      expect((d.paperSpace ?? []).filter((e) => e.type === 'viewport')).toHaveLength(pr.janela ? 2 : 1);
      expect(svgPrancha(pr)).toMatch(/^<svg/);
    }
  });
});
