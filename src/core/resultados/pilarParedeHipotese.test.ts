// V7c (C4.60): esforços do pilar-parede por hipótese: superposição dos casos, equilíbrio com a carga da base e envoltória.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio } from '../building/dimensionamento';
import type { Hipotese } from './deformada';
import { hipotesesDeEsforco } from './esforcosCaso';
import { baseDoPilarParede, esforcosPilarParedePorHipotese, GRANDEZAS_PP } from './pilarParedeHipotese';

const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };

function edificio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const g = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.grupo;
  ok(s, 'pilarParede.tipo', { nome: 'Reta 4 m', vertices: [[0, 0], [4, 0]], esq: 0.1, dir: 0.1 });
  ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0 });
  ok(s, 'pilar.inserir', { x: 0, y: 5, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
  ok(s, 'pilar.inserir', { x: 4, y: 5, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
  ok(s, 'pilar.inserir', { x: 7, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
  ok(s, 'viga.tracar', { grupo: g, pontos: [[1, 0], [7, 0]], secao: { b: 0.2, h: 0.5 } });
  for (const pts of [[[0, 5], [4, 5]], [[0, 0], [0, 5]], [[4, 0], [4, 5]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: { b: 0.2, h: 0.5 } });
  ok(s, 'laje.criar', { grupo: g, contorno: [[0, 0], [4, 0], [4, 5], [0, 5]], tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

describe('V7c: esforços do pilar-parede por hipótese (C4.60)', () => {
  const b = edificio(), an = analisarEdificio(b), dim = dimensionarEdificio(b, an, { fundacao: false }), pp = dim.pilaresParede![0];
  const hs = hipotesesDeEsforco(b, an);

  it('caso simples = resultante do caso; combinação = soma ponderada dos casos (superposição exata)', () => {
    const g = hs.find((h) => h.id === 'caso:G')!, linhasG = esforcosPilarParedePorHipotese(pp, g);
    expect(linhasG.length).toBe(pp.lados.length);
    linhasG.forEach((l, i) => { for (const { v } of GRANDEZAS_PP) { expect(l.max[v]).toBe(pp.lados[i].casos.G[v]); expect(l.min[v]).toBe(l.max[v]); } });
    const comb = hs.find((h) => h.tipo === 'combinacao' && Object.keys(h.fatores).length >= 2) as Hipotese;
    const linhas = esforcosPilarParedePorHipotese(pp, comb);
    linhas.forEach((l, i) => { for (const { v } of GRANDEZAS_PP) {
      const esperado = Object.entries(comb.fatores).reduce((t, [n, f]) => t + f * (pp.lados[i].casos[n]?.[v] ?? 0), 0);
      expect(l.max[v]).toBeCloseTo(esperado, 9);
    } });
  });

  it('equilíbrio vertical: a normal dos lados do primeiro lance equilibra a carga da base na combinação e no caso', () => {
    const lance0 = b.pavimentos[0].id;
    for (const h of [hs.find((x) => x.id === 'caso:G')!, hs.find((x) => x.tipo === 'combinacao')!]) {
      const soma = esforcosPilarParedePorHipotese(pp, h).filter((l) => l.pavimento === lance0).reduce((t, l) => t + l.max.N, 0);
      const base = baseDoPilarParede(pp, h).max.N;
      expect(base).toBeGreaterThan(0);
      expect(Math.abs(soma / -base - 1)).toBeLessThan(0.05); // a média do painel, descontando o meio peso próprio
    }
  });

  it('envoltória ELU: extremos entre as combinações, com a combinação determinante, iguais aos do dimensionamento', () => {
    const env = hs.find((h) => h.id === 'env:ELU')!;
    expect(env.tipo).toBe('envoltoria');
    const linhas = esforcosPilarParedePorHipotese(pp, env);
    expect(env.tipo === 'envoltoria' && env.combinacoes.length).toBeGreaterThan(3);
    linhas.forEach((l, i) => {
      for (const { v } of GRANDEZAS_PP) {
        expect(l.max[v]).toBeGreaterThanOrEqual(l.min[v]);
        expect(l.max[v]).toBeCloseTo(pp.lados[i].elu[v].max, 6);
        expect(l.min[v]).toBeCloseTo(pp.lados[i].elu[v].min, 6);
      }
      expect(l.porMax.N).toBe(pp.lados[i].elu.N.cMax);
    });
    const base = baseDoPilarParede(pp, env);
    expect(base.max.N).toBeCloseTo(pp.baseElu.Nmax, 6);
    expect(base.min.N).toBeCloseTo(pp.baseElu.Nmin, 6);
  });
});
