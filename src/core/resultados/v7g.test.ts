// V7g (C4.60, K1.4.x): torçor do conjunto do pilar-parede na base, por hipótese. (1) Convenção de sinais e valor contra um
// caso de torção conhecido: pilar-parede em L sob força lateral só num dos lados (excêntrica em relação ao centroide):
// equilíbrio global de momento em z a 1e-9 e comparação com o OpenSees (validation/opensees/torcao_pp.py). (2) Edifício
// completo: o Mz das cargas da base (análise) fecha o equilíbrio global do vento e vira torçor por caso, combinação e envoltória.
// (3) Estado da seção do pilar retangular com o mesmo cobrimento do dimensionamento.
import { describe, expect, it } from 'vitest';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio } from '../building/dimensionamento';
import { cobrimentoPilar } from '../building/materiais';
import { opcoesEmUso } from '../building/opcoes';
import { geometriaParedes } from '../building/pilarParede';
import { incluirParedes } from '../building/pilarParedeModelo';
import type { ResultadoPilarParede } from '../building/pilarParedeEsforcos';
import { torcaoRet } from '../building/analitico';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { resolver3, type Caso3, type Modelo3 } from '../fe3d';
import { hipotesesDeEsforco } from './esforcosCaso';
import { baseDoPilarParede, torsorDoPilarParede } from './pilarParedeHipotese';
import { estadoDoPilar } from './estadoElementos';
import { barrasDoArranjo } from './estadoSecao';
import ref from '../../../validation/opensees/torcao_pp.json';

const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
const E = ref.E, nu = ref.nu;
type Saida = { q: number[]; Rx: number; Ry: number; soma_Mz_nodal: number; Mz_origem: number; Rx_lado1: number; Ry_lado1: number; Rx_lado2: number; Ry_lado2: number };
const R = ref.resultados as Record<string, Saida>;

/** Cargas nodais de força linear q (kN/m) em `g` sobre os nós de uma linha de vértices e meios (ordem por `eixo`). */
function linha(pm: Modelo3, nos: number[], eixo: 0 | 1, q: number, g: 0 | 1 | 2): Caso3['nodais'] {
  const ord = [...nos].sort((a, c) => pm.nos[a][eixo] - pm.nos[c][eixo]), out: Caso3['nodais'] = [];
  for (let k = 0; k + 2 < ord.length; k += 2) {
    const Ls = Math.abs(pm.nos[ord[k + 2]][eixo] - pm.nos[ord[k]][eixo]);
    for (const [n, w] of [[ord[k], 1 / 6], [ord[k + 1], 4 / 6], [ord[k + 2], 1 / 6]] as const) { const f = [0, 0, 0, 0, 0, 0]; f[g] = q * Ls * w; out.push({ no: n, f }); }
  }
  return out;
}

function modeloL() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('obra.definir', { profundidadeFundacao: 3 }); // base em −3 m; topo no Tipo 1 (+3 m): H = 6 m
  s.executar('pilarParede.tipo', { vertices: [[0, 0], [ref.L1, 0], [ref.L1, ref.L2]], esq: ref.t / 2, dir: ref.t / 2 });
  const tp = s.modelo.tiposPilarParede![0].id, t1 = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.id;
  expect(s.executar('pilarParede.inserir', { tipo: tp, x: 0, y: 0, morre: t1 }).ok).toBe(true);
  const b = s.modelo, geo = geometriaParedes(b, { ...opcoesEmUso(b.opcoes), malhaCasca: 0.25 })!;
  const pm: Modelo3 = { nos: [], barras: [], apoios: new Map() }, casos: Caso3[] = [{ nodais: [], distribuidas: [] }];
  incluirParedes({ b, geo, pm, casosV: casos, noPilar: new Map(), Ec: () => E, Ev: E, Gv: E / 2.4, nu, gama: 0, ret: (bb, h) => ({ A: bb * h, I: (bb * h ** 3) / 12, J: torcaoRet(bb, h) }), peso: () => {}, etiqueta: () => {}, hViga: 0.25, iG: 0 });
  const topo = pm.nos.map((n, i) => [n, i] as const).filter(([n]) => Math.abs(n[2] - 3) < 1e-9).map(([, i]) => i);
  const lado1 = topo.filter((i) => Math.abs(pm.nos[i][1]) < 1e-9), lado2 = topo.filter((i) => Math.abs(pm.nos[i][0] - ref.L1) < 1e-9);
  return { pm, casos, lado1, lado2, base: [...pm.apoios.keys()] };
}

