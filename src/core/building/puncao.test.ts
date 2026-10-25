import { describe, expect, it } from 'vitest';
import { concrete } from '../concrete';
import {
  coefK, curvaAfastada, descontarFuros, fatoresK, ladosLivres, propriedadesContorno, recortar, tauRd1, tauRd2, tauRd3c, tensaoNoContorno, tipoApoio, verificarPuncao,
  type Apoio, type EntradaPuncao, type ParametrosPuncao, type Regiao,
} from './puncao';
import { cortanteLaje, vcLaje } from './puncao';
import { vrd1 } from './vigotas';
import type { P } from '../geom/faces';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { ANTES_DESAPRUMO } from './antesDesaprumo';
import { dimensionarEdificio } from './dimensionamento';
import { envoltoriaLajes, fatoresPuncao, sitiosPuncao } from './puncao';
import { revisarEdificio } from './revisao';
import { edificioExemplo } from '../sheets/exemplo';
import { montarPranchasLajes } from '../sheets/armacaoLajes';

const quad = (x0: number, y0: number, x1: number, y1: number): P[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const grande: Regiao = { poligonos: [quad(-20, -20, 20, 20)], furos: [] };
const pilar = (c1: number, c2: number, centro: P = [0, 0]): Apoio => ({ centro, c1, c2, circular: false, angulo: 0 });
const c30 = concrete(30, 1.4);

describe('punção: geometria dos contornos críticos (cálculo manual)', () => {
  it('pilar interno 40×40, d = 20 cm: u e Wp de C′ pelas fórmulas da NBR 6118', () => {
    const ap = pilar(0.4, 0.4), d = 0.2;
    const pr = propriedadesContorno(recortar(curvaAfastada(ap, 2 * d), grande), 0);
    // u = 2(C1 + C2) + 2π·2d = 1,6 + 0,8π = 4,11327 m
    expect(pr.u).toBeCloseTo(1.6 + 0.8 * Math.PI, 2);
    // Wp = C1²/2 + C1·C2 + 4·C2·d + 16·d² + 2π·d·C1 = 0,08 + 0,16 + 0,32 + 0,64 + 0,50265 = 1,70265 m²
    const Wp = 0.08 + 0.16 + 0.32 + 0.64 + 2 * Math.PI * d * 0.4;
    expect(pr.Wp[0] / Wp).toBeCloseTo(1, 3);
    expect(pr.Wp[1] / Wp).toBeCloseTo(1, 3);
    expect(Math.hypot(pr.centroide[0], pr.centroide[1])).toBeLessThan(1e-9);
  });

  it('contorno C do pilar interno: u = 4·0,40 = 1,6 m e Wp = C1²/2 + C1·C2 = 0,24 m²', () => {
    const pr = propriedadesContorno(recortar(curvaAfastada(pilar(0.4, 0.4), 0), grande), 0);
    expect(pr.u).toBeCloseTo(1.6, 9);
    expect(pr.Wp[0]).toBeCloseTo(0.08 + 0.16, 9);
  });

  it('pilar retangular 20×60: Wp na direção do lado maior (C1 = 60 cm)', () => {
    const d = 0.18, ap = pilar(0.6, 0.2);
    const pr = propriedadesContorno(recortar(curvaAfastada(ap, 2 * d), grande), 0);
    const C1 = 0.6, C2 = 0.2, Wp1 = (C1 * C1) / 2 + C1 * C2 + 4 * C2 * d + 16 * d * d + 2 * Math.PI * d * C1;
    expect(pr.Wp[0] / Wp1).toBeCloseTo(1, 3);
    const Wp2 = (C2 * C2) / 2 + C1 * C2 + 4 * C1 * d + 16 * d * d + 2 * Math.PI * d * C2; // direção do lado menor
    expect(pr.Wp[1] / Wp2).toBeCloseTo(1, 3);
  });

  it('pilar circular D = 40 cm: u = π(D + 4d), Wp = (D + 4d)² (NBR 6118, 19.5.2.2)', () => {
    const d = 0.2, ap: Apoio = { centro: [0, 0], c1: 0.4, c2: 0.4, circular: true, angulo: 0 };
    const pr = propriedadesContorno(recortar(curvaAfastada(ap, 2 * d), grande), 0);
    expect(pr.u / (Math.PI * (0.4 + 4 * d))).toBeCloseTo(1, 3);
    expect(pr.Wp[0] / (0.4 + 4 * d) ** 2).toBeCloseTo(1, 3);
  });

  it('pilar de borda 40×40 (borda livre na face externa): u* = 2C1 + C2 + 2π·d·2/2, centroide e Wp por integração à mão', () => {
    // laje x ≥ 0 (borda em x = 0); pilar ocupa x ∈ [0, 0,4]; centro em (0,2; 0)
    const reg: Regiao = { poligonos: [quad(0, -20, 20, 20)], furos: [] };
    const d = 0.2, ap = pilar(0.4, 0.4, [0.2, 0]);
    expect(ladosLivres(ap, reg, d)).toEqual(['u-']);
    const pr = propriedadesContorno(recortar(curvaAfastada(ap, 2 * d), reg), 0);
    // u = 2·C1 + C2 + 2π·d = 0,8 + 0,4 + 1,25664 = 2,45664 m
    expect(pr.u / (2 * 0.4 + 0.4 + 2 * Math.PI * d)).toBeCloseTo(1, 3);
    // centroide a x̄ = 0,53032 da borda (e* = 0,33032 m do centro do pilar)
    expect(pr.centroide[0]).toBeCloseTo(0.5303, 2);
    expect(pr.centroide[0] - 0.2).toBeCloseTo(0.3303, 2);
    // Wp na direção perpendicular à borda (∫|x − x̄| dℓ) = 0,26424 + 0,19054 + 0,10788 = 0,56266 m²
    expect(pr.Wp[0] / 0.56266).toBeCloseTo(1, 2);
    // Wp na direção paralela à borda: C2²/4 + C1·C2 + 4·C1·d + 8d² + π·d·C2 (NBR 6118, 19.5.2.3)
    expect(pr.Wp[1] / (0.04 + 0.16 + 0.32 + 0.32 + Math.PI * d * 0.4)).toBeCloseTo(1, 3);
  });

  it('pilar de canto 40×40: u* = C1 + C2 + π·d e centroide a 0,568 m das bordas', () => {
    const reg: Regiao = { poligonos: [quad(0, 0, 20, 20)], furos: [] };
    const d = 0.2, ap = pilar(0.4, 0.4, [0.2, 0.2]);
    expect(ladosLivres(ap, reg, d).sort()).toEqual(['u-', 'v-']);
    expect(tipoApoio(ladosLivres(ap, reg, d))).toBe('canto');
    const pr = propriedadesContorno(recortar(curvaAfastada(ap, 2 * d), reg), 0);
    expect(pr.u / (0.4 + 0.4 + Math.PI * d)).toBeCloseTo(1, 3);
    expect(pr.centroide[0]).toBeCloseTo(0.568, 2);
    expect(pr.centroide[1]).toBeCloseTo(0.568, 2);
  });

  it('furo a menos de 8d: desconta o trecho entre as tangentes pelo centro do pilar', () => {
    const d = 0.2, ap = pilar(0.4, 0.4);
    const furo = quad(0.8, -0.1, 1.0, 0.1); // a 0,6 m da face (< 8d = 1,6 m)
    const reg: Regiao = { poligonos: grande.poligonos, furos: [furo] };
    const sem = recortar(curvaAfastada(ap, 2 * d), grande).reduce((s, p) => s + Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]), 0);
    const com = descontarFuros(recortar(curvaAfastada(ap, 2 * d), reg), ap, reg.furos, 8 * d);
    const u = com.reduce((s, p) => s + Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]), 0);
    // tangentes a ±atan(0,1/0,8) ≈ ±7,1°: o lado x = +0,6 entre y = ±0,6·tan7,1° = ±0,075 sai (0,15 m)
    expect(sem - u).toBeCloseTo(0.15, 2);
    // furo a mais de 8d não desconta
    const longe = descontarFuros(recortar(curvaAfastada(ap, 2 * d), reg), ap, [quad(3, -0.1, 3.2, 0.1)], 8 * d);
    expect(longe.length).toBe(recortar(curvaAfastada(ap, 2 * d), reg).length);
  });
});

