// FU3 (núcleo): sapata associada, bloco com vários pilares, unir, igualar, impor, limites, sobreposição e cruzamento de vigas.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, replay, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { calcularFundacaoEdificio, calcularFundacoes, cargasPorPilar, gruposSobrepostos, resumoFundacao, usaGrupo } from './fundacao';
import { revisarEdificio } from './revisao';
import { reacoesComApoios } from './vigasFundacao';
import { isFooting } from '../footings';

const LEITURAS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35].map((N) => ({ N, solo: 'silteArenoso' }));

/** Edifício padrão com 4 pilares 30 × 30 em 4 × 4 m, vigas no tipo e lajes maciças, terreno e duas estacas. */
function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('lote', { comandos: [[0, 0], [4, 0], [4, 4], [0, 4]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok('lote', { comandos: [[[0, 0], [4, 0]], [[0, 4], [4, 4]], [[0, 0], [0, 4]], [[4, 0], [4, 4]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  ok('sondagem.criar', { nome: 'SP-01', x: 2, y: 2, nivelAgua: 12, leituras: LEITURAS });
  ok('fundacao.terreno', { sigmaAdm: 250, estacas: [{ id: 'e_hc', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
  return { s, ok, P: s.modelo.pilares };
}

describe('sapata associada (FU3)', () => {
  it('dois pilares: um elemento, resultante no centro, vão/h, contorno cobre os pilares', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilares: [P[0].id, P[1].id], tipo: 'sapata' });
    const b = s.modelo, an = analisarEdificio(b);
    const [r] = calcularFundacoes(b, an);
    expect(r.status, r.mensagens.join(' ')).toBe('ok');
    expect(r.pilarIds).toEqual([P[0].id, P[1].id]);
    expect(r.grupo!.pilares.map((q) => q.nome)).toEqual([P[0].nome, P[1].nome]);
    // carga de projeto = máximo da soma das cargas dos dois pilares por combinação ≤ soma dos máximos
    const cp = cargasPorPilar(b, an);
    const soma = cp.get(P[0].id)!.Nk + cp.get(P[1].id)!.Nk;
    expect(r.carga!.Nk).toBeLessThanOrEqual(soma + 0.02);
    expect(r.carga!.Nk).toBeGreaterThan(0.9 * soma);
    // pilares simétricos: referência no meio do vão (2; 0)
    expect(r.grupo!.referencia[0]).toBeGreaterThan(1.9);
    expect(r.grupo!.referencia[0]).toBeLessThan(2.1);
    expect(Math.abs(r.grupo!.referencia[1])).toBeLessThan(1e-6);
    // vão entre eixos 4 m: h ≥ 2 m (vão ≤ 2h)
    const f = r.projeto!.footing;
    expect(f && isFooting(f)).toBe(true);
    if (!f || !isFooting(f)) return;
    expect(f.grupo!.vao).toBeCloseTo(4, 3);
    expect(r.dims.h!).toBeGreaterThanOrEqual(2 - 1e-9);
    expect(f.grupo!.vaoAltura).toBeLessThanOrEqual(2 + 1e-9);
    // contorno: retângulo A × B centrado na referência, com os dois pilares dentro
    const xs = r.contorno.map((q) => q[0]), ys = r.contorno.map((q) => q[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(r.dims.A!, 3);
    expect(Math.min(...xs)).toBeLessThan(-0.15);
    expect(Math.max(...xs)).toBeGreaterThan(4.15);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(r.dims.B!, 3);
    // σ: (N + W)/(A·B) ≤ σadm
    expect((r.carga!.Nk + f.W) / (r.dims.A! * r.dims.B!)).toBeLessThanOrEqual(250 + 1e-6);
    // resumo para o MCP
    const rs = resumoFundacao(r);
    expect(rs.grupo!.pilares).toEqual([P[0].nome, P[1].nome]);
    expect(rs).not.toHaveProperty('projeto');
    // entra no dimensionamento
    expect(dimensionarEdificio(b, an).fundacoes!.map((x) => x.id)).toEqual([r.id]);
  });

  it('concreto simples e altura constante: sem armadura, h0 = h', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilares: [P[0].id, P[1].id], tipo: 'sapata', simples: true, alturaConstante: true });
    const b = s.modelo;
    const [r] = calcularFundacoes(b, analisarEdificio(b));
    expect(r.simples).toBe(true);
    expect(r.alturaConstante).toBe(true);
    const f = r.projeto!.footing;
    if (!f || !isFooting(f)) throw new Error(r.mensagens.join(' '));
    expect(f.flex.x.bars).toBeNull();
    expect(f.h0).toBe(f.h);
    expect(r.volume).toBeCloseTo(f.A * f.B * f.h, 6);
  });

  it('validação: pilares repetidos, tubulão e divisa com vários pilares são recusados', () => {
    const { s, P } = predio();
    expect(s.executar('fundacao.criar', { pilares: [P[0].id, P[0].id], tipo: 'sapata' }).ok).toBe(false);
    expect(s.executar('fundacao.criar', { pilares: [P[0].id, P[1].id], tipo: 'tubulao' }).ok).toBe(false);
    expect(s.executar('fundacao.criar', { pilares: [P[0].id, P[1].id], tipo: 'sapata', posicao: 'divisa', lado: [-1, 0] }).ok).toBe(false);
    expect(s.executar('fundacao.criar', { pilares: [P[0].id], tipo: 'bloco', simples: true }).ok).toBe(false);
  });
});

describe('bloco com vários pilares (FU3)', () => {
  it('estacas pela resultante, bielas por pilar e tirantes', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilares: [P[0].id, P[1].id], tipo: 'bloco', estaca: { id: 'e_hc' } });
    const b = s.modelo, an = analisarEdificio(b);
    const [r] = calcularFundacoes(b, an);
    const cap = r.projeto!.cap;
    expect(cap, r.mensagens.join(' ')).toBeTruthy();
    expect(r.dims.n!).toBeGreaterThanOrEqual(2);
    expect(cap!.multi!.cols).toHaveLength(2);
    expect(cap!.multi!.struts.length).toBeGreaterThanOrEqual(2);
    // as bielas somam o total das reações de cálculo (Nd,eq = n·Rd)
    expect(cap!.multi!.struts.reduce((a, q) => a + q.F, 0)).toBeCloseTo(cap!.n * cap!.Rd, 3);
    // o bloco cobre os pilares (a 4 m um do outro)
    const xs = r.contorno.map((q) => q[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(4.3);
    expect(r.grupo!.pilares).toHaveLength(2);
    expect(r.carga!.group!.cols).toHaveLength(2);
  });
});

describe('unir, igualar e impor', () => {
  it('unir: sapatas viram uma associada, igual à criada com os dois pilares', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata' });
    ok('fundacao.criar', { pilar: P[1].id, tipo: 'sapata' });
    const [e0, e1] = s.modelo.fundacao!.elementos;
    ok('fundacao.unir', { ids: [e0.id, e1.id] });
    const el = s.modelo.fundacao!.elementos;
    expect(el).toHaveLength(1);
    expect(el[0].id).toBe(e0.id);
    expect(el[0].pilares).toEqual([P[0].id, P[1].id]);
    expect(el[0].x).toBeCloseTo(2, 6);
    expect(el[0].y).toBeCloseTo(0, 6);
    expect(el[0].angulo).toBe(P[0].angulo);
    const b = s.modelo, an = analisarEdificio(b);
    const [u] = calcularFundacoes(b, an);
    const t = predio();
    t.ok('fundacao.criar', { pilares: [t.P[0].id, t.P[1].id], tipo: 'sapata' });
    const [d] = calcularFundacoes(t.s.modelo, analisarEdificio(t.s.modelo));
    expect(u.dims).toEqual(d.dims);
    expect(u.volume).toBeCloseTo(d.volume, 9);
    // desfazer restaura as duas sapatas
    s.desfazer();
    expect(s.modelo.fundacao!.elementos).toHaveLength(2);
    expect(replay(s.log)).toEqual(s.modelo);
  });

  it('unir recusa blocos e cotas diferentes; vigas entre os unidos saem', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata' });
    ok('fundacao.criar', { pilar: P[1].id, tipo: 'bloco', estaca: { id: 'e_hc' } });
    ok('fundacao.criar', { pilar: P[2].id, tipo: 'sapata', cota: -2 });
    const [e0, e1, e2] = s.modelo.fundacao!.elementos;
    expect(s.executar('fundacao.unir', { ids: [e0.id, e1.id] }).erros[0].codigo).toBe('UNIR_SO_SAPATAS');
    expect(s.executar('fundacao.unir', { ids: [e0.id, e2.id] }).erros[0].codigo).toBe('UNIR_COTAS');
  });

  it('igualar: a cópia só verifica a geometria e a armadura do modelo; carga maior reprova', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata' });
    ok('fundacao.criar', { pilar: P[2].id, tipo: 'sapata' });
    const [e0, e1] = s.modelo.fundacao!.elementos;
    ok('fundacao.igualar', { modelo: e0.id, ids: [e1.id] });
    expect(s.modelo.fundacao!.elementos[1].igualA).toBe(e0.id);
    let b = s.modelo;
    let [m, c] = calcularFundacoes(b, analisarEdificio(b));
    expect(c.igualA).toEqual({ id: e0.id, nome: m.nome });
    expect(c.dims).toEqual(m.dims);
    expect(c.status, c.mensagens.join(' ')).toBe('ok');
    const fm = m.projeto!.footing, fc = c.projeto!.footing;
    if (!fm || !fc || !isFooting(fm) || !isFooting(fc)) throw new Error('sem solução');
    expect(fc.fixed).toBe(true);
    expect(fc.flex.x.bars!.phi).toBe(fm.flex.x.bars!.phi);
    expect(fc.flex.x.bars!.n).toBe(fm.flex.x.bars!.n);
    // carga muito maior no pilar da cópia: não atende (vermelho)
    ok('carga.pilar', { pilar: P[2].id, caso: 'Q', N: 4000 });
    b = s.modelo;
    [m, c] = calcularFundacoes(b, analisarEdificio(b));
    expect(c.status).toBe('fail');
    expect(c.mensagens.join(' ')).toMatch(/Fundação (sem solução|não atende)/);
    expect(c.igualA!.nome).toBe(m.nome);
    // o modelo não é afetado
    expect(m.status).toBe('ok');
  });

  it('impor: dimensões impostas só verificadas; limpar volta ao dimensionamento', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata' });
    const e = s.modelo.fundacao!.elementos[0];
    const [livre] = calcularFundacoes(s.modelo, analisarEdificio(s.modelo));
    ok('fundacao.impor', { ids: [e.id], impostas: { A: livre.dims.A!, B: livre.dims.B!, h: livre.dims.h!, h0: livre.dims.h0! } });
    const [imp] = calcularFundacoes(s.modelo, analisarEdificio(s.modelo));
    expect(imp.status).toBe('ok');
    expect(imp.dims).toEqual(livre.dims);
    ok('fundacao.impor', { ids: [e.id], impostas: { A: 0.8, B: 0.8, h: 0.3 } });
    const [pequeno] = calcularFundacoes(s.modelo, analisarEdificio(s.modelo));
    expect(pequeno.status).toBe('fail');
    ok('fundacao.impor', { ids: [e.id], limpar: true });
    expect(s.modelo.fundacao!.elementos[0].impostas).toBeUndefined();
  });

  it('bloco e tubulão com dimensões impostas (as calculadas) são só verificados', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'bloco', estaca: { id: 'e_hc' } });
    ok('fundacao.criar', { pilar: P[1].id, tipo: 'tubulao', sigmaAdm: 600 });
    const antes = calcularFundacoes(s.modelo, analisarEdificio(s.modelo));
    for (const r of antes) expect(r.status, r.mensagens.join(' ')).toBe('ok');
    const [bl, tb] = antes;
    ok('fundacao.impor', { ids: [bl.id], impostas: { A: bl.dims.A!, B: bl.dims.B!, h: bl.dims.h! } });
    ok('fundacao.impor', { ids: [tb.id], impostas: { A: tb.dims.Db!, B: tb.dims.Db!, Df: tb.dims.Df! } });
    const depois = calcularFundacoes(s.modelo, analisarEdificio(s.modelo));
    expect(depois[0].dims).toEqual(bl.dims);
    expect(depois[1].dims).toEqual(tb.dims);
    expect(depois.every((r) => r.status === 'ok')).toBe(true);
    // base do tubulão menor que a necessária: não atende
    ok('fundacao.impor', { ids: [tb.id], impostas: { A: tb.dims.Db! - 0.3, B: tb.dims.Db! - 0.3, Df: tb.dims.Df! } });
    expect(calcularFundacoes(s.modelo, analisarEdificio(s.modelo))[1].status).toBe('fail');
  });
});

