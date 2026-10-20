import { describe, expect, it } from 'vitest';
import { basePressure, designFooting, isFooting, polyPressure, type FootingResult } from './footings';
import { casosDoGrupo, designFootingGroup, maiorVao, recorteLimites, segmentoCortaPoligono } from './footingsGroup';
import { concrete } from './concrete';
import { defaultFoundationParams, type FCol, type FCombo } from './piles';

const P = (o: Partial<ReturnType<typeof defaultFoundationParams>> = {}) => ({ ...defaultFoundationParams(), ftSigmaMode: 'informada' as const, ftSigmaAdm: 250, ...o });
const col = (label: string, x: number, y = 0, ap = 0.3, bp = 0.3): FCol => ({ label, x, y, ap, bp });
const combo = (label: string, ...cs: { N: number; Mx?: number; My?: number }[]): FCombo => ({ label, cols: cs.map((c) => ({ N: c.N, Mx: c.Mx ?? 0, My: c.My ?? 0, Hx: 0, Hy: 0 })) });
const soma = (cs: { N: number }[]) => cs.reduce((a, c) => a + c.N, 0);
const grupo = (cols: FCol[], combos: FCombo[], extra: Record<string, unknown> = {}, p = P()) => {
  const Nk = Math.max(...combos.map((c) => soma(c.cols))), NkMin = Math.min(...combos.map((c) => soma(c.cols)));
  const r = designFootingGroup({ Nk, NkMin, Mx: 0, My: 0, ap: 0.3, bp: 0.3, group: { cols, combos }, ...extra }, p);
  if (!isFooting(r)) throw new Error(r.messages.join(' '));
  return r as FootingResult;
};

