// FU7c: base da parede com molas (k alto), em viga de fundação, vigas embutidas em paredes e pilares-parede, contra cálculo manual.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { calcularCorridas } from './sapataCorrida';
import type { BuildingModel } from './types';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('obra.definir', { profundidadeFundacao: 1 });
  for (const n of ['Cobertura', 'Tipo 3', 'Tipo 2']) s.executar('pavimento.remover', { id: s.modelo.pavimentos.find((p) => p.nome === n)!.id });
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const nomePav = (b: BuildingModel, nome: string) => b.pavimentos.find((p) => p.nome === nome)!.id;

function umaParede(extra: Record<string, unknown> = {}, k?: number) {
  const s = padrao();
  ok(s, 'fundacao.terreno', { sigmaAdm: 200 });
  if (k !== undefined) ok(s, 'opcoes.definir', { valores: { fundParedeK: k } });
  ok(s, 'parede.criar', { pontos: [[0, 0], [12, 0]], espessura: 0.2, morre: nomePav(s.modelo, 'Tipo 1'), ...extra });
  return s;
}

describe('FU7c: base da parede sobre molas de Winkler (k alto)', () => {
  it('assentamento uniforme w = q/(k·B) sob 20 kN/m com B = espessura + 2 × 30 cm = 0,80 m', () => {
    const s = umaParede({ base: { tipo: 'sapataCorrida' } });
    const b = s.modelo, an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const md = an.portico.modelo, res = an.portico.res!;
    const iG = an.casos.indexOf('G');
    // nós da base no meio do vão (3 < x < 9 m): w = 20/(100000·0,8) = 2,5e-4 m
    const base = an.paredes!.base[b.paredes![0].id];
    const nos = base.filter((n) => md.nos[n][0] > 3 && md.nos[n][0] < 9);
    expect(nos.length).toBeGreaterThan(5);
    for (const n of nos) expect(res.desloc[iG][n * 6 + 2]).toBeCloseTo(-2.5e-4, 5);
    // as molas recebem todo o peso (12 m × 20 kN/m = 240 kN)
    let soma = 0;
    for (const m of md.molas!.filter((x) => x.gdl === 2 && base.includes(x.no))) soma += -m.k * res.desloc[iG][m.no * 6 + 2];
    expect(soma).toBeCloseTo(240, 1);
  });

  it('k = 0 volta ao engaste (sem molas)', () => {
    const s = umaParede({ base: { tipo: 'sapataCorrida' } }, 0);
    const an = analisarEdificio(s.modelo);
    const base = an.paredes!.base[s.modelo.paredes![0].id];
    expect(an.portico.modelo.molas?.filter((m) => base.includes(m.no)) ?? []).toEqual([]);
  });

  it('B informada na base da parede substitui o estimado: w = q/(k·B) com B = 1,00 m', () => {
    const s = umaParede({ base: { tipo: 'sapataCorrida', largura: 1 } });
    const an = analisarEdificio(s.modelo), md = an.portico.modelo, iG = an.casos.indexOf('G');
    const n = an.paredes!.base[s.modelo.paredes![0].id].find((q) => Math.abs(md.nos[q][0] - 6) < 1e-6)!;
    expect(an.portico.res!.desloc[iG][n * 6 + 2]).toBeCloseTo(-2e-4, 5);
  });

  it('a carga por metro da sapata corrida continua 20 kN/m com as reações das molas', () => {
    const s = umaParede({ base: { tipo: 'sapataCorrida' } });
    const b = s.modelo, an = analisarEdificio(b);
    const r = calcularCorridas(b, an)[0];
    expect(r.carga!.Nk).toBeGreaterThan(19);
    expect(r.carga!.Nk).toBeLessThan(21);
  });
});

