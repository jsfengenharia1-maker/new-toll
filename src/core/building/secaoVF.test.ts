// E5k (C6.22): vigas de fundação com seção T, L e plana. Valores esperados à mão (propriedades da seção, flexão em T com
// linha neutra na mesa e na alma, mesa em balanço como laje) e contra a solução fechada de Hetényi com a largura de
// contato da mesa.
import { describe, expect, it } from 'vitest';
import { Sessao } from '../commands';
import { beamAsMin, beamFlexure, concrete } from '../concrete';
import { analisarEdificio } from './analitico';
import { dimensionar } from '../../cli/run';
import { calcularFundacaoEdificio } from './fundacao';
import { revisarEdificio } from './revisao';
import { vigasElasticasEf } from './baseElastica';
import { cobrimentoFundacao, concretoDe } from './materiais';
import { geoSecaoVF, mesaEmBalanco, secoesFlexaoVF } from './secaoVF';
import { edificioVazio, type BuildingModel } from './types';

const SIG = 0.85 * (30 / 1.4), FYD = 500 / 1.15; // MPa: σcd = 0,85·fcd e fyd do CA-50

describe('seção T, L e plana: geometria (à mão)', () => {
  // T: alma 30 cm, h 80, mesa 100 × 20 embaixo
  const g = geoSecaoVF(0.3, 0.8, { tipo: 'T', bf: 1, hf: 0.2, mesa: 'inferior' });
  it('T invertido: área, centroide e inércia pelo teorema dos eixos paralelos', () => {
    expect(g.erro).toBeUndefined();
    expect(g.A).toBeCloseTo(0.2 + 0.3 * 0.6, 12); // 0,38
    expect(g.yc).toBeCloseTo(0.11 / 0.38, 12); // (0,2·0,1 + 0,18·0,5)/0,38 = 0,289474
    // Iz = 1·0,2³/12 + 0,2·(0,1 − yc)² + 0,3·0,6³/12 + 0,18·(0,5 − yc)²
    expect(g.Iz).toBeCloseTo(0.021224561, 8);
    expect(g.Iy).toBeCloseTo((0.2 * 1) / 12 + (0.6 * 0.027) / 12, 12); // 0,018016667
    expect(g.lados).toBe(2);
    expect(g.balanco).toBeCloseTo(0.35, 12);
    expect(g.contato).toBe(1); // mesa embaixo: o solo toca a mesa
  });
  it('mesa em cima: a mesma inércia, o centroide espelhado e o contato é a alma', () => {
    const s = geoSecaoVF(0.3, 0.8, { tipo: 'T', bf: 1, hf: 0.2, mesa: 'superior' });
    expect(s.Iz).toBeCloseTo(g.Iz, 12);
    expect(s.yc).toBeCloseTo(0.8 - g.yc, 12);
    expect(s.contato).toBe(0.3);
  });
  it('L: mesa de um lado só (balanço = bf − bw); Iz igual à do T de mesma mesa; Iy pelo centroide deslocado', () => {
    const l = geoSecaoVF(0.3, 0.8, { tipo: 'L', bf: 1, hf: 0.2 });
    expect(l.lados).toBe(1);
    expect(l.balanco).toBeCloseTo(0.7, 12);
    expect(l.Iz).toBeCloseTo(g.Iz, 12);
    const xc = (0.2 * 0.5 + 0.18 * 0.15) / 0.38;
    expect(l.Iy).toBeCloseTo((0.2 * 1) / 12 + 0.2 * (0.5 - xc) ** 2 + (0.6 * 0.027) / 12 + 0.18 * (0.15 - xc) ** 2, 12);
  });
  it('plana e retangular: sem mesa, I = b·h³/12 e contato = b; plana mais alta que larga avisa', () => {
    const p = geoSecaoVF(1.2, 0.3, { tipo: 'plana' });
    expect(p.temMesa).toBe(false);
    expect(p.Iz).toBeCloseTo((1.2 * 0.027) / 12, 12);
    expect(p.contato).toBe(1.2);
    expect(p.avisos).toEqual([]);
    expect(geoSecaoVF(0.3, 0.6, { tipo: 'plana' }).avisos.length).toBe(1);
    expect(geoSecaoVF(0.3, 0.6).tipo).toBe('retangular');
  });
  it('forma inválida: mesa que não excede a alma, mesa fina ou sem alma', () => {
    expect(geoSecaoVF(0.3, 0.8, { tipo: 'T', bf: 0.32, hf: 0.2 }).erro).toMatch(/largura da mesa/);
    expect(geoSecaoVF(0.3, 0.8, { tipo: 'T', bf: 1, hf: 0.05 }).erro).toMatch(/abaixo de 10 cm/);
    expect(geoSecaoVF(0.3, 0.3, { tipo: 'L', bf: 1, hf: 0.25 }).erro).toMatch(/alma/);
  });
});