/** Torçor da reação em torno do eixo vertical por O, na fórmula da análise (Mz dos nós + x·Ry − y·Rx). */
const torcor = (pm: Modelo3, r: ReturnType<typeof resolver3>, O: [number, number], nos: number[]) => {
  let Rx = 0, Ry = 0, M = 0, soma = 0;
  for (const n of nos) { const rr = r.reacoes[0].get(n)!, x = pm.nos[n][0] - O[0], y = pm.nos[n][1] - O[1]; Rx += rr[0]; Ry += rr[1]; soma += rr[5] ?? 0; M += (rr[5] ?? 0) + x * rr[1] - y * rr[0]; }
  return { Rx, Ry, M, soma };
};

describe('V7g: torçor do pilar-parede em L contra solução analítica e OpenSees', () => {
  // centroide das áreas dos lados (espessura constante): média dos pontos médios ponderada pelo comprimento
  const O: [number, number] = [(ref.L1 * (ref.L1 / 2) + ref.L2 * ref.L1) / (ref.L1 + ref.L2), (ref.L2 * (ref.L2 / 2)) / (ref.L1 + ref.L2)];
  for (const [caso, q1, q2] of [[1, 100, 0], [2, 0, 100], [3, 100, -60]] as const) {
    it(`caso ${caso}: força lateral excêntrica (qx ${q1}, qy ${q2} kN/m): equilíbrio em z a 1e-9 e OpenSees`, () => {
      const m = modeloL(), o = R[String(caso)];
      m.casos[0].nodais.push(...linha(m.pm, m.lado1, 0, q1, 0), ...linha(m.pm, m.lado2, 1, q2, 1));
      const r = resolver3(m.pm, m.casos);
      expect(r.erro).toBeUndefined();
      // solução analítica: forças aplicadas e seu momento em torno do centroide (lado 1 em y = 0; lado 2 em x = L1)
      const Fx = q1 * ref.L1, Fy = q2 * ref.L2, Mapl = (ref.L1 - O[0]) * Fy - (0 - O[1]) * Fx;
      const t = torcor(m.pm, r, O, m.base);
      expect(Math.abs(t.Rx + Fx)).toBeLessThan(1e-9 * 300);
      expect(Math.abs(t.Ry + Fy)).toBeLessThan(1e-9 * 300);
      expect(Math.abs(t.M + Mapl)).toBeLessThan(1e-9 * 600); // equilíbrio global de momento em z (reação + aplicado = 0)
      // OpenSees: o torçor da reação por O sai do torçor em torno da origem por mudança de polo; os dois coincidem
      const MzO = o.Mz_origem + (0 - O[0]) * o.Ry - (0 - O[1]) * o.Rx;
      expect(Math.abs(MzO - t.M)).toBeLessThan(1e-6 * 600);
      expect(Math.abs(MzO + Mapl)).toBeLessThan(1e-6 * 600);
      // distribuição entre os lados (cortante da base de cada lado): malha de 0,25 m contra 0,125 m do OpenSees (erro conferido: até 0,6 % da força aplicada)
      const l1 = m.base.filter((n) => Math.abs(m.pm.nos[n][1]) < 1e-9), l2 = m.base.filter((n) => Math.abs(m.pm.nos[n][0] - ref.L1) < 1e-9 && m.pm.nos[n][1] > 1e-9);
      const a = torcor(m.pm, r, O, l1), c = torcor(m.pm, r, O, l2);
      const esc = Math.max(Math.abs(Fx), Math.abs(Fy));
      expect(Math.abs(a.Rx - o.Rx_lado1) / esc).toBeLessThan(0.015);
      expect(Math.abs(a.Ry - o.Ry_lado1) / esc).toBeLessThan(0.015);
      expect(Math.abs(c.Rx - o.Rx_lado2) / esc).toBeLessThan(0.015);
      expect(Math.abs(c.Ry - o.Ry_lado2) / esc).toBeLessThan(0.015);
      // a soma dos momentos nodais em torno de z é pequena frente ao torçor dos binários de cortante
      expect(Math.abs(t.soma)).toBeLessThan(0.02 * Math.max(Math.abs(Mapl), 100));
      expect(Math.abs(t.soma - o.soma_Mz_nodal)).toBeLessThan(0.05);
    });
  }
});