describe('punção: Wp de borda e canto contra a definição (19.5.2.2) e a fórmula fechada da NBR 6118 (19.5.2.3)', () => {
  // Integração independente da biblioteca: amostra o contorno u* (pontos a cada ≤ 0,1 mm) e soma ∫|e| dℓ em torno do centroide.
  type Trecho = { n: number; f: (t: number) => P }; // t ∈ [0, 1]
  const reta = (a: P, z: P): Trecho => ({ n: Math.hypot(z[0] - a[0], z[1] - a[1]), f: (t) => [a[0] + (z[0] - a[0]) * t, a[1] + (z[1] - a[1]) * t] });
  const arco = (c: P, r: number, a0: number, a1: number): Trecho => ({ n: r * Math.abs(a1 - a0), f: (t) => [c[0] + r * Math.cos(a0 + (a1 - a0) * t), c[1] + r * Math.sin(a0 + (a1 - a0) * t)] });
  function integrar(trechos: Trecho[]) {
    const pts: { p: P; dl: number }[] = [];
    for (const t of trechos) { const m = Math.max(10, Math.ceil(t.n / 1e-4)); for (let k = 0; k < m; k++) pts.push({ p: t.f((k + 0.5) / m), dl: t.n / m }); }
    const u = pts.reduce((s, q) => s + q.dl, 0), cx = pts.reduce((s, q) => s + q.p[0] * q.dl, 0) / u, cy = pts.reduce((s, q) => s + q.p[1] * q.dl, 0) / u;
    return { u, cx, cy, Wx: pts.reduce((s, q) => s + Math.abs(q.p[0] - cx) * q.dl, 0), Wy: pts.reduce((s, q) => s + Math.abs(q.p[1] - cy) * q.dl, 0) };
  }
  const d = 0.2, C1 = 0.4, C2 = 0.4;
  // fórmula fechada da NBR para o pilar de borda (C1 perpendicular à borda, C2 paralela): ∫|y| do contorno u* em torno do eixo do pilar
  const WpNBRborda = (C2 * C2) / 4 + C1 * C2 + 4 * C1 * d + 8 * d * d + Math.PI * d * C2;

  it('borda 40×40, d = 20 cm: integral independente = biblioteca; paralela à borda = fórmula da NBR; perpendicular = 0,516 da fórmula (razão gravada)', () => {
    // pilar em x ∈ [0; 0,4], y ∈ [−0,2; 0,2], borda livre em x = 0; contorno a 2d = 0,4 das faces
    const ind = integrar([
      reta([0, 0.6], [0.4, 0.6]), arco([0.4, 0.2], 0.4, Math.PI / 2, 0), reta([0.8, 0.2], [0.8, -0.2]), arco([0.4, -0.2], 0.4, 0, -Math.PI / 2), reta([0.4, -0.6], [0, -0.6]),
    ]);
    const reg: Regiao = { poligonos: [quad(0, -20, 20, 20)], furos: [] };
    const pr = propriedadesContorno(recortar(curvaAfastada(pilar(0.4, 0.4, [0.2, 0]), 2 * d), reg), 0);
    expect(pr.u).toBeCloseTo(ind.u, 3);
    expect(pr.centroide[0]).toBeCloseTo(ind.cx, 3);
    expect(pr.Wp[0]).toBeCloseTo(ind.Wx, 3);
    expect(pr.Wp[1]).toBeCloseTo(ind.Wy, 3);
    // paralela à borda (∫|y|): coincide com a fórmula fechada (1,0913 m²)
    expect(WpNBRborda).toBeCloseTo(1.0913, 4);
    expect(pr.Wp[1] / WpNBRborda).toBeCloseTo(1, 3);
    // perpendicular à borda (∫|x − x̄| em torno do centroide, 0,5627 m²): 51,6 % da fórmula fechada. O app usa a definição de 19.5.2.2
    // (critério), que é o que a norma manda para o momento no plano perpendicular à borda; a fórmula fechada só vale para ∫|y|.
    // Conservador (Wp menor, τ maior). "A confirmar": texto do item 19.5.2.3 em docs/pendencias-usuario.md.
    expect(pr.Wp[0]).toBeCloseTo(0.5627, 3);
    expect(pr.Wp[0] / WpNBRborda).toBeCloseTo(0.5156, 3);
  });

  it('canto 40×40, d = 20 cm: integral independente = biblioteca nas duas direções; razões à fórmula fechada da borda gravadas', () => {
    // pilar em [0; 0,4]², bordas livres em x = 0 e y = 0; contorno a 0,4 das faces com quarto de círculo no canto externo
    const ind = integrar([reta([0, 0.8], [0.4, 0.8]), arco([0.4, 0.4], 0.4, Math.PI / 2, 0), reta([0.8, 0.4], [0.8, 0])]);
    const reg: Regiao = { poligonos: [quad(0, 0, 20, 20)], furos: [] };
    const pr = propriedadesContorno(recortar(curvaAfastada(pilar(0.4, 0.4, [0.2, 0.2]), 2 * d), reg), 0);
    expect(pr.u).toBeCloseTo(ind.u, 3);
    expect(pr.centroide[0]).toBeCloseTo(ind.cx, 3);
    expect(pr.Wp[0]).toBeCloseTo(ind.Wx, 3);
    expect(pr.Wp[1]).toBeCloseTo(ind.Wy, 3);
    expect(pr.Wp[0]).toBeCloseTo(pr.Wp[1], 6); // simetria
    // 0,3231 m² = 29,6 % do Wp fechado do pilar de borda (mesmo C1, C2, d): contorno menor (u* = 1,428 m) e centroide a 0,568 m das duas bordas.
    // Mesmo critério da borda (definição 19.5.2.2); a norma não traz fórmula fechada de canto neste teste: pendência do usuário.
    expect(pr.Wp[0]).toBeCloseTo(0.3231, 3);
    expect(pr.Wp[0] / WpNBRborda).toBeCloseTo(0.2961, 3);
  });
});