describe('modo só verificar (fundModo = 1)', () => {
  it('associada, bloco e tubulão repetem as dimensões do cálculo anterior; carga maior reprova', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilares: [P[0].id, P[1].id], tipo: 'sapata' });
    ok('fundacao.criar', { pilar: P[2].id, tipo: 'bloco', estaca: { id: 'e_hc' } });
    ok('fundacao.criar', { pilar: P[3].id, tipo: 'tubulao', sigmaAdm: 600 });
    let b = s.modelo;
    const antes = calcularFundacoes(b, analisarEdificio(b));
    for (const r of antes) expect(r.status, r.mensagens.join(' ')).toBe('ok');
    const mesmo = calcularFundacoes(b, analisarEdificio(b), { modo: 1, anteriores: antes });
    expect(mesmo.map((r) => r.dims)).toEqual(antes.map((r) => r.dims));
    expect(mesmo.every((r) => r.status === 'ok')).toBe(true);
    // carga muito maior nos pilares: as dimensões anteriores não atendem mais
    ok('carga.pilar', { pilar: P[0].id, caso: 'Q', N: 3000 });
    ok('carga.pilar', { pilar: P[2].id, caso: 'Q', N: 3000 });
    b = s.modelo;
    const verif = calcularFundacoes(b, analisarEdificio(b), { modo: 1, anteriores: antes });
    expect(verif[0].status).toBe('fail');
    expect(verif[0].mensagens.join(' ')).toMatch(/Fundação sem solução: As dimensões impostas/);
    expect(verif[0].dims.A).toBe(antes[0].dims.A); // a base imposta continua desenhada (vermelha)
    expect(verif[0].contorno).toHaveLength(4);
    expect(verif[1].dims.n).toBeGreaterThan(0);
    expect(verif[1].status).toBe('fail');
    // dimensionar de novo resolve (mais estacas / sapata maior)
    const novo = calcularFundacoes(b, analisarEdificio(b));
    expect(novo[0].dims.A! * novo[0].dims.B!).toBeGreaterThan(antes[0].dims.A! * antes[0].dims.B!);
  });
});

