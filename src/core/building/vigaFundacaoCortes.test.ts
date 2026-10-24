// R8b (K1.12.12): cortes da armadura principal das vigas de fundação na convenção invertida. Valores esperados à mão;
// opção desligada = barras corridas (resultado anterior).
import { describe, expect, it } from 'vitest';
import { barArea } from '../concrete';
import { Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { calcularFundacaoEdificio } from './fundacao';
import { cortesVigaFundacao, textoCortesFace, type EntradaCortesVF } from './vigaFundacaoCortes';
import { edificioVazio } from './types';

// 6 φ16 na face inferior (Ab = 2,0106 cm²), AsFlex = 12 cm², AsMín = 2 cm²; d = 0,40 m, lb = 0,60 m, cobrimento da ponta 3 cm,
// 1/3 corridas: nP = máx(2; ⌈6/3⌉; ⌈2/2,0106⌉) = 2 corridas e 4 cortadas; aℓ = d (±0,40 m na grade de 5 cm).
const base: EntradaCortesVF = {
  s: [0, 5, 10], Minf: [0, 100, 0], Msup: [0, 0, 0], L: 10,
  inf: { n: 6, phi: 16, AsFlex: 12e-4, AsMin: 2e-4, lb: 0.6 },
  sup: { n: 2, phi: 12.5, AsFlex: 1e-4, AsMin: 1e-4, lb: 0.5 },
  d: 0.4, cobPonta: 0.03, passante: 1 / 3, gruposNegativos: 3, gruposPositivos: 3, minPct: 0,
};

describe('cortesVigaFundacao: momento triangular de 100 kN·m no meio (à mão)', () => {
  // necessária(s) = 12·M/100 cm² = 12·min(s; 10 − s)/5 ·(1 cm²); decalada: máximo em ±0,40 m. Limiares das barras cortadas
  // 4,0212; 6,0319; 8,0425 e 10,0531 cm². Primeiro ponto da grade acima do limiar, à esquerda: 1,30; 2,15; 3,00; 3,80 m
  // (s + 0,4 > 5·lim/12); menos lb: 0,70; 1,55; 2,40; 3,20 m. Comprimentos: 8,6; 6,9; 5,2; 3,6 m.
  it('3 grupos: custo mínimo 25,9 m = 1 × 8,6 + 1 × 6,9 + 2 × 5,2', () => {
    const r = cortesVigaFundacao(base).inf;
    expect(r.papel).toBe('negativos');
    expect(r.passantes).toBe(2);
    expect(r.comprimentoPassante).toBeCloseTo(9.94, 9);
    expect(r.grupos.map((g) => g.n)).toEqual([1, 1, 2]);
    const esperado: [number, number][] = [[0.7, 9.3], [1.55, 8.45], [2.4, 7.6]];
    r.grupos.forEach((g, i) => { expect(g.s0).toBeCloseTo(esperado[i][0], 9); expect(g.s1).toBeCloseTo(esperado[i][1], 9); expect(g.comprimento).toBeCloseTo(esperado[i][1] - esperado[i][0], 9); });
    expect(r.comprimentoTotal).toBeCloseTo(2 * 9.94 + 8.6 + 6.9 + 2 * 5.2, 9);
    expect(r.comprimentoSemCortes).toBeCloseTo(6 * 9.94, 9);
    expect(textoCortesFace(r)).toContain('2 φ16 corridas');
  });

  it('1 grupo nos negativos: as 4 cortadas têm o comprimento da mais longa (8,6 m)', () => {
    const r = cortesVigaFundacao({ ...base, gruposNegativos: 1 }).inf;
    expect(r.grupos).toHaveLength(1);
    expect(r.grupos[0].n).toBe(4);
    expect(r.grupos[0].comprimento).toBeCloseTo(8.6, 9);
    expect(r.comprimentoTotal).toBeCloseTo(2 * 9.94 + 4 * 8.6, 9);
  });

  it('mínimo de 50 % por grupo (2 de 4): [0, 2] = 2 × 8,6 + 2 × 5,2', () => {
    const r = cortesVigaFundacao({ ...base, minPct: 50 }).inf;
    expect(r.grupos.map((g) => g.n)).toEqual([2, 2]);
    expect(r.grupos[0].comprimento).toBeCloseTo(8.6, 9);
    expect(r.grupos[1].comprimento).toBeCloseTo(5.2, 9);
  });

  it('convenção invertida: a face de maior momento faz o papel dos negativos; a outra, dos positivos', () => {
    const a = cortesVigaFundacao(base);
    expect([a.inf.papel, a.sup.papel]).toEqual(['negativos', 'positivos']);
    // invertendo os diagramas, a face superior vira a principal e recebe o mesmo escalonamento (3 grupos dos negativos)
    const b = cortesVigaFundacao({ ...base, Minf: [0, 0, 0], Msup: [0, 100, 0], inf: base.sup, sup: base.inf });
    expect([b.inf.papel, b.sup.papel]).toEqual(['positivos', 'negativos']);
    expect(b.sup.grupos).toEqual(a.inf.grupos);
    // só a face principal usa gruposNegativos: com 1 negativo e 3 positivos, a face inferior (positivos) fica com 3 grupos
    const c = cortesVigaFundacao({ ...base, Minf: [0, 0, 0], Msup: [0, 100, 0], inf: base.sup, sup: base.inf, gruposNegativos: 1, gruposPositivos: 3 });
    expect(c.sup.grupos).toHaveLength(1);
  });

  it('o escalonamento só vale se economiza barra: com lb enorme as cortadas cobrem a viga toda e voltam a ser corridas', () => {
    const r = cortesVigaFundacao({ ...base, inf: { ...base.inf, lb: 6 } }).inf;
    expect(r.grupos).toEqual([]);
    expect(r.passantes).toBe(6);
    expect(r.comprimentoTotal).toBeCloseTo(r.comprimentoSemCortes, 9);
  });

  it('face sem momento (Msup = 0): barras corridas', () => {
    const r = cortesVigaFundacao(base).sup;
    expect(r.grupos).toEqual([]);
    expect(r.passantes).toBe(2);
  });
});

describe('cortesVigaFundacao: dois picos (2 m e 8 m) — um trecho de reforço por pico', () => {
  // M = 100 em 2 e 8 m, nulo em 0, 4, 6 e 10 m. Necessária decalada: 12·(s + 0,4)/2 até 2 m; 12·(4,4 − s)/2 de 2,4 a 4 m.
  // Esquerda: j0 [0,30; 3,70] → [0,03; 4,30]; j1 [0,65; 3,35] → [0,05; 3,95]; j2 [0,95; 3,05] → [0,35; 3,65]; j3 [1,30; 2,70] → [0,70; 3,30]
  // (comprimentos 4,27; 3,90; 3,30; 2,60). Melhor partição (14,44 m): {j0, j1} em 4,27, {j2} e {j3}.
  const dois: EntradaCortesVF = { ...base, s: [0, 2, 4, 6, 8, 10], Minf: [0, 100, 0, 0, 100, 0], Msup: [0, 0, 0, 0, 0, 0] };
  it('grupos à esquerda e à direita espelhados; total de barras = 2 passantes + 2 × 4', () => {
    const r = cortesVigaFundacao(dois).inf;
    expect(r.grupos).toHaveLength(6);
    const esq = r.grupos.slice(0, 3), dir = r.grupos.slice(3);
    const ref: [number, number, number][] = [[2, 0.03, 4.3], [1, 0.35, 3.65], [1, 0.7, 3.3]];
    esq.forEach((g, i) => { expect(g.n).toBe(ref[i][0]); expect(g.s0).toBeCloseTo(ref[i][1], 9); expect(g.s1).toBeCloseTo(ref[i][2], 9); });
    dir.forEach((g, i) => { expect(g.n).toBe(ref[i][0]); expect(g.s0).toBeCloseTo(Math.max(0.03, 10 - ref[i][2]), 9); expect(g.s1).toBeCloseTo(Math.min(9.97, 10 - ref[i][1]), 9); });
    expect(r.grupos.reduce((t, g) => t + g.n, 0)).toBe(8);
    expect(r.comprimentoTotal).toBeCloseTo(2 * 9.94 + 2 * (2 * 4.27 + 3.3 + 2.6), 9);
  });
});

/** Viga de fundação sobre base elástica de 14 m com três pilares (400, 700 e 400 kN). */
function elastica(valores: Record<string, number>) {
  const s = new Sessao(edificioVazio());
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('pavimento.criar', { nome: 'Térreo', cota: 0 });
  ok('vigaElastica.criar', { pontos: [[0, 0], [14, 0]], b: 0.6, h: 0.8, k: 20000 });
  for (const x of [2, 7, 12]) ok('pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
  s.modelo.pilares.forEach((p, i) => ok('carga.pilar', { pilar: p.id, caso: 'G', N: [400, 700, 400][i] }));
  ok('opcoes.definir', { valores });
  return dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)).vigasElasticas![0];
}