describe('punção: tensões e resistências (cálculo manual)', () => {
  it('K da Tabela 19.2 e as regras de borda e canto', () => {
    expect(coefK(0.5)).toBeCloseTo(0.45, 9);
    expect(coefK(1)).toBeCloseTo(0.6, 9);
    expect(coefK(1.5)).toBeCloseTo(0.65, 9);
    expect(coefK(2)).toBeCloseTo(0.7, 9);
    expect(coefK(5)).toBeCloseTo(0.8, 9);
    const ap = pilar(0.4, 0.4);
    expect(fatoresK(ap, [])).toEqual([0.6, 0.6]);
    // borda com face livre perpendicular a u: K1 (C1/C2 = 1) = 0,60; K2 com C2/(2C1) = 0,5 → 0,45
    expect(fatoresK(ap, ['u-'])).toEqual([0.6, 0.45]);
    expect(fatoresK(ap, ['u-', 'v-'])).toEqual([0.45, 0.45]);
    expect(fatoresK({ ...ap, circular: true }, [])).toEqual([0.6, 0.6]);
  });

  it('τRd2, τRd1 e a parcela de τRd3 (fck 30, d = 20 cm, ρ = 1 %)', () => {
    // τRd2 = 0,27·(1 − 30/250)·30/1,4 = 0,27·0,88·21,4286 = 5,0914 MPa
    expect(tauRd2(c30)).toBeCloseTo(5.0914, 3);
    // τRd1 = 0,13·(1 + √(20/20))·(100·0,01·30)^(1/3) = 0,26·3,10723 = 0,80788 MPa
    expect(tauRd1(c30, 0.2, 0.01)).toBeCloseTo(0.80788, 4);
    expect(tauRd3c(c30, 0.2, 0.01)).toBeCloseTo(0.62145, 4);
  });

  it('pilar interno 40×40, F = 1000 kN, M = 60 kN·m: τSd(C′) = F/(ud) + K·M/(Wp·d)', () => {
    const d = 0.2, ent: EntradaPuncao = { ap: pilar(0.4, 0.4), reg: grande, d, h: 0.25, F: 1000, M: [60, 0], qd: 0 };
    const t = tensaoNoContorno(ent, [], 2 * d, 8);
    const u = 1.6 + 0.8 * Math.PI, Wp = 0.08 + 0.16 + 0.32 + 0.64 + 2 * Math.PI * d * 0.4;
    const esperado = (1000 / (u * d) + (0.6 * 60) / (Wp * d)) / 1000; // 1,3212 MPa
    expect(esperado).toBeCloseTo(1.3212, 3);
    expect(t.tau / esperado).toBeCloseTo(1, 2);
  });

  it('pilar de borda: MSd1 = MSd − FSd·e* (reduz o momento) e τSd com u*', () => {
    const reg: Regiao = { poligonos: [quad(0, -20, 20, 20)], furos: [] };
    const d = 0.2, ap = pilar(0.4, 0.4, [0.2, 0]);
    // F = 500 kN, M perpendicular à borda (excentricidade ao longo de u) = 200 kN·m: e* = 0,3303 → MSd* = 165,2; MSd1 = 34,8
    const ent: EntradaPuncao = { ap, reg, d, h: 0.25, F: 500, M: [200, 0], qd: 0 };
    const t = tensaoNoContorno(ent, ['u-'], 2 * d, 8);
    expect(t.M1[0]).toBeCloseTo(200 - 500 * 0.3303, 0);
    const u = 2.45664, Wp1 = 0.56266, K1 = 0.6;
    const esperado = (500 / (u * d) + (K1 * (200 - 500 * 0.3303)) / (Wp1 * d)) / 1000;
    expect(t.tau / esperado).toBeCloseTo(1, 2);
    // momento menor que F·e*: MSd1 = 0 (a excentricidade já o absorve)
    expect(tensaoNoContorno({ ...ent, M: [100, 0] }, ['u-'], 2 * d, 8).M1[0]).toBe(0);
  });
});