describe('limites (FU3)', () => {
  it('sapata de altura constante é aparada; a de altura variável ignora o limite com aviso', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata', alturaConstante: true });
    ok('fundacao.criar', { pilar: P[1].id, tipo: 'sapata' });
    ok('limite.criar', { pontos: [[-0.6, -5], [-0.6, 5]], nome: 'Divisa' });
    ok('limite.criar', { pontos: [[4.6, -5], [4.6, 5]], nome: 'Divisa 2' });
    const b = s.modelo;
    expect(usaGrupo(b, b.fundacao!.elementos[0], -1.5)).toBe(true);
    expect(usaGrupo(b, b.fundacao!.elementos[1], -1.5)).toBe(false);
    const [a, v] = calcularFundacoes(b, analisarEdificio(b));
    // altura constante: contorno não passa do limite em x = −0,6
    expect(Math.min(...a.contorno.map((q) => q[0]))).toBeGreaterThanOrEqual(-0.6 - 1e-6);
    expect(a.alturaConstante).toBe(true);
    expect(a.dims.h0).toBe(a.dims.h);
    // altura variável: o limite em x = 4,6 corta a sapata (A/2 > 0,6) e é ignorado com aviso
    expect(Math.max(...v.contorno.map((q) => q[0]))).toBeGreaterThan(4.6);
    expect(v.mensagens.join(' ')).toMatch(/Limite Divisa 2 ignorado: só vale para sapata de altura constante/);
    const rv = revisarEdificio(b, analisarEdificio(b), dimensionarEdificio(b, analisarEdificio(b)));
    expect(rv.itens.some((i) => i.codigo === 'FUND_LIMITE_IGNORADO' && i.nivel === 'aviso')).toBe(true);
  });

  it('limite que corta o pilar é ignorado com aviso', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata', alturaConstante: true });
    ok('limite.criar', { pontos: [[0.05, -5], [0.05, 5]], nome: 'Corta' });
    const b = s.modelo;
    const [a] = calcularFundacoes(b, analisarEdificio(b));
    expect(a.grupo!.limitesIgnorados).toEqual([{ id: b.fundacao!.limites![0].id, nome: 'Corta', motivo: 'corta o pilar P1' }]);
    expect(a.mensagens.join(' ')).toMatch(/Limite Corta ignorado: corta o pilar P1/);
    expect(a.status).toBe('ok');
  });

  it('limite por cota vale só para o nível; remover volta ao cálculo comum', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata', alturaConstante: true });
    ok('limite.criar', { pontos: [[-0.6, -5], [-0.6, 5]], cota: -9 });
    const b = s.modelo;
    expect(usaGrupo(b, b.fundacao!.elementos[0], -1.5)).toBe(false);
    ok('limite.editar', { id: b.fundacao!.limites![0].id, limpar: ['cota'] });
    expect(usaGrupo(s.modelo, s.modelo.fundacao!.elementos[0], -1.5)).toBe(true);
    ok('limite.remover', { ids: [s.modelo.fundacao!.limites![0].id] });
    expect(s.modelo.fundacao!.limites).toBeUndefined();
  });
});

