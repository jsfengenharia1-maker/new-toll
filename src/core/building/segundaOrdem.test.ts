// N2c: pilares e 2ª ordem no edifício — P-Δ 3D × γz, excentricidade entre lances, vínculo externo com molas,
// cargas no pilar (uniforme, faixa, local, torção), lances desligados, apoio intermediário, comprimento entre faces,
// efeitos locais por esbeltez (curvatura aproximada, fluência, método geral), seções intermediárias e cortante por direção.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { combinacoesEdificio } from './combinacoes';
import { dimensionarEdificio, esforcosAoLongo } from './dimensionamento';
import { flambagemLance, travamentoNoTopo } from './materiais';
import { cotaFundacao, lancesDoPilar } from './types';

function sessao() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  return { s, ok };
}

/** Pórtico 3 × 2 vãos em pilares 20 × 50 com lajes maciças no Tipo (o edifício da regressão R7-0). */
function predio(vezes = 0) {
  const { s, ok } = sessao();
  if (vezes) ok('pavimento.repetir', { id: 'pav_6', vezes });
  const xs = [0, 5, 10, 15], ys = [0, 4.5, 9];
  ok('lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } });
  ok('lote', { comandos: [...ys.map((y) => v([[0, y], [15, y]])), ...xs.map((x) => v([[x, 0], [x, 9]]))] });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return { s, ok };
}

/** Um pilar isolado (sem vigas) que vai da fundação ao Térreo. */
function pilarIsolado(secao = { tipo: 'ret', b: 0.3, h: 0.3 }, extra: Record<string, unknown> = {}) {
  const { s, ok } = sessao();
  const terreo = s.modelo.pavimentos.find((p) => p.nome === 'Térreo')!;
  ok('pilar.inserir', { x: 0, y: 0, secao, morre: terreo.id, ...extra });
  return { s, ok, p: s.modelo.pilares[0], terreo };
}

describe('P-Δ 3D no edifício (opção segundaOrdem)', () => {
  const { s } = predio(5);
  const a0 = analisarEdificio(s.modelo);
  s.executar('opcoes.definir', { valores: { segundaOrdem: 1 } });
  const a1 = analisarEdificio(s.modelo);
  it('desligada: sem casos de 2ª ordem e combinações com 0,95·γz (comportamento anterior)', () => {
    expect(a0.segundaOrdem).toBeUndefined();
    expect(a0.portico.resPDelta).toBeUndefined();
    const c0 = combinacoesEdificio(s.modelo, a0).find((c) => c.nome === 'ELU G desf. · W0° principal')!;
    expect(c0.fatores['W0°']).toBeCloseTo(1.4 * a0.vento!.gamaZ[0].ampliacao, 3);
    expect(Object.keys(c0.fatores).some((k) => k.startsWith('PΔ'))).toBe(false);
  });
  it('ligada: um caso por combinação ELU, sem a ampliação do vento; amplificação ≈ γz (± 5 %)', () => {
    const so = a1.segundaOrdem!;
    expect(so.metodo).toBe('pDelta');
    const elu = combinacoesEdificio(s.modelo, a1).filter((c) => c.tipo === 'ELU');
    expect(so.combinacoes).toHaveLength(elu.length);
    expect(so.combinacoes.every((c) => c.convergiu && c.caso)).toBe(true);
    const c1 = elu.find((c) => c.nome === 'ELU G desf. · W0° principal')!;
    expect(c1.fatores['W0°']).toBeCloseTo(1.4, 9); // sem 0,95·γz
    const pd = so.combinacoes.find((c) => c.nome === c1.nome)!;
    expect(c1.fatores[pd.caso!]).toBe(1);
    // vento principal: amplificação dos deslocamentos × γz do vento principal; uso principal × γz do uso principal
    const gz = a1.vento!.gamaZ[0];
    expect(Math.abs(pd.amplificacao / gz.ventoPrincipal - 1)).toBeLessThan(0.05);
    const pdQ = so.combinacoes.find((c) => c.nome === 'ELU G desf. · Q principal + W0°')!;
    expect(Math.abs(pdQ.amplificacao / gz.usoPrincipal - 1)).toBeLessThan(0.05);
    // o γz continua informado e igual ao da análise sem P-Δ
    expect(gz.max).toBeCloseTo(a0.vento!.gamaZ[0].max, 9);
  });
  it('momento de tombamento de 2ª ordem (Σ forças fictícias × z) ≈ (γz − 1) × M1 do vento (± 5 %)', () => {
    const comb = combinacoesEdificio(s.modelo, a1).find((c) => c.nome === 'ELU G desf. · W0° principal')!;
    const pd = a1.segundaOrdem!.combinacoes.find((c) => c.nome === comb.nome)!, k = +pd.caso!.slice(3) - 1;
    const m = a1.portico.modelo, cv = a1.vento!.casos.find((c) => c.nome === 'W0°')!;
    const M1 = 1.4 * cv.forcas.reduce((t, f) => t + Math.abs(f.F) * f.z, 0);
    // forças fictícias: pares internos (soma nula), o momento delas é Σ N·Δ dos pilares
    const F = a1.portico.casosPDelta![k].nodais;
    expect(Math.abs(F.reduce((t, n) => t + n.f[0], 0))).toBeLessThan(1e-6);
    const dM = F.reduce((t, n) => t + n.f[0] * m.nos[n.no][2], 0);
    expect(Math.abs((1 + dM / M1) / a1.vento!.gamaZ[0].ventoPrincipal - 1)).toBeLessThan(0.05);
  });
  it('dimensionamento usa os casos de 2ª ordem; pilares e vigas mudam pouco', () => {
    const d0 = dimensionarEdificio(s.modelo, { ...a0, opcoes: { ...a0.opcoes } });
    const d1 = dimensionarEdificio(s.modelo, a1);
    const nd = (d: typeof d0) => d.pilares.filter((x) => x.pilar === s.modelo.pilares[4].id).map((x) => x.Nd);
    nd(d1).forEach((v, i) => expect(Math.abs(v / nd(d0)[i] - 1)).toBeLessThan(0.05));
    const v2 = (d: typeof d0) => d.vigas.find((x) => x.nome === 'V2')!.Mneg;
    // N2e: com o arredondamento do diagrama o negativo de projeto é o da face (γz −88,7 × P-Δ −96,3 kN·m = 8,5 %; antes, dentro do apoio, 5 %)
    expect(Math.abs(v2(d1) / v2(d0) - 1)).toBeLessThan(0.1);
  });
});

describe('modelo dos pilares (N2c)', () => {
  it('excentricidade entre lances: trecho rígido horizontal e N·e no lance de baixo (cálculo manual)', () => {
    const { s, ok } = sessao();
    const t1 = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!, terreo = s.modelo.pavimentos.find((p) => p.nome === 'Térreo')!;
    // face oeste fixa (ajuste "o"): 20 × 60 até o Térreo, 20 × 30 no lance de cima → centros a 0,15 m em x
    ok('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.6, h: 0.2 }, ajuste: 'o', morre: t1.id });
    const p = s.modelo.pilares[0];
    ok('pilar.secaoLance', { id: p.id, pavimento: t1.id, secao: { tipo: 'ret', b: 0.3, h: 0.2 } });
    ok('carga.pilar', { pilar: p.id, pavimento: t1.id, caso: 'Q', N: 100 });
    const an = analisarEdificio(s.modelo), m = an.portico.modelo;
    const b1 = an.portico.barras.findIndex((t) => t.tipo === 'pilar' && t.pavimento === terreo.id), b2 = an.portico.barras.findIndex((t) => t.tipo === 'pilar' && t.pavimento === t1.id);
    expect(m.barras[b2].offI?.[0]).toBeCloseTo(-0.15, 9);
    expect(m.barras[b1].offI).toBeUndefined();
    const iq = an.casos.indexOf('Q');
    const e1 = esforcosAoLongo(m, b1, an.portico.res!.esforcos[iq][b1], undefined, [0, 1]);
    // M = N·e = 100 × 0,15 = 15 kN·m constante no lance de baixo (balanço sem carga horizontal)
    expect(Math.abs(e1[0].Mz)).toBeCloseTo(15, 6);
    expect(Math.abs(e1[1].Mz)).toBeCloseTo(15, 6);
    const e2 = esforcosAoLongo(m, b2, an.portico.res!.esforcos[iq][b2], undefined, [0]);
    expect(Math.abs(e2[0].Mz)).toBeLessThan(1e-9);
  });

  it('vínculo externo com molas de rotação: deslocamento do topo = HL³/(3EI) + HL²/kθ e giro da base = M/kθ', () => {
    const { s, ok, p } = pilarIsolado();
    const kr = 20000;
    ok('pilar.vinculo', { ids: [p.id], base: { tipo: 'molas', kry: kr } });
    ok('carga.pilar', { pilar: p.id, caso: 'Q', Hx: 10 });
    const an = analisarEdificio(s.modelo), m = an.portico.modelo;
    const bi = an.portico.barras.findIndex((t) => t.tipo === 'pilar'), br = m.barras[bi], L = m.nos[br.j][2] - m.nos[br.i][2];
    const EI = br.E * br.Iz, iq = an.casos.indexOf('Q'), u = an.portico.res!.desloc[iq];
    expect(u[br.j * 6]).toBeCloseTo((10 * L ** 3) / (3 * EI) + (10 * L * L) / kr, 9);
    expect(Math.abs(u[br.i * 6 + 4])).toBeCloseTo((10 * L) / kr, 9);
    // reação: momento da mola = H·L, cortante = H
    const f = an.fundacao.find((x) => x.caso === 'Q')!;
    expect(Math.abs(f.Vx)).toBeCloseTo(10, 9);
    expect(Math.abs(f.My)).toBeCloseTo(10 * L, 6);
  });

  it('cota própria da base (desnível) e rótula', () => {
    const { s, ok, p } = pilarIsolado();
    ok('pilar.vinculo', { ids: [p.id], cotaBase: -3 });
    const an = analisarEdificio(s.modelo), m = an.portico.modelo, br = m.barras[an.portico.barras.findIndex((t) => t.tipo === 'pilar')];
    expect(m.nos[br.i][2]).toBeCloseTo(-3, 9);
    expect(flambagemLance(s.modelo, s.modelo.pilares[0], s.modelo.pilares[0].morre).l).toBeCloseTo(3, 9);
    ok('pilar.vinculo', { ids: [p.id], base: { tipo: 'rotula' }, cotaFundacao: true });
    const an2 = analisarEdificio(s.modelo);
    expect(an2.portico.modelo.apoios.get(an2.portico.modelo.barras[0].i)).toEqual([0, 1, 2, 5]);
    expect(s.modelo.pilares[0].cotaBase).toBeUndefined();
  });

  it('carga uniforme no pilar contra viga engastada (balanço): momento qL²/2 e flecha qL⁴/(8EI); faixa e eixos locais', () => {
    const { s, ok, p } = pilarIsolado({ tipo: 'ret', b: 0.3, h: 0.3 }, { angulo: 90 });
    ok('carga.pilar', { pilar: p.id, caso: 'Q', tipo: 'uniforme', Hx: 2, eixos: 'local' }); // x local (b) = Y global com 90°
    const an = analisarEdificio(s.modelo), m = an.portico.modelo, br = m.barras[0], L = m.nos[br.j][2] - m.nos[br.i][2];
    const iq = an.casos.indexOf('Q'), u = an.portico.res!.desloc[iq], f = an.fundacao.find((x) => x.caso === 'Q')!;
    expect(Math.abs(f.Mx)).toBeCloseTo((2 * L * L) / 2, 6);
    expect(Math.abs(f.Vy)).toBeCloseTo(2 * L, 6);
    expect(Math.abs(f.Vx)).toBeLessThan(1e-9);
    expect(Math.abs(u[br.j * 6 + 1])).toBeCloseTo((2 * L ** 4) / (8 * br.E * br.Iz), 9);
    // faixa de 0,5 m a 1,0 m (global): M na base = q·(a1 − a0)·(a0 + a1)/2 (20 resultantes: exato no momento da base)
    const { s: s2, ok: ok2, p: p2 } = pilarIsolado();
    ok2('carga.pilar', { pilar: p2.id, caso: 'Q', tipo: 'faixa', altura: 0.5, ate: 1, Hx: 4, T: 3 });
    const f2 = analisarEdificio(s2.modelo).fundacao.find((x) => x.caso === 'Q')!;
    expect(Math.abs(f2.My)).toBeCloseTo(4 * 0.5 * 0.75, 9);
    expect(s2.modelo.cargasPilar![0].T).toBeUndefined(); // torção só na concentrada
    ok2('carga.pilar', { pilar: p2.id, caso: 'G', T: 3 });
    const an3 = analisarEdificio(s2.modelo), ig = an3.casos.indexOf('G'), bb = an3.portico.modelo.barras[0];
    expect(Math.abs(an3.portico.res!.reacoes[ig].get(bb.i)![5])).toBeCloseTo(3, 9);
  });

  it('comprimento flexível entre faces: trecho rígido vertical da altura da viga no topo', () => {
    const { s } = predio();
    s.executar('opcoes.definir', { valores: { pilarComprimento: 1 } });
    const an = analisarEdificio(s.modelo), t1 = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!;
    const bi = an.portico.barras.findIndex((t) => t.tipo === 'pilar' && t.pavimento === t1.id);
    expect(an.portico.modelo.barras[bi].offJ).toEqual([0, 0, -0.5]);
  });
});

describe('flambagem: lances desligados e apoio intermediário (N2c)', () => {
  it('Térreo sem vigas nem lajes: o lance do Tipo 1 soma o de baixo (ℓe = Σℓ)', () => {
    const { s, ok } = predio();
    const p = s.modelo.pilares[0], [l0, l1, l2] = lancesDoPilar(s.modelo, p);
    expect(travamentoNoTopo(s.modelo, p, l0.id)).toEqual([false, false]);
    expect(travamentoNoTopo(s.modelo, p, l1.id)).toEqual([true, true]);
    const f = flambagemLance(s.modelo, p, l1.id), soma = l1.cota - cotaFundacao(s.modelo);
    expect(f.leU).toBeCloseTo(soma, 9);
    expect(f.desligados).toEqual([2, 2]);
    expect(flambagemLance(s.modelo, p, l0.id).leU).toBeCloseTo(soma, 9);
    expect(flambagemLance(s.modelo, p, l2.id).desligados).toEqual([1, 1]);
    // perfil NBR (ou a opção desligada): lance a lance
    ok('opcoes.definir', { valores: { pilarLancesDesligados: 0 } });
    expect(flambagemLance(s.modelo, p, l1.id).leU).toBeCloseTo(2.5 + 0.2, 9);
  });
  it('viga só numa direção trava só essa direção', () => {
    const { s, ok } = sessao();
    ok('lote', { comandos: [[0, 0], [5, 0]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.4 } } })) });
    ok('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [5, 0]], secao: { b: 0.15, h: 0.5 } });
    const p = s.modelo.pilares[0], t1 = s.modelo.pavimentos.find((x) => x.grupo === 'g_3')!;
    expect(travamentoNoTopo(s.modelo, p, t1.id)).toEqual([true, false]);
  });
  it('apoio intermediário a 1,0 m: ℓe pelo maior trecho na direção indicada', () => {
    const { s, ok } = predio();
    ok('opcoes.definir', { valores: { pilarLancesDesligados: 0 } });
    const p = s.modelo.pilares[0], l1 = lancesDoPilar(s.modelo, p)[1];
    ok('pilar.vinculo', { ids: [p.id], apoio: { pavimento: l1.id, altura: 1, direcao: 'u' } });
    const f = flambagemLance(s.modelo, s.modelo.pilares[0], l1.id);
    expect(f.leU).toBeCloseTo(2, 9);
    expect(f.leV).toBeCloseTo(2.5 + 0.5, 9);
    ok('pilar.vinculo', { ids: [p.id], apoio: { pavimento: l1.id, altura: 0 } });
    expect(s.modelo.pilares[0].apoiosIntermediarios).toBeUndefined();
  });
});