describe('punção: armadura e cortante', () => {
  const par = (rho: number): ParametrosPuncao => ({ c: c30, rho, fywd: 250, tipoArm: 'estribo', s0f: 0.5, srf: 0.75, passoCortante: 0.75, furoDist: 8, bitolas: [5, 6.3, 8, 10] });

  it('sem armadura quando τSd(C′) ≤ τRd1; erro de biela quando τSd(C) > τRd2', () => {
    const d = 0.2, mk = (F: number): EntradaPuncao => ({ ap: pilar(0.4, 0.4), reg: grande, d, h: 0.25, F, M: [0, 0], qd: 0 });
    // F = 400: τ(C′) = 400/(4,11327·0,2)/1000 = 0,486 MPa < τRd1 (ρ = 1 %: 0,808 MPa)
    const a = verificarPuncao(mk(400), par(0.01));
    expect(a.status).toBe('ok');
    expect(a.C2.tau).toBeCloseTo(0.486, 2);
    // F enorme: τ(C) = F/(1,6·0,2)/1000 > 5,09 MPa para F > 1629 kN
    const b = verificarPuncao(mk(2500), par(0.01));
    expect(b.status).toBe('fail');
    expect(b.mensagens[0]).toMatch(/τSd .* > τRd2/);
  });

  it('armadura: Asw por anel = (τSd − τRd3,c)·u·sr/(1,5·fywd) e C″ dentro de τRd1', () => {
    const d = 0.2, ent: EntradaPuncao = { ap: pilar(0.4, 0.4), reg: grande, d, h: 0.25, F: 1200, M: [0, 0], qd: 0 };
    const r = verificarPuncao(ent, { ...par(0.01), passoCortante: 0 });
    expect(r.status).toBe('armadura');
    const u2 = 1.6 + 0.8 * Math.PI, tau2 = 1200 / (u2 * d) / 1000; // 1,458 MPa
    expect(r.C2.tau).toBeCloseTo(tau2, 3);
    expect(tau2).toBeGreaterThan(0.80788);
    const sr = 0.15, s0 = 0.1;
    const aswCalc = ((tau2 - 0.62145) * u2 * sr * 1e4) / (1.5 * 250); // cm² por anel = 3,3 cm²
    expect(aswCalc).toBeGreaterThan(3);
    const arm = r.armadura!;
    expect(arm.s0).toBeCloseTo(s0, 9);
    expect(arm.sr).toBeCloseTo(sr, 9);
    // armadura efetiva ≥ necessária e τRd3 ≥ τSd(C′)
    expect(arm.AswAnel).toBeGreaterThanOrEqual(aswCalc - 1e-9);
    expect(r.tauRd3!).toBeGreaterThanOrEqual(tau2 - 1e-9);
    // C″ a 2d da última linha: τ ≤ τRd1
    expect(r.C3!.a).toBeCloseTo(s0 + (arm.barras - 1) * sr + 2 * d, 9);
    expect(r.C3!.tau).toBeLessThanOrEqual(0.80788 + 1e-9);
    // com 1 linha a C″ está a 0,1 + 0,4 = 0,5 m: u = 1,6 + 2π·0,5 = 4,74; τ = 1200/(4,74·0,2)/1000 = 1,27 > τRd1 → precisa de mais linhas
    expect(arm.barras).toBeGreaterThan(1);
    expect(arm.posicoes.length).toBe(arm.linhas);
    expect(arm.posicoes[0].length).toBe(arm.barras);
  });

  it('conectores têm 1 perna e estribos 2 (mesma Asw, dobro de barras)', () => {
    const d = 0.2, ent: EntradaPuncao = { ap: pilar(0.4, 0.4), reg: grande, d, h: 0.25, F: 1200, M: [0, 0], qd: 0 };
    const e = verificarPuncao(ent, { ...par(0.01), passoCortante: 0 }).armadura!, c = verificarPuncao(ent, { ...par(0.01), passoCortante: 0, tipoArm: 'conector', fywd: 300 }).armadura!;
    expect(e.pernas).toBe(2);
    expect(c.pernas).toBe(1);
  });

  it('VRd1 da laje (19.4.1) e interpolação de Vc com a espessura (19.4.2)', () => {
    const d = 0.2, rho = 0.01;
    // τRd = 0,25·fctd; fctd = 0,7·0,3·30^(2/3)/1,4 = 1,4495 MPa → 0,3624 MPa; k = |1,6 − 0,2| = 1,4; (1,2 + 40·0,01) = 1,6
    const V = 0.25 * c30.fctd * 1.4 * 1.6 * 1 * d * 1000;
    expect(vrd1(c30, 1, d, rho * d)).toBeCloseTo(V, 6);
    expect(V).toBeCloseTo(162.3, 0);
    expect(vcLaje(c30, 0.12, d, rho)).toBeCloseTo(V, 6);
    const V0 = 0.6 * c30.fctd * d * 1000;
    expect(vcLaje(c30, 0.4, d, rho)).toBeCloseTo(V0, 6);
    expect(vcLaje(c30, 0.25, d, rho)).toBeCloseTo((V + V0) / 2, 6);
  });

  it('varredura de cortante: V = F − q·A e v = V/u por superfície a cada 0,75d', () => {
    const d = 0.2, ent: EntradaPuncao = { ap: pilar(0.4, 0.4), reg: grande, d, h: 0.25, F: 600, M: [0, 0], qd: 10 };
    const r = verificarPuncao(ent, par(0.01));
    const s0 = r.cortante.superficies[0], s1 = r.cortante.superficies[1];
    expect(s0.a).toBeCloseTo(0.4, 9);
    expect(s1.a).toBeCloseTo(0.4 + 0.75 * 0.2, 9);
    // área dentro do contorno a 2d: 0,4² + 4·0,4·0,4 + π·0,4² = 0,16 + 0,64 + 0,50265 = 1,30265 m²
    expect(s0.A / 1.30265).toBeCloseTo(1, 2);
    expect(s0.V).toBeCloseTo(600 - 10 * s0.A, 6);
    expect(s0.v).toBeCloseTo(s0.V / s0.u, 9);
  });

  it('cortante da laje (19.4): sem armadura abaixo de VRd1; armadura com h ≥ 15 cm; erro com h < 15 cm', () => {
    // grelha mínima: duas barras de laje (direção 0) de 4 m, largura 0,25 m, cortante 40 kN nas pontas (160 kN/m)
    const m = { nos: [[0, 0, 0], [4, 0, 0]], barras: [{ i: 0, j: 1 }, { i: 0, j: 1 }], apoios: new Map(), molas: [] } as never;
    const mk = (V: number) => ({ modelo: m, barras: [{ tipo: 'laje', ref: 'l1', dir: 0, largura: 0.25 }, { tipo: 'viga', ref: 'v1' }], res: { esforcos: [[Float64Array.from([0, V, 0, 0, 0, 0, 0, V, 0, 0, 0, 0]), new Float64Array(12)]], desloc: [], reacoes: [], neq: 0, hb: 0 } } as never);
    const rho: [number, number] = [0.01, 0.01];
    const ok = cortanteLaje(mk(30), 'l1', [1], c30, 0.25, 0.2, rho, 435, []);
    expect(ok!.VSd[0]).toBeCloseTo(120, 6);
    expect(ok!.ok).toBe(true);
    expect(ok!.Asw).toBe(0);
    const arm = cortanteLaje(mk(50), 'l1', [1], c30, 0.25, 0.2, rho, 435, []);
    expect(arm!.VSd[0]).toBeCloseTo(200, 6);
    expect(arm!.ok).toBe(true);
    const vc = vcLaje(c30, 0.25, 0.2, 0.01);
    expect(arm!.Asw).toBeCloseTo(((200 - vc) * 1e4) / (0.9 * 0.2 * 435 * 1000), 6);
    expect(arm!.mensagens[0]).toMatch(/armadura transversal/);
    const fino = cortanteLaje(mk(50), 'l1', [1], c30, 0.12, 0.09, rho, 435, []);
    expect(fino!.ok).toBe(false);
    // ponta junto a pilar sem viga fica fora (é da punção)
    expect(cortanteLaje(mk(50), 'l1', [1], c30, 0.25, 0.2, rho, 435, [{ p: [0, 0], r: 5 }])!.VSd[0]).toBe(0);
  });
});