describe('vigas de fundação sobre base elástica: cortes da armadura principal', () => {
  it('desligada: sem cortes; ligada: face inferior (sob os pilares, Md = 628 × 75 kN·m) com 3 corridas e grupos escalonados', () => {
    const off = elastica({ vigaFundCortes: 0 }), on = elastica({ vigaFundCortes: 1 });
    expect(off.armadura.cortes).toBeUndefined();
    const c = on.armadura.cortes!;
    expect(on.Md.inf).toBeGreaterThan(on.Md.sup);
    expect(c.inf.papel).toBe('negativos');
    expect(c.sup.papel).toBe('positivos');
    // 7 φ20 inferiores: 1/3 corridas = ⌈7/3⌉ = 3; as 4 restantes escalonadas, mais curtas que a viga
    expect(c.inf.n).toBe(7);
    expect(c.inf.passantes).toBe(3);
    expect(c.inf.grupos.length).toBeGreaterThanOrEqual(1);
    expect(c.inf.grupos.reduce((t, g) => t + g.n, 0)).toBe(4);
    for (const g of c.inf.grupos) { expect(g.s0).toBeGreaterThanOrEqual(0.03 - 1e-9); expect(g.s1).toBeLessThanOrEqual(14 - 0.03 + 1e-9); expect(g.comprimento).toBeLessThan(14); }
    // a armadura superior fica no mínimo (6 φ12,5 ≈ As,mín): todas corridas
    expect(c.sup.grupos).toEqual([]);
    expect(on.armadura.inf.barras).toEqual(off.armadura.inf.barras); // mesmas barras, só os comprimentos mudam
    // aço: diferença exata = 7850·[Ab20·(total − 7·L) + Ab12,5·(total − 6·L)]
    const L = on.L;
    const dif = 7850 * (barArea(20) * (c.inf.comprimentoTotal - 7 * L) + barArea(12.5) * (c.sup.comprimentoTotal - 6 * L));
    expect(on.aco - off.aco).toBeCloseTo(dif, 6);
    expect(on.aco).toBeLessThan(off.aco);
    expect(on.notas.some((n) => n.startsWith('Cortes da armadura principal'))).toBe(true);
    expect(on.status).toBe(off.status);
  });

  it('1 grupo nos negativos: as 4 cortadas com o mesmo comprimento', () => {
    const c = elastica({ vigaFundCortes: 1, vigaGruposSup: 1 }).armadura.cortes!;
    expect(c.inf.grupos).toHaveLength(1);
    expect(c.inf.grupos[0].n).toBe(4);
  });
});

