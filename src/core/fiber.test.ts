import { describe, expect, it } from 'vitest';
import { barArea, circleWidth, concrete, momentCapacity } from './concrete';
import { designColumnGeneral } from './columnGeneral';
import { cPolygon, circlePolygon, doubleAnglePolygon, fiberCapacity, fiberMesh, fiberSolve, limparMemoCapacidade, lPolygon, polyProps, zPolygon, type FiberSection, type Pt } from './fiber';

const c30 = concrete(30), fyd = 500 / 1.15;

describe('polígono: propriedades geométricas', () => {
  it('retângulo e L conferem com as fórmulas', () => {
    const r = polyProps([[0, 0], [0.2, 0], [0.2, 0.5], [0, 0.5]]);
    expect(r.A).toBeCloseTo(0.1, 12); expect(r.Ix).toBeCloseTo((0.2 * 0.5 ** 3) / 12, 12); expect(r.cy).toBeCloseTo(0.25, 12);
    const L = polyProps(lPolygon(0.6, 0.6, 0.2, 0.2));
    expect(L.A).toBeCloseTo(0.6 * 0.2 + 0.2 * 0.4, 12);
    const cy = (0.6 * 0.2 * 0.1 + 0.2 * 0.4 * 0.4) / 0.2;
    expect(L.cy).toBeCloseTo(cy, 12);
    const Ix = (0.6 * 0.2 ** 3) / 12 + 0.12 * (0.1 - cy) ** 2 + (0.2 * 0.4 ** 3) / 12 + 0.08 * (0.4 - cy) ** 2;
    expect(L.Ix).toBeCloseTo(Ix, 12);
    const C = polyProps(circlePolygon(0.5, 96));
    expect(C.A / (Math.PI * 0.25 ** 2)).toBeCloseTo(1, 2);
  });
});

describe('ELU por fibras', () => {
  it('retângulo em flexão no plano: igual à rotina por faixas (±1,5%)', () => {
    const b = 0.25, h = 0.5, a = 0.045, Ab = barArea(16);
    const poly: Pt[] = [[0, 0], [b, 0], [b, h], [0, h]];
    const bars = [[a, a], [b - a, a], [a, h - a], [b - a, h - a]].map(([x, y]) => ({ x, y, A: 2 * Ab }));
    const S: FiberSection = { mesh: fiberMesh(poly, 40), bars, cx: b / 2, cy: h / 2, c: c30, fyd, poly };
    for (const Nd of [0.2, 0.8, 1.6]) {
      const ref = momentCapacity(b, h, [{ y: a, A: 4 * Ab }, { y: h - a, A: 4 * Ab }], Nd, c30, fyd)!;
      const fib = fiberCapacity(S, Nd, 0, 1)!;
      expect(Math.abs(fib - ref) / ref).toBeLessThan(0.015);
    }
  });
  it('seção quadrada simétrica: capacidade igual nas direções x e y', () => {
    const b = 0.4, a = 0.05, Ab = barArea(20);
    const poly: Pt[] = [[0, 0], [b, 0], [b, b], [0, b]];
    const bars = [[a, a], [b - a, a], [a, b - a], [b - a, b - a]].map(([x, y]) => ({ x, y, A: Ab }));
    const S: FiberSection = { mesh: fiberMesh(poly, 30), bars, cx: b / 2, cy: b / 2, c: c30, fyd, poly };
    const mx = fiberCapacity(S, 1, 1, 0)!, my = fiberCapacity(S, 1, 0, 1)!, md = fiberCapacity(S, 1, 1, 1)!;
    expect(mx / my).toBeCloseTo(1, 3);
    // na diagonal a capacidade é menor que a do eixo e maior que a da interação linear
    expect(md).toBeLessThan(mx);
    expect(md).toBeGreaterThan(mx / Math.SQRT2);
  });
});