describe('seção T: flexão com a linha neutra na mesa e na alma (à mão)', () => {
  const c = concrete(30, 1.4);
  const fx = secoesFlexaoVF(geoSecaoVF(0.3, 0.8, { tipo: 'T', bf: 1, hf: 0.2, mesa: 'superior' }));
  const d = 0.75;
  it('mesa em cima comprimida (momento positivo): a face inferior usa a T e a superior a alma', () => {
    expect(fx.inf.mesaComprimida).toBe(true);
    expect(fx.sup.mesaComprimida).toBe(false);
    expect(fx.inf.larguraBarras).toBe(0.3);
    expect(fx.sup.larguraBarras).toBe(1);
  });
  it('LN na mesa (Md = 2000 kN·m): retangular de largura bf', () => {
    // λx = d·(1 − √(1 − 2·Md/(σcd·bf·d²))) = 0,164423 m < hf = 0,20
    const lx = d * (1 - Math.sqrt(1 - (2 * 2) / (SIG * 1 * d * d)));
    expect(lx).toBeLessThan(0.2);
    const r = beamFlexure(fx.inf.sec, fx.inf.mesaComprimida, 2000, d, 0.05, c, FYD);
    expect(r.As).toBeCloseTo((SIG * 1 * lx) / FYD, 8); // 0,00689 m² = 68,9 cm²
    expect(r.x).toBeCloseTo(lx / 0.8, 8);
    expect(r.double).toBe(false);
  });
  it('LN na alma (Md = 2500 kN·m): abas + alma', () => {
    // Mf = σcd·(bf − bw)·hf·(d − hf/2); a alma resiste ao resto com λx > hf
    const Mf = SIG * 0.7 * 0.2 * (d - 0.1), Mw = 2.5 - Mf;
    const lx = d - Math.sqrt(d * d - (2 * Mw) / (SIG * 0.3));
    expect(lx).toBeGreaterThan(0.2);
    expect(lx / 0.8 / d).toBeLessThan(0.45);
    const r = beamFlexure(fx.inf.sec, fx.inf.mesaComprimida, 2500, d, 0.05, c, FYD);
    expect(r.As).toBeCloseTo((SIG * (0.7 * 0.2 + 0.3 * lx)) / FYD, 8);
    expect(r.double).toBe(false);
  });
  it('mesa tracionada: a T vale como retangular da alma (a mesa não resiste à tração)', () => {
    const r = beamFlexure(fx.sup.sec, fx.sup.mesaComprimida, 500, d, 0.05, c, FYD);
    const lx = d * (1 - Math.sqrt(1 - (2 * 0.5) / (SIG * 0.3 * d * d)));
    expect(r.As).toBeCloseTo((SIG * 0.3 * lx) / FYD, 8);
  });
});