describe('sapata associada (FU3)', () => {
  it('dois pilares iguais a 3 m: base ≥ (N + W)/σadm, vão/h, momentos por faixa (cálculo manual)', () => {
    const r = grupo([col('P1', -1.5), col('P2', 1.5)], [combo('C1', { N: 600 }, { N: 600 })]);
    expect(r.ok, r.messages.join(' ')).toBe(true);
    expect((1200 + r.W) / (r.A * r.B)).toBeLessThanOrEqual(250 + 1e-6);
    // vão entre eixos 3 m: h ≥ 3/2 (fundVaoAltura = 2); balanço pequeno
    expect(r.grupo!.vao).toBeCloseTo(3, 9);
    expect(r.h).toBeGreaterThanOrEqual(1.5 - 1e-9);
    expect(r.grupo!.vaoAltura).toBeLessThanOrEqual(2 + 1e-9);
    expect(r.kind).toBe('rigida');
    // pressão uniforme de cálculo (sem peso próprio): qd·B = γf·N/A (kN/m)
    const qB = (1.4 * 1200) / r.A;
    // positivo: balanço além da seção a 0,15·a dentro da face do pilar extremo (CEB-70): x = 1,5 + 0,35·0,3
    const c = r.A / 2 - (1.5 + 0.35 * 0.3);
    expect(r.flex.x.Md).toBeCloseTo((qB * c * c) / 2, 1);
    // negativo no meio do vão: qB·(A/2)²/2 − Nd1·1,5
    expect(r.flex.x.top!.Md).toBeCloseTo((qB * (r.A / 2) ** 2) / 2 - 840 * 1.5, 0);
    // tração do concreto simples abaixo de fctd (h alto): sem malha superior
    expect(r.flex.x.top!.needed).toBe(false);
    expect(r.flex.x.top!.sigmaT).toBeCloseTo((6 * (Math.abs(r.flex.x.top!.Md) / 1000)) / (r.B * r.h * r.h), 6);
    // direção y: faixa de largura A, balanço além de bp: B/2 − 0,35·0,3
    const cy = r.B / 2 - 0.35 * 0.3;
    expect(r.flex.y.Md).toBeCloseTo(((1.4 * 1200 / r.B) * cy * cy) / 2, 1);
    // compressão diagonal em cada pilar
    expect(r.grupo!.pilares.map((q) => q.Nd)).toEqual([840, 840]);
    expect(r.grupo!.pilares[0].tauSd0).toBeCloseTo(840 / 1000 / (1.2 * r.d), 9);
  });

  it('cargas diferentes: base centrada na resultante, diagrama com momento negativo no cortante nulo (cálculo manual)', () => {
    // P1 = 800 kN em x = −1,0 e P2 = 400 kN em x = +2,0: resultante na origem
    const r = grupo([col('P1', -1.0), col('P2', 2.0)], [combo('C1', { N: 800 }, { N: 400 })]);
    expect(r.ok, r.messages.join(' ')).toBe(true);
    expect(r.A / 2).toBeGreaterThanOrEqual(2.15 + 0.05 - 1e-9); // base simétrica em torno da resultante cobre o pilar mais distante
    const qB = (1.4 * 1200) / r.A;
    // M(x) = qB·(x + A/2)²/2 − 1120·(x + 1,0), mínimo no cortante nulo x* = 1120/qB − A/2
    const xs = 1120 / qB - r.A / 2;
    const Mneg = (qB * (xs + r.A / 2) ** 2) / 2 - 1120 * (xs + 1.0);
    expect(r.flex.x.top!.Md).toBeCloseTo(Mneg, 0);
    // positivo: balanço da esquerda além de x = −1,0 − 0,105
    const c = r.A / 2 - 1.105;
    expect(r.flex.x.Md).toBeCloseTo((qB * c * c) / 2, 1);
    // pressão uniforme: tensões máxima e mínima iguais
    expect(r.cases[0].sigmaMax).toBeCloseTo(r.cases[0].sigmaMin, 6);
  });

  it('pilares com momento: os dois sinais são cobertos; a pressão máxima respeita σadm', () => {
    const cols = [col('P1', -1.5), col('P2', 1.5)];
    const cb = [combo('C1', { N: 600, My: 80 }, { N: 600, My: 40 })];
    const casos = casosDoGrupo(cols, cb);
    expect(casos).toHaveLength(2);
    expect(casos.map((c) => c.My).sort((a, z) => a - z)).toEqual([-120, 120]);
    const r = grupo(cols, cb);
    expect(r.ok).toBe(true);
    expect(r.methodNotes.join(' ')).not.toMatch(/resíduo/); // o diagrama de momentos fecha (equilíbrio)
    for (const c of r.cases) { expect(c.sigmaMax).toBeLessThanOrEqual(250 + 1e-6); expect(c.compressed).toBeGreaterThanOrEqual(2 / 3 - 1e-6); }
    // 120 kN·m a mais de momento: base maior que sem momento
    const r0 = grupo(cols, [combo('C1', { N: 600 }, { N: 600 })]);
    expect(r.A * r.B).toBeGreaterThanOrEqual(r0.A * r0.B - 1e-9);
  });

  it('um pilar sem limites reproduz a sapata isolada (A, B, h, momentos)', () => {
    const cols = [col('P1', 0)];
    const g = grupo(cols, [combo('C1', { N: 1000 })]);
    const s = designFooting({ Nk: 1000, NkMin: 1000, Mx: 0, My: 0, ap: 0.3, bp: 0.3 }, P());
    if (!isFooting(s)) throw new Error('sem solução');
    expect([g.A, g.B, g.h, g.h0]).toEqual([s.A, s.B, s.h, s.h0]);
    expect(g.flex.x.Md).toBeCloseTo(s.flex.x.Md, 1);
    expect(g.flex.y.Md).toBeCloseTo(s.flex.y.Md, 1);
    expect(g.flex.x.AsAdopt).toBeCloseTo(s.flex.x.AsAdopt, 6);
  });

  it('dimensões e armadura impostas: só verificadas; armadura insuficiente reprova', () => {
    const cols = [col('P1', -1.5), col('P2', 1.5)];
    const cb = [combo('C1', { N: 600 }, { N: 600 })];
    const livre = grupo(cols, cb);
    const igual = grupo(cols, cb, { fixed: { A: livre.A, B: livre.B, h: livre.h, bars: { x: { phi: livre.flex.x.bars!.phi, n: livre.flex.x.bars!.n }, y: { phi: livre.flex.y.bars!.phi, n: livre.flex.y.bars!.n } } } });
    expect(igual.ok).toBe(true);
    expect(igual.fixed).toBe(true);
    expect([igual.A, igual.B, igual.h]).toEqual([livre.A, livre.B, livre.h]);
    const fraca = grupo(cols, cb, { fixed: { A: livre.A, B: livre.B, h: livre.h, bars: { y: { phi: 8, n: 3 } } } });
    expect(fraca.ok).toBe(false);
    expect(fraca.messages.join(' ')).toMatch(/Armadura imposta insuficiente na direção y/);
    const pequena = designFootingGroup({ Nk: 1200, NkMin: 1200, Mx: 0, My: 0, ap: 0.3, bp: 0.3, group: { cols, combos: cb }, fixed: { A: 3.4, B: 0.8 } }, P());
    expect(pequena.ok).toBe(false);
  });

  it('concreto simples: sem armadura e altura pela tração na flexão (σt ≤ fctd com γc × 1,2)', () => {
    const cols = [col('P1', -1.5), col('P2', 1.5)];
    const r = grupo(cols, [combo('C1', { N: 600 }, { N: 600 })], { simples: true });
    expect(r.simples).toBe(true);
    expect(r.flex.x.bars).toBeNull();
    const fctd = concrete(30, 1.4 * 1.2).fctd;
    expect(r.flex.x.fctd).toBeCloseTo(fctd, 9);
    expect(r.flex.x.sigmaT!).toBeLessThanOrEqual(fctd + 1e-9);
    expect(r.flex.y.sigmaT!).toBeLessThanOrEqual(fctd + 1e-9);
    expect(r.ok, r.messages.join(' ')).toBe(true);
  });

  it('maior vão: árvore geradora mínima dos centros', () => {
    expect(maiorVao([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 5, y: 0 }])).toBeCloseTo(3, 9);
    expect(maiorVao([{ x: 0, y: 0 }])).toBe(0);
  });
});