describe('sobreposição (FU3)', () => {
  it('sapatas sobrepostas dão aviso e o comando elimina unindo-as numa associada', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata' });
    ok('fundacao.criar', { pilar: P[1].id, tipo: 'sapata' });
    let b = s.modelo;
    let res = calcularFundacoes(b, analisarEdificio(b));
    expect(gruposSobrepostos(res)).toEqual([]);
    // imposta 7 × 2 m na primeira: invade a segunda (a 4 m)
    ok('fundacao.impor', { ids: [b.fundacao!.elementos[0].id], impostas: { A: 7, B: 2, h: 1 } });
    b = s.modelo;
    const an = analisarEdificio(b);
    res = calcularFundacoes(b, an);
    expect(res.every((r) => r.mensagens.some((m) => /^Fundação sobreposta/.test(m)))).toBe(true);
    const grupos = gruposSobrepostos(res);
    expect(grupos).toHaveLength(1);
    expect(new Set(grupos[0])).toEqual(new Set(res.map((r) => r.id)));
    const rv = revisarEdificio(b, an, dimensionarEdificio(b, an));
    expect(rv.itens.filter((i) => i.codigo === 'FUND_SOBREPOSTA' && i.nivel === 'aviso')).toHaveLength(2);
    // elimina: um só elemento com os dois pilares
    ok('fundacao.eliminarSobreposicoes', { grupos });
    expect(s.modelo.fundacao!.elementos).toHaveLength(1);
    expect(s.modelo.fundacao!.elementos[0].pilares).toEqual([P[0].id, P[1].id]);
    res = calcularFundacoes(s.modelo, analisarEdificio(s.modelo));
    expect(gruposSobrepostos(res)).toEqual([]);
    expect(res[0].mensagens.join(' ')).not.toMatch(/sobreposta/);
  });
});