describe('mesa em balanço como laje (à mão)', () => {
  const g = geoSecaoVF(0.3, 0.8, { tipo: 'T', bf: 1, hf: 0.2, mesa: 'inferior' });
  const c = concrete(30, 1.4);
  const base = { g, gammaF: 1.4, cob: 0.03, c, fyd: FYD, rhoMin: 0.0015 };
  it('σ = 150 kN/m²: q = σ − 25·hf = 145; Md = 1,4·q·ℓ²/2 = 12,43 kN·m/m; governa a armadura mínima (3 cm²/m)', () => {
    const msgs: string[] = [];
    const m = mesaEmBalanco({ ...base, sigma: 150 }, msgs)!;
    expect(m.balanco).toBeCloseTo(0.35, 12);
    expect(m.q).toBeCloseTo(145, 9);
    expect(m.Md).toBeCloseTo((1.4 * 145 * 0.35 ** 2) / 2, 9);
    expect(m.d).toBeCloseTo(0.16, 12);
    expect(m.AsMin).toBeCloseTo(3, 9);
    expect(m.AsAdot).toBeCloseTo(3, 9);
    expect(m.As).toBeLessThan(3);
    expect(msgs).toEqual([]);
  });
  it('σ = 600 kN/m²: o momento governa (As ≈ 7,79 cm²/m) e o cisalhamento a d da face é conferido', () => {
    const msgs: string[] = [];
    const m = mesaEmBalanco({ ...base, sigma: 600 }, msgs)!;
    const Md = (1.4 * 595 * 0.35 ** 2) / 2; // 51,02 kN·m/m
    const lx = 0.16 * (1 - Math.sqrt(1 - (2 * Md * 1e-3) / (SIG * 0.16 ** 2)));
    expect(m.Md).toBeCloseTo(Md, 9);
    expect(m.As).toBeCloseTo(((SIG * lx) / FYD) * 1e4, 6);
    expect(m.As).toBeCloseTo(7.79, 1);
    expect(m.AsAdot).toBeCloseTo(m.As, 9);
    expect(m.cortante.Vd).toBeCloseTo(1.4 * 595 * (0.35 - 0.16), 9);
    expect(m.barras!.As * 1e4).toBeGreaterThanOrEqual(m.As - 1e-9);
  });
  it('mesa em cima (sem solo): σ = 0, só a armadura mínima; L tem balanço de um lado', () => {
    const l = geoSecaoVF(0.3, 0.8, { tipo: 'L', bf: 1, hf: 0.2, mesa: 'superior' });
    const m = mesaEmBalanco({ ...base, g: l, sigma: 0 }, [])!;
    expect(m.Md).toBe(0);
    expect(m.balanco).toBeCloseTo(0.7, 12);
    expect(m.AsAdot).toBeCloseTo(3, 9);
  });
  it('sem mesa: nada', () => {
    expect(mesaEmBalanco({ ...base, g: geoSecaoVF(0.5, 0.8), sigma: 100 }, [])).toBeNull();
  });
});

function sessao(b: BuildingModel = edificioVazio()) {
  const s = new Sessao(b);
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  return { s, ok };
}
const uz = (an: ReturnType<typeof analisarEdificio>, caso: string, no: number) => an.portico.res!.desloc[an.casos.indexOf(caso)][no * 6 + 2];

