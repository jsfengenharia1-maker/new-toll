// Validação externa da sapata associada (FU8d): placa de concreto sobre molas de Winkler no OpenSees (ShellMITC4 + zeroLength;
// `validation/opensees/sapata_associada.py` gera o JSON, commitado; o script fica fora do npm test). O Statikos supõe base
// rígida (pressão plana sem tração) e o diagrama de momentos da faixa pela pressão do solo menos as cargas dos pilares; a
// placa real (h = 1,5 m, k = 30 000 kN/m³, E = Ecs de C30) redistribui a pressão. Erros relativos: ver `ERROS` abaixo.
import { describe, expect, it } from 'vitest';
import { designFootingGroup } from './footingsGroup';
import { isFooting, type FootingResult } from './footings';
import { defaultFoundationParams, type FCol, type FCombo } from './piles';
import ref from '../../validation/opensees/sapata_associada.json';

const P = () => ({ ...defaultFoundationParams(), ftSigmaMode: 'informada' as const, ftSigmaAdm: 400, ftLevantamento: true });
const col = (label: string, x: number): FCol => ({ label, x, y: 0, ap: 0.3, bp: 0.3 });
const combo = (...N: number[]): FCombo => ({ label: 'C1', cols: N.map((n) => ({ N: n, Mx: 0, My: 0, Hx: 0, Hy: 0 })) });

type Caso = (typeof ref.casos)[keyof typeof ref.casos];
/** Sapata do Statikos com a mesma base e altura impostas do modelo de placa; cargas características = de cálculo / γf. */
function statikos(c: Caso): FootingResult {
  const gf = defaultFoundationParams().gammaF;
  const cols = c.pilares.map((q, i) => col(`P${i + 1}`, q.x));
  const Ns = c.pilares.map((q) => q.N / gf);
  const Nk = Ns.reduce((a, v) => a + v, 0);
  const r = designFootingGroup({ Nk, NkMin: Nk, Mx: 0, My: 0, ap: 0.3, bp: 0.3, group: { cols, combos: [combo(...Ns)] }, fixed: { A: c.A, B: c.B, h: c.h } }, P());
  if (!isFooting(r)) throw new Error(r.messages.join(' '));
  return r;
}

const rel = (a: number, b: number) => (a - b) / Math.abs(b);
/** Pressões e momentos do Statikos × OpenSees por caso (erro relativo = (Statikos − OpenSees)/OpenSees). */
export function comparar(nome: keyof typeof ref.casos) {
  const c = ref.casos[nome], r = statikos(c);
  const Mpos = Math.max(c.M_pos_esq, c.M_pos_dir);
  return {
    sigmaMax: { s: r.sigmaD.max, o: c.sigma_max, e: rel(r.sigmaD.max, c.sigma_max) },
    sigmaMin: { s: r.sigmaD.min, o: c.sigma_min, e: rel(r.sigmaD.min, c.sigma_min) },
    Mpos: { s: r.flex.x.Md, o: Mpos, e: rel(r.flex.x.Md, Mpos) },
    Mneg: { s: r.flex.x.top?.Md ?? 0, o: c.M_neg, e: r.flex.x.top ? rel(r.flex.x.top.Md, c.M_neg) : NaN },
  };
}

/*
 * Erros relativos (Statikos − OpenSees)/OpenSees, OpenSeesPy 3.8.0 (malha 0,15 m), registrados em 21/10/2026:
 *   iguais     σmáx −0,44 %  σmín +0,37 %  M+ −1,43 %  M− −0,41 %
 *   diferentes σmáx −0,62 %  σmín +0,27 %  M+ −0,20 %  M− −0,39 %
 *   excêntrico σmáx −0,16 %  σmín −1,45 %  M+ −1,34 %  M− −0,41 %
 */
describe('sapata associada × OpenSees (placa sobre molas de Winkler)', () => {
  it('pilares iguais (resultante no centro): pressão quase uniforme e momentos por faixa', () => {
    const e = comparar('iguais');
    expect(Math.abs(e.sigmaMax.e)).toBeLessThan(0.01);
    expect(Math.abs(e.sigmaMin.e)).toBeLessThan(0.01);
    expect(Math.abs(e.Mpos.e)).toBeLessThan(0.02);
    expect(Math.abs(e.Mneg.e)).toBeLessThan(0.01);
    // o diagrama manual do teste de footingsGroup.test.ts (qB·(A/2)²/2 − Nd1·1,5 = −315 kN·m) é o do Statikos
    expect(e.Mneg.s).toBeCloseTo(-315, 6);
  });

  it('pilares diferentes com a resultante no centro (cortante nulo fora do meio do vão)', () => {
    const e = comparar('diferentes');
    for (const x of [e.sigmaMax, e.sigmaMin, e.Mpos, e.Mneg]) expect(Math.abs(x.e)).toBeLessThan(0.015);
    // solo cinco vezes mais mole: a placa já era quase rígida (o resultado do modelo de placa quase não muda)
    expect(Math.abs(ref.casos.diferentes_mole.M_neg / ref.casos.diferentes.M_neg - 1)).toBeLessThan(0.01);
    expect(Math.abs(ref.casos.diferentes_mole.M_pos_esq / ref.casos.diferentes.M_pos_esq - 1)).toBeLessThan(0.01);
  });

  it('resultante excêntrica (pressão trapezoidal): tensões e momentos', () => {
    const e = comparar('excentrico');
    for (const x of [e.sigmaMax, e.sigmaMin, e.Mpos, e.Mneg]) expect(Math.abs(x.e)).toBeLessThan(0.02);
    // posição da resultante: e = (−1,5·1120 + 1,5·560)/1680 = −0,5 m → σmáx/σmín = (1 + 6e/A)/(1 − 6e/A) com e/A = 0,5/4,5
    const k = 6 * (0.5 / 4.5);
    expect(e.sigmaMax.s / e.sigmaMin.s).toBeCloseTo((1 + k) / (1 - k), 6);
  });
});
