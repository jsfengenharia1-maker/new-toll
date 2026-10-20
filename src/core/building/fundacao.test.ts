import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, replay, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { calcularFundacoes, cargasPorPilar, cotaTerreno, niveisFundacao, parametrosFundacao, resumoFundacao } from './fundacao';
import { revisarEdificio } from './revisao';
import { edificioVazio } from './types';
import { cobrimentoFundacao, fckDe } from './materiais';
import { designSupport } from '../foundation';
import { basePressure, designFooting, isFooting, sptSigma, type FootingResult } from '../footings';
import { isCaisson } from '../caissons';
import { defaultFoundationParams, pileLoads, type Boring } from '../piles';
import { dimensionar } from '../../cli/run';
import { filtrarDim } from '../../cli/mcp';

const LEITURAS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35].map((N) => ({ N, solo: 'silteArenoso' }));

/** Edifício padrão com 4 pilares 30 × 30 em 4 × 4 m, vigas no tipo e lajes maciças. */
function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('lote', { comandos: [[0, 0], [4, 0], [4, 4], [0, 4]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok('lote', { comandos: [[[0, 0], [4, 0]], [[0, 4], [4, 4]], [[0, 0], [0, 4]], [[4, 0], [4, 4]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  ok('sondagem.criar', { nome: 'SP-01', x: 2, y: 2, nivelAgua: 12, leituras: LEITURAS });
  ok('fundacao.terreno', { sigmaAdm: 250, estacas: [{ id: 'e_hc', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }, { id: 'e_sp', tipo: 'helice', D: 40, modo: 'sondagem' }] });
  return { s, ok, P: s.modelo.pilares };
}

describe('fundações do edifício (FU1): adaptador', () => {
  it('sapata centrada: mesma carga e mesmo resultado do módulo Fundações', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata' });
    const b = s.modelo, an = analisarEdificio(b);
    const [r] = calcularFundacoes(b, an);
    expect(r.status, r.mensagens.join(' ')).toBe('ok');
    // módulo: mesma carga (pilar sem giro: eixos iguais), mesmos parâmetros
    const ld = cargasPorPilar(b, an).get(P[0].id)!;
    const params = { ...parametrosFundacao(b), ftDepth: cotaTerreno(b) + 1.5, ftSigmaMode: 'informada' as const, ftSigmaAdm: 250 };
    const ref = designSupport({ ...ld, kind: 'sapata', ap: 0.3, bp: 0.3 }, { boring: b.fundacao!.sondagens[0], borings: b.fundacao!.sondagens, loads: [ld], params });
    const f = ref.footing as FootingResult;
    expect(isFooting(f)).toBe(true);
    expect([r.dims.A, r.dims.B, r.dims.h, r.dims.h0]).toEqual([f.A, f.B, f.h, f.h0]);
    expect(r.carga!.Nk).toBe(ld.Nk);
    expect(r.profundidade).toBe(1.5);
    expect(r.centro[0]).toBeCloseTo(0, 6);
    expect(r.excentricidade).toEqual([0, 0]);
    // σadm ≥ N/(A·B) com o peso próprio
    expect((ld.Nk + f.W) / (f.A * f.B)).toBeLessThanOrEqual(250 + 1e-6);
    // resultado anexado ao dimensionamento e resumo para o MCP
    const dim = dimensionarEdificio(b, an);
    expect(dim.fundacoes!.map((x) => x.resumo)).toEqual([r.resumo]);
    expect(resumoFundacao(r)).not.toHaveProperty('projeto');
    expect(dimensionarEdificio(b, an, { fundacao: false }).fundacoes).toBeUndefined();
  });

  it('sapata de divisa: pilar com a face na borda, e = (A − ap)/2 como momento (cálculo manual) e erro sem viga de equilíbrio', () => {
    const p = { ...defaultFoundationParams(), ftSigmaMode: 'informada' as const, ftSigmaAdm: 300 };
    const r = designFooting({ Nk: 300, NkMin: 300, Mx: 0, My: 0, ap: 0.6, bp: 0.3, edge: [1, 0] }, p);
    expect(isFooting(r)).toBe(true);
    const f = r as FootingResult;
    const e = (f.A - 0.6) / 2;
    expect(f.colOffset).toEqual([e, 0]);
    // N total com o peso; excentricidade da resultante = Nk·e / (Nk + W)
    const N = 300 + f.W, ex = (300 * e) / N;
    expect(f.cases[0].ex).toBeCloseTo(ex, 9);
    // tensão máxima (uma direção): trapézio no núcleo central, triângulo fora dele
    const sMax = ex <= f.A / 6 ? (N / (f.A * f.B)) * (1 + (6 * ex) / f.A) : (2 * N) / (3 * f.B * (f.A / 2 - ex));
    expect(f.cases[0].sigmaMax).toBeCloseTo(sMax, 6);
    expect(f.cases[0].sigmaMax).toBeLessThanOrEqual(300 + 1e-6);
    expect(f.cases[0].compressed).toBeGreaterThanOrEqual(2 / 3 - 1e-9);
    // balanço único (A − ap) em x → h rígida ≥ 2/3 do maior balanço; contorno C sem a face da divisa
    expect(f.hRigid).toBeCloseTo((2 * Math.max(f.A - 0.6, (f.B - 0.3) / 2)) / 3, 9);
    expect(f.punch.tauSd0).toBeCloseTo((1.4 * 300) / 1000 / ((2 * 0.6 + 0.3) * f.d), 9);
    // a mesma base centrada tem pressão uniforme
    const c = basePressure(f.A, f.B, N, 0, 0)!;
    expect(c.sigmaMax).toBeLessThan(f.cases[0].sigmaMax);
    // no edifício: centro deslocado para dentro e erro FUND_EXC_SEM_VIGA
    const { s, ok, P } = predio();
    ok('pilar.editar', { id: P[0].id, ajuste: 'o' }); // face oeste na divisa (x = 0)
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata', posicao: 'divisa' });
    const b = s.modelo;
    expect(b.fundacao!.elementos[0].lado).toEqual([-1, 0]);
    const an = analisarEdificio(b);
    const [rd] = calcularFundacoes(b, an);
    const rv = revisarEdificio(b, an, { ...dimensionarEdificio(b, an, { fundacao: false }), fundacoes: [rd] });
    expect(rv.itens.some((x) => x.tipo === 'fundacao' && x.codigo === 'FUND_EXC_SEM_VIGA' && x.nivel === 'erro')).toBe(true);
    expect(rd.status).toBe('fail');
    if (rd.dims.A) {
      // a face oeste do pilar (x = 0) coincide com a borda oeste da sapata
      expect(rd.centro[0] - rd.dims.A / 2).toBeCloseTo(0, 6);
      expect(rd.excentricidade[0]).toBeCloseTo(-(rd.dims.A - 0.3) / 2, 9);
    }
  });

  it('sapata de canto: excentricidade nas duas direções; CEB-70 com o balanço real', () => {
    const p = { ...defaultFoundationParams(), ftSigmaMode: 'informada' as const, ftSigmaAdm: 300 };
    const canto = designFooting({ Nk: 50, NkMin: 50, Mx: 0, My: 0, ap: 0.8, bp: 0.6, edge: [1, -1] }, p) as FootingResult;
    expect(isFooting(canto)).toBe(true);
    expect(canto.colOffset[0]).toBeCloseTo((canto.A - 0.8) / 2, 9);
    expect(canto.colOffset[1]).toBeCloseTo(-(canto.B - 0.6) / 2, 9);
    // flexão composta oblíqua: no núcleo central, σmáx = N/(A·B)·(1 + 6ex/A + 6ey/B)
    const N = 50 + canto.W, ex = (50 * canto.colOffset[0]) / N, ey = (50 * -canto.colOffset[1]) / N;
    if (ex / canto.A + ey / canto.B <= 1 / 6) expect(canto.cases[0].sigmaMax).toBeCloseTo((N / (canto.A * canto.B)) * (1 + (6 * ex) / canto.A + (6 * ey) / canto.B), 6);
    // carga maior: o canto sem viga não fecha (área comprimida < 2/3)
    expect(isFooting(designFooting({ Nk: 600, NkMin: 600, Mx: 0, My: 0, ap: 0.3, bp: 0.3, edge: [1, 1] }, p))).toBe(false);
    expect(canto.cases[0].ey).toBeGreaterThan(0);
    // mesma base imposta centrada: momento de flexão menor que o da excêntrica (balanço A − ap contra (A − ap)/2)
    const cen = designFooting({ Nk: 50, NkMin: 50, Mx: 0, My: 0, ap: 0.8, bp: 0.6, fixed: { A: canto.A, B: canto.B, h: canto.h } }, p) as FootingResult;
    expect(cen.fixed).toBe(true);
    expect(cen.flex.x.Md).toBeLessThan(canto.flex.x.Md);
    // dimensões impostas pequenas demais: sem solução, com o motivo
    const peq = designFooting({ Nk: 150, NkMin: 150, Mx: 0, My: 0, ap: 0.5, bp: 0.5, fixed: { A: 0.6, B: 0.6 } }, p);
    expect(isFooting(peq)).toBe(false);
    expect(peq.messages[0]).toMatch(/dimensões impostas/);
  });

  it('σadm informada × estimada pelo SPT (N̄/50) e σadm própria do elemento', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata' });
    ok('fundacao.criar', { pilar: P[1].id, tipo: 'sapata', sigmaAdm: 400 });
    ok('fundacao.terreno', { sigmaModo: 'sondagem' });
    const b = s.modelo, an = analisarEdificio(b);
    const [r0, r1] = calcularFundacoes(b, an);
    expect(r1.sigmaAdm).toBe(400);
    expect(r1.sigmaFonte).toBe('informada no elemento');
    const furo = b.fundacao!.sondagens[0] as Boring;
    const esp = sptSigma({ ...furo, meters: furo.meters.map((m) => ({ N: m.N, soil: m.soil })) }, 1.5, 2 * Math.min(r0.dims.A!, r0.dims.B!), 50, 20)!;
    expect(r0.sigmaAdm).toBeCloseTo(esp.sigma, 6);
    expect(r0.sigmaFonte).toMatch(/SPT/);
    // sem σadm no terreno informado: erro FUND_SEM_SIGMA
    ok('fundacao.terreno', { sigmaModo: 'informada', limpar: ['sigmaAdm'] });
    const [x] = calcularFundacoes(s.modelo, an);
    expect(x.mensagens[0]).toMatch(/^Fundação sem σadm/);
    expect(revisarEdificio(s.modelo, an, { ...dimensionarEdificio(s.modelo, an) }).itens.some((i) => i.codigo === 'FUND_SEM_SIGMA')).toBe(true);
  });

  it('bloco sobre estacas: capacidade informada (n mínimo) e pela sondagem igual ao módulo', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'bloco', estaca: { id: 'e_hc' } });
    ok('fundacao.criar', { pilar: P[1].id, tipo: 'bloco', estaca: { id: 'e_sp' } });
    const b = s.modelo, an = analisarEdificio(b);
    const [ri, rs] = calcularFundacoes(b, an);
    const ld = cargasPorPilar(b, an).get(P[0].id)!;
    const p = parametrosFundacao(b);
    // menor n com Nmáx ≤ 500 kN
    const nEsp = [1, 2, 3, 4, 5, 6].find((n) => { const pl = pileLoads({ ...ld, Mx: ri.carga!.Mx, My: ri.carga!.My }, n, 0.4, p.spacingInSitu, p.blockWeightPct, { unf: p.gammaF, fav: 1 }); return pl.Nmax <= 500 && pl.Nmin >= 0; });
    expect(ri.dims.n).toBe(nEsp);
    expect(ri.status, ri.mensagens.join(' ')).toBe('ok');
    expect(ri.projeto!.cap!.n).toBe(nEsp);
    // pela sondagem: mesmo resultado do módulo com o tipo e o diâmetro do terreno e o arrasamento na cota do bloco
    const ld1 = cargasPorPilar(b, an).get(P[1].id)!;
    const params = { ...p, cutoff: 1.5, types: ['helice' as const], diameters: [40], precastDiameters: [40] };
    const ref = designSupport({ ...ld1, kind: 'estacas', ap: 0.3, bp: 0.3, pile: { type: 'helice', D: 40 } }, { boring: b.fundacao!.sondagens[0], borings: b.fundacao!.sondagens, loads: [ld1], params });
    expect(rs.dims.n).toBe(ref.pile!.n);
    expect(rs.dims.L).toBe(ref.pile!.L);
    expect(rs.dims.h).toBe(ref.cap!.h);
  });

  it('tubulão centrado: σadm informada, mesmo resultado do módulo; divisa recusada', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[2].id, tipo: 'tubulao', cota: -4 });
    expect(s.executar('fundacao.criar', { pilar: P[3].id, tipo: 'tubulao', posicao: 'divisa', lado: [1, 0] }).erros[0].codigo).toBe('TUBULAO_CENTRADO');
    const b = s.modelo, an = analisarEdificio(b);
    const [t] = calcularFundacoes(b, an);
    expect(t.status, t.mensagens.join(' ')).toBe('ok');
    const ld = cargasPorPilar(b, an).get(P[2].id)!;
    const ref = designSupport({ ...ld, kind: 'tubulao', ap: 0.3, bp: 0.3 }, { boring: b.fundacao!.sondagens[0], borings: b.fundacao!.sondagens, loads: [ld], params: { ...parametrosFundacao(b), tbSigmaMode: 'informada', tbSigmaAdm: 250, tbDepth: 4 } });
    expect(isCaisson(ref.caisson!)).toBe(true);
    const c = ref.caisson as { Db: number; Df: number; depth: number };
    expect([t.dims.Db, t.dims.Df, t.dims.L]).toEqual([c.Db, c.Df, 4]);
    expect(t.contorno.length).toBe(24);
  });

  it('arranque com cargas no topo: só a fundação, sem pavimentos; cargas por caso', () => {
    const s = new Sessao(edificioVazio());
    const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
    ok('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.5 }, nasce: 'fundacao', morre: 'fundacao' });
    const id = s.modelo.pilares[0].id;
    ok('carga.pilar', { pilar: id, caso: 'G', N: 400, My: 20 });
    ok('carga.pilar', { pilar: id, caso: 'Q', N: 100, Hx: 5 });
    ok('fundacao.terreno', { sigmaAdm: 200, cotaTerreno: 0 });
    ok('fundacao.criar', { pilar: id, tipo: 'sapata', cota: -1.5 });
    expect(s.modelo.cargasPilar!.every((c) => c.pavimento === 'fundacao')).toBe(true);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeTruthy();
    const ld = cargasPorPilar(s.modelo, an).get(id)!;
    expect(ld.Nk).toBe(500);
    expect(ld.NkPerm).toBe(400);
    expect(Math.abs(ld.My)).toBe(20);
    const d = dimensionar(s.modelo);
    expect('erro' in d).toBe(false);
    const f = (d as { fundacoes: ReturnType<typeof calcularFundacoes> }).fundacoes[0];
    expect(f.status, f.mensagens.join(' ')).toBe('ok');
    expect(f.carga!.Nk).toBe(500);
    // filtro "só a fundação" do MCP
    const m = filtrarDim(s.modelo, d, undefined, false, true) as { fundacoes: unknown[]; resumo: { fundacoes: { total: number } } };
    expect(m.fundacoes).toHaveLength(1);
    expect(m.resumo.fundacoes.total).toBe(1);
    // arranque sem cargas: erro FUND_SEM_CARGA
    ok('carga.pilarRemover', { ids: s.modelo.cargasPilar!.map((c) => c.id) });
    const [semCarga] = calcularFundacoes(s.modelo, null);
    expect(semCarga.mensagens[0]).toMatch(/^Fundação sem cargas/);
  });

  it('modos: só os com erro mantém os que atendiam; só verificar usa as dimensões anteriores; níveis', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata' });
    ok('fundacao.criar', { pilar: P[1].id, tipo: 'sapata', cota: -2 });
    const b = s.modelo, an = analisarEdificio(b);
    const r0 = calcularFundacoes(b, an);
    expect(niveisFundacao(b)).toEqual([-2, -1.5]);
    expect(calcularFundacoes(b, an, { niveis: [-2] }).map((x) => x.nome)).toEqual([r0[1].nome]);
    const r2 = calcularFundacoes(b, an, { modo: 2, anteriores: r0 });
    expect(r2.every((x) => x.mantido)).toBe(true);
    const r1 = calcularFundacoes(b, an, { modo: 1, anteriores: r0 });
    expect(r1[0].dims.A).toBe(r0[0].dims.A);
    expect((r1[0].projeto!.footing as FootingResult).fixed).toBe(true);
    // impostas pelo usuário (comando)
    ok('fundacao.editar', { id: b.fundacao!.elementos[0].id, impostas: { A: 2.5, B: 2.5, h: 0.8 } });
    const [imp] = calcularFundacoes(s.modelo, an);
    expect([imp.dims.A, imp.dims.B, imp.dims.h]).toEqual([2.5, 2.5, 0.8]);
    expect(imp.resumo).toMatch(/impostas/);
  });

  it('majoração de σadm com vento: base com vento verificada com σadm × fator, nunca maior que sem a majoração', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata' });
    const an = analisarEdificio(s.modelo);
    expect(an.vento?.casos.length).toBeGreaterThan(0);
    const [a] = calcularFundacoes(s.modelo, an);
    ok('fundacao.terreno', { fatorVento: 1.3 });
    const [w] = calcularFundacoes(s.modelo, an);
    expect(w.notas.some((n) => /vento/.test(n))).toBe(true);
    expect(w.dims.A! * w.dims.B!).toBeLessThanOrEqual(a.dims.A! * a.dims.B! + 1e-9);
  });
});

