import { describe, expect, it } from 'vitest';
import { designCap, strutTops } from './caps';
import { blockCoords, defaultFoundationParams } from './piles';
import { anchorageLength } from './rebar';
import { concrete } from './concrete';

const p = defaultFoundationParams();
const cap = (n: number, Nk: number, D = 0.4, sf = 3, ap = 0.3, bp = 0.3, My = 0) => {
  const s = sf * D;
  return designCap({ n, coords: blockCoords(n, s, false), D, s, Nk, Mx: 0, My, ap, bp }, p);
};

describe('blocos de coroamento — bielas e tirantes', () => {
  it('ponto de partida das bielas: ap/4 (2 estacas) e (ap/4, bp/4) (4 estacas)', () => {
    const t2 = strutTops(blockCoords(2, 1.2, false), 0.3, 0.5);
    expect(t2[1]![0]).toBeCloseTo(0.075, 9);
    expect(t2[1]![1]).toBeCloseTo(0, 9);
    const t4 = strutTops(blockCoords(4, 1.2, false), 0.4, 0.4);
    expect(t4[2]![0]).toBeCloseTo(0.1, 9);
    expect(t4[2]![1]).toBeCloseTo(0.1, 9);
  });

  it('2 estacas, carga centrada: T = R·(e/2 − ap/4)/d e biela junto ao pilar Nd/(Ap·sen²θ)', () => {
    const r = cap(2, 500);
    const R = 1.4 * 500 / 2;
    expect(r.ties.length).toBe(1);
    expect(r.ties[0].T).toBeCloseTo((R * (1.2 / 2 - 0.3 / 4)) / r.d, 6);
    const th = Math.atan(r.d / (0.6 - 0.075));
    expect(r.thetaMin).toBeCloseTo((th * 180) / Math.PI, 6);
    expect(r.strutCol).toBeCloseTo((1.4 * 500) / 1000 / (0.09 * Math.sin(th) ** 2), 6);
    expect(r.strutPile).toBeCloseTo(R / 1000 / ((Math.PI * 0.16) / 4) / Math.sin(th) ** 2, 6);
    // altura: d entre os limites de 45° e 55°, ou governada pela ancoragem do pilar
    const lb = anchorageLength(16, concrete(30, 1.4), 500 / 1.15);
    expect(r.d).toBeGreaterThanOrEqual(Math.max(0.525, lb) - 1e-9);
    expect(r.h * 100 % 5).toBeCloseTo(0, 6);
    expect(r.ties[0].As).toBeCloseTo(r.ties[0].T / 1000 / (500 / 1.15), 12);
    expect(r.top && r.skin && r.stirrups).toBeTruthy();
    expect(r.ok).toBe(true);
  });

  it('4 estacas: tirante lateral = Nd·(2e − ap)/(16d) (Blévot)', () => {
    const r = cap(4, 2000, 0.4, 3, 0.4, 0.4);
    const Nd = 1.4 * 2000, e = 1.2;
    expect(r.ties.length).toBe(4);
    for (const t of r.ties) expect(t.T).toBeCloseTo((Nd * (2 * e - 0.4)) / (16 * r.d), 6);
    expect(r.mesh!.x.As).toBeCloseTo(0.2 * 2 * r.ties[0].As, 12);
  });

  it('3 estacas: tirante lateral próximo de Nd·(e − 0,52·ap)/(9d) (Blévot)', () => {
    const r = cap(3, 1500, 0.4, 3, 0.4, 0.4);
    const Nd = 1.4 * 1500, e = 1.2;
    const blevot = (Nd * (e - 0.52 * 0.4)) / (9 * r.d);
    for (const t of r.ties) expect(Math.abs(t.T / blevot - 1)).toBeLessThan(0.02);
  });

  it('momento: estaca mais carregada governa (Nd,eq = n·Rd)', () => {
    const r = cap(2, 500, 0.4, 3, 0.3, 0.3, 60);
    const Rd = 1.4 * (250 + 60 / 1.2);
    expect(r.Rd).toBeCloseTo(Rd, 9);
    expect(r.ties[0].T).toBeCloseTo((Rd * (0.6 - 0.075)) / r.d, 6);
  });

  it('5 e 6 estacas: estaca central sem tirante e tirante transversal no bloco de 6', () => {
    const r5 = cap(5, 2500, 0.4, 3, 0.5, 0.5);
    expect(r5.theta[0]).toBe(90);
    expect(r5.ties.length).toBe(4);
    const r6 = cap(6, 3000, 0.4, 3, 0.5, 0.5);
    expect(r6.ties.length).toBe(7);
    expect(r6.ties.every((t) => t.T >= 0)).toBe(true);
    expect(r6.ties.find((t) => t.a === 1 && t.b === 4)!.T).toBeGreaterThan(0);
  });

  it('1 estaca: tração de fendilhamento 0,25·Nd·(a − ap)/a e suspensão só com s > 3D', () => {
    const r = cap(1, 400, 0.5, 3, 0.3, 0.3);
    const a = r.single!.a;
    expect(r.single!.Rst[0]).toBeCloseTo(0.25 * 560 * (a - 0.3) / a, 9);
    expect(r.susp.need).toBe(false);
    const r2 = designCap({ n: 2, coords: blockCoords(2, 1.6, false), D: 0.4, s: 1.6, Nk: 500, Mx: 0, My: 0, ap: 0.3, bp: 0.3 }, p);
    expect(r2.susp.need).toBe(true);
    expect(r2.susp.AsTot).toBeCloseTo(0.7 / (1.5 * 2 * 500 / 1.15), 12);
  });
});
