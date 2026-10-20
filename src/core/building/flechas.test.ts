import { describe, expect, it } from 'vitest';
import { resolver3, type Modelo3, type Caso3 } from '../fe3d';
import type { AnaliseEdificio } from './analitico';
import { dimensionarEdificio, flechasViga, woodArmer } from './dimensionamento';
import { analisarEdificio } from './analitico';
import { deltaXi } from '../design';
import { comandosEdificioPadrao, Sessao } from '../commands';

const E = 30e6, b = 0.2, h = 0.5, I = (b * h ** 3) / 12;
/** Pórtico mínimo de uma viga (barras em x) com cargas uniformes G; pilares fictícios marcam os apoios. */
function viga(L: number, nb: number, apoios: number[], q: number) {
  const nos: [number, number, number][] = Array.from({ length: nb + 1 }, (_, k) => [(k * L) / nb, 0, 0]);
  const m: Modelo3 = { nos, barras: [], apoios: new Map() };
  for (let k = 0; k < nb; k++) m.barras.push({ i: k, j: k + 1, E, G: E / 2, A: b * h, Iz: I, Iy: (h * b ** 3) / 12, J: 1e-3 });
  for (const a of apoios) m.apoios.set(a, a === 0 && apoios.length === 1 ? [0, 1, 2, 3, 4, 5] : a === 0 ? [0, 1, 2, 3] : [1, 2, 3]);
  const caso: Caso3 = { nodais: [], distribuidas: m.barras.map((_, i) => ({ barra: i, q: [0, 0, -q] })) };
  const vazio: Caso3 = { nodais: [], distribuidas: [] };
  const res = resolver3(m, [caso, vazio]);
  const an = { casos: ['G', 'Q'], vento: null, portico: { modelo: m, barras: m.barras.map(() => ({ tipo: 'viga', ref: 'v', pavimento: 'p' })), mestres: {}, zonas: {}, res, casos: [caso, vazio] } } as unknown as AnaliseEdificio;
  const noPilar = new Set(apoios), uso = new Map(nos.map((_, k) => [k, k === 0 || k === nb ? 1 : 2]));
  return flechasViga(an, m.barras.map((_, i) => i), noPilar, uso, () => E * I, { G: 1, Q: 0 }, { G: 0, Q: 1 });
}

describe('flecha das vigas por integração da curvatura', () => {
  it('biapoiada com carga uniforme: 5qL⁴/384EI', () => {
    const L = 6, q = 10, f = viga(L, 6, [0, 6], q);
    expect(f.qp).toBeCloseTo((5 * q * L ** 4) / (384 * E * I), 6);
    expect(f.vao).toBeCloseTo(L, 9);
    expect(f.balanco).toBe(false);
  });
  it('balanço com carga uniforme: qL⁴/8EI', () => {
    const L = 2, q = 10, f = viga(L, 4, [0], q);
    expect(f.balanco).toBe(true);
    expect(f.qp).toBeCloseTo((q * L ** 4) / (8 * E * I), 5);
  });
});

describe('Wood-Armer e flecha das lajes', () => {
  it('regra de Wood-Armer: volvente somado; correção quando uma direção fica negativa', () => {
    expect(woodArmer(10, 6, 3)).toEqual({ inf: [13, 9], sup: [0, 0] });
    // mx* = −4 + 3 < 0 → 0 e my* = 6 + 9/4
    const r = woodArmer(-4, 6, 3);
    expect(r.inf[0]).toBe(0);
    expect(r.inf[1]).toBeCloseTo(8.25, 12);
    expect(r.sup[0]).toBeCloseTo(-5.5, 12); // my′ = 6 − 3 > 0 → 0 e mx′ = −4 − 9/6
    // sem volvente: os próprios momentos
    expect(woodArmer(5, -2, 0)).toEqual({ inf: [5, 0], sup: [0, -2] });
  });

  it('laje do edifício: flecha relativa aos apoios ≤ deslocamento absoluto e opção de fator simplificado', { timeout: 30000 }, () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.4 } } })) });
    s.executar('lote', { comandos: [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } })) });
    s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
    const an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an);
    const l = d.lajes[0], g = an.grelhas.find((x) => x.res)!;
    const absMax = Math.max(...g.modelo.nos.map((_, n) => -(g.res!.desloc[0][n * 6 + 2] + 0.3 * g.res!.desloc[1][n * 6 + 2])));
    const fat = 1 + deltaXi(1);
    expect(l.flecha / fat).toBeLessThan(absMax);
    expect(l.flecha).toBeGreaterThan(0);
    expect(l.mPos[0]).toBeGreaterThan(0);
    const d2 = dimensionarEdificio({ ...s.modelo, opcoes: { fatorFlechaLaje: 2.5 } }, analisarEdificio({ ...s.modelo, opcoes: { fatorFlechaLaje: 2.5 } }));
    expect(d2.lajes[0].flecha / 2.5).toBeCloseTo(l.flecha / fat, 9);
    expect(d.vigas[0].flecha).toBeGreaterThan(0);
    expect(d.vigas[0].limite).toBeCloseTo(6 / 250, 3);
  });
});