function edificioL() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const g = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.grupo;
  ok(s, 'pilarParede.tipo', { nome: 'L 3x2', vertices: [[0, 0], [3, 0], [3, 2]], esq: 0.1, dir: 0.1 });
  ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0 });
  for (const [x, y] of [[0, 5], [7, 5], [7, 0]]) ok(s, 'pilar.inserir', { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
  for (const pts of [[[1, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: { b: 0.2, h: 0.5 } });
  ok(s, 'laje.criar', { grupo: g, contorno: [[0, 0], [7, 0], [7, 5], [0, 5]], tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

describe('V7g: torçor da base do pilar-parede no edifício, por caso, combinação e envoltória', () => {
  const b = edificioL(), an = analisarEdificio(b), dim = dimensionarEdificio(b, an, { fundacao: false }), pp = dim.pilaresParede![0] as ResultadoPilarParede;
  const hs = hipotesesDeEsforco(b, an);

  it('o Mz das cargas da base vem das reações dos nós da base pelo centroide (soma de Mz + x·Vy − y·Vx)', () => {
    const casos = an.portico.casosVento ?? [], nomes = an.vento!.casos.map((c) => c.nome), nos = an.paredes!.base[pp.id], O = an.paredes!.centro[pp.id], md = an.portico.modelo;
    expect(nos.length).toBeGreaterThan(4);
    expect(casos.length).toBeGreaterThan(0);
    nomes.forEach((nome, ic) => {
      let esperado = 0;
      for (const n of nos) { const rr = an.portico.resVento!.reacoes[ic].get(n)!; esperado += (rr[5] ?? 0) + (md.nos[n][0] - O[0]) * rr[1] - (md.nos[n][1] - O[1]) * rr[0]; }
      expect(pp.base[nome].Mz).toBeCloseTo(esperado, 9);
    });
    expect(Object.values(pp.base).some((x) => Math.abs(x.Mz) > 1)).toBe(true);
  });

  it('equilíbrio global em z do vento: reações de todos os apoios + momento das cargas aplicadas = 0 a 1e-9', () => {
    const md = an.portico.modelo, casos = an.portico.casosVento!, res = an.portico.resVento!;
    casos.forEach((c, ic) => {
      let aplicado = 0, escala = 0;
      for (const { no, f } of c.nodais) { aplicado += (f[5] ?? 0) + md.nos[no][0] * f[1] - md.nos[no][1] * f[0]; escala += Math.abs(f[0]) + Math.abs(f[1]); }
      expect(c.distribuidas.length).toBe(0);
      let reacao = 0;
      const zBase = Math.min(...md.nos.map((p) => p[2]));
      for (const [n, rr] of res.reacoes[ic]) if (md.nos[n][2] < zBase + 1e-9) reacao += (rr[5] ?? 0) + md.nos[n][0] * rr[1] - md.nos[n][1] * rr[0]; // só a base (os nós carregados também listam reação)
      expect(Math.abs(aplicado + reacao)).toBeLessThan(1e-9 * Math.max(1, escala * 10));
    });
  });

  it('torsorDoPilarParede: caso = Mz da base; combinação = soma ponderada; mudança de polo exata; envoltória com a combinação determinante', () => {
    const w = hs.find((h) => h.tipo === 'caso' && h.id.startsWith('caso:W'))!;
    const t = torsorDoPilarParede(pp, w);
    expect(t.max).toBe(t.min);
    expect(t.max).toBeCloseTo(baseDoPilarParede(pp, w).max.Mz, 9);
    expect(t.ref).toEqual(pp.centro);
    // polo deslocado: Mz(P) = Mz(O) + (Ox − Px)·Vy − (Oy − Py)·Vx, conferido pelo momento das reações em torno de P
    const P: [number, number] = [pp.centro[0] + 1.3, pp.centro[1] - 0.7], bs = baseDoPilarParede(pp, w).max, tp = torsorDoPilarParede(pp, w, P);
    expect(tp.max).toBeCloseTo(bs.Mz + (pp.centro[0] - P[0]) * bs.Vy - (pp.centro[1] - P[1]) * bs.Vx, 9);
    const nome = w.id.slice(5), md = an.portico.modelo, ic = an.vento!.casos.findIndex((c) => c.nome === nome);
    let direto = 0;
    for (const n of an.paredes!.base[pp.id]) { const rr = an.portico.resVento!.reacoes[ic].get(n)!; direto += (rr[5] ?? 0) + (md.nos[n][0] - P[0]) * rr[1] - (md.nos[n][1] - P[1]) * rr[0]; }
    expect(tp.max).toBeCloseTo(direto, 9);
    // combinação
    const comb = hs.find((h) => h.tipo === 'combinacao' && Object.keys(h.fatores).some((n) => n.startsWith('W')))!;
    if (comb.tipo !== 'combinacao') throw new Error('combinação esperada');
    const tc = torsorDoPilarParede(pp, comb), esperado = Object.entries(comb.fatores).reduce((s, [n, f]) => s + f * (pp.base[n]?.Mz ?? 0), 0);
    expect(tc.max).toBeCloseTo(esperado, 9);
    // envoltória: extremos entre as combinações, determinante identificada, igual ao máximo/mínimo calculado combinação a combinação
    const env = hs.find((h) => h.id === 'env:ELU')!;
    if (env.tipo !== 'envoltoria') throw new Error('envoltória esperada');
    const te = torsorDoPilarParede(pp, env), vals = env.combinacoes.map((c) => [c.nome, Object.entries(c.fatores).reduce((s, [n, f]) => s + f * (pp.base[n]?.Mz ?? 0), 0)] as const);
    expect(te.max).toBeCloseTo(Math.max(...vals.map((v) => v[1])), 9);
    expect(te.min).toBeCloseTo(Math.min(...vals.map((v) => v[1])), 9);
    expect(te.max).toBeGreaterThan(te.min);
    expect(vals.find((v) => v[0] === te.porMax)![1]).toBeCloseTo(te.max, 9);
    expect(vals.find((v) => v[0] === te.porMin)![1]).toBeCloseTo(te.min, 9);
    // transporte na envoltória é por combinação (não por extremos de Vx e Vy)
    const tpe = torsorDoPilarParede(pp, env, P);
    const valsP = env.combinacoes.map((c) => { let mz = 0, vx = 0, vy = 0; for (const [n, f] of Object.entries(c.fatores)) { const bb = pp.base[n]; if (bb) { mz += f * bb.Mz; vx += f * bb.Vx; vy += f * bb.Vy; } } return mz + (pp.centro[0] - P[0]) * vy - (pp.centro[1] - P[1]) * vx; });
    expect(tpe.max).toBeCloseTo(Math.max(...valsP), 9);
    expect(tpe.min).toBeCloseTo(Math.min(...valsP), 9);
  });
});

function predio(cob: number) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  ok(s, 'norma.definir', { cobrimento: { laje: 2.5, viga: 3, pilar: cob } });
  const g = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.grupo;
  for (const [x, y] of [[0, 0], [6, 0], [6, 5], [0, 5]]) ok(s, 'pilar.inserir', { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.5 } });
  for (const pts of [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: { b: 0.2, h: 0.5 } });
  ok(s, 'laje.criar', { grupo: g, contorno: [[0, 0], [6, 0], [6, 5], [0, 5]], tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}
const retangular = (dim: ReturnType<typeof dimensionarEdificio>) => dim.pilares.find((p) => p.arranjo && p.arranjo.n === undefined && p.determinantes?.length)!;

describe('V7g: estado da seção do pilar retangular usa o cobrimento do dimensionamento', () => {
  for (const cob of [2.5, 4, 6]) {
    it(`cobrimento ${cob} cm: barras a cobrimento + 5 mm + φ/2 (como no dimensionamento), ∫σ = Nd e arranjo igual`, () => {
      const b = predio(cob), an = analisarEdificio(b), dim = dimensionarEdificio(b, an, { fundacao: false });
      const r = retangular(dim), e = estadoDoPilar(b, r)!, arr = r.arranjo!;
      expect(cobrimentoPilar(b, undefined)).toBeCloseTo(cob / 100, 12);
      const a = cob / 100 + 0.005 + arr.phi / 2000; // d' do dimensionamento (a0 em dimensionarPilares)
      const esperadas = barrasDoArranjo(0.3, 0.5, a, arr);
      expect(e.barras.length).toBe(esperadas.length);
      e.barras.forEach((q, i) => { expect(q.x).toBeCloseTo(esperadas[i].x, 12); expect(q.y).toBeCloseTo(esperadas[i].y, 12); });
      expect(Math.min(...e.barras.map((q) => q.x))).toBeCloseTo(a, 12);
      expect(Math.min(...e.barras.map((q) => q.y))).toBeCloseTo(a, 12);
      expect(Math.max(...e.barras.map((q) => q.x))).toBeCloseTo(0.3 - a, 12);
      expect(Math.max(...e.barras.map((q) => q.y))).toBeCloseTo(0.5 - a, 12);
      expect(e.estado.resolvido).toBe(true);
      expect(Math.abs(e.estado.erroEquilibrio.N)).toBeLessThan(1e-8);
      expect(e.estado.integrados.N * 1000).toBeCloseTo(r.determinantes![0].Nd, 3);
    });
  }

  it('cobrimento próprio do pilar (pilar.editar) vale no estado como no dimensionamento', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.5 } });
    ok(s, 'pilar.editar', { id: s.modelo.pilares[0].id, cobrimento: 5 });
    expect(cobrimentoPilar(s.modelo, s.modelo.pilares[0].cobrimento)).toBeCloseTo(0.05, 12);
  });

  it('mesmo arranjo com cobrimento maior tem menor capacidade (a seção não usa um cobrimento fixo)', () => {
    const b1 = predio(2.5), dim1 = dimensionarEdificio(b1, analisarEdificio(b1), { fundacao: false }), r = retangular(dim1);
    const b2 = predio(6), c1 = estadoDoPilar(b1, r)!, c2 = estadoDoPilar(b2, r)!;
    expect(c2.estado.MRd).toBeLessThan(c1.estado.MRd);
    expect(Math.min(...c2.barras.map((q) => q.x)) - Math.min(...c1.barras.map((q) => q.x))).toBeCloseTo(0.035, 12);
  });
});