describe('pilares circulares e em L', () => {
  it('circular: capacidade por fibras ≈ rotina por faixas das estacas (±2%)', () => {
    const D = 0.5, rs = D / 2 - 0.05, n = 8, Ab = barArea(16);
    const bars = Array.from({ length: n }, (_, k) => ({ x: D / 2 + rs * Math.cos((2 * Math.PI * k) / n + Math.PI / 2), y: D / 2 + rs * Math.sin((2 * Math.PI * k) / n + Math.PI / 2), A: Ab }));
    const poly = circlePolygon(D, 96);
    const S: FiberSection = { mesh: fiberMesh(poly, 48), bars, cx: D / 2, cy: D / 2, c: c30, fyd, poly };
    const ref = momentCapacity(circleWidth(D), D, bars.map((b) => ({ y: D - b.y, A: b.A })), 1.0, c30, fyd)!;
    expect(Math.abs(fiberCapacity(S, 1.0, 0, 1)! - ref) / ref).toBeLessThan(0.02);
  });
  it('dimensiona pilar circular e pilar em L', () => {
    const base = { L: 3, leIn: 3, leOut: 3, cover: 0.03, conc: c30, fyk: 500, gammaS: 1.15, dmax: 0.019 };
    const combos = [{ name: 'c', N0: -1200, NL: -1180, M0: 60, ML: -40, Mspan: 60, transverse: false }];
    const circ = designColumnGeneral({ ...base, circleD: 0.4, combos });
    expect(circ.layout!.n).toBeGreaterThanOrEqual(6);
    expect(circ.ok).toBe(true);
    const t0 = performance.now();
    const L = designColumnGeneral({ ...base, poly: lPolygon(0.6, 0.6, 0.2, 0.2), combos });
    expect(L.layout).toBeTruthy();
    expect(L.util).toBeLessThanOrEqual(1);
    expect(performance.now() - t0).toBeLessThan(8000);
  });
});

describe('perfis paramétricos por polígono', () => {
  it('U, Z e dupla cantoneira: área pela soma das partes', () => {
    expect(polyProps(cPolygon(0.2, 0.08, 0.006, 0.01)).A).toBeCloseTo(2 * 0.08 * 0.01 + 0.006 * 0.18, 12);
    const z = polyProps(zPolygon(0.2, 0.08, 0.006, 0.01));
    expect(z.A).toBeCloseTo(2 * (0.08 * 0.01) + 0.006 * 0.18, 9);
    const d = polyProps(doubleAnglePolygon(0.1, 0.01, 0.008));
    expect(d.A).toBeCloseTo(2 * (2 * 0.1 * 0.01 - 0.01 * 0.01), 12);
  });
});

describe('memória de fiberCapacity (chave por conteúdo da seção)', () => {
  // a chave guarda o resultado por seção; seções diferentes (barras, concreto, fyd) nunca podem trocar resultados
  const sec = (fck: number, fyd: number, phiCanto: number): FiberSection => {
    const poly: Pt[] = [[0, 0], [0.3, 0], [0.3, 0.5], [0, 0.5]], A = barArea(phiCanto) / 1e4;
    return { mesh: fiberMesh(poly, 28), bars: [[0.04, 0.04], [0.26, 0.04], [0.26, 0.46], [0.04, 0.46]].map(([x, y]) => ({ x, y, A })), cx: 0.15, cy: 0.25, c: concrete(fck), fyd, poly };
  };
  it('seções iguais em conteúdo compartilham o resultado; mudar barra, fck ou fyd muda o resultado', () => {
    limparMemoCapacidade();
    const a = fiberCapacity(sec(30, 434.8, 16), 1.0, 1, 0.3)!;
    // objeto novo, mesmo conteúdo: mesmo valor (vindo da memória)
    expect(fiberCapacity(sec(30, 434.8, 16), 1.0, 1, 0.3)).toBe(a);
    // conteúdo diferente: valor recalculado e igual ao de fiberSolve
    for (const S of [sec(30, 434.8, 20), sec(40, 434.8, 16), sec(30, 500 / 1.15 * 0.9, 16)]) {
      const r = fiberSolve(S, 1.0, 1, 0.3)!, v = fiberCapacity(S, 1.0, 1, 0.3)!;
      expect(v).toBe(Math.hypot(r.Mx, r.My));
      expect(v).not.toBe(a);
    }
  });
  it('esforços diferentes (inclusive −0 no momento) não colidem', () => {
    limparMemoCapacidade();
    const S = sec(30, 434.8, 16);
    for (const [N, mx, my] of [[1.0, 1, 0], [1.0, 1, -0], [1.0, 0, 1], [0.5, 1, 0], [1.0, -1, 0]] as const) {
      const r = fiberSolve(S, N, mx, my);
      expect(fiberCapacity(S, N, mx, my)).toBe(r ? Math.hypot(r.Mx, r.My) : null);
    }
  });
});
