// E5h: ponto de inserção do pano (C7.5: origem da malha) e furos na grelha (K1.9.103).
import { describe, expect, it } from 'vitest';
import { Sessao, comandosEdificioPadrao } from '../commands';
import { analisarEdificio, malhaLaje, origemMalha } from './analitico';
import type { BuildingModel } from './types';

type P = [number, number];
const area = (c: P[]) => Math.abs(c.reduce((a, p, i) => { const q = c[(i + 1) % c.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const dentro = (p: P, c: P[]) => { let r = false; for (let i = 0, j = c.length - 1; i < c.length; j = i++) if ((c[i][1] > p[1]) !== (c[j][1] > p[1]) && p[0] < ((c[j][0] - c[i][0]) * (p[1] - c[i][1])) / (c[j][1] - c[i][1]) + c[i][0]) r = !r; return r; };
const comp = (ps: P[]) => ps.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - ps[i][0], p[1] - ps[i][1]), 0);

describe('malhaLaje: origem no ponto de inserção', () => {
  const ret: P[] = [[0, 0], [4.3, 0], [4.3, 3], [0, 3]];
  const larguras = (m: ReturnType<typeof malhaLaje>, dir: 0 | 1) => m.linhas.filter((l) => l.dir === dir).map((l) => l.largura);

  it('sem origem: malha simétrica de sempre (passo ajustado)', () => {
    const m = malhaLaje(ret, 0, 1);
    expect(m.variavel).toBe(false);
    // 4,3 m / 1 m → 4 vãos de 1,075; 3 m → 3 vãos de 1 m
    expect(larguras(m, 1)).toEqual([1.075, 1.075, 1.075]);
    expect(larguras(m, 0)).toEqual([1, 1]);
  });

  it('origem no canto (0, 0): linhas a cada 1 m a partir dele, sobra no lado oposto', () => {
    const m = malhaLaje(ret, 0, 1, [], [0, 0]);
    expect(m.variavel).toBe(true);
    const xs = m.linhas.filter((l) => l.dir === 1).map((l) => l.pontos[0][0]);
    expect(xs).toEqual([1, 2, 3]); // x = 4 ficaria a 0,3 m da borda (< s/2): sem linha
    expect(larguras(m, 1)[0]).toBeCloseTo(1, 12);
    expect(larguras(m, 1)[2]).toBeCloseTo((4.3 - 2) / 2, 12); // a última leva a sobra até a borda
    expect(m.linhas.filter((l) => l.dir === 0).map((l) => l.pontos[0][1])).toEqual([1, 2]);
  });

  it('origem no canto oposto: malha espelhada; linhas e faixa de borda cobrem a área', () => {
    const m = malhaLaje(ret, 0, 1, [], [4.3, 3]);
    const xs = m.linhas.filter((l) => l.dir === 1).map((l) => l.pontos[0][0]).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(1.3, 12);
    expect(xs[2]).toBeCloseTo(3.3, 12);
    for (const d of [0, 1] as const) {
      const linhas = m.linhas.filter((l) => l.dir === d).reduce((t, l) => t + l.largura * comp(l.pontos), 0);
      expect(linhas).toBeLessThanOrEqual(12.9 + 1e-9);
      expect(linhas).toBeGreaterThan(12.9 * 0.6);
    }
  });

  it('com furo: nenhum trecho da malha dentro da abertura; área líquida coberta; borda do furo na malha', () => {
    const furo: P[] = [[1.2, 0.8], [3.1, 0.8], [3.1, 2.1], [1.2, 2.1]];
    const Aliq = area(ret) - area(furo);
    for (const origem of [undefined, [0, 0] as P, [4.3, 3] as P]) {
      const m = malhaLaje(ret, 0, 0.25, [furo], origem);
      for (const l of m.linhas) for (let i = 0; i + 1 < l.pontos.length; i++) {
        const a = l.pontos[i], z = l.pontos[i + 1], mid: P = [(a[0] + z[0]) / 2, (a[1] + z[1]) / 2];
        expect(dentro(mid, furo), `trecho no furo ${JSON.stringify(mid)}`).toBe(false);
        expect(dentro(mid, ret)).toBe(true);
      }
      for (const d of [0, 1] as const) {
        const linhas = m.linhas.filter((l) => l.dir === d).reduce((t, l) => t + l.largura * comp(l.pontos), 0);
        expect(linhas).toBeLessThanOrEqual(Aliq + 1e-6);
        expect(linhas).toBeGreaterThan(Aliq * 0.85); // o resto é a faixa junto ao contorno e à borda do furo
      }
      expect(m.bordas.some((e) => Math.abs((e.a[1] + e.z[1]) / 2 - 0.8) < 1e-9 && (e.a[0] + e.z[0]) / 2 > 1.2 && (e.a[0] + e.z[0]) / 2 < 3.1)).toBe(true);
    }
  });

  it('origemMalha: vértice de inserção; ausente ou primeiro vértice = nenhuma', () => {
    expect(origemMalha({ contorno: ret })).toBeUndefined();
    expect(origemMalha({ contorno: ret, insercao: 0 })).toBeUndefined();
    expect(origemMalha({ contorno: ret, insercao: 2 })).toEqual([4.3, 3]);
  });
});

/** Pano 6 × 5 m sobre 4 vigas, com pilares nos cantos. */
function obra(furo?: P[], insercao?: number): BuildingModel {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  s.executar('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  const id = s.modelo.lajes[0].id;
  if (furo) expect(s.executar('laje.abertura', { id, contorno: furo }).ok).toBe(true);
  if (insercao) expect(s.executar('laje.editar', { id, insercao }).ok).toBe(true);
  return s.modelo;
}

/** Flecha vertical média (mm, para baixo) dos nós da grelha na faixa x de 0,8 a 2,2 m e y de 0,8 a 4,2 m (fora da abertura), caso G. */
function flecha(b: BuildingModel, malha: number): number {
  const an = analisarEdificio(b, { malha });
  expect(an.erro).toBeUndefined();
  const g = an.grelhas.reduce((a, c) => (c.modelo.nos.length > a.modelo.nos.length ? c : a));
  const v: number[] = [];
  g.modelo.nos.forEach((n, i) => { if (n[0] >= 0.8 && n[0] <= 2.2 && n[1] >= 0.8 && n[1] <= 4.2) v.push(-g.res!.desloc[0][i * 6 + 2] * 1000); });
  expect(v.length).toBeGreaterThan(5);
  return v.reduce((t, x) => t + x, 0) / v.length;
}

describe('pano com furo e ponto de inserção na análise do edifício', () => {
  const furo: P[] = [[2.5, 1.5], [4, 1.5], [4, 3], [2.5, 3]];
  it('a inserção em outro vértice mantém as reações (Q = 1,5·área líquida) e o equilíbrio por caso', { timeout: 60000 }, () => {
    const Aliq = 30 - area(furo);
    for (const ins of [undefined, 2]) {
      const an = analisarEdificio(obra(furo, ins));
      expect(an.erro).toBeUndefined();
      const soma = (c: 'G' | 'Q') => an.fundacao.filter((f) => f.caso === c).reduce((t, f) => t + f.N, 0);
      expect(an.totais.Q / 3).toBeCloseTo(1.5 * Aliq, 6); // 3 pavimentos
      expect(soma('Q')).toBeCloseTo(an.totais.Q, 3);
      expect(soma('G')).toBeCloseTo(an.totais.G, 3);
    }
  });

  it('convergência: a flecha fora do furo varia pouco com a malha e com a origem; o furo reduz a flecha', { timeout: 120000 }, () => {
    const M = [0.4, 0.3, 0.2]; // não dividem 6 × 5 m: a origem da malha muda a posição das linhas
    const cheia = M.map((m) => flecha(obra(), m));
    const fura = M.map((m) => flecha(obra(furo), m));
    const furaIns = M.map((m) => flecha(obra(furo, 2), m));
    expect(furaIns.some((v, i) => Math.abs(v - fura[i]) > 1e-9)).toBe(true); // a origem mudou a malha
    expect(Math.abs(fura[1] - fura[2]) / fura[2]).toBeLessThan(0.06); // refino
    expect(Math.abs(furaIns[1] - furaIns[2]) / furaIns[2]).toBeLessThan(0.06);
    for (let i = 0; i < 3; i++) expect(Math.abs(furaIns[i] - fura[i]) / fura[i]).toBeLessThan(0.08);
    // ponto afastado da abertura: a flecha fica na mesma ordem do pano inteiro (limite físico, ±15 %)
    expect(cheia[2]).toBeGreaterThan(0);
    expect(Math.abs(fura[2] - cheia[2]) / cheia[2]).toBeLessThan(0.15);
  });

  it('pano apagado (abertura): a grelha não leva carga de laje e o pavimento fecha o equilíbrio', { timeout: 60000 }, () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
    const v = (q: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: q, secao: { b: 0.15, h: 0.4 } } });
    s.executar('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
    s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
    const cheia = analisarEdificio(s.modelo);
    expect(s.executar('laje.apagarPano', { ids: [s.modelo.lajes[0].id] }).ok).toBe(true);
    const vazia = analisarEdificio(s.modelo);
    expect(vazia.erro).toBeUndefined();
    expect(vazia.totais.Q).toBeCloseTo(0, 9);
    expect(cheia.totais.Q / 3).toBeCloseTo(1.5 * 30, 6);
    const soma = vazia.fundacao.filter((f) => f.caso === 'G').reduce((t, f) => t + f.N, 0);
    expect(soma).toBeCloseTo(vazia.totais.G, 3); // só o peso das vigas e dos pilares
    expect(vazia.totais.G).toBeLessThan(cheia.totais.G - 3 * 25 * 0.12 * 30 + 1e-6);
  });
});