describe('fundações do edifício (FU1): materiais da fundação', () => {
  it('fck, aço e cobrimento próprios (padrão: os da obra e 5 cm), usados no cálculo; valores antigos das opções descartados', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata' });
    const b0 = s.modelo;
    expect(fckDe(b0, 'fundacao')).toBe(b0.norma.fck);
    expect(cobrimentoFundacao(b0)).toBe(0.05);
    expect(parametrosFundacao(b0)).toMatchObject({ fckFound: b0.norma.fck, fyk: 500, cover: 0.05 });
    const an = analisarEdificio(b0);
    const [r30] = calcularFundacoes(b0, an);
    ok('materiais.definir', { fck: { fundacao: 20 }, aco: { fundacao: 'CA-60' }, cobFundacao: 4 });
    const b = s.modelo;
    expect(fckDe(b, 'fundacao')).toBe(20);
    expect(fckDe(b, 'viga')).toBe(b.norma.fck); // os demais elementos não mudam
    expect(parametrosFundacao(b)).toMatchObject({ fckFound: 20, fyk: 600, cover: 0.04 });
    const [r20] = calcularFundacoes(b, an);
    const f30 = r30.projeto!.footing as FootingResult, f20 = r20.projeto!.footing as FootingResult;
    expect(r20.status, r20.mensagens.join(' ')).toBe('ok');
    expect([f20.A, f20.B, f20.h]).not.toEqual([f30.A, f30.B, f30.h]); // o cálculo usou o concreto, o aço e o cobrimento da fundação
    // arquivo anterior com fck e cobrimento nas opções das fundações: valem até a definição nos materiais
    const leg = structuredClone(b0);
    leg.fundacao!.params = { fckFound: 25, cover: 0.06 };
    expect(fckDe(leg, 'fundacao')).toBe(25);
    expect(parametrosFundacao(leg)).toMatchObject({ fckFound: 25, cover: 0.06 });
    ok('materiais.definir', { padrao: true });
    expect(fckDe(s.modelo, 'fundacao')).toBe(s.modelo.norma.fck);
    expect(s.modelo.norma.cobFundacao).toBeUndefined();
  });
});