/** Duas paredes frente a frente (y = 0 e 6), da fundação (−1) ao Tipo 1 (+3), terreno por fora (K0 = 0,5, γ 18, aterro em +3) e laje no topo. */
function caixa(k: number, base: Record<string, unknown> = { tipo: 'sapataCorrida' }) {
  const s = padrao();
  ok(s, 'fundacao.terreno', { sigmaAdm: 200 });
  ok(s, 'opcoes.definir', { valores: { fundParedeK: k, fundCorridaDeslizamento: 0 } });
  ok(s, 'empuxo.tipo', { nome: 'Aterro', metodo: 'repouso', estratos: [{ espessura: 20, gama: 18, phi: 30 }], cotaAterro: 3 });
  ok(s, 'caso.criar', { nome: 'Empuxo', natureza: 'H', empuxo: s.modelo.empuxos![0].id });
  const caso = s.modelo.casos!.find((c) => c.nome === 'Empuxo')!.id, t1 = nomePav(s.modelo, 'Tipo 1');
  const g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
  ok(s, 'parede.criar', { pontos: [[0, 0], [12, 0]], espessura: 0.2, morre: t1, base });
  ok(s, 'parede.criar', { pontos: [[0, 6], [12, 6]], espessura: 0.2, morre: t1, base });
  const [a, z] = s.modelo.paredes!;
  ok(s, 'parede.empuxo', { parede: a.id, empuxos: [{ caso, lado: 'dir' }] });
  ok(s, 'parede.empuxo', { parede: z.id, empuxos: [{ caso, lado: 'esq' }] });
  ok(s, 'laje.criar', { grupo: g, contorno: [[0, 0], [12, 0], [12, 6], [0, 6]] });
  return s;
}

describe('FU7c: o giro da mola de base reduz o momento do muro de subsolo (peça apoiada no topo)', () => {
  it('M_base = kθ·θ0/(1 + kθ·H/(3EI)) com kθ = k·B³/12 e θ0 = q0·H³/(45·EI), q0 = 36 kN/m², H = 4 m', () => {
    const k = 100000, B = 0.8; // B das molas = espessura 0,20 + 2 × 0,30
    const sEng = caixa(0), sMola = caixa(k);
    const rEng = calcularCorridas(sEng.modelo, analisarEdificio(sEng.modelo))[0], anM = analisarEdificio(sMola.modelo);
    const rMola = calcularCorridas(sMola.modelo, anM)[0];
    const c = anM.portico.modelo.cascas![0], EI = (c.E * c.h ** 3) / 12, H = 4, q0 = 36;
    const kt = (k * B ** 3) / 12, th0 = (q0 * H ** 3) / (45 * EI);
    const M = (kt * th0) / (1 + (kt * H) / (3 * EI));
    expect(rEng.parede!.M).toBeGreaterThan(27); // referência engastada (q0·H²/20 a q0·H²/15)
    expect(rMola.parede!.M).toBeLessThan(rEng.parede!.M);
    expect(Math.abs(rMola.parede!.M - M) / M).toBeLessThan(0.1);
  });
});

describe('FU7c: base da parede em viga de fundação (viga sobre base elástica ligada aos nós da casca)', () => {
  const viga = { tipo: 'viga', largura: 0.6, altura: 0.5 };
  it('assentamento uniforme w = (20 + 25·0,6·0,5)/(k·b) = 27,5/(100000·0,6) e tensão no solo 27,5/0,6 = 45,8 kN/m²', () => {
    const s = umaParede({ base: viga });
    const b = s.modelo, an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    expect(an.avisos.filter((a) => /nó da base da casca/.test(a))).toEqual([]);
    const md = an.portico.modelo, iG = an.casos.indexOf('G'), res = an.portico.res!;
    const nos = an.baseElastica!.nos.filter((n) => n.ref === `vf_${b.paredes![0].id}` && n.x > 3 && n.x < 9);
    expect(nos.length).toBeGreaterThan(5);
    for (const n of nos) expect(res.desloc[iG][n.no * 6 + 2]).toBeCloseTo(-27.5 / (1e5 * 0.6), 5);
    // a casca compartilha os nós da viga: nenhum nó da base da casca fica fora do conjunto da viga
    expect(an.paredes!.base[b.paredes![0].id]).toEqual([]);
    expect(md.cascas!.length).toBeGreaterThan(0);
    const d = dimensionarEdificio(b, an);
    const r = d.vigasElasticas!.find((x) => x.parede === b.paredes![0].id)!;
    expect(r).toBeDefined();
    expect(r.sigmaMax).toBeGreaterThan(45);
    expect(r.sigmaMax).toBeLessThan(47);
    expect(r.recalque).toBeCloseTo(27.5 / (1e5 * 0.6), 4);
  });

  it('a parede com apoio direto ou sapata corrida não cria viga de fundação', () => {
    const s = umaParede({ base: { tipo: 'sapataCorrida' } });
    expect(analisarEdificio(s.modelo).baseElastica).toBeUndefined();
  });
});