/** Laje lisa 12 × 12 m de h (m) em 3 × 3 pilares 50×50 (bordas coladas nas faces: 4 de canto, 4 de borda e 1 interno). */
function lisa(h: number, q?: number, extra?: (ok: (n: string, p: Record<string, unknown>) => void, s: Sessao) => void, comDesaprumo = false) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  if (!comDesaprumo) ok('opcoes.definir', { valores: ANTES_DESAPRUMO }); // baselines de punção de antes do desaprumo global; o desaprumo tem testes próprios abaixo
  if (q !== undefined) ok('grupo.editar', { id: 'g_3', q });
  const xs = [0.25, 6, 11.75];
  ok('lote', { comandos: xs.flatMap((x) => xs.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.5, h: 0.5 } } }))) });
  ok('laje.criar', { grupo: 'g_3', contorno: [[0, 0], [12, 0], [12, 12], [0, 12]], tipo: { tipo: 'macica', h } });
  extra?.(ok, s);
  const an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an);
  return { s, an, d };
}

describe('punção no edifício (laje lisa)', () => {
  it('classifica interno, borda e canto; ΣFSd = carga ELU da laje; interno sem momento', () => {
    const { s, d } = lisa(0.22);
    const t1 = d.puncao!.filter((r) => r.pavimento === 'Tipo 1');
    expect(t1).toHaveLength(9);
    expect(t1.filter((r) => r.tipo === 'interno')).toHaveLength(1);
    expect(t1.filter((r) => r.tipo === 'borda')).toHaveLength(4);
    expect(t1.filter((r) => r.tipo === 'canto')).toHaveLength(4);
    const g = s.modelo.grupos.find((x) => x.id === 'g_3')!;
    const ELU = 1.4 * (25 * 0.22 + g.gRev) * 144 + 1.4 * g.q * 144;
    const soma = t1.reduce((a, r) => a + r.F, 0);
    expect(soma / ELU).toBeGreaterThan(0.97);
    expect(soma / ELU).toBeLessThan(1.03);
    const int = t1.find((r) => r.tipo === 'interno')!;
    expect(int.M[0] + int.M[1]).toBeLessThan(1e-6);
    // τSd(C′) do interno sem momento = F/(u·d); d = h − c − 1 cm = 0,22 − 0,025 − 0,01 = 0,185 m; u = 2·(0,5 + 0,5) + 2π·2d
    const u = 2 * (0.5 + 0.5) + 2 * Math.PI * 2 * 0.185;
    expect(int.d).toBeCloseTo(0.185, 9);
    expect(int.contornos[1].u / u).toBeCloseTo(1, 2);
    expect(int.contornos[1].tau / (int.F / (u * 0.185) / 1000)).toBeCloseTo(1, 2);
    expect(int.contornos[0].u).toBeCloseTo(2, 9);
    // borda e canto têm momento desbalanceado e contorno reduzido (menor que o do interno)
    expect(t1.find((r) => r.tipo === 'borda')!.M[0] + t1.find((r) => r.tipo === 'borda')!.M[1]).toBeGreaterThan(10);
    expect(t1.find((r) => r.tipo === 'canto')!.contornos[1].u).toBeLessThan(2.5);
    // modelo integrado (N2b): os momentos de borda e de canto crescem (região do pilar rígida e continuidade real com
    // os lances), e esses pilares pedem armadura de punção; nenhum falha
    expect(t1.every((r) => r.status !== 'fail')).toBe(true);
    expect(d.lajes.every((l) => l.cortante?.ok !== false)).toBe(true);
  });

  it('laje fina e carregada: armadura de punção no interno, biela no de borda e de canto, revisão com os códigos', () => {
    const { s, an, d } = lisa(0.16, 14);
    const t1 = d.puncao!.filter((r) => r.pavimento === 'Tipo 1');
    const int = t1.find((r) => r.tipo === 'interno')!;
    expect(int.status).toBe('armadura');
    const a = int.armadura!;
    expect(a.barras).toBeGreaterThanOrEqual(2);
    expect(a.sr).toBeLessThanOrEqual(0.75 * int.d + 1e-9);
    expect(a.s0).toBeLessThanOrEqual(0.5 * int.d + 1e-9);
    expect(a.phi).toBeLessThanOrEqual(8);
    expect(int.tauRd3!).toBeGreaterThanOrEqual(int.contornos[1].tau - 1e-9);
    expect(int.contornos[2].tau).toBeLessThanOrEqual(int.tauRd1 + 1e-9);
    expect(int.contornos[2].a).toBeCloseTo(a.s0 + (a.barras - 1) * a.sr + 2 * int.d, 9);
    expect(a.posicoes).toHaveLength(a.linhas);
    expect(t1.filter((r) => r.status === 'fail').length).toBeGreaterThan(0);
    const l = d.lajes.find((x) => x.pavimento === 'Tipo 1')!;
    expect(l.status).toBe('fail');
    const rev = revisarEdificio(s.modelo, an, d);
    expect(rev.itens.some((i) => i.codigo === 'PUNCAO_BIELA' && i.nivel === 'erro' && i.tipo === 'laje')).toBe(true);
    expect(rev.itens.some((i) => i.codigo === 'PUNCAO_ARMADURA' && i.nivel === 'aviso')).toBe(true);
    // aço próprio e tipo de armadura: conectores têm 1 perna
    const conj = lisa(0.16, 14, (ok) => ok('opcoes.definir', { valores: { puncaoTipoArmadura: 1 } })).d.puncao!.find((r) => r.tipo === 'interno')!;
    expect(conj.armadura!.pernas).toBe(1);
  });

  it('armadura informada (grupos) soma-se à calculada: cobrindo a exigência, nada é acrescentado', () => {
    const base = lisa(0.16, 14).d.puncao!.find((r) => r.tipo === 'interno' && r.pavimento === 'Tipo 1')!;
    const need = base.armadura!;
    const com = lisa(0.16, 14, (ok, ss) => ok('laje.puncao', { id: ss.modelo.lajes[0].id, adicionar: [{ pilar: ss.modelo.pilares[4].id, linhas: 40, barras: need.barras, phi: 8, s: need.sr }] }));
    expect(com.s.modelo.lajes[0].puncao).toHaveLength(1);
    const r = com.d.puncao!.find((x) => x.tipo === 'interno' && x.pavimento === 'Tipo 1')!;
    expect(r.manual).toHaveLength(1);
    expect(r.status).toBe('armadura');
    expect(r.armadura).toBeUndefined();
    expect(r.mensagens.join(' ')).toMatch(/Armadura de punção informada atende/);
    // espaçamento radial informado acima de 0,75d: aviso PUNCAO_ESP
    const largo = lisa(0.16, 14, (ok2, ss) => ok2('laje.puncao', { id: ss.modelo.lajes[0].id, adicionar: [{ pilar: ss.modelo.pilares[4].id, linhas: 8, barras: 2, phi: 8, s: 0.3 }] }));
    const rl = largo.d.puncao!.find((x) => x.tipo === 'interno' && x.pavimento === 'Tipo 1')!;
    expect(rl.mensagens.join(' ')).toMatch(/espaçamento informado de 30 cm maior que 0,75d/);
    expect(revisarEdificio(largo.s.modelo, largo.an, largo.d).itens.some((i) => i.codigo === 'PUNCAO_ESP')).toBe(true);
  });

  it('prancha de armação das lajes: barras de punção em planta e na tabela de aço', () => {
    const { s, an, d } = lisa(0.16, 14);
    const folhas = montarPranchasLajes(s.modelo, an, d);
    const neg = folhas.find((f) => /negativas/i.test(f.titulo));
    expect(neg).toBeDefined();
    const a = d.puncao!.find((r) => r.armadura && r.pavimento === 'Tipo 1')!.armadura!;
    const circ = neg!.modelo.filter((p) => p.t === 'circ' && p.c === 'ARMADURA-NEG');
    expect(circ.length).toBe(a.total);
    expect(neg!.modelo.some((p) => p.t === 'txt' && /punção/.test(p.s))).toBe(true);
    // 3 pavimentos no grupo: as quantidades somam as repetições
    const linha = neg!.aco!.tabela.find((l) => l.phi === a.phi && l.quant === a.total * 3);
    expect(linha).toBeDefined();
    // grupo informado num ponto livre (sem pilar): marca na planta e quantidade na tabela de aço
    const livre = lisa(0.22, undefined, (ok, ss) => ok('laje.puncao', { id: ss.modelo.lajes[0].id, adicionar: [{ ponto: [3, 3], linhas: 6, barras: 2, phi: 8 }] }));
    const f2 = montarPranchasLajes(livre.s.modelo, livre.an, livre.d).find((f) => /negativas/i.test(f.titulo))!;
    expect(f2.modelo.some((p) => p.t === 'circ' && p.centro[0] === 3 && p.centro[1] === 3)).toBe(true);
    expect(f2.aco!.tabela.some((l) => l.phi === 8 && l.quant === 6 * 2 * 3)).toBe(true);
  });

  it('opção desligada: nada de punção; a regressão do edifício com vigas não muda (sem punção)', () => {
    expect(lisa(0.16, 14, (ok) => ok('opcoes.definir', { valores: { puncaoVerificar: 0 } })).d.puncao).toBeUndefined();
    const s = edificioExemplo(), an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an);
    expect(d.puncao).toBeUndefined();
    expect(d.lajes.every((l) => l.mensagens.every((m) => !/^Punção/.test(m)))).toBe(true);
    expect(sitiosPuncao(s.modelo, s.modelo.pavimentos[1].id, { puncaoVigaChata: 1 })).toEqual([]);
  });

  it('viga chata mais larga que o apoio em mais de uma altura: aviso e punção verificada na largura da viga', () => {
    const { d, s } = lisa(0.2, undefined, (ok) => ok('viga.tracar', { grupo: 'g_3', pontos: [[0, 6], [12, 6]], secao: { b: 0.9, h: 0.25 } }));
    const rs = d.puncao!.filter((r) => r.origem === 'viga' && r.pavimento === 'Tipo 1');
    expect(rs.length).toBeGreaterThanOrEqual(1);
    expect(rs[0].mensagens[0]).toMatch(/^Viga chata/);
    expect(rs[0].h).toBeCloseTo(0.25, 9);
    expect(revisarEdificio(s.modelo, null, d).itens.some((i) => i.codigo === 'VIGA_CHATA_LARGA')).toBe(true);
  });

  it('envoltória dos pavimentos do grupo (C3.4): pior caso de cada grandeza', () => {
    const { d } = lisa(0.2);
    const ls = d.lajes.filter((x) => x.laje === d.lajes[0].laje);
    expect(ls.length).toBe(3);
    const e = envoltoriaLajes([{ ...ls[0], flecha: 0.01 }, { ...ls[1], flecha: 0.02, mPos: [ls[1].mPos[0] + 5, ls[1].mPos[1]] }, ls[2]])!;
    expect(e.pavimento).toBe('Envoltória');
    expect(e.flecha).toBe(0.02);
    expect(e.mPos[0]).toBeCloseTo(ls[1].mPos[0] + 5, 9);
  });
});

