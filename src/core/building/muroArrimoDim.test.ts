// E1d: armadura do fuste e da base do muro de arrimo contra cálculo manual (Rankine, φ 30°, γ 18, sobrecarga 10 kN/m²).
import { describe, expect, it } from 'vitest';
import { beamFlexure, concrete } from '../concrete';
import { estabilidadeMuro, type MuroArrimo } from './muroArrimo';
import { dimensionarMuroArrimo, MAT_MURO_PADRAO, pressaoBase } from './muroArrimoDim';

const muro: MuroArrimo = { H: 3, tTopo: 0.2, tBase: 0.3, B: 2, ponta: 0.5, hBase: 0.4, solo: { gama: 18, phi: 30, metodo: 'rankine' }, sobrecarga: 10 };
const K = 1 / 3, c = concrete(30, 1.4), fyd = 500 / 1.15;

describe('muro de arrimo: fuste', () => {
  const r = dimensionarMuroArrimo(muro);
  it('momento e cortante de cálculo na base do fuste (1,4 × K·γ·H³/6 + K·q·H²/2)', () => {
    const e = r.fuste.estacoes.at(-1)!;
    expect(e.y).toBeCloseTo(3, 9);
    expect(e.Md).toBeCloseTo(1.4 * ((K * 18 * 27) / 6 + (K * 10 * 9) / 2), 6);
    expect(e.Vd).toBeCloseTo(1.4 * ((K * 18 * 9) / 2 + K * 10 * 3), 6);
    expect(r.fuste.estacoes[4].Md).toBeCloseTo(1.4 * ((K * 18 * 1.5 ** 3) / 6 + (K * 10 * 1.5 ** 2) / 2), 6);
  });
  it('área necessária = flexão da seção retangular de 1 m e malha escolhida cobre o máximo entre ela e o mínimo', () => {
    const e = r.fuste.estacoes.at(-1)!, d = 0.3 - 0.04 - 0.008;
    const ref = beamFlexure({ kind: 'rect', bw: 1, h: 0.3 }, false, e.Md, d, 0.048, c, fyd).As * 1e4;
    expect(e.AsNec).toBeCloseTo(ref, 9);
    expect(e.AsNec).toBeGreaterThan(5);
    expect(e.AsNec).toBeLessThan(6.3);
    expect(r.fuste.principal.As).toBeGreaterThanOrEqual(Math.max(e.AsNec, e.AsMin));
    expect(e.AsMin).toBeGreaterThanOrEqual(0.0015 * 0.3 * 1e4 - 1e-9);
  });
  it('necessidade cresce com a profundidade e há corte das barras acima da base', () => {
    const ns = r.fuste.estacoes.map((x) => x.AsNec);
    for (let i = 1; i < ns.length; i++) expect(ns[i]).toBeGreaterThanOrEqual(ns[i - 1]);
    expect(r.fuste.alturaCorte === null || (r.fuste.alturaCorte > 0 && r.fuste.alturaCorte < muro.H)).toBe(true);
  });
  it('cortante do fuste dentro de VRd1 (sem estribos)', () => {
    expect(r.fuste.cortanteOk).toBe(true);
    expect(r.fuste.VRd1).toBeGreaterThan(r.fuste.estacoes.at(-1)!.Vd);
  });
});

describe('muro de arrimo: base', () => {
  const est = estabilidadeMuro(muro), r = dimensionarMuroArrimo(muro);
  it('a pressão sob a base integra a força vertical (peso + sobrecarga sobre o talão)', () => {
    const s = pressaoBase(muro, est);
    let I = 0; const n = 2000;
    for (let i = 0; i < n; i++) I += s(((i + 0.5) * muro.B) / n) * (muro.B / n);
    const talao = muro.B - muro.ponta - muro.tBase;
    expect(I).toBeCloseTo(est.V + 10 * talao, 3);
  });
  it('ponta: momento na face do fuste = γf·[(a − γc·h)·p²/2 + b·p³/6]', () => {
    const s = pressaoBase(muro, est), a = s(0), b = (s(muro.B) - s(0)) / muro.B, p = muro.ponta, gc = 25 * muro.hBase;
    expect(r.base.ponta.Md).toBeCloseTo(1.4 * ((a - gc) * p * p / 2 + (b * p ** 3) / 6), 4);
    expect(r.base.ponta.face).toBe('inferior');
  });
  it('talão: momento = γf·∫(peso do solo + base + sobrecarga − σ)·(x − xf)dx, tração em cima', () => {
    const s = pressaoBase(muro, est), xf = muro.ponta + muro.tBase, w = 18 * 3 + 10 + 25 * 0.4;
    let M = 0; const n = 4000, L = muro.B - xf;
    for (let i = 0; i < n; i++) { const x = xf + ((i + 0.5) * L) / n; M += (w - s(x)) * (x - xf) * (L / n); }
    expect(r.base.talao.Md).toBeCloseTo(Math.abs(1.4 * M), 3);
    expect(r.base.talao.face).toBe('superior');
  });
  it('quantitativo por metro: soma das barras × peso linear, concreto = fuste trapezoidal + base', () => {
    expect(r.peso).toBeGreaterThan(40);
    expect(r.concreto).toBeCloseTo(0.25 * 3 + 2 * 0.4, 9);
    expect(r.barras.every((b) => b.nPorM > 0 && b.comprimento > 0)).toBe(true);
  });
  it('estabilidade que não atende (deslizamento com μ = tg(2φ/3)) reprova o muro e a mensagem vai junto', () => {
    expect(est.FSd).toBeLessThan(1.5);
    expect(r.status).toBe('fail');
    expect(r.mensagens.some((m) => /^Estabilidade: Deslizamento/.test(m))).toBe(true);
    const bom = dimensionarMuroArrimo({ ...muro, B: 2.6, atrito: 0.6 });
    expect(bom.status).toBe('ok');
  });
  it('base fina reprova no cortante e avisa', () => {
    const f = dimensionarMuroArrimo({ ...muro, hBase: 0.15, H: 5 }, MAT_MURO_PADRAO);
    expect(f.status).toBe('fail');
    expect(f.mensagens.some((m) => /cortante/.test(m))).toBe(true);
  });
});
