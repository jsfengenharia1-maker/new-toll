import { describe, expect, it } from 'vitest';
import { Sessao } from '../commands';
import { calcularFundacaoEdificio } from './fundacao';
import { revisarEdificio } from './revisao';
import { edificioVazio } from './types';
import { alavanca, diagramaAlavanca, diagramaBiapoiada, reacoesBiapoiada } from './vigasFundacao';
import { beamFlexure, concrete } from '../concrete';
import { filtrarDim } from '../../cli/mcp';
import { dimensionar } from '../../cli/run';

describe('vigas de fundação (FU2): alavanca contra cálculo manual', () => {
  it('uma viga: R = N·ℓ/(ℓ − e), ΔN = N·e/(ℓ − e)', () => {
    const N = 600, e = 0.45, l = 5;
    const a = alavanca(N, [e, 0], [{ u: [1, 0], l, k: 1 }])!;
    expect(a.R).toBeCloseTo((N * l) / (l - e), 9);
    expect(a.dN[0]).toBeCloseTo((N * e) / (l - e), 9);
    expect(a.R - a.dN[0]).toBeCloseTo(N, 9);
    expect(a.eRes).toEqual([0, 0]);
  });

  it('canto com duas vigas ortogonais: R = N/(1 − ex/ℓx − ey/ℓy); viga curta demais = null', () => {
    const N = 300, ex = 0.4, ey = 0.3, lx = 4, ly = 5;
    const a = alavanca(N, [ex, ey], [{ u: [1, 0], l: lx, k: 2 }, { u: [0, 1], l: ly, k: 1 }])!;
    const R = N / (1 - ex / lx - ey / ly);
    expect(a.R).toBeCloseTo(R, 9);
    expect(a.dN[0]).toBeCloseTo((R * ex) / lx, 9);
    expect(a.dN[1]).toBeCloseTo((R * ey) / ly, 9);
    // equilíbrio de momentos no centro do elemento: Σ ΔNᵢ·ℓᵢ·uᵢ = R·e
    expect(a.dN[0] * lx).toBeCloseTo(a.R * ex, 9);
    expect(alavanca(N, [1, 0], [{ u: [1, 0], l: 1.1, k: 1 }])).toBeNull();
  });

  it('vigas paralelas repartem o momento pela rigidez; a componente perpendicular fica no elemento', () => {
    const a = alavanca(100, [0.3, 0.1], [{ u: [1, 0], l: 4, k: 3 }, { u: [1, 0], l: 4, k: 1 }])!;
    expect(a.dN[0] / a.dN[1]).toBeCloseTo(3, 9);
    expect(a.eRes[0]).toBeCloseTo(0, 9);
    expect(a.eRes[1]).toBeCloseTo(0.1, 9);
    expect(a.R).toBeCloseTo(100 / (1 - 0.3 / 4), 9);
  });

  it('diagrama: momento máximo no cortante nulo, Ms na borda do elemento = ΔN·(ℓ − s1), cortante na face do pilar', () => {
    const N = 600, ap = 0.3, A = 1.2, e = (A - ap) / 2, l = 5;
    const { R, dN: [dN] } = alavanca(N, [e, 0], [{ u: [1, 0], l, k: 1 }])!;
    const q = R / A, s0 = e - A / 2, s1 = e + A / 2, sz = s0 + N / q;
    const Mmax = N * sz - (q * (sz - s0) ** 2) / 2;
    const d = diagramaAlavanca(dN, l, e, A, [sz, s1, ap / 2, (s1 + l) / 2]);
    expect(d.n).toBeCloseTo(N, 9);
    expect(d.M[0]).toBeCloseTo(Mmax, 9);
    expect(d.M[1]).toBeCloseTo(dN * (l - s1), 9);
    expect(d.V[2]).toBeCloseTo(N - q * (ap / 2 - s0), 9);
    expect(d.V[3]).toBeCloseTo(-dN, 9); // fora do elemento: só o alívio
    expect(d.M[3]).toBeCloseTo(dN * (l - (s1 + l) / 2), 9);
  });

  it('biapoiada: reações e momento de carga uniforme (pℓ²/8)', () => {
    const L = 4, cs = Array.from({ length: 400 }, (_, k) => ({ s: ((k + 0.5) * L) / 400, P: (10 * L) / 400 }));
    expect(reacoesBiapoiada(L, cs).ini).toBeCloseTo(20, 9);
    expect(diagramaBiapoiada(L, cs, [2]).M[0]).toBeCloseTo((10 * L * L) / 8, 3);
  });
});

