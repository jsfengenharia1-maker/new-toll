// E5a: pranchas das lajes inclinadas — dobramento da barra, marca do ponto de dobra, comprimentos parciais, comprimento real e
// croqui do pavimento nas formas. Telhado de duas águas (40 %): cumeeira em x = 3, cada água com 3 m de projeção.
import { describe, expect, it } from 'vitest';
import { Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio } from '../building/dimensionamento';
import { barrasAlveolaresDobradas, desenharDobra, acrescimoReal } from './armacaoInclinadas';
import { montarPranchasLajes } from './armacaoLajes';
import { montarPrancha, type Prancha, type Prim } from './prancha';
import { escreverDxf } from './dxf';
import { svgPrancha } from './svg';

const ok = (s: Sessao, nome: string, p: Record<string, unknown>) => { const r = s.executar(nome, p); if (!r.ok) throw new Error(`${nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`); return r; };
function telhado(inclinado = true) {
  const s = new Sessao();
  ok(s, 'obra.definir', { nome: 'Telhado' });
  ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
  ok(s, 'pavimento.criar', { nome: 'Cobertura', cota: 3, uso: 'comum' });
  const g = s.modelo.pavimentos[1].grupo;
  for (const [x, y] of [[0, 0], [6, 0], [0, 5], [6, 5], [3, 0], [3, 5]]) ok(s, 'pilar.inserir', { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } });
  const sec = { b: 0.15, h: 0.4 };
  for (const pts of [[[0, 0], [0, 5]], [[6, 0], [6, 5]], [[0, 0], [3, 0]], [[3, 0], [6, 0]], [[0, 5], [3, 5]], [[3, 5], [6, 5]], [[3, 0], [3, 5]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: sec });
  ok(s, 'laje.criar', { grupo: g, contorno: [[0, 0], [3, 0], [3, 5], [0, 5]], tipo: { tipo: 'macica', h: 0.1 } });
  ok(s, 'laje.criar', { grupo: g, contorno: [[3, 0], [6, 0], [6, 5], [3, 5]], tipo: { tipo: 'macica', h: 0.1 } });
  if (inclinado) {
    ok(s, 'plano.criar', { grupo: g, nome: 'Água 1', tipo: 'retaHorizontal', pontos: [[0, 5], [0, 0]], desnivel: 0, inclinacao: 40 });
    ok(s, 'plano.criar', { grupo: g, nome: 'Água 2', tipo: 'retaHorizontal', pontos: [[6, 0], [6, 5]], desnivel: 0, inclinacao: 40 });
    const [pl1, pl2] = s.modelo.planos!, [l1, l2] = s.modelo.lajes;
    ok(s, 'plano.atribuir', { plano: pl1.id, lajes: [l1.id] });
    ok(s, 'plano.atribuir', { plano: pl2.id, lajes: [l2.id] });
  }
  return { s, g };
}
const textos = (p: Prancha | Prim[]) => (Array.isArray(p) ? p : [...p.modelo, ...p.papel]).flatMap((x) => (x.t === 'txt' ? [x.s] : []));
const compr = (pts: [number, number][]) => pts.slice(1).reduce((t, q, i) => t + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);

describe('dobramento da barra (C7.94, C7.95, C7.129)', () => {
  it('barra sobre a cumeeira: perfil desdobrado com o comprimento real, marca perpendicular na interseção dos planos', () => {
    const { s, g } = telhado(), k = 0.1, real = 2 * Math.hypot(1, 0.4);
    const d = desenharDobra(s.modelo, g, [2, 2.5], [4, 2.5], k, 'ARMADURA-NEG');
    expect(d.dobras).toBe(1);
    expect(d.real).toBeCloseTo(real, 12);
    expect(d.horizontal).toBeCloseTo(2, 12);
    // perfil: subida e descida de 0,4 m por metro; comprimento do perfil = comprimento desdobrado = comprimento real
    expect(d.perfil.map((q) => [q[0], q[1]])).toEqual([[0, 0], [1, expect.closeTo(0.4, 12)], [2, expect.closeTo(0, 12)]].map((q) => q));
    const pf = d.prims.find((p) => p.t === 'pl' && p.pts.length === 3 && p.c === 'ARMADURA-NEG');
    expect(pf && pf.t === 'pl' && compr(pf.pts as [number, number][])).toBeCloseTo(real, 9);
    // marca: traço perpendicular à barra (vertical), 4 mm × k = 0,4 m, centrado em (3; 2,5)
    const marca = d.prims.find((p) => p.t === 'pl' && p.pts.length === 2 && p.c === 'ARMADURA-NEG');
    expect(marca && marca.t === 'pl' && marca.pts).toEqual([[3, 2.3], [3, 2.7]]);
    // comprimentos parciais (cm) de cada lado e ângulo da dobra (2 × 21,80°)
    expect(textos(d.prims)).toEqual(['108', '108', '43,6°']);
    expect(acrescimoReal(s.modelo, g, [2, 2.5], [4, 2.5])).toBeCloseTo(real - 2, 12);
  });
  it('barra dentro de um só pano: sem dobra, só o comprimento real; modelo horizontal: nada', () => {
    const { s, g } = telhado();
    const d = desenharDobra(s.modelo, g, [0.5, 2.5], [2.5, 2.5], 0.1, 'ARMADURA');
    expect(d.dobras).toBe(0); expect(d.prims).toEqual([]);
    expect(d.real).toBeCloseTo(2 * Math.hypot(1, 0.4), 12);
    const h = telhado(false);
    expect(acrescimoReal(h.s.modelo, h.g, [2, 2.5], [4, 2.5])).toBe(0);
    expect(desenharDobra(h.s.modelo, h.g, [2, 2.5], [4, 2.5], 0.1, 'ARMADURA').real).toBeCloseTo(2, 12);
  });
  it('sem alveolares no pano, nenhuma barra alveolar dobrada', () => {
    const { s, g } = telhado();
    expect(barrasAlveolaresDobradas(s.modelo, g, {})).toEqual([]);
  });
  it('alveolares inclinadas (C7.142): negativo da capa que cruza a cumeeira entra com a dobra; o que não cruza fica de fora', () => {
    const { s, g } = telhado();
    const neg = (comprimento: number) => ({ phi: 8, s: 0.2, barras: 6, comprimento });
    const r = { laje: s.modelo.lajes[0].id, nome: 'L1', repeticoes: 1, placas: [{ a: [1.5, 2.5], z: [4.5, 2.5] }], negativos: [neg(2), neg(0.5)] };
    const barras = barrasAlveolaresDobradas(s.modelo, g, { alveolares: [r] as never });
    expect(barras).toHaveLength(1);
    expect(barras[0]).toMatchObject({ ponta: 0, a: [1.5, 2.5], z: [3.5, 2.5], phi: 8, barras: 6 });
    const d = desenharDobra(s.modelo, g, barras[0].a, barras[0].z, 0.1, 'ARMADURA-NEG');
    expect(d.dobras).toBe(1); expect(d.real).toBeCloseTo(Math.hypot(1.5, 0.6) + Math.hypot(0.5, 0.2), 12);
  });
});