describe('fundações do edifício (FU1): comandos e revisão', () => {
  it('comandos só de fundação não mudam a revisão de cálculo; replay; remoções em cascata', () => {
    const { s, ok, P } = predio();
    const c0 = s.revCalculo, f0 = s.revFundacao;
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata', sondagem: { modo: 'furo', ids: [1] } });
    ok('fundacao.girar', { ids: [s.modelo.fundacao!.elementos[0].id], angulo: 30 });
    expect(s.revCalculo).toBe(c0);
    expect(s.revFundacao).toBe(f0 + 2);
    s.desfazer();
    expect(s.revFundacao).toBe(f0 + 3);
    expect(s.revCalculo).toBe(c0);
    s.refazer();
    expect(s.modelo.fundacao!.elementos[0].angulo).toBe(30);
    ok('pilar.editar', { id: P[3].id, nome: 'P9' });
    expect(s.revFundacao).toBe(f0 + 5);
    expect(replay(s.log)).toEqual(s.modelo);
    // nomes por tipo; um elemento por pilar; pilar que não nasce na fundação
    ok('fundacao.criar', { pilar: P[1].id, tipo: 'bloco', estaca: { id: 'e_hc' } });
    expect(s.modelo.fundacao!.elementos.map((e) => e.nome)).toEqual(['S1', 'B1']);
    expect(s.executar('fundacao.criar', { pilar: P[1].id, tipo: 'sapata' }).erros[0].codigo).toBe('PILAR_COM_FUNDACAO');
    expect(s.executar('fundacao.criar', { pilar: P[2].id, tipo: 'sapata', posicao: 'canto' }).erros[0].codigo).toBe('LADO_CANTO');
    expect(s.executar('fundacao.criar', { pilar: P[2].id, tipo: 'bloco' }).erros[0].codigo).toBe('SEM_ESTACA');
    expect(s.executar('fundacao.terreno', { estacas: [] }).erros[0].codigo).toBe('ESTACA_EM_USO');
    // mover: posição livre; remover o furo limpa a referência; remover o pilar remove o elemento
    ok('fundacao.mover', { ids: [s.modelo.fundacao!.elementos[0].id], dx: 0.1, dy: 0 });
    expect(s.modelo.fundacao!.elementos[0].posicao).toBe('livre');
    ok('sondagem.remover', { ids: [1] });
    expect(s.modelo.fundacao!.elementos[0].sondagem).toBeUndefined();
    ok('pilar.remover', { ids: [P[1].id] });
    expect(s.modelo.fundacao!.elementos.map((e) => e.nome)).toEqual(['S1']);
  });

  it('revisão: pilar sem elemento (aviso) e elemento de posição livre com pilar excêntrico', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata', posicao: 'livre', x: 0.1, y: 0 });
    const b = s.modelo, an = analisarEdificio(b), dim = dimensionarEdificio(b, an);
    const [r] = dim.fundacoes!;
    expect(r.excentricidade[0]).toBeCloseTo(-0.1, 9);
    expect(r.centro[0]).toBeCloseTo(0.1, 9);
    expect(r.status, r.mensagens.join(' ')).toBe('ok');
    const rv = revisarEdificio(b, an, dim);
    expect(rv.itens.filter((x) => x.codigo === 'FUND_PILAR_SEM_ELEMENTO').map((x) => x.id).sort()).toEqual([P[1].id, P[2].id, P[3].id].sort());
    expect(rv.porElemento.get(`fundacao|${r.id}`)).toBeUndefined();
  });
});
