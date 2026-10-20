import { describe, expect, it } from 'vitest';
import { designCap } from './caps';
import { blockCoords, defaultFoundationParams } from './piles';
import { anchorageLength } from './rebar';
import { concrete } from './concrete';

const p = defaultFoundationParams();

describe('bloco com vários pilares (FU3)', () => {
  const D = 0.4, s = 1.2;
  const coords = blockCoords(4, s, false); // (±0,6; ±0,6)
  const col = (label: string, x: number, Nk: number) => ({ label, x, y: 0, ap: 0.3, bp: 0.3, Nk });
  const base = { n: 4, coords, D, s, Mx: 0, My: 0, ap: 0.3, bp: 0.3 };

  it('dois pilares de 800 kN sobre 4 estacas: cada pilar carrega duas estacas; tirante = F·arm/d (cálculo manual)', () => {
    const r = designCap({ ...base, Nk: 1600, cols: [col('P1', -0.6, 800), col('P2', 0.6, 800)] }, p);
    // reação de cálculo por estaca: 1,4·1600/4 = 560 kN; bielas de 560 kN do pilar às suas duas estacas
    expect(r.Rd).toBeCloseTo(560, 9);
    expect(r.multi!.struts).toHaveLength(4);
    for (const q of r.multi!.struts) expect(q.F).toBeCloseTo(560, 6);
    // ponto de partida: ap/4 do eixo do pilar → braço 0,6 − 0,075 = 0,525 m
    for (const q of r.multi!.struts) expect(q.arm).toBeCloseTo(0.525, 9);
    // d ≥ tan 45° · 0,525 = 0,525 < lb do pilar (φ16) = 0,5337 m → h = ceil05(0,5337 + 0,10) = 0,65 m
    const lb = anchorageLength(16, concrete(30, 1.4), 500 / 1.15);
    expect(r.h).toBeCloseTo(Math.ceil((lb + 0.1) / 0.05 - 1e-9) * 0.05, 9);
    const d = r.d;
    // tirante entre as estacas de cada pilar (direção y): T = F·arm/d; os da direção x ficam descarregados
    const T = (560 * 0.525) / d;
    const ty = r.ties.filter((t) => t.dir === 'y'), tx = r.ties.filter((t) => t.dir === 'x');
    expect(ty).toHaveLength(2);
    for (const t of ty) expect(t.T).toBeCloseTo(T, 6);
    for (const t of tx) expect(t.T).toBeCloseTo(0, 6);
    expect(r.multi!.residuo).toBeLessThan(1e-6);
    // biela junto a cada pilar: Nd,eq/(ap·bp·sen²θ) com Nd,eq = 1120 kN
    const th = Math.atan(d / 0.525);
    expect(r.multi!.cols[0].sigma).toBeCloseTo(1120 / 1000 / (0.09 * Math.sin(th) ** 2), 6);
    expect(r.ok).toBe(true);
    // um pilar só com a carga total exigiria mais do pilar (σ maior)
    const um = designCap({ ...base, Nk: 1600 }, p);
    expect(um.strutCol).toBeGreaterThan(r.strutCol);
  });

  it('pilares com cargas diferentes: as bielas conservam o total e a parcela de cada pilar; o bloco cobre os pilares', () => {
    const cols = [col('P1', -0.6, 1000), col('P2', 0.6, 400)];
    const r = designCap({ ...base, Nk: 1400, cols }, p);
    const soma = r.multi!.struts.reduce((a, q) => a + q.F, 0);
    expect(soma).toBeCloseTo(4 * r.Rd, 3);
    const f1 = r.multi!.struts.filter((q) => q.col === 0).reduce((a, q) => a + q.F, 0);
    expect(f1 / soma).toBeCloseTo(1000 / 1400, 6);
    expect(r.lx).toBeGreaterThanOrEqual(1.2 + 0.4 + 2 * 0.15 - 1e-9);
  });

  it('bloco imposto: só verificado (geometria e tirantes)', () => {
    const cols = [col('P1', -0.6, 800), col('P2', 0.6, 800)];
    const livre = designCap({ ...base, Nk: 1600, cols }, p);
    const t = livre.ties.find((q) => q.bars)!;
    const igual = designCap({ ...base, Nk: 1600, cols, fixed: { lx: livre.lx, ly: livre.ly, h: livre.h, bars: { phi: t.bars!.phi, n: t.bars!.n } } }, p);
    expect(igual.ok, igual.messages.join(' ')).toBe(true);
    expect(igual.fixed).toBe(true);
    const fraco = designCap({ ...base, Nk: 1600, cols, fixed: { lx: livre.lx, ly: livre.ly, h: livre.h, bars: { phi: 8, n: 2 } } }, p);
    expect(fraco.ok).toBe(false);
    expect(fraco.messages.join(' ')).toMatch(/Armadura imposta insuficiente/);
    const raso = designCap({ ...base, Nk: 1600, cols, fixed: { lx: livre.lx, ly: livre.ly, h: 0.4 } }, p);
    expect(raso.ok).toBe(false);
  });
});