describe('cruzamento de vigas de fundação (C11.53)', () => {
  it('reações da viga contínua com apoio intermediário: carga uniforme dá 5qL/8 no apoio do meio', () => {
    const L = 6, q = 3, n = 600;
    const cs = Array.from({ length: n }, (_, k) => ({ s: ((k + 0.5) * L) / n, P: (q * L) / n }));
    const r = reacoesComApoios(L, cs, [L / 2]);
    expect(r.R[0]).toBeCloseTo((5 * q * L) / 8, 3);
    expect(r.ini).toBeCloseTo((3 * q * L) / 16, 3);
    expect(r.fim).toBeCloseTo((3 * q * L) / 16, 3);
    // carga concentrada no meio de uma viga com apoio no meio: toda no apoio
    const p = reacoesComApoios(L, [{ s: L / 2, P: 100 }], [L / 2]);
    expect(p.R[0]).toBeCloseTo(100, 9);
    expect(p.ini).toBeCloseTo(0, 9);
    // sem apoio intermediário: biapoiada
    const bi = reacoesComApoios(L, [{ s: 1.5, P: 100 }], []);
    expect(bi.ini).toBeCloseTo(75, 9);
    expect(bi.fim).toBeCloseTo(25, 9);
  });

  it('duas diagonais que se cruzam: uma apoia a outra (peso próprio: 5qL/8) e as reações das pontas conferem', () => {
    const { s, ok, P } = predio();
    ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata' });
    ok('fundacao.criar', { pilar: P[1].id, tipo: 'sapata' });
    ok('fundacao.criar', { pilar: P[2].id, tipo: 'sapata' });
    ok('fundacao.criar', { pilar: P[3].id, tipo: 'sapata' });
    const el = s.modelo.fundacao!.elementos;
    ok('vigaFundacao.criar', { tipo: 'travamento', ini: el[0].id, fim: el[2].id, b: 0.2, h: 0.4, fixa: true, nome: 'D1' });
    ok('vigaFundacao.criar', { tipo: 'travamento', ini: el[1].id, fim: el[3].id, b: 0.2, h: 0.4, fixa: true, nome: 'D2' });
    const b = s.modelo, an = analisarEdificio(b);
    const { vigas } = calcularFundacaoEdificio(b, an);
    const d1 = vigas.find((v) => v.nome === 'D1')!, d2 = vigas.find((v) => v.nome === 'D2')!;
    // mesma seção e tipo: a lançada antes (D1) apoia a outra
    expect(d1.cruzamentos).toHaveLength(1);
    expect(d1.cruzamentos![0]).toMatchObject({ com: 'D2', papel: 'apoio' });
    expect(d2.cruzamentos![0]).toMatchObject({ com: 'D1', papel: 'apoiada' });
    const L = 4 * Math.SQRT2, q = 25 * 0.2 * 0.4, qL = q * L;
    expect(d2.cruzamentos![0].s).toBeCloseTo(L / 2, 2);
    expect(d2.cruzamentos![0].R).toBeCloseTo((5 * qL) / 8, 1);
    expect(d1.cruzamentos![0].R).toBeCloseTo((5 * qL) / 8, 1);
    // reações nas pontas (peso próprio): D2 = 3qL/16 cada; D1 = qL/2 + (5qL/8)/2
    expect(d2.cargas.ini).toBeCloseTo((3 * qL) / 16, 1);
    expect(d1.cargas.ini).toBeCloseTo(qL / 2 + (5 * qL) / 16, 1);
    expect(d2.mensagens.join(' ')).toMatch(/D2 cruza D1/);
    const rv = revisarEdificio(b, an, dimensionarEdificio(b, an));
    expect(rv.itens.some((i) => i.codigo === 'FUND_VIGA_CRUZA' && i.nivel === 'aviso')).toBe(true);
    // sem o cruzamento (só D2) a viga é biapoiada: reações qL/2
    s.executar('vigaFundacao.remover', { ids: [b.fundacao!.vigas![0].id] });
    const solo = calcularFundacaoEdificio(s.modelo, analisarEdificio(s.modelo)).vigas[0];
    expect(solo.cruzamentos).toBeUndefined();
    expect(solo.cargas.ini).toBeCloseTo(qL / 2, 1);
  });
});