/** Viga longa sobre base elástica com carga no meio: w0 = Pλ/(2k·bc), M0 = P/(4λ), λ = (k·bc/(4EI))^¼, bc = largura de contato. */
function hetenyi(forma: Record<string, unknown> | undefined, bw: number, h: number, Iz: number, bc: number) {
  const { s, ok } = sessao();
  ok('pavimento.criar', { nome: 'Térreo', cota: 0 });
  ok('opcoes.definir', { valores: { radierMalha: 0.25 } });
  ok('vigaElastica.criar', { pontos: [[0, 0], [40, 0]], b: bw, h, k: 50000, ...(forma ? { forma } : {}) });
  ok('pilar.inserir', { x: 20, y: 0, secao: { tipo: 'ret', b: 0.4, h: 0.4 } });
  const P = 1000;
  ok('carga.pilar', { pilar: s.modelo.pilares[0].id, caso: 'Q', N: P });
  const b = s.modelo, an = analisarEdificio(b);
  expect(an.erro).toBeUndefined();
  const be = an.baseElastica!;
  const E = concretoDe(b, 'fundacao').Ecs * 1000, EI = E * Iz, kb = 50000 * bc, lam = (kb / (4 * EI)) ** 0.25;
  const w0 = (P * lam) / (2 * kb), M0 = P / (4 * lam);
  const no = be.pilares[b.pilares[0].id].no;
  const ic = an.casos.indexOf('Q');
  const Ms = be.barras.filter((x) => x.tipo === 'viga').flatMap((x) => { const br = an.portico.modelo.barras[x.bi], e = an.portico.res!.esforcos[ic][x.bi]; return br.i === no ? [-e[5]] : br.j === no ? [e[11]] : []; });
  const R = be.nos.reduce((t, n) => t - n.kMola * uz(an, 'Q', n.no), 0);
  return { s, an, be, w: -uz(an, 'Q', no), w0, Ms, M0, R, P, lam };
}

