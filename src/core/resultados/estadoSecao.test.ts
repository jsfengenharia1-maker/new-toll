import { describe, expect, it } from 'vitest';
import { ES, barArea, concrete } from '../concrete';
import { fiberAxialRange, fiberCapacity } from '../fiber';
import { barrasDaViga, barrasDoArranjo, curvaConcreto, estadoDaSecao, secaoRetangularArmada } from './estadoSecao';

const c30 = concrete(30), fyd = 500 / 1.15;

describe('estado da seção (V5, K1.11.30)', () => {
  const b = 0.2, h = 0.5, a = 0.045, n = 3, phi = 16;
  const S = secaoRetangularArmada(b, h, barrasDaViga(b, h, { n, phi, a }), c30, fyd, 40);
  const As = n * barArea(phi), d = h - a;

  it('viga subarmada: x e MRd coincidem com a solução analítica do diagrama retangular (3%)', () => {
    // Rc = σcd·b·λx = As·fyd → x = As·fyd/(σcd·b·λ); MRd = As·fyd·(d − λx/2)
    const lx = (As * fyd) / (c30.sigmaCd * b), MRdAn = As * fyd * (d - lx / 2) * 1000;
    const e = estadoDaSecao(S, 0, 0, 0.8 * MRdAn);
    expect(e.resolvido).toBe(true);
    expect(e.MRd).toBeCloseTo(MRdAn, -1);
    expect(Math.abs(e.MRd / MRdAn - 1)).toBeLessThan(0.03);
    expect(Math.abs((e.x! * c30.lambda) / lx - 1)).toBeLessThan(0.1);
    // pouca armadura: domínio 2 (aço com 10‰, concreto abaixo de εcu)
    expect(e.dominio).toBe('2');
    expect(e.xd!).toBeLessThan(0.259);
    expect(e.epsTopo).toBeLessThan(c30.ecu);
    expect(Math.min(...e.barras.map((q) => q.eps))).toBeCloseTo(-0.01, 6);
    // aço tracionado em escoamento
    for (const bar of e.barras) { expect(bar.escoa).toBe(true); expect(bar.sigma).toBeCloseTo(-fyd, 6); expect(bar.eps).toBeLessThan(0); }
    // a normal aponta para a face comprimida (y+)
    expect(e.normal[0]).toBeCloseTo(0, 6); expect(e.normal[1]).toBeCloseTo(1, 6);
    expect(e.linhaNeutraNaSecao).toBe(true);
    expect(e.s0! - (-h / 2 + (h - e.x!))).toBeCloseTo(0, 9); // LN a x da face de cima (centroide em h/2)
  });

  it('armadura maior leva ao domínio 3: concreto em εcu e aço escoando', () => {
    const S3 = secaoRetangularArmada(b, h, barrasDaViga(b, h, { n: 4, phi: 20, a }), c30, fyd, 40);
    const e = estadoDaSecao(S3, 0, 0, 100);
    expect(e.dominio).toBe('3');
    expect(e.xd!).toBeGreaterThan(0.259); expect(e.xd!).toBeLessThan(0.45);
    expect(e.epsTopo).toBeCloseTo(c30.ecu, 6);
    for (const bar of e.barras) expect(bar.escoa).toBe(true);
    expect(e.barras[0].prof).toBeCloseTo(h - a, 9);
  });

  it('equilíbrio: ∫σ = N e momento igual ao do cálculo por fibras', () => {
    const MR = fiberCapacity(S, 0, 0, 1)! * 1000;
    const e = estadoDaSecao(S, 0, 0, 100);
    expect(Math.abs(e.erroEquilibrio.N)).toBeLessThan(1e-8);
    expect(e.integrados.N).toBeCloseTo(0, 8);
    expect(e.MRd).toBeCloseTo(MR, 6);
    expect(Math.hypot(e.integrados.Mx, e.integrados.My) * 1000).toBeCloseTo(MR, 6);
    // a soma das forças de concreto e de aço (líquidas) reproduz N: Rc + ΣF = N
    expect(e.concreto.Rc + e.barras.reduce((s, q) => s + q.F, 0)).toBeCloseTo(e.integrados.N, 8);
    // diagrama retangular equivalente tem resultante próxima à da parábola-retângulo
    expect(Math.abs(e.concreto.retangular.Rc / e.concreto.Rc - 1)).toBeLessThan(0.06);
    expect(e.util).toBeCloseTo(100 / MR, 8);
  });

  it('pilar com normal e momento: N integrado = Nd e domínio coerente com a excentricidade', () => {
    const w = 0.3, hh = 0.4, ap = 0.04;
    const P = secaoRetangularArmada(w, hh, barrasDoArranjo(w, hh, ap, { phi: 16, nb: 3, nh: 3 }), c30, fyd, 36);
    expect(P.bars).toHaveLength(8);
    const faixa = fiberAxialRange(P);
    // grande excentricidade: domínio 3 ou 4; normal alta com momento pequeno: domínio 4a ou 5
    const flex = estadoDaSecao(P, 300, 0, 120);
    expect(flex.resolvido).toBe(true);
    expect(flex.integrados.N * 1000).toBeCloseTo(300, 4);
    expect(['3', '4']).toContain(flex.dominio);
    const alta = estadoDaSecao(P, 0.95 * faixa.NRc * 1000, 0, 5);
    expect(alta.resolvido).toBe(true);
    expect(alta.integrados.N * 1000).toBeCloseTo(0.95 * faixa.NRc * 1000, 3);
    expect(['4a', '5']).toContain(alta.dominio);
    // quanto maior a normal, menor a profundidade relativa da linha neutra tracionada: a barra mais tracionada perde deformação
    const tracionada = (s: ReturnType<typeof estadoDaSecao>) => Math.max(...s.barras.map((q) => -q.eps));
    expect(tracionada(alta)).toBeLessThan(tracionada(flex));
    // flexão oblíqua: a normal gira para o quadrante do momento
    const obl = estadoDaSecao(P, 600, 40, 40);
    expect(obl.resolvido).toBe(true);
    expect(obl.integrados.N * 1000).toBeCloseTo(600, 4);
    expect(obl.normal[0]).toBeGreaterThan(0.2); expect(obl.normal[1]).toBeGreaterThan(0.2);
  });

  it('tração com pequena excentricidade é domínio 1 e fora da faixa não resolve', () => {
    const P = secaoRetangularArmada(0.3, 0.4, barrasDoArranjo(0.3, 0.4, 0.04, { phi: 16, nb: 3, nh: 3 }), c30, fyd);
    const faixa = fiberAxialRange(P);
    const t = estadoDaSecao(P, 0.97 * faixa.NRt * 1000, 0, 2);
    expect(t.resolvido).toBe(true);
    expect(t.dominio).toBe('1');
    expect(estadoDaSecao(P, 2 * faixa.NRc * 1000, 0, 5).resolvido).toBe(false);
  });

  it('curva do concreto: parábola-retângulo até σcd em εc2 e constante até εcu', () => {
    const cv = curvaConcreto(c30, 35);
    expect(cv[0]).toEqual([0, 0]);
    expect(cv.at(-1)![1]).toBeCloseTo(c30.sigmaCd, 9);
    const meio = cv.find(([e]) => Math.abs(e - c30.ec2 / 2) < 1e-9);
    if (meio) expect(meio[1]).toBeCloseTo(c30.sigmaCd * (1 - 0.25), 9);
    expect(ES).toBe(210000);
  });
});