describe('punção do radier (FU6)', () => {
  it('pilares sobre o radier: FSd do pé do pilar, reação do solo descontada no contorno, mensagens e situação do radier', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
    ok('vento.definir', { ativo: false });
    ok('lote', { comandos: [[1, 1], [7, 1], [7, 6], [1, 6]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
    ok('lote', { comandos: [[[1, 1], [7, 1]], [[1, 6], [7, 6]], [[1, 1], [1, 6]], [[7, 1], [7, 6]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } })) });
    ok('radier.criar', { contorno: [[0, 0], [8, 0], [8, 7], [0, 7]], h: 0.25, k: 40000, sigmaAdm: 300 });
    ok('carga.pilar', { pilar: s.modelo.pilares[0].id, pavimento: s.modelo.pavimentos[1].id, caso: 'Q', N: 1500, Hx: 0, Hy: 0, Mx: 0, My: 0 });
    const an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an);
    const r = d.radiers![0];
    expect(r.puncao).toHaveLength(4);
    const p1 = r.puncao!.find((x) => x.pilar === s.modelo.pilares[0].id)!;
    expect(p1.origem).toBe('radier');
    expect(p1.tipo).toBe('interno');
    expect(p1.F).toBeGreaterThan(1500);
    // sem a reação do solo descontada, τSd(C′) = F/(u·d) seria maior
    const u = p1.contornos[1].u, semDesconto = p1.F / (u * p1.d) / 1000;
    expect(p1.contornos[1].tau).toBeLessThan(semDesconto + 1e-9);
    expect(p1.contornos[1].tau - (p1.F / (u * p1.d) / 1000)).toBeLessThan(0);
    expect(p1.combinacao).toBeTruthy();
    // P1 (1500 kN a mais): biela excedida → radier não atende, com o código de revisão; P2 sem armadura
    expect(p1.status).toBe('fail');
    expect(r.status).toBe('fail');
    expect(r.mensagens.join(' ')).toMatch(/Punção em P1: τSd/);
    expect(r.puncao!.find((x) => x.nome === 'P2')!.status).toBe('ok');
    expect(revisarEdificio(s.modelo, an, d).itens.some((i) => i.codigo === 'PUNCAO_BIELA' && i.tipo === 'fundacao' && i.id === r.id)).toBe(true);
  });
});