describe('efeitos locais, seções intermediárias e cortante por direção (N2c)', () => {
  const montar = (au: number) => {
    const { s, ok } = predio();
    ok('opcoes.definir', { valores: { pilarLancesDesligados: 0 } });
    const p = s.modelo.pilares[4], l1 = lancesDoPilar(s.modelo, p)[1];
    ok('pilar.flambagem', { ids: [p.id], pavimentos: [l1.id], au });
    const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
    return { s, r: d.pilares.find((x) => x.pilar === p.id && x.pavimentoId === l1.id)! };
  };
  it('λ ≤ 90: curvatura aproximada; 90 < λ ≤ 140: com fluência (e_cc > 0); 140 < λ ≤ 200: método geral', () => {
    const r0 = montar(1).r;
    expect(r0.local!.metodo[0]).toBe('curvatura');
    expect(r0.local!.ecc).toEqual([0, 0]);
    const r1 = montar(2.2).r;
    expect(r1.lambda[0]).toBeGreaterThan(90);
    expect(r1.local!.metodo[0]).toBe('curvaturaFluencia');
    expect(r1.local!.ecc[0]).toBeGreaterThan(0);
    expect(r1.mensagens.find((m) => m.startsWith('λ > 90'))).toMatch(/fluência.*e_cc/);
    expect(r1.status).not.toBe('review');
    const r2 = montar(3.2).r;
    expect(r2.lambda[0]).toBeGreaterThan(140);
    expect(r2.local!.metodo[0]).toBe('geral');
    expect(r2.mensagens.find((m) => m.startsWith('λ > 90'))).toMatch(/método geral/);
    expect(Number.isFinite(r2.util)).toBe(true);
  });
  it('carga horizontal no meio do lance: seções intermediárias e cortante nas duas direções', () => {
    const { s, ok } = predio();
    ok('opcoes.definir', { valores: { pilarLancesDesligados: 0 } });
    const p = s.modelo.pilares[4], l1 = lancesDoPilar(s.modelo, p)[1];
    ok('carga.pilar', { pilar: p.id, pavimento: l1.id, caso: 'Q', altura: 1.5, Hx: 40, Hy: 20 });
    const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
    const r = d.pilares.find((x) => x.pilar === p.id && x.pavimentoId === l1.id)!;
    expect(r.local!.secoesIntermediarias).toBe(true);
    expect(r.determinantes!.some((x) => x.Mi)).toBe(true);
    expect(r.cortante!.u.Vsd).toBeGreaterThan(0);
    expect(r.cortante!.v!.Vsd).toBeGreaterThan(0);
    expect(r.cortante!.u.VRd2).toBeGreaterThan(r.cortante!.u.Vsd);
    expect(r.cortante!.u.AsLong).toBeGreaterThan(0);
  });
  it('taxa mínima do usuário substitui os 0,4 %', () => {
    const { s, ok } = predio();
    ok('opcoes.definir', { valores: { pilarTaxaMin: 1.5, pilarLancesDesligados: 0 } });
    const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
    for (const r of d.pilares.filter((x) => x.As > 0)) expect(r.As).toBeGreaterThanOrEqual(0.015 * 0.2 * 0.5 - 1e-9);
  });
});