/** Duas sapatas ligadas por viga de equilíbrio (a da divisa excêntrica): a alavanca traciona a face superior. */
function equilibrio(valores: Record<string, number>) {
  const s = new Sessao(edificioVazio());
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
  ok('pilar.inserir', { x: 6, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
  const [P1, P2] = s.modelo.pilares;
  ok('pilar.editar', { id: P1.id, ajuste: 'o' });
  ok('carga.pilar', { pilar: P1.id, caso: 'G', N: 900 });
  ok('carga.pilar', { pilar: P2.id, caso: 'G', N: 1100 });
  ok('fundacao.terreno', { sigmaAdm: 200, cotaTerreno: 0, estacas: [{ id: 'e1', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
  ok('fundacao.criar', { pilar: P1.id, tipo: 'sapata', posicao: 'divisa', cota: -1.5 });
  ok('fundacao.criar', { pilar: P2.id, tipo: 'sapata', cota: -1.5 });
  const [S1, S2] = s.modelo.fundacao!.elementos;
  ok('vigaFundacao.criar', { tipo: 'equilibrio', ini: S1.id, fim: S2.id });
  ok('opcoes.definir', { valores });
  return calcularFundacaoEdificio(s.modelo, null).vigas[0];
}

describe('vigas de fundação de equilíbrio: cortes da armadura principal', () => {
  it('a face superior (alavanca) é a principal; inferior no mínimo; barras iguais com e sem cortes', () => {
    const off = equilibrio({ vigaFundCortes: 0 }), on = equilibrio({ vigaFundCortes: 1 });
    expect(off.armadura.cortes).toBeUndefined();
    const c = on.armadura.cortes!;
    expect(on.Md.sup).toBeGreaterThan(on.Md.inf);
    expect(c.sup.papel).toBe('negativos');
    expect(c.inf.papel).toBe('positivos');
    expect(on.armadura.sup.barras).toEqual(off.armadura.sup.barras);
    // 6 φ25 superiores: 1/3 corridas = 2; as 4 restantes escalonadas (o diagrama da alavanca decresce do pilar da divisa para o interno)
    expect(c.sup.n).toBe(6);
    expect(c.sup.passantes).toBe(2);
    expect(c.sup.grupos.reduce((t, g) => t + g.n, 0)).toBe(4);
    expect(c.sup.comprimentoTotal).toBeLessThan(c.sup.comprimentoSemCortes);
    expect(Math.min(...c.sup.grupos.map((g) => g.comprimento))).toBeLessThan(c.sup.comprimentoPassante);
    expect(on.aco).toBeLessThan(off.aco);
    expect(on.notas.some((n) => n.startsWith('Cortes da armadura principal'))).toBe(true);
  });
});