/** Obra de arranques (cargas exatas): P1 na divisa oeste (face em x = 0), P2 centrado em (4; 0). */
function obra(N1 = 600, N2 = 800) {
  const s = new Sessao(edificioVazio());
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
  ok('pilar.inserir', { x: 4, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
  const [P1, P2] = s.modelo.pilares;
  ok('pilar.editar', { id: P1.id, ajuste: 'o' });
  ok('carga.pilar', { pilar: P1.id, caso: 'G', N: N1 });
  ok('carga.pilar', { pilar: P2.id, caso: 'G', N: N2 });
  ok('fundacao.terreno', { sigmaAdm: 200, cotaTerreno: 0, estacas: [{ id: 'e1', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
  ok('fundacao.criar', { pilar: P1.id, tipo: 'sapata', posicao: 'divisa', cota: -1.5 });
  ok('fundacao.criar', { pilar: P2.id, tipo: 'sapata', cota: -1.5 });
  const [S1, S2] = s.modelo.fundacao!.elementos;
  return { s, ok, P1, P2, S1, S2 };
}

describe('vigas de fundação (FU2): edifício', () => {
  it('sapata de divisa com viga de equilíbrio: centrada pela alavanca, alívio de 50 % no pilar interno, viga dimensionada', () => {
    const { s, ok, S1, S2 } = obra();
    ok('vigaFundacao.criar', { tipo: 'equilibrio', ini: S1.id, fim: S2.id });
    const c = calcularFundacaoEdificio(s.modelo, null);
    const [r1, r2] = c.elementos, [v] = c.vigas;
    expect(r1.status, r1.mensagens.join(' ')).toBe('ok');
    expect(r1.mensagens.some((m) => /^Fundação excêntrica/.test(m))).toBe(false);
    // geometria: face oeste do pilar na borda; e = (A − ap)/2; ℓ entre os centros dos pilares
    const A = r1.dims.A!, e = (A - 0.3) / 2, l = 4 - 0.15;
    expect(r1.centro[0] - A / 2).toBeCloseTo(0, 6);
    expect(r1.excentricidade[0]).toBeCloseTo(-e, 9);
    // N do pilar = carga do arranque + metade do peso próprio da viga (25 × 0,20 × 0,40 × ℓ / 2)
    const pp = (25 * 0.2 * 0.4 * l) / 2, N1 = 600 + pp, N2 = 800 + pp;
    const R = (N1 * l) / (l - e), dN = R - N1;
    expect(r1.alavanca!.R).toBeCloseTo(R, 6);
    expect(r1.carga!.Nk).toBeCloseTo(R, 1);
    expect(r1.carga!.My).toBeCloseTo(0, 6); // centrada: sem momento N·e
    expect(r1.alavanca!.vigas[0].dN).toBeCloseTo(dN, 6);
    // sapata centrada com a reação R: σ = (R + peso)/(A·B) ≤ σadm
    const f = r1.projeto!.footing as { W: number; B: number; colOffset: [number, number] };
    expect(f.colOffset).toEqual([0, 0]);
    expect((R + f.W) / (A * f.B)).toBeLessThanOrEqual(200 + 1e-6);
    // pilar interno: Nk − 50 % do alívio; carga mínima com o alívio total
    expect(r2.alivio!.total).toBeCloseTo(dN, 6);
    expect(r2.carga!.Nk).toBeCloseTo(N2 - 0.5 * dN, 1);
    expect(r2.carga!.NkMin).toBeCloseTo(N2 - dN, 1);
    // viga: momento máximo da alavanca (cortante nulo) e cortante na face do pilar, contra o cálculo manual
    const q = R / A, s0 = e - A / 2, sz = s0 + N1 / q;
    const Mmax = N1 * sz - (q * (sz - s0) ** 2) / 2;
    expect(v.Mk.sup).toBeCloseTo(Mmax, 1);
    const w = 25 * 0.2 * 0.4; // peso próprio (kN/m), biapoiada entre os pilares
    expect(v.Vk).toBeCloseTo(N1 - q * (0.15 - s0) + w * (l / 2 - 0.15), 1);
    expect(v.Md.sup).toBeCloseTo(1.4 * v.Mk.sup, 6);
    expect(v.Vd).toBeCloseTo(1.4 * v.Vk, 6);
    expect(v.alivio.fim).toBeCloseTo(dN, 6);
    expect(v.equilibrio).toEqual({ ini: true, fim: false });
    // armadura superior ≥ a da flexão na seção adotada (fck da obra, CA-50, cobrimento 5 cm)
    const conc = concrete(30, 1.4), d = v.hAdot - 0.05 - 0.013;
    expect(v.armadura.sup.As).toBeGreaterThanOrEqual(beamFlexure({ kind: 'rect', bw: v.bAdot, h: v.hAdot }, false, v.Md.sup, d, 0.063, conc, 500 / 1.15).As - 1e-12);
    expect(v.status, v.mensagens.join(' ')).toBe('ok');
    expect(v.hAdot).toBeGreaterThan(0.4); // a altura cresceu até atender (seção 20 × 40 padrão)
    // MCP: filtro fundação traz as vigas
    const dm = dimensionar(s.modelo);
    const m = filtrarDim(s.modelo, dm, undefined, false, true) as { vigasFundacao: { nome: string; alivio: { fim: number } }[] };
    expect(m.vigasFundacao[0].nome).toBe('VF1');
    expect(m.vigasFundacao[0].alivio.fim).toBeCloseTo(dN, 0);
  });

  it('alívio maior que a carga mínima do aliviado: erro FUND_VIGA_TRACAO; distribuição trapezoidal reduz a reação', () => {
    const { s, ok, S1, S2 } = obra(600, 20);
    ok('vigaFundacao.criar', { tipo: 'equilibrio', ini: S1.id, fim: S2.id });
    const c = calcularFundacaoEdificio(s.modelo, null);
    const rv = revisarEdificio(s.modelo, null, { vigas: [], pilares: [], lajes: [], quantitativos: [], combinacoes: 0, fundacoes: c.elementos, vigasFundacao: c.vigas });
    expect(rv.itens.some((x) => x.codigo === 'FUND_VIGA_TRACAO' && x.nivel === 'erro' && x.id === S2.id)).toBe(true);
    expect(c.elementos[0].alavanca!.distribuicao).toBe('retangular');
    const rc = s.revCalculo, rf = s.revFundacao;
    ok('opcoes.definir', { valores: { vigaEqDistribuicao: 1 } });
    expect([s.revCalculo, s.revFundacao]).toEqual([rc, rf + 1]); // opção só das fundações: a análise não é refeita
    const t = calcularFundacaoEdificio(s.modelo, null).elementos[0];
    expect(t.alavanca!.distribuicao).toBe('trapezoidal');
    // a viga equilibra só a excentricidade além do núcleo central (A/6); o resto fica como momento no elemento
    const A = t.dims.A!, e = (A - 0.3) / 2, ei = e - A / 6, l = 3.85;
    expect(t.alavanca!.vigas[0].ei).toBeCloseTo(ei, 9);
    expect(t.alavanca!.R).toBeCloseTo((t.alavanca!.N * l) / (l - ei), 6);
    expect(t.carga!.My).toBeCloseTo(t.alavanca!.R * (A / 6), 1);
  });

  it('pilar sem viga continua com FUND_EXC_SEM_VIGA; viga curta: alavanca impossível', () => {
    const { s, ok, P2, S1 } = obra(600, 800);
    expect(calcularFundacaoEdificio(s.modelo, null).elementos[0].mensagens.some((m) => /^Fundação excêntrica sem viga/.test(m))).toBe(true);
    ok('pilar.mover', { ids: [P2.id], dx: -3.3, dy: 0 });
    ok('vigaFundacao.criar', { tipo: 'equilibrio', ini: S1.id, fim: P2.id });
    const c = calcularFundacaoEdificio(s.modelo, null);
    expect(c.elementos[0].mensagens.some((m) => /^Viga de fundação: alavanca impossível/.test(m))).toBe(true);
  });

  it('bloco de 1 estaca: travamento obrigatório em duas direções e momento da excentricidade de execução', () => {
    const s = new Sessao(edificioVazio());
    const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
    for (const [x, y] of [[0, 0], [4, 0], [0, 4]]) ok('pilar.inserir', { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
    const [P1, P2, P3] = s.modelo.pilares;
    for (const p of [P1, P2, P3]) ok('carga.pilar', { pilar: p.id, caso: 'G', N: 300 });
    ok('fundacao.terreno', { sigmaAdm: 200, cotaTerreno: 0, estacas: [{ id: 'e1', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
    ok('fundacao.criar', { pilar: P1.id, tipo: 'bloco', cota: -1.5 });
    const c0 = calcularFundacaoEdificio(s.modelo, null);
    expect(c0.elementos[0].dims.n).toBe(1);
    expect(c0.elementos[0].mensagens.some((m) => /^Bloco sem travamento/.test(m))).toBe(true);
    expect(c0.elementos[0].status).toBe('ok'); // aviso
    const B1 = s.modelo.fundacao!.elementos[0];
    ok('vigaFundacao.criar', { tipo: 'travamento', ini: B1.id, fim: P2.id });
    expect(calcularFundacaoEdificio(s.modelo, null).elementos[0].mensagens.some((m) => /^Bloco sem travamento/.test(m))).toBe(true);
    ok('vigaFundacao.criar', { tipo: 'travamento', ini: B1.id, fim: P3.id });
    const c = calcularFundacaoEdificio(s.modelo, null);
    expect(c.elementos[0].mensagens.some((m) => /^Bloco sem travamento/.test(m))).toBe(false);
    // momento de execução: Nk × 10 cm (uma viga por direção), nas duas faces, mais o peso próprio biapoiado
    const Nk = c.elementos[0].carga!.Nk, v = c.vigas[0], L = 4 - 0;
    expect(v.travamento.ini).toBeCloseTo(Nk * 0.1, 9);
    expect(v.Mk.sup).toBeCloseTo(Nk * 0.1, 6);
    expect(v.Mk.inf).toBeCloseTo(Nk * 0.1 + (25 * 0.2 * 0.4 * L * L) / 8, 1);
    expect(v.status, v.mensagens.join(' ')).toBe('ok');
  });

  it('cargas no nível de fundação: na viga (reações nas pontas) e fora (aviso); só a revisão das fundações muda; igualar fixa a seção', () => {
    const { s, ok, S1, S2, P1, P2 } = obra();
    ok('vigaFundacao.criar', { tipo: 'travamento', ini: S1.id, fim: S2.id });
    const c0 = calcularFundacaoEdificio(s.modelo, null);
    const rc = s.revCalculo, rf = s.revFundacao;
    // alvenaria de 10 kN/m sobre a viga, de eixo a eixo
    ok('carga.linha', { grupo: 'fundacao', pontos: [[0.15, 0], [4, 0]], valor: 10, caso: 'G' });
    ok('carga.ponto', { grupo: 'fundacao', ponto: [8, 8], valor: 5 });
    expect(s.revCalculo).toBe(rc);
    expect(s.revFundacao).toBe(rf + 2);
    const c = calcularFundacaoEdificio(s.modelo, null);
    const l = 3.85;
    expect(c.vigas[0].cargas.ini + c.vigas[0].cargas.fim - c0.vigas[0].cargas.ini - c0.vigas[0].cargas.fim).toBeCloseTo(10 * l, 6);
    expect(c.elementos[0].carga!.Nk - c0.elementos[0].carga!.Nk).toBeCloseTo((10 * l) / 2, 6);
    expect(c.vigas[0].Mk.inf - c0.vigas[0].Mk.inf).toBeCloseTo((10 * l * l) / 8, 1);
    expect(c.avisos[0]).toMatch(/^Carga no nível de fundação fora/);
    // carga sobre a sapata (fora da faixa da viga): somada ao pilar do elemento
    ok('carga.ponto', { grupo: 'fundacao', ponto: [4, 0.4], valor: 30 });
    const c2 = calcularFundacaoEdificio(s.modelo, null);
    expect(c2.elementos[1].cargaDireta).toBe(30);
    expect(c2.elementos[1].carga!.Nk - c.elementos[1].carga!.Nk).toBeCloseTo(30, 6);
    expect([P1.id, P2.id]).toHaveLength(2);
  });

  it('igualar: a seção do modelo é copiada e fixada; a copiada só é verificada e fica com erro se não atender', () => {
    const { s, ok, S1, S2 } = obra();
    ok('pilar.inserir', { x: 0, y: 4, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
    const P3 = s.modelo.pilares[2];
    ok('carga.pilar', { pilar: P3.id, caso: 'G', N: 200 });
    ok('vigaFundacao.criar', { tipo: 'equilibrio', ini: S1.id, fim: S2.id });
    ok('vigaFundacao.criar', { tipo: 'travamento', ini: P3.id, fim: S1.id, b: 0.12, h: 0.25, fixa: true });
    const [v1, v2] = s.modelo.fundacao!.vigas!;
    const c0 = calcularFundacaoEdificio(s.modelo, null);
    expect(c0.vigas[1].mensagens.some((m) => /^Viga de fundação: seção abaixo do mínimo/.test(m))).toBe(true);
    ok('vigaFundacao.igualar', { modelo: v2.id, ids: [v1.id] });
    const v1b = s.modelo.fundacao!.vigas![0];
    expect([v1b.b, v1b.h, v1b.fixa]).toEqual([0.12, 0.25, true]);
    const c = calcularFundacaoEdificio(s.modelo, null);
    expect(c.vigas[0].hAdot).toBe(0.25);
    expect(c.vigas[0].status).toBe('fail');
    expect(c.vigas[0].mensagens.some((m) => /^Viga de fundação: (flexão|biela)/.test(m))).toBe(true);
    // remover o elemento leva junto as vigas com ponta nele
    ok('fundacao.remover', { ids: [S1.id] });
    expect(s.modelo.fundacao!.vigas).toBeUndefined();
  });

  it('níveis calculados (fundacao.opcoes): os demais mantêm o resultado anterior', () => {
    const { s, ok, S2 } = obra();
    ok('fundacao.editar', { id: S2.id, cota: -2 });
    const r0 = calcularFundacaoEdificio(s.modelo, null).elementos;
    ok('fundacao.opcoes', { niveis: [-2] });
    expect(s.modelo.fundacao!.niveis).toEqual([-2]);
    const r = calcularFundacaoEdificio(s.modelo, null, { anteriores: r0 }).elementos;
    expect(r[0].mantido).toBe(true);
    expect(r[1].mantido).toBeUndefined();
    ok('fundacao.opcoes', { niveis: [] });
    expect(s.modelo.fundacao!.niveis).toBeUndefined();
  });
});