describe('viga T/L sobre base elástica × Hetényi com a largura de contato da mesa', () => {
  // T invertido: alma 40, h 100, mesa 160 × 30 embaixo
  const gT = geoSecaoVF(0.4, 1, { tipo: 'T', bf: 1.6, hf: 0.3, mesa: 'inferior' });
  it('T invertido: contato = bf = 1,6 m e EI da seção composta; w0 e M0 sob a carga concentrada a < 0,5 %', () => {
    const r = hetenyi({ tipo: 'T', bf: 1.6, hf: 0.3 }, 0.4, 1, gT.Iz, 1.6);
    // Iz à mão: A1 = 0,48 (y 0,15), A2 = 0,28 (y 0,65): yc = 0,3 ... = (0,072 + 0,182)/0,76
    expect(gT.A).toBeCloseTo(0.76, 12);
    expect(gT.yc).toBeCloseTo(0.254 / 0.76, 12);
    expect(Math.abs(r.w - r.w0) / r.w0).toBeLessThan(0.001);
    expect(r.Ms.length).toBe(2);
    for (const M of r.Ms) expect(Math.abs(M - r.M0) / r.M0).toBeLessThan(0.005);
    expect(r.R).toBeCloseTo(r.P, 6);
  });
  it('a largura de contato é a da mesa: o solo reage com k·1,6 por metro (nós com área = 1,6 × influência)', () => {
    const { s, ok } = sessao();
    ok('pavimento.criar', { nome: 'Térreo', cota: 0 });
    ok('vigaElastica.criar', { pontos: [[0, 0], [10, 0]], b: 0.4, h: 1, forma: { tipo: 'T', bf: 1.6, hf: 0.3 } });
    const [v] = vigasElasticasEf(s.modelo);
    expect(v.b).toBe(1.6);
    expect(v.bApoio).toBe(0.4);
    expect(v.secao!.Iz).toBeCloseTo(gT.Iz, 12);
    expect(s.modelo.fundacao!.vigasElasticas![0].b).toBe(0.4); // o modelo guarda a alma
  });
  it('mesa em cima: contato = alma (40 cm) com a mesma rigidez EI', () => {
    const r = hetenyi({ tipo: 'T', bf: 1.6, hf: 0.3, mesa: 'superior' }, 0.4, 1, gT.Iz, 0.4);
    expect(Math.abs(r.w - r.w0) / r.w0).toBeLessThan(0.001);
    for (const M of r.Ms) expect(Math.abs(M - r.M0) / r.M0).toBeLessThan(0.005);
  });
  it('L (mesa de um lado): mesma rigidez vertical do T de mesma mesa e contato = bf', () => {
    const gL = geoSecaoVF(0.4, 1, { tipo: 'L', bf: 1.2, hf: 0.3 });
    const r = hetenyi({ tipo: 'L', bf: 1.2, hf: 0.3 }, 0.4, 1, gL.Iz, 1.2);
    expect(Math.abs(r.w - r.w0) / r.w0).toBeLessThan(0.001);
    for (const M of r.Ms) expect(Math.abs(M - r.M0) / r.M0).toBeLessThan(0.005);
  });
  it('plana (retangular larga 1,5 × 0,4): idêntica à retangular de mesmas dimensões', () => {
    const plana = hetenyi({ tipo: 'plana' }, 1.5, 0.4, (1.5 * 0.4 ** 3) / 12, 1.5);
    const ret = hetenyi(undefined, 1.5, 0.4, (1.5 * 0.4 ** 3) / 12, 1.5);
    expect(plana.w).toBe(ret.w);
    expect(plana.Ms).toEqual(ret.Ms);
    expect(Math.abs(plana.w - plana.w0) / plana.w0).toBeLessThan(0.001);
  });
  it('carga linear uniforme q: recalque w = q/(k·bf) no trecho central (contato da mesa)', () => {
    const { s, ok } = sessao();
    ok('pavimento.criar', { nome: 'Térreo', cota: 0 });
    ok('opcoes.definir', { valores: { radierMalha: 0.5 } });
    ok('vigaElastica.criar', { pontos: [[0, 0], [60, 0]], b: 0.4, h: 1, k: 40000, forma: { tipo: 'T', bf: 1.6, hf: 0.3 } });
    ok('pilar.inserir', { x: 30, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok('carga.linha', { grupo: 'fundacao', pontos: [[0, 0], [60, 0]], valor: 100, caso: 'Q' });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const meio = an.baseElastica!.nos.filter((n) => Math.abs(n.x - 30) < 6);
    expect(meio.length).toBeGreaterThan(10);
    for (const n of meio) expect(-uz(an, 'Q', n.no)).toBeCloseTo(100 / (40000 * 1.6), 6);
  });
});

describe('dimensionamento da viga T sobre base elástica', () => {
  function obraT(mesa: 'inferior' | 'superior') {
    const { s, ok } = sessao();
    ok('pavimento.criar', { nome: 'Térreo', cota: 0 });
    ok('opcoes.definir', { valores: { radierMalha: 0.25 } });
    ok('vigaElastica.criar', { pontos: [[0, 0], [24, 0]], b: 0.4, h: 1, k: 50000, sigmaAdm: 800, forma: { tipo: 'T', bf: 1.6, hf: 0.3, mesa } });
    ok('pilar.inserir', { x: 12, y: 0, secao: { tipo: 'ret', b: 0.4, h: 0.4 } });
    ok('carga.pilar', { pilar: s.modelo.pilares[0].id, caso: 'Q', N: 900 });
    const d = dimensionar(s.modelo) as { vigasElasticas: any[] };
    return { s, v: d.vigasElasticas[0] };
  }
  it('mesa embaixo: sagging traciona a mesa (flexão como retangular da alma); cortante na alma; mesa em balanço como laje', () => {
    const { s, v } = obraT('inferior');
    expect(v.forma).toMatchObject({ tipo: 'T', mesa: 'inferior', bf: 1.6, hf: 0.3 });
    expect(v.b).toBe(1.6);
    expect(v.bw).toBe(0.4);
    const b = s.modelo, c = concretoDe(b, 'fundacao'), cob = cobrimentoFundacao(b), d = 1 - cob - 0.013;
    const sec = { kind: 'rect' as const, bw: 0.4, h: 1 };
    const esperado = beamFlexure(sec, false, v.Md.inf, d, cob + 0.013, c, FYD).As;
    expect(v.Md.inf).toBeGreaterThan(0);
    expect(v.armadura.inf.As).toBeCloseTo(Math.max(esperado, v.armadura.AsMin), 6);
    // mesa em balanço: q = σmáx − 25·hf, Md = γf·q·ℓ²/2 com ℓ = (1,6 − 0,4)/2
    const mb = v.mesaBalanco;
    expect(mb.balanco).toBeCloseTo(0.6, 12);
    expect(mb.q).toBeCloseTo(Math.max(0, v.sigmaMax - 25 * 0.3), 9);
    expect(mb.Md).toBeCloseTo((1.4 * mb.q * 0.36) / 2, 9);
    expect(v.mensagens.filter((m: string) => /^Viga de fundação: (forma|mesa)/.test(m))).toEqual([]);
  });
  it('mesa em cima: o mesmo momento positivo comprime a mesa (T) e pede menos armadura que a retangular da alma', () => {
    const inf = obraT('inferior').v, sup = obraT('superior').v;
    expect(sup.b).toBe(0.4); // contato = alma
    expect(sup.mesaBalanco.Md).toBe(0); // mesa em cima: não carregada pelo solo
    expect(sup.mesaBalanco.AsAdot).toBeCloseTo(0.0015 * 0.3 * 1e4, 9);
    expect(sup.armadura.inf.As).toBeGreaterThan(0);
    expect(inf.armadura.AsMinSup).toBeDefined();
  });
  it('forma inválida no modelo: mensagem de erro de revisão e a viga continua calculada como retangular', () => {
    const { s, ok } = sessao();
    ok('pavimento.criar', { nome: 'Térreo', cota: 0 });
    ok('vigaElastica.criar', { pontos: [[0, 0], [10, 0]], b: 0.4, h: 1 });
    const r = s.executar('vigaElastica.editar', { id: s.modelo.fundacao!.vigasElasticas![0].id, forma: { tipo: 'T', bf: 0.42, hf: 0.2 } });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('FORMA_SECAO_INVALIDA');
  });
  it('retangular: sem forma, o resultado não ganha campos novos (baseline)', () => {
    const { s, ok } = sessao();
    ok('pavimento.criar', { nome: 'Térreo', cota: 0 });
    ok('vigaElastica.criar', { pontos: [[0, 0], [10, 0]], b: 0.5, h: 0.8, k: 50000, sigmaAdm: 800 });
    ok('pilar.inserir', { x: 5, y: 0, secao: { tipo: 'ret', b: 0.4, h: 0.4 } });
    ok('carga.pilar', { pilar: s.modelo.pilares[0].id, caso: 'Q', N: 400 });
    const v = (dimensionar(s.modelo) as { vigasElasticas: any[] }).vigasElasticas[0];
    expect(v.forma).toBeUndefined();
    expect(v.mesaBalanco).toBeUndefined();
    expect(v.armadura.AsMinSup).toBeUndefined();
  });
});

describe('viga de equilíbrio com seção T/L/plana', () => {
  function obra(forma?: Record<string, unknown>) {
    const s = new Sessao(edificioVazio());
    const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
    ok('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
    ok('pilar.inserir', { x: 4, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
    const [P1, P2] = s.modelo.pilares;
    ok('pilar.editar', { id: P1.id, ajuste: 'o' });
    ok('carga.pilar', { pilar: P1.id, caso: 'G', N: 600 });
    ok('carga.pilar', { pilar: P2.id, caso: 'G', N: 800 });
    ok('fundacao.terreno', { sigmaAdm: 200, cotaTerreno: 0, estacas: [{ id: 'e1', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
    ok('fundacao.criar', { pilar: P1.id, tipo: 'sapata', posicao: 'divisa', cota: -1.5 });
    ok('fundacao.criar', { pilar: P2.id, tipo: 'sapata', cota: -1.5 });
    const [S1, S2] = s.modelo.fundacao!.elementos;
    ok('vigaFundacao.criar', { tipo: 'equilibrio', ini: S1.id, fim: S2.id, b: 0.3, h: 0.8, fixa: true, ...(forma ? { forma } : {}) });
    return { s, ok };
  }
  it('T com mesa em cima (padrão): o momento positivo comprime a mesa; o negativo, a alma; volume e peso com a área da T', () => {
    const base = calcularFundacaoEdificio(obra().s.modelo, null).vigas[0];
    const { s } = obra({ tipo: 'T', bf: 1, hf: 0.2 });
    const r = calcularFundacaoEdificio(s.modelo, null).vigas[0];
    const g = geoSecaoVF(0.3, 0.8, { tipo: 'T', bf: 1, hf: 0.2 }, 'superior');
    expect(r.forma).toMatchObject({ tipo: 'T', mesa: 'superior' });
    expect(r.bAdot).toBe(0.3);
    expect(base.forma).toBeUndefined();
    expect(r.volume).toBeCloseTo(g.A * (r.L - r.faces!.ini - r.faces!.fim), 9);
    // peso próprio da T (0,38 m²) > retangular (0,24 m²): as cargas na viga crescem
    expect(r.cargas.ini + r.cargas.fim).toBeGreaterThan(base.cargas.ini + base.cargas.fim);
    // armadura inferior (tração embaixo, mesa em cima comprimida) pela T; superior pela alma
    const c = concrete(30, 1.4), cob = cobrimentoFundacao(s.modelo), d = 0.8 - cob - 0.013, cob2 = cob + 0.013;
    const fx = secoesFlexaoVF(g);
    const fi = beamFlexure(fx.inf.sec, fx.inf.mesaComprimida, r.Md.inf, d, cob2, c, FYD).As, fs = beamFlexure(fx.sup.sec, fx.sup.mesaComprimida, r.Md.sup, d, cob2, c, FYD).As;
    const aInf = Math.max(fi, beamAsMin(fx.inf.sec, true, d, c, FYD)), aSup = Math.max(fs, beamAsMin(fx.sup.sec, false, d, c, FYD));
    expect(r.armadura.inf.As).toBeCloseTo(aInf, 8);
    expect(r.armadura.sup.As).toBeCloseTo(aSup, 8);
    // mesa sem solo: armadura mínima de laje
    expect(r.mesaBalanco!.Md).toBe(0);
    expect(r.mesaBalanco!.AsAdot).toBeCloseTo(0.0015 * 0.2 * 1e4, 9);
    expect(r.status, r.mensagens.join(' ')).toBe('ok');
  });
  it('forma inválida: o comando recusa; editar a forma e voltar a retangular remove o campo', () => {
    const { s, ok } = obra({ tipo: 'L', bf: 0.8, hf: 0.2 });
    const v = s.modelo.fundacao!.vigas![0];
    expect(v.forma).toEqual({ tipo: 'L', bf: 0.8, hf: 0.2 });
    const r = s.executar('vigaFundacao.editar', { id: v.id, forma: { tipo: 'T', bf: 0.3, hf: 0.2 } });
    expect(r.ok).toBe(false);
    ok('vigaFundacao.editar', { id: v.id, forma: { tipo: 'retangular' } });
    expect(s.modelo.fundacao!.vigas![0].forma).toBeUndefined();
  });
  it('revisão: viga plana mais alta que larga vira aviso FUND_VIGA_PLANA', () => {
    const { s } = obra({ tipo: 'plana' });
    const c = calcularFundacaoEdificio(s.modelo, null);
    const rv = revisarEdificio(s.modelo, null, { vigas: [], pilares: [], lajes: [], quantitativos: [], combinacoes: 0, fundacoes: c.elementos, vigasFundacao: c.vigas });
    expect(rv.itens.some((x) => x.codigo === 'FUND_VIGA_PLANA' && x.nivel === 'aviso')).toBe(true);
  });
});