const par30 = (rho: number): ParametrosPuncao => ({ c: c30, rho, fywd: 250, tipoArm: 'estribo', s0f: 0.5, srf: 0.75, passoCortante: 0.75, furoDist: 8, bitolas: [5, 6.3, 8, 10] });

describe('punção: limite do contorno C′ conforme a armadura (NBR 6118, 19.5.3.2 e 19.5.3.3) e mensagem de armadura informada', () => {
  it('sem armadura: limite de C′ = τRd1 e a verificação confere τSd(C′) ≤ τRd1', () => {
    const r = lisa(0.30, 2).d.puncao!.find((x) => x.tipo === 'interno' && x.pavimento === 'Tipo 1')!;
    expect(r.status).toBe('ok');
    expect(r.armadura).toBeUndefined();
    const k = r.contornos[1], t1 = tauRd1(concrete(r.fck, 1.4), r.d, r.rho);
    expect(k.limiteNome).toBe('τRd1');
    expect(k.limite).toBeCloseTo(t1, 9);
    expect(k.ok).toBe(k.tau <= t1 + 1e-9);
    expect(k.ok).toBe(true);
  });

  it('armadura calculada: limite de C′ = τRd3 = 0,10(1+√(20/d))(100ρfck)^(1/3) + 1,5·Asw·fywd/(sr·u) (senα = 1)', () => {
    const r = lisa(0.16, 14).d.puncao!.find((x) => x.tipo === 'interno' && x.pavimento === 'Tipo 1')!;
    const a = r.armadura!, k = r.contornos[1];
    const t3 = 0.10 * (1 + Math.sqrt(20 / (r.d * 100))) * Math.cbrt(100 * r.rho * r.fck) + (1.5 * a.AswAnel * 250) / (a.sr * k.u * 1e4);
    expect(k.limiteNome).toBe('τRd3');
    expect(k.limite).toBeCloseTo(t3, 9);
    expect(r.tauRd3!).toBeCloseTo(t3, 9);
    expect(k.ok).toBe(true);
  });

  it('só armadura informada cobre a exigência: limite de C′ = τRd3 (e não τRd1), C′ ok e mensagem "informada atende"', () => {
    const need = lisa(0.16, 14).d.puncao!.find((x) => x.tipo === 'interno' && x.pavimento === 'Tipo 1')!.armadura!;
    const com = lisa(0.16, 14, (ok, ss) => ok('laje.puncao', { id: ss.modelo.lajes[0].id, adicionar: [{ pilar: ss.modelo.pilares[4].id, linhas: 40, barras: need.barras, phi: 8, s: need.sr }] }));
    const r = com.d.puncao!.find((x) => x.tipo === 'interno' && x.pavimento === 'Tipo 1')!;
    expect(r.armadura).toBeUndefined();
    const k = r.contornos[1], c = concrete(r.fck, 1.4);
    const asw = 40 * 2 * (Math.PI * 0.8 ** 2 / 4); // 40 linhas × 2 pernas × φ8 = 40,21 cm²
    const t3 = 0.10 * (1 + Math.sqrt(20 / (r.d * 100))) * Math.cbrt(100 * r.rho * r.fck) + (1.5 * asw * 250) / (need.sr * k.u * 1e4);
    expect(k.tau).toBeGreaterThan(tauRd1(c, r.d, r.rho)); // sem a armadura informada C′ excederia τRd1
    expect(k.limiteNome).toBe('τRd3');
    expect(k.limite).toBeCloseTo(t3, 6);
    expect(r.tauRd3!).toBeCloseTo(t3, 6);
    expect(k.ok).toBe(true);
    expect(r.mensagens.join(' ')).toMatch(/Armadura de punção informada atende/);
  });

  it('Vc cobre o cortante e não há grupo informado: sem armadura necessária, sem a mensagem de armadura informada', () => {
    // d = 0,50, h = 0,55, ρ = 3 %, pilar 40×40; C′ a 2d = 1,0 m: u = 1,6 + 2π = 7,8832 m
    // fctd = 0,7·0,3·30^(2/3)/1,4 = 1,4482 MPa; VRd1 (ρ limitado a 2 %; k = 1,6 − 0,5 = 1,1) = 0,25·1448,2·1,1·(1,2 + 0,8)·0,5 = 398,26 kN/m
    // Vc (h ≥ 35 cm) = 0,6·1448,2·0,5 = 434,46 kN/m; τRd1 = 0,13·(1 + √(20/50))·(100·0,03·30)^(1/3) = 0,9507 MPa
    // F = 3180 kN: v = F/u = 403,4 kN/m (entre VRd1 e Vc) e τSd(C′) = 0,807 MPa < τRd1
    const ent: EntradaPuncao = { ap: pilar(0.4, 0.4), reg: { poligonos: [quad(-100, -100, 100, 100)], furos: [] }, d: 0.5, h: 0.55, F: 3180, M: [0, 0], qd: 0 };
    expect(vcLaje(c30, 0.55, 0.5, 0.03)).toBeCloseTo(434.46, 1);
    expect(vrd1(c30, 1, 0.5, 0.03 * 0.5)).toBeCloseTo(398.26, 1);
    expect(tauRd1(c30, 0.5, 0.03)).toBeCloseTo(0.9507, 3);
    const r = verificarPuncao(ent, par30(0.03));
    expect(r.C2.u).toBeCloseTo(1.6 + 2 * Math.PI, 3);
    expect(r.C2.tau).toBeCloseTo(0.807, 3);
    expect(r.cortante.falha).toBe(true); // v > VRd1: a varredura marca a superfície
    expect(r.cortante.superficies[0].Asw).toBe(0); // mas Vc cobre
    expect(r.armadura).toBeUndefined();
    expect(r.tauRd3).toBeUndefined();
    expect(r.status).toBe('ok');
    const m = r.mensagens.join(' ');
    expect(m).not.toMatch(/informada atende/);
    expect(m).toMatch(/Vc da laje .* cobre a solicitação; nenhuma armadura é necessária e nenhuma foi informada/);
  });
});