describe('FU7c: vigas embutidas em paredes de concreto: armadura própria (mínimos da NBR 6118)', () => {
  function comViga(opcoes: Record<string, unknown> = {}) {
    const s = padrao();
    ok(s, 'fundacao.terreno', { sigmaAdm: 200 });
    if (Object.keys(opcoes).length) ok(s, 'opcoes.definir', { valores: opcoes });
    const t1 = nomePav(s.modelo, 'Tipo 1');
    ok(s, 'parede.criar', { pontos: [[0, 0], [6, 0]], espessura: 0.2, morre: t1 });
    const g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
    ok(s, 'viga.tracar', { grupo: g, pontos: [[0, 0], [6, 0]], secao: { b: 0.2, h: 0.4 } });
    ok(s, 'viga.embutir', { viga: s.modelo.vigas.at(-1)!.id, parede: s.modelo.paredes![0].id });
    return s;
  }
  it('As,mín = 0,15 % · b · h (C30, NBR 6118, tabela 17.3) = 1,20 cm² e estribo de ρsw,mín = 0,2·fctm/fywk', () => {
    const s = comViga();
    const b = s.modelo, an = analisarEdificio(b), d = dimensionarEdificio(b, an);
    const e = d.vigasEmbutidas![0], r = d.vigas.find((x) => x.viga === e.viga)!;
    expect(e.AsMin).toBeGreaterThan(1.15e-4);
    expect(e.AsMin).toBeLessThan(1.25e-4);
    expect(r.AsInf).toBeGreaterThanOrEqual(e.AsMin);
    expect(r.barrasInf).toBe(r.barrasSup);
    // ρsw,mín = 0,2·2,896/500 = 0,001158; Asw/s = 2,317 cm²/m; φ5 de 2 ramos (0,393 cm²): s ≤ 17 cm
    const m = /^φ(\d+(?:,\d+)?) c\/(\d+)$/.exec(r.estribo)!;
    expect(m).not.toBeNull();
    const phi = Number(m[1].replace(',', '.')), sCm = Number(m[2]);
    expect((2 * Math.PI * (phi / 1000) ** 2 / 4) / (sCm / 100)).toBeGreaterThanOrEqual(0.001158 * 0.2 * 0.999);
    expect(sCm).toBeLessThanOrEqual(30);
    expect(r.status).toBe('ok');
  });
  it('com a opção desligada a viga é dimensionada como viga comum e a lista fica vazia', () => {
    const s = comViga({ paredeVigaEmbutida: 0 });
    const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
    expect(d.vigasEmbutidas).toBeUndefined();
  });
});

describe('FU7c: pilar-parede com vinculação externa em molas (K1.9.110)', () => {
  it('assentamento w = q/(k·B) com q = 25·0,30·4 = 30 kN/m e B = 0,30 + 2 × 0,30 = 0,90 m', () => {
    const s = padrao();
    ok(s, 'pilarParede.tipo', { nome: 'PP', vertices: [[0, 0], [6, 0]], esq: 0.15, dir: 0.15 });
    ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0, angulo: 0, morre: nomePav(s.modelo, 'Tipo 1'), vinculoBase: 'molas' });
    const b = s.modelo, an = analisarEdificio(b), pp = b.pilaresParede![0];
    expect(an.erro).toBeUndefined();
    const md = an.portico.modelo, iG = an.casos.indexOf('G');
    const nos = an.paredes!.base[pp.id].filter((n) => md.nos[n][0] > 1.5 && md.nos[n][0] < 4.5);
    expect(nos.length).toBeGreaterThan(3);
    for (const n of nos) expect(an.portico.res!.desloc[iG][n * 6 + 2]).toBeCloseTo(-30 / (1e5 * 0.9), 5);
    // a resultante da base (reação das molas) fecha com o peso: 30 kN/m × 6 m = 180 kN
    const N = an.fundacao.filter((f) => f.pilar === pp.id && f.caso === 'G').reduce((t, f) => t + f.N, 0);
    expect(N).toBeCloseTo(180, 0);
  });
});
