import { describe, expect, it } from 'vitest';
import { concrete } from '../concrete';
import { tauRd1, verificarPuncao, type Apoio, type EntradaPuncao, type ParametrosPuncao, type Regiao } from './puncao';
import type { P } from '../geom/faces';

const quad = (x0: number, y0: number, x1: number, y1: number): P[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const grande: Regiao = { poligonos: [quad(-20, -20, 20, 20)], furos: [] };
const pilar = (c1: number, c2: number): Apoio => ({ centro: [0, 0], c1, c2, circular: false, angulo: 0 });
const c30 = concrete(30, 1.4);

/**
 * Reverificação do contorno C″ na posição final (defeito de segurança achado na MD4): quando a varredura de cortante exige mais
 * anéis que a punção (nbTot > nb), o C″ a 2d da última linha caía onde o contorno é menor (cubetas da nervurada, aberturas da maciça)
 * e podia ficar acima de τRd1 com status 'armadura'. Agora acrescentam-se anéis até atender (no máximo 14) ou o status é 'fail'.
 */
describe('punção: C″ reverificado na posição final (NBR 6118, 19.5.3.4)', () => {
  const parC = (furoDist: number): ParametrosPuncao => ({ c: c30, rho: 0.01, fywd: 250, tipoArm: 'estribo', s0f: 0.5, srf: 0.75, passoCortante: 0.7, furoDist, bitolas: [5, 6.3, 8, 10] });
  /** τRd1 à mão: 0,13·(1 + √(20/d_cm))·(100·ρ·fck)^(1/3), ρ = 1 %, fck = 30. */
  const t1De = (dCm: number) => 0.13 * (1 + Math.sqrt(20 / dCm)) * Math.cbrt(100 * 0.01 * 30);
  /**
   * u à mão do contorno a `a` da face de um pilar quadrado de lado c, com duas faixas verticais simétricas (x ∈ ±[X0, X1]; X1 = ∞ é um
   * semiplano) sem concreto: u = 4c + 2πa − remoção. Cada canto (arco de raio a centrado na quina, x = c/2 + a·cosθ) perde
   * a·(acos k0 − acos k1), com k = (X − c/2)/a limitado a 1, e cada lado reto (x = c/2 + a dentro da faixa) perde c.
   */
  const uMao = (c: number, a: number, X0: number, X1: number) => {
    const ac = (X: number) => Math.acos(Math.min(1, (X - c / 2) / a)), x = c / 2 + a;
    return 4 * c + 2 * Math.PI * a - (4 * a * (ac(X0) - ac(X1)) + (x > X0 && x < X1 ? 2 * c : 0));
  };
  const aOf = (s0: number, sr: number, n: number, d: number) => s0 + (n - 1) * sr + 2 * d;

  it('τRd1 à mão (d = 20 cm e d = 10 cm, ρ = 1 %, fck 30)', () => {
    expect(t1De(20)).toBeCloseTo(0.80787, 4);
    expect(t1De(10)).toBeCloseTo(0.9752, 4);
    expect(tauRd1(c30, 0.2, 0.01)).toBeCloseTo(t1De(20), 9);
    expect(tauRd1(c30, 0.1, 0.01)).toBeCloseTo(t1De(10), 9);
  });

  it('nervurada (cubetas): nb = 3 pela punção e 4 pelo cortante; C″ com 4 anéis excede τRd1 e a verificação acrescenta anéis até 8', () => {
    // pilar 40×40, d = 20 cm, F = 1066 kN, qd = 50 kN/m²; cubetas = faixas x ∈ ±[1,10; 1,65] (m), sem concreto no contorno
    const d = 0.2, F = 1066, s0 = 0.1, sr = 0.15, t1 = t1De(20);
    const ent: EntradaPuncao = { ap: pilar(0.4, 0.4), reg: grande, d, h: 0.25, F, M: [0, 0], qd: 50, detalhar: true, excluir: [quad(1.1, -5, 1.65, 5), quad(-1.65, -5, -1.1, 5)] };
    const r = verificarPuncao(ent, parC(8));
    const D = r.det!;
    expect([D.nb, D.nbCort, D.nbMax]).toEqual([3, 4, 4]);
    // C″ com n = 3 (a = 0,80; contorno inteiro): u = 1,6 + 1,6π = 6,6265 m → τ = 1066/(6,6265·0,2)/1000 = 0,8044 ≤ τRd1 (nb = 3)
    expect(D.tentativas[2].n).toBe(3);
    expect(D.tentativas[2].tau).toBeCloseTo(F / ((1.6 + 1.6 * Math.PI) * d) / 1000, 3);
    expect(D.tentativas[2].tau).toBeLessThan(t1);
    // com 4 anéis (a = 0,95): u à mão 5,5307 m (lados retos e partes dos cantos dentro das faixas saem) → τ = 0,9637 > τRd1 = 0,8079 (o defeito)
    expect(D.verifC3[0].n).toBe(4);
    expect(D.verifC3[0].a).toBeCloseTo(aOf(s0, sr, 4, d), 9);
    expect(uMao(0.4, 0.95, 1.1, 1.65)).toBeCloseTo(5.5307, 3);
    expect(D.verifC3[0].u / uMao(0.4, 0.95, 1.1, 1.65)).toBeCloseTo(1, 2);
    expect(D.verifC3[0].tau / (F / (uMao(0.4, 0.95, 1.1, 1.65) * d) / 1000)).toBeCloseTo(1, 2);
    expect(D.verifC3[0].tau).toBeGreaterThan(t1);
    // 5, 6 e 7 anéis (a = 1,10; 1,25; 1,40) caem nas faixas e continuam acima de τRd1
    for (const k of [1, 2, 3]) { expect(D.verifC3[k].n).toBe(4 + k); expect(D.verifC3[k].tau).toBeGreaterThan(t1); }
    // com 8 anéis (a = 1,55): u à mão 7,6803 m → τ = 1066/(7,6803·0,2)/1000 = 0,6940 ≤ τRd1: adotado
    expect(D.verifC3).toHaveLength(5);
    expect(D.nbTot).toBe(8);
    const C3 = r.C3!;
    expect(C3.a).toBeCloseTo(aOf(s0, sr, 8, d), 9);
    expect(C3.a).toBeCloseTo(1.55, 9);
    expect(uMao(0.4, 1.55, 1.1, 1.65)).toBeCloseTo(7.6803, 3);
    expect(C3.u / uMao(0.4, 1.55, 1.1, 1.65)).toBeCloseTo(1, 2);
    expect(C3.tau).toBeCloseTo(F / (uMao(0.4, 1.55, 1.1, 1.65) * d) / 1000, 2);
    expect(C3.tau).toBeLessThanOrEqual(t1 + 1e-9);
    expect(r.status).toBe('armadura');
    expect(r.armadura!.barras).toBe(8);
    expect(r.armadura!.posicoes[0]).toHaveLength(8);
    expect(r.mensagens.join(' ')).toMatch(/excedia τRd1 com 4 linhas; acrescentadas 4 \(8 linhas/);
    expect(D.desfecho).toBe('armadura');
  });

  it('laje maciça com aberturas (furos): mesma situação em escala 1:2 (pilar 20×20, d = 10 cm, F = 280 kN, qd = 100 kN/m²)', () => {
    // furos x ∈ ±[0,55; 0,825] m; distância dos furos ao pilar ≥ 2d (furoDist = 2), sem descontar tangentes
    const d = 0.1, F = 280, s0 = 0.05, sr = 0.075, t1 = t1De(10);
    const reg: Regiao = { poligonos: [quad(-20, -20, 20, 20)], furos: [quad(0.55, -5, 0.825, 5), quad(-0.825, -5, -0.55, 5)] };
    const ent: EntradaPuncao = { ap: pilar(0.2, 0.2), reg, d, h: 0.15, F, M: [0, 0], qd: 100, detalhar: true };
    const r = verificarPuncao(ent, parC(2));
    const D = r.det!;
    expect([D.nb, D.nbCort, D.nbMax]).toEqual([3, 4, 4]);
    // n = 3 (a = 0,40; inteiro): u = 0,8 + 0,8π = 3,3131 m → τ = 280/(3,3131·0,1)/1000 = 0,8451 ≤ τRd1 = 0,9752
    expect(D.tentativas[2].tau).toBeCloseTo(F / ((0.8 + 0.8 * Math.PI) * d) / 1000, 3);
    // n = 4 (a = 0,475): u à mão 2,7653 m → τ = 1,0126 > 0,9752
    expect(uMao(0.2, 0.475, 0.55, 0.825)).toBeCloseTo(2.7653, 3);
    expect(D.verifC3[0].u / uMao(0.2, 0.475, 0.55, 0.825)).toBeCloseTo(1, 2);
    expect(D.verifC3[0].tau).toBeGreaterThan(t1);
    expect(D.verifC3[0].tau / (F / (uMao(0.2, 0.475, 0.55, 0.825) * d) / 1000)).toBeCloseTo(1, 2);
    // 8 anéis (a = 0,775): u à mão 3,8405 m → τ = 0,7291 ≤ τRd1
    expect(D.nbTot).toBe(8);
    expect(r.C3!.a).toBeCloseTo(aOf(s0, sr, 8, d), 9);
    expect(r.C3!.a).toBeCloseTo(0.775, 9);
    expect(r.C3!.u / uMao(0.2, 0.775, 0.55, 0.825)).toBeCloseTo(1, 2);
    expect(r.C3!.tau).toBeCloseTo(F / (uMao(0.2, 0.775, 0.55, 0.825) * d) / 1000, 2);
    expect(r.C3!.tau).toBeLessThanOrEqual(t1 + 1e-9);
    expect(r.status).toBe('armadura');
    expect(r.armadura!.barras).toBe(8);
  });

  it('sem solução: C″ não atende nem com 14 anéis (semiplanos sem concreto): status fail e mensagem explícita', () => {
    // mesmas entradas da nervurada com x ≥ 1,10 e x ≤ −1,10 sem concreto: u de C″ só diminui; com 14 anéis (a = 2,45) u à mão 4,4863 m
    const d = 0.2, F = 1066, t1 = t1De(20);
    const ent: EntradaPuncao = { ap: pilar(0.4, 0.4), reg: grande, d, h: 0.25, F, M: [0, 0], qd: 50, detalhar: true, excluir: [quad(1.1, -50, 40, 50), quad(-40, -50, -1.1, 50)] };
    const r = verificarPuncao(ent, parC(8));
    expect(r.status).toBe('fail');
    expect(r.armadura).toBeUndefined();
    expect(r.det!.desfecho).toBe('semSolucaoC3');
    expect(r.det!.nbTot).toBe(14);
    expect(r.det!.verifC3.length).toBe(14 - r.det!.nbMax + 1);
    expect(r.det!.verifC3.every((t) => t.tau > t1)).toBe(true);
    expect(uMao(0.4, 2.45, 1.1, Infinity)).toBeCloseTo(4.4863, 3);
    expect(r.C3!.a).toBeCloseTo(aOf(0.1, 0.15, 14, d), 9);
    expect(r.C3!.tau / (F / (uMao(0.4, 2.45, 1.1, Infinity) * d) / 1000)).toBeCloseTo(1, 2);
    expect(r.mensagens.join(' ')).toMatch(/contorno C″ a 2d da última linha de armadura não atende a τRd1 \(1,\d\d > 0,81 MPa\) com até 14 linhas/);
  });

  it('sem cubetas nem aberturas nada muda: anéis da punção e C″ dentro de τRd1 (F = 1200 kN, d = 20 cm)', () => {
    const ent: EntradaPuncao = { ap: pilar(0.4, 0.4), reg: grande, d: 0.2, h: 0.25, F: 1200, M: [0, 0], qd: 0, detalhar: true };
    const r = verificarPuncao(ent, parC(8));
    expect(r.det!.nbTot).toBe(r.det!.nbMax);
    expect(r.armadura!.barras).toBe(r.det!.nbMax);
    expect(r.C3!.tau).toBeLessThanOrEqual(t1De(20) + 1e-9);
    expect(r.mensagens.join(' ')).not.toMatch(/excedia τRd1/);
  });

  it('desfecho bielaCortante: superfície de cortante com v > VRd2 (contorno cortado por cubetas) reprova', () => {
    // F = 1500 kN, d = 20 cm: τSd(C) = 1500/(1,6·0,2)/1000 = 4,69 ≤ τRd2 = 0,27·(1 − 30/250)·21,43 = 5,09 MPa
    // VRd2 = 0,27·0,88·21,43·1000·0,2 = 1018,3 kN/m; cubetas deixam só |y| ≤ 0,30 m: u(0,4) = 0,8 + 4·0,4·asin(0,25) ≈ 1,2 m → v = 1500/1,2 = 1250 > VRd2
    const ent: EntradaPuncao = { ap: pilar(0.4, 0.4), reg: grande, d: 0.2, h: 0.25, F: 1500, M: [0, 0], qd: 0, detalhar: true, excluir: [quad(-5, 0.3, 5, 5), quad(-5, -5, 5, -0.3)] };
    const r = verificarPuncao(ent, parC(8));
    expect(r.C.tau).toBeCloseTo(1500 / (1.6 * 0.2) / 1000, 3);
    expect(r.C.tau).toBeLessThan(r.tauRd2);
    expect(r.det!.vRd2).toBeCloseTo(0.27 * (1 - 30 / 250) * (30 / 1.4) * 1000 * 0.2, 3);
    expect(r.status).toBe('fail');
    expect(r.det!.desfecho).toBe('bielaCortante');
    expect(r.mensagens[0]).toMatch(/VRd2/);
  });

  it('desfecho semBitola: armadura exigida não cabe no perímetro do primeiro anel com a bitola permitida (φ5 apenas)', () => {
    // F = 1500 kN, d = 20 cm, sem varredura: τSd(C′) = 1500/(4,1133·0,2)/1000 = 1,8233 MPa; τRd3,c = 0,10(1 + 1)·3,1072 = 0,6214
    // Asw por anel = (1,8233 − 0,6214)·4,1133·0,15·1e4/(1,5·250) = 19,77 cm²; φ5 (0,1963 cm², 2 pernas) → 51 barras > 44 (u(s0)/0,05)
    const d = 0.2, u2 = 1.6 + 0.8 * Math.PI;
    const ent: EntradaPuncao = { ap: pilar(0.4, 0.4), reg: grande, d, h: 0.25, F: 1500, M: [0, 0], qd: 0, detalhar: true };
    const r = verificarPuncao(ent, { ...parC(8), passoCortante: 0, bitolas: [5] });
    const asw = ((1500 / (u2 * d) / 1000 - 0.62145) * u2 * 0.15 * 1e4) / (1.5 * 250);
    expect(asw).toBeCloseTo(19.77, 1);
    expect(r.det!.AswAuto).toBeCloseTo(asw, 2);
    const nBar = Math.ceil(asw / (2 * Math.PI * 0.0025 ** 2 * 1e4) - 1e-9);
    expect(nBar).toBe(51);
    expect(Math.floor((1.6 + 2 * Math.PI * 0.1) / 0.05)).toBe(44);
    expect(r.status).toBe('fail');
    expect(r.det!.desfecho).toBe('semBitola');
    expect(r.armadura).toBeUndefined();
    expect(r.mensagens.join(' ')).toMatch(/não cabe nas linhas radiais/);
  });

  it('desfecho semSolucaoCortante: cortante exige mais de 14 linhas', () => {
    // d = 15 cm, ρ = 0,4 %, F = 1200 kN (τSd(C) = 5,0 < τRd2 = 5,09 MPa; punção pede 14 linhas)
    // VRd1 = 0,25·fctd·k·(1,2 + 40ρ)·d = 0,25·1448,2·(1,6 − 0,15)·1,36·0,15 = 107,1 kN/m; v = F/u > VRd1 até a ≈ 1,51 m
    // s0 = 7,5 cm, sr = 11 cm: nbC = ⌈(1,51 − 0,075)/0,11⌉ + 1 = 15 > 14
    const d = 0.15, ent: EntradaPuncao = { ap: pilar(0.4, 0.4), reg: grande, d, h: 0.2, F: 1200, M: [0, 0], qd: 0, detalhar: true };
    const r = verificarPuncao(ent, { ...parC(8), rho: 0.004, passoCortante: 0.3 });
    expect(r.det!.vR1).toBeCloseTo(0.25 * 1448.2 * 1.45 * 1.36 * 0.15, 0);
    expect(r.det!.desfecho).toBe('semSolucaoCortante');
    expect(r.status).toBe('fail');
    expect([r.det!.nb, r.det!.nbCort]).toEqual([14, 15]);
    expect(r.mensagens.join(' ')).toMatch(/mais de 14 linhas/);
  });
});