describe('malha superior e relação vão/altura', () => {
  it('vão/h mais folgado reduz a altura e a tração em cima pode exigir malha superior', () => {
    const cols = [col('P1', -2.0), col('P2', 2.0)];
    const cb = [combo('C1', { N: 1500 }, { N: 1500 })];
    const rigida = grupo(cols, cb);
    expect(rigida.h).toBeGreaterThanOrEqual(2.0 - 1e-9);
    const folgada = grupo(cols, cb, {}, P({ ftVaoAltura: 4 }));
    expect(folgada.h).toBeLessThan(rigida.h);
    const t = folgada.flex.x.top!;
    // a malha superior é exigida exatamente quando σt passa de fctd
    expect(t.needed).toBe(t.sigmaT > t.fctd);
    if (t.needed) expect(t.bars).not.toBeNull();
  });
});

describe('descolamento e armadura mínima', () => {
  it('permitir descolamento dispensa a área comprimida mínima e não aumenta a base', () => {
    const inp = { Nk: 800, NkMin: 500, Mx: 0, My: 250, ap: 0.3, bp: 0.3 };
    const a = designFooting(inp, P());
    const b = designFooting(inp, P({ ftLevantamento: true }));
    if (!isFooting(a) || !isFooting(b)) throw new Error('sem solução');
    expect(b.A * b.B).toBeLessThanOrEqual(a.A * a.B + 1e-9);
    expect(b.levantamento).toBe(true);
    for (const c of b.cases) expect(c.sigmaMax).toBeLessThanOrEqual(250 + 1e-6);
    // sem a regra de 2/3, a base mínima é a que só o σmáx limita
    expect(Math.min(...b.cases.map((c) => c.compressed))).toBeLessThanOrEqual(Math.min(...a.cases.map((c) => c.compressed)) + 1e-9);
  });

  it('redução da taxa mínima: As adotada = menor entre ρmín·b·h e 4/3 da calculada', () => {
    const inp = { Nk: 600, NkMin: 600, Mx: 0, My: 0, ap: 0.3, bp: 0.3 };
    const a = designFooting(inp, P());
    const b = designFooting(inp, P({ ftRhoMinReduz: true }));
    if (!isFooting(a) || !isFooting(b)) throw new Error('sem solução');
    expect(a.flex.x.AsAdopt).toBeCloseTo(a.flex.x.AsMin, 12);
    expect(b.flex.x.AsAdopt).toBeCloseTo(Math.max(b.flex.x.As, Math.min(b.flex.x.AsMin, (4 / 3) * b.flex.x.As)), 12);
    expect(b.flex.x.AsAdopt).toBeLessThan(a.flex.x.AsAdopt);
  });

  it('sapata isolada de concreto simples e de altura constante', () => {
    const inp = { Nk: 600, NkMin: 600, Mx: 0, My: 0, ap: 0.3, bp: 0.3 };
    const r = designFooting({ ...inp, simples: true, constH: true }, P());
    if (!isFooting(r)) throw new Error('sem solução');
    expect(r.simples).toBe(true);
    expect(r.h0).toBe(r.h);
    expect(r.flex.x.bars).toBeNull();
    const fctd = concrete(30, 1.4 * 1.2).fctd;
    // σt = 6·Md/(B·h²) ≤ fctd e h é o menor múltiplo de 5 cm que atende (ou o da rigidez)
    expect(r.flex.x.sigmaT!).toBeLessThanOrEqual(fctd + 1e-9);
    expect(r.ok, r.messages.join(' ')).toBe(true);
  });
});