describe('pranchas das lajes inclinadas', () => {
  it('formas: croqui do pavimento só com lajes inclinadas, no tamanho configurado', () => {
    const { s, g } = telhado();
    const quadro = (pr: Prancha) => pr.papel.filter((p) => p.t === 'pl' && p.c === 'QUADRO' && p.fechada && p.pts.length === 4 && Math.abs(p.pts[0][1] - p.pts[3][1]) > 40 && Math.abs(p.pts[2][0] - p.pts[0][0]) > 40);
    const p60 = montarPrancha(s.modelo, g);
    expect(textos(p60.papel)).toContain('CROQUI DO PAVIMENTO');
    const q = quadro(p60)[0];
    expect(q.t === 'pl' && q.pts[1][0] - q.pts[0][0]).toBeCloseTo(64, 9); // 60 mm + 2 × 2 mm de folga
    expect(q.t === 'pl' && q.pts[3][1] - q.pts[0][1]).toBeCloseTo(54, 9); // 5 m de 6 m
    // 6 pilares, 7 eixos de viga, 2 setas com 40 %
    expect(textos(p60.papel).filter((x) => x === '40,0 %')).toHaveLength(2);
    expect(p60.papel.filter((p) => p.t === 'pl' && p.c === 'VIGA')).toHaveLength(7);
    // inclinação junto ao texto do pano
    expect(textos(p60.modelo)).toContain('+0,60 i = 40,0 %');
    s.executar('prancha.definir', { armacao: { croqui: 90 } });
    const q90 = quadro(montarPrancha(s.modelo, g))[0];
    expect(q90.t === 'pl' && q90.pts[1][0] - q90.pts[0][0]).toBeCloseTo(94, 9);
    s.executar('prancha.definir', { armacao: { croqui: 0 } });
    expect(textos(montarPrancha(s.modelo, g).papel)).not.toContain('CROQUI DO PAVIMENTO');
    const h = telhado(false);
    expect(textos(montarPrancha(h.s.modelo, h.g).papel)).not.toContain('CROQUI DO PAVIMENTO');
    expect(textos(montarPrancha(h.s.modelo, h.g).modelo).some((x) => x.includes(' i = '))).toBe(false);
  });
  it('armação das lajes: comprimento real das barras e DXF/SVG sem erro', () => {
    const inc = telhado(), hor = telhado(false);
    const pr = (t: { s: Sessao }) => { const an = analisarEdificio(t.s.modelo), dim = dimensionarEdificio(t.s.modelo, an); return montarPranchasLajes(t.s.modelo, an, dim); };
    const pi = pr(inc), ph = pr(hor);
    expect(pi.length).toBeGreaterThan(0);
    const cs = (ps: Prancha[]) => ps.flatMap((p) => textos(p.modelo)).flatMap((x) => { const m = /C=(\d+)/.exec(x); return m ? [+m[1]] : []; });
    // barras ao longo da declividade (40 %): C maior que o do mesmo traçado horizontal; as paralelas às curvas de nível não mudam
    expect(cs(pi).reduce((t, x) => t + x, 0)).toBeGreaterThan(cs(ph).reduce((t, x) => t + x, 0));
    expect(cs(pi)).toHaveLength(cs(ph).length);
    expect(pi.some((p) => textos(p).some((x) => x.startsWith('Lajes inclinadas: C é o comprimento real')))).toBe(true);
    expect(ph.some((p) => textos(p).some((x) => x.startsWith('Lajes inclinadas')))).toBe(false);
    for (const p of pi) { expect(escreverDxf(p).length).toBeGreaterThan(1000); expect(svgPrancha(p)).toContain('<svg'); }
  });
});