describe('punção no edifício: desaprumo global (NBR 6118, 11.3.3.4.1), modelo integrado sem vento', () => {
  it('M = Σ|γ·m| dos casos verticais + o pior dos quatro desaprumos (módulos caso a caso), conferido à mão; τSd cresce nos pilares de borda, de canto e no interno', () => {
    const com = lisa(0.22, undefined, undefined, true), sem = lisa(0.22);
    expect(com.an.desaprumo?.casos.length).toBeGreaterThan(0);
    const b = com.s.modelo, pav = b.pavimentos.find((p) => p.nome === 'Tipo 1')!, g = com.an.grelhas.find((x) => x.pavimento === pav.id)!;
    const { fat } = fatoresPuncao(b, com.an);
    const t1 = com.d.puncao!.filter((r) => r.pavimento === 'Tipo 1'), t0 = sem.d.puncao!.filter((r) => r.pavimento === 'Tipo 1');
    expect(t1).toHaveLength(9);
    for (const r of t1) {
      const mp = g.momentos![r.pilar], base = [0, 1].map((k) => com.an.casos.reduce((t, id, ic) => t + Math.abs(fat[ic] * (mp[id]?.[k] ?? 0)), 0));
      const des = [0, 90, 180, 270].map((dir) => [0, 1].map((k) => com.an.casos.reduce((t, id, ic) => t + Math.abs(fat[ic] * (mp[`D${dir}°[${id}]`]?.[k] ?? 0)), 0)));
      const Mx = [0, 1].map((k) => base[k] + Math.max(...des.map((x) => x[k])));
      const a = (r.angulo * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
      const Mu = Math.abs(Mx[0] * co) + Math.abs(Mx[1] * si), Mv = Math.abs(Mx[0] * si) + Math.abs(Mx[1] * co);
      expect(Math.abs(r.M[0] - Mv)).toBeLessThan(1e-9 * Math.max(1, Mv));
      expect(Math.abs(r.M[1] - Mu)).toBeLessThan(1e-9 * Math.max(1, Mu));
      const r0 = t0.find((x) => x.pilar === r.pilar)!;
      expect(r.F).toBeCloseTo(r0.F, 9); // a força de punção não muda (o desaprumo só soma momento)
      expect(r.M[0] + r.M[1]).toBeGreaterThan(r0.M[0] + r0.M[1] + 1e-6);
      expect(r.contornos[1].tau).toBeGreaterThan(r0.contornos[1].tau);
    }
    // o pilar interno, sem momento antes, passa a ter o do desaprumo
    const i0 = t0.find((r) => r.tipo === 'interno')!, i1 = t1.find((r) => r.tipo === 'interno')!;
    expect(i0.M[0] + i0.M[1]).toBeLessThan(1e-6);
    expect(i1.M[0] + i1.M[1]).toBeGreaterThan(1);
  });
});

describe('punção do radier: desaprumo global (casos D nas combinações ELU)', () => {
  const radierCom = (antes: boolean) => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
    ok('vento.definir', { ativo: false });
    if (antes) ok('opcoes.definir', { valores: ANTES_DESAPRUMO });
    ok('lote', { comandos: [[1, 1], [7, 1], [7, 6], [1, 6]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
    ok('lote', { comandos: [[[1, 1], [7, 1]], [[1, 6], [7, 6]], [[1, 1], [1, 6]], [[7, 1], [7, 6]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } })) });
    ok('radier.criar', { contorno: [[0, 0], [8, 0], [8, 7], [0, 7]], h: 0.25, k: 40000, sigmaAdm: 300 });
    const an = analisarEdificio(s.modelo);
    return { an, d: dimensionarEdificio(s.modelo, an) };
  };
  it('sem vento, a combinação determinante é a de um dos desaprumos e o momento MSd no pé cresce (os dois desaprumos de sinal oposto somam em módulo)', () => {
    const com = radierCom(false), sem = radierCom(true);
    expect(com.an.desaprumo?.casos.length).toBeGreaterThan(0);
    const p1 = com.d.radiers![0].puncao!, p0 = sem.d.radiers![0].puncao!;
    expect(p1).toHaveLength(4);
    for (const r of p1) {
      const r0 = p0.find((x) => x.pilar === r.pilar)!;
      expect(r.combinacao, r.nome).toMatch(/desaprumo/);
      expect(r0.combinacao).not.toMatch(/desaprumo/);
      expect(r.M[0] + r.M[1]).toBeGreaterThan(r0.M[0] + r0.M[1] + 1e-6);
      expect(r.contornos[1].tau).toBeGreaterThan(r0.contornos[1].tau);
    }
  });
});