describe('limites que aparam a sapata', () => {
  it('segmento que corta o polígono; recorte pelo lado da referência', () => {
    const rect: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    expect(segmentoCortaPoligono(rect, [0.5, -2], [0.5, 2])).toBe(true);
    expect(segmentoCortaPoligono(rect, [1.5, -2], [1.5, 2])).toBe(false);
    expect(segmentoCortaPoligono(rect, [1, -2], [1, 2])).toBe(false); // encostado
    const { poly, usados } = recorteLimites(rect, [{ a: [0.5, -2], b: [0.5, 2] }]);
    expect(usados).toEqual([0]);
    const xs = poly.map((q) => q[0]);
    expect(Math.max(...xs)).toBeCloseTo(0.5, 9);
    expect(Math.min(...xs)).toBeCloseTo(-1, 9);
  });

  it('limite a 0,5 m do centro (σadm 300): contorno aparado, pressão confere com a base retangular equivalente', () => {
    const lim = { a: [0.5, -5] as [number, number], b: [0.5, 5] as [number, number] };
    const c1 = [col('P1', 0)], cb = [combo('C1', { N: 900 })], p = P({ ftSigmaAdm: 300 });
    const livre = grupo(c1, cb, {}, p);
    // as dimensões sem o limite passam do limite; sem o limite, a base fica quadrada
    expect(livre.A / 2).toBeGreaterThan(0.5);
    const r = grupo(c1, cb, { constH: true, group: { cols: c1, combos: cb, limits: [lim] } }, p);
    expect(r.ok, r.messages.join(' ')).toBe(true);
    expect(r.grupo!.limitesUsados).toEqual([0]);
    expect(r.methodNotes.join(' ')).not.toMatch(/resíduo/);
    const xs = r.grupo!.contorno.map((q) => q[0]), ys = r.grupo!.contorno.map((q) => q[1]);
    expect(Math.max(...xs)).toBeCloseTo(0.5, 9);
    // a base cresce para o lado livre e em y para compensar a parte cortada
    expect(Math.min(...xs)).toBeLessThan(-livre.A / 2 + 1e-9);
    expect(r.A * r.B).toBeGreaterThan(livre.A * livre.B);
    // base retangular equivalente [x0, 0,5] × [y0, y1]: carga na origem excêntrica de −xc em relação ao centro
    const N = 900 + r.W;
    const largura = Math.max(...xs) - Math.min(...xs), altura = Math.max(...ys) - Math.min(...ys), xc = (Math.max(...xs) + Math.min(...xs)) / 2;
    const ref = basePressure(largura, altura, N, Math.abs(xc), 0)!;
    expect(r.cases[0].sigmaMax).toBeCloseTo(ref.sigmaMax, 3);
    expect(r.cases[0].compressed).toBeCloseTo(ref.compressed, 6);
    expect(ref.sigmaMax).toBeLessThanOrEqual(300 + 1e-6);
    // altura constante; volume = área do contorno × h
    expect(r.h0).toBe(r.h);
    expect(r.constH).toBe(true);
    expect(r.volume).toBeCloseTo(largura * altura * r.h, 6);
  });

  it('limite que corta o pilar é ignorado com aviso; o que isola pilar da associada também', () => {
    const cols = [col('P1', -1.5), col('P2', 1.5)];
    const cb = [combo('C1', { N: 600 }, { N: 600 })];
    const corta = grupo(cols, cb, { group: { cols, combos: cb, limits: [{ a: [-1.5, -5], b: [-1.5, 5] }] } });
    expect(corta.grupo!.limitesIgnorados).toEqual([{ indice: 0, motivo: 'corta o pilar P1' }]);
    expect(corta.grupo!.limitesUsados).toEqual([]);
    const isola = grupo(cols, cb, { group: { cols, combos: cb, limits: [{ a: [0.3, -5], b: [0.3, 5] }] } });
    expect(isola.grupo!.limitesIgnorados).toEqual([{ indice: 0, motivo: 'isola pilar da sapata' }]);
  });
});

