// E5i (C5.6): planta de blocos e armaduras da alvenaria estrutural nas pranchas — peças das fiadas iguais ao quantitativo, posições
// dos blocos e das barras verticais, cotas, quadros e integração no conjunto.
import { beforeAll, describe, expect, it } from 'vitest';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { blocoDe, quantitativoAlvenaria, tipoAlvenariaDe } from '../building/alvenaria';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import { opcoesEmUso } from '../building/opcoes';
import { nomePav, ok, padrao } from '../building/paredesFixtures';
import type { Sessao } from '../commands';
import { montarConjunto } from './conjunto';
import { montarPranchasAlvenaria, pecasDaFiada, posicoesBarrasVerticais } from './armacaoAlvenaria';
import { escreverDxf } from './dxf';
import type { Prancha } from './prancha';
import { svgPrancha } from './svg';

let s: Sessao, an: AnaliseEdificio, dim: Dimensionamento, t1: string, terreo: string;

beforeAll(() => {
  s = padrao(1);
  t1 = nomePav(s, 'Tipo 1'); terreo = nomePav(s, 'Térreo');
  ok(s, 'bloco.tipo', { nome: 'B20', comprimento: 0.4, largura: 0.2, altura: 0.2, fbk: 8 });
  ok(s, 'alvenaria.tipo', { nome: 'Blocos B20', modelo: 'blocos', bloco: s.modelo.blocos![0].id, gama: 14 });
  const mat = s.modelo.tiposAlvenaria![0].id;
  ok(s, 'parede.criar', { pontos: [[0, 0], [3.2, 0]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
  ok(s, 'parede.abertura', { parede: s.modelo.paredes![0].id, s: 1, largura: 1, altura: 2, pavimento: terreo });
  ok(s, 'parede.criar', { pontos: [[0, 4], [3.2, 4]], espessura: 0.2, tipo: 'blocos', material: mat, nasce: terreo, morre: t1 });
  ok(s, 'alvenaria.tipo', { nome: 'Blocos B20 armados', modelo: 'blocos', bloco: s.modelo.blocos![0].id, gama: 14, armada: true });
  ok(s, 'parede.criar', { pontos: [[0, 8], [3.2, 8]], espessura: 0.2, tipo: 'blocos', material: s.modelo.tiposAlvenaria![1].id, nasce: terreo, morre: t1 });
  an = analisarEdificio(s.modelo);
  dim = dimensionarEdificio(s.modelo, an);
}, 240000);

const textos = (pr: Prancha) => [...pr.papel, ...pr.modelo].flatMap((q) => (q.t === 'txt' ? [q.s] : []));

describe('pecasDaFiada (esquema dos blocos)', () => {
  it('soma das peças de todas as fiadas = quantitativo de blocos do lance (inteiros, meios e canaletas)', () => {
    const w = s.modelo.paredes![0], bl = blocoDe(s.modelo, tipoAlvenariaDe(s.modelo, w))!, op = opcoesEmUso(s.modelo.opcoes);
    const q = quantitativoAlvenaria(s.modelo)[0].lances[0];
    let int = 0, meio = 0, can = 0;
    for (let r = 0; r < q.fiadas; r++) for (const p of pecasDaFiada(s.modelo, w, bl, op, 0, 0, r)) { if (p.tipo === 'inteiro') int++; else if (p.tipo === 'meio') meio++; else can++; }
    expect(q.fiadas).toBe(15);
    expect(int).toBe(q.inteiros);
    expect(meio).toBe(q.meios);
    expect(can).toBe(q.canaletas);
  });
  it('parede sem abertura: fiada 1 = 8 inteiros de 40 cm a cada 0,40 m; fiada 2 = meio + 7 inteiros + meio', () => {
    const w = s.modelo.paredes![1], bl = blocoDe(s.modelo, tipoAlvenariaDe(s.modelo, w))!, op = opcoesEmUso(s.modelo.opcoes);
    const f0 = pecasDaFiada(s.modelo, w, bl, op, 0, 0, 0), f1 = pecasDaFiada(s.modelo, w, bl, op, 0, 0, 1);
    expect(f0.map((p) => p.tipo)).toEqual(Array(8).fill('inteiro'));
    expect(f0.map((p) => +p.s0.toFixed(3))).toEqual([0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8]);
    expect(f0.at(-1)!.s1).toBeCloseTo(3.2, 9);
    expect(f1.map((p) => p.tipo)).toEqual(['meio', ...Array(7).fill('inteiro'), 'meio']);
    expect(f1[0].s1).toBeCloseTo(0.2, 9);
    expect(f1.at(-1)!.s0).toBeCloseTo(3.0, 9);
  });
  it('porta de 1 m a 1 m do início: nenhuma peça entre 1,0 e 2,0 m nas duas primeiras fiadas', () => {
    const w = s.modelo.paredes![0], bl = blocoDe(s.modelo, tipoAlvenariaDe(s.modelo, w))!, op = opcoesEmUso(s.modelo.opcoes);
    for (const r of [0, 1]) for (const p of pecasDaFiada(s.modelo, w, bl, op, 0, 0, r)) expect(p.s1 <= 1 + 1e-9 || p.s0 >= 2 - 1e-9).toBe(true);
  });
});

describe('posições das barras verticais', () => {
  it('a partir de meio módulo da extremidade, no espaçamento do pano', () => {
    expect(posicoesBarrasVerticais(0, 3.2, 0.8, 0.2)).toEqual([0.1, 0.9, 1.7, 2.5]);
    expect(posicoesBarrasVerticais(1, 2, 0.4, 0.2)).toEqual([1.1, 1.5, 1.9]);
    expect(posicoesBarrasVerticais(0, 0.1, 0.4, 0.2)).toEqual([]);
  });
});

describe('prancha de planta de blocos', () => {
  it('uma prancha por lance com blocos, tipo paredes, as duas paredes e o quadro de blocos igual ao quantitativo', () => {
    const prs = montarPranchasAlvenaria(s.modelo, an, dim);
    expect(prs).toHaveLength(1);
    const p = prs[0];
    expect(p.tipo).toBe('paredes');
    expect(p.elementos?.slice().sort()).toEqual(['M1', 'M2', 'M3']);
    const t = textos(p);
    expect(t.some((x) => /ALVENARIA ESTRUTURAL/.test(x))).toBe(true);
    // cotas: comprimento dos trechos (3,20 m) e a porta (100 @ 100 cm)
    expect(t.filter((x) => x === '3,20 m')).toHaveLength(3);
    expect(t).toContain('100 @ 100');
    const q = quantitativoAlvenaria(s.modelo);
    for (const w of q) {
      const l = w.lances[0];
      // o quadro de blocos é desenhado no papel: os valores do quantitativo aparecem nas células
      expect(t).toContain(w.nome);
      for (const v of [String(l.inteiros), String(l.meios), String(l.total)]) expect(t).toContain(v);
    }
    expect(p.modelo.filter((q2) => q2.t === 'pl' && q2.c === 'PILAR')).toHaveLength(3);
  });
  it('parede armada: uma barra vertical por célula, em número igual ao dos panos; as outras não têm círculos', () => {
    const p = montarPranchasAlvenaria(s.modelo, an, dim)[0];
    const arm = dim.alvenaria!.paredes.find((w) => w.nome === 'M3')!;
    expect(arm.armada).toBe(true);
    const panos = arm.panos.filter((x) => x.pavimento === t1 && x.armadura?.vert);
    expect(panos.length).toBeGreaterThan(0);
    const esperado = panos.reduce((n, x) => n + posicoesBarrasVerticais(x.s0, x.s1, x.armadura!.vert!.s, 0.2).length, 0);
    expect(esperado).toBeGreaterThan(0);
    const circ = p.modelo.filter((q2) => q2.t === 'circ');
    expect(circ).toHaveLength(esperado);
    // todas sobre a parede M3 (y = 8, espessura 20 cm) e a mais de 10 cm das pontas
    for (const c of circ) if (c.t === 'circ') { expect(c.centro[1]).toBeCloseTo(8, 6); expect(c.centro[0]).toBeGreaterThanOrEqual(0.1 - 1e-9); expect(c.centro[0]).toBeLessThanOrEqual(3.1 + 1e-9); }
    const t = textos(p);
    expect(t).toContain(`φ${panos[0].armadura!.vert!.phi.toString().replace('.', ',')} c/${Math.round(panos[0].armadura!.vert!.s * 100)}`);
  });
  it('exporta em DXF e SVG', () => {
    const p = montarPranchasAlvenaria(s.modelo, an, dim)[0];
    expect(escreverDxf(p).length).toBeGreaterThan(1000);
    expect(svgPrancha(p)).toContain('<svg');
  });
  it('conjunto "paredes" inclui a planta de blocos e "todas" a inclui depois dos pilares', () => {
    const só = montarConjunto(s.modelo, an, dim, { tipos: 'paredes' });
    expect(só.pranchas).toHaveLength(1);
    expect(só.avisos).toEqual([]);
    const todas = montarConjunto(s.modelo, an, dim, { tipos: 'todas' });
    expect(todas.pranchas.map((x) => x.tipo)).toContain('paredes');
  });
});