describe('pressão sem tração em região poligonal', () => {
  it('retângulo: igual a basePressure; trapézio centrado: tensão uniforme sob N no centróide', () => {
    const rect: [number, number][] = [[-1, -0.5], [1, -0.5], [1, 0.5], [-1, 0.5]];
    const a = polyPressure(rect, 300, 0.4, 0)!, b = basePressure(2, 1, 300, 0.4, 0)!;
    expect(a.sigmaMax).toBeCloseTo(b.sigmaMax, 9);
    expect(a.compressed).toBeCloseTo(b.compressed, 9);
    // fora do núcleo, sinal do lado: carga a +x comprime o lado +x
    const c = polyPressure(rect, 300, 0.7, 0)!;
    const d = basePressure(2, 1, 300, 0.7, 0)!;
    expect(c.sigmaMax).toBeCloseTo(d.sigmaMax, 6);
    expect(c.v[1]).toBeGreaterThan(0);
    expect(polyPressure(rect, 300, -0.7, 0)!.v[1]).toBeLessThan(0);
    // resultante fora da base
    expect(polyPressure(rect, 300, 1.2, 0)).toBeNull();
    // trapézio: N no centróide dá pressão uniforme N/área
    const trap: [number, number][] = [[0, 0], [4, 0], [3, 2], [0, 2]];
    const area = (4 + 3) / 2 * 2;
    const cx = (() => { let a2 = 0, s = 0; for (let i = 0; i < 4; i++) { const [x0, y0] = trap[i], [x1, y1] = trap[(i + 1) % 4], k = x0 * y1 - x1 * y0; a2 += k; s += (x0 + x1) * k; } return s / (3 * a2); })();
    const cy = (() => { let a2 = 0, s = 0; for (let i = 0; i < 4; i++) { const [x0, y0] = trap[i], [x1, y1] = trap[(i + 1) % 4], k = x0 * y1 - x1 * y0; a2 += k; s += (y0 + y1) * k; } return s / (3 * a2); })();
    const t = polyPressure(trap, 140, cx, cy)!;
    expect(t.sigmaMax).toBeCloseTo(140 / area, 9);
    expect(t.sigmaMin).toBeCloseTo(140 / area, 9);
  });
});
